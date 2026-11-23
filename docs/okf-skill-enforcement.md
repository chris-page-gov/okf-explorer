# Guarded OKF skills

Version 1.0.0, implemented on 23 November 2026. These controls apply to the two
reviewed inspection helpers. They supplement the producer's OKF core, semantic
profile and publication gates. They do not migrate a producer's core version.

The source package is [tools/okf-skills/v1](https://github.com/chris-page-gov/okf-explorer/blob/main/tools/okf-skills/v1/manifest.json).
It contains `okf-plus-consume` and `okf-plus-generate`, with automatic invocation
disabled. Upstream files are pinned to commit
`527e81aff55992be21507e97004286789126f88c`, published on 18 November 2026.
The upstream prose retains its original spelling and Apache licence. Authored
adapter guidance uses British English.

## Run an inspection

From the reviewed Explorer checkout, prepare the locked environment and check
the package. Then select one bundle explicitly.

```sh
uv sync --locked
uv run --locked python -I scripts/okf_skill.py check
uv run --locked python -I scripts/okf_skill.py scan --bundle /path/to/bundle
uv run --locked python -I scripts/okf_skill.py validate --bundle /path/to/bundle
```

The launcher verifies CPython 3.12.11, uv 0.12.2, the checkout's virtual
environment, `uv sync --locked --check`, the package inventory, pinned upstream files,
launcher digests and manual invocation settings. A mismatch stops the operation.
It never installs dependencies or updates the lockfile.

It copies selected Markdown into a temporary snapshot using descriptor-relative
reads. Symlinks and special files are refused. Hidden paths are excluded.
Directories declaring another bundle through `okf_version` or
`okf.semantic.json` are reported and excluded. Assets become empty placeholders
for existence checks. Their contents are not read or executed. The receipt
records Markdown hashes, excluded roots and this asset limitation.

The inspection has limits of 20,000 visible entries, 2 MiB per Markdown file,
64 MiB of Markdown, 4 MiB per output stream and 30 seconds of execution.
It uses macOS `sandbox-exec` or Linux `bubblewrap`. The helper can read its
snapshot, pinned package and trusted Python libraries. It cannot read arbitrary
host files, write the bundle, open a network connection or run a shell.
On macOS it can read filesystem metadata and the root directory listing for
runtime startup. Linux provides an isolated process and network namespace.
An unavailable or unusable sandbox causes refusal. There is no unsandboxed
fallback and no operation for executing a bundle's computation or attester.

The helper report checks the upstream core format. The scanner's legacy
`timestamp` fallback and PyYAML scalar handling still need the adapter's
version-aware reading rules. Neither helper certifies the richer OKF+ graph.

## Install or check the personal skills

```sh
uv run --locked python -I scripts/install_okf_skills.py install
uv run --locked python -I scripts/install_okf_skills.py check
```

The default destination is `~/.agents/skills`. An existing installation requires
an explicit `--replace`. Replaced directories are retained outside skill
discovery in `~/.agents/okf-skill-backups`. Both new directories are staged and
verified before replacement, and a failed promotion restores the originals.
Use `--destination` to check a separate installation without changing defaults.

Each installed skill records its source checkout and commit, launcher path and package
manifest digest in `INSTALLATION.json`. Read that file to locate the reviewed
launcher. Keep the checkout available. Run the installation check after an
update and before unattended use. A Git commit pins a reviewed package version;
a mutable branch name alone does not establish that pin.

## CI and publication

The unconditional `skill-enforcement` job checks the package and runs the live
sandbox tests with `OKF_SKILL_SANDBOX_ACCEPTANCE=1`. The broader Python suite
runs deterministic tests and leaves those live tests to this dedicated job.
The required `okf-explorer-ci` aggregator rejects an absent, failed, cancelled
or skipped enforcement job. Pages also checks package integrity before building.

On 23 November 2026, GitHub's `main` protection required this aggregator from
GitHub Actions, required the branch to be up to date and applied to
administrators. This observation does not certify future settings. The new
job takes effect on the protected branch after this change is merged.

The producer's existing checks still establish qualified assertion validity,
source/projection agreement, documentation lockstep and publication acceptance.
Core validation success never substitutes for those checks. Historical releases
and frozen semantic profile bytes retain their own contracts.

## Limits of enforcement

These process restrictions protect operations made through this launcher.
General Codex shell access and separately invoked producer build commands
remain outside it. The installed skill's instruction to use the launcher is
behavioural guidance. Host permissions or an agent tool gateway are needed to
make the launcher the only callable execution path. Do not describe this package
as a global Python prohibition, an immutable policy or a billing cap.

Package hashes detect drift against the reviewed manifest. A person who can
rewrite both code and its manifest can change the policy. Protected review
history and exact release pins establish which manifest was accepted.

The tests deliberately attempt host-file reads, bundle writes, network access,
shell execution, symlink escape, unreviewed helper replacement, oversized input,
installed drift and a skipped enforcement job. Run local live acceptance with
the sandbox available to the calling process.

```sh
OKF_SKILL_SANDBOX_ACCEPTANCE=1 uv run --locked python -m unittest tests.test_okf_skill_enforcement -v
```

See the [standards register](okf-standards.md),
[semantic authoring guidance](okf-0.2-yaml-ld-semantic-authoring.md) and
[publication contract](../okf.publication.json) for the separate standards and
producer acceptance boundaries.
