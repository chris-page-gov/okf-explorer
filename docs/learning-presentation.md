# Designing a learning bundle for Explorer

A learning bundle should help someone choose a goal, follow a useful sequence,
practise a skill and trace an interpretation to its evidence. A list of files is
an evidence inventory, not a learning path.

## The producer and reader contract

Small bundles can opt in with `meta.learning_presentation`. This is an additive
Explorer presentation contract, not a new requirement of OKF 0.2 or a claim of
Bundle Wiki conformance. It applies to both the small JSON projection and an
explicit YAML-LD or JSON-LD graph with equivalent metadata.

```json
{
  "schema": "okf-learning-presentation.v1",
  "start_route": "learning/start.md",
  "title": "Learn by doing",
  "introduction": "Choose a goal, practise it and review the evidence.",
  "facets": [
    { "key": "topic", "label": "Topic" },
    { "key": "capability", "label": "Capability" }
  ],
  "groups": [
    {
      "title": "Your learning journey",
      "description": "Start with the outcome you want to achieve.",
      "routes": ["learning/check-evidence.md", "learning/test-an-idea.md"]
    }
  ]
}
```

Every route must resolve in the loaded corpus. Nodes declare filter values in
`learning_facets`, for example `{"topic":["Critical thinking"],"capability":["Assess evidence"]}`.
Values can overlap. Missing values mean unclassified, not an inferred negative.
The reader does not derive classifications from filenames, titles, search
matches or source mentions. Only producer-authored values drive these facets.

The reader validates the opt-in shape and bounds facets, groups, routes and
labels. Invalid or absent presentation falls back to the existing catalogue.
Explicit valid deep links take precedence over the starting route. A file import
selects that file's starting route and clears the previous inspection state.
The file remains in browser memory; reloading the page requires reselecting it.
A URL-loaded bundle supports durable routes and filter state.

Conceptual facets appear first, with the first one expanded to show labels.
Type, trust, lifecycle and section remain inside **Source and review filters**.
Highlight, keep, undo, reset and URL history retain their existing semantics.
The guided reader starts with ordered groups of goal cards. Its record pages
show connections and expandable evidence passages. The full catalogue remains
available below the path or through search and filters. Legacy bundles keep
existing facets and catalogue behaviour.

## A content designer's workflow

1. Identify learner questions and observable outcomes before choosing facets.
2. Keep original sources and record their versions, authority and gaps.
3. Author concepts, activities, outputs and directed relationships with evidence.
4. Assign useful, overlapping classifications. Do not classify every item under
   every topic merely because it shares a source document.
5. Design an ordered starting page with a small number of meaningful choices.
6. Name variants explicitly: “Welcome — Module 2, condensed” is distinguishable
   from “Welcome — Module 1, full”. Put timings and purpose in the description.
7. Validate the actual journey in Explorer: goal → activity → expected output →
   safeguard → supporting passage. Test narrow screens and back navigation.
8. Keep sources and review information accessible without making them the
   primary way people navigate the subject.

## Acceptance questions

| Need | Observable acceptance |
| --- | --- |
| Where do I start? | The first view explains the learning goals and gives ordered entry points. |
| Which content helps me? | Topic and capability filters find meaningful records across source files. |
| What will I practise? | Activities have a purpose, a variant, a duration and connections to capabilities. |
| What should I produce? | Outputs and next steps are reachable from relevant activities. |
| What should I check? | Safeguards and evidence are accessible from the learning content. |
| Can I trust this interpretation? | Source statements, interpretation and gaps remain distinguishable. |
| Can I return here? | URL-loaded routes and filter state survive reload and back/forward navigation. |

A producer's counts and loader tests do not prove these journeys. Browser
acceptance is a separate gate. The AI in Action exemplar is private and is not
included in this repository, fixtures or publication outputs.

## Learning paths for large bundles

A large-corpus descriptor can opt in with the top-level `learning_presentation`
field below. This separate version describes an ordered teaching overlay; it
adds no semantic assertions and does not infer a curriculum from search ranking.
Producers create paths in their authored descriptor source and regenerate their
normal projections. Existing large bundles need no changes.

```json
{
  "schema": "okf-large-learning-presentation.v1",
  "title": "Learn to assess evidence",
  "introduction": "Read, practise and explain your judgement.",
  "paths": [{
    "id": "assess-evidence",
    "title": "Assess a source",
    "description": "Check the source before using its conclusions.",
    "steps": [{
      "route": "dataset/example",
      "title": "Read the original evidence",
      "outcome": "Explain what this source does and does not establish.",
      "practice": "Write down two limitations and check the supporting passages.",
      "minutes": 15
    }]
  }]
}
```

The Reader supports up to 12 paths with 24 steps each. Each path needs a unique
lower-case identifier, a title and at least one step. Each step needs a local
record route (for example `dataset/example` or a source-native `chapter/77`),
title and observable outcome.
Practice prompts and durations of 1 to 480 minutes are optional. Duplicate routes
within a path and malformed contracts disable the overlay. Producers must check
that every declared route exists in their published corpus; syntax validation
alone cannot establish route existence without loading the relevant records.

The overlay loads no records itself. Selecting a step uses the existing Reader
selection, URL history, inspection and evidence controls. A record locator keeps
record loading targeted; older corpora without one use their existing full index
when a step is selected. Scope restrictions remain active and explain when a
step cannot be opened. Search, facets and the catalogue remain available.

Ordered steps show outcomes, practice prompts and estimated time. Learners can
mark steps complete and reset progress. Progress stays in memory for the loaded
bundle and resets on reload or switching bundles; it is neither assessment nor
certification. Explicit deep links select the matching step without moving the
user elsewhere. Keyboard focus and selected-step announcements are supported.

## Review evidence — 22 September 2026

The review branch integrates PR #139 with main at `69d38b1c`. Small conceptual
facets now require a valid presentation declaring their keys. Focused regression
checks cover legacy fallback, malformed contracts, route limits, ordered practice,
selection history and reversible progress. Six Chrome journeys passed, including
the local DWP pilot (URL, File, search, Graph and switching) and a combined DWP
learning overlay using a source-native chapter route. The latter confirms zero
eager record-shard requests and targeted record loading after selection. Its
teaching prompts are test-authored; the DWP corpus itself is unchanged. These
checks do not certify every staff journey or policy interpretation. Unavailable learning records leave the current selection intact and explain the
publication gap. The retained Heritage receipt requires evidence for the exact
application build.

Run the portable journeys with `pnpm --dir apps/okf-explorer exec playwright test
tests/ui/learning-path.spec.ts --project=chrome`. For local producer checks, set
`OKF_DWP_PILOT` to the public pilot JSON file and `OKF_DWP_COMBINED` to the
combined corpus directory. Without those variables, the two producer checks are
explicitly skipped; the repository does not embed either external corpus.

## Assessed large-bundle programmes (v2)

`okf-large-learning-presentation.v2` keeps the same 12-path, 24-step limits.
It adds a `programme` with `id`, `version` and an `assessors` public-key roster.
Each path can declare `prerequisites` (path IDs), `personas` (display labels)
and an `assessment` prompt. Each step can provide `evidence_routes`, which use
the same bounded record navigation as the lesson itself. Unknown or cyclic
prerequisites disable the presentation. These are teaching references, not
new semantic relationships or legal applicability claims.

The Reader keeps a pseudonymous learning journal in browser storage. Learners
write an artefact, export a submission and send it to their facilitator through
their chosen channel. The application does not send submissions. A facilitator
returns a signed assessment; only decisions verified against the bundle's roster
count towards prerequisites. A practice tick cannot award a pass. Browsing stays
available when a dependent assessment is locked.

The five rubric scores are traceability, scope, reasoning, counterexample and
communication, each 0–2. A pass requires at least 8/10, full marks for
traceability, scope and counterexample, and no critical failure. This is an
instructional rubric, not an official competency standard. The signature
identifies the configured assessor; it does not establish their professional
qualifications. Keep claimant information out of artefacts.

Decisions bind the exact learner, submission hash, programme version and bundle
snapshot. A later changes-required decision removes the current pass and locks
dependent assessments. Old versions remain historical and do not unlock the
current version. Restore/export the journal to move devices; browser storage
can be cleared and is not a managed training record system. All signatures are
reverified on restore, including after a roster change. A static bundle is a
local teaching trust boundary, not a tamper-proof credential service.

### Facilitator setup

With Node.js 22.18 or later, create a key outside the published repository:

```sh
node apps/okf-explorer/scripts/learning_assessor.mjs keygen /private/path/reviewer reviewer "Programme reviewer"
```

Add only the generated `.assessor.json` entry to the producer's authored roster
and regenerate the descriptor. Keep the `.private.pem` file private. Prepare a
review decision after inspecting the submitted artefact:

```json
{"decision":"changes_required","scores":[2,1,1,1,2],"critical_failures":[],"feedback":"Retain the governing qualification and test a changed scenario."}
```

Then sign the exact submission:

```sh
node apps/okf-explorer/scripts/learning_assessor.mjs assess submission.json decision.json /private/path/reviewer.private.pem /private/path/reviewer.assessor.json assessment.json
```

The tool rejects a pass that fails the rubric, a mismatched key and an existing
output file. The Reader rejects tampered, unknown-assessor, cross-learner and
stale-snapshot decisions. No legal interpretation is automatically graded.

### Portable DWP rehearsal

After building and checking both repositories, package the matching Explorer,
combined curriculum and unchanged retrieval-unit corpus with:

```sh
node scripts/package_dwp_learning_demo.mjs /path/to/built-explorer /path/to/okf-dwp /path/to/new-demo-directory
```

The output contains a local-only Node HTTP server, a landing page, presenter
notes, licences and a SHA-256 inventory. It excludes the facilitator private
key. Run `node serve.mjs` inside the package and open the printed localhost
address. This is a portable review artefact; it does not publish or certify a
production service. Rehearse the packaged bytes before sharing them.

## Find DWP learning paths

On the Explorer home page, choose **DWP learning paths** in the featured example
catalogue, then **Open in Explorer**. Inside Explorer, focus the **Bundle or
descriptor URL** field, replace its contents with **DWP learning paths**, and choose the matching suggestion.
Both routes load the combined DWP Reader at its learning catalogue. Choose a
role, expand a path and open an activity or supporting record. The separate
logical-unit corpus does not contain these lesson records.

The registry follows the producer's reviewed main branch. A changed programme
or bundle snapshot requires reassessment; it does not carry an earlier pass
forward automatically. Corpus-wide semantic review, compact evidence delivery
and remote-service adoption remain separate work. A lesson or assessment pass
does not close those evidence gaps.
