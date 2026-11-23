"""Check every exported core document against the independent OKF 0.3 Reader."""

import json
from pathlib import Path

import build_reference_bundle
from check_okf_03_source import inspect_bundle

ROOT = Path(__file__).resolve().parents[1]


def check() -> dict:
    build_reference_bundle.build(check=True, quiet=True)
    receipt, projection = inspect_bundle(ROOT / "reference-bundle")
    if not receipt["core_conformant"] or not receipt["declares_okf_0_3"] or projection is None:
        raise ValueError(f"reference source check failed: {receipt['errors']}")
    bundle = json.loads((ROOT / "reference-bundle/okf-bundle.json").read_bytes())
    corpus = bundle["corpora"]["ai-infrastructure-wiki"]
    concepts = {key: value for key, value in corpus["nodes"].items() if value["core_role"] == "concept"}
    if set(concepts) != set(projection["nodes"]):
        raise ValueError("published core concept coverage differs from the independent Reader")
    for route, node in concepts.items():
        independent = projection["nodes"][route]
        if node["frontmatter"] != independent["frontmatter"] or node["body"] != independent["body"]:
            raise ValueError(f"published frontmatter or body differs from source: {route}")
    actual = {(r["source"], r["target"]) for r in corpus["relationships"] if r["relationship_role"] == "concept"}
    expected = {(r["source"], r["target"]) for r in projection["edges"]}
    if actual != expected:
        raise ValueError("published core graph differs from independently imported Markdown/path fields")
    return {"schema": "okf-reference-core-parity.v1", "status": "passed",
            "source_check": receipt, "concepts": len(concepts), "core_reference_pairs": len(expected)}


if __name__ == "__main__":
    result = check()
    print(json.dumps(result, indent=2, sort_keys=True))
