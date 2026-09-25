# Evidence workbench passage boundaries: design v1

**Status:** design record with a local implementation, 25 September 2026. [Explorer #150](https://github.com/chris-page-gov/okf-explorer/issues/150) owns the generic controls; [DWP #42](https://github.com/chris-page-gov/okf-dwp/issues/42) owns source-bound acceptance under `DWP-BL-007.remaining-structural-review`.

**Implementation note, 25 September 2026:** The generic [passage review profile](../profiles/evidence-workbench-passages/v1/index.md) and `/evidence/passages/` route deliver phases 1 and 2 as local inspection and isolated correction preview. They validate exact extracted bytes, case and settings hashes, show a verified PDF page beside extracted text, traverse the 28 supplied cases, and export local review JSON. Phase 3 has producer-supplied census and per-case impact; effects of an edited browser correction remain unknown until separately measured. The phase 4 question replay is supplied by the producer outside this generic browser route. Independent source, specialist and producer adoption decisions in phase 5 remain separate gates. This browser view does not change frozen corpora or confer legal acceptance. The proposal wording below is retained as the original design history.

## Purpose and existing contract

A reviewer needs to see whether a proposed unit actually follows the document's structure, especially where an amendment letter, contents table or appendix has been attached to a rule. The first useful increment is a navigable review of the [28 known DWP historical-amendment candidates](https://github.com/chris-page-gov/okf-dwp/blob/main/evaluation/manual-structure/large-paragraph-review-2026-09-23/README.md), with the PDF location, exact extracted text, current passage and proposed passage synchronised. That queue has 27 confirmed mixed-structure units and one uncertain transition. It is a selected outlier population, not a corpus error-rate estimate.

Explorer's [logical evidence-unit decision](adr-logical-evidence-units.md) already defines integrity-checked ordered spans, exact joined source text and an explicit unresolved boundary. This proposal adds inspection, isolated experimentation and review of *proposed* boundaries. It does not change the meaning of `evidence_unit`, turn a structural continuation into a legal dependency or promote extraction to specialist-reviewed authority.

## Generic inspection contract

The generic viewer consumes a schema-validated, versioned review manifest. Each case binds a source document ID and version, PDF URL and page locator, extracted-text URL and SHA-256, source-text byte spans, baseline corpus/producer hash, parser version and settings hash, current unit IDs and proposed unit IDs. It records the observation method, structural role, boundary rationale, confidence or unresolved reason, and links to source observations. PDF and text panes navigate to the same source spans; the before/after panes show exact retained bytes, joiners and omissions rather than paraphrases. A missing PDF page or damaged extraction is visible, not filled in.

The normally folded **How this passage was built** panel shows methodology,
the exact parser and ruleset versions, applied rules, settings, source evidence
and unresolved uncertainty. Both the original PDF and extracted text have
separate SHA-256 identities. A review decision is a separate authored record
with reviewer, date, decision and reason. Mere inspection does not modify the
corpus.

## Proposal and preview contract

Rule sets and case corrections have closed, locally schema-validated inputs: exact baseline and source hashes; rule/correction ID and version; permitted source span operations; expected structural role; uncertainty; rationale. The preview rejects stale hashes, overlapping or missing bytes, invalid spans, invented text, undeclared joins and references to another source version. Corrections can propose a split, join or role change; they cannot rewrite the frozen extracted text. Keep the before state and every failed preview reproducible.

Preview builds a disposable projection and a diff, never a replacement of the approved manifest. The diff reports at four scales: passage text/spans/role; document unit census and source-byte accounting; corpus counts and changed IDs; and dependencies, discovery records, question packages and budget omissions. For split and join changes it supplies an old-to-new ID migration table, including unresolved mappings, with no silent redirect of a legal reference. It flags changes to headings, examples, qualifiers, citations and incomplete fragments. A reproducible suggestion contains the source hash, baseline, exact operation, rationale, rules/settings, output hashes, checks and observed results. Adoption is a separate reviewed producer pull request.

## Phased acceptance

| Phase | Result and gate |
| --- | --- |
| 1. Inspect | Reviewer can traverse all 28 known candidates with synchronised PDF, extraction and before/after passage; source hashes, roles, uncertainty and incomplete fragments are explicit. Existing source observations remain the reference. No proposed correction is implied by a large byte count. |
| 2. Preview | Author one bounded, schema-valid rule/correction set and show isolated before/after output. Reject stale baseline, invalid spans and any lost or duplicated source byte. Preserve positive and negative controls, including a true cross-page passage and a contents continuation without its opening heading. |
| 3. Impact | Compare the same 28 before/after, the earlier fixed four/eight structural cases, 75 authored units and nine substantive chapters touched by the separate amendment-parser candidate. Account for all source bytes, identities, split/join roles, qualifiers, references and unresolved boundaries. |
| 4. Question replay | Replay all 40 recorded staff question occurrences with identical source scope and evidence/resource budgets. Report exact passage retention, required paths, selected and omitted units, payload and time; label gains and losses. Keep original-question and genuinely held-out or cross-page controls distinct from development cases. |
| 5. Adoption decision | Independent source and specialist reviewers decide whether the proposed change is acceptable. A separately reviewed producer PR generates additive successor outputs and ID migration; frozen source, corpora and historic observations remain intact. |

The DWP [manual-structure process](https://github.com/chris-page-gov/okf-dwp/blob/main/docs/manual-structure-process.md) supplies domain fixtures and prior four/eight gates. Explorer supplies generic panes, validation and diff contracts. DWP remains responsible for whether amendment conventions, passage completeness and legal scope are actually supported by the cited source.

## Evaluation and optional detection

Freeze the case list, baseline, controls, budgets and scoring before implementation results. Evaluate structural boundary accuracy and byte integrity separately from retrieval at equal budgets; evaluate legal applicability and answer quality only through their own review protocols. A shorter maximum unit or a higher selected-record count is not a pass. Preserve DMG 28684's observed unfinished “and”, and similarly incomplete excerpts, without inventing continuation from another edition. Record both false splits and false joins, ID churn, cross-page coherence and uncertainty.

Cache unchanged results using source, ruleset, settings and evaluator hashes;
run deterministic checks first. An optional Luna or local-detector trial needs
an agreed, recorded call budget and frozen protocol before any call. Compare
12 varied cases against independently reviewed decisions; predeclare the
false-split, false-join and qualifier-retention criteria for proceeding to 24
fresh cases. Keep held-out decisions independent of parser and prompt tuning.
Retain prompts, outputs and source identities, and do not turn detector
suggestions into accepted structure. No model calls, new acquisitions or
answer trials are authorised by this design.
