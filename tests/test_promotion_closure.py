from __future__ import annotations

import copy
import gzip
import hashlib
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import check_promotion_envelope as promotion  # noqa: E402
import observe_link_intents as link_intents  # noqa: E402


def iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


class PromotionClosureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.now = datetime(2026, 8, 4, 12, tzinfo=timezone.utc)
        self.envelope = {
            "subject": {
                "repository": "owner/repository",
                "source_commit": "a" * 40,
                "tag": "heritage-coventry-warwickshire-20260804",
                "descriptor": {
                    "path": "okf-explorer.json",
                    "sha256": "b" * 64,
                },
                "plane_roots": {
                    "path": "assurance/plane-roots.json",
                    "sha256": "1" * 64,
                    "release_root_sha256": "c" * 64,
                },
                "site_artifact": {
                    "manifest_path": "publication-unit-manifest.json",
                    "manifest_sha256": "2" * 64,
                    "tree_sha256": "d" * 64,
                    "file_count": 4,
                },
            },
            "receipts": {"validation": {"sha256": "e" * 64}},
        }
        self.policy = {
            "schema": "okf-link-observation-policy.v1",
            "shards_per_nightly_run": 4,
            "maximum_bulk_cycle_days": 64,
            "concurrent_requests": 2,
            "request_timeout_seconds": 1,
            "user_agent": "fixture",
            "freshness_days": {
                "protected-rich-page": 1,
                "official-record": 64,
                "official-resource": 64,
                "other": 64,
            },
            "accepted_protected_responses": [
                {
                    "host": "historicengland.org.uk",
                    "risks": ["official-record", "official-resource"],
                    "http_status": 403,
                    "validation_basis": (
                        "candidate-identifier-binding-plus-protected-origin-http-403"
                    ),
                }
            ],
            "protected_browser_channel": "genuine-google-chrome-cdp",
            "receipt_location": "evidence-only",
        }

    def subject(self, link_manifest_sha256: str = "pending-test-value") -> dict[str, object]:
        return {
            "repository": "owner/repository",
            "source_commit": "a" * 40,
            "candidate_tag": "heritage-coventry-warwickshire-20260804",
            "descriptor_sha256": "b" * 64,
            "release_root_sha256": "c" * 64,
            "publication_manifest_sha256": "2" * 64,
            "site_tree_sha256": "d" * 64,
            "site_file_count": 4,
            "link_manifest_sha256": link_manifest_sha256,
        }

    def errors(
        self,
        label: str,
        receipt: dict,
        root: Path | None = None,
        *,
        repository_root: Path | None = None,
        resolved_by_schema: dict | None = None,
    ) -> list[str]:
        return promotion.receipt_semantic_errors(
            label,
            receipt,
            self.envelope,
            publication_root=root,
            repository_root=repository_root,
            promoted_at=self.now,
            link_policy=self.policy,
            resolved_by_schema=resolved_by_schema,
        )

    def write_link_fixture(self, root: Path) -> tuple[Path, dict]:
        manifest_path = root / "data/link-validation/manifest.json"
        shard_root = manifest_path.parent / "shards"
        shard_root.mkdir(parents=True)
        rows = [
            {
                "basis": "source-declared",
                "kind": "record-primary",
                "record_route": "asset/1",
                "route": "",
                "status": "valid",
                "url": "https://example.test/item?b=2&a=1",
            },
            {
                "basis": "source-declared",
                "kind": "record-primary",
                "record_route": "asset/2",
                "route": "",
                "status": "valid",
                "url": (
                    "https://historicengland.org.uk/listing/the-list/"
                    "list-entry/123"
                ),
            },
            {
                "basis": "genuine-browser-receipt",
                "kind": "resource",
                "record_route": "",
                "route": "resource/rich",
                "status": "valid",
                "url": "https://historicengland.org.uk/rich",
            },
        ]
        grouped: dict[str, list[dict]] = {}
        for row in rows:
            grouped.setdefault(link_intents.stable_bucket(row["url"]), []).append(row)
        shards = []
        for bucket, values in sorted(grouped.items()):
            values.sort(key=link_intents.row_order_key)
            raw = gzip.compress(link_intents.canonical_json_bytes(values), mtime=0)
            (shard_root / f"{bucket}.json.gz").write_bytes(raw)
            shards.append(
                {
                    "bucket": bucket,
                    "path": f"data/link-validation/shards/{bucket}.json.gz",
                    "items": len(values),
                    "bytes": len(raw),
                    "sha256": digest(raw),
                }
            )
        root_basis = [
            {"bucket": shard["bucket"], "sha256": shard["sha256"]}
            for shard in shards
        ]
        manifest = {
            "schema": link_intents.EXPECTED_SCHEMA,
            "algorithm": link_intents.EXPECTED_ALGORITHM,
            "buckets": 64,
            "items": len(rows),
            "kind": "link-intents",
            "observations_included": False,
            "occurrence_order": "URL, kind, route, record route",
            "root_sha256": digest(link_intents.canonical_json_bytes(root_basis)),
            "shard_key": "canonical URL",
            "snapshot": "fixture",
            "shards": shards,
        }
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        policy_path = root / "release-assurance/link-observation-policy.json"
        policy_path.parent.mkdir(parents=True)
        policy_path.write_text(json.dumps(self.policy), encoding="utf-8")
        return manifest_path, manifest

    def write_publication_closure_fixture(self, root: Path) -> dict[str, object]:
        for candidate_root in (root, root / "tiny", root / "synthetic"):
            self.write_link_fixture(candidate_root)
        (root / "index.html").write_text(
            '<a href="https://docs.example.test/guide">Guide</a>'
            '<a href="https://historicengland.org.uk/rich">Rich</a>',
            encoding="utf-8",
        )
        action = self.protected_action()
        (root / "journeys.json").write_text(
            json.dumps(
                {
                    "journeys": [
                        {"id": "journey-publication", "actions": [action]}
                    ]
                }
            ),
            encoding="utf-8",
        )
        materials = []
        for path in sorted(item for item in root.rglob("*") if item.is_file()):
            relative = path.relative_to(root).as_posix()
            raw = path.read_bytes()
            materials.append(
                {
                    "path": relative,
                    "role": "reading-page" if relative.endswith(".html") else "corpus",
                    "bytes": len(raw),
                    "sha256": digest(raw),
                }
            )
        publication_manifest = {
            "schema": "okf-publication-unit-manifest.v1",
            "algorithm": "sha256-canonical-json-materials-v1",
            "tree_sha256": digest(link_intents.canonical_json_bytes(materials)),
            "file_count": len(materials),
            "materials": materials,
        }
        (root / "publication-unit-manifest.json").write_text(
            json.dumps(publication_manifest), encoding="utf-8"
        )
        return action

    def protected_action(self) -> dict:
        return {
            "sequence": 2,
            "action": "verify_url",
            "value": "https://historicengland.org.uk/rich",
            "expected_text": "Rich identity",
            "verification_channel": "genuine-browser-receipt",
            "receipt": "evidence/protected-source-link-receipt.json",
        }

    def genuine_receipt(self, action: dict) -> dict:
        observed = iso(self.now - timedelta(hours=1))
        return {
            "schema": "okf-genuine-browser-link-receipt.v1",
            "observed_at": observed,
            "browser": {
                "channel": self.policy["protected_browser_channel"],
                "user_agent": "Chrome fixture",
                "webdriver": False,
                "languages": ["en-GB"],
            },
            "scope": {
                "journey_id": "journey-publication",
                "sequences": [action["sequence"]],
                "limitation": "fixture",
            },
            "records": [
                {
                    "observed_at": observed,
                    "requested_url": action["value"],
                    "final_url": action.get("expected_final_url", action["value"]),
                    "title": "Rich identity page",
                    "response_status": 200,
                    "expected_text": action["expected_text"],
                    "identity_matched": True,
                    "identity_source": "document.body.innerText",
                    "identity_excerpt": f"Verified {action['expected_text']} content",
                }
            ],
        }

    def test_validation_receipt_binds_manifest_identity_and_exact_checks(self) -> None:
        validation = {
            "schema": "okf-publication-validation-receipt.v1",
            "status": "passed",
            "observed_at": iso(self.now - timedelta(minutes=2)),
            "subject": self.subject(),
            "candidate": {
                "heritage_descriptor_sha256": "b" * 64,
                "heritage_release_root_sha256": "c" * 64,
            },
            "checks": {
                "publication_tree_exact": "passed",
                "plane_roots_recomputed": "passed",
                "link_manifest_bound": "passed",
            },
        }
        self.assertEqual([], self.errors("validation", validation))
        failed = copy.deepcopy(validation)
        failed["subject"]["publication_manifest_sha256"] = "0" * 64
        failed["checks"]["late_unbound_check"] = "passed"
        errors = self.errors("validation", failed)
        self.assertTrue(any("publication_manifest" in error for error in errors))
        self.assertTrue(any("exact passing checks" in error for error in errors))

    def test_bulk_receipt_is_an_exact_partition_of_verified_intents(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest_path, manifest = self.write_link_fixture(root)
            universe = link_intents.load_intent_universe(manifest_path)
            observed_at = self.now - timedelta(minutes=3)
            records = []
            delegated = []
            for url, projection in universe["intents"].items():
                expiry = iso(
                    observed_at
                    + timedelta(days=self.policy["freshness_days"][projection["risk"]])
                )
                identity = {
                    **projection,
                    "expires_at": expiry,
                }
                if projection["risk"] == "protected-rich-page":
                    delegated.append(
                        {
                            "url": url,
                            "risk": projection["risk"],
                            "channel": self.policy["protected_browser_channel"],
                            "identity_expectation": projection[
                                "identity_expectation"
                            ],
                            "intent_sha256": projection["intent_sha256"],
                            "expires_at": expiry,
                        }
                    )
                else:
                    record = {
                        **identity,
                        "observed_at": iso(observed_at),
                        "engine": "python-urllib",
                        "attempt_count": 1,
                        "status": "reachable",
                        "http_status": 200,
                        "final_url": url,
                    }
                    if (
                        url.startswith("https://historicengland.org.uk/")
                        and projection["risk"] == "official-record"
                    ):
                        record.update(
                            {
                                "status": "protected-origin",
                                "http_status": 403,
                                "validation_basis": (
                                    "candidate-identifier-binding-plus-"
                                    "protected-origin-http-403"
                                ),
                            }
                        )
                    records.append(record)
            records.sort(key=lambda item: item["url"])
            delegated.sort(key=lambda item: item["url"])
            policy_path = root / "release-assurance/link-observation-policy.json"
            receipt = {
                "schema": "okf-link-observation-receipt.v1",
                "observed_at": iso(observed_at),
                "candidate_manifest_sha256": digest(manifest_path.read_bytes()),
                "policy_sha256": digest(policy_path.read_bytes()),
                "rotation_cycle_days": 1,
                "complete_manifest_coverage": True,
                "manifest_shard_count": len(manifest["shards"]),
                "selected_buckets": [item["bucket"] for item in manifest["shards"]],
                "records": records,
                "delegated": delegated,
            }
            self.assertEqual([], self.errors("links", receipt, root))

            mutations = []
            omitted = copy.deepcopy(receipt)
            omitted["records"] = []
            mutations.append((omitted, "exact canonical bulk URL set"))
            duplicated = copy.deepcopy(receipt)
            duplicated["delegated"].append(copy.deepcopy(duplicated["delegated"][0]))
            mutations.append((duplicated, "duplicates"))
            wrong_policy = copy.deepcopy(receipt)
            wrong_policy["policy_sha256"] = "0" * 64
            mutations.append((wrong_policy, "exact observation policy"))
            wrong_intent = copy.deepcopy(receipt)
            wrong_intent["records"][0]["intent_sha256"] = "0" * 64
            mutations.append((wrong_intent, "intent_sha256"))
            protected_index = next(
                index
                for index, record in enumerate(receipt["records"])
                if record["status"] == "protected-origin"
            )
            wrong_basis = copy.deepcopy(receipt)
            wrong_basis["records"][protected_index]["validation_basis"] = "wrong"
            mutations.append((wrong_basis, "did not pass"))
            wrong_status = copy.deepcopy(receipt)
            wrong_status["records"][protected_index]["http_status"] = 404
            mutations.append((wrong_status, "did not pass"))
            wrong_risk = copy.deepcopy(receipt)
            wrong_risk["records"][protected_index]["risk"] = "other"
            mutations.append((wrong_risk, "risk differs"))
            unprotected_host = copy.deepcopy(receipt)
            unprotected_host["records"][0].update(
                {
                    "status": "protected-origin",
                    "http_status": 403,
                    "validation_basis": (
                        "candidate-identifier-binding-plus-protected-origin-http-403"
                    ),
                }
            )
            mutations.append((unprotected_host, "did not pass"))
            for broken, phrase in mutations:
                with self.subTest(phrase=phrase):
                    self.assertTrue(
                        any(phrase in error for error in self.errors("links", broken, root)),
                        self.errors("links", broken, root),
                    )

    def test_publication_link_receipt_replays_every_anchor_and_all_three_universes(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.write_publication_closure_fixture(root)
            universe = link_intents.load_publication_link_universe(root)
            observed_at = self.now - timedelta(minutes=3)
            records = []
            delegated = []
            for url, projection in universe["intents"].items():
                expiry = iso(
                    observed_at
                    + timedelta(days=self.policy["freshness_days"][projection["risk"]])
                )
                if projection["risk"] == "protected-rich-page":
                    delegated.append(
                        {
                            "url": url,
                            "risk": projection["risk"],
                            "channel": self.policy["protected_browser_channel"],
                            "identity_expectation": projection["identity_expectation"],
                            "intent_sha256": projection["intent_sha256"],
                            "expires_at": expiry,
                        }
                    )
                else:
                    record = {
                        **projection,
                        "observed_at": iso(observed_at),
                        "expires_at": expiry,
                        "engine": "python-urllib",
                        "attempt_count": 1,
                        "status": "reachable",
                        "http_status": 200,
                        "final_url": url,
                    }
                    if (
                        url.startswith("https://historicengland.org.uk/")
                        and projection["risk"] in {"official-record", "official-resource"}
                    ):
                        record.update(
                            {
                                "status": "protected-origin",
                                "http_status": 403,
                                "validation_basis": (
                                    "candidate-identifier-binding-plus-"
                                    "protected-origin-http-403"
                                ),
                            }
                        )
                    records.append(record)
            records.sort(key=lambda item: item["url"])
            delegated.sort(key=lambda item: item["url"])
            shard_count = int(universe["manifest_shard_count"])
            receipt = {
                "schema": "okf-publication-link-closure-receipt.v1",
                "observed_at": iso(observed_at),
                "policy_sha256": digest(
                    (root / "release-assurance/link-observation-policy.json").read_bytes()
                ),
                "rotation_cycle_days": (
                    shard_count + self.policy["shards_per_nightly_run"] - 1
                )
                // self.policy["shards_per_nightly_run"],
                "complete_manifest_coverage": True,
                "manifest_shard_count": shard_count,
                "selected_shards": universe["selected_shards"],
                "coverage": universe["coverage"],
                "records": records,
                "delegated": delegated,
            }
            self.assertEqual([], self.errors("links", receipt, root))

            not_modified = copy.deepcopy(receipt)
            reachable_index = next(
                index
                for index, record in enumerate(not_modified["records"])
                if record["status"] == "reachable"
            )
            not_modified["records"][reachable_index].update(
                {
                    "http_status": 304,
                    "reachability_basis": "http-304-not-modified-resource-exists",
                }
            )
            self.assertEqual([], self.errors("links", not_modified, root))

            missing_anchor = copy.deepcopy(receipt)
            missing_anchor["records"] = [
                row
                for row in missing_anchor["records"]
                if row["url"] != "https://docs.example.test/guide"
            ]
            self.assertTrue(
                any(
                    "exact canonical bulk URL set" in error
                    for error in self.errors("links", missing_anchor, root)
                )
            )
            changed_anchor_root = copy.deepcopy(receipt)
            changed_anchor_root["coverage"]["rendered_external_anchors"][
                "root_sha256"
            ] = "0" * 64
            self.assertTrue(
                any(
                    "three-manifest closure" in error
                    for error in self.errors("links", changed_anchor_root, root)
                )
            )

            (root / "unmanifested.html").write_text(
                '<a href="https://gap.example.test/">Gap</a>', encoding="utf-8"
            )
            self.assertTrue(
                any(
                    "exact publication-manifest HTML set" in error
                    for error in self.errors("links", receipt, root)
                )
            )

    def test_genuine_browser_receipt_exactly_covers_protected_actions(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            action = self.protected_action()
            (root / "journeys.json").write_text(
                json.dumps({"journeys": [{"id": "journey-publication", "actions": [action]}]}),
                encoding="utf-8",
            )
            receipt = self.genuine_receipt(action)
            self.assertEqual([], self.errors("protected", receipt, root))
            reprobed_action = copy.deepcopy(action)
            reprobed_action["expected_final_url"] = f"{action['value']}?canonical=1"
            (root / "journeys.json").write_text(
                json.dumps(
                    {
                        "journeys": [
                            {
                                "id": "journey-publication",
                                "actions": [reprobed_action],
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )
            reprobed = self.genuine_receipt(reprobed_action)
            reprobed["records"][0].update(
                {
                    "requested_final_url": action["value"],
                    "canonical_reprobe": True,
                    "validation_basis": (
                        "requested-page-and-declared-canonical-page-"
                        "both-identity-matched"
                    ),
                }
            )
            self.assertEqual([], self.errors("protected", reprobed, root))
            (root / "journeys.json").write_text(
                json.dumps(
                    {"journeys": [{"id": "journey-publication", "actions": [action]}]}
                ),
                encoding="utf-8",
            )
            broken = copy.deepcopy(receipt)
            broken["records"].append(copy.deepcopy(broken["records"][0]))
            broken["scope"]["sequences"] = [99]
            errors = self.errors("protected", broken, root)
            self.assertTrue(any("one record" in error for error in errors))
            self.assertTrue(any("scope" in error for error in errors))

    def write_raw_journey_fixture(self, root: Path, repository_root: Path) -> tuple[dict, dict]:
        live = {
            "sequence": 1,
            "action": "verify_url",
            "value": "https://example.test/published",
            "expected_text": "Published identity",
        }
        protected = self.protected_action()
        journey = {
            "id": "journey-publication",
            "title": "Publication",
            "persona_ids": ["beginner"],
            "story_ids": ["assurance"],
            "start": {"bundle": "https://pages.test/unit/okf-explorer.json"},
            "actions": [live, protected],
            "assertions": [{"assertion": "visible_text", "value": "Published"}],
        }
        (root / "journeys.json").write_text(
            json.dumps({"journeys": [journey]}), encoding="utf-8"
        )
        link_manifest = root / "data/link-validation/manifest.json"
        link_manifest.parent.mkdir(parents=True)
        link_manifest.write_text('{"fixture":true}\n', encoding="utf-8")
        manifest = {
            "schema": "okf-publication-unit-manifest.v1",
            "pages_base_url": "https://pages.test/unit/",
            "materials": [
                {
                    "path": "assurance/plane-roots.json",
                    "role": "corpus",
                    "bytes": 20,
                    "sha256": "1" * 64,
                },
                {
                    "path": "okf-explorer.json",
                    "role": "corpus",
                    "bytes": 10,
                    "sha256": "b" * 64,
                },
            ],
        }
        manifest_path = root / "publication-unit-manifest.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        self.envelope["subject"]["site_artifact"]["manifest_sha256"] = digest(
            manifest_path.read_bytes()
        )
        self.envelope["subject"]["site_artifact"]["file_count"] = 4
        subject = self.subject(digest(link_manifest.read_bytes()))
        subject["publication_manifest_sha256"] = self.envelope["subject"][
            "site_artifact"
        ]["manifest_sha256"]
        genuine = self.genuine_receipt(protected)
        genuine_raw = (json.dumps(genuine, sort_keys=True) + "\n").encode()
        genuine_sha = digest(genuine_raw)

        def evidence(action: dict, *, protected_channel: bool = False) -> dict:
            final_url = action.get("expected_final_url", action["value"])
            value = {
                "verificationChannel": action.get(
                    "verification_channel", "live-browser"
                ),
                "requestedUrl": action["value"],
                "finalUrl": final_url,
                "status": 200,
                "expectedText": action["expected_text"],
                "identityMatched": True,
                "expectedFinalUrl": final_url,
                "finalLocationMatched": True,
                "expectedFinalHash": action.get("expected_final_hash"),
                "finalHashMatched": (
                    True if action.get("expected_final_hash") is not None else None
                ),
            }
            if protected_channel:
                record = genuine["records"][0]
                value.update(
                    {
                        "receipt": action["receipt"],
                        "receiptSha256": genuine_sha,
                        "receiptObservedAt": genuine["observed_at"],
                        "recordObservedAt": record["observed_at"],
                        "title": record["title"],
                        "identitySource": record["identity_source"],
                        "identityExcerpt": record["identity_excerpt"],
                        "browser": {
                            "channel": genuine["browser"]["channel"],
                            "userAgent": genuine["browser"]["user_agent"],
                            "webdriver": False,
                        },
                    }
                )
            return value

        bundle = "https://pages.test/unit/okf-explorer.json"
        generated_at = iso(self.now - timedelta(minutes=1))
        result = {
            "schema": "okf-explorer-evaluation-results.v1",
            "generated_at": generated_at,
            "base_url": "https://explorer.test/",
            "bundle": bundle,
            "metadata": {
                "browser": "playwright",
                "browser_engine": "chromium",
                "mode": "browser-scored",
                "candidate_bundle_url": bundle,
            },
            "candidate": {
                "bundle_url": bundle,
                "descriptor_sha256": "b" * 64,
                "release_root": {
                    "plane_roots_url": "https://pages.test/unit/assurance/plane-roots.json",
                    "plane_roots_sha256": "1" * 64,
                    "release_root_sha256": "c" * 64,
                },
                "site_artifact": {
                    "manifest_url": "https://pages.test/unit/publication-unit-manifest.json",
                    "publication_manifest_sha256": subject[
                        "publication_manifest_sha256"
                    ],
                    "tree_sha256": "d" * 64,
                    "file_count": 4,
                    "materials": {
                        "descriptor": {
                            "path": "okf-explorer.json",
                            "bytes": 10,
                            "sha256": "b" * 64,
                        },
                        "plane_roots": {
                            "path": "assurance/plane-roots.json",
                            "bytes": 20,
                            "sha256": "1" * 64,
                        },
                    },
                },
                "candidate_receipt": {
                    "schema": "okf-publication-validation-receipt.v1",
                    "path": "/temporary/publication-validation-receipt.json",
                    "raw_sha256": "e" * 64,
                    "observed_at": iso(self.now - timedelta(minutes=4)),
                    "expected_descriptor_sha256": "b" * 64,
                    "expected_release_root_sha256": "c" * 64,
                    "expected_publication_manifest_sha256": subject[
                        "publication_manifest_sha256"
                    ],
                    "expected_site_tree_sha256": "d" * 64,
                    "expected_site_file_count": 4,
                },
            },
            "interaction_journeys": {
                "manifest": "journeys.json",
                "target_bundle": bundle,
                "summary": {
                    "journeys_run": 1,
                    "passed": 1,
                    "failed": 0,
                    "errors": 0,
                    "validation_only": 0,
                },
                "records": [
                    {
                        "id": journey["id"],
                        "title": journey["title"],
                        "persona_ids": journey["persona_ids"],
                        "story_ids": journey["story_ids"],
                        "start_url": (
                            "https://explorer.test/?"
                            + urlencode({"bundle": bundle})
                        ),
                        "status": "passed",
                        "elapsed_ms": 1,
                        "actions": [
                            {
                                "action": "verify_url",
                                "passed": True,
                                "evidence": evidence(live),
                            },
                            {
                                "action": "verify_url",
                                "passed": True,
                                "evidence": evidence(
                                    protected, protected_channel=True
                                ),
                            },
                        ],
                        "assertions": [
                            {
                                "assertion": "visible_text",
                                "passed": True,
                                "expected": "Published",
                                "actual": "Published",
                            }
                        ],
                    }
                ],
            },
        }
        result_path = repository_root / "evidence/journey-chromium-results.json"
        result_path.parent.mkdir(parents=True)
        result_path.write_text(json.dumps(result), encoding="utf-8")
        receipt = {
            "schema": "okf-publication-journey-receipt.v1",
            "status": "passed",
            "observed_at": generated_at,
            "subject": subject,
            "journey_id": "journey-publication",
            "expected_action_count": 2,
            "assurance_source_commit": "f" * 40,
            "engines": [
                {
                    "engine": engine,
                    "status": "passed",
                    "result_ref": f"evidence/journey-{engine}-results.json",
                    "result_sha256": digest(result_path.read_bytes()),
                    "observed_at": generated_at,
                    "actions_passed": 2,
                    "assertions_passed": 1,
                }
                for engine in ("chromium", "firefox", "webkit")
            ],
        }
        for engine in ("firefox", "webkit"):
            engine_result = copy.deepcopy(result)
            engine_result["metadata"]["browser_engine"] = engine
            path = repository_root / f"evidence/journey-{engine}-results.json"
            path.write_text(json.dumps(engine_result), encoding="utf-8")
            receipt["engines"][["chromium", "firefox", "webkit"].index(engine)][
                "result_sha256"
            ] = digest(path.read_bytes())
        return receipt, {"okf-genuine-browser-link-receipt.v1": (genuine, genuine_sha)}

    def test_journey_receipt_resolves_and_replays_each_raw_engine_result(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            publication = workspace / "site"
            repository = workspace / "promotion"
            publication.mkdir()
            receipt, resolved = self.write_raw_journey_fixture(publication, repository)
            self.assertEqual(
                [],
                self.errors(
                    "journey",
                    receipt,
                    publication,
                    repository_root=repository,
                    resolved_by_schema=resolved,
                ),
            )
            raw_path = repository / "evidence/journey-webkit-results.json"
            broken = json.loads(raw_path.read_text(encoding="utf-8"))
            broken["candidate"]["site_artifact"]["tree_sha256"] = "0" * 64
            raw_path.write_text(json.dumps(broken), encoding="utf-8")
            receipt["engines"][2]["result_sha256"] = digest(raw_path.read_bytes())
            errors = self.errors(
                "journey",
                receipt,
                publication,
                repository_root=repository,
                resolved_by_schema=resolved,
            )
            self.assertTrue(any("Site artifact identity" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
