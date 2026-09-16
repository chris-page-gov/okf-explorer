# Evaluate governed context assembly

Context assembly selects and connects evidence for a question. It does not
generate a model answer or certify that the source is correct. The
[architecture decision](adr-ask-okf-context-assembly.md) separates this library
from Search and from optional tool transport.

## Keep the inputs separate

The producer index declares source-backed concepts, passages, assertions and
context requirements. Its scope and authoring authority remain visible. The
engine receives that index, the question and explicit traversal and size limits.

An evaluation case is a separate assessor artefact. It declares required source
identities, concepts, directed paths, evidence and expected gaps. The evaluator
compares the observed package with those requirements. It must not pass the
expected answers or evidence lists into the assembler as hidden retrieval hints.

Neither the evaluator nor the assembler assigns authority from a keyword match.
Evidence containment, graph paths, scope and provenance are checked separately.
Expected source identities can bind the exact source URL, capture timestamp
and explicit source-date role in addition to file and literal digests. A valid
URL or timestamp shape does not establish that it belongs to the frozen source.
A lexical baseline can help explain retrieval differences, but its rank or term
overlap cannot make an evidence package sufficient.

## Inspect eight stages

| Stage | Check | What a pass does not establish |
| --- | --- | --- |
| A — Source | Required source and passage identities are available in the declared snapshot. | Complete or current source law. |
| B — Semantic | Required concepts and typed assertions retain their identities, direction, authority and scope. | That an association is an operative rule. |
| C — Retrieval | The actual question resolves the required concepts; ambiguous or unsupported resolutions remain explicit. | That every part of an arbitrary question was understood. |
| D — Traversal | Required directed paths and dependency targets are present, within declared limits. | That ordinary hyperlinks imply domain predicates. |
| E — Assembly | Required evidence is retained whole; omissions and budget limits are explicit. | That a short extract contains every source qualification. |
| F — Provenance | Each selected item is bound to source, locator and digest; execution binds engine, index and package. | That intact bytes are truthful or endorsed. |
| G — Boundaries | Scope, authority, historical material, conflicts and unresolved dependencies survive selection. | Individual entitlement, operational permission or legal advice. |
| H — Answerability | The observed outcome and missing requirements match the declared evaluation case. | Specialist acceptance or correctness of a future model answer. |

Report failures by stage, including the exact omitted or mismatched identity.
Do not replace them with one percentage. A deliberately incomplete negative
case passes its evaluation when the engine accurately reports the expected
limitation; its package remains incomplete.

## Controls that matter

Use more than paraphrases of the positive question. Remove a mandatory
dependency, reverse an assertion, change a target to a similar entity, corrupt a
source digest, create conflicting evidence and lower the budget below the
required closure. Each mutation must have a declared expected outcome.

Also test ambiguous aliases, unsupported concepts, cycles, depth and fan-out
bounds, duplicate identities, absent provenance and source text containing
instructions. Source text must remain inert. A missing dependency is unknown;
it must not silently become false or not applicable.

Keep a non-DWP synthetic fixture to demonstrate that the engine has no hidden
benefit-specific rules. Fictional study-club activity and room records can test
multi-record evidence selection and the failure to transfer one room's access
statement to another. Label invented assertions and evidence explicitly. The
[retained study-club case](https://github.com/chris-page-gov/okf-explorer/blob/main/tests/fixtures/context-study-club/README.md)
provides an actual end-to-end execution and exact reproduction command.
It is a standalone context test under `tests/fixtures`, separate from the
complete fixture families governed by the Evaluation Foundry.

## Evidence and publication

Freeze the question, index and assessor requirements before recording a run.
The execution receipt records the bytes actually consumed, the package produced
and the stage outcomes. Timestamps describe execution observations and must not
replace source publication or effective dates. A later change requires a new
receipt; do not relabel an earlier run.

The earlier MCP evaluation remains a lexical retrieval baseline. The existing
DWP source-guided answer trials remain separate research evidence and do not
become engine evaluations. A model-answer trial must name the exact assembled
package it received and retain its observed response and independent assessment.

Browser presentation, WebMCP registration and a compatible host's actual tool
invocation are separate checks. Passing the engine evaluator proves none of
those interfaces automatically.

## Execute declared mutation controls

A separate controls manifest declares the mutations, expected diagnostics and
A–H stages that must reject the positive case. The runner mutates an in-memory
copy, gives it an explicit synthetic snapshot identity and hashes its actual
bytes. It never changes the original index or uses expected evidence as seeds.

```sh
node --experimental-strip-types scripts/run_context_controls.mjs \
  --index /path/to/assembly-index.json \
  --case /path/to/evaluation-case.json \
  --controls /path/to/evaluation-controls.json \
  --output /path/to/control-execution.json
```

The receipt binds each retained compressed archive and its exact uncompressed
content separately. Replay verifies the stored archive's digest and size, then
decompresses within fixed bounds and compares exact fresh payload bytes. It
does not require different zlib builds to produce identical DEFLATE bytes.
Add `--check` to execute again and compare the evidence. Both runners
bind implementation hashes before execution and reject a run if those files
change before the receipt is written. A passing control requires its declared
outcome and rejection of the independent positive acceptance case.

`expected.paths` checks exact retained paths from resolved seeds.
`expected.assertion_paths` additionally checks source-routing chains in the
retained graph; a chain may start at a source page already reached by traversal.
These assessor requirements remain separate from producer `required_paths`.
Removing a required routing assertion must fail even when alternative roots
still retrieve all the records.

## Continuous integration

The existing Explorer CI workflow runs a dedicated `context-assembly` job on
every invocation, independently of the impact planner. It uses Node 26.7.0 and
locked Python and JavaScript dependencies. It executes the generic engine's
synthetic failure controls, the independent assessor controls and the retained
study-club case with `--check`. The required CI aggregator includes this job.
This re-executes the engine; it does not merely inspect receipt status fields.

The DWP producer's CI checks out a reviewed, 40-character Explorer commit,
installs that checkout's locked evaluator dependencies, then replays its frozen
source preflight, A–H case and actual-index mutation controls. A placeholder or
branch name is rejected. A consumer update must reproduce and review the
affected execution receipts before its new pin is published.
