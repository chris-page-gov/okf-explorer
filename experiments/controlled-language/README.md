# Controlled-language prototype

This removable experiment adds optional presentation requests to saved
Explorer/Ask OKF evidence. It uses the DWP disabled-child/date scenario and
retains source and transformation provenance. Read the
[findings and limits](../../docs/controlled-language-experiment.md) and the
[recovered handover](CODEX_HANDOVER_ASD_STE100_OKF.md).

The [illustrated report](documentation/report.md) covers every deliverable,
evaluation and next steps. A [Word copy](documentation/controlled-language-experiment-report.docx)
embeds all 17 screenshots. The [capture manifest](documentation/screenshots/manifest.json)
retains image and source-view hashes. Screenshots show a local documentation
viewer, with unimplemented proposals labelled clearly.

The retained explanations are offline illustrative fixtures with
model-assisted authorship. No live model trial or human comprehension test
was run. No explanation has independent semantic acceptance.

## Run the retained experiment

From the Explorer repository root, use its governed runtime:

```sh
uv sync --locked
uv run --locked python experiments/controlled-language/vendor/ste_lint.py --self-test
node experiments/controlled-language/run.mjs --output /tmp/okf-language-results
node --test tests/controlled_language.test.mjs
```

Node 26.7.0 is the repository's CI runtime. The integration test imports its
existing TypeScript context library. No npm package installation, dictionary,
provider credential or network connection is needed by the experiment.

The output directory contains exact text, three same-evidence requests, raw
checker JSON, per-rendering evaluations, a bounded feedback replay, a summary
and result checksums. The source snapshot and selected checker bytes are
pinned in `evidence-lock.json`. The evidence digest hashes canonical JSON
using the existing context evaluator; file locks and output text hashes use
exact bytes. Do not compare these two different digest roles.

The runner accepts `--iterations 0`, `1` or `2`. Fixture feedback is
illustrative; it records no model revision behaviour. Zero violations is a
measurement, not a semantic or STE pass.

## Prepare a trial without changing retrieval

To create requests from a verified saved Explorer governed context:

```sh
node experiments/controlled-language/prepare.mjs --context /path/to/context.json --output /tmp/language-requests
```

This preserves every selected record, assertion, omission, provenance field and
evidence boundary. The adapter verifies Explorer's context identity and byte
count. It does not replace the existing source/index/A–H verification gates.

For the frozen DWP presentation case:

```sh
node experiments/controlled-language/prepare.mjs --context experiments/controlled-language/fixtures/evidence.json --output /tmp/dwp-language-requests
```

Give each request to the renderer independently, using the same model/settings
if comparing conditions. Keep `assessor.json`, the baseline reference and
expected results away from a blinded renderer. Preserve the actual model
identity, settings, prompt, response and execution receipt separately. This
repository does not configure or call a provider.

Import a separately obtained response against its prepared request:

```sh
node experiments/controlled-language/assess.mjs --request /tmp/dwp-language-requests/ste-inspired.request.json --text /path/to/answer.txt --output /tmp/dwp-language-import
```

The importer is specific to the exact frozen DWP evidence. It retains raw
checker output and labels generation as unobserved. It reports no trial model
call count or semantic acceptance. Its next revision request contains the
same evidence and checker feedback. When development checks fail or the two
revision limit is reached, the next-request file contains `null`. Use a fresh output
directory for each response.

Requests are bounded to 600,000 canonical evidence bytes. Renderings are
bounded to 32,768 UTF-8 bytes. Checker execution has a 15-second timeout and a
bounded stdout buffer. Sources and responses are inert text.

## Inspect provenance or choose a new snapshot

The DWP freezer reads the existing immutable acquisition files and verifies
source PDF hashes. The selected pages stay whole, including alternative
routes and the table whose historical applicability is unknown. The DWP
repository was read only.

A new snapshot is a new experiment, not a refresh of the retained result.
Write it to a separate directory:

```sh
uv run --locked python experiments/controlled-language/freeze_dwp.py --dwp-root /path/to/okf-dwp --output /tmp/new-dwp-language-snapshot
```

Review its evidence boundaries before declaring new locks, assessor
requirements or results. Do not silently regenerate `fixtures/` or relabel
an earlier receipt.

## Remove the experiment

Remove this directory, its Node test, the two CI commands, the documentation
page; record its retirement in the changelog. The core context assembler, bundle generators,
DWP projections and Explorer user interface have no dependency on it.

The selected MIT checker is vendored byte for byte at the revision recorded
in `checkers.json`. Preserve its [licence](vendor/LICENSE) and source
attribution. Original upstream wording and identifiers in vendored files and
the recovered handover are intentional British English editorial exceptions.
