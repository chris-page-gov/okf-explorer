#!/usr/bin/env python3
"""Validate one local OKF+ Analytical Data v2 package and emit its receipt."""

import argparse
import csv
import hashlib
import io
import json
import re
import sys
from collections import Counter
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from reconcile_okf_repositories import (
    ArtifactReadError,
    contained_repository_path,
    read_bounded_bytes,
    safe_http_url,
)
from referencing import Registry

PROFILE = "https://chris-page-gov.github.io/okf-explorer/profile/analytical-data/v2/"
ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "profiles/analytical-data/v2/package.schema.json"
MANIFEST = "okf-analytical-data.json"
MAX_ROWS = 100_000
MAX_PACKAGE_BYTES = 256 * 1024 * 1024


def digest(body):
    return hashlib.sha256(body).hexdigest()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON property")
        result[key] = value
    return result


def local_file(root, name):
    path = contained_repository_path(root, name)
    if not path.is_file():
        raise ValueError(f"Expected a regular file at {name}")
    return path


# Local candidate subset of RFC 3339: uppercase T/Z, known offset,
# years 0001-9999, 0-9 fractional digits and no leap-second literal.
TIMESTAMP = re.compile(
    r"([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?(Z|[+-][0-9]{2}:[0-9]{2})"
)
CRS = {
    "http://www.opengis.net/def/crs/OGC/1.3/CRS84": (
        ("longitude", "latitude"),
        "degree",
        ((-180, 180), (-90, 90)),
    ),
    "http://www.opengis.net/def/crs/EPSG/0/4326": (
        ("latitude", "longitude"),
        "degree",
        ((-90, 90), (-180, 180)),
    ),
    "http://www.opengis.net/def/crs/EPSG/0/27700": (
        ("easting", "northing"),
        "metre",
        None,
    ),
}


def reject_constant(_value):
    raise ValueError("Non-finite JSON number is not permitted")


def datetime_instant(value):
    if not isinstance(value, str):
        raise ValueError("Expected a datetime string")
    match = TIMESTAMP.fullmatch(value)
    if not match:
        raise ValueError(
            "Expected candidate datetime with a known UTC offset and at most 9 fractional digits"
        )
    year, month, day, hour, minute, second = map(int, match.groups()[:6])
    calendar = date(year, month, day)
    fraction, zone = match.group(7), match.group(8)
    if hour > 23 or minute > 59 or second > 59 or zone == "-00:00":
        raise ValueError(
            "Invalid time or unknown offset; leap seconds are outside this candidate"
        )
    offset = 0
    if zone != "Z":
        hours, minutes = map(int, zone[1:].split(":"))
        if hours > 23 or minutes > 59:
            raise ValueError("Invalid UTC offset")
        offset = (hours * 3600 + minutes * 60) * (1 if zone[0] == "+" else -1)
    seconds = (
        (calendar.toordinal() - date(1970, 1, 1).toordinal()) * 86400
        + hour * 3600
        + minute * 60
        + second
        - offset
    )
    return seconds * 1_000_000_000 + int((fraction or "").ljust(9, "0"))


def spatial_rules(table):
    spatial = table.get("spatial")
    if not spatial:
        return None
    axes, unit, domains = CRS[spatial["crs"]]
    if tuple(spatial["axes"]) != axes or spatial["unit"] != unit:
        raise ValueError("Spatial axes or unit differ from the declared supported CRS")
    fields = {field["name"]: field for field in table["fields"]}
    names = spatial["coordinateFields"]
    vertical = spatial.get("vertical")
    for name, expected in [(n, unit) for n in names] + (
        [(vertical["field"], "metre")] if vertical else []
    ):
        field = fields.get(name)
        if (
            not field
            or field["dataType"] not in {"integer", "number"}
            or field.get("unit") != expected
        ):
            raise ValueError(
                "Spatial field is undeclared, non-numeric or has incompatible units"
            )
    if vertical and vertical["field"] in names:
        raise ValueError("Vertical and horizontal fields must be distinct")
    extent = [Decimal(value) for value in spatial["extent"]]
    if (
        any(not value.is_finite() for value in extent)
        or extent[0] > extent[2]
        or extent[1] > extent[3]
    ):
        raise ValueError(
            "Spatial extent must be finite and ordered; antimeridian wrapping is not supported"
        )
    if domains and any(
        not low <= extent[i] <= extent[i + 2] <= high
        for i, (low, high) in enumerate(domains)
    ):
        raise ValueError("Spatial angular extent is outside the declared axes")
    return spatial


def inspect_coordinates(spatial, values, row):
    if not spatial:
        return 0
    names = spatial["coordinateFields"]
    present = [name in values for name in names]
    if present[0] != present[1]:
        raise ValueError(f"Observation {row} has a partial coordinate pair")
    if not any(present):
        return 1
    extent = [Decimal(value) for value in spatial["extent"]]
    if any(
        not extent[i] <= values[name] <= extent[i + 2] for i, name in enumerate(names)
    ):
        raise ValueError(f"Observation {row} is outside its declared spatial extent")
    return 0


def parsed_value(value, kind):
    if not value:
        raise ValueError("Blank value requires a declared state")
    if kind == "datetime":
        return datetime_instant(value)
    if kind == "string":
        return value
    if kind == "integer" and re.fullmatch(r"[+-]?[0-9]+", value):
        return Decimal(value)
    if kind == "number" and re.fullmatch(
        r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?", value
    ):
        return Decimal(value)
    if kind == "boolean" and value in {"true", "false"}:
        return value == "true"
    if kind == "date" and re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        return date.fromisoformat(value)
    raise ValueError(f"Expected {kind}")


def field_states(field):
    states = {}
    for entry in field.get("valueStates", []):
        token = entry["token"]
        if token in states:
            raise ValueError(f"Duplicate state token for {field['name']}")
        if field["dataType"] != "string":
            try:
                parsed_value(token, field["dataType"])
            except (ValueError, InvalidOperation):
                pass
            else:
                raise ValueError(
                    f"State token shadows a typed value for {field['name']}"
                )
        states[token] = entry["state"]
    for token in field.get("allowedValues", []):
        if token in states:
            raise ValueError(f"Controlled value overlaps a state for {field['name']}")
        parsed_value(token, field["dataType"])
    return states


def inspect_table(table, body):
    spatial = spatial_rules(table)
    fields = table["fields"]
    headers = [field["name"] for field in fields]
    if len(set(headers)) != len(headers):
        raise ValueError("Duplicate field declaration")
    keys = table["observationKey"]
    dimensions = {field["name"] for field in fields if field["role"] == "dimension"}
    if not set(keys) <= dimensions:
        raise ValueError("Observation key must reference declared dimensions")

    reader = csv.reader(io.StringIO(body.decode("utf-8-sig"), newline=""), strict=True)
    if next(reader, None) != headers:
        raise ValueError("CSV header differs from the ordered field declarations")
    rules = [
        (field, field_states(field), set(field.get("allowedValues", [])))
        for field in fields
    ]
    seen = set()
    counts = Counter()
    zeroes = 0
    rows = 0
    missing_coordinates = 0
    for rows, row in enumerate(reader, 1):
        if rows > MAX_ROWS:
            raise ArtifactReadError("Local validator row limit exceeded")
        if len(row) != len(fields):
            raise ValueError(f"Observation {rows} has the wrong column count")
        key_values = {}
        typed_values = {}
        for value, (field, states, allowed) in zip(row, rules, strict=True):
            name = field["name"]
            try:
                if value in states:
                    if name in keys:
                        raise ValueError("Observation key has a special value")
                    counts[states[value]] += 1
                    continue
                parsed = parsed_value(value, field["dataType"])
                typed_values[name] = parsed
                if allowed and value not in allowed:
                    raise ValueError("Value is outside the declared vocabulary")
                if name in keys:
                    key_values[name] = parsed
                if (
                    field["role"] == "measure"
                    and isinstance(parsed, Decimal)
                    and parsed.is_zero()
                ):
                    zeroes += 1
            except (ValueError, InvalidOperation) as error:
                raise ValueError(
                    f"Observation {rows}, field {name}: {error}"
                ) from error
        missing_coordinates += inspect_coordinates(spatial, typed_values, rows)
        key = tuple(key_values[name] for name in keys)
        if key in seen:
            raise ValueError(f"Duplicate observation key at observation {rows}")
        seen.add(key)
    return {
        "rows": rows,
        "valueStates": dict(sorted(counts.items())),
        "trueNumericZeroes": zeroes,
        "spatial": {
            "checked": bool(spatial),
            "missingCoordinatePairs": missing_coordinates,
            "gaps": ["Vertical datum is not recorded"]
            if spatial
            and spatial.get("vertical", {}).get("datumStatus") == "not-recorded"
            else [],
        },
    }


def observed_datetime(value):
    datetime_instant(value)
    return True


def validate_package(root):
    schema_bytes = SCHEMA.read_bytes()
    schema = json.loads(schema_bytes)
    Draft202012Validator.check_schema(schema)
    descriptor_bytes = SCHEMA.with_name("profile.json").read_bytes()
    descriptor = json.loads(descriptor_bytes)
    if (
        descriptor["id"] != PROFILE
        or descriptor["schema"] != SCHEMA.name
        or descriptor["version"] != schema["properties"]["profileVersion"]["const"]
        or descriptor["schemaSha256"] != digest(schema_bytes)
        or descriptor["status"] not in {"candidate", "released"}
    ):
        raise ArtifactReadError("The local profile descriptor differs from its schema")
    manifest_bytes = read_bounded_bytes(local_file(root, MANIFEST))
    manifest = json.loads(
        manifest_bytes.decode("utf-8"),
        object_pairs_hook=unique_object,
        parse_constant=reject_constant,
    )
    formats = FormatChecker()
    formats.checks("credential-free-http")(lambda value: bool(safe_http_url(value)))
    formats.checks("date-time", raises=ValueError)(observed_datetime)
    # The profile carries only local schema definitions. The empty registry blocks remote retrieval.
    validator = Draft202012Validator(
        schema, format_checker=formats, registry=Registry()
    )
    error = next(validator.iter_errors(manifest), None)
    if error:
        raise ValueError(f"Manifest {error.json_path} failed {error.validator}")
    tables = manifest["tables"]
    paths = [table["path"].casefold() for table in tables]
    if len(set(paths)) != len(paths):
        raise ValueError("Duplicate portable table path")
    results = []
    total_bytes = len(manifest_bytes)
    for table in tables:
        path = table["path"]
        body = read_bounded_bytes(local_file(root, path))
        total_bytes += len(body)
        if total_bytes > MAX_PACKAGE_BYTES:
            raise ArtifactReadError("Local validator package size limit exceeded")
        if digest(body) != table["sha256"]:
            raise ValueError(f"Table digest mismatch: {path}")
        try:
            result = inspect_table(table, body)
        except ArtifactReadError:
            raise
        except (csv.Error, UnicodeError, ValueError, InvalidOperation) as error:
            raise ValueError(f"Table {path}: {error}") from error
        results.append({"path": path, "sha256": table["sha256"], **result})
    dataset = manifest["dataset"]
    return {
        "schema": "okf-analytical-data-validation.v2",
        "status": "passed",
        "validatedProfile": PROFILE,
        "profileVersion": manifest["profileVersion"],
        "profileStatus": descriptor["status"],
        "profileDescriptorSha256": digest(descriptor_bytes),
        "profileSchemaSha256": digest(schema_bytes),
        "validatorSha256": digest(Path(__file__).read_bytes()),
        "pathAndUrlChecksSha256": digest(
            Path(__file__).with_name("reconcile_okf_repositories.py").read_bytes()
        ),
        "toolchainLockSha256": digest((ROOT / "uv.lock").read_bytes()),
        "manifestSha256": digest(manifest_bytes),
        "unevaluatedProfiles": [
            uri for uri in manifest["conformsTo"] if uri != PROFILE
        ],
        "dataset": {
            "id": dataset["id"],
            "version": dataset["version"],
            "scope": dataset["scope"],
        },
        "rightsStatus": dataset["rights"]["status"],
        "tables": results,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "package", type=Path, help="directory containing okf-analytical-data.json"
    )
    args = parser.parse_args()
    try:
        result = validate_package(args.package)
    except (OSError, ArtifactReadError) as error:
        print(f"Analytical Data v2 could not be assessed: {error}", file=sys.stderr)
        return 2
    except (ValueError, InvalidOperation) as error:
        print(f"Analytical Data v2 validation failed: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
