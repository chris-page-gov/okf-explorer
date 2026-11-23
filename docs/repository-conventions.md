# Repository creation and discovery

Apply these conventions when creating or adopting a repository. The owner's global Codex guidance carries the same requirements for future work. Inspect a repository's purpose, files, Git history and remote before choosing its foundations. Preserve work already present.

## Initialise a general repository

Use the general scaffold for a repository whose domain and technology have yet to be selected.

```sh
uv run --locked python scripts/okf_repository_bootstrap.py /path/to/project --kind general
uv run --locked python scripts/okf_repository_bootstrap.py /path/to/project --kind general --apply
uv run --locked python scripts/okf_repository_bootstrap.py /path/to/project --kind general --check --adopt-existing
```

The plan lists the files to create and preserve. The scaffold supplies a README, agent guidance, changelog, security-reporting guidance, licensing decisions and basic Git exclusions. It records British English, `en-GB` and `Europe/London`. Choose the project's licence and implementation tooling when its purpose is established.

For an authorised GitHub initialisation, inspect the remote again immediately before pushing the initial commit. Use an ordinary push, then read back the default branch, commit and tree. Retain those identities as evidence. A repository that acquired work during preparation needs another review.

The bootstrap validates its initial template. Once project-specific work starts, use the project's declared checks and publication contracts. A customised README can be preserved during adoption. It will differ from the initial template during the bootstrap check.

## Initialise an OKF producer

Use the [authoring prompt kit](okf-authoring-prompt-kit.md) and the default OKF scaffold once the target's purpose is known. Record the core version, semantic profile, authored inputs, generated outputs, source rights and applicable validation commands. Keep documentation and the changelog in step with controlled changes.

Run the semantic reconciler for its supported governed profile. Other declared profiles require their own validators. A source checkout whose release artefacts live elsewhere also requires the appropriate candidate before a release audit can pass.

```sh
uv run --locked python scripts/reconcile_okf_repositories.py --repo /path/to/okf-project
```

The reconciler's path helper now expands directories within the repository, including nested files. Traversal stays bounded and rejects paths that escape through a symbolic link. Governed profile v1 output declarations continue to use its schema's glob form, such as `bundle/data/**/*`. Its assertions about a governed profile apply to that profile.

Use the [central standards register](okf-standards.md) to resolve current and historical specifications and the public bundle catalogue. Keep the producer's implemented core version explicit when following an upstream move.

## Repeat owner discovery

The complete public scan checks every public default-branch tree and eligible Markdown index. GitHub can truncate recursive tree responses. Discovery recovers those responses by inspecting subtrees and records the recovery.

```sh
uv run --locked python scripts/discover_okf_repositories.py chris-page-gov --inspect-indexes --require-complete --candidates-only > /tmp/okf-public-candidates.json
```

For the authenticated owner's full inventory, add `--visibility accessible` and retain the output privately. This includes private repository names and paths. The published catalogue is recalculated from explicitly public rows. Empty repositories have a recorded disposition. A populated repository with no default branch is an error.

`--require-complete` fails if repository enumeration, a tree or an eligible index remains uninspected. Tree coverage and discovery coverage have separate fields, so a successful filename scan cannot silently stand in for a complete index scan. A completed discovery scan supplies candidate roots and pinned identities. Validate each producer through its declared core, profile and release checks before claiming conformance.
