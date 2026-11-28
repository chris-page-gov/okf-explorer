#!/usr/bin/env python3
"""Validate and render the dated public OKF walkthrough register."""

from __future__ import annotations

import argparse
import ast
from datetime import date, datetime
import hashlib
import html
import json
from pathlib import Path, PurePosixPath
import re
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("registry/walkthrough-register.source.json")
DENOMINATOR = Path("registry/walkthrough-register/public-root-denominator.json")
ACCESS_DIRECTORY = Path("registry/public-bundle-access.json")
RETAINED_ACCESS_DIRECTORY = Path(
    "registry/walkthrough-register/evidence/retained-receipts/public-bundle-access-2026-11-23.json")
OUTPUTS = (Path("registry/walkthrough-register.json"), Path("docs/walkthrough-register.md"))
PUBLIC_HOSTS = {"github.com", "raw.githubusercontent.com", "chris-page-gov.github.io", "api.github.com"}
SHA256 = re.compile(r"[0-9a-f]{64}")
LEGISLATION_WALKTHROUGH_IDS = {"legislation-equality-act-commencement", "legislation-whole-law-equality-duty"}
EXPECTED_REVIEW_WALKTHROUGH_IDS = {
    "ai-infrastructure-federated-rag", "ons-population-by-age", "ons-core-scope-freshness-conformance",
    "planning-design-code-policy-discovery",
    "capgov-site-archive", "capgov-send-action", "hansard-week-core", "hansard-week-full",
    "hansard-november-core", "hansard-november-full", "heritage-faithful", "heritage-tiny",
    "heritage-synthetic", "apis-core-guide-to-reader", "apis-metadata-guide-to-reader",
    "govuk-content-parental-leave", "xgov-core-notifications", "xgov-notify-components",
    "early-years-core", "early-years-domain", "early-years-control",
    "explorer-first-bundle-teaching", "explorer-profile-prov", "explorer-profile-vocabulary",
    "explorer-profile-missing-label", "explorer-profile-boundaries",
    "els-api-core03-complex-question",
    *LEGISLATION_WALKTHROUGH_IDS,
}
EXPECTED_GUIDE_SOURCE_CAPTURE_GAPS: set[str] = set()
ELS_WALKTHROUGH_ID = "els-api-core03-complex-question"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def validate_receipt_summary(proof: dict, root: Path) -> dict:
    if proof.get("id", "").startswith("public-bundle-access.json#"):
        raw = (root / RETAINED_ACCESS_DIRECTORY).read_bytes()
        repository = proof["id"].split("#", 1)[1]
        entry = next((row for row in json.loads(raw).get("bundles", [])
                      if row.get("repository", "").removeprefix("https://github.com/") == repository), None)
        if (entry is None or "passed" not in entry.get("verification", "").lower()
                or sha256(raw) != proof.get("sha256") or proof.get("status") != "passed"):
            raise ValueError("public access walkthrough proof is not bound to its declared passing entry")
        return entry
    summary_path = proof.get("receipt_summary_path", "")
    if (not safe_relative(summary_path)
            or not summary_path.startswith("registry/walkthrough-register/evidence/retained-receipts/")):
        raise ValueError("retained receipt needs a sanitised, hash-bound status summary")
    summary_bytes = (root / summary_path).read_bytes()
    if sha256(summary_bytes) != proof.get("receipt_summary_sha256"):
        raise ValueError("retained receipt summary digest mismatch")
    summary = json.loads(summary_bytes)
    if (summary.get("schema") != "okf-walkthrough-retained-receipt-summary.v1"
            or summary.get("source_receipt_id") != proof.get("id")
            or summary.get("source_receipt_sha256") != proof.get("sha256")
            or summary.get("status") != proof.get("status")):
        raise ValueError("retained receipt status or identity differs from its evidence summary")
    if proof.get("observed_at") != summary.get("date"):
        raise ValueError("retained receipt date differs from its evidence summary")
    if (summary.get("producer_product_version") is not None
            and proof.get("producer_product_version") != summary["producer_product_version"]):
        raise ValueError("retained receipt product version differs from its evidence summary")
    for field in ("scope", "source_commit", "pages_commit", "checksums_sha256", "walkthrough_id",
                  "expected_reader_commit",
                  "catalogue_files_verified", "served_files_verified", "all_local_bytes_verified",
                  "all_served_bytes_verified", "catalogue_unchanged_after_retrieval"):
        if field in proof and proof.get(field) != summary.get(field):
            raise ValueError(f"retained receipt {field} differs from its evidence summary")
    return summary


def validate_capture_file(root: Path, base: Path, asset: dict) -> bytes:
    relative = asset.get("capture_path", "")
    if not safe_relative(relative):
        raise ValueError("current public capture contains an unsafe asset path")
    path = root / base / relative
    if path.is_symlink() or not path.is_file():
        raise ValueError("current public capture asset must be a retained regular file")
    raw = path.read_bytes()
    if (asset.get("status") != 200 or asset.get("final_url") != asset.get("url")
            or str(asset.get("content_encoding", "identity")).lower() != "identity"
            or len(raw) != asset.get("bytes") or sha256(raw) != asset.get("sha256")):
        raise ValueError("current public capture bytes, status or identity encoding changed")
    return raw


def validate_expected_identity(observed: dict, descriptor: dict) -> None:
    aliases = [descriptor[key] for key in ("@id", "bundle_id", "id")
               if isinstance(descriptor.get(key), str) and descriptor[key]]
    if len(set(aliases)) > 1:
        raise ValueError("captured descriptor has conflicting identity aliases")
    actual = {
        "schema": descriptor.get("schema"),
        "id": aliases[0] if aliases else None,
        "version": descriptor.get("version"),
        "snapshot": descriptor.get("snapshot"),
    }
    if not isinstance(observed, dict) or any(observed.get(key) != value for key, value in actual.items()):
        raise ValueError("walkthrough expected identity differs from its exact descriptor fields")


def validate_page_capture(root: Path, row: dict, observation: dict, summary: dict) -> None:
    manifest_path = summary.get("capture_manifest_path", "")
    manifest_sha = summary.get("capture_manifest_sha256", "")
    if (not safe_relative(manifest_path)
            or not manifest_path.startswith("registry/walkthrough-register/evidence/current-captures/")
            or not SHA256.fullmatch(manifest_sha)):
        raise ValueError("current public HTTP observation needs a retained capture manifest")
    manifest_file = root / manifest_path
    if manifest_file.is_symlink() or not manifest_file.is_file():
        raise ValueError("current public HTTP capture manifest must be a regular file")
    manifest_bytes = manifest_file.read_bytes()
    if sha256(manifest_bytes) != manifest_sha:
        raise ValueError("current public HTTP capture manifest digest mismatch")
    manifest = json.loads(manifest_bytes)
    if (manifest.get("schema") != "okf-hansard-targeted-public-http-capture.v1"
            or manifest.get("receipt_id") != summary.get("source_receipt_id")
            or manifest.get("receipt_id") != observation.get("receipt_id")):
        raise ValueError("current public HTTP capture identity differs from its observation")
    if (observation.get("capture_manifest_path") != manifest_path
            or observation.get("capture_manifest_sha256") != manifest_sha):
        raise ValueError("current observation does not bind its exact HTTP capture manifest")
    base = PurePosixPath(manifest_path).parent
    assets = manifest.get("assets", [])
    guide = next((a for a in assets if a.get("walkthrough_id") == row["id"]
                  and a.get("url") == row["guide_url"] and a.get("path", "").endswith(".html")), None)
    if (guide is None or guide.get("status") != observation.get("http_status")
            or guide.get("sha256") != observation.get("response_sha256")):
        raise ValueError("current page observation differs from the exact captured guide response")
    guide_bytes = validate_capture_file(root, base, guide)
    if not question_matches_source(guide.get("path", ""), row.get("question", ""), guide_bytes):
        raise ValueError("current captured guide does not contain its recorded question")
    if row.get("descriptor_url") not in declared_bundle_urls(guide_bytes):
        raise ValueError("current captured guide does not link its exact bundle descriptor")

    case_path = observation.get("case_json_path", "")
    case_sha = observation.get("case_json_sha256", "")
    case_asset = next((a for a in assets if a.get("walkthrough_id") == row["id"]
                       and a.get("path", "").endswith("walkthrough.json")), None)
    if (case_asset is None or not safe_relative(case_path)
            or (base / case_asset.get("capture_path", "")) != PurePosixPath(case_path)
            or case_asset.get("sha256") != case_sha):
        raise ValueError("current walkthrough case JSON is not bound to its retained public capture")
    case_bytes = validate_capture_file(root, base, case_asset)
    case = json.loads(case_bytes)
    if (case.get("question") != row.get("question")
            or case.get("descriptor_sha256") != observation.get("descriptor_sha256")):
        raise ValueError("current case JSON question or descriptor digest differs from the register")

    descriptor_path = observation.get("descriptor_capture_path", "")
    descriptor_sha = observation.get("descriptor_sha256", "")
    descriptor_asset = next((a for a in assets if a.get("walkthrough_id") == row["id"]
                             and a.get("url") == row.get("descriptor_url")
                             and a.get("sha256") == descriptor_sha), None)
    if (descriptor_asset is None or not safe_relative(descriptor_path)
            or (base / descriptor_asset.get("capture_path", "")) != PurePosixPath(descriptor_path)):
        raise ValueError("current descriptor is not bound to its retained public capture")
    if descriptor_asset.get("url") != row.get("descriptor_url"):
        raise ValueError("current descriptor capture does not match the declared public URL")
    descriptor_bytes = validate_capture_file(root, base, descriptor_asset)
    if sha256(descriptor_bytes) != row.get("version_evidence_sha256"):
        raise ValueError("current descriptor capture differs from its version evidence")
    descriptor = json.loads(descriptor_bytes)
    validate_expected_identity(case.get("expected_identity"), descriptor)

    edition = guide.get("edition")
    catalogue = manifest.get("catalogues", {}).get(edition, {})
    catalogue_path = catalogue.get("path", "")
    if not safe_relative(catalogue_path):
        raise ValueError("current public capture has no safe served checksum catalogue")
    catalogue_file = root / base / catalogue_path
    if catalogue_file.is_symlink() or not catalogue_file.is_file():
        raise ValueError("current public checksum catalogue must be a retained regular file")
    catalogue_bytes = catalogue_file.read_bytes()
    if sha256(catalogue_bytes) != catalogue.get("sha256"):
        raise ValueError("current public checksum catalogue digest mismatch")
    expected = json.loads(catalogue_bytes)
    for asset in (guide, case_asset, descriptor_asset):
        bound = expected.get(asset.get("path"), {})
        if (bound.get("sha256") != asset.get("sha256") or bound.get("bytes") != asset.get("bytes")
                or asset.get("served_checksum_match") is not True):
            raise ValueError("current public capture differs from the served checksum catalogue")
    if observation.get("checksum_catalogue_sha256") != catalogue.get("sha256"):
        raise ValueError("current observation does not bind its served checksum catalogue")
    summary_case = next((item for item in summary.get("cases", [])
                         if item.get("id") == row.get("id")), None)
    if (summary_case is None
            or summary_case.get("case_json_path") != observation.get("case_json_path")
            or summary_case.get("case_json_sha256") != observation.get("case_json_sha256")
            or summary_case.get("descriptor_url") != row.get("descriptor_url")
            or summary_case.get("descriptor_path") != observation.get("descriptor_capture_path")
            or summary_case.get("descriptor_sha256") != observation.get("descriptor_sha256")
            or summary_case.get("served_checksum_catalogue_sha256") != catalogue.get("sha256")):
        raise ValueError("current page summary differs from its captured case, descriptor or checksum catalogue")


def validate_page_observation(root: Path, row: dict, observation: dict, *, historical: bool = False) -> None:
    if (observation.get("http_status") not in {200, 404}
            or not SHA256.fullmatch(observation.get("receipt_sha256", ""))
            or not SHA256.fullmatch(observation.get("response_sha256", ""))):
        raise ValueError("current or historical page observation is incomplete or unsupported")
    try:
        datetime.fromisoformat(observation.get("observed_at", "").replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        raise ValueError("invalid page observation date") from None
    evidence_path = observation.get("evidence_path", "")
    if (not safe_relative(evidence_path)
            or not evidence_path.startswith("registry/walkthrough-register/evidence/current-observations/")):
        raise ValueError("page observation needs a retained evidence summary")
    evidence_file = root / evidence_path
    if evidence_file.is_symlink() or not evidence_file.is_file():
        raise ValueError("page observation summary must be a retained regular file")
    evidence_bytes = evidence_file.read_bytes()
    if sha256(evidence_bytes) != observation.get("evidence_sha256"):
        raise ValueError("page observation evidence digest mismatch")
    evidence = json.loads(evidence_bytes)
    receipt_id = str(evidence.get("source_receipt_id", "")).split("/", 1)[0]
    if (evidence.get("schema") != "okf-walkthrough-current-observation-summary.v1"
            or evidence.get("observed_at") != observation.get("observed_at")
            or evidence.get("source_receipt_sha256") != observation.get("receipt_sha256")
            or receipt_id != observation.get("receipt_id")):
        raise ValueError("page observation receipt identity or date mismatch")
    case = next((item for item in evidence.get("cases", [])
                 if item.get("id") == observation.get("case_id")), None)
    if (case is None or case.get("http_status") != observation.get("http_status")
            or case.get("response_sha256") != observation.get("response_sha256")
            or observation.get("case_id") != row.get("id")):
        raise ValueError("page status or response digest differs from its retained observation")
    if not historical:
        validate_page_capture(root, row, observation, evidence)


def safe_relative(value: str) -> bool:
    if not isinstance(value, str) or not value or "\\" in value:
        return False
    path = PurePosixPath(value)
    return not path.is_absolute() and all(part not in {"", ".", ".."} for part in path.parts)


def safe_public_url(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        return (parsed.scheme == "https" and parsed.hostname in PUBLIC_HOSTS
                and not parsed.username and not parsed.password and not parsed.query and not parsed.fragment)
    except (TypeError, ValueError):
        return False


def _constant_strings(node: ast.AST) -> list[str]:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return [node.value]
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left, right = _constant_strings(node.left), _constant_strings(node.right)
        return [a + b for a in left for b in right]
    if isinstance(node, ast.JoinedStr):
        parts: list[str] = []
        for item in node.values:
            if not isinstance(item, ast.Constant) or not isinstance(item.value, str):
                return []
            parts.append(item.value)
        return ["".join(parts)]
    return []


def question_matches_source(path: str, question: str, raw: bytes) -> bool:
    expected = " ".join(question.split())
    text = raw.decode("utf-8")
    candidates: list[str] = []
    if path.endswith(".json"):
        def collect(value: object) -> None:
            if isinstance(value, str):
                candidates.append(value)
            elif isinstance(value, dict):
                for child in value.values():
                    collect(child)
            elif isinstance(value, list):
                for child in value:
                    collect(child)
        collect(json.loads(text))
    elif path.endswith(".md"):
        candidates = [re.sub(r"^\s*>\s?", "", text, flags=re.MULTILINE)]
    elif path.endswith(".html"):
        candidates = [html.unescape(re.sub(r"<[^>]+>", " ", text))]
    elif path.endswith(".py"):
        tree = ast.parse(text)
        for node in ast.walk(tree):
            candidates.extend(_constant_strings(node))
    else:
        candidates = [text]
    return any(expected in " ".join(candidate.split()) for candidate in candidates)


def declared_bundle_urls(raw: bytes) -> set[str]:
    text = html.unescape(raw.decode("utf-8"))
    values: set[str] = set()
    for candidate in re.findall(r"https?://[^\s\"'<>]+", text):
        query = parse_qs(urlsplit(candidate).query)
        values.update(query.get("bundle", []))
    return values


def retain_els_evidence(root: Path, path: str, family: str, digest: str) -> bytes:
    prefix = f"registry/walkthrough-register/evidence/{family}/"
    if not safe_relative(path) or not path.startswith(prefix):
        raise ValueError("unsafe ELS evidence path")
    target = root / path
    if target.is_symlink() or not target.is_file():
        raise ValueError("ELS evidence must be a retained regular file")
    raw = target.read_bytes()
    if sha256(raw) != digest:
        raise ValueError("ELS retained evidence digest differs")
    return raw


def validate_els_public_browser_binding(row: dict, root: Path, source: dict) -> dict | None:
    if row.get("id") != ELS_WALKTHROUGH_ID:
        if row.get("public_browser_binding") is not None:
            raise ValueError("unexpected ELS public browser binding")
        return None

    binding = row["public_browser_binding"]
    proof = row["retained_proof"]
    manifest_sha = binding["checksum_manifest_sha256"]
    manifest = json.loads(retain_els_evidence(
        root, binding["checksum_manifest_path"], "public-manifests", manifest_sha))
    assets = json.loads(retain_els_evidence(
        root, binding["assets_summary_path"], "retained-receipts", binding["assets_summary_sha256"]))
    summary = json.loads(retain_els_evidence(
        root, proof["receipt_summary_path"], "retained-receipts", proof["receipt_summary_sha256"]))
    descriptor_raw = retain_els_evidence(
        root, row["version_evidence_path"], "bundle-descriptors", row["version_evidence_sha256"])
    descriptor = json.loads(descriptor_raw)
    if (row.get("descriptor_binding") != "els-public-asset-manifest"
            or row["descriptor_url"] != row["bundle_identity"]
            or row.get("descriptor_http_status") is not None
            or row["descriptor_observed_at"] != proof["observed_at"]
            or row["reader_version"] != source["shared_reader_release"]["version"]
            or binding["source_receipt_sha256"] != proof["sha256"]
            or binding["summary_path"] != proof["receipt_summary_path"]
            or binding["summary_sha256"] != proof["receipt_summary_sha256"]):
        raise ValueError("ELS register does not bind its public observations to the exact receipt")

    expected = {
        "status": "passed",
        "question": row["question"],
        "walkthrough_id": row["id"],
        "source_commit": row["current_source_commit"],
        "okf_core_version": row["okf_core_version"],
        "producer_product_version": row["producer_product_version"],
        "bundle_identity": row["bundle_identity"],
        "snapshot": descriptor["snapshot"],
        "record_count": descriptor["counts"]["records"],
        "descriptor_sha256": row["version_evidence_sha256"],
        "checksums_sha256": manifest_sha,
        "reader_version": row["reader_version"],
        "reader_application_tree": "ab0c8afb2823c7945ceae0b977bd648cc17c89bdaf4174086aa1c2306399a388",
        "public_assets_receipt_sha256": binding["assets_source_receipt_sha256"],
        "automated_accessibility_results": "not-recorded-in-receipt",
    }
    if any(summary.get(field) != value for field, value in expected.items()):
        raise ValueError("ELS browser receipt differs from the registered question, bundle or Reader")
    journeys = summary["journeys"]
    if (sorted(item["width"] for item in journeys) != [390, 1440]
            or any(item.get("guide_diagram_and_prompt") is not True
                   or item.get("reader_record") != "operation/data"
                   or item.get("reload") is not True
                   or item.get("page_errors") != [] for item in journeys)):
        raise ValueError("ELS browser receipt lacks a passing desktop or mobile journey")

    checksums = {item["path"]: item for item in manifest["files"]}
    if (manifest["algorithm"] != "sha256"
            or len(checksums) != len(manifest["files"]) or len(checksums) != manifest["fileCount"]
            or assets["status"] != "assets-passed"
            or assets["commit"] != row["current_source_commit"]
            or assets["manifest_sha256"] != manifest_sha
            or assets["source_receipt_sha256"] != summary["public_assets_receipt_sha256"]
            or sorted(assets["assets"]) != sorted(checksums.keys() - {".nojekyll"})
            or assets["asset_count"] != len(assets["assets"])):
        raise ValueError("ELS public asset coverage differs from the checksum manifest")

    guides = {}
    for prefix in ("guide", "guide_markdown"):
        raw = retain_els_evidence(
            root, row[f"{prefix}_evidence_path"], "walkthrough-guides", row[f"{prefix}_sha256"])
        path = row[f"{prefix}_source_path"]
        if (not path.startswith("bundle/") or git_blob_sha1(raw) != row[f"{prefix}_git_blob_sha1"]
                or not question_matches_source(path, row["question"], raw)):
            raise ValueError("ELS guide differs from its registered Git blob or question")
        guides[path.removeprefix("bundle/")] = raw
    if f'snapshot <code>{descriptor["snapshot"]}</code>' not in html.unescape(
            guides["complex-question.html"].decode("utf-8")):
        raise ValueError("ELS guide does not print the registered snapshot")
    asset_path = PurePosixPath(urlsplit(row["descriptor_url"]).path).name
    for path, raw in (guides | {asset_path: descriptor_raw}).items():
        if checksums.get(path) != {"path": path, "sha256": sha256(raw), "bytes": len(raw)}:
            raise ValueError("ELS guide or descriptor differs from the public checksum manifest")

    return {
        "id": "els-api-core03-public-assets-20261125",
        "captured_at": row["descriptor_observed_at"],
        "descriptor_url": row["descriptor_url"],
        "descriptor_evidence_path": row["version_evidence_path"],
        "descriptor_sha256": row["version_evidence_sha256"],
        "descriptor_bytes": len(descriptor_raw),
        "identity_field": row["descriptor_identity_field"],
        "descriptor_identity": row["bundle_identity"],
        "schema": descriptor["schema"],
        "okf_version": descriptor["okf_version"],
        "producer_product_version": descriptor["version"],
        "snapshot": descriptor["snapshot"],
        "record_count": descriptor["counts"]["records"],
        "public_asset_path": asset_path,
        "public_asset_verification": "passed-in-browser-receipt-and-checksum-manifest",
        "manifest_sha256": manifest_sha,
        "source_commit": assets["commit"],
        "source_tree": assets["tree"],
        "receipt_sha256": proof["sha256"],
        "receipt_summary_sha256": proof["receipt_summary_sha256"],
        "repository": f'https://github.com/{row["repository"]}',
    }


def load(root: Path = ROOT) -> dict:
    source = json.loads((root / SOURCE).read_text(encoding="utf-8"))
    denominator = json.loads((root / DENOMINATOR).read_text(encoding="utf-8"))
    if source.get("schema") != "okf-public-walkthrough-register-source.v1":
        raise ValueError("unsupported walkthrough register source schema")
    if denominator.get("schema") != "okf-public-root-denominator.v1":
        raise ValueError("unsupported public root denominator schema")
    roots = source.get("roots")
    keys = [(r.get("repository"), r.get("root_path")) for r in roots or []]
    denominator_keys = sorted((r.get("repository"), r.get("root_path")) for r in denominator.get("roots", []))
    if len(keys) != len(set(keys)) or len(denominator_keys) != len(set(denominator_keys)):
        raise ValueError("duplicate public root or alias entry")
    if len([r.get("root_id") for r in roots]) != len(set(r.get("root_id") for r in roots)):
        raise ValueError("duplicate public root identity")
    if set(keys) != set(denominator_keys):
        raise ValueError("register roots differ from independent public denominator")
    if (len(keys) != denominator.get("public_root_count")
            or len(keys) != source.get("scope", {}).get("public_root_count")):
        raise ValueError("public root count does not match denominator")
    observation_count = sum(len(r["observations"]) for r in roots)
    if (observation_count != source.get("scope", {}).get("public_revision_observation_count")
            or observation_count != denominator.get("public_revision_observation_count")):
        raise ValueError("public revision observation count does not match the recorded denominator")
    observation_ids = [o.get("observation_sha256") for r in roots for o in r["observations"]]
    if len(observation_ids) != len(set(observation_ids)):
        raise ValueError("duplicate public revision observation")
    canonical_keys = json.dumps(denominator_keys, ensure_ascii=False, separators=(",", ":")).encode()
    if sha256(canonical_keys) != denominator.get("root_keys_sha256"):
        raise ValueError("public root denominator digest mismatch")
    if source.get("scope", {}).get("root_keys_sha256") != denominator.get("root_keys_sha256"):
        raise ValueError("source scope is not bound to the public root denominator")
    aliases = sorted(
        [{"from": {"repository": r["repository"], "root_path": r["root_path"]},
          "targets": sorted(r.get("alias_targets", []), key=lambda x: (x["repository"], x["root_path"])),
          "kind": next((o["classification"] for o in r["observations"]
                        if o["classification"] in {"repository-alias", "generated-projection-alias",
                                                    "repository-contract-umbrella"}), "")}
         for r in roots if r.get("alias_targets")],
        key=lambda x: (x["from"]["repository"], str(x["from"]["root_path"])),
    )
    expected_aliases = denominator.get("alias_relationships", [])
    expected_aliases = sorted(expected_aliases, key=lambda x: (x["from"]["repository"], str(x["from"]["root_path"])))
    if aliases != expected_aliases or len(aliases) != denominator.get("alias_relationship_count"):
        raise ValueError("public root aliases differ from the independent relationship denominator")
    if len(aliases) != source.get("scope", {}).get("alias_relationship_count"):
        raise ValueError("public alias relationship count does not match scope")
    access = json.loads((root / ACCESS_DIRECTORY).read_text(encoding="utf-8"))
    access_rows = {b["repository"].removeprefix("https://github.com/"): b for b in access.get("bundles", [])
                   if b.get("visibility") == "public"}
    descriptors = source.get("public_bundle_descriptor_observations", [])
    descriptor_repos = [d.get("repository", "").removeprefix("https://github.com/") for d in descriptors]
    if (len(descriptor_repos) != len(set(descriptor_repos)) or set(descriptor_repos) != set(access_rows)
            or len(descriptor_repos) != 13):
        raise ValueError("public descriptor observations differ from the curated 13-entry access scope")
    source_serialised = json.dumps(source, ensure_ascii=False)
    if any(token in source_serialised for token in ("/Users/", "/Volumes/", "phase2_matrix_path", "local_private_path")):
        raise ValueError("private local inventory paths cannot enter the public register")
    for row in roots:
        repo, root_path = row.get("repository"), row.get("root_path")
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", str(repo)):
            raise ValueError("invalid public repository key")
        if (root_path is None and "consumer-without-OKF-root" not in row.get("dispositions", [])):
            raise ValueError("a null public root needs an explicit no-root disposition")
        if root_path not in {None, "."} and not safe_relative(root_path):
            raise ValueError("unsafe public root path")
        if not row.get("observations") or not row.get("walkthrough_status"):
            raise ValueError("public root must retain observations and walkthrough status")
        classifications = {o.get("classification") for o in row["observations"]}
        if classifications.intersection({"repository-alias", "generated-projection-alias"}) and not row.get("alias_targets"):
            raise ValueError("public alias entry needs an explicit target")
        target_keys = [(t.get("repository"), t.get("root_path")) for t in row.get("alias_targets", [])]
        if len(target_keys) != len(set(target_keys)):
            raise ValueError("duplicate public alias target")
        for observation in row["observations"]:
            if not SHA256.fullmatch(observation.get("observation_sha256", "")):
                raise ValueError("invalid recorded observation digest")
            if not re.fullmatch(r"[0-9a-f]{40}", observation.get("source_commit") or ""):
                raise ValueError("invalid observed source commit")
            if not observation.get("observed_at"):
                raise ValueError("public root revision needs an observation date")
            for observed_at in observation["observed_at"]:
                try:
                    datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    raise ValueError("invalid public revision observation timestamp") from None
            for evidence in observation.get("core_version_evidence", []):
                if evidence.get("field") != "okf_version" or evidence.get("value") not in {"0.1", "0.2", "0.3"}:
                    raise ValueError("invalid recorded core-version field")
                if not safe_relative(evidence.get("path", "")):
                    raise ValueError("unsafe recorded evidence path")
                if not SHA256.fullmatch(evidence.get("evidence_sha256", "")) or not re.fullmatch(
                        r"[0-9a-f]{40}", evidence.get("git_blob_sha1", "")):
                    raise ValueError("invalid historical core-version evidence digest")
        for target in row.get("alias_targets", []):
            target_key = (target.get("repository"), target.get("root_path"))
            if target_key not in set(keys):
                raise ValueError("alias points outside the public denominator")
            if target_key == (repo, root_path):
                raise ValueError("a public root cannot be an alias of itself")

    visibility = source.get("repository_visibility_observations", [])
    expected_repositories = {repo for repo, _ in keys}
    visibility_repositories = [row.get("repository") for row in visibility]
    if (len(visibility_repositories) != len(set(visibility_repositories))
            or set(visibility_repositories) != expected_repositories
            or len(visibility) != source.get("scope", {}).get("current_public_repository_count")):
        raise ValueError("current repository visibility does not cover the public-root repository set")
    for row in visibility:
        if (row.get("status") != "public" or row.get("http_status") != 200
                or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", str(row.get("repository")))):
            raise ValueError("current public visibility observation is invalid")
        for key in ("api_url", "html_url"):
            if not safe_public_url(row.get(key, "")):
                raise ValueError("unsafe current repository visibility URL")
        if (not SHA256.fullmatch(row.get("response_sha256", ""))
                or not isinstance(row.get("response_bytes"), int) or row["response_bytes"] <= 0):
            raise ValueError("repository visibility response is not hash-bound")
        try:
            datetime.fromisoformat(row.get("observed_at", "").replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            raise ValueError("invalid repository visibility observation date") from None

    review_walkthroughs = source.get("review_walkthroughs", [])
    review_ids = [row.get("id") for row in review_walkthroughs]
    if (len(review_ids) != len(set(review_ids)) or set(review_ids) != EXPECTED_REVIEW_WALKTHROUGH_IDS
            or len(review_ids) != source.get("scope", {}).get("review_walkthrough_count")):
        raise ValueError("review walkthrough coverage has duplicate, missing or surplus entries")
    references = source.get("walkthroughs", [])
    if (len(references) != 1
            or len(references) != source.get("scope", {}).get("reference_walkthrough_count")
            or len(review_ids) + len(references) != source.get("scope", {}).get("public_walkthrough_count")):
        raise ValueError("public walkthrough total must include the source-bound Explorer reference")
    root_index = {(row["repository"], row["root_path"]): row for row in roots}
    post_capture = []
    for row in review_walkthroughs:
        walkthrough_guide_bytes = None
        root_key = (row.get("repository"), row.get("root_path"))
        if root_key not in root_index or row.get("root_id") != root_index[root_key]["root_id"]:
            raise ValueError("review walkthrough is not bound to an exact public root")
        if row.get("repository") not in set(visibility_repositories):
            raise ValueError("walkthrough repository has no current public visibility observation")
        for key in ("guide_url", "source_url"):
            if not safe_public_url(row.get(key, "")):
                raise ValueError("unsafe walkthrough review URL")
        owner, project = row["repository"].split("/", 1)
        guide_url = urlsplit(row["guide_url"])
        if (guide_url.hostname != f"{owner}.github.io"
                or not guide_url.path.startswith(f"/{project}/")):
            raise ValueError("walkthrough guide URL is outside its producer's Pages site")
        if (not safe_relative(row.get("source_path", ""))
                or not SHA256.fullmatch(row.get("source_sha256", ""))
                or not re.fullmatch(r"[0-9a-f]{40}", row.get("current_source_commit", ""))):
            raise ValueError("walkthrough source observation is incomplete")
        if row.get("source_url") != (
                f"https://github.com/{row['repository']}/blob/{row['current_source_commit']}/{row['source_path']}"):
            raise ValueError("walkthrough source URL is not pinned to its observed source commit")
        try:
            observed_on = date.fromisoformat(row.get("source_observed_on", ""))
            modified_on = date.fromisoformat(source["modified"])
        except (TypeError, ValueError):
            raise ValueError("walkthrough source checkout observation date is invalid") from None
        if observed_on.isoformat() != row["source_observed_on"] or observed_on > modified_on:
            raise ValueError("walkthrough source observation must be dated on or before the register update")
        evidence_path = row.get("source_evidence_path", "")
        if (not safe_relative(evidence_path)
                or not evidence_path.startswith("registry/walkthrough-register/evidence/walkthrough-source/")):
            raise ValueError("unsafe captured walkthrough source path")
        captured_path = root / evidence_path
        if captured_path.is_symlink() or not captured_path.is_file():
            raise ValueError("captured walkthrough source must be a regular local file")
        captured_bytes = captured_path.read_bytes()
        source_blob_sha1 = git_blob_sha1(captured_bytes)
        if (sha256(captured_bytes) != row.get("source_sha256")
                or source_blob_sha1 != row.get("source_git_blob_sha1")):
            raise ValueError("captured walkthrough source bytes do not match their SHA-256 and Git blob identity")
        if not question_matches_source(row["source_path"], row["question"], captured_bytes):
            raise ValueError("walkthrough question is not present in its captured authored source")
        guide_evidence_path = row.get("guide_evidence_path")
        if row["id"] in EXPECTED_GUIDE_SOURCE_CAPTURE_GAPS:
            if any(row.get(key) is not None for key in ("guide_source_path", "guide_evidence_path", "guide_sha256", "guide_git_blob_sha1")):
                raise ValueError("Hansard guide source gap must remain explicit until exact HTML bytes are retained")
        else:
            if (not safe_relative(guide_evidence_path)
                    or not guide_evidence_path.startswith("registry/walkthrough-register/evidence/walkthrough-guides/")
                    or not safe_relative(row.get("guide_source_path", ""))):
                raise ValueError("walkthrough guide source bytes are not captured")
            guide_file = root / guide_evidence_path
            if guide_file.is_symlink() or not guide_file.is_file():
                raise ValueError("captured walkthrough guide must be a regular local file")
            guide_bytes = guide_file.read_bytes()
            walkthrough_guide_bytes = guide_bytes
            guide_git_blob = git_blob_sha1(guide_bytes)
            if (sha256(guide_bytes) != row.get("guide_sha256")
                    or guide_git_blob != row.get("guide_git_blob_sha1")):
                raise ValueError("captured walkthrough guide bytes do not match their SHA-256 and Git blob identity")
            if not question_matches_source(row["guide_source_path"], row["question"], guide_bytes):
                raise ValueError("walkthrough question does not match its captured guide HTML")
            if row.get("descriptor_url") and row["descriptor_url"] not in declared_bundle_urls(guide_bytes):
                if row.get("descriptor_binding") == "walkthrough-packet-descriptor-sha256":
                    pass
                elif (row.get("id") == ELS_WALKTHROUGH_ID
                      and row.get("descriptor_binding") == "els-public-asset-manifest"):
                    guide_text = html.unescape(guide_bytes.decode("utf-8"))
                    if (row["descriptor_url"] not in guide_text
                            or f'version <code>{row.get("producer_product_version")}</code>' not in guide_text
                            or f'OKF Core <code>{row.get("okf_core_version")}</code>' not in guide_text):
                        raise ValueError("ELS guide does not print the exact descriptor identity and edition")
                else:
                    raise ValueError("walkthrough descriptor URL differs from the guide's exact Reader bundle link")
        if (not isinstance(row.get("title"), str) or not row["title"].strip()
                or not isinstance(row.get("question"), str) or not row["question"].strip()):
            raise ValueError("walkthrough review entry needs its actual title and question")
        if row.get("source_url_checked") is not False:
            raise ValueError("source URL availability must not be claimed without a check")
        descriptor = next((d for d in descriptors
                           if d["repository"].removeprefix("https://github.com/") == row["repository"]), None)
        version_scope = row.get("version_scope", "bundle")
        if version_scope == "profile":
            evidence_path = row.get("version_evidence_path", "")
            if (row.get("okf_core_version") is not None or not row.get("bundle_identity")
                    or not safe_relative(evidence_path)
                    or not evidence_path.startswith("registry/walkthrough-register/evidence/profile-identities/")):
                raise ValueError("profile walkthrough must retain profile identity without claiming core version")
            evidence_bytes = (root / evidence_path).read_bytes()
            if sha256(evidence_bytes) != row.get("version_evidence_sha256"):
                raise ValueError("profile version evidence digest mismatch")
            profile_descriptor = json.loads(evidence_bytes)
            identity = profile_descriptor.get("@id") or profile_descriptor.get("id")
            if (identity != row["bundle_identity"] or row.get("profile_version") != "v1"
                    or re.search(r"(?:^|/)v1(?:/|$)", row.get("root_path", "")) is None):
                raise ValueError("profile version does not match its captured identity object")
        elif version_scope == "unresolved":
            if (row.get("okf_core_version") is not None or row.get("producer_product_version") is not None
                    or not row.get("version_observation_note")):
                raise ValueError("unresolved walkthrough version must remain explicitly unknown")
        elif (not row.get("version_evidence_path") and ((descriptor is None and row.get("okf_core_version") is not None)
                or (descriptor is not None and (descriptor["okf_version"] != row.get("okf_core_version")
                                                or descriptor["producer_product_version"] != row.get("producer_product_version"))))):
            raise ValueError("walkthrough core or producer version is missing or differs from the captured descriptor")
        if row.get("version_scope", "bundle") == "bundle" and row.get("version_evidence_path"):
            evidence_path = row["version_evidence_path"]
            if not safe_relative(evidence_path):
                raise ValueError("unsafe walkthrough bundle descriptor path")
            evidence_bytes = (root / evidence_path).read_bytes()
            if sha256(evidence_bytes) != row.get("version_evidence_sha256"):
                raise ValueError("walkthrough bundle descriptor digest mismatch")
            bundle_descriptor = json.loads(evidence_bytes)
            if (bundle_descriptor.get("okf_version") != row.get("okf_core_version")
                    or bundle_descriptor.get("version") != row.get("producer_product_version")):
                raise ValueError("walkthrough core version does not match its bundle descriptor")
            identities = {key: bundle_descriptor[key] for key in ("@id", "bundle_id", "id")
                          if isinstance(bundle_descriptor.get(key), str) and bundle_descriptor[key]}
            if len(set(identities.values())) > 1:
                raise ValueError("walkthrough descriptor has conflicting identity aliases")
            identity_field = row.get("descriptor_identity_field")
            if identity_field is not None and identity_field not in {"@id", "bundle_id", "id"}:
                raise ValueError("unsupported walkthrough descriptor identity field")
            if identities:
                if (identity_field not in identities
                        or identities[identity_field] != row.get("bundle_identity")
                        or row.get("descriptor_identity") != identities[identity_field]):
                    raise ValueError(f"walkthrough identity does not match its exact descriptor: {row['id']}")
            elif identity_field is not None or row.get("bundle_identity") is not None or row.get("descriptor_identity") is not None:
                raise ValueError(f"walkthrough identity does not match its exact descriptor: {row['id']}")
            if row.get("descriptor_binding") == "walkthrough-packet-descriptor-sha256":
                packet = json.loads(captured_bytes)
                packet_descriptor = packet.get("descriptor")
                if (not isinstance(packet_descriptor, str)
                        or PurePosixPath(urlsplit(row.get("descriptor_url", "")).path).name != packet_descriptor
                        or packet.get("descriptor_sha256") != sha256(evidence_bytes)
                        or packet.get("bundle_id") != row.get("bundle_identity")
                        or packet.get("okf_version") != row.get("okf_core_version")
                        or packet.get("version") != row.get("producer_product_version")):
                    raise ValueError("walkthrough packet does not bind its exact bundle descriptor bytes")
            if row.get("descriptor_url"):
                descriptor_status_valid = row.get("descriptor_http_status") == 200 or (
                    row.get("id") == ELS_WALKTHROUGH_ID
                    and row.get("descriptor_binding") == "els-public-asset-manifest"
                    and row.get("descriptor_http_status") is None
                )
                if (not safe_public_url(row["descriptor_url"])
                        or bundle_descriptor.get("schema") != row.get("descriptor_schema")
                        or not descriptor_status_valid
                        or row.get("descriptor_bytes") != len(evidence_bytes)):
                    raise ValueError("walkthrough descriptor observation is incomplete or unsafe")
                try:
                    datetime.fromisoformat(row.get("descriptor_observed_at", "").replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    raise ValueError("invalid walkthrough descriptor observation date") from None
            for supplemental in row.get("supplemental_descriptors", []):
                supplemental_path = supplemental.get("path", "")
                if (not safe_relative(supplemental_path)
                        or not supplemental_path.startswith("registry/walkthrough-register/evidence/bundle-descriptors/")
                        or not safe_public_url(supplemental.get("url", ""))
                        or supplemental.get("http_status") != 200):
                    raise ValueError("invalid supplemental walkthrough descriptor observation")
                supplemental_bytes = (root / supplemental_path).read_bytes()
                if (sha256(supplemental_bytes) != supplemental.get("sha256")
                        or len(supplemental_bytes) != supplemental.get("bytes")):
                    raise ValueError("supplemental walkthrough descriptor bytes or digest changed")
                supplemental_descriptor = json.loads(supplemental_bytes)
                if (supplemental_descriptor.get("okf_version") != supplemental.get("okf_version")
                        or supplemental_descriptor.get("version") != supplemental.get("producer_product_version")
                        or supplemental_descriptor.get("schema") != supplemental.get("schema")):
                    raise ValueError("supplemental walkthrough descriptor fields differ from the captured evidence")
                supplemental_identities = {key: supplemental_descriptor[key]
                                           for key in ("@id", "bundle_id", "id")
                                           if isinstance(supplemental_descriptor.get(key), str)
                                           and supplemental_descriptor[key]}
                if len(set(supplemental_identities.values())) > 1:
                    raise ValueError("supplemental descriptor has conflicting identity aliases")
                supplemental_field = supplemental.get("identity_field")
                if supplemental_identities:
                    if (supplemental_field not in supplemental_identities
                            or supplemental_identities[supplemental_field] != supplemental.get("identity")):
                        raise ValueError("supplemental descriptor identity differs from its recorded field")
                elif supplemental_field is not None or supplemental.get("identity") is not None:
                    raise ValueError("supplemental descriptor claims an identity absent from its bytes")
                if walkthrough_guide_bytes and supplemental["url"] not in declared_bundle_urls(walkthrough_guide_bytes):
                    raise ValueError("supplemental descriptor URL is not linked by its walkthrough guide")
        historical_descriptors = row.get("historical_descriptor_observations", [])
        historical_descriptor_keys = [(item.get("url"), item.get("observed_at")) for item in historical_descriptors]
        if len(historical_descriptor_keys) != len(set(historical_descriptor_keys)):
            raise ValueError("duplicate historical descriptor observation")
        for item in historical_descriptors:
            if (not safe_public_url(item.get("url", "")) or item.get("http_status") not in {200, 404}
                    or not SHA256.fullmatch(item.get("response_sha256") or "")):
                raise ValueError("historical descriptor observation is incomplete")
            try:
                datetime.fromisoformat(item.get("observed_at", "").replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                raise ValueError("invalid historical descriptor observation date") from None
            if item.get("evidence_path"):
                evidence_path = item["evidence_path"]
                if (not safe_relative(evidence_path)
                        or not evidence_path.startswith("registry/walkthrough-register/evidence/bundle-descriptors/")):
                    raise ValueError("unsafe retained historical descriptor path")
                historical_bytes = (root / evidence_path).read_bytes()
                if sha256(historical_bytes) != item.get("evidence_sha256"):
                    raise ValueError("historical descriptor bytes differ from their retained digest")
                historical_descriptor = json.loads(historical_bytes)
                if (item.get("http_status") != 200 or item.get("bytes") != len(historical_bytes)
                        or historical_descriptor.get("schema") != item.get("schema")
                        or historical_descriptor.get("version") != item.get("producer_product_version")
                        or historical_descriptor.get("okf_version") != item.get("okf_core_version")):
                    raise ValueError("historical descriptor fields differ from their exact retained bytes")
            elif (item.get("http_status") != 404
                    or item.get("status_binding") != "recorded HTTP status and response digest; response body not separately retained"):
                raise ValueError("historical descriptor without response bytes must remain explicitly qualified")
        if row.get("descriptor_http_status") == 404:
            current = row.get("current_page_observation", {})
            if (not safe_public_url(row.get("descriptor_url", ""))
                    or current.get("http_status") != 404
                    or current.get("response_sha256") != row.get("descriptor_response_sha256")):
                raise ValueError("current missing descriptor is not bound to the observed 404 body")
        proof = row.get("retained_proof", {})
        if proof.get("status") not in {"passed", "failed", "unknown"} or not SHA256.fullmatch(proof.get("sha256", "")):
            raise ValueError("walkthrough retained evidence must have a status and valid digest")
        retained_summary = validate_receipt_summary(proof, root)
        if row["id"] in LEGISLATION_WALKTHROUGH_IDS:
            expected_summary = {
                "source_commit": row["current_source_commit"],
                "walkthrough_id": row["id"],
                "okf_core_version": row["okf_core_version"],
                "guide_url": row["guide_url"],
                "guide_sha256": row["guide_sha256"],
                "descriptor_sha256": row["version_evidence_sha256"],
                "browser_widths": [390, 1440],
            }
            if proof["status"] != "passed" or any(retained_summary.get(key) != value
                    for key, value in expected_summary.items()):
                raise ValueError("Legislation browser receipt does not match its guide, descriptor and viewports")
        for historical_proof in row.get("historical_proofs", []):
            if historical_proof.get("status") not in {"passed", "failed", "unknown"}:
                raise ValueError("historical receipt has an invalid status")
            validate_receipt_summary(historical_proof, root)
        for supporting_proof in row.get("supporting_receipts", []):
            if supporting_proof.get("status") not in {"passed", "failed", "unknown"}:
                raise ValueError("supporting receipt has an invalid status")
            validate_receipt_summary(supporting_proof, root)
        current_proof = row.get("current_publication_proof")
        if current_proof is not None:
            if current_proof.get("status") != "passed" or not SHA256.fullmatch(current_proof.get("sha256", "")):
                raise ValueError("current public walkthrough proof must be a passed, hash-bound receipt")
            current_summary = validate_receipt_summary(current_proof, root)
            if (current_summary.get("walkthrough_id") != row["id"]
                    or current_summary.get("source_commit") != row.get("current_source_commit")
                    or current_summary.get("okf_core_version") != row.get("okf_core_version")
                    or current_summary.get("bundle_identity") != row.get("bundle_identity")
                    or current_summary.get("descriptor_sha256") != row.get("version_evidence_sha256")
                    or current_summary.get("producer_product_version") != row.get("producer_product_version")
                    or current_summary.get("expected_reader_commit") != source["shared_reader_release"].get("source_commit")
                    or row.get("reader_version") != source["shared_reader_release"].get("version")):
                raise ValueError("current public walkthrough proof differs from its current source or descriptor")
            descriptor_path = row.get("version_evidence_path", "")
            descriptor_bytes = (root / descriptor_path).read_bytes()
            if sha256(descriptor_bytes) != row.get("version_evidence_sha256"):
                raise ValueError("current browser proof descriptor bytes differ from current version evidence")
            descriptor = json.loads(descriptor_bytes)
            browser_cases = current_summary.get("cases", [])
            if ({case.get("viewport") for case in browser_cases} != {"desktop", "mobile"}
                    or len(browser_cases) != 2
                    or any(case.get("question") != row["question"]
                           or case.get("descriptor_sha256") != row.get("version_evidence_sha256")
                           or case.get("expected_identity", {}).get("id") != row.get("bundle_identity")
                           or case.get("expected_identity", {}).get("schema") != row.get("descriptor_schema")
                           or case.get("expected_identity", {}).get("version") != row.get("producer_product_version")
                           or case.get("guide_link_followed") is not True
                           or case.get("wcag_violations") != 0
                           or case.get("horizontal_overflow") is not False
                           for case in browser_cases)):
                raise ValueError("current browser cases do not match the walkthrough question and identity")
            for case in browser_cases:
                validate_expected_identity(case.get("expected_identity"), descriptor)
        if proof.get("observed_at") is None:
            if proof.get("date_status") not in {"date not present in retained receipt",
                                               "date not present in retained public access entry"}:
                raise ValueError("undated walkthrough proof must be labelled as undated")
        else:
            try:
                datetime.fromisoformat(proof.get("observed_at", "").replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                raise ValueError("invalid walkthrough retained proof date") from None
        current_observation = row.get("current_page_observation")
        if row.get("current_page_checked") != (current_observation is not None):
            raise ValueError("current page check flag must match its dated observation")
        if current_observation is not None:
            validate_page_observation(root, row, current_observation)
        historical_pages = row.get("historical_page_observations", [])
        historical_ids = [item.get("receipt_id") for item in historical_pages]
        if len(historical_ids) != len(set(historical_ids)):
            raise ValueError("duplicate historical page observation")
        if current_observation and current_observation.get("receipt_id") in historical_ids:
            raise ValueError("current page observation is duplicated in its history")
        for historical_page in historical_pages:
            validate_page_observation(root, row, historical_page, historical=True)
        if row.get("id") == ELS_WALKTHROUGH_ID or row.get("public_browser_binding") is not None:
            post_capture.append(validate_els_public_browser_binding(row, root, source))

    for descriptor in source.get("public_bundle_descriptor_observations", []):
        old = access_rows[descriptor["repository"].removeprefix("https://github.com/")]
        if (descriptor.get("repository") != old.get("repository")
                or descriptor.get("descriptor_url") != old.get("descriptor")
                or descriptor.get("previous_access_descriptor_sha256") != old.get("descriptor_sha256")
                or descriptor.get("previous_access_observed_on") != old.get("observed_on")
                or descriptor.get("previous_raw_descriptor_url") != old.get("equivalent_raw_descriptor")
                or descriptor.get("previous_access_digest_matches") != (
                    descriptor.get("descriptor_sha256") == old.get("descriptor_sha256"))):
            raise ValueError("current descriptor observation is not linked to its prior public access entry")
        if (not isinstance(descriptor.get("title"), str) or not descriptor["title"].strip()
                or len(descriptor["title"]) > 200 or any(c in descriptor["title"] for c in "\r\n\x00")):
            raise ValueError("invalid public descriptor title")
        if not safe_public_url(descriptor.get("descriptor_url")):
            raise ValueError("unsafe public descriptor URL")
        try:
            datetime.fromisoformat(descriptor.get("captured_at", "").replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            raise ValueError("invalid current descriptor capture date") from None
        if descriptor.get("http_status") != 200:
            raise ValueError("current descriptor capture did not return HTTP 200")
        path = descriptor.get("descriptor_evidence_path", "")
        if not safe_relative(path) or not path.startswith("registry/walkthrough-register/evidence/descriptors/"):
            raise ValueError("unsafe descriptor evidence path")
        raw = (root / path).read_bytes()
        if len(raw) != descriptor.get("descriptor_bytes") or sha256(raw) != descriptor.get("descriptor_sha256"):
            raise ValueError("captured public descriptor bytes or digest changed")
        parsed = json.loads(raw)
        identity_field = descriptor.get("identity_field")
        if identity_field not in {"@id", "bundle_id", None}:
            raise ValueError("unsupported descriptor identity field")
        if parsed.get("@id") and parsed.get("bundle_id") and parsed["@id"] != parsed["bundle_id"]:
            raise ValueError("conflicting descriptor identity aliases")
        actual_identity_field = "@id" if parsed.get("@id") else "bundle_id" if parsed.get("bundle_id") else None
        if (parsed.get("okf_version") != descriptor.get("okf_version")
                or parsed.get("version") != descriptor.get("producer_product_version")
                or actual_identity_field != identity_field):
            raise ValueError("captured descriptor fields do not match register observation")
        actual_identity = parsed.get(identity_field) if identity_field else None
        if actual_identity != descriptor.get("descriptor_identity"):
            raise ValueError("captured descriptor identity does not match register observation")
        if parsed.get("schema") != descriptor.get("schema"):
            raise ValueError("captured descriptor schema does not match register observation")
        if not re.fullmatch(r"0\.\d+(?:\.\d+)*", str(descriptor.get("okf_version", ""))):
            raise ValueError("invalid current descriptor core version")
        for key in ("walkthrough_url", "producer_release_url", "previous_raw_descriptor_url"):
            url = descriptor.get(key)
            if url and not safe_public_url(url):
                raise ValueError("unsafe public URL in descriptor observation")
        if descriptor.get("previous_pinned_source_commit"):
            if not re.fullmatch(r"[0-9a-f]{40}", descriptor["previous_pinned_source_commit"]):
                raise ValueError("invalid pinned source commit")

    if source.get("post_capture_descriptor_observations", []) != post_capture:
        raise ValueError("post-capture descriptor observation differs from the public asset proof")

    for walkthrough in source.get("walkthroughs", []):
        for key in ("question", "bundle_id", "root_id"):
            if not walkthrough.get(key):
                raise ValueError("walkthrough is missing its question or bundle identity")
        file_digests = {"data_path": "data_file_sha256", "authored_path": "authored_file_sha256",
                        "case_path": "case_file_sha256", "html_path": "html_path_sha256",
                        "diagram_path": "diagram_path_sha256"}
        for key, digest_key in file_digests.items():
            path = walkthrough.get(key)
            if not safe_relative(path):
                raise ValueError("unsafe walkthrough evidence path")
            if sha256((root / path).read_bytes()) != walkthrough.get(digest_key):
                raise ValueError("walkthrough evidence digest mismatch")
        data = json.loads((root / walkthrough["data_path"]).read_bytes())
        data_root = PurePosixPath(walkthrough["data_path"]).parent
        for data_key, hash_key in (("graph", "graph_sha256"), ("descriptor", "descriptor_sha256")):
            if not safe_relative(data.get(data_key, "")):
                raise ValueError("walkthrough packet contains an unsafe evidence path")
            cited = root.joinpath(*data_root.parts, *PurePosixPath(data[data_key]).parts)
            if not cited.is_file() or sha256(cited.read_bytes()) != data.get(hash_key):
                raise ValueError("walkthrough packet graph or descriptor citation digest mismatch")
        for citation in data.get("source_documents", []):
            route = citation.get("route", "")
            if not safe_relative(route):
                raise ValueError("walkthrough packet contains an unsafe source citation")
            cited = root / route
            if (not cited.is_file() or sha256(cited.read_bytes()) != citation.get("sha256")
                    or cited.stat().st_size != citation.get("bytes")):
                raise ValueError("walkthrough packet source citation digest mismatch")
        root_match = next((r for r in roots if r["root_id"] == walkthrough["root_id"]), None)
        if (root_match is None or root_match["repository"] != walkthrough["repository"]
                or root_match["root_path"] != walkthrough["root_path"]):
            raise ValueError("walkthrough is not attached to its recorded public root")
        descriptor_match = next((d for d in source["public_bundle_descriptor_observations"]
                                 if d["repository"] == f"https://github.com/{walkthrough['repository']}"), None)
        if descriptor_match is None or descriptor_match["descriptor_sha256"] != walkthrough["descriptor_sha256"]:
            raise ValueError("walkthrough descriptor is not bound to the captured public descriptor")
        if (data.get("question") != walkthrough["question"] or data.get("bundle_id") != walkthrough["bundle_id"]
                or data.get("okf_version") != walkthrough.get("okf_version")
                or data.get("case_sha256") != walkthrough["case_sha256"]
                or data.get("authored_walkthrough_sha256") != walkthrough["authored_sha256"]):
            raise ValueError("walkthrough packet content does not match register")
        if not safe_public_url(walkthrough.get("guide_url")):
            raise ValueError("unsafe walkthrough guide URL")
        if walkthrough["guide_url"] != (
                "https://chris-page-gov.github.io/okf-explorer/" + walkthrough["html_path"]):
            raise ValueError("reference guide URL differs from its published evidence path")
        if (not re.fullmatch(r"[0-9a-f]{40}", walkthrough.get("source_commit", ""))
                or walkthrough.get("authored_source_url") != (
                    f"https://github.com/{walkthrough['repository']}/blob/"
                    f"{walkthrough['source_commit']}/{walkthrough['authored_path']}")):
            raise ValueError("reference question source URL must pin its authored evidence")
    reader = source.get("shared_reader_release", {})
    reader_path = reader.get("source_path", "")
    if (not safe_relative(reader_path) or sha256((root / reader_path).read_bytes()) != reader.get("source_sha256")
            or not re.fullmatch(r"[0-9a-f]{40}", reader.get("source_commit", ""))):
        raise ValueError("shared Reader release source binding is invalid")
    package = json.loads((root / reader_path).read_bytes())
    if package.get("version") != reader.get("version") or reader.get("is_okf_core_version") is not False:
        raise ValueError("shared Reader product version is not separate from OKF core")
    return source


def render(source: dict) -> dict[Path, str]:
    machine = {
        "schema": "okf-public-walkthrough-register.v1",
        "modified": source["modified"],
        "locale": "en-GB",
        "scope": source["scope"],
        "shared_reader_release": source["shared_reader_release"],
        "roots": [{**r, "observations": [
            {**o, "release_status": "not established by the public root inventory"}
            for o in r["observations"]
        ]} for r in source["roots"]],
        "public_bundle_descriptor_observations": source["public_bundle_descriptor_observations"],
        "post_capture_descriptor_observations": source.get("post_capture_descriptor_observations", []),
        "walkthroughs": source.get("walkthroughs", []),
        "repository_visibility_observations": source.get("repository_visibility_observations", []),
        "review_walkthroughs": [
            {**w, "historical_root_core_version_fields": [
                {"value": e["value"], "path": e["path"],
                 "evidence_sha256": e["evidence_sha256"], "git_blob_sha1": e["git_blob_sha1"],
                 "status": "field-only historical observation"}
                for r in source["roots"] if (r["repository"], r["root_path"]) == (w["repository"], w["root_path"])
                for o in r["observations"] for e in o.get("core_version_evidence", [])
            ]}
            for w in source.get("review_walkthroughs", [])
        ],
    }
    lines = ["# Public OKF walkthrough register", "",
             "This dated register covers the recorded public repository roots in its denominator. It does not claim fresh owner discovery, complete national coverage, conformance, or legal acceptance.", "",
             f"Scope: {source['scope']['public_root_count']} repository/root identities across {source['scope']['public_revision_observation_count']} recorded public revision observations. The inventory snapshots were observed on 23 and 25 November 2026.", "",
             f"Questions: {source['scope']['public_walkthrough_count']} walkthroughs, comprising {source['scope']['review_walkthrough_count']} reviewed producer/profile entries and {source['scope']['reference_walkthrough_count']} source-bound Explorer reference walkthrough. These are questions, not a count of independent bundles.", "",
             "[Machine-readable register](../registry/walkthrough-register.json)", "",
             "Core version is taken from an exact captured public descriptor where one is available. Older index/frontmatter fields are retained as historical field observations only unless their bytes are separately captured and verified. Declared bundle version/edition, OKF core version, and shared Reader package version are separate.", "",
             "A Pages descriptor capture records the bytes served at that route on its observation date. It does not establish a tagged release, accepted candidate, full-bundle conformance or legal sufficiency. Root inventory commits and dates are discovery observations; they are not publication receipts.", "",
             f"Shared Reader package: {source['shared_reader_release']['version']}. This is a Reader version, not an OKF core declaration; its revision and evidence are in the machine-readable register.", ""]
    descriptor_lines = ["## Current public descriptor observations", "",
             "The table records the 13 exact anonymous HTTP descriptor bytes captured in the 25 November access-directory batch. A changed digest does not inherit an earlier release or walkthrough acceptance. These captures do not re-run browser or conformance checks.", "",
             "| Repository | Descriptor core | Declared bundle version/edition | Current bytes | Prior directory digest | Walkthrough evidence |", "| --- | --- | --- | --- | --- | --- |"]
    for d in source["public_bundle_descriptor_observations"]:
        match = "same" if d.get("previous_access_digest_matches") else "changed"
        listed = sum(w["repository"] == d["repository"].removeprefix("https://github.com/")
                     for w in source.get("review_walkthroughs", []) + source.get("walkthroughs", []))
        guide = f"{listed} walkthrough(s) listed above; inspect each dated status" if listed else "not listed"
        title = d["title"].replace("|", "\\|").replace("`", "\\`").replace("[", "\\[").replace("]", "\\]")
        descriptor_lines.append(f"| [{title}]({d['repository']}) | {d['okf_version']} | {d['producer_product_version']} | `{d['descriptor_sha256']}` ({d['captured_at']}) | {match} | {guide} |")
    descriptor_lines.extend(["", "## Later producer-owned public asset observations", "",
                             "These observations are separate from the 13-entry HTTP descriptor batch above. They use the public browser and asset receipts plus the producer's checksum manifest; they do not record a direct HTTP status or extend release approval.", "",
                             "| Producer | Core | Declared edition | Descriptor SHA-256 | Observed | Public evidence |",
                             "| --- | --- | --- | --- | --- | --- |"])
    for item in source.get("post_capture_descriptor_observations", []):
        descriptor_lines.append(
            f"| [{item['repository'].removeprefix('https://github.com/')}](https://github.com/{item['repository'].removeprefix('https://github.com/')}) | "
            f"{item['okf_version']} | {item['producer_product_version']} | `{item['descriptor_sha256']}` | "
            f"{item['captured_at']} | `{item['public_asset_path']}` in a passed asset and browser receipt |"
        )
    lines.extend(["", "## Explorer reference walkthrough with hash-bound local evidence", ""])
    if source.get("walkthroughs"):
        for w in source["walkthroughs"]:
            lines.extend([f"### {w['title']}", "", w["question"], "",
                          f"Core `{w['okf_version']}` from the captured descriptor; declared bundle version/edition `{w['producer_product_version']}`; Reader `{source['shared_reader_release']['version']}`. The packet, authored question, case, HTML guide and SVG diagram are checked against their recorded SHA-256 values. Status: {w['status']}.", "",
                          f"[Guide]({w['guide_url']}) · [Evidence packet](../{w['data_path']}) · [Diagram](../{w['diagram_path']}) · [Question source]({w['authored_source_url']})", ""])
    else:
        lines.extend(["No walkthrough has yet passed the local question, evidence packet and guide digest check.", ""])
    lines.extend(["## Reviewed public walkthroughs", "",
                  "Each entry keeps one logical question. Mobile and desktop views are checks of the same walkthrough. Earlier release evidence and current-page observations are kept distinct.", ""])
    for w in source.get("review_walkthroughs", []):
        core = w.get("okf_core_version") or "not established by captured descriptor"
        history = sorted({e["value"] for r in source["roots"]
                          if (r["repository"], r["root_path"]) == (w["repository"], w["root_path"])
                          for o in r["observations"] for e in o.get("core_version_evidence", [])})
        if history and w.get("okf_core_version") is None:
            core += "; historical root field " + ", ".join(history) + " (field-only)"
        product = w.get("producer_product_version") or "not recorded"
        proof = w["retained_proof"]
        q = w["question"].replace("|", "\\|").replace("\n", " ")
        title = w["title"].replace("|", "\\|")
        proof_date = proof.get("observed_at") or "date not present in retained receipt"
        current = w.get("current_page_observation")
        current_status = f"Current page: HTTP {current['http_status']} on {current['observed_at']}; {current['result']}" if current else "Current page: not rechecked."
        if current is None and w['id'] in LEGISLATION_WALKTHROUGH_IDS:
            current_status = ""
        prior_pages = w.get("historical_page_observations", [])
        prior_page_status = ""
        if prior_pages:
            prior = "; ".join(f"HTTP {item['http_status']} on {item['observed_at']}" for item in prior_pages)
            prior_page_status = f" Earlier page observations: {prior}."
        current_browser = w.get("current_publication_proof")
        browser_status = ""
        if current_browser:
            browser_status = (f" Current browser proof: passed ({current_browser['observed_at']}); "
                              f"desktop and mobile journeys for this guide using Reader {w.get('reader_version', 'not recorded')}.")
        public_browser_binding = w.get("public_browser_binding")
        if public_browser_binding:
            browser_status = (f" Public Chrome proof: passed ({proof_date}); 85 public asset hashes and "
                              f"desktop and mobile journeys passed for Reader {w.get('reader_version', 'not recorded')}. "
                              "The receipt does not record axe results.")
        assets_proof = next((item for item in w.get("supporting_receipts", [])
                             if item.get("id") == "hansard-stage6-public-assets"), None)
        if assets_proof:
            browser_status += (f" Complete public-assets gate: passed ({assets_proof['observed_at']}); "
                               f"{assets_proof['catalogue_files_verified']} catalogue and "
                               f"{assets_proof['served_files_verified']} served files verified.")
        if w.get("version_scope") == "profile":
            core = f"profile {w['profile_version']}; core version not asserted"
        descriptor_links = []
        if w.get("descriptor_url"):
            descriptor_links.append(f"[bundle descriptor]({w['descriptor_url']})")
        descriptor_links.extend(f"[related descriptor]({item['url']})" for item in w.get("supplemental_descriptors", []))
        if w.get("descriptor_binding") == "els-public-asset-manifest":
            descriptor_note = (f" Descriptor bytes are bound to the public asset checksum manifest at "
                               f"{w.get('descriptor_observed_at', '')}; no direct HTTP status is recorded: "
                               f"{descriptor_links[0]}.") if descriptor_links else ""
        elif w.get("descriptor_http_status") == 404:
            descriptor_note = f" Descriptor URL returned HTTP 404 on {w.get('descriptor_observed_at', '')}: {descriptor_links[0]} (version remains unknown)." if descriptor_links else ""
        elif descriptor_links:
            descriptor_note = f" Exact descriptor returned HTTP {w.get('descriptor_http_status', 200)} on {w.get('descriptor_observed_at', '')}: " + " · ".join(descriptor_links) + "."
        else:
            descriptor_note = ""
        guide_status = w["guide_status"].removesuffix("; current page not rechecked")
        proof_label = "Public proof" if public_browser_binding or w["id"] in LEGISLATION_WALKTHROUGH_IDS else "Earlier evidence"
        lines.extend([f"### {title}", "", q, "",
                      f"**Version:** {core}; declared bundle version/edition {product}; shared Reader {w.get('reader_version') or 'not recorded'}.{descriptor_note}", "",
                      f"[Guide]({w['guide_url']}) · [Question and evidence source]({w['source_url']})", "",
                      f"{proof_label}: {proof['status']} ({proof_date}); {guide_status}", "",
                      current_status + prior_page_status + browser_status, ""])
    lines.extend(["", *descriptor_lines])
    lines.extend(["", "## Repository visibility observation", "",
                  f"Unauthenticated GitHub repository metadata returned HTTP 200 and `public` for all {len(source.get('repository_visibility_observations', []))} distinct repositories in this denominator at {source['scope'].get('current_visibility_observed_at')}. This records repository visibility only; it is not fresh owner discovery, bundle acceptance or walkthrough availability.", ""])
    lines.extend(["## Public root denominator and recorded history", "",
                  "Every repository/root identity below remains visible. Aliases, contract umbrellas, fixtures, generated projections and historical roots are retained with their recorded classification; they do not become independent bundles by being listed. `Pending` means no exact question, packet and guide digest has been reviewed for that root.", "",
                  "| Repository | Root | Recorded classifications | Recorded core field(s) | Root revisions observed | Walkthrough status |", "| --- | --- | --- | --- | --- | --- |"])
    for row in source["roots"]:
        classes = ", ".join(sorted({o["classification"] for o in row["observations"]}))
        versions = sorted({e["value"] for o in row["observations"] for e in o.get("core_version_evidence", [])})
        version = ", ".join(versions) + " (field-only)" if versions else "not established"
        revisions = "; ".join(
            ", ".join(o["observed_at"]) + " @ `" + o["source_commit"] + "`"
            for o in row["observations"]
        )
        listed = sum(1 for w in source.get("review_walkthroughs", [])
                     if (w["repository"], w["root_path"]) == (row["repository"], row["root_path"]))
        status = (f"{listed} review link(s); prior evidence retained" if listed else
                  "local hashes checked" if row.get("walkthrough_status", "").startswith("source evidence verified") else "pending")
        root_label = "(no OKF root recorded)" if row["root_path"] is None else f"`{row['root_path']}`"
        lines.append(f"| `{row['repository']}` | {root_label} | {classes} | {version} | {revisions} | {status} |")
    lines.extend(["", "The machine-readable register retains source commits, observed dates, inventory record digests, explicit dispositions and descriptor identities. It checks local captured bytes deterministically. It does not establish that a URL will remain available after the observation date.", ""])
    return {OUTPUTS[0]: json.dumps(machine, ensure_ascii=False, indent=2) + "\n",
            OUTPUTS[1]: "\n".join(lines)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    outputs = render(load())
    if args.check:
        stale = [str(p) for p, content in outputs.items()
                 if not (ROOT / p).is_file() or (ROOT / p).read_text(encoding="utf-8") != content]
        if stale:
            raise SystemExit("Walkthrough register outputs differ: " + ", ".join(stale))
        print("Public walkthrough register is synchronised")
    else:
        for path, content in outputs.items():
            (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
            (ROOT / path).write_text(content, encoding="utf-8")
        print(f"Built {len(outputs)} public walkthrough register outputs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
