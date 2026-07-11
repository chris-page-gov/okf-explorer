# Personas And User Journeys

[Documentation spine](index.md) · [Getting started](getting-started.md) · [Illustrated manual](illustrated-manual.md) · [Agent guide](agent-research-guide.md) · [Evaluation](evaluation-and-quality.md) · [Maintenance](maintenance.md)

These personas anchor documentation, interface review and evaluation. They are behavioural roles rather than claims about every real user in a profession.

## Personas

| Persona | Primary need | Main risk | Evidence of success |
|---|---|---|---|
| Barrister | locate the operative provision and build a submission with pinpoint authority | relying on the wrong version, extent or related instrument | every proposition maps to an official selected passage and currency checks are explicit |
| Pupil barrister or paralegal | orient quickly across unfamiliar primary and secondary legislation | mistaking an amendment, commencement order or draft for the principal work | exact work identity, type, year, number and official identifier are recorded |
| Policy researcher | understand the scale and themes of the statute book | treating a title-derived topic or catalogue count as an official legal classification | corpus boundary and derived metadata are stated accurately |
| Legislative data engineer | inspect identifiers, manifestations, CLML structure and access routes | flattening Work, Expression, Manifestation and subdivision concepts | ELI/CLML roles and source-native identifiers remain distinguishable |
| Knowledge curator | refresh the pack and keep documentation synchronized | stale screenshots, counts or source-access statements surviving a corpus update | generator, validator, docs, screenshot manifest and Pages build agree |
| AI operator or evaluator | obtain a useful answer with complete provenance | fluent but unsupported conclusions | answer schema passes, official citations cover every material proposition and expert scoring is completed |

## Journey map

| Stage | User question | Explorer action | Required evidence |
|---|---|---|---|
| Orient | What corpus am I looking at? | read Overview, counts and notices | descriptor, generation timestamp and corpus boundary |
| Discover | Which work or instrument is relevant? | search, then reduce by category/type/year/jurisdiction | exact work identity and source adapter |
| Inspect | Is this the principal work and what formats exist? | open detail card and manifestations | official identifier, document type, year/number and official links |
| Traverse | Where is the operative wording? | load CLML and search within the instrument | normalized subdivision ID, supporting passage and pinpoint URL |
| Validate | Can I rely on this wording for the question asked? | open official work and effects links | version, commencement, extent, amendments and uncertainty |
| Answer | How do I communicate the result? | build proposition ledger | one or more official citations per material proposition |
| Assure | How well did the person or AI perform? | apply evaluation rubric | scored answer, hard failures and reviewer notes |

## Critical user journeys

### J1 — Counsel finds an operative section

Search the principal Act, distinguish it from related instruments, open its CLML tree, locate the section wording, open the selected passage and record currency checks.

Success means the answer does not rely on the catalogue summary and does not omit version, commencement, extent or effects questions.

### J2 — A pupil distinguishes primary and secondary material

Search a shared phrase, compare Category and Document Type, and record the exact type code/year/number before opening the result.

Success means a remedial, amendment, commencement or draft instrument is not confused with the principal Act.

### J3 — A researcher explores a legal theme

Begin with Topic, then verify candidate relevance against titles and official text. Report the result as a pack-derived navigation grouping.

Success means the derived topic is never described as an official subject classification.

### J4 — An engineer resolves structured text

Start from the ELI-style work identity, inspect manifestations, load CLML, and preserve source element names and IDs alongside normalized labels.

Success means Work, manifestation and subdivision identity are not collapsed into one undifferentiated record.

### J5 — An AI produces a counsel-grade answer

Follow progressive discovery, construct discrete propositions, attach citations and temporal context, then run the evaluation suite.

Success means there are no uncited material propositions and no claim of completeness beyond the legislation corpus.

### J6 — A curator refreshes the publication

Regenerate from cached or refreshed official feeds, validate exact partition counts, rebuild screenshots whose states changed, update documentation dates/counts and verify Pages.

Success means the [maintenance checklist](maintenance.md) is complete and documentation lockstep passes.
