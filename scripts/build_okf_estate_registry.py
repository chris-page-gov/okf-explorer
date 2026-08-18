#!/usr/bin/env python3
"""Validate and build the operational OKF estate registry projection."""

from __future__ import annotations

import argparse
import difflib
import html
import json
import posixpath
import sys
from pathlib import Path
from typing import Any, Mapping

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
from ruamel.yaml import YAML

import okf_semantic
from okf_publication import PublicationContractError, load_publication_contract


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "registry" / "okf-estate-registry.yaml"
OUTPUT = ROOT / "okf-estate-registry.json"
PROFILE_ROOT = ROOT / "profiles" / "publication-method" / "v1"
SCHEMA_PATHS = (
    PROFILE_ROOT / "estate-registry.schema.json",
    PROFILE_ROOT / "repository-publication.schema.json",
    PROFILE_ROOT / "source-family.schema.json",
)
SEMANTIC_REGISTRY = ROOT / "registry" / "okf-registry.yamlld"
SOURCE_URL = (
    "https://github.com/chris-page-gov/okf-explorer/blob/main/"
    "registry/okf-estate-registry.yaml"
)


class EstateRegistryError(ValueError):
    """Raised when the estate registry cannot be published safely."""


def load_yaml(path: Path) -> dict[str, Any]:
    try:
        value = YAML(typ="safe").load(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise EstateRegistryError(f"could not read {path}: {error}") from error
    except Exception as error:
        raise EstateRegistryError(f"invalid YAML in {path}: {error}") from error
    if not isinstance(value, dict):
        raise EstateRegistryError(f"{path} must contain one mapping")
    return value


def _schema_validator() -> Draft202012Validator:
    schemas: list[dict[str, Any]] = []
    registry = Registry()
    for path in SCHEMA_PATHS:
        try:
            schema = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise EstateRegistryError(f"could not load schema {path}: {error}") from error
        if not isinstance(schema, dict) or not isinstance(schema.get("$id"), str):
            raise EstateRegistryError(f"schema has no absolute $id: {path}")
        Draft202012Validator.check_schema(schema)
        schemas.append(schema)
        registry = registry.with_resource(
            schema["$id"], Resource.from_contents(schema)
        )
    return Draft202012Validator(
        schemas[0], registry=registry, format_checker=FormatChecker()
    )


def _json_path(parts: list[object]) -> str:
    rendered = "$"
    for part in parts:
        rendered += f"[{part}]" if isinstance(part, int) else f".{part}"
    return rendered


def semantic_bundle_ids() -> set[str]:
    document = okf_semantic.load_yaml_ld(SEMANTIC_REGISTRY)
    if not isinstance(document, dict):
        raise EstateRegistryError("semantic bundle registry must be a mapping")
    values: set[str] = set()
    for bundle in document.get("bundles", []):
        if isinstance(bundle, dict) and isinstance(bundle.get("@id"), str):
            values.add(bundle["@id"])
    return values


def integrity_errors(registry: Mapping[str, Any]) -> list[str]:
    """Return cross-registry and locally verifiable binding errors."""

    errors: list[str] = []
    entries = registry["repositories"]
    identifiers: set[str] = set()
    names: set[str] = set()
    known_bundles = semantic_bundle_ids()
    for index, entry in enumerate(entries):
        prefix = f"repositories[{index}]"
        identifier = entry["id"]
        name = entry["name"]
        if identifier in identifiers:
            errors.append(f"{prefix}.id duplicates {identifier}")
        identifiers.add(identifier)
        folded = name.casefold()
        if folded in names:
            errors.append(f"{prefix}.name duplicates {name} case-insensitively")
        names.add(folded)
        for bundle_id in entry["public_bundle_ids"]:
            if bundle_id not in known_bundles:
                errors.append(
                    f"{prefix}.public_bundle_ids references an unknown semantic bundle: "
                    f"{bundle_id}"
                )

        if name != "okf-explorer":
            continue
        binding = entry["publication_contract"]
        if binding["applicability"] != "applicable":
            errors.append("okf-explorer must have an applicable publication contract")
            continue
        try:
            contract = load_publication_contract(ROOT, Path(binding["path"]))
        except PublicationContractError as error:
            errors.append(f"okf-explorer publication contract is invalid: {error}")
            continue
        if contract["repository"]["name"] != name:
            errors.append("okf-explorer registry and publication contract names differ")
        if contract["repository"]["url"] != entry["repository_url"]:
            errors.append("okf-explorer registry and publication contract URLs differ")

    projection = registry["projections"]["machine_json_path"]
    if projection != OUTPUT.relative_to(ROOT).as_posix():
        errors.append(
            "projections.machine_json_path must identify the generated root projection "
            f"{OUTPUT.relative_to(ROOT)}"
        )
    return errors


def build(source: Path = SOURCE) -> dict[str, Any]:
    registry = load_yaml(source)
    validator = _schema_validator()
    schema_errors = sorted(
        validator.iter_errors(registry),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    if schema_errors:
        messages = [
            f"{_json_path(list(error.absolute_path))}: {error.message}"
            for error in schema_errors
        ]
        raise EstateRegistryError(
            "estate registry schema validation failed:\n- " + "\n- ".join(messages)
        )
    errors = integrity_errors(registry)
    if errors:
        raise EstateRegistryError(
            "estate registry integrity checks failed:\n- " + "\n- ".join(errors)
        )
    return registry


def render_json(registry: Mapping[str, Any]) -> str:
    return json.dumps(registry, ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def _anchor(name: str) -> str:
    return "repository-" + "".join(
        character.lower() if character.isalnum() else "-" for character in name
    ).strip("-")


def _list(items: list[str], *, empty: str = "None recorded") -> str:
    if not items:
        return f"<p class=\"muted\">{html.escape(empty)}</p>"
    return "<ul>" + "".join(f"<li>{html.escape(item)}</li>" for item in items) + "</ul>"


def render_html(registry: Mapping[str, Any]) -> str:
    """Return the accessible, deterministic human registry projection."""

    route = Path(registry["projections"]["human_route"])
    machine = registry["projections"]["machine_json_path"]
    machine_href = posixpath.relpath(machine, start=route.parent.as_posix())
    favicon_href = posixpath.relpath(
        "favicon.svg", start=route.parent.as_posix()
    )
    entries = registry["repositories"]
    backlog = registry["backlog"]
    adoption_counts: dict[str, int] = {}
    for entry in entries:
        state = entry["adoption"]["state"]
        adoption_counts[state] = adoption_counts.get(state, 0) + 1

    cards: list[str] = []
    for entry in entries:
        repository_url = entry["repository_url"]
        repository_heading = html.escape(entry["name"])
        if repository_url:
            repository_heading = (
                f'<a href="{html.escape(repository_url, quote=True)}">'
                f"{repository_heading}</a>"
            )
        binding = entry["publication_contract"]
        if binding["applicability"] == "applicable":
            contract = (
                f"Applicable at <code>{html.escape(binding['path'])}</code>; "
                f"state <strong>{html.escape(entry['contract_state'])}</strong>."
            )
            if binding.get("source_url"):
                contract += (
                    " "
                    f'<a href="{html.escape(binding["source_url"], quote=True)}">'
                    "Open the installed contract</a>."
                )
        else:
            contract = "Not applicable. " + html.escape(binding["rationale"])
        bundles = entry["public_bundle_ids"]
        bundle_markup = (
            "<ul>"
            + "".join(f"<li><code>{html.escape(value)}</code></li>" for value in bundles)
            + "</ul>"
            if bundles
            else '<p class="muted">No semantic bundle registry identifier recorded.</p>'
        )
        audit = entry["audit"]
        observed = audit.get("observed_at", "Not applicable")
        commit = audit.get("commit")
        commit_markup = (
            f"<code>{html.escape(commit[:12])}</code>" if commit else "Not applicable"
        )
        evidence = audit.get("evidence", [])
        evidence_markup = (
            "<ul>"
            + "".join(
                f'<li><a href="{html.escape(value, quote=True)}">Audit evidence</a></li>'
                for value in evidence
            )
            + "</ul>"
            if evidence
            else '<p class="muted">No public evidence link recorded.</p>'
        )
        cards.append(
            f"""
<article class="repository-card" id="{_anchor(entry['name'])}">
  <h2>{repository_heading}</h2>
  <dl>
    <div><dt>Estate role</dt><dd>{html.escape(entry['role'])}</dd></div>
    <div><dt>Adoption</dt><dd>{html.escape(entry['adoption']['state'])} · updated {html.escape(entry['adoption']['updated'])}</dd></div>
    <div><dt>Audit</dt><dd>{html.escape(audit['state'])} · observed {html.escape(observed)} · commit {commit_markup}</dd></div>
  </dl>
  <h3>Publication contract</h3>
  <p>{contract}</p>
  <h3>Semantic bundle identifiers</h3>
  {bundle_markup}
  <h3>Audit warnings</h3>
  {_list(audit['warnings'])}
  <h3>Audit errors</h3>
  {_list(audit['errors'])}
  <h3>Evidence</h3>
  {evidence_markup}
</article>"""
        )

    backlog_rows = "".join(
        "<tr>"
        f"<th scope=\"row\"><code>{html.escape(item['id'])}</code><br>{html.escape(item['title'])}</th>"
        f"<td>{html.escape(item['priority'])}</td>"
        f"<td>{html.escape(item['status'])}</td>"
        f"<td>{html.escape(', '.join(item['repositories']) or 'Estate-wide')}</td>"
        "</tr>"
        for item in backlog
    )
    counts = " · ".join(
        f"{html.escape(state)} {count}"
        for state, count in sorted(adoption_counts.items())
    )
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(registry['title'])}</title>
<link rel="icon" type="image/svg+xml" href="{html.escape(favicon_href, quote=True)}">
<style>
:root {{ color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.55; }}
body {{ margin: 0; background: Canvas; color: CanvasText; }}
main {{ max-width: 74rem; margin: auto; padding: 1.5rem; }}
a {{ color: LinkText; }}
.lede {{ max-width: 70ch; font-size: 1.12rem; }}
.meta, .repository-card, .backlog {{ border: 1px solid GrayText; border-radius: .5rem; padding: 1rem; margin-block: 1rem; }}
.repository-card h2 {{ margin-top: 0; }}
dl div {{ display: grid; grid-template-columns: minmax(8rem, 12rem) 1fr; gap: .75rem; border-top: 1px solid GrayText; padding-block: .45rem; }}
dt {{ font-weight: 700; }} dd {{ margin: 0; }}
.muted {{ color: GrayText; }}
table {{ width: 100%; border-collapse: collapse; }} th, td {{ text-align: left; vertical-align: top; border: 1px solid GrayText; padding: .6rem; }}
@media (max-width: 42rem) {{ dl div {{ grid-template-columns: 1fr; gap: 0; }} .backlog {{ overflow-x: auto; }} }}
</style>
</head>
<body>
<main id="main-content">
<h1>{html.escape(registry['title'])}</h1>
<p class="lede">{html.escape(registry['description'])}</p>
<section class="meta" aria-labelledby="registry-state">
<h2 id="registry-state">Registry state</h2>
<p><strong>Reviewed:</strong> {html.escape(registry['modified'])}. <strong>Repositories and units:</strong> {len(entries)}. <strong>Adoption:</strong> {counts}.</p>
<p><a href="{html.escape(machine_href, quote=True)}">Open the machine-readable JSON registry</a> · <a href="{SOURCE_URL}">Review the authored YAML source</a> · <a href="{html.escape(registry['methodology']['profile'], quote=True)}">Read publication method profile v1</a>.</p>
<p>Command strings in repository contracts are untrusted declarations. The registry reports dated review state; it is not publication authority or proof of a live deployment.</p>
</section>
<nav aria-label="Repository registry">
<h2>Jump to a repository or publication unit</h2>
<ul>{''.join(f'<li><a href="#{_anchor(entry["name"])}">{html.escape(entry["name"])}</a></li>' for entry in entries)}</ul>
</nav>
{''.join(cards)}
<section class="backlog" aria-labelledby="optimisation-backlog">
<h2 id="optimisation-backlog">Optimisation backlog</h2>
<table>
<thead><tr><th scope="col">Item</th><th scope="col">Priority</th><th scope="col">State</th><th scope="col">Repositories</th></tr></thead>
<tbody>{backlog_rows}</tbody>
</table>
</section>
</main>
</body>
</html>
"""


def check_file(path: Path, expected: str) -> str | None:
    if not path.is_file():
        return f"{path.relative_to(ROOT)} is missing"
    actual = path.read_text(encoding="utf-8")
    if actual == expected:
        return None
    diff = "\n".join(
        difflib.unified_diff(
            actual.splitlines(),
            expected.splitlines(),
            fromfile=f"{path.relative_to(ROOT)} current",
            tofile=f"{path.relative_to(ROOT)} generated",
            lineterm="",
            n=2,
        )
    )
    return f"{path.relative_to(ROOT)} is out of date:\n{diff}"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    try:
        registry = build()
        rendered = render_json(registry)
    except (EstateRegistryError, okf_semantic.SemanticError) as error:
        print(f"estate registry build failed: {error}", file=sys.stderr)
        return 1
    if args.check:
        error = check_file(OUTPUT, rendered)
        if error:
            print(f"estate registry check failed:\n- {error}", file=sys.stderr)
            return 1
        print(
            "OKF estate registry is synchronised "
            f"({len(registry['repositories'])} entries, {len(registry['backlog'])} backlog items)"
        )
        return 0
    OUTPUT.write_text(rendered, encoding="utf-8")
    print(
        f"wrote {OUTPUT.relative_to(ROOT)} with "
        f"{len(registry['repositories'])} entries"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
