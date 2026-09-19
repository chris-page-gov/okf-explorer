# Conceptual navigation and date evidence

Status: candidate implementation, 19 September 2026. Publication requires the
normal application, browser and exact deployed-version checks.

A **facet** is a group of values you can use to narrow the records. A volume
facet describes where a document sits. A benefit or circumstance facet describes
what its text mentions. Both are useful, but they answer different questions.

## Start with a concept

1. Open a conceptual facet, such as the producer's benefit or topic facet.
2. Read its description, classification method and review status.
3. Highlight a value, then choose **Keep highlighted** to narrow the records.
4. Switch to Graph, Links or Timeline. These views use the same record selection.
5. Open a record and check its evidence before interpreting a classification.

The displayed classification count describes the **whole snapshot**, not the
current selection. Unclassified records stay visible under the existing missing
metadata value. Missing classification does not prove that a topic is absent.
Text mentions and authored references are discovery aids. Neither establishes
that a rule applies to an individual case. A producer's review label is reported
as supplied; Explorer does not independently certify it.

## Producer contract

Use the existing static-search facet postings and matching full-record fields.
The reusable engine accepts arbitrary facet keys; it contains no departmental
benefit names, paragraph numbers or classifications. Keep postings, record
ordinals, missing-value membership, counts and hydrated record values consistent.
`topic` uses `record.topics`; `tag` uses `record.tags`; other keys use the matching
record property. The producer should validate every assignment against its
evidence register and publish its coverage denominator.

Use the unchanged `okf-explorer-presentation.v1` profile for facet labels,
descriptions and default ordering. Optional classification metadata belongs to
the generated analysis row, not that frozen presentation schema:

```json
{
  "key": "circumstance",
  "classification": {
    "basis": ["explicit-mention", "curated-reference"],
    "review_status": "unreviewed",
    "classified_records": 12,
    "total_records": 100,
    "limitations": ["A text mention does not establish applicability."]
  }
}
```

Accepted review states are `unreviewed`, `partially-reviewed` and `reviewed`.
Counts must be safe, non-negative integers and classified records must not
exceed the denominator. Invalid metadata is not promoted to a valid review
claim. Unknown methods are labelled as another producer method. Descriptions
remain escaped text, with no execution or trusted markup.

An assignment's detailed source span, extraction hash, concept identity and
method should stay in a producer evidence register or record provenance. This
summary does not replace those receipts. Facet membership does not add a legal
or ontological relationship to the semantic graph.

## Read the Timeline correctly

**Dated records** labels each primary date as declared coverage, a source
publication or release, a period inferred from a title or resource, or a capture
or record audit date. **Primary date role** can exclude inferred and audit dates.
Where both source and audit dates exist, expand **Audit dates** beside the record.

An explicit source release retains its supplied year, month or day. A year-only
date grouped by month appears under “month not specified”; no January date is
invented. Declared coverage remains distinct from publication. Listing-page
updates, HTTP modification headers and conflicting source revision statements
do not become a document publication date. A producer's explicit unknown
publication status also prevents a year in its title from becoming evidence of
publication.

These are navigation dates, not a legal applicability timeline. Source review
is still needed to establish which rule or version applies to a case.

The Timeline states how many dated groups it displays and how many exist in
the current selection. It displays up to 80 series or 120 date buckets; a
visible limit message explains that you can narrow the selection to see more.

## Verification

Focused unit controls cover classification states and denominators, partial
dates, invalid dates, source-versus-audit precedence and inferred-date exclusion.
The browser journey selects a conceptual facet and keeps that selection across
Graph and Timeline. Existing targeted record and bounded hydration checks remain
part of the regression suite.

```sh
pnpm --dir apps/okf-explorer exec vitest run src/lib/viewer/facetClassification.test.ts src/lib/viewer/largeTimeline.test.ts
pnpm --dir apps/okf-explorer exec playwright test tests/ui/conceptual-navigation.spec.ts tests/ui/targeted-large-corpus.spec.ts --project=chrome --grep 'conceptual facets|Timeline|targeted Graph to Timeline'
```

To run the same selection journey against a producer's actual public files,
provide its external corpus directory. The test serves those bytes unchanged
through a bounded response fixture, checks postings against hydrated Timeline
counts, exercises every classified facet and retains screenshots, file hashes,
targeted accessibility findings and a local candidate observation. Ordinary CI
skips this external-data test unless the directory is supplied.

```sh
OKF_CONCEPT_CORPUS_ROOT=/absolute/path/to/full-dmg \
OKF_CONCEPT_OUTPUT=/absolute/path/to/local-observation \
pnpm --dir apps/okf-explorer exec playwright test tests/ui/conceptual-corpus-acceptance.spec.ts --project=chrome
```

The default descriptor is `okf-review-context.json`. Set
`OKF_CONCEPT_DESCRIPTOR` for another relative descriptor path. Do not copy an
entire producer corpus into the application source or static directory for this
check. A local observation does not replace public deployment verification.

The [changelog](../CHANGELOG.md) records user-visible changes. The
[domain-profile examples](prompts/domain-profile-examples.md) explain how a
producer discovers terminology, scope and evidence before generating facets.
