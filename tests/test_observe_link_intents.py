from __future__ import annotations

import copy
import gzip
import hashlib
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

from scripts import observe_link_intents


class ObserveLinkIntentsTests(unittest.TestCase):
    def protected_policy(self) -> dict:
        return {
            "accepted_protected_responses": [
                {
                    "host": "historicengland.org.uk",
                    "risks": ["official-record", "official-resource"],
                    "http_status": 403,
                    "validation_basis": (
                        "candidate-identifier-binding-plus-protected-origin-http-403"
                    ),
                }
            ]
        }

    def intent_fixture(self, root: Path) -> tuple[Path, dict]:
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
                "basis": "genuine-browser-receipt",
                "kind": "resource",
                "record_route": "",
                "route": "resource/rich",
                "status": "valid",
                "url": "https://historicengland.org.uk/rich",
            },
            {
                "basis": "source-declared",
                "kind": "record-primary",
                "record_route": "asset/2",
                "route": "",
                "status": "valid",
                "url": "https://historicengland.org.uk/listing/the-list/2",
            },
            {
                "basis": "generated file namespace",
                "kind": "resource",
                "record_route": "asset/3",
                "route": "resource/3/geometry",
                "status": "valid",
                "url": "https://pages.test/data/geo/3.geojson",
            },
        ]
        grouped: dict[str, list[dict]] = {}
        for row in rows:
            grouped.setdefault(
                observe_link_intents.stable_bucket(row["url"], buckets=64), []
            ).append(row)
        shards = []
        for bucket, bucket_rows in sorted(grouped.items()):
            bucket_rows.sort(key=observe_link_intents.row_order_key)
            raw = gzip.compress(
                observe_link_intents.canonical_json_bytes(bucket_rows), mtime=0
            )
            path = shard_root / f"{bucket}.json.gz"
            path.write_bytes(raw)
            shards.append(
                {
                    "bucket": bucket,
                    "path": f"data/link-validation/shards/{bucket}.json.gz",
                    "items": len(bucket_rows),
                    "bytes": len(raw),
                    "sha256": hashlib.sha256(raw).hexdigest(),
                }
            )
        root_basis = [
            {"bucket": shard["bucket"], "sha256": shard["sha256"]}
            for shard in shards
        ]
        manifest = {
            "schema": observe_link_intents.EXPECTED_SCHEMA,
            "algorithm": observe_link_intents.EXPECTED_ALGORITHM,
            "buckets": 64,
            "items": len(rows),
            "kind": "link-intents",
            "observations_included": False,
            "occurrence_order": "URL, kind, route, record route",
            "root_sha256": hashlib.sha256(
                observe_link_intents.canonical_json_bytes(root_basis)
            ).hexdigest(),
            "shard_key": "canonical URL",
            "snapshot": "fixture",
            "shards": shards,
        }
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        return manifest_path, manifest

    def publication_fixture(self, root: Path) -> Path:
        for candidate_root in (root, root / "tiny", root / "synthetic"):
            self.intent_fixture(candidate_root)
        (root / "index.html").write_text(
            '<a href="https://docs.example.test/guide?b=2&a=1#start">Guide</a>'
            '<a href="https://historicengland.org.uk/rich">Rich</a>',
            encoding="utf-8",
        )
        (root / "journeys.json").write_text(
            json.dumps(
                {
                    "journeys": [
                        {
                            "id": "journey-publication",
                            "actions": [
                                {
                                    "sequence": 1,
                                    "action": "verify_url",
                                    "value": "https://historicengland.org.uk/rich",
                                    "expected_text": "Rich identity",
                                    "verification_channel": "genuine-browser-receipt",
                                }
                            ],
                        }
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
                    "sha256": hashlib.sha256(raw).hexdigest(),
                }
            )
        publication_manifest = {
            "schema": "okf-publication-unit-manifest.v1",
            "algorithm": "sha256-canonical-json-materials-v1",
            "tree_sha256": hashlib.sha256(
                observe_link_intents.canonical_json_bytes(materials)
            ).hexdigest(),
            "file_count": len(materials),
            "materials": materials,
        }
        (root / "publication-unit-manifest.json").write_text(
            json.dumps(publication_manifest), encoding="utf-8"
        )
        return root

    def refresh_publication_material(self, root: Path, relative: str) -> None:
        manifest_path = root / "publication-unit-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        raw = (root / relative).read_bytes()
        material = next(item for item in manifest["materials"] if item["path"] == relative)
        material["bytes"] = len(raw)
        material["sha256"] = hashlib.sha256(raw).hexdigest()
        manifest["tree_sha256"] = hashlib.sha256(
            observe_link_intents.canonical_json_bytes(manifest["materials"])
        ).hexdigest()
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    def test_manifest_paths_are_resolved_from_the_candidate_root(self) -> None:
        manifest = Path("/tmp/candidate/data/link-validation/manifest.json")
        self.assertEqual(
            Path("/tmp/candidate"),
            observe_link_intents.candidate_root_for_manifest(manifest),
        )
        with self.assertRaisesRegex(RuntimeError, "data/link-validation"):
            observe_link_intents.candidate_root_for_manifest(
                Path("/tmp/candidate/manifest.json")
            )

    def test_canonical_url_and_due_rotation_are_stable(self) -> None:
        self.assertEqual(
            "https://example.test/path?a=1&b=2",
            observe_link_intents.canonical_url(
                "HTTPS://EXAMPLE.TEST/path?b=2&a=1#fragment"
            ),
        )
        manifest = {"shards": [{"bucket": f"{value:02x}"} for value in range(8)]}
        instant = datetime(2026, 8, 4, tzinfo=timezone.utc)
        self.assertEqual(
            observe_link_intents.due_shards(manifest, instant, 3),
            observe_link_intents.due_shards(manifest, instant, 3),
        )
        self.assertEqual(3, len(observe_link_intents.due_shards(manifest, instant, 3)))

        full_manifest = {
            "shards": [{"bucket": f"{value:02x}"} for value in range(256)]
        }
        observed = {
            shard["bucket"]
            for offset in range(64)
            for shard in observe_link_intents.due_shards(
                full_manifest,
                datetime(2026, 1, 1, tzinfo=timezone.utc)
                + timedelta(days=offset),
                4,
            )
        }
        self.assertEqual(256, len(observed))

    def test_protected_rows_are_reserved_for_real_browser(self) -> None:
        self.assertEqual(
            "protected-rich-page",
            observe_link_intents.risk_class(
                {
                    "url": "https://historicengland.org.uk/listing/the-list/1",
                    "basis": "genuine-browser-receipt",
                    "kind": "resource",
                }
            ),
        )
        self.assertEqual(
            "official-record",
            observe_link_intents.risk_class(
                {"url": "https://example.test/1", "kind": "record-primary"}
            ),
        )
        self.assertEqual(
            "official-record",
            observe_link_intents.risk_class(
                {
                    "url": "https://historicengland.org.uk/"
                    "listing/the-list/list-entry/123",
                    "basis": "source-declared",
                    "kind": "record-primary",
                }
            ),
        )
        self.assertEqual(
            "official-resource",
            observe_link_intents.risk_class(
                {
                    "url": "https://services.historicengland.org.uk/api/data.json",
                    "kind": "resource",
                }
            ),
        )

    def test_exact_universe_verifies_shards_partition_and_deterministic_identity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            manifest_path, manifest = self.intent_fixture(Path(directory))
            universe = observe_link_intents.load_intent_universe(manifest_path)
            self.assertEqual(4, universe["occurrence_count"])
            intents = universe["intents"]
            self.assertEqual(
                [
                    "https://example.test/item?a=1&b=2",
                    "https://historicengland.org.uk/listing/the-list/2",
                    "https://historicengland.org.uk/rich",
                    "https://pages.test/data/geo/3.geojson",
                ],
                sorted(intents),
            )
            self.assertEqual(
                "protected-rich-page",
                intents["https://historicengland.org.uk/rich"]["risk"],
            )
            first_identity = intents["https://example.test/item?a=1&b=2"][
                "intent_sha256"
            ]
            self.assertEqual(
                first_identity,
                observe_link_intents.load_intent_universe(manifest_path)["intents"][
                    "https://example.test/item?a=1&b=2"
                ]["intent_sha256"],
            )

            broken = copy.deepcopy(manifest)
            broken["shards"][0]["bucket"] = "3f"
            manifest_path.write_text(json.dumps(broken), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "bucket|path|root"):
                observe_link_intents.load_intent_universe(manifest_path)

    def test_publication_closure_has_no_anchor_or_candidate_universe_gap(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = self.publication_fixture(Path(directory))
            universe = observe_link_intents.load_publication_link_universe(root)
            coverage = universe["coverage"]
            self.assertEqual(3, len(coverage["intent_manifests"]))
            self.assertEqual(2, coverage["rendered_external_anchors"]["occurrence_count"])
            self.assertEqual(1, coverage["protected_journey"]["canonical_url_count"])
            self.assertEqual(5, coverage["canonical_url_count"])
            self.assertEqual(
                "protected-rich-page",
                universe["intents"]["https://historicengland.org.uk/rich"]["risk"],
            )
            self.assertIn(
                "https://docs.example.test/guide?a=1&b=2",
                universe["intents"],
            )

            (root / "extra.html").write_text(
                '<a href="https://gap.example.test/">Gap</a>', encoding="utf-8"
            )
            with self.assertRaisesRegex(RuntimeError, "exact publication-manifest HTML set"):
                observe_link_intents.load_publication_link_universe(root)
            (root / "extra.html").unlink()

            journeys = json.loads((root / "journeys.json").read_text(encoding="utf-8"))
            journeys["journeys"][0]["actions"] = []
            (root / "journeys.json").write_text(json.dumps(journeys), encoding="utf-8")
            self.refresh_publication_material(root, "journeys.json")
            with self.assertRaisesRegex(RuntimeError, "not explicitly covered"):
                observe_link_intents.load_publication_link_universe(root)

    def test_protected_origin_exception_requires_exact_policy_tuple(self) -> None:
        policy = self.protected_policy()
        observation = {
            "status": "http-error",
            "http_status": 403,
            "final_url": "https://historicengland.org.uk/listing/the-list/1",
        }
        accepted = observe_link_intents.apply_protected_response_policy(
            observation,
            url="https://historicengland.org.uk/listing/the-list/1",
            risk="official-record",
            policy=policy,
        )
        self.assertEqual("protected-origin", accepted["status"])
        self.assertEqual(
            "candidate-identifier-binding-plus-protected-origin-http-403",
            accepted["validation_basis"],
        )
        self.assertTrue(observe_link_intents.observation_passes(accepted))

        for url, risk, status in (
            (
                "https://www.historicengland.org.uk/listing/the-list/1",
                "official-record",
                403,
            ),
            (
                "https://historicengland.org.uk/listing/the-list/1",
                "other",
                403,
            ),
            (
                "https://historicengland.org.uk/listing/the-list/1",
                "official-record",
                404,
            ),
            (
                "https://chris-page-gov.github.io/data/geo/1.geojson",
                "official-resource",
                404,
            ),
        ):
            with self.subTest(url=url, risk=risk, status=status):
                rejected = observe_link_intents.apply_protected_response_policy(
                    {
                        "status": "http-error",
                        "http_status": status,
                        "final_url": url,
                    },
                    url=url,
                    risk=risk,
                    policy=policy,
                )
                self.assertEqual("http-error", rejected["status"])
                self.assertNotIn("validation_basis", rejected)
                self.assertFalse(observe_link_intents.observation_passes(rejected))

    def test_protected_origin_policy_rejects_wildcards_and_broad_statuses(self) -> None:
        wildcard = self.protected_policy()
        wildcard["accepted_protected_responses"][0]["host"] = (
            "*.historicengland.org.uk"
        )
        with self.assertRaisesRegex(RuntimeError, "exact host"):
            observe_link_intents.validated_protected_response_rules(wildcard)
        broad_status = self.protected_policy()
        broad_status["accepted_protected_responses"][0]["http_status"] = 404
        with self.assertRaisesRegex(RuntimeError, "HTTP 403"):
            observe_link_intents.validated_protected_response_rules(broad_status)
        broad_risk = self.protected_policy()
        broad_risk["accepted_protected_responses"][0]["risks"].append("other")
        with self.assertRaisesRegex(RuntimeError, "scoped exactly|invalid risks"):
            observe_link_intents.validated_protected_response_rules(broad_risk)
        changed_basis = self.protected_policy()
        changed_basis["accepted_protected_responses"][0][
            "validation_basis"
        ] = "generic-http-error"
        with self.assertRaisesRegex(RuntimeError, "unrecognized validation_basis"):
            observe_link_intents.validated_protected_response_rules(changed_basis)
        extra_rule = self.protected_policy()
        extra_rule["accepted_protected_responses"].append(
            copy.deepcopy(extra_rule["accepted_protected_responses"][0])
        )
        with self.assertRaisesRegex(RuntimeError, "exactly one"):
            observe_link_intents.validated_protected_response_rules(extra_rule)

    def test_fail_on_error_accepts_exact_protected_origin_but_not_pages_404(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest_path, _manifest = self.intent_fixture(root)
            policy = {
                **self.protected_policy(),
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
                "protected_browser_channel": "genuine-google-chrome-cdp",
            }
            policy_path = root / "policy.json"
            policy_path.write_text(json.dumps(policy), encoding="utf-8")
            output = root / "receipt.json"

            def observation(url: str, **_kwargs: object) -> dict[str, object]:
                if url == "https://historicengland.org.uk/listing/the-list/2":
                    return {"status": "http-error", "http_status": 403, "final_url": url}
                return {"status": "reachable", "http_status": 200, "final_url": url}

            args = [
                "--manifest",
                str(manifest_path),
                "--policy",
                str(policy_path),
                "--output",
                str(output),
                "--all-shards",
                "--fail-on-error",
                "--observed-at",
                "2026-08-04T12:00:00Z",
            ]
            with (
                mock.patch.object(
                    observe_link_intents, "observe", side_effect=observation
                ),
                redirect_stdout(io.StringIO()),
                redirect_stderr(io.StringIO()),
            ):
                self.assertEqual(0, observe_link_intents.main(args))
            receipt = json.loads(output.read_text(encoding="utf-8"))
            protected = next(
                record
                for record in receipt["records"]
                if record["status"] == "protected-origin"
            )
            self.assertEqual(403, protected["http_status"])

            def with_pages_404(url: str, **kwargs: object) -> dict[str, object]:
                if url == "https://pages.test/data/geo/3.geojson":
                    return {"status": "http-error", "http_status": 404, "final_url": url}
                return observation(url, **kwargs)

            with mock.patch.object(
                observe_link_intents, "observe", side_effect=with_pages_404
            ), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                self.assertEqual(1, observe_link_intents.main(args))

    def test_publication_observer_emits_exact_bounded_closure_receipt(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = self.publication_fixture(Path(directory))
            policy = {
                **self.protected_policy(),
                "shards_per_nightly_run": 4,
                "maximum_bulk_cycle_days": 64,
                "concurrent_requests": 2,
                "request_timeout_seconds": 1,
                "terminal_bounds": {
                    "maximum_canonical_urls": 10,
                    "maximum_attempts_per_url": 2,
                    "bulk_step_timeout_minutes": 1,
                    "job_timeout_minutes": 3,
                    "reserved_non_bulk_minutes": 2,
                },
                "user_agent": "fixture",
                "freshness_days": {
                    "protected-rich-page": 1,
                    "official-record": 64,
                    "official-resource": 64,
                    "other": 64,
                },
                "protected_browser_channel": "genuine-google-chrome-cdp",
            }
            policy_path = root / "policy.json"
            policy_path.write_text(json.dumps(policy), encoding="utf-8")
            output = root / "receipt.json"

            def reachable(url: str, **_kwargs: object) -> dict[str, object]:
                return {"status": "reachable", "http_status": 200, "final_url": url}

            with (
                mock.patch.object(observe_link_intents, "observe", side_effect=reachable),
                redirect_stdout(io.StringIO()),
                redirect_stderr(io.StringIO()),
            ):
                self.assertEqual(
                    0,
                    observe_link_intents.main(
                        [
                            "--publication-root",
                            str(root),
                            "--policy",
                            str(policy_path),
                            "--output",
                            str(output),
                            "--all-shards",
                            "--fail-on-error",
                            "--observed-at",
                            "2026-08-04T12:00:00Z",
                        ]
                    ),
                )
            receipt = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(
                "okf-publication-link-closure-receipt.v1", receipt["schema"]
            )
            self.assertEqual(5, receipt["coverage"]["canonical_url_count"])
            self.assertEqual(1, len(receipt["delegated"]))
            self.assertEqual(4, len(receipt["records"]))

            policy["terminal_bounds"]["maximum_canonical_urls"] = 4
            policy_path.write_text(json.dumps(policy), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "reviewed terminal URL bound"):
                observe_link_intents.main(
                    [
                        "--publication-root",
                        str(root),
                        "--policy",
                        str(policy_path),
                        "--output",
                        str(output),
                        "--all-shards",
                    ]
                )


if __name__ == "__main__":
    unittest.main()
