"""Build the December 2025 UK display pack from the pinned ONS extracts."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from check_boundary_pack import check_pack, feature_ids, read_bounded


ITEMS = {
    "overview": {
        "variant": "BUC",
        "item": "818212ae5b2948bcb352842081c03762",
        "modified_ms": 1778753949000,
        "sha256": "1f526f8fdec2b8aeb0fd8ebef85e39fbd48ce91c1a3eb81800caf82972ec5256",
    },
    "detail": {
        "variant": "BGC",
        "item": "c8bea35f51054f0c95aa876f66fe027c",
        "modified_ms": 1778753812000,
        "sha256": "484e0d861f969bde60087c8616849e13928897e9f703479f0e43c5e85875fb46",
    },
}
COUNTRIES = {"E92000001", "N92000002", "S92000003", "W92000004"}
FEATURE_KEY = "CTRY25CD"
ATTRIBUTION = (
    "Source: Office for National Statistics licensed under the Open Government Licence v.3.0. "
    "Contains OS data © Crown copyright and database right 2025."
)


def canonical_json(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode()


def execute(*command: str) -> str:
    result = subprocess.run(
        command, check=True, capture_output=True, text=True, timeout=60,
        env={**os.environ, "PROJ_NETWORK": "OFF"},
    )
    return result.stdout.strip()


def component_counts(collection: dict) -> dict[str, int]:
    return {
        feature["properties"][FEATURE_KEY]: (
            len(feature["geometry"]["coordinates"]) if feature["geometry"]["type"] == "MultiPolygon" else 1
        )
        for feature in collection["features"]
    }


def ensure_valid(source: Path, work: Path) -> None:
    for kind in ("geometry", "coverage"):
        findings = work / f"{source.stem}-{kind}-findings.geojson"
        execute("gdal", "vector", f"check-{kind}", "--format", "GeoJSON", str(source), str(findings))
        if json.loads(findings.read_bytes())["features"]:
            raise ValueError(f"{source.name} has {kind} findings")


def build_representation(source: Path, role: str, work: Path, destination: Path) -> tuple[dict, dict]:
    pinned = ITEMS[role]
    raw = read_bounded(source, 32 * 1024 * 1024)
    if sha256(raw).hexdigest() != pinned["sha256"]:
        raise ValueError(f"{role} must match the retained ONS extract digest")
    # Validate the original geometry before transforming it. The two ONS
    # extracts are in WGS 84 as returned by the official outSR=4326 query.
    original = work / f"{role}-original.geojson"
    original.write_bytes(raw)
    ensure_valid(original, work)
    staged = work / f"{role}-derived.geojson"
    if role == "overview":
        execute(
            "ogr2ogr", "-f", "GeoJSON", "-lco", "RFC7946=YES", "-lco", "COORDINATE_PRECISION=7",
            str(staged), str(original),
        )
        derivation = "Serialise ONS BUC as RFC 7946, rounding positions to seven decimal places."
        generalisation = "ONS BUC, ultra-generalised at 500 metres."
    else:
        execute(
            "gdal", "vector", "simplify-coverage", "--format", "GeoJSON", "--lco", "RFC7946=YES",
            "--lco", "COORDINATE_PRECISION=7", str(original), str(staged), "--tolerance", "0.001",
        )
        derivation = "Apply GDAL coverage simplification at 0.001 degrees in WGS 84 and serialise at seven decimal places."
        generalisation = "ONS BGC, generalised at 20 metres and further simplified for display."
    collection = json.loads(staged.read_bytes())
    features = sorted(collection["features"], key=lambda feature: feature["properties"][FEATURE_KEY])
    for feature in features:
        properties = feature["properties"]
        feature["properties"] = {FEATURE_KEY: properties[FEATURE_KEY], "name": properties["CTRY25NM"]}
    clean = {"type": "FeatureCollection", "features": features}
    if feature_ids(clean, FEATURE_KEY, len(COUNTRIES)) != COUNTRIES:
        raise ValueError(f"{role} does not contain the four expected ONS nation codes")
    payload = canonical_json(clean)
    destination.write_bytes(payload)
    ensure_valid(destination, work)
    result = {
        "path": f"data/{destination.name}",
        "bytes": len(payload), "sha256": sha256(payload).hexdigest(),
        "media_type": "application/geo+json", "output_crs": "OGC:CRS84",
        "coastal_variant": "coastline-clipped", "generalisation": generalisation,
        "feature_id_property": FEATURE_KEY, "feature_count": len(COUNTRIES),
        "source": {
            "publisher": "Office for National Statistics",
            "product": f"Countries (December 2025) Boundaries UK {pinned['variant']}",
            "version": f"December 2025. ArcGIS last modified {pinned['modified_ms']} ms since epoch.",
            "url": f"https://www.arcgis.com/home/item.html?id={pinned['item']}",
            "sha256": pinned["sha256"], "source_crs": "EPSG:4326 query from EPSG:27700 service",
            "retrieved_on": "2026-11-18",
            "licence": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
            "attribution": ATTRIBUTION, "derivation": derivation,
        },
    }
    checks = {
        "source_components": component_counts(json.loads(raw)), "display_components": component_counts(clean),
        "geometry_findings": 0, "coverage_findings": 0,
    }
    return result, checks


def write_example_data(root: Path) -> tuple[dict, list[dict]]:
    """Build the records and integrity inventory for the example Map journey."""
    title = "ONS UK countries boundary pack example"
    names = {"E92000001": "England", "N92000002": "Northern Ireland", "S92000003": "Scotland", "W92000004": "Wales"}
    counts = {"datasets": len(names), "records": len(names), "publishers": 0, "resources": 0, "relationships": 0}
    snapshot = "2026-11-18T00:00:00Z"
    works = [
        {"id": code, "name": code, "route": f"dataset/{code}", "title": nation, "area_served": nation}
        for code, nation in sorted(names.items())
    ]
    descriptor = {
        "schema": "okf-explorer-large-corpus.v1", "kind": "okf-large-corpus",
        "title": title, "snapshot": snapshot, "counts": counts,
        "entrypoints": {
            "data_manifest": "data/manifest.json", "overview_index": "data/overview.json",
        },
    }
    manifest = {
        "title": title, "snapshot": snapshot, "generated_at": snapshot, "counts": counts,
        "indexes": {"overview": "data/overview.json"},
        "chunks": {"datasets": ["data/datasets-0.json"], "resources": [], "publishers": [], "relationships": []},
    }
    overview = {"schema": "okf-overview.v1", "title": title, "generated_at": snapshot, "counts": counts}
    resources = []
    for path, content in {
        "data/manifest.json": manifest, "data/overview.json": overview, "data/datasets-0.json": works,
    }.items():
        body = canonical_json(content)
        (root / path).write_bytes(body)
        resources.append({"path": path, "bytes": len(body), "sha256": sha256(body).hexdigest()})
    return descriptor, resources


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--buc", type=Path, required=True)
    parser.add_argument("--bgc", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Choose an unused output directory")
    gdal = execute("gdal", "--version").split()[1]
    geos = execute("geos-config", "--version")
    if (gdal, geos) != ("3.13.2", "3.14.1"):
        parser.error("Reproduction uses GDAL 3.13.2 and GEOS 3.14.1")
    with TemporaryDirectory(dir=args.output.parent, prefix="okf-boundaries-") as workspace:
        work = Path(workspace)
        pack = work / "pack"
        (pack / "data").mkdir(parents=True)
        representations, checks = {}, {}
        for role, source in (("overview", args.buc), ("detail", args.bgc)):
            representations[role], checks[role] = build_representation(source, role, work, pack / "data" / f"{role}.geojson")
        descriptor, offline_resources = write_example_data(pack)
        manifest = {
            "schema": "okf-geospatial-boundary-pack.v1", "id": "ons-uk-countries-december-2025",
            "geography_family": "United Kingdom countries", "vintage": "2025-12", "detail_min_zoom": 7,
            "identifier_scheme": "https://www.ons.gov.uk/methodology/geography/geographicalproducts/namescodesandlookups",
            "coverage": {
                "nations": ["England", "Scotland", "Wales", "Northern Ireland"],
                "crown_dependencies": "excluded", "overseas_territories": "excluded",
                "limitations": "Two cartographic representations of UK countries. Coastlines are clipped to Mean High Water. Small islands are subject to scale generalisation. Use source geometry for analysis.",
            },
            "representations": representations,
            "offline_resources": offline_resources,
        }
        manifest_path = pack / "manifest.json"
        manifest_path.write_bytes(canonical_json(manifest))
        receipt = {
            "schema": "okf-ons-country-boundary-build.v1", "tools": {"gdal": gdal, "geos": geos},
            "validation": check_pack(manifest_path), "checks": checks,
        }
        (pack / "receipt.json").write_bytes(canonical_json(receipt))
        descriptor["entrypoints"]["boundary_pack"] = {
            "path": manifest_path.name, "bytes": manifest_path.stat().st_size,
            "sha256": receipt["validation"]["manifest_sha256"],
        }
        (pack / "okf-explorer.json").write_bytes(canonical_json(descriptor))
        pack.rename(args.output)
    print(json.dumps(receipt, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
