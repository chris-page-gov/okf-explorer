#!/usr/bin/env python3
"""Plan, create, or check a fail-safe OKF repository bootstrap.

The default action is a dry run.  The tool writes only repository foundations;
it never creates a remote, pushes, publishes, or enables CI.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


SEMANTIC_CONTRACT = {
    "schema": "okf-repository-semantic-contract.v1",
    "repository": {
        "name": "okf-bundle",
        "role": "governed-producer",
        "root_index": "README.md",
    },
    "okf_core": {
        "version": "0.2",
        "specification": "https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md",
        "status": "migration",
    },
    "semantic_layer": {
        "profile": "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/",
        "state": "migration",
        "authoritative_inputs": ["source/"],
        "outputs": [],
        "context_policy": "pinned-local-contexts-no-browser-remote-expansion",
        "identity_policy": "absolute-semantic-iri-plus-validated-local-route",
        "limitations": [
            "The bootstrap declares a migration boundary only; no semantic corpus or assertion has been reviewed."
        ],
    },
    "relationship_contract": {
        "schema": "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-assertion.schema.json",
        "authoring": "runtime-assertion-migration",
        "direct_triple_policy": "migration-pending",
        "predicate_policy": "absolute-iri",
        "required_fields": [
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
        ],
    },
    "tooling": {"setup": [], "build": [], "check": []},
    "reader": {
        "consumer": "https://chris-page-gov.github.io/okf-explorer/",
        "delivery": "yaml-ld-small-graph",
        "preserves": [
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
        ],
    },
}

PUBLICATION_CONTRACT = {
    "schema": "okf-repository-publication-contract.v1",
    "modified": "2026-08-18",
    "locale": "en-GB",
    "time_zone": "Europe/London",
    "repository": {
        "name": "okf-bundle",
        "url": "https://example.invalid/replace-after-repository-review",
        "role": "governed-producer",
        "root_index": "README.md",
        "lifecycle": "bootstrap",
    },
    "semantic_contract": {
        "path": "okf.semantic.json",
        "profile": "https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/",
    },
    "source_families": [
        {
            "id": "repository-foundations",
            "label": "Repository foundations",
            "description": "Authored bootstrap documentation awaiting domain review.",
            "kind": "markdown-tree",
            "paths": ["source/**", "README.md", "REPOSITORY_STATUS.md"],
            "formats": ["text/markdown"],
            "origin": "authored",
            "authority": "not-assessed",
            "snapshot_policy": "pinned-revision",
            "inventory": {
                "method": "pinned-source-register",
                "manifest_path": "source/README.md",
                "identity": ["relative-path", "source-identifier"],
            },
            "rights": {"status": "not-evaluated", "evidence": []},
            "sensitivity": {
                "status": "not-assessed",
                "assessment": "Domain content has not been admitted to the bootstrap.",
                "evidence": [],
            },
            "extraction": {
                "mode": "none",
                "network_access": "prohibited",
                "command_ids": [],
                "limitations": ["Acquisition and generation remain disabled."],
            },
            "invalidates": ["source", "documentation"],
            "limitations": [
                "Replace this family with reviewed domain inputs before enabling CI or publication."
            ],
        }
    ],
    "boundaries": {
        "authored": [
            {"path": "source/**", "role": "content", "source_family_id": "repository-foundations"},
            {"path": "README.md", "role": "documentation", "source_family_id": "repository-foundations"},
            {"path": "REPOSITORY_STATUS.md", "role": "documentation", "source_family_id": "repository-foundations"},
            {"path": "CHANGELOG.md", "role": "changelog"},
            {"path": "okf.semantic.json", "role": "policy"},
            {"path": "okf.publication.json", "role": "publication-contract"},
            {"path": ".github/workflows/**", "role": "workflow"},
        ],
        "generated": [],
    },
    "planes": [
        {
            "id": "source",
            "depends_on": [],
            "paths": ["source/**", "okf.semantic.json", "okf.publication.json"],
            "command_ids": ["check-scaffold"],
        },
        {
            "id": "documentation",
            "depends_on": ["source"],
            "paths": ["README.md", "REPOSITORY_STATUS.md", "CHANGELOG.md"],
            "command_ids": ["check-scaffold"],
        },
    ],
    "tooling": {
        "commands": [
            {
                "id": "check-scaffold",
                "kind": "check",
                "planes": ["source", "documentation"],
                "command": "git diff --check",
                "source": "AGENTS.md",
                "review_status": "reviewed-local-guidance",
                "network": "none",
                "mutates": "none",
                "timeout_minutes": 5,
            }
        ]
    },
    "lockstep": {
        "controlled_paths": ["source/**", "generated/**", ".github/workflows/**", "okf.semantic.json", "okf.publication.json"],
        "documentation_paths": ["README.md", "REPOSITORY_STATUS.md", "CHANGELOG.md"],
        "changelog_path": "CHANGELOG.md",
        "check_command_id": "check-scaffold",
        "dependency_update_policy": "assess-release-bound-bytes-no-blanket-exemption",
        "unknown_path_policy": "fail-closed",
    },
    "ci": {
        "provider": "none",
        "workflow_paths": [],
        "impact_routing": "not-applicable",
        "parallelism": "not-applicable",
        "unknown_path_policy": "not-applicable",
        "browser": {
            "ordinary": {"policy": "not-applicable", "engines": [], "command_ids": []},
            "cross_engine": {
                "policy": "not-applicable",
                "engines": [],
                "command_ids": [],
                "installation": {"policy": "none", "command_ids": []},
            },
        },
    },
    "publication": {
        "mode": "none",
        "scope": "unpublished",
        "authority": {
            "decision": "Publication is disabled until repository and domain review.",
            "evidence_paths": ["REPOSITORY_STATUS.md"],
        },
        "candidate_policy": "promote-exact-assured-bytes-without-rebuild",
        "targets": [],
    },
    "verification": {
        "required": False,
        "browser": "not-applicable",
        "exact_commit_required": False,
        "identity_checks": [],
        "journeys": [],
        "console_policy": "not-applicable",
        "command_ids": [],
    },
    "limitations": [
        "The placeholder repository URL, source family and command set must be replaced during review.",
        "A schema-valid bootstrap does not authorise acquisition, generation, CI or publication.",
    ],
}


FILES = {
    ".gitignore": """# Operating-system and editor debris
.DS_Store
~$*
*.swp

# Local environments and caches
.venv/
__pycache__/
.pytest_cache/

# Generated publication output
_site/
generated/
release-assurance/tmp/
""",
    "AGENTS.md": """# Repository Instructions

- Treat Markdown and files under `source/` as authored source of truth.
- Do not edit `generated/` or release evidence by hand.
- Preserve unrelated work and use feature branches and pull requests.
- Keep CI disabled until the bootstrap and domain profile are reviewed.
- Read `okf.semantic.json` and `okf.publication.json` before admitting source
  material or enabling any build, CI or publication command.
- Keep documentation and `CHANGELOG.md` in lockstep with controlled changes.
- Never create remotes, push, publish, or spend money implicitly.
""",
    "README.md": """# OKF bundle

Status: repository bootstrap only; acquisition, generation, CI and publication
are disabled until the domain profile and bootstrap evidence are reviewed.

This initialization commit deliberately contains no corpus, generated bundle,
or release evidence. Domain and build work belongs on a feature branch and is
merged through review.
""",
    "CHANGELOG.md": """# Changelog

## Unreleased

- Created a disabled OKF repository bootstrap with explicit semantic and
  publication migration boundaries.
""",
    "okf.semantic.json": json.dumps(SEMANTIC_CONTRACT, indent=2) + "\n",
    "okf.publication.json": json.dumps(PUBLICATION_CONTRACT, indent=2) + "\n",
    "SECURITY.md": """# Security

Report suspected vulnerabilities privately to the repository owner. Do not
include secrets, personal data, exploit payloads, or restricted source
material in a public issue.

All acquired content is untrusted input. Publication remains disabled until
the repository's validation and release controls have been reviewed.
""",
    "LICENSE_DECISIONS.md": """# Licensing decisions

No licence is inferred by this bootstrap. Record separately:

- the licence for repository-authored code and documentation;
- the rights basis for every acquired source family;
- redistribution constraints for snapshots and generated projections; and
- the reviewer and evidence for each decision.
""",
    "REPOSITORY_STATUS.md": """# Repository status

- Lifecycle: initialization only
- Acquisition: disabled
- Generation: disabled
- CI: scaffolded but disabled
- Remote creation, push and publication: never performed by the scaffolder
- Next gate: review this bootstrap, make the initialization-only default-branch
  commit, configure required checks, then open domain work on a feature branch
""",
    "source/README.md": """# Authored and acquired source

Keep authored inputs and immutable acquired envelopes here. Document source
identity, observation time, rights, freshness and checksums before generation.
""",
    "generated/README.md": """# Generated boundary

Everything below this directory is reproducible output. Do not patch generated
files by hand; rebuild them from the documented source and pinned tooling.
""",
    ".github/workflows/okf-ci.yml.disabled": """# Rename to okf-ci.yml only after bootstrap review.
name: OKF validation (disabled)
on:
  workflow_dispatch:
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Replace with pinned repository validation commands"
""",
}


@dataclass(frozen=True)
class TargetState:
    classification: str
    exists: bool
    non_empty: bool
    git_repository: bool
    dirty: bool | None


def git_output(target: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(target), *arguments],
        check=False,
        capture_output=True,
        text=True,
    )


def classify_target(target: Path) -> TargetState:
    exists = target.exists()
    if exists and not target.is_dir():
        raise ValueError(f"target is not a directory: {target}")
    non_empty = exists and next(target.iterdir(), None) is not None
    git_repository = exists and git_output(
        target, "rev-parse", "--is-inside-work-tree"
    ).returncode == 0
    dirty: bool | None = None
    if git_repository:
        dirty = bool(git_output(target, "status", "--porcelain").stdout.strip())
        classification = "existing"
    elif non_empty:
        classification = "imported"
    else:
        classification = "empty-new"
    return TargetState(classification, exists, non_empty, git_repository, dirty)


def planned_changes(target: Path) -> tuple[list[str], list[str]]:
    create: list[str] = []
    preserve: list[str] = []
    for relative in FILES:
        if (target / relative).exists():
            preserve.append(relative)
        else:
            create.append(relative)
    return create, preserve


def refusal_reason(state: TargetState, adopt_existing: bool) -> str | None:
    if not adopt_existing and state.non_empty:
        detail = "dirty " if state.dirty else ""
        return (
            f"refusing {detail}non-empty {state.classification} target without "
            "--adopt-existing"
        )
    return None


def apply_scaffold(target: Path, create: list[str]) -> None:
    target.mkdir(parents=True, exist_ok=True)
    for relative in create:
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(FILES[relative], encoding="utf-8")


def check_scaffold(target: Path) -> list[str]:
    errors: list[str] = []
    if not target.is_dir():
        return [f"target directory does not exist: {target}"]
    for relative, expected in FILES.items():
        path = target / relative
        if not path.is_file():
            errors.append(f"missing bootstrap file: {relative}")
        elif path.read_text(encoding="utf-8") != expected:
            errors.append(f"bootstrap file differs from the reviewed scaffold: {relative}")
    workflows = target / ".github" / "workflows"
    if workflows.is_dir():
        enabled = sorted(
            path.relative_to(target).as_posix()
            for pattern in ("*.yml", "*.yaml")
            for path in workflows.glob(pattern)
        )
        errors.extend(f"CI is enabled before validation: {path}" for path in enabled)
    return errors


def render(state: TargetState, target: Path, create: list[str], preserve: list[str]) -> str:
    return json.dumps(
        {
            "schema": "okf-repository-bootstrap-plan.v1",
            "target": str(target),
            "classification": state.classification,
            "git_repository": state.git_repository,
            "dirty": state.dirty,
            "create": create,
            "preserve": preserve,
            "implicit_actions": {
                "git_init": False,
                "commit": False,
                "remote": False,
                "push": False,
                "publish": False,
                "enable_ci": False,
            },
        },
        indent=2,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path)
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--apply", action="store_true", help="write missing scaffold files")
    action.add_argument("--check", action="store_true", help="check an applied scaffold")
    parser.add_argument(
        "--adopt-existing",
        action="store_true",
        help="allow a non-empty or dirty target; existing files are never overwritten",
    )
    args = parser.parse_args()
    target = args.target.resolve()
    try:
        state = classify_target(target)
    except ValueError as error:
        parser.error(str(error))
    reason = refusal_reason(state, args.adopt_existing)
    if reason:
        print(reason, file=sys.stderr)
        return 2
    if args.check:
        errors = check_scaffold(target)
        if errors:
            print("\n".join(errors), file=sys.stderr)
            return 1
        print(f"bootstrap valid: {target}")
        return 0
    create, preserve = planned_changes(target)
    print(render(state, target, create, preserve))
    if args.apply:
        apply_scaffold(target, create)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
