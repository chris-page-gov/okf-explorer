#!/usr/bin/env python3
"""Reproduce the Warwickshire and NDL compatibility trial from pinned snapshots."""

import argparse
import copy
import csv
import hashlib
import io
import json
import re
import tempfile
from decimal import Decimal
from pathlib import Path

from check_analytical_data import MANIFEST, PROFILE, validate_package
from okf_semantic import parse_markdown

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sources/analytical-data-trial-2026-11-11"
OUTPUT = ROOT / "docs/examples/analytical-data-trial"


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def csv_bytes(rows):
    stream = io.StringIO(newline="")
    csv.writer(stream, lineterminator="\n").writerows(rows)
    return stream.getvalue().encode()


def package_result(manifest, data):
    with tempfile.TemporaryDirectory(prefix="okf-analytical-trial-") as folder:
        root = Path(folder)
        (root / MANIFEST).write_bytes(json_bytes(manifest))
        (root / "observations.csv").write_bytes(data)
        return validate_package(root)


def rejected(label, manifest, data):
    try:
        package_result(manifest, data)
    except ValueError as error:
        return {"probe": label, "status": "rejected-as-expected", "reason": str(error)}
    raise ValueError(f"Compatibility probe unexpectedly passed: {label}")


def build():
    register = json.loads((SOURCE / "source-register.json").read_bytes())
    sources = {}
    for entry in register["files"]:
        body = (SOURCE / entry["path"]).read_bytes()
        if (
            len(body) != entry["bytes"]
            or hashlib.sha256(body).hexdigest() != entry["sha256"]
        ):
            raise ValueError(f"Source snapshot changed: {entry['path']}")
        sources[entry["path"]] = entry

    plan = json.loads((SOURCE / "projection.json").read_bytes())
    source = sources["warwickshire-original.csv"]
    reader = csv.reader(io.StringIO((SOURCE / source["path"]).read_text(), newline=""))
    header = next(reader)
    if header != [field["sourceName"] for field in plan["fields"]]:
        raise ValueError("The source header differs from the reviewed projection")
    raw_rows = list(reader)
    if len(raw_rows) != plan["expectedRows"]:
        raise ValueError("The source population differs from the reviewed trial")

    names = [field["declaration"]["name"] for field in plan["fields"]]
    rows = []
    for raw in raw_rows:
        if len(raw) != len(header):
            raise ValueError("Unexpected source row width")
        values = dict(zip(names, raw, strict=True))
        if not re.fullmatch(r"[0-9]{1,3}(?:,[0-9]{3})*", values["total_population"]):
            raise ValueError("Unexpected grouped population count")
        if not re.fullmatch(r"[0-9]+\.[0-9]+%", values["retirement_age_share"]):
            raise ValueError("Unexpected percentage representation")
        values["total_population"] = values["total_population"].replace(",", "")
        values["retirement_age_share"] = values["retirement_age_share"].removesuffix(
            "%"
        )
        rows.append([values[name] for name in names] + [str(plan["referenceYear"])])
    fields = [field["declaration"] for field in plan["fields"]] + [plan["yearField"]]
    data = csv_bytes([names + ["reference_year"], *rows])
    manifest = {
        "conformsTo": [PROFILE],
        "profileVersion": json.loads(
            (ROOT / "profiles/analytical-data/v1/profile.json").read_bytes()
        )["version"],
        "dataset": plan["dataset"],
        "tables": [
            {
                "path": "observations.csv",
                "sha256": hashlib.sha256(data).hexdigest(),
                "source": {"url": source["url"], "observedAt": source["observedAt"]},
                "fields": fields,
                "observationKey": ["soa_code", "reference_year"],
            }
        ],
    }
    receipt = package_result(manifest, data)
    native = copy.deepcopy(manifest)
    native["tables"][0]["fields"] = [
        {**field["declaration"], "name": field["sourceName"]}
        for field in plan["fields"]
    ]
    native["tables"][0]["observationKey"] = [header[0]]
    original = (SOURCE / source["path"]).read_bytes()
    native["tables"][0]["sha256"] = source["sha256"]
    probes = [rejected("publisher CSV with original headers", native, original)]
    header_only = csv_bytes(
        [names + ["reference_year"], *[r + ["2008"] for r in raw_rows]]
    )
    minimal = copy.deepcopy(manifest)
    minimal["tables"][0]["sha256"] = hashlib.sha256(header_only).hexdigest()
    probes.append(
        rejected(
            "renamed headers with original numeric formatting", minimal, header_only
        )
    )
    for label, changed_rows in [
        ("duplicate observation key", rows + [rows[0]]),
        ("undeclared blank measure", [rows[0][:5] + [""] + rows[0][6:], *rows[1:]]),
        (
            "percent sign in numeric measure",
            [rows[0][:6] + ["41.7%"] + rows[0][7:], *rows[1:]],
        ),
    ]:
        changed = csv_bytes([names + ["reference_year"], *changed_rows])
        changed_manifest = copy.deepcopy(manifest)
        changed_manifest["tables"][0]["sha256"] = hashlib.sha256(changed).hexdigest()
        probes.append(rejected(label, changed_manifest, changed))
    probes.append(
        rejected("changed table bytes without a new digest", manifest, data + b"\n")
    )

    package = json.loads((SOURCE / "ndl-package.json").read_bytes())
    if not package["success"] or package["result"]["id"] != plan["ndlRecordId"]:
        raise ValueError("Unexpected NDL record identity")
    record = package["result"]
    resource = next(
        r for r in record["resources"] if r["id"] == plan["ndlCsvResourceId"]
    )
    if resource["url"] != sources["ndl-resource-http.xml.txt"]["url"]:
        raise ValueError("The tested NDL URL differs from the captured record")
    for name in ["ndl-resource-http.xml.txt", "ndl-resource-https.xml.txt"]:
        if (
            sources[name]["status"] != 403
            or b"<Code>AccessDenied</Code>" not in (SOURCE / name).read_bytes()
        ):
            raise ValueError("Unexpected recorded NDL download result")
    probes.append(rejected("NDL metadata used as an analytical manifest", record, data))
    catalogue = {
        "schema": "okf-analytical-catalogue-link-trial.v1",
        "catalogueRecord": {
            "id": record["id"],
            "url": plan["ndlRecordUrl"],
            "title": record["title"],
            "metadataModified": record["metadata_modified"],
            "licence": record["license_url"],
        },
        "distribution": {
            "id": resource["id"],
            "format": resource["format"],
            "accessUrl": resource["url"],
            "downloadResults": [
                sources[n]
                for n in ["ndl-resource-http.xml.txt", "ndl-resource-https.xml.txt"]
            ],
            "analyticalValidation": "unassessed-download-denied",
            "byteEquivalenceWithWarwickshireSnapshot": "not-established",
        },
        "localProposal": {
            "companionManifest": "warwickshire/okf-analytical-data.json",
            "companionManifestSha256": hashlib.sha256(json_bytes(manifest)).hexdigest(),
            "relationship": "candidate companion to the Warwickshire publisher route",
            "sourceSubstitution": False,
        },
        "compatibilityGaps": plan["compatibilityGaps"],
    }
    records = {}
    record_files = {}
    for path in sorted((SOURCE / "records").glob("*.md")):
        doc = parse_markdown(path)
        route = f"records/{path.name}"
        # Authored links resolve from sources; the generated records use their output folder.
        prefix = "../../../docs/examples/analytical-data-trial/"
        record_files[route] = path.read_bytes().replace(prefix.encode(), b"../")
        records[route] = {
            **doc.metadata,
            "id": route,
            "route": route,
            "body": doc.body.replace(prefix, ""),
            "section": "analytical-data-trial",
            "trust_tier": "unverified",
        }
    bundle = {
        "okf_version": "0.2",
        "meta": {
            "title": "Warwickshire analytical data compatibility trial",
            "default_corpus": "analytical-trial",
        },
        "corpora": {
            "analytical-trial": {
                "id": "analytical-trial",
                "title": "Warwickshire analytical data trial",
                "nodes": records,
                "relationships": [],
            }
        },
    }
    result = {
        "schema": "okf-analytical-data-trial.v1",
        "warwickshire": {
            "status": receipt["status"],
            "observations": len(rows),
            "uniqueAreaCodes": len({r[0] for r in rows}),
            "totalPopulationChecksum": sum(int(r[5]) for r in rows),
            "retirementAgePercentageRange": [
                str(min(Decimal(r[6]) for r in rows)),
                str(max(Decimal(r[6]) for r in rows)),
            ],
            "missingCells": sum(value == "" for row in raw_rows for value in row),
            "projection": "renamed headers, removed grouping commas and percent signs, added reference_year=2008; original order, codes and other text retained",
            "rightsStatus": receipt["rightsStatus"],
        },
        "nationalDataLibrary": {
            "recordStatus": "captured-and-cross-checked",
            "distributionStatus": "unassessed-download-denied",
            "recordId": record["id"],
            "licenceConflict": True,
        },
        "compatibilityProbes": probes,
        "inputs": {
            "sourceRegisterSha256": hashlib.sha256(
                (SOURCE / "source-register.json").read_bytes()
            ).hexdigest(),
            "projectionSha256": hashlib.sha256(
                (SOURCE / "projection.json").read_bytes()
            ).hexdigest(),
            "builderSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        },
    }
    return {
        **record_files,
        "warwickshire/observations.csv": data,
        "warwickshire/okf-analytical-data.json": json_bytes(manifest),
        "warwickshire/receipt.json": json_bytes(receipt),
        "ndl-catalogue-link.json": json_bytes(catalogue),
        "reader-bundle.json": json_bytes(bundle),
        "results.json": json_bytes(result),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    outputs = build()
    for name, body in outputs.items():
        path = OUTPUT / name
        if args.check:
            if not path.is_file() or path.read_bytes() != body:
                raise SystemExit(f"Trial output differs: {name}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(body)
    print(
        f"Analytical Data trial {'verified' if args.check else 'built'}: 333 observations, one NDL record, seven rejection probes"
    )


if __name__ == "__main__":
    main()
