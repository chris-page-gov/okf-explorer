# Applying The Domain Profile Across Three Collections

These are design checks, not substitutes for a current warm-up. Each new run
must inspect the real collection and pin official standards as of its research
cut-off.

## Comparison

| Domain decision | UK legislation | ONS data discovery | GOV.UK content |
|---|---|---|---|
| Typical record boundary | Legal work, expression/version, manifestation and provision must remain distinct | Dataset/product, release, series, geography and classification may have different identities | Content item, edition, route, organisation, taxonomy term and attachment may have different identities |
| Source authority | legislation.gov.uk/TNA for supplied legislation metadata and effects; other legal source owners remain separate | ONS source products/catalogues for supplied metadata; reviewed live references remain distinct from governed snapshots | Publishing applications and GOV.UK APIs for their supplied fields; navigation observations are not editorial authority |
| Critical time distinction | enactment, commencement/effect, validity, amendment, publication and observation | data reference period/release versus catalogue creation/modification and acquisition | first publication, public update, edition, route/redirect observation and acquisition |
| Domain-standard candidates | ELI, CLML/LegalDocML, ECLI where source-assigned, Schema.org Legislation, PROV-O | SDMX, DDI, statistical classifications, DCAT/CSVW, SKOS, PROV-O | GOV.UK content models, Schema.org, DCAT for catalogue-like subsets, SKOS for governed taxonomies, PROV-O |
| False-equivalence risk | Same title or citation does not prove the same work/version/provision | Similar product titles do not prove one series or substitute dataset | A redirected URL, mirrored page or shared taxon does not prove identical content |
| Relationship evidence | Official amendment/effect data stays separate from model-discovered topics/entities | Series membership needs an explicit ID or source-declared scoped label; similarity is presentation-only | Browse links, taxon membership, organisation ownership and related-content links retain their distinct source predicates |
| Likely architecture | Large legislation child plus Whole-Law federation for independently governed source families | Large static discovery corpus with compact facets and provider datapacks | Large corpus; federation only where independently governed products justify it |
| Model assistance | Candidate topics/concepts/entities only, with evidence and independent review | Candidate semantic alignment or confusable-alternative discovery, never statistical fact authority | Candidate topic/entity/navigation enrichment, never editorial status or policy authority |

## UK Legislation Assertions

A passing domain profile should:

- preserve source-native legislation identifiers;
- decide explicitly whether work/expression/manifestation/provision levels are
  material to user tasks;
- model official effects/amendments as source-derived assertions with
  observation time and evidence;
- use ELI or Schema.org as a tested projection rather than replacing CLML
  source meaning;
- show every broader Whole-Law source family as available, partial, restricted,
  unavailable or planned; and
- keep legal-answer evaluation bound to a dated corpus and independently
  verified evidence.

It should fail review if it creates amendment relationships from title
similarity, represents a model topic as official legal classification, or
claims complete Whole-Law coverage from legislation.gov.uk alone.

## ONS Assertions

A passing domain profile should:

- distinguish a data product/series identity from each release;
- keep temporal coverage/reference periods separate from metadata catalogue
  dates;
- preserve source-declared geography and classification identifiers;
- adopt SDMX, DDI, DCAT, CSVW or geospatial standards only for the parts that
  actually emit conforming artefacts;
- use a governed snapshot/live-reference datapack when the UI compares a
  reproducible local snapshot with a later bounded provider observation; and
- evaluate confusable alternatives and metadata gaps explicitly.

It should fail review if a catalogue `metadata_modified` value becomes the
dataset's latest data period, similar titles alone create a series identity, or
metadata completeness is reported as statistical accuracy.

## GOV.UK Content Assertions

A passing domain profile should:

- define whether its stable unit is a content item, edition, route,
  representation or another source-native record;
- record route and redirect behavior separately from content identity;
- distinguish editorial ownership, publishing-application custody,
  organisation association and navigation/taxonomy placement;
- preserve GOV.UK source terminology before mapping to Schema.org, DCAT or
  SKOS;
- include attachment, format, accessibility and withdrawal/replacement
  semantics where evidenced; and
- test whether a system can navigate content and inspect why an item is
  related, not merely retrieve pages by text.

It should fail review if all links become one generic `relatedTo` predicate, a
live route is treated as a permanent edition identifier, or a broad GOV.UK
coverage claim lacks a declared union of sources and omissions.

## Shared Result

The three profiles differ in entities, standards and time semantics but feed
the same build controller:

1. immutable source receipts;
2. source-native normalization;
3. OKF 0.2 Markdown;
4. optional YAML-LD/JSON-LD/RDF with semantic equivalence;
5. an appropriately sized Explorer data plane;
6. evidence-bearing relationships and facets;
7. user/task evaluation;
8. frozen-candidate assurance; and
9. identical RC-to-final promotion.
