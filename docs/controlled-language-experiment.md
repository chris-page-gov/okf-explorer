# Controlled-language rendering experiment

Status: isolated research prototype, 10 October 2026. The DWP example is an
independent experiment. It is not official guidance or an individual
entitlement decision.

The prototype separates language measurements from evidence fidelity. It
prepares three optional rendering requests after Explorer or Ask OKF has
assembled evidence. Each request contains the same complete evidence and a
digest. It never retrieves again, changes the source package or changes the
OKF core.

## What was measured

The retained run uses three **offline illustrative fixtures**, with
model-assisted authorship in this implementation session. It contains no
independently executed model trial, human comprehension study or live MCP
invocation. Ask OKF currently returns evidence with `ai_answer: null`; it does
not supply an existing default generated explanation. The baseline fixture
therefore uses the existing DWP conditional source reading and unknowns,
rather than claiming to reproduce a default model answer.

| Fixture | Heuristic findings | Mean words per sentence | Development signals | Complete semantic fidelity |
| --- | ---: | ---: | --- | --- |
| Baseline | 3 | 14.1 | Present | Not established |
| STE-inspired | 0 | 9.1 | Present | Not established |
| Controlled negative control | 0 | 8.5 | Missing conditions and qualifications | Rejected by development checks |

These are descriptive regex measurements of these particular fixtures. The
fixtures were designed to exercise the safeguards. Their difference does not
measure a treatment effect, model performance or human readability.

The negative control drops the continued-UC/child-responsibility conditions,
the condition that A4361 governs, the limitation on its carer-element examples,
and the unresolved historical-law/specialist-review qualification. It keeps
every citation label. Its zero heuristic count and intact citation labels do
not rescue the lost qualifications.

The bounded feedback replay moves from the baseline fixture to the
STE-inspired fixture, then rejects the controlled negative control. It records
feedback, input and output identities and a maximum of two revisions. It
accepts no explanation. This is an illustrative replay, not evidence of how
an LLM behaves when it receives checker feedback.

Inspect the [summary](../experiments/controlled-language/results/summary.json),
[raw baseline checker output](../experiments/controlled-language/results/baseline.checker.raw.json),
[controlled evaluation](../experiments/controlled-language/results/controlled.evaluation.json)
and [loop receipt](../experiments/controlled-language/results/loop.json).

## Checker choice and rights

The [machine-readable comparison](../experiments/controlled-language/checkers.json)
records four pinned repositories and the capabilities actually inspected.
The selected [SimpleEnglish linter](https://github.com/AminBlg/SimpleEnglish/blob/a6fcb4fde098b33617cc1578d151ebf58774b883/evals/ste_lint.py)
is an MIT-licensed, standard-library Python counter. It exposes JSON and
detailed findings. Its 11 categories include sentence length, contractions,
modal words and trailing conditions. It cannot establish formal compliance.
Its upstream self-test passed.

The experiment vendors only its exact script, original style lexicon
`slop.tsv` and MIT licence. That style lexicon is not the official STE
dictionary. Upstream finding positions are approximate and snippets can be
shortened. Keep raw outputs, category counts and version bindings when
comparing results.

The [Python checker](https://github.com/sourdough-bread/asd-ste100-checker/tree/e193ecdd66b09ce81b7c611f1c841efd8ba84cc7)
offers documented spaCy, glossary, JSON, SARIF and MCP surfaces. Its packaging
includes an official-PDF dictionary extraction and its README acknowledges
redistribution risk. It would also introduce dependencies outside the current
lockfile. Its tests were inspected, not executed.

The [Go/Node.js checker](https://github.com/probelabs/ste/tree/d3817c71b87043864f77a8098603241fddcc66d1)
has 13 catalogue entries, JSON/SARIF and library interfaces. Its
[third-party notice](https://github.com/probelabs/ste/blob/d3817c71b87043864f77a8098603241fddcc66d1/THIRD_PARTY_NOTICES.md)
also acknowledges risk around its embedded dictionary. A runtime
`--no-dictionary` flag does not remove embedded data from an installation.

The [stuffbucket/vale candidate](https://github.com/stuffbucket/vale/tree/d96df3eb63f174b6933e29f3d97d4f17e74ab7c3)
has an inspected stdio MCP entry point and a session vocabulary store. Its
licence file records MIT code and an OpenSTE notice. The wordset's origin and
rights were not independently established, and the engine was not installed.

The official [ASD overview](https://www.asd-ste100.org/about_STE.html)
identifies Issue 9, January 2025. The official
[copyright notice](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf)
limits reproduction outside listed special-use categories. No permission for
this project was inferred from free availability or a third-party code
licence. Direct PDF access returned HTTP 403; indexed official copyright text
was available. No official dictionary was downloaded or redistributed.
The [official downloads page](https://asd-ste100.org/STE_downloads.html)
also warns against treating plausible AI wording as verified STE compliance.

## Frozen DWP evidence

The question is `uc-dla-001`: highest-rate DLA care from 26 January 2025,
reported to UC on 28 March 2026, with assessment-period boundaries absent.

The [evidence package](../experiments/controlled-language/fixtures/evidence.json)
retains five complete machine-extracted PDF pages: ADM A4 pages 34, 36 and 37,
and ADM F1 pages 17 and 18. It keeps paragraph context, footnotes, continuation,
alternative qualifying routes and the rates table. The freezer checked both
retained PDF file hashes against the extraction's source identities. The
snapshot records the DWP revision, extraction file hashes, page text hashes,
original URLs, capture metadata, OGL attribution and extraction limitations.

This is a source-guided presentation subset. A4361 was absent from the earlier
natural-language retrieval result. Adding it to this fixed experiment does
not establish a retrieval repair. The package remains `insufficient`.
Historical statutory applicability, complete dependencies, independent
specialist review, AP boundaries and award history remain unresolved. The
current rates table does not establish January 2025 rates.

The existing unreviewed assessor reference is retained separately with its
provenance. It never enters rendering requests. Do not mistake it for a reviewed
answer key or a fully archived primary-source package.

## Architecture and evaluation boundaries

`explorer-adapter.mjs` accepts the existing governed context envelope or the
frozen experimental envelope. For an Explorer context it recomputes the
context identity and byte count, then retains the entire package. It exports
a request; it calls no provider. Instructions treat source content as inert.
Profile and request hashes bind the presentation instructions.

The experiment reuses the existing context evaluator's canonicalisation and
SHA-256 functions. A real study-club integration test runs Explorer's existing
assembler and A–H evaluator before and after request creation. The assessment
and source package stay identical.

The DWP assessor is separate. It reports declared phrase/negation signals,
forbidden date/rate patterns, citation presence and digest binding. It maps
results to A–H stages without claiming to rerun retrieval or traversal.
It does **not** prove entailment, detect every contradiction, validate legal
applicability or exhaustively find unsupported claims. A malicious or
contradictory text can contain every expected phrase. Passing its checks
therefore always leaves semantic preservation `not-established`.
A missing signal produces a development failure. The result contains no
inflated count of “claims preserved”.

The checker flags “may” as a modal finding. Legal modality must not change
because of that finding. Amounts, actors, conditions, exceptions, temporal
relationships, negation, uncertainty, source references and review boundaries
need independent review. Causal relationships and general machine
interpretation were not measured.

## Terminology, MCP and extraction

Existing Explorer context records already carry stable IDs, labels, aliases,
text definitions, scope, authority and provenance. These can supply preferred
display terms without changing OKF core. Aliases do not establish semantic
equivalence. A future domain sidecar could distinguish permitted variants from
ambiguous variants, bound to the existing concept and source identities.
This experiment does not invent an assessment-period concept ID or rewrite
DWP's separate semantic layers.

The checker adapter exposes the same deterministic Python function and JSON
CLI. A read-only, size-bounded MCP wrapper is feasible, but no MCP service was
implemented or tested. It should expose measurements and limitations, never a
compliance certificate or automatic rewrite. The initial experiment needs no
MCP connection.

The pre-extraction stretch hypothesis remains untested. It needs a separate
frozen corpus and independent entity/relationship/retrieval controls. Rewriting
source text before extraction could change evidence identity and must never
replace the original source.

## Reproduce and extend

See the [prototype commands](../experiments/controlled-language/README.md).
The runner is offline, preserves raw checker JSON, and binds profiles, scripts,
renderings, evidence and results. CI runs the checker self-test and the
experiment's mutation/integration/reproduction tests.

Separate request preparation and response import support later model trials.
Imported text is marked unreviewed and its generation is unobserved. The
importer checks request/profile/evidence identity, preserves exact text bytes,
and emits at most two feedback revisions. It applies this DWP assessor only
to the exact frozen DWP package.

Before considering production adoption, freeze independent questions, record
actual renderer/model/version/settings and responses, commission specialist
semantic assessment, and measure human comprehension with a declared protocol.
Use the same evidence for all conditions and report source gaps separately.
The current result supports retaining an optional downstream experiment. It
does not justify a formal ASD-STE100 profile, an OKF core change or a default
Explorer rendering policy.
