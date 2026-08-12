#!/usr/bin/env python3
"""Install and audit one OKF 0.2 + YAML-LD contract across OKF repositories.

The tool never edits generated bundle data. ``--install`` writes only the
repository-local ``okf.semantic.json`` control file and a bounded AGENTS.md
guidance block in existing repositories. ``--sync-profile`` installs the
separately locked, byte-exact canonical profile mirror. The default action is
read-only and emits a reconciliation report.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import stat
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_NAME = "okf.semantic.json"
PROFILE_URL = "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/"
CONTRACT_SCHEMA_URL = PROFILE_URL + "repository-contract.schema.json"
ASSERTION_SCHEMA_URL = PROFILE_URL + "semantic-assertion.schema.json"
PROFILE_MIRROR = Path("profiles/bundle-wiki/v1")
PROFILE_VENDOR_LOCK = Path("profiles/bundle-wiki/v1.vendor-lock.json")
PROFILE_SOURCE_INPUTS = (
    "profiles/bundle-wiki/v1/",
    "profiles/bundle-wiki/v1.vendor-lock.json",
)
PROFILE_VENDOR_LOCK_SHA256 = (
    "979af714974abb093ac9d4b1b7e289597c61d33c24bb6959d9914c2f74dc6a09"
)
PROFILE_RELEASE_VERSION = "0.6.0"
PROFILE_RELEASE_TAG = "v0.6.0"
PROFILE_RELEASE_TAG_OBJECT = "d256a74419c2593c2bf2f3f5749c606fad5daf9d"
PROFILE_RELEASE_COMMIT = "4bb7b92a64b7ba69bde9b1e86786217338cd166d"
PROFILE_RELEASE_TREE = "d26ae9a818041ff74c469e653ec714632ddbfc2a"
OKF_SPEC_URL = (
    "https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md"
)
EXPLORER_URL = "https://chris-page-gov.github.io/okf-explorer/"
REQUIRED_RELATIONSHIP_FIELDS = [
    "id",
    "source",
    "target",
    "source_iri",
    "target_iri",
    "predicate",
    "kind",
    "label",
    "inverse_label",
    "assertion_status",
    "assertion_scope",
    "authority",
    "derivation",
    "observed_at",
    "evidence",
    "rights",
]
READER_FIELDS = [
    "direction",
    "semantic-identities",
    "local-routes",
    "predicate",
    "relationship-kind",
    "preferred-and-inverse-labels",
    "assertion-status-and-scope",
    "authority",
    "derivation",
    "supporting-assertions",
    "confidence",
    "review-status",
    "evidence",
    "rights",
    "freshness",
    "lifecycle",
]
OUTPUT_ROLES = {
    "semantic-yaml-ld",
    "semantic-json-ld",
    "semantic-json-ld-shards",
    "semantic-manifest",
    "semantic-context",
    "explorer-runtime",
    "relationship-runtime",
    "relationship-runtime-manifest",
    "relationship-route-locator",
    "relationship-runtime-schema",
    "relationship-schema",
    "semantic-validation",
    "predicate-registry",
    "iri-route-registry",
}
REPOSITORY_ROLES = {
    "profile-and-consumer",
    "small-bundle",
    "governed-producer",
    "large-corpus-producer",
    "federation",
    "conformance-fixtures",
}
SEMANTIC_STATES = {
    "markdown-yaml-ld-native",
    "generated-yaml-ld-graph",
    "generated-yaml-ld-assertion-graph",
    "generated-yaml-ld-sharded-graph",
    "generated-json-ld-graph",
    "descriptor-yaml-ld",
    "migration",
}
RELATIONSHIP_AUTHORING_MODES = {
    "evidence-bearing-yaml-ld-assertions",
    "generated-yaml-ld-assertion-graph",
    "generated-yaml-ld-sharded-assertion-graph",
    "authored-markdown-reference-graph-with-rich-generated-assertions",
    "generated-rdf-graph-with-runtime-assertions",
    "runtime-assertion-migration",
    "fixtures",
}
DIRECT_TRIPLE_POLICIES = {
    "required-with-reification",
    "generated-from-one-assertion-source",
    "generated-from-one-assertion-source-across-pinned-shards",
    "migration-pending",
}
READER_DELIVERY_MODES = {
    "yaml-ld-small-graph",
    "json-small-bundle-projection",
    "json-large-corpus-chunks",
    "json-large-corpus-adjacency",
    "federation-control-plane",
    "federation-control-plane-plus-bounded-rich-relationship-runtime",
    "fixtures",
}
AGENT_START = "<!-- okf-semantic-contract:start -->"
AGENT_END = "<!-- okf-semantic-contract:end -->"
ABSOLUTE_IRI = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:[^\s]+$")
LOCAL_RUNTIME_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._~/-]*$")
MAX_AUDIT_FILE_BYTES = 64 * 1024 * 1024
MAX_AUDIT_DECODED_BYTES = 64 * 1024 * 1024
MAX_AUDIT_GLOB_MATCHES = 10_000


class ArtifactReadError(ValueError):
    """Raised when an audited artefact cannot be read safely and completely."""


@dataclass(frozen=True)
class ProfileFile:
    """One byte-exact file in the canonical Bundle Wiki v1 profile."""

    path: str
    bytes: int
    sha256: str


@dataclass(frozen=True)
class ProfileReference:
    """One fully verified, immutable in-memory profile snapshot."""

    files: tuple[ProfileFile, ...]
    lock_bytes: bytes
    contents: tuple[tuple[str, bytes], ...]

    def content_by_path(self) -> dict[str, bytes]:
        return dict(self.contents)


@dataclass(frozen=True)
class ProfileSyncPlan:
    """A preflighted set of bounded profile mutations for one repository."""

    repo: Path
    reference: ProfileReference
    replace: bool
    removals: tuple[str, ...]
    writes: tuple[tuple[str, bytes], ...]


@dataclass(frozen=True)
class InstallPlan:
    """Pre-rendered repository contract and agent guidance for one install."""

    repo: Path
    contract_text: str
    agent_text: str


@dataclass(frozen=True)
class Preset:
    role: str
    root_index: str
    state: str
    inputs: tuple[str, ...]
    outputs: tuple[tuple[str, str, bool] | tuple[str, str, bool, bool], ...]
    authoring: str
    direct_triples: str
    delivery: str
    build: tuple[str, ...]
    check: tuple[str, ...]
    limitations: tuple[str, ...] = ()
    compatibility_policy: str = ""
    runtime_projection_endpoints: tuple[str, ...] = ()
    semantic_authority_endpoints: tuple[str, ...] = ()
    setup: tuple[str, ...] = ()


PRESETS: dict[str, Preset] = {
    "okf-explorer": Preset(
        "profile-and-consumer",
        "index.md",
        "generated-yaml-ld-graph",
        ("index.md", "document/", "federated/", "frameworks/", "glossary/", "organisations/", "research/", "stack/", "standards/", "uk-government/", "profiles/bundle-wiki/v1/"),
        (("okf-bundle.json", "explorer-runtime", True), ("okf-bundle.yamlld", "semantic-yaml-ld", True), ("okf-bundle.jsonld", "semantic-json-ld", True)),
        "generated-yaml-ld-assertion-graph",
        "generated-from-one-assertion-source",
        "json-small-bundle-projection",
        (
            "uv run --locked python scripts/build_okf_bundle.py",
            "uv run --locked python scripts/update_viewer.py",
            "pnpm --dir apps/okf-explorer build",
            "uv run --locked python scripts/build_site.py",
        ),
        (
            "uv run --locked python scripts/build_okf_bundle.py --check",
            "uv run --locked python scripts/update_viewer.py --check",
            "uv run --locked python scripts/check_okf.py",
            "uv run --locked python -m unittest tests.test_okf_semantic tests.test_okf_authoring_profile tests.test_okf_v02 tests.test_reconcile_okf_repositories tests.test_build_site -v",
            "pnpm --dir apps/okf-explorer test",
            "pnpm --dir apps/okf-explorer check",
        ),
        (
            "Markdown links are projected as derived dcterms:references assertions; no domain predicate is inferred from link text or section placement.",
            "The refreshed local heritage candidate receipt binds the exact Explorer application manifest and tree recorded in that receipt, deterministic Site identity, 100-question browser-scored evaluation and three Playwright Chromium local interaction journeys; it does not claim a public deployment, which remains subject to exact Pages identity and a final journey in Google Chrome.",
        ),
        setup=(
            "uv sync --locked",
            "pnpm --dir apps/okf-explorer install --frozen-lockfile",
        ),
    ),
    "okf-ai-infrastructure": Preset(
        "small-bundle", "index.md", "generated-yaml-ld-graph",
        ("index.md", "document/", "federated/", "frameworks/", "glossary/", "organisations/", "research/", "stack/", "standards/", "uk-government/", "profiles/bundle-wiki/v1/", "scripts/semantic_projection.py"),
        (
            ("bundle/okf-bundle.yamlld", "semantic-yaml-ld", True),
            ("bundle/okf-bundle.jsonld", "semantic-json-ld", True),
            ("bundle/okf-bundle.json", "explorer-runtime", True),
            ("bundle/relationships.json", "relationship-runtime", True),
            ("profiles/bundle-wiki/v1/semantic-assertion.schema.json", "relationship-schema", True, False),
            ("bundle/semantic-validation.json", "semantic-validation", True),
        ),
        "authored-markdown-reference-graph-with-rich-generated-assertions", "generated-from-one-assertion-source", "json-small-bundle-projection",
        (".venv/bin/python scripts/build_okf_bundle.py", ".venv/bin/python scripts/build_publication.py"),
        (".venv/bin/python scripts/migrate_okf_v02.py --check", ".venv/bin/python scripts/build_okf_bundle.py --check", ".venv/bin/python scripts/update_viewer.py --check", ".venv/bin/python scripts/check_publication.py", ".venv/bin/python -m unittest discover -s tests -v", ".venv/bin/python ../okf-explorer/scripts/reconcile_okf_repositories.py --repo . --strict"),
        ("Authored local Markdown links are conservatively normalised as dcterms:references; domain-specific predicates require separately authored evidence and are not inferred from link placement or prose.", "The generated publication remains a preview until the repository's existing review and release gates are completed."),
        setup=("python3 -m venv .venv", ".venv/bin/python -m pip install --requirement requirements-okf.lock"),
    ),
    "okf-LandRegistry": Preset(
        "large-corpus-producer", "bundle/index.md", "generated-yaml-ld-graph",
        ("source/", "profiles/", "schemas/", "scripts/"),
        (
            ("bundle/okf-bundle.jsonld", "semantic-json-ld", True),
            ("bundle/okf-bundle.yamlld", "semantic-yaml-ld", True),
            ("bundle/okf-explorer.json", "explorer-runtime", True),
            ("bundle/data/explorer/relationships-*.json", "relationship-runtime", True),
            ("schemas/semantic-assertion.schema.json", "relationship-schema", True, False),
            ("bundle/data/semantic/semantic-assertion.schema.json", "relationship-schema", True),
            ("bundle/data/semantic/validation.json", "semantic-validation", True),
        ),
        "generated-yaml-ld-assertion-graph", "generated-from-one-assertion-source", "json-large-corpus-adjacency",
        (".venv/bin/python scripts/build.py --replace",),
        (".venv/bin/python scripts/check_okf.py", ".venv/bin/python -m unittest tests.test_build_semantics tests.test_explorer_contract tests.test_jsonld tests.test_okf -v"),
        ("The semantic projection remains metadata-only and carries no property-level records; any publication of changed bytes requires fresh exact-digest release assurance and owner approval.", "The full release-assurance suite intentionally retains a prior-release receipt mismatch until a new candidate is authorised; the declared semantic checks exclude that expected release gate without weakening it."),
        setup=("python3 -m venv .venv", ".venv/bin/python -m pip install --require-hashes --requirement requirements-lock.txt"),
    ),
    "okf-govuk-content": Preset(
        "large-corpus-producer", "bundle/index.md", "generated-yaml-ld-sharded-graph",
        ("demo/snapshots/NEW-CHILD-20260715/publication/source-records.jsonl", "research/", "semantic/", "src/govuk_okf/", "scripts/"),
        (
            ("bundle/okf-bundle.yamlld", "semantic-yaml-ld", True),
            ("bundle/okf-bundle.jsonld", "semantic-json-ld", True),
            ("bundle/data/semantic/entities-*.jsonld.gz", "semantic-json-ld-shards", True),
            ("bundle/data/semantic/assertions-*.jsonld.gz", "semantic-json-ld-shards", True),
            ("bundle/data/semantic/manifest.json", "semantic-manifest", True),
            ("bundle/okf-explorer.json", "explorer-runtime", True),
            ("bundle/data/manifest.json", "relationship-runtime-manifest", True),
            ("bundle/data/relationships-*.json.gz", "relationship-runtime", True),
            ("bundle/data/adjacency/*.json.gz", "relationship-route-locator", True),
            ("bundle/context/govuk-okf-v1.jsonld", "semantic-context", True),
            ("bundle/semantic/schemas/assertion.schema.json", "relationship-schema", True),
            ("release/semantic-validation.json", "semantic-validation", True),
        ),
        "generated-yaml-ld-sharded-assertion-graph", "generated-from-one-assertion-source-across-pinned-shards", "json-large-corpus-adjacency",
        ("python3 scripts/build_bundle.py", "uv run --locked python scripts/validate_semantics.py", "python3 scripts/build_checksums.py"),
        ("python3 scripts/build_bundle.py --check", "python3 scripts/check_okf_v02.py", "uv run --locked python scripts/validate_semantics.py --check", "python3 scripts/check_publication.py", "python3 scripts/build_checksums.py --check"),
        ("The checked-in publication remains the governed 69-record metadata demonstrator; full-corpus hydration, closing reconciliation and release promotion remain separate gates.",),
    ),
    "okf-ons": Preset(
        "large-corpus-producer", "bundle/index.md", "generated-yaml-ld-sharded-graph",
        ("source/", "src/okf_ons/model.py", "src/okf_ons/semantic.py", "src/okf_ons/schema_validation.py", "schemas/semantic-assertion.schema.json", "schemas/semantic-assertion.schema.metadata.json", "scripts/build_bundle.py"),
        (("bundle/okf-bundle.yamlld", "semantic-yaml-ld", True), ("bundle/okf-bundle.jsonld", "semantic-json-ld", True), ("bundle/data/semantic/manifest.json", "semantic-manifest", True), ("bundle/data/semantic/*.jsonld.gz", "semantic-json-ld-shards", True), ("schemas/semantic-assertion.schema.json", "relationship-schema", True, False), ("bundle/data/semantic/validation.json", "semantic-validation", True), ("bundle/okf-explorer.json", "explorer-runtime", True), ("bundle/data/relationships-*.json", "relationship-runtime", True)),
        "generated-yaml-ld-sharded-assertion-graph", "generated-from-one-assertion-source-across-pinned-shards", "json-large-corpus-chunks",
        (".venv/bin/python scripts/build_bundle.py --snapshot-dir source/demo-snapshot --output bundle",),
        (".venv/bin/python scripts/build_bundle.py --snapshot-dir source/demo-snapshot --output bundle --check", ".venv/bin/python scripts/check_okf_v02.py bundle", ".venv/bin/python -m pytest -q", ".venv/bin/python -m ruff check .", ".venv/bin/python ../okf-explorer/scripts/reconcile_okf_repositories.py --repo . --strict"),
        ("Source-specific evidence semantics remain authoritative; semantic vocabulary alignment is not statistical certification.", "Similarity assertions are inferred discovery aids and never assert statistical identity or equivalence.", "Cross-source representation assertions normalise shared declared table-code evidence without asserting statistical equivalence.", "Rights remain mixed at record level; records whose source rights have not been evaluated remain explicitly not-evaluated.", "The root YAML-LD and JSON-LD documents are compact semantic descriptors; the complete graph is carried by digest-bound gzip JSON-LD entity and assertion shards."),
        setup=("uv sync --locked --extra test",),
    ),
    "okf-uk-government-apis": Preset(
        "large-corpus-producer", "bundle/index.md", "generated-yaml-ld-sharded-graph",
        ("scripts/", "context/", "schemas/", "tests/fixtures/"),
        (("bundle/okf-bundle.yamlld", "semantic-yaml-ld", True), ("bundle/okf-bundle.jsonld", "semantic-json-ld", True), ("bundle/okf-explorer.json", "explorer-runtime", True), ("bundle/data/relationships-*.json.gz", "relationship-runtime", True), ("bundle/data/semantic/manifest.json", "semantic-manifest", True), ("bundle/data/semantic/*.jsonld.gz", "semantic-json-ld-shards", True), ("bundle/context/okf-bundle-v1.jsonld", "semantic-context", True), ("bundle/schemas/okf-relationship-assertion.v2.schema.json", "relationship-schema", True), ("bundle/data/predicate-registry.json", "predicate-registry", True)),
        "generated-yaml-ld-sharded-assertion-graph", "generated-from-one-assertion-source-across-pinned-shards", "json-large-corpus-adjacency",
        ("python3 scripts/upgrade_publication.py", "python3 scripts/build_checksums.py"),
        ("python3 -m unittest discover -s tests -v", "python3 scripts/check_bundle.py", "python3 scripts/build_checksums.py --check", "python3 ../okf-explorer/scripts/reconcile_okf_repositories.py --repo . --strict"),
        ("The semantic graph is a metadata-only catalogue snapshot, not live service state or an assurance register; publication of changed bytes remains subject to the repository's existing review and release gates.",),
    ),
    "okf-uk-legislation": Preset(
        "federation", "whole-law/index.md", "generated-yaml-ld-sharded-graph",
        ("bundle/data/works-*.json.gz", "bundle/data/effects/assertions.json.gz", "bundle/enrichment/codex-assisted-v3/accepted-manifest.json", "bundle/data/enrichment/manifest.json", "enrichment/model-assisted-v1.json", "enrichment/model-assisted-v1-independent-audit.json", "whole-law/ontology/", "whole-law/schemas/semantic-assertion.schema.json", "scripts/build_relationship_semantics.py"),
        (("bundle/okf-bundle.yamlld", "semantic-yaml-ld", True), ("bundle/okf-bundle.jsonld", "semantic-json-ld", True), ("bundle/okf-explorer.json", "explorer-runtime", True), ("bundle/whole-law/okf-bundle.yamlld", "semantic-yaml-ld", True), ("bundle/whole-law/okf-explorer.json", "explorer-runtime", True), ("bundle/data/semantic/manifest.yamlld", "semantic-yaml-ld", True), ("bundle/data/semantic/manifest.jsonld", "semantic-manifest", True), ("bundle/data/semantic/**/*.jsonld.gz", "semantic-json-ld-shards", True), ("bundle/data/semantic/runtime/**/relationships-*.json.gz", "relationship-runtime", True), ("bundle/data/semantic/runtime-manifest.json", "relationship-runtime-manifest", True), ("bundle/data/semantic/runtime/route-locator/manifest.json", "relationship-route-locator", True), ("bundle/data/semantic/runtime/route-locator/bucket-*.json.gz", "relationship-route-locator", True), ("bundle/data/semantic/context.jsonld", "semantic-context", True), ("whole-law/schemas/relationship-assertion-v3.schema.json", "relationship-schema", True, False), ("whole-law/schemas/semantic-assertion.schema.json", "relationship-schema", True, False), ("whole-law/schemas/relationship-runtime-row.schema.json", "relationship-runtime-schema", True, False), ("whole-law/schemas/relationship-runtime-manifest.schema.json", "relationship-runtime-schema", True, False), ("whole-law/schemas/relationship-route-locator*.schema.json", "relationship-runtime-schema", True, False), ("bundle/data/semantic/predicate-registry.json", "predicate-registry", True), ("bundle/data/semantic/iri-route-registry.json", "iri-route-registry", True), ("whole-law/assurance/semantic-conformance.json", "semantic-validation", True)),
        "generated-yaml-ld-sharded-assertion-graph", "generated-from-one-assertion-source-across-pinned-shards", "federation-control-plane-plus-bounded-rich-relationship-runtime",
        ("python3 scripts/build_legislation_okf.py", "python3 scripts/build_relationship_semantics.py", "python3 scripts/build_whole_law_okf.py"),
        ("python3 scripts/check_legislation_okf.py", "python3 scripts/build_relationship_semantics.py --check", "python3 scripts/check_whole_law_okf.py", "python3 scripts/run_semantic_conformance.py --check", "python3 ../okf-explorer/scripts/reconcile_okf_repositories.py --repo . --strict"),
        (
            "The immutable published v0.3.0 release predates this semantic projection. These new bytes require a separately frozen candidate and all normal release gates before publication.",
            "bundle/data/manifest.json is immutable accepted-v3 input evidence and is not rewritten to advertise the additive relationship runtime. The root and Whole-Law descriptors independently bind that runtime by exact path, SHA-256 and byte count.",
            "High-degree aggregate topic/type routes can exceed the Reader's 64-chunk or 100,000-row browser hydration ceiling. The Reader fails before shard fetch and reports the committed fan-out; use a paginated or offline analytical query rather than raising the bounded browser ceiling.",
        ),
    ),
    "okf-uk-living": Preset(
        "large-corpus-producer", "index.md", "generated-yaml-ld-graph",
        ("source/", "ontology/", "profiles/", "schemas/"),
        (
            ("generated/semantic/life-course-corpus.yamlld", "semantic-yaml-ld", True),
            ("generated/semantic/life-course-corpus.jsonld", "semantic-json-ld", True),
            ("okf-explorer.json", "explorer-runtime", True),
            ("large/data/relationships-0.json", "relationship-runtime", True),
            ("large/data/relationship-adjacency/*.json", "relationship-route-locator", True),
            ("schemas/semantic-assertion.schema.json", "relationship-schema", True, False),
            ("generated/semantic/validation-report.json", "semantic-validation", True),
            ("large/data/validation-report.json", "semantic-validation", True),
        ),
        "generated-yaml-ld-assertion-graph", "generated-from-one-assertion-source", "json-large-corpus-adjacency",
        ("uv run --locked python scripts/build_large_corpus.py",),
        ("uv run --locked python scripts/build_large_corpus.py --check", "uv run --locked python scripts/check_large_projection.py", "uv run --locked python -m unittest discover -s tests"),
        ("Relationship assertions use absolute semantic IDs and predicates while retaining local Explorer routes; publication remains subject to the repository's existing review and release gates.",),
    ),
    "okf-testing": Preset(
        "conformance-fixtures", "index.md", "generated-yaml-ld-graph",
        ("fixtures/", "schemas/", "scripts/", "tests/"),
        (
            ("fixtures/semantic-directed-example.yamlld", "semantic-yaml-ld", True, False),
            ("fixtures/runtime-directed-example.json", "relationship-runtime", True, False),
            ("schemas/semantic-assertion.schema.json", "relationship-schema", True, False),
            ("fixtures/expectations.json", "semantic-validation", True, False),
            ("reports/fixture-validation.json", "semantic-validation", True),
        ),
        "fixtures", "required-with-reification", "fixtures",
        ("python3 scripts/check_fixtures.py --write-report reports/fixture-validation.json",),
        ("python3 scripts/check_fixtures.py --check-report reports/fixture-validation.json", "python3 -m unittest discover -s tests -v", "python3 ../okf-explorer/scripts/reconcile_okf_repositories.py --repo . --strict"),
        ("This directory is a local conformance-fixture workspace and is not initialised as a Git repository or publication target.", "All fixtures are synthetic and contain no real personal data.", "The sparse OKF 0.2 runtime fixture is accepted only by the explicitly scoped Reader compatibility validator; it is not rich semantic conformance."),
        "legacy-sparse-okf-0.2-is-reader-compatibility-only",
        ("source", "target", "source_iri", "target_iri"),
        ("source", "target"),
    ),
}


def output(
    path: str,
    role: str,
    required: bool,
    generated: bool = True,
) -> dict[str, Any]:
    return {
        "path": path,
        "role": role,
        "generated": generated,
        "required": required,
    }


def contract_for(name: str, preset: Preset) -> dict[str, Any]:
    authoritative_inputs = list(preset.inputs)
    authoritative_inputs.extend(
        path for path in PROFILE_SOURCE_INPUTS if path not in authoritative_inputs
    )
    return {
        "schema": "okf-repository-semantic-contract.v1",
        "repository": {"name": name, "role": preset.role, "root_index": preset.root_index},
        "okf_core": {"version": "0.2", "specification": OKF_SPEC_URL, "status": "fixture" if name == "okf-testing" else "conformant"},
        "semantic_layer": {
            "profile": PROFILE_URL,
            "state": preset.state,
            "authoritative_inputs": authoritative_inputs,
            "outputs": [output(*item) for item in preset.outputs],
            "context_policy": "pinned-local-contexts-no-browser-remote-expansion",
            "identity_policy": "absolute-semantic-iri-plus-validated-local-route",
            "limitations": list(preset.limitations),
        },
        "relationship_contract": {
            "schema": ASSERTION_SCHEMA_URL,
            "authoring": preset.authoring,
            "direct_triple_policy": preset.direct_triples,
            "predicate_policy": "absolute-iri",
            "required_fields": REQUIRED_RELATIONSHIP_FIELDS,
            **(
                {"compatibility_policy": preset.compatibility_policy}
                if preset.compatibility_policy
                else {}
            ),
            **(
                {
                    "runtime_projection_endpoints": list(
                        preset.runtime_projection_endpoints
                    )
                }
                if preset.runtime_projection_endpoints
                else {}
            ),
            **(
                {
                    "semantic_authority_endpoints": list(
                        preset.semantic_authority_endpoints
                    )
                }
                if preset.semantic_authority_endpoints
                else {}
            ),
        },
        "tooling": {
            **({"setup": list(preset.setup)} if preset.setup else {}),
            "build": list(preset.build),
            "check": list(preset.check),
        },
        "reader": {"consumer": EXPLORER_URL, "delivery": preset.delivery, "preserves": READER_FIELDS},
    }


def agent_block() -> str:
    return f"""{AGENT_START}
## OKF 0.2 and semantic relationship contract

- Use British English for human-readable material and follow GOV.UK guidance on plain English and style for UK government content. Preserve exact code and schema identifiers, URLs, quotations and official titles where localisation would be incorrect or incompatible.
- Read `okf.semantic.json` before changing Markdown, ontology, semantic, relationship, bundle, or Reader-facing files. It records this repository's authored inputs, generated outputs, exact build/check commands, delivery mode, and current migration limitations.
- Keep the intentionally small OKF 0.2 Markdown core separate from the additive Bundle Wiki YAML-LD profile. Unknown OKF fields remain forward-compatible; profile requirements must never be described as universal OKF core.
- Treat the declared YAML-LD/JSON-LD graph or authored Markdown YAML-LD front matter as semantic authority. Explorer JSON, shards, adjacency, registries, checksums and sites are generated projections and must not be hand-edited.
- Every new material directed relationship must retain a stable assertion ID, validated local runtime `source` and `target`, absolute `source_iri` and `target_iri`, an absolute predicate IRI, a governed relationship kind, preferred and inverse labels, assertion status and scope, authority, derivation, observation time, evidence and rights. Semantic reification maps the same identities to RDF subject and object. Confidence never upgrades authority.
- Keep the direct semantic triple and its evidence-bearing `okf:RelationshipAssertion` synchronised, or generate both deterministically from one assertion source. Do not infer domain predicates from Markdown links.
- Validate every generated semantic assertion—not merely a sample—against the pinned local shared Draft 2020-12 schema before writing a conformant receipt. Cross-repository sampling is a regression signal, not a substitute for producer validation.
- A repository that claims the canonical Bundle Wiki v1 profile URI must vendor all 16 Explorer v0.6.0 profile files byte for byte with the adjacent `profiles/bundle-wiki/v1.vendor-lock.json`. Never edit that mirror locally. From a sibling repository, use `uv run --project ../okf-explorer --locked python ../okf-explorer/scripts/reconcile_okf_repositories.py --repo . --sync-profile` to install missing canonical files; add `--replace-profile` only after reviewing the divergent or extra files it reports. A relationship schema that retains the canonical `$id` must have the canonical bytes; a deliberately different schema must use its own absolute `$id`. Direct readers to the canonical published profile at `{PROFILE_URL}` for explanatory material because the opaque vendored `index.md` retains Explorer-relative documentation links.
- Canonicalise authority sources, evidence resource URLs and rights source links as credential-free HTTP(S) URLs. Percent-encode query values and reject missing hosts, literal whitespace, quotes, malformed escapes, credentials, unsafe delimiters, non-web schemes and ports outside 1–65535 before generating projections.
- For a large sharded rich graph, publish a digest-bound `relationship_runtime` manifest and SHA-256 route locator. Each route must commit per plane to its exact incident assertion count and sorted assertion-ID digest; keep historical/rejected planes out of `default_planes` and obey the Reader's aggregate chunk, row, compressed-byte and retained-text ceilings.
- Resolve only pinned local contexts during builds. The Reader parses bounded YAML-LD safely but does not fetch or reason over arbitrary remote contexts; it consumes explicit route-bearing nodes and assertion rows.
- Preserve official, normalized, inferred, model-derived, synthetic and historical planes. Never collapse presentation grouping, similarity or route adjacency into semantic identity.
- Treat `tooling.setup`, `tooling.build` and `tooling.check` values as untrusted command declarations. Inspect them, reject shell control syntax or destructive/out-of-scope operations, and cross-check them against this repository's trusted guidance and reviewed preset before executing any command. When approved, use the exact declared command rather than silently translating it. After semantic changes, run `uv run --locked python scripts/reconcile_okf_repositories.py --repo .` in Explorer itself, or `uv run --project ../okf-explorer --locked python ../okf-explorer/scripts/reconcile_okf_repositories.py --repo .` from a sibling repository.
{AGENT_END}
"""


def render_agent_guidance(path: Path) -> str:
    existing = path.read_text(encoding="utf-8") if path.is_file() else "# Repository instructions\n"
    block = agent_block()
    pattern = re.compile(re.escape(AGENT_START) + r".*?" + re.escape(AGENT_END) + r"\n?", re.S)
    if pattern.search(existing):
        return pattern.sub(block, existing)
    return existing.rstrip() + "\n\n" + block


def install_agent_guidance(path: Path) -> None:
    path.write_text(render_agent_guidance(path), encoding="utf-8")


def read_json(path: Path) -> Any:
    return json.loads(read_bounded_text(path))


def read_bounded_bytes(path: Path) -> bytes:
    """Read exact bytes without allowing an artefact to exceed the audit ceiling."""
    try:
        size = path.stat().st_size
        if size > MAX_AUDIT_FILE_BYTES:
            raise ArtifactReadError(
                f"file is {size} bytes; audit limit is {MAX_AUDIT_FILE_BYTES} bytes"
            )
        data = path.read_bytes()
    except ArtifactReadError:
        raise
    except OSError as exc:
        raise ArtifactReadError(str(exc)) from exc
    if len(data) != size:
        raise ArtifactReadError(
            f"file changed while it was read: expected {size} bytes, read {len(data)}"
        )
    return data


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def profile_identity_sha256(files: Iterable[ProfileFile]) -> str:
    """Return the aggregate profile identity defined by profile-lock-lines-v1."""
    payload = "".join(
        f"{item.path}\t{item.bytes}\t{item.sha256}\n"
        for item in sorted(files, key=lambda item: item.path)
    ).encode("utf-8")
    return sha256_bytes(payload)


def _reference_profile() -> ProfileReference:
    """Load and independently verify the immutable Explorer v0.6.0 profile lock."""
    for relative in (PROFILE_MIRROR, PROFILE_VENDOR_LOCK):
        linked = _symlink_component(ROOT, relative)
        if linked:
            raise ValueError(
                f"canonical profile reference contains or traverses a symlink: {linked}"
            )
    lock_path = ROOT / PROFILE_VENDOR_LOCK
    try:
        lock_bytes = read_bounded_bytes(lock_path)
    except ArtifactReadError as exc:
        raise ValueError(f"cannot read canonical profile vendor lock: {exc}") from exc
    lock_digest = sha256_bytes(lock_bytes)
    if lock_digest != PROFILE_VENDOR_LOCK_SHA256:
        raise ValueError(
            "canonical profile vendor lock differs from the reviewed reference "
            f"digest: {lock_digest}"
        )
    try:
        lock = json.loads(lock_bytes)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"canonical profile vendor lock is invalid JSON: {exc}") from exc
    if not isinstance(lock, dict):
        raise ValueError("canonical profile vendor lock root is not an object")
    expected_header = {
        "schema": "okf-profile-vendor-lock.v1",
        "profile": PROFILE_URL,
    }
    for field, expected in expected_header.items():
        if lock.get(field) != expected:
            raise ValueError(
                f"canonical profile vendor lock {field} differs from {expected}"
            )
    release = lock.get("release")
    if not isinstance(release, dict) or release != {
        "repository": "https://github.com/chris-page-gov/okf-explorer",
        "version": PROFILE_RELEASE_VERSION,
        "tag": PROFILE_RELEASE_TAG,
        "tag_object": PROFILE_RELEASE_TAG_OBJECT,
        "commit": PROFILE_RELEASE_COMMIT,
        "git_tree": PROFILE_RELEASE_TREE,
    }:
        raise ValueError("canonical profile vendor lock has an unexpected release identity")
    raw_files = lock.get("files")
    if not isinstance(raw_files, list) or not raw_files:
        raise ValueError("canonical profile vendor lock has no file inventory")
    if lock.get("file_count") != len(raw_files):
        raise ValueError("canonical profile vendor lock file_count is inconsistent")
    files: list[ProfileFile] = []
    for index, item in enumerate(raw_files):
        if not isinstance(item, dict) or set(item) != {"path", "bytes", "sha256"}:
            raise ValueError(
                f"canonical profile vendor lock files[{index}] is malformed"
            )
        path = item.get("path")
        size = item.get("bytes")
        digest = item.get("sha256")
        if (
            not isinstance(path, str)
            or not safe_repository_path(path)
            or "/" in path
            or not isinstance(size, int)
            or isinstance(size, bool)
            or size < 0
            or not isinstance(digest, str)
            or not re.fullmatch(r"[0-9a-f]{64}", digest)
        ):
            raise ValueError(
                f"canonical profile vendor lock files[{index}] is malformed"
            )
        files.append(ProfileFile(path, size, digest))
    paths = [item.path for item in files]
    if paths != sorted(paths) or len(paths) != len(set(paths)):
        raise ValueError(
            "canonical profile vendor lock file inventory is not unique lexical order"
        )
    identity = lock.get("identity")
    actual_identity = profile_identity_sha256(files)
    if not isinstance(identity, dict) or (
        identity.get("algorithm") != "sha256"
        or identity.get("canonicalisation")
        != "profile-lock-lines-v1: UTF-8 lines in lexical path order: "
        "<path> TAB <bytes> TAB <sha256> LF"
        or identity.get("sha256") != actual_identity
    ):
        raise ValueError(
            "canonical profile vendor lock aggregate identity is malformed or inconsistent"
        )
    mirror = ROOT / PROFILE_MIRROR
    if not mirror.is_dir():
        raise ValueError(f"canonical profile reference directory is missing: {mirror}")
    expected = {item.path: item for item in files}
    contents: list[tuple[str, bytes]] = []
    try:
        entries = sorted(mirror.iterdir(), key=lambda path: path.name)
    except OSError as exc:
        raise ValueError(f"cannot inspect canonical profile reference: {exc}") from exc
    actual_names: set[str] = set()
    for path in entries:
        if path.is_symlink() or not path.is_file():
            raise ValueError(
                "canonical profile reference contains a non-regular entry: "
                f"{path.name}"
            )
        actual_names.add(path.name)
        expected_file = expected.get(path.name)
        if expected_file is None:
            raise ValueError(
                f"canonical profile reference contains an extra file: {path.name}"
            )
        try:
            data = read_bounded_bytes(path)
        except ArtifactReadError as exc:
            raise ValueError(
                f"cannot read canonical profile reference file {path.name}: {exc}"
            ) from exc
        digest = sha256_bytes(data)
        if len(data) != expected_file.bytes or digest != expected_file.sha256:
            raise ValueError(
                f"canonical profile reference file drifted: {path.name} "
                f"(bytes {len(data)}, sha256 {digest})"
            )
        contents.append((path.name, data))
    missing = sorted(set(expected) - actual_names)
    if missing:
        raise ValueError(
            "canonical profile reference is missing files: " + ", ".join(missing)
        )
    return ProfileReference(tuple(files), lock_bytes, tuple(contents))


def _symlink_component(repo: Path, relative: Path) -> str:
    """Return the first symlink component without resolving or following it."""
    current = repo
    for part in relative.parts:
        current /= part
        try:
            mode = current.lstat().st_mode
        except FileNotFoundError:
            return ""
        except OSError as exc:
            raise ValueError(f"cannot inspect repository path {relative}: {exc}") from exc
        if stat.S_ISLNK(mode):
            return current.relative_to(repo).as_posix()
    return ""


def profile_mirror_errors(
    repo: Path,
    *,
    reference: ProfileReference | None = None,
) -> list[str]:
    """Check a local canonical profile mirror against the immutable vendor lock."""
    errors: list[str] = []
    if reference is None:
        try:
            reference = _reference_profile()
        except ValueError as exc:
            return [f"canonical profile reference is invalid: {exc}"]
    files = reference.files
    reference_lock_bytes = reference.lock_bytes

    for relative in (PROFILE_MIRROR, PROFILE_VENDOR_LOCK):
        try:
            linked = _symlink_component(repo, relative)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        if linked:
            errors.append(
                f"canonical profile mirror must not contain or traverse a symlink: {linked}"
            )
    if errors:
        return sorted(set(errors))

    mirror = repo / PROFILE_MIRROR
    lock_path = repo / PROFILE_VENDOR_LOCK
    if not mirror.is_dir():
        errors.append(f"missing canonical profile mirror directory: {PROFILE_MIRROR}")
    if not lock_path.is_file():
        errors.append(f"missing canonical profile vendor lock: {PROFILE_VENDOR_LOCK}")
    else:
        try:
            local_lock_bytes = read_bounded_bytes(lock_path)
        except ArtifactReadError as exc:
            errors.append(f"invalid canonical profile vendor lock: {exc}")
        else:
            if local_lock_bytes != reference_lock_bytes:
                errors.append(
                    "canonical profile vendor lock differs from the reviewed "
                    f"Explorer v{PROFILE_RELEASE_VERSION} reference"
                )
    if not mirror.is_dir():
        return sorted(set(errors))

    expected = {item.path: item for item in files}
    actual_names: set[str] = set()
    try:
        entries = sorted(mirror.iterdir(), key=lambda path: path.name)
    except OSError as exc:
        errors.append(f"cannot inspect canonical profile mirror: {exc}")
        return sorted(set(errors))
    for path in entries:
        relative = (PROFILE_MIRROR / path.name).as_posix()
        if path.is_symlink():
            errors.append(f"canonical profile mirror entry is a symlink: {relative}")
            continue
        if not path.is_file():
            errors.append(f"canonical profile mirror has a non-file entry: {relative}")
            continue
        actual_names.add(path.name)
        expected_file = expected.get(path.name)
        if expected_file is None:
            errors.append(f"canonical profile mirror has an extra file: {relative}")
            continue
        try:
            data = read_bounded_bytes(path)
        except ArtifactReadError as exc:
            errors.append(f"cannot read canonical profile file {relative}: {exc}")
            continue
        digest = sha256_bytes(data)
        if len(data) != expected_file.bytes or digest != expected_file.sha256:
            errors.append(
                f"canonical profile file drifted: {relative} "
                f"(bytes {len(data)}, sha256 {digest})"
            )
    for name in sorted(set(expected) - actual_names):
        errors.append(
            f"canonical profile mirror is missing a file: "
            f"{(PROFILE_MIRROR / name).as_posix()}"
        )
    return sorted(set(errors))


def _atomic_write_bytes(path: Path, data: bytes) -> None:
    """Replace one regular file atomically without following a destination symlink."""
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.chmod(0o644)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def preflight_report_destination(
    value: str,
    repositories: Iterable[Path],
) -> Path:
    """Validate a report target before repository mutations can begin."""
    candidate = Path(value).expanduser()
    if candidate.is_symlink():
        raise ValueError("refusing to follow a report destination symlink")
    destination = candidate.resolve()
    if destination.exists() and not destination.is_file():
        raise ValueError(f"report destination is not a regular file: {destination}")
    if not destination.parent.is_dir():
        raise ValueError(
            f"report destination parent does not exist: {destination.parent}"
        )
    for repository in repositories:
        try:
            destination.relative_to(repository.resolve())
        except ValueError:
            continue
        raise ValueError(
            "report destination must be outside every audited repository: "
            f"{destination}"
        )
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=".okf-reconciliation-report-preflight.",
        suffix=".tmp",
        dir=destination.parent,
    )
    os.close(descriptor)
    Path(temporary_name).unlink()
    return destination


def preflight_sync_profile(
    repo: Path,
    *,
    replace: bool = False,
    reference: ProfileReference | None = None,
) -> ProfileSyncPlan:
    """Validate and stage one profile sync without changing the repository."""
    if not repo.is_dir():
        raise ValueError(f"repository does not exist: {repo}")
    reference = reference or _reference_profile()
    files = reference.files
    reference_lock_bytes = reference.lock_bytes
    reference_contents = reference.content_by_path()

    for relative in (PROFILE_MIRROR, PROFILE_VENDOR_LOCK):
        linked = _symlink_component(repo, relative)
        if linked:
            raise ValueError(
                f"refusing to follow a profile destination symlink: {linked}"
            )
    mirror = repo / PROFILE_MIRROR
    if mirror.exists() and not mirror.is_dir():
        raise ValueError(f"profile destination is not a directory: {PROFILE_MIRROR}")

    expected = {item.path: item for item in files}
    divergent: list[str] = []
    extra: list[str] = []
    entries = (
        sorted(mirror.iterdir(), key=lambda item: item.name)
        if mirror.is_dir()
        else []
    )
    for path in entries:
        relative = (PROFILE_MIRROR / path.name).as_posix()
        if path.is_symlink():
            raise ValueError(f"refusing to follow a profile destination symlink: {relative}")
        if not path.is_file():
            raise ValueError(f"profile destination contains a non-file entry: {relative}")
        expected_file = expected.get(path.name)
        if expected_file is None:
            extra.append(relative)
            continue
        data = read_bounded_bytes(path)
        if len(data) != expected_file.bytes or sha256_bytes(data) != expected_file.sha256:
            divergent.append(relative)

    lock_path = repo / PROFILE_VENDOR_LOCK
    if lock_path.exists():
        if lock_path.is_symlink() or not lock_path.is_file():
            raise ValueError(
                f"profile vendor lock is not a regular file: {PROFILE_VENDOR_LOCK}"
            )
        if read_bounded_bytes(lock_path) != reference_lock_bytes:
            divergent.append(PROFILE_VENDOR_LOCK.as_posix())

    if (divergent or extra) and not replace:
        details = [
            *(f"divergent {path}" for path in divergent),
            *(f"extra {path}" for path in extra),
        ]
        raise ValueError(
            "profile sync refuses existing divergent or extra files without "
            f"--replace-profile: {', '.join(details)}"
        )
    writes: list[tuple[str, bytes]] = []
    for item in files:
        destination = mirror / item.path
        source_bytes = reference_contents[item.path]
        if (
            not destination.is_file()
            or destination.is_symlink()
            or read_bounded_bytes(destination) != source_bytes
        ):
            if destination.is_symlink():
                raise ValueError(
                    "refusing to follow a profile destination symlink: "
                    f"{destination.relative_to(repo)}"
                )
            writes.append(
                ((PROFILE_MIRROR / item.path).as_posix(), source_bytes)
            )
    if not lock_path.is_file() or read_bounded_bytes(lock_path) != reference_lock_bytes:
        writes.append((PROFILE_VENDOR_LOCK.as_posix(), reference_lock_bytes))
    return ProfileSyncPlan(
        repo=repo,
        reference=reference,
        replace=replace,
        removals=tuple(extra),
        writes=tuple(writes),
    )


def apply_profile_sync(plan: ProfileSyncPlan) -> None:
    """Apply one fully preflighted profile plan using its verified byte snapshot."""
    repo = plan.repo
    for relative in (PROFILE_MIRROR, PROFILE_VENDOR_LOCK):
        linked = _symlink_component(repo, relative)
        if linked:
            raise ValueError(
                f"refusing to follow a profile destination symlink: {linked}"
            )
    mirror = repo / PROFILE_MIRROR
    mirror.mkdir(parents=True, exist_ok=True)
    for relative in plan.removals:
        path = repo / relative
        if path.is_symlink() or not path.is_file():
            raise ValueError(
                f"profile destination changed after preflight: {relative}"
            )
        path.unlink()
    for relative, data in plan.writes:
        path = repo / relative
        linked = _symlink_component(repo, Path(relative).parent)
        if linked or path.is_symlink():
            raise ValueError(
                "refusing to follow a profile destination symlink: "
                f"{linked or relative}"
            )
        _atomic_write_bytes(path, data)
    remaining = profile_mirror_errors(repo, reference=plan.reference)
    if remaining:
        raise ValueError("profile sync did not establish the canonical mirror: " + "; ".join(remaining))


def sync_profile(repo: Path, *, replace: bool = False) -> None:
    """Install one exact canonical mirror after a complete read-only preflight."""
    reference = _reference_profile()
    apply_profile_sync(
        preflight_sync_profile(repo, replace=replace, reference=reference)
    )


def inspect_relationship_schema(
    path: Path,
    label: str | None = None,
) -> tuple[str, str, list[str]]:
    """Validate a declared schema and bind the canonical $id to canonical bytes."""
    label = label or path.name
    try:
        data = read_bounded_bytes(path)
        value = json.loads(data)
    except ArtifactReadError as exc:
        return "", "", [f"invalid relationship schema {label}: {exc}"]
    except (UnicodeError, json.JSONDecodeError) as exc:
        return "", "", [f"invalid relationship schema {label}: {exc}"]
    if not isinstance(value, dict):
        return "", "", [
            f"invalid relationship schema {label}: JSON root must be an object"
        ]
    schema_id = value.get("$id")
    if not contract_uri(schema_id):
        return "", "", [
            f"invalid relationship schema {label}: $id must be an absolute URI"
        ]
    digest = sha256_bytes(data)
    if schema_id != ASSERTION_SCHEMA_URL:
        return str(schema_id), digest, []
    try:
        reference = _reference_profile()
        expected = next(
            item
            for item in reference.files
            if item.path == "semantic-assertion.schema.json"
        )
    except (ValueError, StopIteration) as exc:
        return "", "", [
            f"canonical relationship schema reference is invalid: {exc}"
        ]
    if len(data) != expected.bytes or digest != expected.sha256:
        return "", "", [
            f"relationship schema {label} claims canonical $id but differs from "
            f"Explorer v{PROFILE_RELEASE_VERSION} bytes (bytes {len(data)}, sha256 {digest})"
        ]
    return str(schema_id), digest, []


def relationship_schema_errors(path: Path, label: str | None = None) -> list[str]:
    """Return identity and canonical-byte validation errors for one schema."""
    return inspect_relationship_schema(path, label)[2]


def contract_uri(value: Any) -> bool:
    if (
        not isinstance(value, str)
        or not value
        or value.strip() != value
        or not value.isascii()
        or any(character.isspace() or character in "\"'<>\\^`{|}" for character in value)
        or re.search(r"%(?![0-9A-Fa-f]{2})", value)
        or not ABSOLUTE_IRI.fullmatch(value)
    ):
        return False
    try:
        parsed = urlsplit(value)
        parsed_port = parsed.port
    except ValueError:
        return False
    if parsed.scheme.casefold() in {"http", "https"}:
        return bool(
            parsed.hostname
            and parsed.username is None
            and parsed.password is None
            and (parsed_port is None or 0 < parsed_port <= 65535)
        )
    return bool(parsed.scheme and (parsed.netloc or parsed.path))


def contract_string_list(value: Any, *, non_empty: bool = False) -> bool:
    return (
        isinstance(value, list)
        and (not non_empty or bool(value))
        and all(isinstance(item, str) and bool(item.strip()) for item in value)
        and len(value) == len(set(value))
    )


def contract_command_list(value: Any) -> bool:
    return contract_string_list(value) and all(
        all(ord(character) >= 0x20 and ord(character) != 0x7F for character in command)
        for command in value
    )


def safe_repository_path(
    value: Any,
    *,
    allow_glob: bool = False,
    allow_trailing_slash: bool = False,
) -> bool:
    """Return whether a contract path is a safe repository-relative path/pattern."""
    if (
        not isinstance(value, str)
        or not value
        or value.strip() != value
        or value.startswith(("/", "\\"))
        or "\\" in value
        or "\x00" in value
        or "#" in value
        or "%" in value
        or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", value)
    ):
        return False
    if not allow_glob and any(character in value for character in "*?["):
        return False
    if value.endswith("/"):
        if not allow_trailing_slash:
            return False
        value = value[:-1]
    if not value or "//" in value:
        return False
    for segment in value.split("/"):
        decoded = unquote(segment)
        if (
            not segment
            or segment in {".", ".."}
            or decoded in {".", ".."}
            or "/" in decoded
            or "\\" in decoded
            or "\x00" in decoded
            or any(ord(character) < 0x20 or ord(character) == 0x7F for character in decoded)
        ):
            return False
    return True


def contained_repository_path(repo: Path, value: str) -> Path:
    """Resolve one safe path and fail if a symlink or parent traversal escapes repo."""
    if not safe_repository_path(value):
        raise ValueError(f"unsafe repository-relative path: {value}")
    root = repo.resolve()
    candidate = (repo / value).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"repository path escapes its root: {value}") from exc
    return candidate


def contained_repository_matches(
    repo: Path,
    value: str,
    *,
    allow_trailing_slash: bool = False,
) -> list[Path]:
    """Resolve one declared path/glob under a bounded repository containment gate."""
    if not safe_repository_path(
        value,
        allow_glob=True,
        allow_trailing_slash=allow_trailing_slash,
    ):
        raise ValueError(f"unsafe repository-relative path or glob: {value}")
    pattern = value[:-1] if value.endswith("/") else value
    root = repo.resolve()

    # Resolve the non-glob prefix even when the pattern has no matches. This
    # catches a declaration that traverses an outward-pointing directory
    # symlink before glob expansion begins.
    prefix_parts: list[str] = []
    for part in pattern.split("/"):
        if any(character in part for character in "*?["):
            break
        prefix_parts.append(part)
    prefix = repo.joinpath(*prefix_parts).resolve()
    try:
        prefix.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"repository path escapes its root: {value}") from exc

    if not any(character in pattern for character in "*?["):
        return [prefix]

    paths: list[Path] = []
    for match_count, candidate in enumerate(repo.glob(pattern), start=1):
        if match_count > MAX_AUDIT_GLOB_MATCHES:
            raise ValueError(
                f"repository glob exceeds the {MAX_AUDIT_GLOB_MATCHES}-match audit limit: {value}"
            )
        resolved = candidate.resolve()
        try:
            resolved.relative_to(root)
        except ValueError as exc:
            raise ValueError(f"repository path escapes its root: {value}") from exc
        paths.append(resolved)
    return sorted(set(paths))


def unexpected_keys(value: dict[str, Any], allowed: set[str], label: str) -> list[str]:
    return [f"{label} has unsupported property: {key}" for key in sorted(set(value) - allowed)]


def contract_errors(contract: Any) -> list[str]:
    """Validate the complete portable contract without repository packages."""
    if not isinstance(contract, dict):
        return ["contract root must be an object"]
    errors: list[str] = []
    root_fields = {
        "schema",
        "repository",
        "okf_core",
        "semantic_layer",
        "relationship_contract",
        "tooling",
        "reader",
    }
    errors.extend(unexpected_keys(contract, root_fields, "contract"))
    if contract.get("schema") != "okf-repository-semantic-contract.v1":
        errors.append("schema must be okf-repository-semantic-contract.v1")

    objects: dict[str, dict[str, Any]] = {}
    for field in root_fields - {"schema"}:
        value = contract.get(field)
        if not isinstance(value, dict):
            errors.append(f"{field} must be an object")
            objects[field] = {}
        else:
            objects[field] = value

    repository = objects["repository"]
    for field in ("name", "root_index"):
        if not isinstance(repository.get(field), str) or not repository[field].strip():
            errors.append(f"repository.{field} must be a non-empty string")
    if repository.get("role") not in REPOSITORY_ROLES:
        errors.append(f"repository.role is not governed: {repository.get('role')}")
    if repository.get("root_index") and not safe_repository_path(
        repository.get("root_index")
    ):
        errors.append("repository.root_index must be a safe repository-relative file path")

    core = objects["okf_core"]
    errors.extend(unexpected_keys(core, {"version", "specification", "status"}, "okf_core"))
    if core.get("version") != "0.2":
        errors.append("okf_core.version must be 0.2")
    if not contract_uri(core.get("specification")):
        errors.append("okf_core.specification must be an absolute URI")
    if core.get("status") not in {"conformant", "migration", "fixture"}:
        errors.append(f"okf_core.status is not governed: {core.get('status')}")

    semantic = objects["semantic_layer"]
    semantic_fields = {
        "profile",
        "state",
        "authoritative_inputs",
        "outputs",
        "context_policy",
        "identity_policy",
        "limitations",
    }
    errors.extend(unexpected_keys(semantic, semantic_fields, "semantic_layer"))
    if not contract_uri(semantic.get("profile")):
        errors.append("semantic_layer.profile must be an absolute URI")
    if semantic.get("state") not in SEMANTIC_STATES:
        errors.append(f"semantic_layer.state is not governed: {semantic.get('state')}")
    if semantic.get("context_policy") != "pinned-local-contexts-no-browser-remote-expansion":
        errors.append("semantic_layer.context_policy is not the governed pinned-context policy")
    if semantic.get("identity_policy") != "absolute-semantic-iri-plus-validated-local-route":
        errors.append("semantic_layer.identity_policy is not the governed IRI/route policy")
    if not contract_string_list(semantic.get("authoritative_inputs"), non_empty=True):
        errors.append("semantic_layer.authoritative_inputs must be a non-empty unique string list")
    elif any(
        not safe_repository_path(
            item,
            allow_glob=True,
            allow_trailing_slash=True,
        )
        for item in semantic["authoritative_inputs"]
    ):
        errors.append(
            "semantic_layer.authoritative_inputs must contain only safe repository-relative paths or globs"
        )
    limitations = semantic.get("limitations", [])
    if not contract_string_list(limitations):
        errors.append("semantic_layer.limitations must be a unique string list")
    outputs = semantic.get("outputs")
    if not isinstance(outputs, list) or not outputs:
        errors.append("semantic_layer.outputs must be a non-empty list")
        outputs = []
    for index, declaration in enumerate(outputs):
        label = f"semantic_layer.outputs[{index}]"
        if not isinstance(declaration, dict):
            errors.append(f"{label} must be an object")
            continue
        errors.extend(
            unexpected_keys(
                declaration,
                {"path", "role", "generated", "required"},
                label,
            )
        )
        if not isinstance(declaration.get("path"), str) or not declaration["path"].strip():
            errors.append(f"{label}.path must be a non-empty string")
        elif not safe_repository_path(declaration["path"], allow_glob=True):
            errors.append(f"{label}.path must be a safe repository-relative path or glob")
        role = declaration.get("role")
        if role not in OUTPUT_ROLES:
            errors.append(f"{label}.role is not governed: {role}")
        if not isinstance(declaration.get("generated"), bool):
            errors.append(f"{label}.generated must be a boolean")
        if "required" in declaration and not isinstance(declaration.get("required"), bool):
            errors.append(f"{label}.required must be a boolean")

    relationship = objects["relationship_contract"]
    relationship_fields = {
        "schema",
        "authoring",
        "direct_triple_policy",
        "predicate_policy",
        "required_fields",
        "compatibility_policy",
        "runtime_projection_endpoints",
        "semantic_authority_endpoints",
    }
    errors.extend(unexpected_keys(relationship, relationship_fields, "relationship_contract"))
    if not contract_uri(relationship.get("schema")):
        errors.append("relationship_contract.schema must be an absolute URI")
    if relationship.get("authoring") not in RELATIONSHIP_AUTHORING_MODES:
        errors.append(
            "relationship_contract.authoring is not governed: "
            f"{relationship.get('authoring')}"
        )
    if relationship.get("direct_triple_policy") not in DIRECT_TRIPLE_POLICIES:
        errors.append(
            "relationship_contract.direct_triple_policy is not governed: "
            f"{relationship.get('direct_triple_policy')}"
        )
    if relationship.get("predicate_policy") != "absolute-iri":
        errors.append("relationship_contract.predicate_policy must be absolute-iri")
    if relationship.get("required_fields") != REQUIRED_RELATIONSHIP_FIELDS:
        errors.append("relationship_contract.required_fields differs from the governed v1 field set")
    compatibility_policy = relationship.get("compatibility_policy")
    if compatibility_policy not in {None, "legacy-sparse-okf-0.2-is-reader-compatibility-only"}:
        errors.append(
            "relationship_contract.compatibility_policy is not governed: "
            f"{compatibility_policy}"
        )
    runtime_endpoints = relationship.get("runtime_projection_endpoints")
    if runtime_endpoints is not None and runtime_endpoints != [
        "source",
        "target",
        "source_iri",
        "target_iri",
    ]:
        errors.append(
            "relationship_contract.runtime_projection_endpoints differs from "
            "the governed route/IRI boundary"
        )
    semantic_endpoints = relationship.get("semantic_authority_endpoints")
    if semantic_endpoints is not None and semantic_endpoints != ["source", "target"]:
        errors.append(
            "relationship_contract.semantic_authority_endpoints differs from "
            "the governed RDF boundary"
        )

    tooling = objects["tooling"]
    errors.extend(unexpected_keys(tooling, {"setup", "build", "check"}, "tooling"))
    for field in ("build", "check"):
        if not contract_command_list(tooling.get(field)):
            errors.append(
                f"tooling.{field} must be a unique list of printable command declarations"
            )
    if "setup" in tooling and not contract_command_list(tooling.get("setup")):
        errors.append(
            "tooling.setup must be a unique list of printable command declarations when declared"
        )

    reader = objects["reader"]
    errors.extend(unexpected_keys(reader, {"consumer", "delivery", "preserves"}, "reader"))
    if not contract_uri(reader.get("consumer")):
        errors.append("reader.consumer must be an absolute URI")
    if reader.get("delivery") not in READER_DELIVERY_MODES:
        errors.append(f"reader.delivery is not governed: {reader.get('delivery')}")
    if reader.get("preserves") != READER_FIELDS:
        errors.append("reader.preserves differs from the governed v1 field set")
    return errors


def read_bounded_text(path: Path) -> str:
    """Read plain or gzip text with both on-disk and decoded byte ceilings."""
    try:
        size = path.stat().st_size
        if size > MAX_AUDIT_FILE_BYTES:
            raise ArtifactReadError(
                f"file is {size} bytes; audit limit is {MAX_AUDIT_FILE_BYTES} bytes"
            )
        opener = gzip.open if path.suffix.casefold() == ".gz" else open
        with opener(path, "rb") as handle:
            data = handle.read(MAX_AUDIT_DECODED_BYTES + 1)
        if len(data) > MAX_AUDIT_DECODED_BYTES:
            raise ArtifactReadError(
                f"decoded document exceeds the {MAX_AUDIT_DECODED_BYTES}-byte audit limit"
            )
        return data.decode("utf-8", errors="strict")
    except ArtifactReadError:
        raise
    except (OSError, EOFError, UnicodeError) as exc:
        raise ArtifactReadError(str(exc)) from exc


def validate_semantic_document(path: Path) -> str:
    """Perform a dependency-free representation check before local deep checks."""
    try:
        text = read_bounded_text(path)
    except ArtifactReadError as exc:
        return str(exc)
    if not text.strip():
        return "document is empty"
    if path.name.casefold().endswith((".jsonld", ".jsonld.gz")) or text.lstrip().startswith(("{", "[")):
        try:
            value = json.loads(text)
        except json.JSONDecodeError as exc:
            return str(exc)
        if not isinstance(value, (dict, list)):
            return "JSON-LD root must be an object or array"
        return ""
    if re.search(r"(?m)^---\s*$", text):
        return "YAML-LD must contain one document without stream separators"
    if re.search(r"(?m)(?:^|[\s\[{,])!![^\s]+", text):
        return "explicit YAML tags are not allowed"
    if not re.search(r"(?m)^[\"']?@context[\"']?\s*:", text):
        return "YAML-LD document does not declare @context"
    return ""


def matching_paths(repo: Path, pattern: str) -> list[Path]:
    paths = contained_repository_matches(repo, pattern)
    return [path for path in paths if path.is_file()]


def read_relationship_rows(path: Path) -> list[dict[str, Any]]:
    try:
        value = json.loads(read_bounded_text(path))
    except json.JSONDecodeError as exc:
        raise ArtifactReadError(f"invalid JSON: {exc}") from exc
    if isinstance(value, list):
        if any(not isinstance(item, dict) for item in value):
            raise ArtifactReadError("relationship array contains a non-object row")
        return value
    if isinstance(value, dict):
        if "relationships" in value:
            relationships = value["relationships"]
            if not isinstance(relationships, list) or any(
                not isinstance(item, dict) for item in relationships
            ):
                raise ArtifactReadError("relationships must be an array of objects")
            return relationships
        rows: list[dict[str, Any]] = []
        for items in value.values():
            if isinstance(items, list):
                invalid = [
                    item
                    for item in items
                    if not isinstance(item, dict)
                    or "source" not in item
                    or "target" not in item
                ]
                if invalid:
                    raise ArtifactReadError(
                        "relationship adjacency contains a malformed row"
                    )
                rows.extend(items)
        if rows or not value:
            return rows
        raise ArtifactReadError("JSON object has no recognizable relationship rows")
    raise ArtifactReadError("relationship JSON root must be an object or array")


def read_semantic_assertions(path: Path) -> list[dict[str, Any]]:
    try:
        value = json.loads(read_bounded_text(path))
    except json.JSONDecodeError as exc:
        raise ArtifactReadError(f"invalid JSON: {exc}") from exc
    nodes: list[Any]
    if isinstance(value, dict) and "@graph" in value:
        if not isinstance(value["@graph"], list):
            raise ArtifactReadError("JSON-LD @graph must be an array")
        nodes = value["@graph"]
    elif isinstance(value, list):
        nodes = value
    elif isinstance(value, dict):
        nodes = [value]
    else:
        raise ArtifactReadError("semantic JSON root must be an object or array")
    assertions: list[dict[str, Any]] = []
    for node in nodes:
        if not isinstance(node, dict):
            continue
        types = node.get("@type")
        type_values = types if isinstance(types, list) else [types]
        if node.get("schema") in {
            "okf-relationship-assertion.v2",
            "okf-relationship-assertion.v3",
        } or any(
            isinstance(value, str) and value.endswith("RelationshipAssertion")
            for value in type_values
        ):
            assertions.append(node)
    return assertions


def semantic_iri(value: Any) -> str:
    if isinstance(value, dict):
        value = value.get("@id")
    return str(value or "") if ABSOLUTE_IRI.fullmatch(str(value or "")) else ""


def safe_http_url(value: Any) -> str:
    if not isinstance(value, str) or not value or value.strip() != value:
        return ""
    if (
        not value.isascii()
        or any(character.isspace() or character in "\"'<>\\^`{|}" for character in value)
        or re.search(r"%(?![0-9A-Fa-f]{2})", value)
    ):
        return ""
    try:
        parsed = urlsplit(value)
        parsed_port = parsed.port
    except ValueError:
        return ""
    if (
        parsed.scheme.casefold() not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed_port is not None and not 0 < parsed_port <= 65535
    ):
        return ""
    return value


def semantic_assertion_errors(row: dict[str, Any], label: str) -> list[str]:
    errors: list[str] = []
    required = (
        "@id",
        "@type",
        "source",
        "predicate",
        "target",
        "kind",
        "label",
        "inverse_label",
        "assertion_status",
        "assertion_scope",
        "authority",
        "derivation",
        "observed_at",
        "evidence",
        "rights",
    )
    missing = [field for field in required if row.get(field) in (None, "", [])]
    if missing:
        errors.append(f"{label} lacks shared semantic fields: {', '.join(missing)}")
        return errors
    for field in ("@id", "source", "predicate", "target", "derivation"):
        if not semantic_iri(row.get(field)):
            errors.append(f"{label} {field} is not an absolute semantic IRI")
    status = str(row.get("assertion_status"))
    scope = str(row.get("assertion_scope"))
    if status not in {"official", "normalized", "inferred", "model-derived"}:
        errors.append(f"{label} assertion_status is not governed: {status}")
    if scope not in {"real-world", "synthetic-fixture"}:
        errors.append(f"{label} assertion_scope is not governed: {scope}")
    authority = row.get("authority")
    if not isinstance(authority, dict):
        errors.append(f"{label} authority is not an object")
    else:
        authority_class = str(authority.get("class") or "")
        if authority_class not in {
            "official",
            "derived",
            "model-assisted",
            "synthetic",
            "unclassified",
        }:
            errors.append(f"{label} authority class is not governed: {authority_class}")
        if not str(authority.get("label") or "").strip() or not safe_http_url(authority.get("source")):
            errors.append(f"{label} authority lacks a label or canonical credential-free HTTP(S) source URL")
        expected_authority = {
            ("real-world", "official"): "official",
            ("real-world", "normalized"): "derived",
            ("real-world", "inferred"): "derived",
            ("real-world", "model-derived"): "model-assisted",
        }.get((scope, status))
        if scope == "synthetic-fixture":
            expected_authority = "synthetic"
        if expected_authority and authority_class != expected_authority:
            errors.append(
                f"{label} authority {authority_class} conflicts with {scope}/{status}"
            )
    evidence = row.get("evidence")
    if not isinstance(evidence, list) or not evidence:
        errors.append(f"{label} evidence is not a non-empty array")
    else:
        for index, item in enumerate(evidence):
            if not isinstance(item, dict):
                errors.append(f"{label} evidence {index} is not an object")
                continue
            evidence_required = (
                "@id",
                "type",
                "url",
                "source_field",
                "source_value_sha256",
                "retrieved_at",
            )
            evidence_missing = [
                field for field in evidence_required if item.get(field) in (None, "")
            ]
            if evidence_missing:
                errors.append(
                    f"{label} evidence {index} lacks shared fields: {', '.join(evidence_missing)}"
                )
            if item.get("@id") and not semantic_iri(item.get("@id")):
                errors.append(f"{label} evidence {index} @id is not an absolute IRI")
            if item.get("url") and not safe_http_url(item.get("url")):
                errors.append(f"{label} evidence {index} URL is not canonical credential-free HTTP(S)")
            digest = str(item.get("source_value_sha256") or "")
            if digest and not re.fullmatch(r"[0-9a-f]{64}", digest):
                errors.append(f"{label} evidence {index} source value digest is malformed")
            if item.get("resource") not in (None, "") and not safe_http_url(item.get("resource")):
                errors.append(
                    f"{label} evidence {index} resource is not canonical credential-free HTTP(S)"
                )
            for field in ("normalization", "rule_id"):
                if item.get(field) not in (None, "") and not semantic_iri(item.get(field)):
                    errors.append(
                        f"{label} evidence {index} {field} is not an absolute semantic IRI"
                    )
            for field in ("source_sha256", "literal_sha256"):
                optional_digest = str(item.get(field) or "")
                if optional_digest and not re.fullmatch(r"[0-9a-f]{64}", optional_digest):
                    errors.append(
                        f"{label} evidence {index} {field} digest is malformed"
                    )
    rights = row.get("rights")
    if not isinstance(rights, dict):
        errors.append(f"{label} rights is not an object")
    elif not safe_http_url(rights.get("source")) or not str(rights.get("assertion") or "").strip():
        errors.append(f"{label} rights lacks a canonical credential-free HTTP(S) source URL or assertion")
    if status == "inferred":
        for field in ("rule", "supporting_assertions", "confidence_score", "derivation_activity"):
            if row.get(field) in (None, "", []):
                errors.append(f"{label} inferred assertion lacks {field}")
    if status == "model-derived":
        for field in ("confidence_score", "derivation_activity", "review_status"):
            if row.get(field) in (None, "", []):
                errors.append(f"{label} model-derived assertion lacks {field}")
    for field in ("rule", "derivation_activity"):
        if row.get(field) not in (None, "") and not semantic_iri(row.get(field)):
            errors.append(f"{label} {field} is not an absolute semantic IRI")
    supporting = row.get("supporting_assertions")
    if supporting not in (None, ""):
        if not isinstance(supporting, list) or not supporting:
            errors.append(f"{label} supporting_assertions is not a non-empty array")
        elif any(not semantic_iri(item) for item in supporting):
            errors.append(f"{label} supporting_assertions contains a non-IRI value")
    confidence = row.get("confidence_score")
    if confidence is not None and (
        not isinstance(confidence, (int, float))
        or isinstance(confidence, bool)
        or not 0 <= confidence <= 1
    ):
        errors.append(f"{label} confidence_score is not a number from 0 to 1")
    return errors


def audit_repo(repo: Path, *, strict: bool = False) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    contract_path = repo / CONTRACT_NAME
    if not contract_path.is_file():
        return {"repository": repo.name, "path": str(repo), "status": "non-conformant", "errors": [f"missing {CONTRACT_NAME}"], "warnings": []}
    try:
        contract = json.loads(read_bounded_text(contract_path))
    except (ArtifactReadError, json.JSONDecodeError) as exc:
        return {"repository": repo.name, "path": str(repo), "status": "non-conformant", "errors": [f"invalid {CONTRACT_NAME}: {exc}"], "warnings": []}
    if not isinstance(contract, dict):
        return {
            "repository": repo.name,
            "path": str(repo),
            "status": "non-conformant",
            "errors": [f"invalid {CONTRACT_NAME}: contract root must be an object"],
            "warnings": [],
        }
    errors.extend(contract_errors(contract))
    semantic_layer = contract.get("semantic_layer")
    if not isinstance(semantic_layer, dict):
        semantic_layer = {}
    repository_contract = contract.get("repository")
    if not isinstance(repository_contract, dict):
        repository_contract = {}
    relationship_contract = contract.get("relationship_contract")
    if not isinstance(relationship_contract, dict):
        relationship_contract = {}

    claimed_profile = semantic_layer.get("profile")
    profile_errors: list[str] = []
    if claimed_profile == PROFILE_URL:
        profile_errors = profile_mirror_errors(repo)
        errors.extend(profile_errors)
    authoritative_inputs = semantic_layer.get("authoritative_inputs", [])
    if isinstance(authoritative_inputs, list):
        for declaration in authoritative_inputs:
            if not isinstance(declaration, str):
                continue
            try:
                contained_repository_matches(
                    repo,
                    declaration,
                    allow_trailing_slash=True,
                )
            except (OSError, ValueError) as exc:
                errors.append(
                    f"invalid declared authoritative input path {declaration}: {exc}"
                )
    root_index_value = str(repository_contract.get("root_index") or "index.md")
    if safe_repository_path(root_index_value):
        try:
            root_index = contained_repository_path(repo, root_index_value)
        except ValueError as exc:
            errors.append(str(exc))
        else:
            if not root_index.is_file():
                errors.append(f"missing OKF root index: {root_index_value}")
            else:
                try:
                    prefix = read_bounded_text(root_index)[:4096]
                except ArtifactReadError as exc:
                    errors.append(f"invalid OKF root index {root_index_value}: {exc}")
                else:
                    if not re.search(
                        r"(?m)^okf_version:\s*[\"']?0\.2[\"']?\s*$",
                        prefix,
                    ):
                        errors.append(
                            f"{root_index_value} does not declare okf_version: 0.2"
                        )

    sampled_relationships = 0
    sampled_semantic_assertions = 0
    relation_files = 0
    semantic_files = 0
    relationship_schemas = 0
    declared_relationship_schemas: dict[str, tuple[str, str]] = {}
    semantic_assertion_paths_checked: set[Path] = set()
    outputs = semantic_layer.get("outputs", [])
    semantic_state = str(semantic_layer.get("state") or "unknown")
    if semantic_state in {"descriptor-yaml-ld", "migration"}:
        warnings.append(
            f"semantic state {semantic_state} has not reached a relationship-authoritative YAML-LD graph"
        )
    for declaration in outputs if isinstance(outputs, list) else []:
        if not isinstance(declaration, dict):
            continue
        pattern = str(declaration.get("path") or "")
        try:
            paths = matching_paths(repo, pattern)
        except (OSError, ValueError) as exc:
            errors.append(f"invalid declared output path {pattern}: {exc}")
            continue
        if not paths:
            message = f"declared {'required ' if declaration.get('required', True) else 'future '}output is absent: {pattern}"
            (errors if declaration.get("required", True) else warnings).append(message)
            continue
        role = declaration.get("role")
        if role in {
            "semantic-yaml-ld",
            "semantic-json-ld",
            "semantic-json-ld-shards",
            "semantic-context",
        }:
            invalid_semantic_paths: set[Path] = set()
            for path in paths[:3]:
                semantic_files += 1
                semantic_error = validate_semantic_document(path)
                if semantic_error:
                    errors.append(f"invalid semantic document {path.relative_to(repo)}: {semantic_error}")
                    invalid_semantic_paths.add(path)
            assertion_candidates = [path for path in paths if "assertion" in path.name.casefold()]
            for path in (assertion_candidates or paths)[:3]:
                if (
                    path in semantic_assertion_paths_checked
                    or path in invalid_semantic_paths
                    or path.name.endswith(".yamlld")
                ):
                    continue
                semantic_assertion_paths_checked.add(path)
                try:
                    assertion_rows = read_semantic_assertions(path)
                except ArtifactReadError as exc:
                    errors.append(
                        f"invalid semantic assertion document {path.relative_to(repo)}: {exc}"
                    )
                    continue
                for index, row in enumerate(assertion_rows[:100]):
                    sampled_semantic_assertions += 1
                    errors.extend(
                        semantic_assertion_errors(
                            row,
                            f"{path.relative_to(repo)} semantic assertion {index}",
                        )
                    )
        if role == "explorer-runtime":
            for path in paths[:3]:
                try:
                    descriptor = read_json(path)
                except (ArtifactReadError, json.JSONDecodeError) as exc:
                    errors.append(f"invalid runtime descriptor {path.relative_to(repo)}: {exc}")
                    continue
                if not isinstance(descriptor, dict):
                    errors.append(
                        f"invalid runtime descriptor {path.relative_to(repo)}: "
                        "JSON root must be an object"
                    )
                    continue
                version = descriptor.get("okf_version")
                if version is not None and str(version) != "0.2":
                    errors.append(f"{path.relative_to(repo)} declares OKF {version}, expected 0.2")
        if role == "relationship-schema":
            for path in paths:
                relationship_schemas += 1
                schema_id, schema_digest, schema_errors = inspect_relationship_schema(
                    path, path.relative_to(repo).as_posix()
                )
                errors.extend(schema_errors)
                if schema_id and not schema_errors:
                    relative_path = path.relative_to(repo).as_posix()
                    previous = declared_relationship_schemas.get(schema_id)
                    if previous is not None and previous[0] != schema_digest:
                        errors.append(
                            "relationship-schema outputs claim one ambiguous $id "
                            f"with differing bytes: {schema_id} "
                            f"({previous[1]} sha256 {previous[0]}; "
                            f"{relative_path} sha256 {schema_digest})"
                        )
                    else:
                        declared_relationship_schemas.setdefault(
                            schema_id,
                            (schema_digest, relative_path),
                        )
        if role == "relationship-runtime":
            relation_files += len(paths)
            for path in paths[:3]:
                try:
                    relationship_rows = read_relationship_rows(path)
                except ArtifactReadError as exc:
                    errors.append(
                        f"invalid relationship runtime {path.relative_to(repo)}: {exc}"
                    )
                    continue
                for row in relationship_rows[:100]:
                    sampled_relationships += 1
                    missing = [field for field in REQUIRED_RELATIONSHIP_FIELDS if row.get(field) in (None, "", [])]
                    if missing:
                        warnings.append(f"{path.relative_to(repo)} relationship lacks rich fields: {', '.join(missing)}")
                    predicate = str(row.get("predicate") or "")
                    if predicate and not ABSOLUTE_IRI.fullmatch(predicate):
                        warnings.append(f"{path.relative_to(repo)} relationship predicate is not an absolute IRI: {predicate}")
                    for field in ("source", "target"):
                        value = str(row.get(field) or "")
                        if value and (
                            ABSOLUTE_IRI.fullmatch(value)
                            or not LOCAL_RUNTIME_ID.fullmatch(value)
                            or any(part in {"", ".", ".."} for part in value.split("/"))
                        ):
                            warnings.append(
                                f"{path.relative_to(repo)} relationship {field} is not a safe local runtime identity: {value}"
                            )
                    for field in ("source_iri", "target_iri"):
                        value = str(row.get(field) or "")
                        if value and not ABSOLUTE_IRI.fullmatch(value):
                            warnings.append(f"{path.relative_to(repo)} {field} is not an absolute IRI: {value}")
    contract_schema = relationship_contract.get("schema")
    schema_is_available = contract_schema in declared_relationship_schemas or (
        contract_schema == ASSERTION_SCHEMA_URL
        and claimed_profile == PROFILE_URL
        and not profile_errors
    )
    if contract_uri(contract_schema) and not schema_is_available:
        errors.append(
            "relationship_contract.schema has no exact declared relationship-schema "
            f"output or qualifying canonical profile mirror: {contract_schema}"
        )
    warning_total = len(set(warnings))
    warnings = sorted(set(warnings))
    if len(warnings) > 100:
        warnings = [*warnings[:100], f"{len(warnings) - 100} additional distinct migration warnings omitted"]
    if strict and warnings:
        errors.extend(f"strict: {warning}" for warning in warnings)
    errors = sorted(set(errors))
    error_total = len(errors)
    if len(errors) > 100:
        errors = [*errors[:100], f"{len(errors) - 100} additional distinct errors omitted"]
    status = "conformant" if not errors and not warnings else "migration" if not errors else "non-conformant"
    return {
        "repository": repo.name,
        "path": str(repo),
        "status": status,
        "semantic_state": semantic_state,
        "semantic_documents_checked": semantic_files,
        "relationship_schemas_checked": relationship_schemas,
        "relationship_files_declared": relation_files,
        "relationship_rows_sampled": sampled_relationships,
        "semantic_assertions_sampled": sampled_semantic_assertions,
        "migration_warning_count": warning_total,
        "validation_error_count": error_total,
        "errors": errors,
        "warnings": warnings,
    }


def selected_repositories(args: argparse.Namespace) -> Iterable[Path]:
    if args.repo:
        yield Path(args.repo).expanduser().resolve()
        return
    root = Path(args.repos_root).expanduser().resolve()
    for name in PRESETS:
        yield root / name


def preflight_install(repo: Path) -> InstallPlan:
    """Render and validate one contract install without writing any files."""
    preset = PRESETS.get(repo.name)
    if preset is None:
        raise ValueError(f"no reviewed reconciliation preset for {repo.name}")
    if not repo.is_dir():
        raise ValueError(
            f"repository does not exist: {repo}; initialise it before installing a contract"
        )
    if repo.name == "okf-testing" and not (
        repo / "fixtures" / "expectations.json"
    ).is_file():
        raise ValueError(
            "okf-testing is not initialised with the executable fixture corpus"
        )
    for relative in (Path(CONTRACT_NAME), Path("AGENTS.md")):
        linked = _symlink_component(repo, relative)
        if linked:
            raise ValueError(f"refusing to follow an install destination symlink: {linked}")
        destination = repo / relative
        if destination.exists() and not destination.is_file():
            raise ValueError(
                f"install destination is not a regular file: {relative}"
            )
    contract_text = (
        json.dumps(
            contract_for(repo.name, preset),
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n"
    )
    return InstallPlan(
        repo=repo,
        contract_text=contract_text,
        agent_text=render_agent_guidance(repo / "AGENTS.md"),
    )


def apply_install(plan: InstallPlan) -> None:
    """Write one fully rendered install plan after rechecking fixed destinations."""
    for relative, text in (
        (Path(CONTRACT_NAME), plan.contract_text),
        (Path("AGENTS.md"), plan.agent_text),
    ):
        linked = _symlink_component(plan.repo, relative)
        if linked:
            raise ValueError(
                f"refusing to follow an install destination symlink: {linked}"
            )
        _atomic_write_bytes(plan.repo / relative, text.encode("utf-8"))


def install(repo: Path) -> None:
    """Install one reviewed contract after a complete read-only preflight."""
    apply_install(preflight_install(repo))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", help="audit one repository instead of the reviewed okf-* set")
    parser.add_argument("--repos-root", default=str(Path.home() / "repos"))
    parser.add_argument("--install", action="store_true", help="write reviewed contracts and bounded AGENTS.md blocks")
    parser.add_argument(
        "--sync-profile",
        action="store_true",
        help="install the byte-exact canonical profile mirror and adjacent vendor lock",
    )
    parser.add_argument(
        "--replace-profile",
        action="store_true",
        help="with --sync-profile, replace divergent or extra regular profile files",
    )
    parser.add_argument("--strict", action="store_true", help="treat migration warnings as failures")
    parser.add_argument(
        "--report",
        help="write the JSON report atomically outside every audited repository",
    )
    args = parser.parse_args(argv)
    if args.replace_profile and not args.sync_profile:
        parser.error("--replace-profile requires --sync-profile")

    repositories = list(selected_repositories(args))
    try:
        report_path = (
            preflight_report_destination(args.report, repositories)
            if args.report
            else None
        )
        reference = _reference_profile() if args.sync_profile else None
        install_plans = (
            tuple(preflight_install(repo) for repo in repositories)
            if args.install
            else ()
        )
        sync_plans = (
            tuple(
                preflight_sync_profile(
                    repo,
                    replace=args.replace_profile,
                    reference=reference,
                )
                for repo in repositories
            )
            if args.sync_profile
            else ()
        )
        for plan in install_plans:
            apply_install(plan)
        for plan in sync_plans:
            apply_profile_sync(plan)
        results = [audit_repo(repo, strict=args.strict) for repo in repositories]
        report = {
            "schema": "okf-repository-reconciliation-report.v1",
            "profile": PROFILE_URL,
            "contract_schema": CONTRACT_SCHEMA_URL,
            "repositories": results,
            "summary": {
                "repositories": len(results),
                "conformant": sum(item["status"] == "conformant" for item in results),
                "migration": sum(item["status"] == "migration" for item in results),
                "non_conformant": sum(
                    item["status"] == "non-conformant" for item in results
                ),
            },
        }
        rendered = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
        if report_path is not None:
            if report_path.is_symlink() or (
                report_path.exists() and not report_path.is_file()
            ):
                raise ValueError(
                    f"report destination changed after preflight: {report_path}"
                )
            _atomic_write_bytes(report_path, rendered.encode("utf-8"))
    except (ArtifactReadError, OSError, UnicodeError, ValueError) as exc:
        print(f"reconciliation failed: {exc}", file=sys.stderr)
        return 2
    print(rendered, end="")
    return 1 if report["summary"]["non_conformant"] else 0


if __name__ == "__main__":
    sys.exit(main())
