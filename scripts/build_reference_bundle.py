"""Export Explorer's declared Markdown corpus as one bounded, independent bundle."""

import argparse
from hashlib import sha256
from html import escape
import json
from pathlib import Path
from urllib.parse import quote

import build_okf_bundle
from build_reference_walkthrough import render_walkthrough, source_bytes
import update_viewer

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "reference-bundle"


def desired_files() -> dict[str, bytes]:
    bundle, errors = build_okf_bundle.build_bundle()
    if errors:
        raise ValueError("\n".join(errors))
    semantic, errors = build_okf_bundle.build_semantic_document(bundle)
    if errors:
        raise ValueError("\n".join(errors))
    yaml_ld, json_ld = build_okf_bundle.render_semantic_outputs(semantic)
    files = {update_viewer.rel(path): source_bytes(update_viewer.rel(path), ROOT)
             for path in update_viewer.iter_okf_markdown()}
    files.update({"okf-bundle.json": build_okf_bundle.render_bundle(bundle).encode(),
                  "okf-bundle.yamlld": yaml_ld.encode(), "okf-bundle.jsonld": json_ld.encode()})
    for name in ("walkthrough.md", "walkthrough.case.json", "LICENSE.md"):
        files[name] = source_bytes(name, ROOT)
    files.update({name: text.encode() for name, text in render_walkthrough(bundle).items()})
    nodes = bundle["corpora"]["ai-infrastructure-wiki"]["nodes"]
    case = json.loads(files["walkthrough.case.json"])
    journeys = []
    for lane, trail in enumerate(case["trails"]):
        for step, (source, target) in enumerate(zip(trail["routes"], trail["routes"][1:])):
            selector = f'svg.graph [data-route="{target}"] circle'
            journeys.append({"id": f"source-trail-{lane + 1}-{step + 1}", "actions": [
                {"type": "goto", "hash": "#" + source, "params": {"view": "graph"}},
                {"type": "wait_for", "selector": selector},
                {"type": "click", "selector": selector},
                {"type": "wait_for", "selector": f'.right-panel h2:text-is({json.dumps(nodes[target]["title"])})'}],
                "assertions": [{"type": "text", "selector": ".right-panel", "includes": nodes[target]["title"]},
                               {"type": "console_clean"}]})
    for term, route in [("Context Hub", "frameworks/context-hub.md"),
                        ("NCSC", "uk-government/ncsc-secure-ai.md")]:
        journeys.append({"id": "search-" + route.removesuffix(".md").replace("/", "-"), "actions": [
            {"type": "goto", "hash": "#standards/mcp.md"},
            {"type": "wait_for", "selector": '.right-panel h2:text-is("Model Context Protocol (MCP)")'},
            {"type": "fill", "selector": '.left-panel .search-input', "value": term},
            {"type": "click", "selector": '[role="tab"]:text-is("Results")'},
            {"type": "click", "selector": f'.result-open:has(h2:text-is({json.dumps(nodes[route]["title"])}))'}],
            "assertions": [{"type": "text", "selector": ".right-panel", "includes": nodes[route]["title"]},
                           {"type": "console_clean"}]})
    journeys.append({"id": "inspect-mcp-frontmatter", "actions": [
        {"type": "goto", "hash": "#standards/mcp.md"},
        {"type": "click", "selector": '.right-panel [role="tab"]:text-is("Data")'},
        {"type": "click", "selector": '.json-panel summary:text-is("Node JSON and provenance")'}],
        "assertions": [{"type": "text", "selector": ".json-panel", "includes": '"frontmatter"'},
                       {"type": "text", "selector": ".json-panel", "includes": '"generated"'},
                       {"type": "attribute", "selector": '.right-panel [data-trust-tier]', "name": "data-trust-tier", "equals": "unverified"},
                       {"type": "console_clean"}]})
    files["walkthrough.explorer-journeys.json"] = (json.dumps({"schema": "okf-explorer-journeys.v1",
        "bundle_descriptor": "okf-bundle.json", "expected_identity": {"schema": bundle["schema"],
            "id": bundle["bundle_id"], "version": bundle["version"], "snapshot": bundle["snapshot"]},
        "journeys": journeys}, indent=2) + "\n").encode()
    descriptor = build_okf_bundle.PUBLIC_BASE + "reference-bundle/okf-bundle.json"
    explorer = build_okf_bundle.PUBLIC_BASE + "explore/?bundle=" + quote(descriptor, safe="")
    files["index.html"] = (
        '<!doctype html><html lang="en-GB"><meta charset="utf-8"><link rel="icon" href="data:,">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Explorer reference bundle</title><main><h1>Explorer reference bundle</h1>'
        '<p>Core OKF 0.3 with the Bundle Wiki v2 implementation profile. '
        'The Markdown is authoritative; the graph and Reader descriptor are generated projections.</p>'
        f'<p><a href="{escape(explorer, quote=True)}">Open in OKF Explorer</a></p>'
        '<p><a href="walkthrough.html">Follow the council tool-access question</a></p>'
        '<p><a href="index.md">Read the Markdown index</a> · '
        '<a href="okf-bundle.jsonld">Read the graph</a> · '
        '<a href="checksums.json">Check the file digests</a></p>'
        '<p>Reading this publication does not grant tool permissions or establish security assurance.</p>'
        '</main></html>\n'
    ).encode()
    inventory = {"schema": "okf-reference-bundle-manifest.v1", "okf_version": "0.3",
                 "bundle_id": bundle["bundle_id"], "snapshot": bundle["snapshot"],
                 "profile": build_okf_bundle.PROFILE_URL,
                 "source_boundary": "Exact paths enumerated by scripts/update_viewer.py; other repository bundles and frozen fixtures are separate publications.",
                 "counts": {role: sum(n["core_role"] == role for n in nodes.values())
                            for role in ("concept", "navigation")},
                 "source_markdown": sorted(update_viewer.rel(path) for path in update_viewer.iter_okf_markdown())}
    files["bundle-manifest.json"] = (json.dumps(inventory, indent=2, sort_keys=True) + "\n").encode()
    files["checksums.json"] = (json.dumps({"schema": "okf-file-checksums.v1", "files": {
        name: {"bytes": len(data), "sha256": sha256(data).hexdigest()}
        for name, data in sorted(files.items())}}, indent=2, sort_keys=True) + "\n").encode()
    if len(files) > 1000 or sum(map(len, files.values())) > 32 * 1024 * 1024:
        raise ValueError("reference bundle exceeds its declared export budget")
    return files


def build(*, check: bool = False, quiet: bool = False) -> None:
    files = desired_files()
    if OUTPUT.is_symlink():
        raise ValueError("reference bundle output must not be a symlink")
    existing = set()
    if OUTPUT.exists():
        for path in OUTPUT.rglob("*"):
            if path.is_symlink() or not (path.is_file() or path.is_dir()):
                raise ValueError("reference bundle output contains a non-regular path")
            if path.is_file():
                existing.add(path.relative_to(OUTPUT).as_posix())
    if existing - files.keys():
        raise ValueError("unexpected output files require review; none were removed")
    for relative, content in files.items():
        target = OUTPUT / relative
        if check:
            if not target.is_file() or target.read_bytes() != content:
                raise ValueError(f"reference bundle is out of date: {relative}")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    if not quiet:
        print(f"Reference bundle {'checked' if check else 'built'}: {len(files)} files")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    build(check=parser.parse_args().check)
