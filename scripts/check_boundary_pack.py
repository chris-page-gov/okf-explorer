"""Check a local boundary pack's exact files, coordinate structure and joins."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path

from jsonschema import Draft202012Validator, ValidationError


SCHEMA = (
    Path(__file__).resolve().parents[1]
    / "profiles" / "geospatial-boundary-pack" / "v1" / "manifest.schema.json"
)


def read_bounded(path: Path, maximum: int) -> bytes:
    with path.open("rb") as stream:
        content = stream.read(maximum + 1)
    if len(content) > maximum:
        raise ValueError(f"{path.name} exceeds its byte limit")
    return content


def position_valid(value: object) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 2
        and all(type(coordinate) in (int, float) for coordinate in value)
        and -180 <= value[0] <= 180
        and -90 <= value[1] <= 90
    )


def polygon_valid(rings: object) -> bool:
    return (
        isinstance(rings, list)
        and bool(rings)
        and all(
            isinstance(ring, list) and len(ring) >= 4 and ring[0] == ring[-1]
            and all(position_valid(coordinate) for coordinate in ring)
            and len({tuple(coordinate) for coordinate in ring[:-1]}) >= 3
            for ring in rings
        )
    )


def feature_ids(document: object, key: str, expected: int) -> set[str]:
    if not isinstance(document, dict) or document.get("type") != "FeatureCollection" or "crs" in document:
        raise ValueError("Expected an RFC 7946 FeatureCollection in longitude and latitude")
    features = document.get("features")
    if not isinstance(features, list) or len(features) != expected:
        raise ValueError("Feature count differs from the manifest")
    identifiers = set()
    for feature in features:
        if not isinstance(feature, dict) or feature.get("type") != "Feature":
            raise ValueError("Expected GeoJSON features")
        properties = feature.get("properties")
        code = properties.get(key) if isinstance(properties, dict) else None
        if not isinstance(code, str) or not code.strip() or code in identifiers:
            raise ValueError("Missing or duplicate logical feature identifier")
        identifiers.add(code)
        geometry = feature.get("geometry")
        if not isinstance(geometry, dict) or geometry.get("type") not in {"Polygon", "MultiPolygon"}:
            raise ValueError("Boundary geometry must be a Polygon or MultiPolygon")
        coordinates = geometry.get("coordinates")
        polygons = [coordinates] if geometry["type"] == "Polygon" else coordinates
        if not isinstance(polygons, list) or not polygons or not all(map(polygon_valid, polygons)):
            raise ValueError(f"Invalid coordinate or open ring in feature {code}")
    return identifiers


def check_pack(manifest_path: Path) -> dict[str, object]:
    root = manifest_path.resolve(strict=True).parent
    raw = read_bounded(manifest_path, 65_536)
    manifest = json.loads(raw)
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    Draft202012Validator(schema, format_checker=Draft202012Validator.FORMAT_CHECKER).validate(manifest)

    sets = {}
    for role, representation in sorted(manifest["representations"].items()):
        path = root / representation["path"]
        if path.resolve(strict=True) != path:
            raise ValueError("Boundary assets must be regular files within the manifest directory")
        if not path.is_file():
            raise ValueError("Boundary asset is not a regular file")
        content = read_bounded(path, representation["bytes"])
        if len(content) != representation["bytes"] or sha256(content).hexdigest() != representation["sha256"]:
            raise ValueError(f"{role} bytes do not match the manifest")
        sets[role] = feature_ids(
            json.loads(content), representation["feature_id_property"], representation["feature_count"]
        )
    if sets["overview"] != sets["detail"]:
        raise ValueError("Overview and detail feature identifiers differ")
    return {"pack": manifest["id"], "manifest_sha256": sha256(raw).hexdigest(), "features": len(sets["overview"])}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    try:
        result = check_pack(args.manifest)
    except (AttributeError, OSError, TypeError, ValidationError, ValueError) as error:
        parser.exit(2, f"Boundary pack failed: {error}\n")
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
