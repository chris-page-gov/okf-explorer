#!/usr/bin/env python3
"""Observe due hash shards without adding mutable link status to a candidate."""

from __future__ import annotations

import argparse
import concurrent.futures
import gzip
import hashlib
import json
import math
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "release-assurance" / "link-observation-policy.json"
EXPECTED_SCHEMA = "heritage-evaluation-link-validation-shards.v1"
EXPECTED_ALGORITHM = "sha256(identity)-mod-64-gzip-canonical-json-v1"
KNOWN_RISKS = {
    "official-record",
    "official-resource",
    "other",
    "protected-rich-page",
}
PROTECTED_RESPONSE_HOST = "historicengland.org.uk"
PROTECTED_RESPONSE_RISKS = ["official-record", "official-resource"]
PROTECTED_RESPONSE_STATUS = 403
PROTECTED_RESPONSE_VALIDATION_BASIS = (
    "candidate-identifier-binding-plus-protected-origin-http-403"
)
NOT_MODIFIED_STATUS = 304
NOT_MODIFIED_REACHABILITY_BASIS = "http-304-not-modified-resource-exists"
RETRY_BACKOFF_SECONDS = 0.25
PUBLICATION_LINK_MANIFESTS = (
    "data/link-validation/manifest.json",
    "tiny/data/link-validation/manifest.json",
    "synthetic/data/link-validation/manifest.json",
)
PUBLICATION_MANIFEST_NAME = "publication-unit-manifest.json"
PUBLICATION_MANIFEST_SCHEMA = "okf-publication-unit-manifest.v1"


def canonical_json_bytes(value: object) -> bytes:
    """Return the byte convention used by the candidate shard manifests."""

    return (
        json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        + "\n"
    ).encode("utf-8")


def stable_bucket(value: str, *, buckets: int = 64) -> str:
    if buckets <= 0 or buckets > 256:
        raise RuntimeError("link-intent bucket count must be between 1 and 256")
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return f"{int.from_bytes(digest[:2], 'big') % buckets:02x}"


def canonical_url(value: str) -> str:
    parts = urlsplit(value)
    if (
        parts.scheme.casefold() not in {"http", "https"}
        or not parts.netloc
        or parts.username is not None
        or parts.password is not None
    ):
        raise ValueError(f"unsupported link intent URL: {value!r}")
    query = urlencode(sorted(parse_qsl(parts.query, keep_blank_values=True)))
    return urlunsplit(
        (parts.scheme.lower(), parts.netloc.lower(), parts.path or "/", query, "")
    )


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


class ExternalAnchorCollector(HTMLParser):
    """Collect authored network anchors in source order from one rendered page."""

    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag.casefold() != "a":
            return
        href = dict(attrs).get("href")
        if isinstance(href, str):
            self.hrefs.append(href)


def safe_publication_material(root: Path, value: object) -> Path:
    if not isinstance(value, str) or not value or "\\" in value:
        raise RuntimeError(f"unsafe publication material path: {value!r}")
    relative = Path(value)
    if relative.is_absolute() or ".." in relative.parts:
        raise RuntimeError(f"unsafe publication material path: {value!r}")
    target = (root / relative).resolve()
    if not target.is_relative_to(root.resolve()):
        raise RuntimeError(f"publication material escapes its root: {value!r}")
    return target


def validated_publication_materials(publication_root: Path) -> tuple[dict, dict[str, dict]]:
    """Load the exact export manifest and verify every material used by closure."""

    manifest_path = publication_root / PUBLICATION_MANIFEST_NAME
    raw = manifest_path.read_bytes()
    manifest = json.loads(raw)
    if not isinstance(manifest, dict) or manifest.get("schema") != PUBLICATION_MANIFEST_SCHEMA:
        raise RuntimeError("publication root has no recognized exact export manifest")
    rows = manifest.get("materials")
    if not isinstance(rows, list):
        raise RuntimeError("publication manifest materials is not an array")
    paths = [row.get("path") if isinstance(row, dict) else None for row in rows]
    if (
        any(not isinstance(path, str) for path in paths)
        or manifest.get("algorithm") != "sha256-canonical-json-materials-v1"
        or manifest.get("file_count") != len(rows)
        or paths != sorted(str(path) for path in paths)
        or manifest.get("tree_sha256") != sha256_bytes(canonical_json_bytes(rows))
    ):
        raise RuntimeError("publication manifest identity or material order differs")
    materials: dict[str, dict] = {}
    for index, row in enumerate(rows):
        if not isinstance(row, dict) or set(row) != {"path", "role", "bytes", "sha256"}:
            raise RuntimeError(f"publication manifest material {index} has an invalid shape")
        path = row.get("path")
        if not isinstance(path, str) or path in materials:
            raise RuntimeError(f"publication manifest material {index} has a duplicate path")
        target = safe_publication_material(publication_root, path)
        if not target.is_file():
            raise RuntimeError(f"publication manifest material is missing: {path}")
        material_raw = target.read_bytes()
        if row.get("bytes") != len(material_raw) or row.get("sha256") != sha256_bytes(
            material_raw
        ):
            raise RuntimeError(f"publication manifest material differs: {path}")
        materials[path] = row
    return manifest, materials


def _publication_anchor_occurrences(
    publication_root: Path,
    materials: dict[str, dict],
) -> list[dict[str, object]]:
    expected_html = sorted(path for path in materials if path.casefold().endswith(".html"))
    actual_html = sorted(
        path.relative_to(publication_root).as_posix()
        for path in publication_root.rglob("*")
        if path.is_file() and path.suffix.casefold() == ".html"
    )
    if actual_html != expected_html:
        raise RuntimeError(
            "rendered HTML files are not the exact publication-manifest HTML set"
        )
    occurrences: list[dict[str, object]] = []
    for path in expected_html:
        parser = ExternalAnchorCollector()
        parser.feed((publication_root / path).read_text(encoding="utf-8"))
        for ordinal, href in enumerate(parser.hrefs, start=1):
            parts = urlsplit(href)
            if not parts.scheme and not parts.netloc:
                continue
            if parts.scheme.casefold() not in {"http", "https"} or not parts.netloc:
                raise RuntimeError(f"unsupported rendered external anchor: {path}: {href!r}")
            occurrences.append(
                {
                    "path": path,
                    "ordinal": ordinal,
                    "href": href,
                    "url": canonical_url(href),
                }
            )
    return occurrences


def _publication_protected_actions(
    publication_root: Path,
    materials: dict[str, dict],
) -> tuple[dict[str, str], str]:
    journey_path = "journeys.json"
    if journey_path not in materials:
        raise RuntimeError("publication manifest does not own journeys.json")
    journeys_raw = (publication_root / journey_path).read_bytes()
    journeys = json.loads(journeys_raw)
    matches = [
        journey
        for journey in journeys.get("journeys", [])
        if isinstance(journey, dict) and journey.get("id") == "journey-publication"
    ]
    if len(matches) != 1:
        raise RuntimeError("publication must declare exactly one journey-publication")
    protected: dict[str, str] = {}
    for action in matches[0].get("actions", []):
        if (
            not isinstance(action, dict)
            or action.get("action") != "verify_url"
            or action.get("verification_channel") != "genuine-browser-receipt"
        ):
            continue
        value = action.get("value")
        expected = action.get("expected_text")
        if not isinstance(value, str) or not isinstance(expected, str) or not expected.strip():
            raise RuntimeError("protected journey action has no URL identity expectation")
        url = canonical_url(value)
        if url in protected:
            raise RuntimeError("protected journey contains a duplicate canonical URL")
        protected[url] = expected
    return protected, sha256_bytes(journeys_raw)


def load_publication_link_universe(publication_root: Path) -> dict[str, object]:
    """Reconstruct every external anchor and all three candidate intent universes."""

    publication_root = publication_root.resolve()
    manifest, materials = validated_publication_materials(publication_root)
    source_entries: dict[str, list[dict[str, object]]] = {}
    intent_manifests: list[dict[str, object]] = []
    shard_count = 0
    for relative in PUBLICATION_LINK_MANIFESTS:
        material = materials.get(relative)
        if material is None:
            raise RuntimeError(f"publication manifest does not own {relative}")
        manifest_path = publication_root / relative
        universe = load_intent_universe(manifest_path)
        link_manifest = universe["manifest"]
        assert isinstance(link_manifest, dict)
        shards = universe["shards"]
        assert isinstance(shards, list)
        shard_count += len(shards)
        intents = universe["intents"]
        assert isinstance(intents, dict)
        intent_manifests.append(
            {
                "path": relative,
                "sha256": material["sha256"],
                "root_sha256": link_manifest["root_sha256"],
                "shard_count": len(shards),
                "occurrence_count": universe["occurrence_count"],
                "canonical_url_count": len(intents),
            }
        )
        for url, projection in sorted(intents.items()):
            source_entries.setdefault(url, []).append(
                {
                    "source": "link-intent",
                    "path": relative,
                    "projection": projection,
                }
            )

    anchors = _publication_anchor_occurrences(publication_root, materials)
    for anchor in anchors:
        source_entries.setdefault(str(anchor["url"]), []).append(
            {
                "source": "rendered-anchor",
                "path": anchor["path"],
                "ordinal": anchor["ordinal"],
                "href": anchor["href"],
            }
        )
    protected, journey_sha256 = _publication_protected_actions(publication_root, materials)
    protected_not_in_candidate = sorted(set(protected).difference(source_entries))
    if protected_not_in_candidate:
        raise RuntimeError(
            "protected journey names URLs absent from rendered anchors and link intents: "
            + ", ".join(protected_not_in_candidate)
        )

    risk_priority = {
        "official-record": 0,
        "official-resource": 1,
        "other": 2,
    }
    intents: dict[str, dict[str, str | None]] = {}
    for url, sources in sorted(source_entries.items()):
        link_projections = [
            source["projection"]
            for source in sources
            if source["source"] == "link-intent"
        ]
        assert all(isinstance(item, dict) for item in link_projections)
        has_protected_intent = any(
            item.get("risk") == "protected-rich-page" for item in link_projections
        )
        if has_protected_intent and url not in protected:
            raise RuntimeError(
                f"protected link intent is not explicitly covered by the genuine journey: {url}"
            )
        if url in protected:
            risk = "protected-rich-page"
            identity_expectation = protected[url]
            kind = next(
                (str(item.get("kind")) for item in link_projections if item.get("kind")),
                "rendered-anchor",
            )
        else:
            risks = [
                str(item.get("risk"))
                for item in link_projections
                if item.get("risk") in risk_priority
            ]
            risk = min(risks, key=lambda item: risk_priority[item]) if risks else "other"
            ordered_projections = sorted(
                link_projections,
                key=lambda item: canonical_json_bytes(item),
            )
            identity_expectation = next(
                (
                    str(item.get("identity_expectation"))
                    for item in ordered_projections
                    if item.get("identity_expectation")
                ),
                url,
            )
            kind = next(
                (str(item.get("kind")) for item in ordered_projections if item.get("kind")),
                "rendered-anchor",
            )
        identity = {
            "canonical_url": url,
            "risk": risk,
            "sources": sorted(sources, key=canonical_json_bytes),
        }
        intents[url] = {
            "url": url,
            "kind": kind,
            "risk": risk,
            "identity_expectation": identity_expectation,
            "intent_sha256": sha256_bytes(canonical_json_bytes(identity)),
        }

    anchor_root = sha256_bytes(canonical_json_bytes(anchors))
    closure_rows = [intents[url] for url in sorted(intents)]
    coverage = {
        "publication_manifest": {
            "path": PUBLICATION_MANIFEST_NAME,
            "sha256": sha256_bytes((publication_root / PUBLICATION_MANIFEST_NAME).read_bytes()),
            "tree_sha256": manifest.get("tree_sha256"),
            "file_count": manifest.get("file_count"),
        },
        "intent_manifests": intent_manifests,
        "rendered_external_anchors": {
            "html_file_count": len(
                [path for path in materials if path.casefold().endswith(".html")]
            ),
            "occurrence_count": len(anchors),
            "canonical_url_count": len({anchor["url"] for anchor in anchors}),
            "root_sha256": anchor_root,
        },
        "protected_journey": {
            "path": "journeys.json",
            "sha256": journey_sha256,
            "canonical_url_count": len(protected),
        },
        "canonical_url_count": len(intents),
        "closure_root_sha256": sha256_bytes(canonical_json_bytes(closure_rows)),
    }
    return {
        "coverage": coverage,
        "intents": intents,
        "manifest_shard_count": shard_count,
        "selected_shards": [
            {"manifest_path": item["path"], "bucket": shard["bucket"]}
            for item in intent_manifests
            for shard in load_intent_universe(publication_root / str(item["path"]))["shards"]
        ],
    }


def due_shards(manifest: dict, observed_at: datetime, count: int) -> list[dict]:
    shards = sorted(manifest["shards"], key=lambda item: item["bucket"])
    if not shards:
        return []
    start = (observed_at.date().toordinal() * count) % len(shards)
    return [shards[(start + offset) % len(shards)] for offset in range(min(count, len(shards)))]


def candidate_root_for_manifest(manifest_path: Path) -> Path:
    """Return the candidate root for data/link-validation/manifest.json."""

    expected = ("data", "link-validation", "manifest.json")
    if tuple(manifest_path.parts[-3:]) != expected:
        raise RuntimeError(
            "link-intent manifest must be rooted at data/link-validation/manifest.json"
        )
    return manifest_path.parents[2]


def risk_class(row: dict) -> str:
    parts = urlsplit(str(row.get("url", "")))
    host = parts.netloc.casefold().split(":", 1)[0]
    # Only the explicitly declared rich-page examples are delegated to the
    # genuine-browser channel. Every other canonical link—including the full
    # population of official record pages—is still observed by the exhaustive
    # hash-sharded bulk channel.
    if host.endswith("historicengland.org.uk") and row.get("basis") == (
        "genuine-browser-receipt"
    ):
        return "protected-rich-page"
    if row.get("kind") == "record-primary":
        return "official-record"
    if row.get("kind") == "resource":
        return "official-resource"
    return "other"


def validated_protected_response_rules(policy: dict) -> list[dict]:
    """Return narrowly scoped protected-origin exceptions or fail closed."""

    rules = policy.get("accepted_protected_responses")
    if not isinstance(rules, list) or len(rules) != 1:
        raise RuntimeError(
            "link-observation policy must declare exactly one accepted protected response"
        )
    validated: list[dict] = []
    identities: set[tuple[str, tuple[str, ...], int, str]] = set()
    required_keys = {"host", "risks", "http_status", "validation_basis"}
    for index, rule in enumerate(rules):
        if not isinstance(rule, dict) or set(rule) != required_keys:
            raise RuntimeError(
                f"accepted protected-response rule {index} has an invalid shape"
            )
        host = rule.get("host")
        risks = rule.get("risks")
        status = rule.get("http_status")
        basis = rule.get("validation_basis")
        if (
            not isinstance(host, str)
            or not host
            or host != host.casefold()
            or urlsplit(f"https://{host}").hostname != host
            or ":" in host
            or "*" in host
        ):
            raise RuntimeError(
                f"accepted protected-response rule {index} has an invalid exact host"
            )
        if (
            not isinstance(risks, list)
            or not risks
            or any(not isinstance(risk, str) or risk not in KNOWN_RISKS for risk in risks)
            or len(set(risks)) != len(risks)
            or risks != sorted(risks)
        ):
            raise RuntimeError(
                f"accepted protected-response rule {index} has invalid risks"
            )
        if (
            host != PROTECTED_RESPONSE_HOST
            or risks != PROTECTED_RESPONSE_RISKS
        ):
            raise RuntimeError(
                "accepted protected response must be scoped exactly to "
                "historicengland.org.uk official record/resource risks"
            )
        if (
            isinstance(status, bool)
            or not isinstance(status, int)
            or status != PROTECTED_RESPONSE_STATUS
        ):
            raise RuntimeError(
                f"accepted protected-response rule {index} must name HTTP 403"
            )
        if (
            not isinstance(basis, str)
            or not basis
            or basis != basis.strip()
            or any(character not in "abcdefghijklmnopqrstuvwxyz0123456789-" for character in basis)
        ):
            raise RuntimeError(
                f"accepted protected-response rule {index} has an invalid validation_basis"
            )
        if basis != PROTECTED_RESPONSE_VALIDATION_BASIS:
            raise RuntimeError(
                "accepted protected response has an unrecognized validation_basis"
            )
        identity = (host, tuple(risks), status, basis)
        if identity in identities:
            raise RuntimeError("accepted protected-response rules contain a duplicate")
        identities.add(identity)
        validated.append(rule)
    return validated


def matching_protected_response_rule(
    policy: dict,
    *,
    url: str,
    risk: str,
    http_status: object,
    validated_rules: list[dict] | None = None,
) -> dict | None:
    """Match an observation only against an exact policy host/risk/status tuple."""

    try:
        host = urlsplit(url).hostname
    except ValueError:
        return None
    if host is None or isinstance(http_status, bool) or not isinstance(http_status, int):
        return None
    matches = [
        rule
        for rule in (
            validated_rules
            if validated_rules is not None
            else validated_protected_response_rules(policy)
        )
        if rule["host"] == host.casefold()
        and risk in rule["risks"]
        and rule["http_status"] == http_status
    ]
    if len(matches) > 1:
        raise RuntimeError("protected-origin response matches more than one policy rule")
    return matches[0] if matches else None


def apply_protected_response_policy(
    observation: dict[str, object],
    *,
    url: str,
    risk: str,
    policy: dict,
    validated_rules: list[dict] | None = None,
) -> dict[str, object]:
    """Classify only an exactly authorized HTTP error as protected-origin."""

    result = dict(observation)
    rule = matching_protected_response_rule(
        policy,
        url=url,
        risk=risk,
        http_status=result.get("http_status"),
        validated_rules=validated_rules,
    )
    if result.get("status") == "http-error" and rule is not None:
        result["status"] = "protected-origin"
        result["validation_basis"] = rule["validation_basis"]
    return result


def observation_passes(record: dict[str, object]) -> bool:
    return record.get("status") in {"reachable", "protected-origin"}


def observation_is_retryable(record: dict[str, object]) -> bool:
    """Return whether one bounded retry can distinguish a transient failure."""

    if record.get("status") == "network-error":
        return True
    status = record.get("http_status")
    return (
        record.get("status") == "http-error"
        and not isinstance(status, bool)
        and isinstance(status, int)
        and (status == 429 or 500 <= status <= 599)
    )


def observe_with_retries(
    url: str,
    *,
    risk: str,
    timeout: int,
    user_agent: str,
    maximum_attempts: int,
    policy: dict,
    validated_rules: list[dict],
) -> dict[str, object]:
    """Observe once, retry only transient failures, and expose the exact count."""

    if maximum_attempts not in {1, 2}:
        raise RuntimeError("link observation supports only one or two attempts")
    result: dict[str, object] = {}
    for attempt in range(1, maximum_attempts + 1):
        result = apply_protected_response_policy(
            observe(url, timeout=timeout, user_agent=user_agent),
            url=url,
            risk=risk,
            policy=policy,
            validated_rules=validated_rules,
        )
        result["attempt_count"] = attempt
        if observation_passes(result) or not observation_is_retryable(result):
            break
        if attempt < maximum_attempts:
            time.sleep(RETRY_BACKOFF_SECONDS)
    return result


def row_order_key(row: dict) -> str:
    """Mirror the occurrence ordering used by the deterministic corpus build."""

    return "|".join(
        str(row.get(key, "")).strip()
        for key in ("url", "kind", "route", "record_route")
    )


def identity_expectation(row: dict) -> str:
    return str(
        row.get("label")
        or row.get("title")
        or row.get("record_id")
        or row.get("record_route")
        or row.get("route")
        or row.get("url")
    ).strip()


def intent_projection(url: str, row: dict) -> dict[str, str | None]:
    """Project the selected occurrence into stable receipt identity fields."""

    risk = risk_class(row)
    identity = {
        "basis": str(row.get("basis", "")),
        "canonical_url": url,
        "kind": str(row.get("kind", "")),
        "record_route": str(row.get("record_route", "")),
        "risk": risk,
        "route": str(row.get("route", "")),
        "source_url": str(row.get("url", "")),
    }
    return {
        "url": url,
        "kind": row.get("kind"),
        "risk": risk,
        "identity_expectation": identity_expectation(row),
        "intent_sha256": hashlib.sha256(canonical_json_bytes(identity)).hexdigest(),
    }


def validated_manifest_shards(manifest: dict) -> list[dict]:
    """Validate the complete deterministic shard index, including its root."""

    if (
        manifest.get("schema") != EXPECTED_SCHEMA
        or manifest.get("algorithm") != EXPECTED_ALGORITHM
        or manifest.get("kind") != "link-intents"
        or manifest.get("observations_included") is not False
        or manifest.get("shard_key") != "canonical URL"
        or manifest.get("occurrence_order") != "URL, kind, route, record route"
    ):
        raise RuntimeError("link-intent manifest is not a stable observation-free v1 candidate")
    buckets = manifest.get("buckets")
    if buckets != 64:
        raise RuntimeError("link-intent v1 manifest must use exactly 64 buckets")
    shards = manifest.get("shards")
    if not isinstance(shards, list) or not shards:
        raise RuntimeError("link-intent manifest has no shards")
    expected_keys = {"bucket", "path", "items", "bytes", "sha256"}
    previous = ""
    seen: set[str] = set()
    item_count = 0
    for index, shard in enumerate(shards):
        if not isinstance(shard, dict) or set(shard) != expected_keys:
            raise RuntimeError(f"link-intent manifest shard {index} has an invalid shape")
        bucket = shard.get("bucket")
        if (
            not isinstance(bucket, str)
            or len(bucket) != 2
            or bucket != bucket.casefold()
            or any(character not in "0123456789abcdef" for character in bucket)
            or int(bucket, 16) >= buckets
            or bucket in seen
            or bucket <= previous
        ):
            raise RuntimeError(f"link-intent manifest shard {index} has an invalid bucket")
        if shard.get("path") != f"data/link-validation/shards/{bucket}.json.gz":
            raise RuntimeError(f"link-intent manifest shard {bucket} has an invalid path")
        for field in ("items", "bytes"):
            value = shard.get(field)
            if isinstance(value, bool) or not isinstance(value, int) or value < 1:
                raise RuntimeError(
                    f"link-intent manifest shard {bucket} has an invalid {field}"
                )
        digest = shard.get("sha256")
        if (
            not isinstance(digest, str)
            or len(digest) != 64
            or any(character not in "0123456789abcdef" for character in digest)
        ):
            raise RuntimeError(f"link-intent manifest shard {bucket} has an invalid digest")
        seen.add(bucket)
        previous = bucket
        item_count += shard["items"]
    if manifest.get("items") != item_count:
        raise RuntimeError("link-intent manifest item count differs from its shards")
    root_basis = [
        {"bucket": shard["bucket"], "sha256": shard["sha256"]}
        for shard in shards
    ]
    root_sha256 = hashlib.sha256(canonical_json_bytes(root_basis)).hexdigest()
    if manifest.get("root_sha256") != root_sha256:
        raise RuntimeError("link-intent manifest root digest differs from its shards")
    return shards


def load_intent_universe(
    manifest_path: Path,
    *,
    selected_buckets: set[str] | None = None,
) -> dict[str, object]:
    """Load an exact, duplicate-free URL universe from verified candidate shards."""

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise RuntimeError("link-intent manifest must be an object")
    shards = validated_manifest_shards(manifest)
    known_buckets = {shard["bucket"] for shard in shards}
    selected = known_buckets if selected_buckets is None else selected_buckets
    if not isinstance(selected, set) or not selected <= known_buckets:
        raise RuntimeError("selected link-intent buckets are not in the manifest")
    candidate_root = candidate_root_for_manifest(manifest_path)
    occurrences: dict[str, list[dict]] = {}
    occurrence_keys: set[str] = set()
    loaded_shards: list[dict] = []
    loaded_items = 0
    for shard in shards:
        if shard["bucket"] not in selected:
            continue
        rows = load_rows(candidate_root, shard)
        if len(rows) != shard["items"]:
            raise RuntimeError(
                f"link-intent shard item count differs from manifest: {shard['path']}"
            )
        if any(not isinstance(row, dict) for row in rows):
            raise RuntimeError(f"link-intent shard contains a non-object: {shard['path']}")
        if rows != sorted(rows, key=row_order_key):
            raise RuntimeError(f"link-intent shard occurrence order differs: {shard['path']}")
        for row in rows:
            source_url = row.get("url")
            if not isinstance(source_url, str) or not source_url.strip():
                raise RuntimeError(f"link-intent shard has no URL: {shard['path']}")
            if stable_bucket(source_url, buckets=manifest["buckets"]) != shard["bucket"]:
                raise RuntimeError(
                    f"link-intent occurrence is in the wrong bucket: {source_url}"
                )
            occurrence_key = row_order_key(row)
            if occurrence_key in occurrence_keys:
                raise RuntimeError(
                    f"link-intent occurrence is duplicated: {occurrence_key}"
                )
            occurrence_keys.add(occurrence_key)
            url = canonical_url(source_url)
            occurrences.setdefault(url, []).append(row)
        loaded_items += len(rows)
        loaded_shards.append(shard)
    if selected == known_buckets and loaded_items != manifest["items"]:
        raise RuntimeError("loaded link-intent item count differs from the manifest")

    intents: dict[str, dict[str, str | None]] = {}
    for url, rows in sorted(occurrences.items()):
        # Protected evidence wins when a canonical URL has both protected and
        # bulk occurrences. Within a risk tier, source occurrence order makes
        # the representative deterministic.
        row = min(
            rows,
            key=lambda item: (
                0 if risk_class(item) == "protected-rich-page" else 1,
                row_order_key(item),
            ),
        )
        projection = intent_projection(url, row)
        if not projection["identity_expectation"]:
            raise RuntimeError(f"link intent has no identity expectation: {url}")
        intents[url] = projection
    return {
        "manifest": manifest,
        "shards": loaded_shards,
        "occurrence_count": loaded_items,
        "intents": intents,
    }


def observe(url: str, *, timeout: int, user_agent: str) -> dict[str, object]:
    request = urllib.request.Request(url, headers={"User-Agent": user_agent}, method="HEAD")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return {
                "status": "reachable",
                "http_status": response.status,
                "final_url": response.geturl(),
                "etag": response.headers.get("ETag"),
                "last_modified": response.headers.get("Last-Modified"),
            }
    except urllib.error.HTTPError as error:
        if (
            error.code == NOT_MODIFIED_STATUS
            and canonical_url(error.geturl()) == canonical_url(url)
        ):
            return {
                "status": "reachable",
                "http_status": error.code,
                "final_url": error.geturl(),
                "etag": error.headers.get("ETag"),
                "last_modified": error.headers.get("Last-Modified"),
                "reachability_basis": NOT_MODIFIED_REACHABILITY_BASIS,
            }
        if error.code != 405:
            return {
                "status": "http-error",
                "http_status": error.code,
                "final_url": error.geturl(),
            }
    except (urllib.error.URLError, TimeoutError) as error:
        return {"status": "network-error", "error": str(error)}
    request = urllib.request.Request(
        url,
        headers={"User-Agent": user_agent, "Range": "bytes=0-2047"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return {
                "status": "reachable",
                "http_status": response.status,
                "final_url": response.geturl(),
                "etag": response.headers.get("ETag"),
                "last_modified": response.headers.get("Last-Modified"),
            }
    except urllib.error.HTTPError as error:
        if (
            error.code == NOT_MODIFIED_STATUS
            and canonical_url(error.geturl()) == canonical_url(url)
        ):
            return {
                "status": "reachable",
                "http_status": error.code,
                "final_url": error.geturl(),
                "etag": error.headers.get("ETag"),
                "last_modified": error.headers.get("Last-Modified"),
                "reachability_basis": NOT_MODIFIED_REACHABILITY_BASIS,
            }
        return {
            "status": "http-error",
            "http_status": error.code,
            "final_url": error.geturl(),
        }
    except (urllib.error.URLError, TimeoutError) as error:
        return {"status": "network-error", "error": str(error)}


def load_rows(root: Path, shard: dict) -> list[dict]:
    path = root / shard["path"]
    raw = path.read_bytes()
    if len(raw) != shard["bytes"] or hashlib.sha256(raw).hexdigest() != shard["sha256"]:
        raise RuntimeError(f"link-intent shard differs from manifest: {path}")
    rows = json.loads(gzip.decompress(raw))
    if not isinstance(rows, list):
        raise RuntimeError(f"link-intent shard is not an array: {path}")
    return rows


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--manifest", type=Path)
    source.add_argument(
        "--publication-root",
        type=Path,
        help=(
            "observe the exact union of every rendered external anchor and the "
            "faithful, tiny, and synthetic link-intent universes"
        ),
    )
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--policy", type=Path, default=POLICY)
    parser.add_argument("--observed-at")
    parser.add_argument(
        "--all-shards",
        action="store_true",
        help="observe the complete current manifest for initial/terminal promotion",
    )
    parser.add_argument(
        "--fail-on-error",
        action="store_true",
        help="return nonzero after writing the receipt when any bulk URL fails",
    )
    args = parser.parse_args(argv)
    manifest_path = (
        args.manifest
        if args.manifest is None or args.manifest.is_absolute()
        else ROOT / args.manifest
    )
    publication_root = (
        args.publication_root
        if args.publication_root is None or args.publication_root.is_absolute()
        else ROOT / args.publication_root
    )
    policy_path = args.policy if args.policy.is_absolute() else ROOT / args.policy
    policy = json.loads(policy_path.read_text(encoding="utf-8"))
    protected_response_rules = validated_protected_response_rules(policy)
    observed_at = (
        datetime.fromisoformat(args.observed_at.replace("Z", "+00:00"))
        if args.observed_at
        else datetime.now(timezone.utc)
    )
    if publication_root is not None:
        if not args.all_shards:
            raise RuntimeError(
                "publication closure observation requires --all-shards"
            )
        universe = load_publication_link_universe(publication_root)
        manifest_shard_count = int(universe["manifest_shard_count"])
        selected_shards = universe["selected_shards"]
        intents = universe["intents"]
        receipt_schema = "okf-publication-link-closure-receipt.v1"
    else:
        assert manifest_path is not None
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        shards = validated_manifest_shards(manifest)
        selected = (
            shards
            if args.all_shards
            else due_shards(manifest, observed_at, policy["shards_per_nightly_run"])
        )
        universe = load_intent_universe(
            manifest_path,
            selected_buckets={item["bucket"] for item in selected},
        )
        manifest_shard_count = len(manifest["shards"])
        selected_shards = [item["bucket"] for item in selected]
        intents = universe["intents"]
        receipt_schema = "okf-link-observation-receipt.v1"
    cycle_days = math.ceil(
        manifest_shard_count / policy["shards_per_nightly_run"]
    )
    if cycle_days > policy["maximum_bulk_cycle_days"]:
        raise RuntimeError(
            "link-observation shard rotation exceeds its declared freshness: "
            f"cycle={cycle_days} maximum={policy['maximum_bulk_cycle_days']}"
        )
    terminal_bounds = policy.get("terminal_bounds")
    if publication_root is not None:
        required_bounds = {
            "maximum_canonical_urls",
            "maximum_attempts_per_url",
            "bulk_step_timeout_minutes",
            "job_timeout_minutes",
            "reserved_non_bulk_minutes",
        }
        if not isinstance(terminal_bounds, dict) or set(terminal_bounds) != required_bounds:
            raise RuntimeError("link policy has no exact terminal observation bounds")
        if terminal_bounds["maximum_attempts_per_url"] != 2:
            raise RuntimeError("terminal link policy must bound observation to two attempts")
        if len(intents) > terminal_bounds["maximum_canonical_urls"]:
            raise RuntimeError(
                "publication link universe exceeds its reviewed terminal URL bound"
            )
        theoretical_seconds = (
            math.ceil(
                terminal_bounds["maximum_canonical_urls"]
                / policy["concurrent_requests"]
            )
            * (
                policy["request_timeout_seconds"]
                * terminal_bounds["maximum_attempts_per_url"]
                + RETRY_BACKOFF_SECONDS
                * (terminal_bounds["maximum_attempts_per_url"] - 1)
            )
        )
        if theoretical_seconds >= terminal_bounds["bulk_step_timeout_minutes"] * 60:
            raise RuntimeError("terminal link policy has no bounded bulk-observation margin")
        if (
            terminal_bounds["bulk_step_timeout_minutes"]
            + terminal_bounds["reserved_non_bulk_minutes"]
            > terminal_bounds["job_timeout_minutes"]
        ):
            raise RuntimeError("terminal link policy exceeds its workflow job timeout")
    bulk: list[tuple[str, dict, str]] = []
    delegated: list[dict[str, str]] = []
    for url, projection in sorted(intents.items()):
        risk = str(projection["risk"])
        if risk == "protected-rich-page":
            delegated.append(
                {
                    "url": url,
                    "risk": risk,
                    "channel": policy["protected_browser_channel"],
                    "identity_expectation": projection["identity_expectation"],
                    "intent_sha256": projection["intent_sha256"],
                    "expires_at": (
                        observed_at
                        + timedelta(days=policy["freshness_days"][risk])
                    ).isoformat().replace("+00:00", "Z"),
                }
            )
            continue
        bulk.append((url, projection, risk))

    maximum_attempts = (
        int(terminal_bounds["maximum_attempts_per_url"])
        if publication_root is not None
        else 1
    )

    def observe_one(item: tuple[str, dict, str]) -> dict[str, object]:
        url, projection, risk = item
        observation = observe_with_retries(
            url,
            risk=risk,
            timeout=policy["request_timeout_seconds"],
            user_agent=policy["user_agent"],
            maximum_attempts=maximum_attempts,
            policy=policy,
            validated_rules=protected_response_rules,
        )
        return {
            "url": url,
            "kind": projection["kind"],
            "risk": risk,
            "observed_at": observed_at.isoformat().replace("+00:00", "Z"),
            "expires_at": (
                observed_at + timedelta(days=policy["freshness_days"][risk])
            ).isoformat().replace("+00:00", "Z"),
            "identity_expectation": projection["identity_expectation"],
            "intent_sha256": projection["intent_sha256"],
            "engine": "python-urllib",
            **observation,
        }

    with concurrent.futures.ThreadPoolExecutor(
        max_workers=policy["concurrent_requests"]
    ) as executor:
        records = list(executor.map(observe_one, bulk))
    receipt = {
        "schema": receipt_schema,
        "policy_sha256": hashlib.sha256(policy_path.read_bytes()).hexdigest(),
        "observed_at": observed_at.isoformat().replace("+00:00", "Z"),
        "rotation_cycle_days": cycle_days,
        "complete_manifest_coverage": args.all_shards,
        "manifest_shard_count": manifest_shard_count,
        "delegated": delegated,
        "records": records,
    }
    if publication_root is not None:
        receipt["coverage"] = universe["coverage"]
        receipt["selected_shards"] = selected_shards
    else:
        assert manifest_path is not None
        receipt["candidate_manifest_sha256"] = hashlib.sha256(
            manifest_path.read_bytes()
        ).hexdigest()
        receipt["selected_buckets"] = selected_shards
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(receipt, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(
        f"observed {len(records)} canonical URLs across "
        f"{len(selected_shards)} due shards"
    )
    failures = [record for record in records if not observation_passes(record)]
    if args.fail_on_error and failures:
        print(f"{len(failures)} link observations failed", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
