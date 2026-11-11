#!/usr/bin/env python3
"""Reproduce the NDL link scope and bounded Warwick Defra API trial offline."""

import argparse
import copy
import gzip
import hashlib
import json
import math
import tempfile
from collections import Counter
from datetime import UTC, datetime
from decimal import Decimal
from itertools import pairwise
from pathlib import Path

from build_analytical_data_trial import csv_bytes, json_bytes
from check_analytical_data import MANIFEST, PROFILE, local_file, validate_package
from reconcile_okf_repositories import read_bounded_bytes

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sources/analytical-data-trial-2026-11-11"
OUTPUT = ROOT / "docs/examples/analytical-live-trial"
LEGACY_HOST = "opendata.s3.amazonaws.com"


def verified_sources(folder):
    register = json.loads((folder / "source-register.json").read_bytes())
    for entry in register["files"]:
        body = read_bounded_bytes(local_file(folder, entry["path"]))
        if (
            len(body) != entry["bytes"]
            or hashlib.sha256(body).hexdigest() != entry["sha256"]
        ):
            raise ValueError(f"Source snapshot changed: {entry['path']}")
    return register


def summarise_hosts(rows, ledger):
    identities = set()
    page_counts = Counter()
    resource_count = 0
    empty_records = 0
    malformed = 0
    matches = set()
    publishers = Counter()
    for row in rows:
        if row["id"] in identities:
            raise ValueError("Repeated dataset identity in the national inventory")
        identities.add(row["id"])
        page_counts[row["sourcePageSha256"]] += 1
        resources = row["resources"]
        resource_count += len(resources)
        empty_records += not resources
        matched = False
        for resource_id, host, _scheme, state in resources:
            malformed += state == "malformed-url"
            if host == LEGACY_HOST:
                matches.add((row["id"], resource_id))
                matched = True
        if matched:
            publishers[row["publisher"] or "not-recorded"] += 1
    expected_pages = {page["responseSha256"]: page["rows"] for page in ledger["pages"]}
    if (
        dict(page_counts) != expected_pages
        or len(identities) != ledger["reportedCount"]
    ):
        raise ValueError("The national inventory differs from its page ledger")
    return {
        "datasetRecords": len(identities),
        "resourceOccurrences": resource_count,
        "recordsWithoutResourceEntries": empty_records,
        "malformedUrlParserObservations": malformed,
        "exactHostDatasetRecords": sum(publishers.values()),
        "exactHostResourceOccurrences": len(matches),
        "exactHostPublishers": dict(sorted(publishers.items())),
    }, matches


def build_link_scope():
    folder = SOURCE / "ndl-link-audit"
    verified_sources(folder)
    ledger = json.loads((folder / "national-index-ledger.json").read_bytes())
    with gzip.open(folder / "national-resource-hosts.jsonl.gz", "rb") as stream:
        body = stream.read(128 * 1024 * 1024 + 1)
    if len(body) > 128 * 1024 * 1024:
        raise ValueError("National inventory decompression limit exceeded")
    national, pairs = summarise_hosts(
        (json.loads(line) for line in body.splitlines()), ledger
    )
    matches = json.loads((folder / "national-host-matches.json").read_bytes())
    witnessed = {
        (row["id"], resource["id"]) for row in matches for resource in row["resources"]
    }
    if pairs != witnessed:
        raise ValueError("The exact-host witnesses differ from the complete inventory")
    control = json.loads((folder / "indexed-host-query-control.body").read_bytes())
    recheck = json.loads((folder / "indexed-host-query-recheck.json").read_bytes())
    if (
        recheck["receipt"]["method"] != "GET"
        or recheck["receipt"]["hops"][-1]["status"] != 200
        or recheck["returnedCount"] != control["result"]["count"]
        or recheck["receipt"]["hops"][-1]["sha256"]
        != hashlib.sha256(
            (folder / "indexed-host-query-control.body").read_bytes()
        ).hexdigest()
    ):
        raise ValueError("The indexed-query recheck differs from its retained body")
    national.update(
        exactHost=LEGACY_HOST,
        atomicSnapshot=False,
        captureStartedAt=ledger["pages"][0]["startedAt"],
        captureCompletedAt=ledger["pages"][-1]["completedAt"],
        indexedHostQueryCount=control["result"]["count"],
        indexedHostQueryRecheckedAt=recheck["receipt"]["completedAt"],
        indexedHostQueryPositiveControl="failed"
        if pairs and not control["result"]["count"]
        else "needs-review",
        otherHostLinkHealth="unassessed",
    )
    probes = json.loads((folder / "wcc-probes.json").read_bytes())
    metadata = json.loads((folder / "wcc-metadata.body").read_bytes())["result"]
    metadata_rows = [
        (d["id"], r["id"]) for d in metadata["results"] for r in d.get("resources", [])
    ]
    probe_rows = [(r["datasetId"], r["resourceId"]) for r in probes["resources"]]
    if (
        metadata["count"] != len(metadata["results"])
        or len(metadata_rows) != len(set(metadata_rows))
        or len(probe_rows) != len(set(probe_rows))
        or set(metadata_rows) != set(probe_rows)
    ):
        raise ValueError("WCC resource probes omit or duplicate a metadata occurrence")
    legacy_pairs = {
        (r["datasetId"], r["resourceId"])
        for r in probes["resources"]
        if r.get("legacyHost")
    }
    if legacy_pairs != pairs:
        raise ValueError("National and publisher legacy-host resource witnesses differ")
    originals = Counter()
    candidates = Counter()
    affected = set()
    absent = []
    rows = [
        [
            "dataset_id",
            "resource_id",
            "format",
            "stored_url",
            "stored_http_status",
            "candidate_url",
            "candidate_http_status",
            "content_type",
            "object_bytes",
            "full_object_inspected",
            "publisher_approval",
            "legacy_byte_equivalence",
        ]
    ]
    for resource in probes["resources"]:
        original = probes["requests"][resource["url"]]
        if original["method"] != "GET":
            raise ValueError("The audit contains a mutating method")
        final = original["hops"][-1] if original["hops"] else {}
        originals[str(final.get("status", "unassessed"))] += 1
        candidate_url = resource.get("candidateUrl", "")
        candidate = probes["requests"].get(candidate_url, {})
        response = candidate.get("hops", [{}])[-1]
        inspection = candidate.get("inspection", {})
        if resource.get("legacyHost"):
            affected.add(resource["datasetId"])
            if candidate_url:
                candidates[str(response.get("status", "unassessed"))] += 1
            else:
                absent.append(
                    {
                        k: resource[k]
                        for k in (
                            "datasetId",
                            "resourceId",
                            "candidatePath",
                            "declaredFormat",
                        )
                    }
                )
        rows.append(
            [
                resource["datasetId"],
                resource["resourceId"],
                resource["declaredFormat"],
                resource["url"],
                final.get("status", ""),
                candidate_url,
                response.get("status", ""),
                response.get("headers", {}).get("content-type", ""),
                inspection.get("objectBytes", ""),
                inspection.get("completeObjectRetainedLocally", ""),
                "pending",
                "unverified",
            ]
        )
    wcc = {
        "datasetRecords": metadata["count"],
        "resourceOccurrences": len(probes["resources"]),
        "recordsWithoutResourceEntries": len(probes["datasetsWithoutResources"]),
        "legacyHostDatasetRecords": len(affected),
        "legacyHostResourceOccurrences": sum(
            bool(r.get("legacyHost")) for r in probes["resources"]
        ),
        "storedResourceStatusOccurrences": dict(originals),
        "exactGitPathCandidateStatusOccurrences": dict(candidates),
        "candidatePathsAbsentFromPublisherTree": absent,
        "publisherGitCommit": probes["githubCommit"],
        "publisherApproval": "pending",
        "historicalS3ByteEquivalence": "unverified",
        "rangeRequestBytes": probes["rangeBytesRequested"],
        "resourceTimeoutSeconds": probes["requestTimeoutSeconds"],
        "interpretation": "HTTP observations and candidate-path checks. Empty resource arrays and responses from other protocols need their own assessment.",
    }
    return {
        "ndl-national-host-scope.json": json_bytes(national),
        "wcc-link-scope.json": json_bytes(wcc),
        "wcc-resource-results.csv": csv_bytes(rows),
    }


def check_paging(reference, pages, limit):
    if not pages or pages[-1]["items"]:
        raise ValueError("Pagination lacks an empty terminal page")
    expected = {row["@id"] for row in reference["items"]}
    observed = set()
    offset = 0
    sizes = []
    for page in pages:
        rows = page["items"]
        meta = page["meta"]
        if (
            meta.get("offset") != offset
            or meta.get("limit") != limit
            or len(rows) > limit
        ):
            raise ValueError("Pagination offset or limit differs from the request")
        ids = [row["@id"] for row in rows]
        if len(set(ids)) != len(ids) or observed.intersection(ids):
            raise ValueError("Pagination repeats a resource identity")
        observed.update(ids)
        offset += len(rows)
        sizes.append(len(rows))
    if observed != expected or len(reference["items"]) != len(expected):
        raise ValueError("Paginated identity set differs from the bounded reference")
    return {
        "pageSizes": sizes,
        "uniqueItems": len(observed),
        "emptyTerminalPage": True,
        "referenceSetMatches": True,
    }


def instant(value):
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Observation timestamp requires an explicit timezone")
    return parsed.astimezone(UTC)


def check_times(rows, day):
    seen = set()
    values = []
    for row in rows:
        timestamp = instant(row["dateTime"])
        if timestamp.date().isoformat() != day:
            raise ValueError("Reading falls outside the requested UTC day")
        identity = (row["measure"], timestamp)
        if identity in seen:
            raise ValueError("Duplicate observation instant for a measure")
        seen.add(identity)
        values.append(timestamp)
    if not values:
        raise ValueError("The requested reading day has no observations")
    ordered = sorted(values)
    return {
        "observations": len(values),
        "minimumUtc": ordered[0].isoformat(),
        "maximumUtc": ordered[-1].isoformat(),
        "intervalSecondsObserved": sorted(
            {int((b - a).total_seconds()) for a, b in pairwise(ordered)}
        ),
        "validation": "supplementary adapter check; original dateTime strings retained",
    }


def check_spatial(rows, latitude, longitude, radius):
    distances = []
    for row in rows:
        lat, lon = float(row["lat"]), float(row["long"])
        if not -90 <= lat <= 90 or not -180 <= lon <= 180:
            raise ValueError("Geographic coordinate outside valid degree bounds")
        a, b = math.radians(latitude), math.radians(lat)
        delta_lat, delta_lon = (
            math.radians(lat - latitude),
            math.radians(lon - longitude),
        )
        arc = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(a) * math.cos(b) * math.sin(delta_lon / 2) ** 2
        )
        distance = 6371 * 2 * math.asin(math.sqrt(min(1, max(0, arc))))
        if distance > radius + 0.05:
            raise ValueError("Station falls outside the declared trial circle")
        distances.append(distance)
    return {
        "coordinatePairs": len(distances),
        "maximumDistanceKm": round(max(distances), 6),
        "geographicCoordinates": "publisher-documented WGS84 latitude and longitude fields",
        "projectedCoordinates": "publisher-documented British National Grid easting and northing fields",
        "explicitCrsIdentifierInPayload": False,
        "administrativeCountyClip": "unassessed; the fixture is a 5 km circle centred on the named Warwick station",
        "coordinateAccuracyAndReprojection": "unassessed",
    }


def validate_tables(manifest, tables):
    with tempfile.TemporaryDirectory(prefix="analytical-api-package-") as folder:
        root = Path(folder)
        (root / MANIFEST).write_bytes(json_bytes(manifest))
        for name, body in tables.items():
            (root / name).write_bytes(body)
        return validate_package(root)


def build_api_trial():
    folder = SOURCE / "live-defra-api"
    verified_sources(folder)
    plan = json.loads((folder / "capture-plan.json").read_bytes())
    payloads = {}
    receipts = {}
    for capture in plan["captures"]:
        receipt = capture["receipt"]
        hop = receipt["hops"][-1]
        if receipt["method"] != "GET" or hop["status"] != 200 or hop["curlExit"]:
            raise ValueError("API capture has an unsuccessful or mutating request")
        payloads[capture["name"]] = json.loads(
            (folder / hop["bodyPath"]).read_bytes(), parse_float=Decimal
        )
        receipts[capture["name"]] = receipt
    stations = payloads["stations-reference"]
    readings = payloads["readings-reference"]
    station_pages = [v for k, v in payloads.items() if k.startswith("stations-page-")]
    reading_pages = [v for k, v in payloads.items() if k.startswith("readings-page-")]
    paging = {
        "stations": check_paging(stations, station_pages, 2),
        "readings": check_paging(readings, reading_pages, 37),
    }
    temporal = check_times(readings["items"], plan["readingDate"])
    since = instant(plan["readingDate"] + "T12:00:00Z")
    expected_since = {
        r["@id"] for r in readings["items"] if instant(r["dateTime"]) > since
    }
    if expected_since != {
        r["@id"] for r in payloads["readings-since-control"]["items"]
    }:
        raise ValueError("The since filter differs from the strict timestamp predicate")
    temporal["sinceNoonUtcItems"] = len(expected_since)
    query = plan["stationQuery"]
    spatial = check_spatial(
        stations["items"],
        float(query["lat"]),
        float(query["long"]),
        float(query["dist"]),
    )
    station = next(
        row
        for row in stations["items"]
        if row["stationReference"] == plan["stationReference"]
    )
    if station["label"] != "Warwick" or station.get("town") != "Warwick":
        raise ValueError("The named Warwick locality witness changed")
    measure = next(row for row in station["measures"] if row["@id"] == plan["measure"])
    if {row["measure"] for row in readings["items"]} != {plan["measure"]}:
        raise ValueError("Readings do not share the selected measure and unit context")

    station_names = [
        "station_id",
        "station_reference",
        "label",
        "latitude",
        "longitude",
        "easting",
        "northing",
        "town",
    ]
    station_keys = [
        "@id",
        "stationReference",
        "label",
        "lat",
        "long",
        "easting",
        "northing",
        "town",
    ]
    station_rows = [
        ["" if row.get(key) is None else str(row[key]) for key in station_keys]
        for row in stations["items"]
    ]
    reading_names = [
        "reading_id",
        "measure_id",
        "date_time",
        "value",
        "unit_name",
        "qualifier",
    ]
    reading_rows = [
        [
            row["@id"],
            row["measure"],
            row["dateTime"],
            str(row["value"]),
            measure["unitName"],
            measure["qualifier"],
        ]
        for row in readings["items"]
    ]
    tables = {
        "stations.csv": csv_bytes([station_names, *station_rows]),
        "readings.csv": csv_bytes([reading_names, *reading_rows]),
    }
    station_fields = []
    station_specs = [
        ("station_id", "Station resource URI", "dimension", "string"),
        ("station_reference", "Station reference", "attribute", "string"),
        ("label", "Station label", "attribute", "string"),
        ("latitude", "Latitude in WGS84", "attribute", "number"),
        ("longitude", "Longitude in WGS84", "attribute", "number"),
        ("easting", "Easting on British National Grid", "attribute", "integer"),
        ("northing", "Northing on British National Grid", "attribute", "integer"),
        ("town", "Town where supplied", "attribute", "string"),
    ]
    for name, label, role, kind in station_specs:
        field = {"name": name, "label": label, "role": role, "dataType": kind}
        if name != "station_id":
            field["valueStates"] = [{"token": "", "state": "missing"}]
        station_fields.append(field)
    reading_specs = [
        ("reading_id", "Reading resource URI", "attribute", "string"),
        ("measure_id", "Measure resource URI", "dimension", "string"),
        (
            "date_time",
            "Observation timestamp with original timezone",
            "dimension",
            "string",
        ),
        ("value", "Observed water level", "measure", "number"),
        ("unit_name", "Publisher unit notation", "attribute", "string"),
        ("qualifier", "Publisher measurement qualifier", "attribute", "string"),
    ]
    reading_fields = [
        {"name": name, "label": label, "role": role, "dataType": kind}
        for name, label, role, kind in reading_specs
    ]
    reading_fields[3]["unit"] = measure["unitName"]
    profile = json.loads(
        (ROOT / "profiles/analytical-data/v1/profile.json").read_bytes()
    )
    manifest = {
        "conformsTo": [PROFILE],
        "profileVersion": profile["version"],
        "dataset": {
            "id": "https://chris-page-gov.github.io/okf-explorer/docs/examples/analytical-live-trial/defra/",
            "version": "warwick-"
            + plan["readingDate"]
            + "-captured-"
            + plan["captures"][-1]["receipt"]["completedAt"],
            "title": "Local projection of Warwick station metadata and one UTC day of readings",
            "scope": "real-world",
            "rights": {
                "status": "declared",
                "source": readings["meta"]["documentation"],
                "licence": readings["meta"]["licence"],
            },
        },
        "tables": [],
    }
    for name, source_name, fields, key in [
        ("stations.csv", "stations-reference", station_fields, ["station_id"]),
        (
            "readings.csv",
            "readings-reference",
            reading_fields,
            ["measure_id", "date_time"],
        ),
    ]:
        receipt = receipts[source_name]
        manifest["tables"].append(
            {
                "path": name,
                "sha256": hashlib.sha256(tables[name]).hexdigest(),
                "source": {
                    "url": receipt["requestUrl"],
                    "observedAt": receipt["completedAt"],
                    "contract": readings["meta"]["documentation"],
                },
                "observationKey": key,
                "fields": fields,
            }
        )
    receipt = validate_tables(manifest, tables)
    date_manifest = copy.deepcopy(manifest)
    date_manifest["tables"][1]["fields"][2]["dataType"] = "date"
    try:
        validate_tables(date_manifest, tables)
    except ValueError as error:
        date_probe = {"status": "rejected-as-expected", "reason": str(error)}
    else:
        raise ValueError("Datetime content unexpectedly passed the date-only type")
    result = {
        "schema": "okf-defra-api-trial.v1",
        "scope": "frozen read-only GET observations and local analytical projection",
        "serviceVersion": readings["meta"]["version"],
        "readingDate": plan["readingDate"],
        "paging": paging,
        "timestamps": temporal,
        "spatial": spatial,
        "measure": {
            "id": plan["measure"],
            "unitName": measure["unitName"],
            "qualifier": measure["qualifier"],
            "periodSeconds": measure["period"],
        },
        "dateOnlyTypeProbe": date_probe,
        "gaps": [
            "Datetime is a string in RC.1; timezone and instant checks are supplementary.",
            "Spatial CRS meaning comes from publisher documentation; the payload has no explicit CRS identifier.",
            "The circle establishes a Warwick locality fixture; county completeness, reprojection and coordinate accuracy are unassessed.",
            "One day's successful paging and cadence observations provide bounded point-in-time evidence.",
            "Unit and vertical qualifier are retained as mASD and Stage; no vertical datum conversion is inferred.",
        ],
        "attribution": "this uses Environment Agency flood and river level data from the real-time data API (Beta)",
        "localDerivation": "JSON metadata and readings projected to two CSVs; source URIs, coordinate literals, timestamp strings and numeric decimal values retained.",
        "stationFieldMapping": dict(zip(station_names, station_keys, strict=True)),
        "releaseIdentity": "Local snapshot release uses the reading day and capture completion. API version 0.9 is a separate service declaration.",
    }
    return {
        "defra/" + name: body
        for name, body in {
            **tables,
            MANIFEST: json_bytes(manifest),
            "receipt.json": json_bytes(receipt),
            "results.json": json_bytes(result),
        }.items()
    }


def build():
    outputs = {**build_link_scope(), **build_api_trial()}
    inputs = [
        SOURCE / "ndl-link-audit/source-register.json",
        SOURCE / "live-defra-api/source-register.json",
        SOURCE / "defra-learning/flood-api-reference.html.txt",
        ROOT / "profiles/analytical-data/v1/profile.json",
        ROOT / "profiles/analytical-data/v1/package.schema.json",
        Path(__file__),
    ]
    outputs["reproduction-receipt.json"] = json_bytes(
        {
            "schema": "okf-analytical-live-reproduction.v1",
            "inputSha256": {
                str(path.relative_to(ROOT)): hashlib.sha256(
                    path.read_bytes()
                ).hexdigest()
                for path in inputs
            },
            "outputSha256": {
                name: hashlib.sha256(body).hexdigest() for name, body in outputs.items()
            },
            "networkDuringBuild": False,
        }
    )
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    outputs = build()
    for name, body in outputs.items():
        path = OUTPUT / name
        if args.check:
            if not path.is_file() or path.read_bytes() != body:
                raise SystemExit(f"Live-trial output differs: {name}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
    print(
        f"Analytical live trial {'verified' if args.check else 'built'} from pinned read-only captures"
    )


if __name__ == "__main__":
    main()
