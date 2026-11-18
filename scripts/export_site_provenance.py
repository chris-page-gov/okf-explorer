"""Export identity-bound Site assembly, deployment and verification as PROV-O."""

from __future__ import annotations

import argparse
from datetime import datetime
from hashlib import sha256
import json
from pathlib import Path
import re

from rdflib import Graph, Literal, PROV, RDF, URIRef, XSD


REPOSITORY = "https://github.com/chris-page-gov/okf-explorer"
GITHUB_API = "https://api.github.com/repos/chris-page-gov/okf-explorer"
PUBLICATION = "https://chris-page-gov.github.io/okf-explorer/"
DIGEST = re.compile(r"[0-9a-f]{64}")


def artifact(digest: str) -> URIRef:
    if not isinstance(digest, str) or not DIGEST.fullmatch(digest):
        raise ValueError("Invalid SHA-256 in candidate evidence")
    return URIRef(f"urn:okf:sha256:{digest}")


def export_site_provenance(
    receipt_bytes: bytes, identity_bytes: bytes, verification_bytes: bytes | None = None,
    *, deployment_bytes: bytes | None = None,
) -> bytes:
    receipt = json.loads(receipt_bytes)
    identity = json.loads(identity_bytes)
    if (
        receipt.get("schema") != "okf-site-candidate-receipt.v1"
        or identity.get("schema") != "okf-publication-deployment-identity.v1"
    ):
        raise ValueError("Unsupported candidate evidence schema")
    binding = receipt["publication_identity"]
    commit = binding["commit"]
    if (
        not isinstance(commit, str)
        or not re.fullmatch(r"[0-9a-f]{40}", commit)
        or identity["commit"] != commit
        or identity["repository"]["url"] != REPOSITORY
    ):
        raise ValueError("Candidate repository or commit identity does not match")
    if (
        binding["path"] != "okf-publication-identity.json"
        or binding["bytes"] != len(identity_bytes)
        or binding["sha256"] != sha256(identity_bytes).hexdigest()
    ):
        raise ValueError("Candidate receipt does not bind these publication identity bytes")
    contracts = [item for item in identity["materials"] if item["path"] == "okf.publication.json"]
    if len(contracts) != 1:
        raise ValueError("Expected one publication contract in the identity")

    activity = URIRef(f"urn:okf:site-assembly:{sha256(receipt_bytes).hexdigest()}")
    builder = URIRef(f"{REPOSITORY}/blob/{commit}/scripts/build_site.py")
    source = URIRef(f"{REPOSITORY}/commit/{commit}")
    configuration = artifact(contracts[0]["sha256"])
    app = artifact(receipt["explorer"]["manifest_sha256"])
    site = artifact(receipt["site"]["tree_sha256"])
    site_identity = artifact(binding["sha256"])

    graph = Graph()
    graph.add((activity, RDF.type, PROV.Activity))
    graph.add((builder, RDF.type, PROV.SoftwareAgent))
    graph.add((activity, PROV.wasAssociatedWith, builder))
    graph.add((activity, PROV.used, source))
    graph.add((activity, PROV.used, configuration))
    graph.add((activity, PROV.used, app))
    graph.add((site, PROV.wasGeneratedBy, activity))
    graph.add((site_identity, PROV.wasGeneratedBy, activity))
    for entity in (source, configuration, app, site, site_identity):
        graph.add((entity, RDF.type, PROV.Entity))
    if verification_bytes is not None:
        verification, observed_at = add_verification(
            graph, verification_bytes, binding, configuration, site_identity, commit
        )
        if deployment_bytes is not None:
            add_deployment(graph, deployment_bytes, commit, configuration, site, site_identity, verification, observed_at)
    elif deployment_bytes is not None:
        raise ValueError("Deployment provenance requires an exact live verification receipt")
    statements = sorted(graph.serialize(format="nt").splitlines())
    return ("\n".join(statements) + "\n").encode("utf-8")


def add_verification(
    graph: Graph, raw: bytes, binding: dict, configuration: URIRef, site_identity: URIRef, commit: str
) -> tuple[URIRef, datetime]:
    verification = json.loads(raw)
    if not isinstance(verification, dict):
        raise ValueError("Expected a live verification receipt")
    observed = verification.get("deployed_identity", {})
    contract = verification.get("deployed_contract", {})
    browser = verification.get("browser", {})
    if (
        verification.get("schema") != "okf-live-deployment-verification-receipt.v1"
        or verification.get("repository", {}).get("url") != REPOSITORY
        or verification.get("expected_commit") != commit
        or verification.get("candidate_identity") != binding
        or observed.get("commit") != commit
        or observed.get("sha256") != binding["sha256"]
        or artifact(contract.get("sha256")) != configuration
        or verification.get("result") != "passed"
        or browser.get("console_policy") != "no-errors"
        or browser.get("console_errors") != []
        or browser.get("page_errors") != []
    ):
        raise ValueError("Live verification does not match the exact candidate")
    when = datetime.fromisoformat(verification["observed_at"])
    if when.utcoffset() is None:
        raise ValueError("Live verification requires an observation time with a time zone")
    digest = sha256(raw).hexdigest()
    activity = URIRef(f"urn:okf:site-verification:{digest}")
    receipt = artifact(digest)
    verifier = URIRef(f"{REPOSITORY}/blob/{commit}/apps/okf-explorer/scripts/verify_okf_deployment.mjs")
    graph.add((activity, RDF.type, PROV.Activity))
    graph.add((verifier, RDF.type, PROV.SoftwareAgent))
    graph.add((activity, PROV.wasAssociatedWith, verifier))
    graph.add((activity, PROV.used, configuration))
    graph.add((activity, PROV.used, site_identity))
    graph.add((receipt, RDF.type, PROV.Entity))
    graph.add((receipt, PROV.wasGeneratedBy, activity))
    graph.add((receipt, PROV.generatedAtTime, Literal(when, datatype=XSD.dateTime)))
    return activity, when


def add_deployment(
    graph: Graph, raw: bytes, commit: str, configuration: URIRef, site: URIRef,
    site_identity: URIRef, verification: URIRef, observed_at: datetime,
) -> None:
    job = json.loads(raw)
    run_id, job_id = job["run_id"], job["id"]
    if any(type(identifier) is not int or identifier <= 0 for identifier in (run_id, job_id)):
        raise ValueError("Deployment requires positive GitHub run and job identifiers")
    job_url = f"{REPOSITORY}/actions/runs/{run_id}/job/{job_id}"
    expected = {
        "name": "deploy", "workflow_name": "Publish GitHub Pages", "status": "completed",
        "conclusion": "success", "head_sha": commit, "head_branch": "main",
        "html_url": job_url, "run_url": f"{GITHUB_API}/actions/runs/{run_id}",
    }
    steps = [step for step in job["steps"] if step["name"] == "Deploy to GitHub Pages"]
    if any(job.get(key) != value for key, value in expected.items()) or len(steps) != 1:
        raise ValueError("The Pages job does not match the verified deployment")
    step = steps[0]
    start, end = (datetime.fromisoformat(step[key]) for key in ("started_at", "completed_at"))
    if (
        step["conclusion"] != "success"
        or any(time.utcoffset() is None for time in (start, end))
        or not start <= end <= observed_at
    ):
        raise ValueError("The Pages deployment step did not succeed before the live observation")

    activity = URIRef(job_url)
    action = URIRef("https://github.com/actions/deploy-pages")
    workflow = URIRef(f"{REPOSITORY}/blob/{commit}/.github/workflows/pages.yml")
    evidence = artifact(sha256(raw).hexdigest())
    published = URIRef(f"urn:okf:published-site:{commit}")
    graph.add((activity, RDF.type, PROV.Activity))
    graph.add((activity, PROV.startedAtTime, Literal(start, datatype=XSD.dateTime)))
    graph.add((activity, PROV.endedAtTime, Literal(end, datatype=XSD.dateTime)))
    graph.add((action, RDF.type, PROV.SoftwareAgent))
    graph.add((workflow, RDF.type, PROV.Plan))
    graph.add((activity, PROV.wasAssociatedWith, action))
    for entity in (configuration, site, site_identity, workflow):
        graph.add((activity, PROV.used, entity))
    graph.add((evidence, RDF.type, PROV.Entity))
    graph.add((evidence, PROV.wasDerivedFrom, URIRef(f"{GITHUB_API}/actions/jobs/{job_id}")))
    graph.add((published, RDF.type, PROV.Entity))
    graph.add((published, PROV.specializationOf, site))
    graph.add((published, PROV.wasGeneratedBy, activity))
    graph.add((published, PROV.atLocation, URIRef(PUBLICATION)))
    graph.add((verification, PROV.used, published))


def read_evidence(path: Path) -> bytes:
    with path.open("rb") as stream:
        result = stream.read(65_537)
    if len(result) > 65_536:
        raise ValueError(f"Candidate evidence exceeds 64 KiB: {path.name}")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--receipt", type=Path, required=True)
    parser.add_argument("--identity", type=Path, required=True)
    parser.add_argument("--live-verification", type=Path)
    parser.add_argument("--deployment-job", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        verification = read_evidence(args.live_verification) if args.live_verification else None
        deployment = read_evidence(args.deployment_job) if args.deployment_job else None
        content = export_site_provenance(
            read_evidence(args.receipt), read_evidence(args.identity), verification, deployment_bytes=deployment
        )
        with args.output.open("xb") as stream:
            stream.write(content)
    except (AttributeError, KeyError, OSError, TypeError, ValueError) as error:
        parser.exit(2, f"PROV-O export failed: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
