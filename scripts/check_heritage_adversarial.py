#!/usr/bin/env python3
"""Run the Heritage Foundry's tiny adversarial gate before corpus generation."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urljoin

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import acquire_heritage_evaluation_sources as acquire  # noqa: E402
import build_heritage_evaluation as heritage  # noqa: E402
import build_okf_registry  # noqa: E402
import build_site  # noqa: E402
import okf_semantic  # noqa: E402


DEFAULT_MANIFEST = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "adversarial"
    / "microfixtures.json"
)
MANIFEST_SCHEMA = (
    ROOT
    / "evaluation-foundry"
    / "schemas"
    / "heritage-adversarial-microfixtures.v1.schema.json"
)
TINY_SNAPSHOT = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "tiny"
    / "source-snapshot.json"
)
JOURNEYS = (
    ROOT
    / "evaluation-foundry"
    / "fixtures"
    / "heritage-warwickshire"
    / "journeys.json"
)
APP_PAGE = ROOT / "apps" / "okf-explorer" / "src" / "routes" / "+page.svelte"
STATIC_404 = ROOT / "apps" / "okf-explorer" / "static" / "404.html"
GENERATED_AT = "2026-08-02T00:00:00Z"
SHA256 = re.compile(r"^[0-9a-f]{64}$")


class MicrofixtureError(ValueError):
    """An adversarial case did not produce its required safe outcome."""


def canonical_json(value: Any) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise MicrofixtureError(f"{path.relative_to(ROOT)} must contain a JSON object")
    return value


def require(condition: bool, message: str) -> None:
    if not condition:
        raise MicrofixtureError(message)


def tiny_snapshot() -> dict[str, Any]:
    return load_json(TINY_SNAPSHOT)


def check_har_continuity(case: dict[str, Any]) -> dict[str, Any]:
    snapshot = tiny_snapshot()
    annual = snapshot.get("har", {}).get("annual", [])
    require(bool(annual), "tiny snapshot has no HAR annual sheet")
    current = copy.deepcopy(annual[-1])
    years = case["input"]["years"]
    require(len(years) == 3, "continuity microfixture requires three event sheets")
    prior = copy.deepcopy(current)
    prior["year"] = years[0]
    prior["event_type"] = "entry"
    prior["source_url"] = (
        "https://historicengland.org.uk/content/docs/har/"
        f"har-{years[0]}-entries-additions-removals/"
    )
    prior["rows"][0]["record_id"] = "microfixture-prior-entry"
    current["year"] = years[1]
    current["event_type"] = "entry"
    current["rows"][0]["record_id"] = "microfixture-current-entry"
    same_year = copy.deepcopy(current)
    same_year["year"] = years[2]
    same_year["event_type"] = "addition"
    same_year["rows"][0]["record_id"] = "microfixture-current-addition"
    same_year["rows"][0]["event_type"] = "addition"
    snapshot["har"]["annual"] = [prior, current, same_year]
    corpus = heritage.build_corpus(snapshot, GENERATED_AT)
    records = {row["route"]: row for row in corpus["records"]}
    revision_edges = [
        row
        for row in corpus["relationships"]
        if row.get("predicate") == "https://www.w3.org/ns/prov#wasRevisionOf"
    ]
    strictly_newer = all(
        int(records[row["source"]]["register_year"])
        > int(records[row["target"]]["register_year"])
        for row in revision_edges
    )
    expected = case["expected"]
    require(
        len(revision_edges) == expected["revision_edges"],
        f"expected {expected['revision_edges']} cross-year revision edge, got {len(revision_edges)}",
    )
    require(strictly_newer is expected["strictly_newer_source"], "same-year continuity edge escaped")
    heritage.validate_resource_references(corpus["records"], corpus["resources"])
    return {"revision_edges": len(revision_edges), "resource_routes_resolve": True}


def check_source_native_route(case: dict[str, Any]) -> dict[str, Any]:
    route = case["input"]["route"]
    require(not route.startswith("dataset/"), "the adversarial route must be source-native")
    corpus = heritage.build_corpus(tiny_snapshot(), GENERATED_AT)
    require(route in {row["route"] for row in corpus["records"]}, f"fixture route is missing: {route}")
    located = any(route in rows for _path, rows in corpus["record_locator_buckets"])
    require(located, f"record locator omitted source-native route {route}")

    source = APP_PAGE.read_text(encoding="utf-8")
    start = source.find("async function ensureLargeDataset(")
    end = source.find("\n  async function ", start + 1)
    require(start >= 0 and end > start, "cannot locate the selected-record loader")
    loader = source[start:end]
    require(
        "loadDatasetForRoute(route" in loader,
        "selected-record hydration no longer delegates the route to the locator",
    )
    require(
        "route.startsWith('dataset/')" not in loader
        and 'route.startsWith("dataset/")' not in loader,
        "selected-record hydration again requires a dataset/ prefix",
    )
    return {"route": route, "locator_authoritative": True}


def check_yaml_ld_presentation(case: dict[str, Any]) -> dict[str, Any]:
    yaml_ld = (
        '"@context":\n'
        '  "@vocab": "https://schema.org/"\n'
        '"@id": "https://example.test/heritage/1342941"\n'
        '"@type": "LandmarksOrHistoricalBuildings"\n'
        'name: "Coventry Cathedral"\n'
    )
    document = okf_semantic.load_yaml_ld_text(yaml_ld, source="LF03.yamlld")
    required_keywords = set(case["input"]["required_keywords"])
    require(required_keywords.issubset(document), "quoted YAML-LD keywords did not round-trip")
    semantic = json.loads(okf_semantic.semantic_json(document))

    def represented_keywords(value: Any) -> set[str]:
        if isinstance(value, dict):
            return set(value).union(
                *(represented_keywords(child) for child in value.values())
            )
        if isinstance(value, list):
            return set().union(*(represented_keywords(child) for child in value))
        return set()

    require(
        required_keywords.issubset(represented_keywords(semantic)),
        "JSON-LD projection dropped required keywords",
    )

    journeys = load_json(JOURNEYS)
    faithful = next(
        (row for row in journeys.get("journeys", []) if row.get("id") == "journey-faithful"),
        None,
    )
    require(isinstance(faithful, dict), "journey-faithful is missing")
    exercised = {
        action.get("value")
        for action in faithful.get("actions", [])
        if action.get("action") == "select_view"
    }
    missing = sorted(set(case["input"]["required_views"]) - exercised)
    require(not missing, f"presentation views are not exercised: {', '.join(missing)}")
    return {"keywords": sorted(required_keywords), "views": sorted(exercised)}


def check_publication_capacity(case: dict[str, Any]) -> dict[str, Any]:
    values = case["input"]
    projected = values["shell_bytes"] + values["new_pack_bytes"]
    inline_allowed = projected <= values["limit_bytes"]
    require(inline_allowed is case["expected"]["inline_allowed"], "capacity boundary expectation changed")
    require(not inline_allowed, "the microfixture no longer crosses the publication limit")
    return {
        "projected_bytes": projected,
        "limit_bytes": values["limit_bytes"],
        "external_pack_required": True,
    }


def check_ephemeral_exclusion(case: dict[str, Any]) -> dict[str, Any]:
    excluded = [Path(value) for value in case["input"]["excluded"]]
    included = [Path(value) for value in case["input"]["included"]]
    require(
        all(build_site.is_ephemeral_evaluation_result(path) for path in excluded),
        "an evaluator result can enter public Site discovery",
    )
    require(
        not any(build_site.is_ephemeral_evaluation_result(path) for path in included),
        "a stable public input is incorrectly classified as ephemeral",
    )
    return {"excluded": len(excluded), "stable_inputs": len(included)}


def check_crs_provenance(case: dict[str, Any]) -> dict[str, Any]:
    snapshot = tiny_snapshot()
    values = case["input"]
    snapshot["geometry_delivery"]["crs"] = values["declared_crs"]
    snapshot["geometry_delivery"]["arcgis_out_sr"] = values["arcgis_out_sr"]
    spatial_reference = {"wkid": int(values["arcgis_out_sr"])}
    try:
        heritage.source_geometry_crs(snapshot, spatial_reference)
    except ValueError as exc:
        require(
            case["expected"]["error_contains"] in str(exc),
            f"CRS mismatch failed for the wrong reason: {exc}",
        )
        return {"accepted": False, "error": str(exc)}
    raise MicrofixtureError("a declared/source CRS mismatch was accepted")


def check_authority_scope(case: dict[str, Any]) -> dict[str, Any]:
    memberships, evidence = acquire.scope_memberships(case["input"]["row"])
    expected = case["expected"]["scope_memberships"]
    require(len(memberships) == expected, f"locality-only row produced {len(memberships)} scope memberships")
    require(not evidence, "locality-only row produced authority evidence")
    return {"scope_memberships": len(memberships), "authority_evidence": len(evidence)}


def check_public_search_bound(case: dict[str, Any]) -> dict[str, Any]:
    journeys = load_json(JOURNEYS)
    values = case["input"]
    journey = next(
        (row for row in journeys.get("journeys", []) if row.get("id") == values["journey_id"]),
        None,
    )
    require(isinstance(journey, dict), f"journey is missing: {values['journey_id']}")
    sequences = [
        action.get("sequence")
        for action in journey.get("actions", [])
        if action.get("action") == values["action"]
    ]
    require(sequences, f"journey does not exercise {values['action']}")
    first = min(int(value) for value in sequences)
    require(first <= values["maximum_sequence"], f"Search first appears at action {first}")
    return {"first_search_sequence": first, "maximum_sequence": values["maximum_sequence"]}


def check_project_root(case: dict[str, Any]) -> dict[str, Any]:
    values = case["input"]
    static_404 = STATIC_404.read_text(encoding="utf-8")
    project_target = f'{values["project_path"]}/'
    require(project_target in static_404, "static 404 does not retain the project base")
    require(
        urljoin("https://example.test/okf-explorer/", values["not_found_target"])
        == "https://example.test/okf-explorer/",
        "relative 404 routing escapes the project base",
    )
    with tempfile.TemporaryDirectory() as directory:
        previous = build_site.OUT
        try:
            build_site.OUT = Path(directory)
            build_site.write_legacy_404_if_absent()
            fallback = (Path(directory) / "404.html").read_text(encoding="utf-8")
        finally:
            build_site.OUT = previous
    require('url=./' in fallback and 'href="./"' in fallback, "generated 404 uses an account-root target")
    return {"static_target": project_target, "generated_target": "./"}


def check_closure_binding(case: dict[str, Any]) -> dict[str, Any]:
    values = case["input"]
    require(all(SHA256.fullmatch(value) for value in values.values()), "closure fixture hashes are malformed")
    accepted = values["expected_release_root"] == values["observed_release_root"]
    require(accepted is case["expected"]["accepted"], "changed closure was accepted by descriptor identity alone")
    return {"descriptor_unchanged": True, "release_root_matches": accepted}


def check_evidence_separation(case: dict[str, Any]) -> dict[str, Any]:
    values = case["input"]
    candidate = values["candidate"]
    roots = [sha256(canonical_json(candidate)) for _observation in values["observations"]]
    require(len(set(roots)) == 1, "timestamped observations changed the stable candidate projection")

    snapshot = tiny_snapshot()
    snapshot["publication"]["role"] = "faithful"
    files = heritage.output_files(heritage.build_corpus(snapshot, GENERATED_AT), snapshot)
    candidate_evidence = sorted(
        path.as_posix() for path in files if path.parts and path.parts[0] == "evidence"
    )
    require(
        not candidate_evidence,
        "candidate output still embeds observation evidence: " + ", ".join(candidate_evidence),
    )
    return {"candidate_root_sha256": roots[0], "embedded_evidence_files": 0}


def check_registry_lockstep(case: dict[str, Any]) -> dict[str, Any]:
    expected_paths = {Path(value) for value in case["input"]["required_projections"]}
    actual_paths = {path.relative_to(ROOT) for path in build_okf_registry.OUTPUTS}
    require(expected_paths == actual_paths, "registry projection ownership changed without updating the gate")
    rendered = build_okf_registry.build()
    errors = [
        error
        for path, kind in build_okf_registry.OUTPUTS.items()
        if (error := build_okf_registry.check_file(path, rendered[kind]))
    ]
    require(not errors, "registry projections are out of lockstep: " + " | ".join(errors))
    return {"projections": len(actual_paths), "synchronized": True}


def planned_release_asset_name(path: Path) -> str:
    """Give generic evidence basenames a deterministic, path-derived release name."""

    prefix = "-".join(part for part in path.parent.parts if part not in ("", "."))
    return f"{prefix}-{path.name}" if prefix else path.name


def check_release_asset_names(case: dict[str, Any]) -> dict[str, Any]:
    paths = [Path(value) for value in case["input"]["paths"]]
    raw_names = [path.name for path in paths]
    planned_names = [planned_release_asset_name(path) for path in paths]
    raw_unique = len(raw_names) == len(set(raw_names))
    planned_unique = len(planned_names) == len(set(planned_names))
    require(raw_unique is case["expected"]["raw_basenames_unique"], "collision microfixture is ineffective")
    require(planned_unique is case["expected"]["planned_names_unique"], "planned release names still collide")
    return {"raw_basenames_unique": raw_unique, "planned_names": planned_names}


HANDLERS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "har_continuity": check_har_continuity,
    "source_native_route": check_source_native_route,
    "yaml_ld_presentation": check_yaml_ld_presentation,
    "publication_capacity": check_publication_capacity,
    "ephemeral_exclusion": check_ephemeral_exclusion,
    "crs_provenance": check_crs_provenance,
    "authority_scope": check_authority_scope,
    "public_search_bound": check_public_search_bound,
    "project_root": check_project_root,
    "closure_binding": check_closure_binding,
    "evidence_separation": check_evidence_separation,
    "registry_lockstep": check_registry_lockstep,
    "release_asset_names": check_release_asset_names,
}


def validate_manifest(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    require(
        manifest.get("schema") == "okf-heritage-adversarial-microfixtures.v1",
        "unsupported microfixture manifest schema",
    )
    cases = manifest.get("cases")
    require(isinstance(cases, list) and cases, "microfixture manifest has no cases")
    ids: set[str] = set()
    for index, case in enumerate(cases):
        require(isinstance(case, dict), f"case {index} is not an object")
        case_id = case.get("id")
        require(isinstance(case_id, str) and case_id, f"case {index} has no id")
        require(case_id not in ids, f"duplicate microfixture id: {case_id}")
        ids.add(case_id)
        require(case.get("validator") in HANDLERS, f"{case_id} has an unknown validator")
        require(bool(case.get("late_finding")), f"{case_id} is not bound to a late finding")
        require(bool(case.get("planes")), f"{case_id} has no plane selectors")
        require(bool(case.get("test_tags")), f"{case_id} has no test-tag selectors")
    require(len(cases) == 13, f"expected all 13 reconstructed late findings, got {len(cases)}")
    schema = load_json(MANIFEST_SCHEMA)
    Draft202012Validator.check_schema(schema)
    schema_errors = sorted(
        Draft202012Validator(schema).iter_errors(manifest),
        key=lambda error: tuple(str(part) for part in error.absolute_path),
    )
    require(
        not schema_errors,
        "microfixture manifest schema failed: "
        + " | ".join(error.message for error in schema_errors),
    )
    return cases


def run_cases(
    manifest: dict[str, Any],
    *,
    fixture_ids: set[str] | None = None,
    test_tags: set[str] | None = None,
) -> dict[str, Any]:
    cases = validate_manifest(manifest)
    unknown_ids = sorted((fixture_ids or set()) - {case["id"] for case in cases})
    require(not unknown_ids, "unknown microfixture selectors: " + ", ".join(unknown_ids))
    selected = [
        case
        for case in cases
        if (not fixture_ids or case["id"] in fixture_ids)
        and (not test_tags or test_tags.intersection(case["test_tags"]))
    ]
    require(bool(selected), "selectors matched no adversarial microfixtures")

    results = []
    for case in selected:
        try:
            detail = HANDLERS[case["validator"]](case)
        except Exception as exc:
            results.append({"id": case["id"], "status": "failed", "error": str(exc)})
        else:
            results.append({"id": case["id"], "status": "passed", "detail": detail})
    failed = [result for result in results if result["status"] != "passed"]
    return {
        "schema": "okf-heritage-adversarial-results.v1",
        "manifest_sha256": sha256(canonical_json(manifest)),
        "stage": manifest["stage"],
        "selected": len(results),
        "passed": len(results) - len(failed),
        "failed": len(failed),
        "results": results,
    }


def atomic_write(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{path.name}.", delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(payload)
    temporary.replace(path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--fixture", action="append", default=[], help="Run one case id; repeatable")
    parser.add_argument("--test-tag", action="append", default=[], help="Select cases by tag; repeatable")
    parser.add_argument("--output", type=Path, help="Write the deterministic result receipt")
    parser.add_argument("--list", action="store_true", help="List ids and selectors without executing")
    args = parser.parse_args(argv)
    manifest_path = args.manifest if args.manifest.is_absolute() else ROOT / args.manifest
    try:
        manifest = load_json(manifest_path)
        cases = validate_manifest(manifest)
        if args.list:
            for case in cases:
                print(
                    f"{case['id']}\tplanes={','.join(case['planes'])}\t"
                    f"tags={','.join(case['test_tags'])}"
                )
            return 0
        result = run_cases(
            manifest,
            fixture_ids=set(args.fixture),
            test_tags=set(args.test_tag),
        )
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Heritage adversarial gate failed: {exc}", file=sys.stderr)
        return 1
    if args.output:
        output = args.output if args.output.is_absolute() else ROOT / args.output
        atomic_write(output, json.dumps(result, indent=2, sort_keys=True).encode("utf-8") + b"\n")
    for row in result["results"]:
        stream = sys.stderr if row["status"] == "failed" else sys.stdout
        suffix = f": {row['error']}" if row["status"] == "failed" else ""
        print(f"{row['status'].upper()} {row['id']}{suffix}", file=stream)
    print(
        f"Heritage adversarial microfixtures: {result['passed']}/{result['selected']} passed"
    )
    return 1 if result["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
