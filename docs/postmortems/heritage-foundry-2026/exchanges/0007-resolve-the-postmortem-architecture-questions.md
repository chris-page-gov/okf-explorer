---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/exchanges/0007-resolve-the-postmortem-architecture-questions.html
"@type": https://schema.org/Conversation
type: Conversation
title: "Resolve the postmortem architecture questions"
description: "Redacted prompt-response exchange EX-0007 from the heritage Foundry task."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T13:16:54Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - conversation
  - heritage-evaluation-foundry
---
# EX-0007: Resolve the postmortem architecture questions

[EX-0006](0006-create-the-end-to-end-engineering-postmortem.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0008](0008-implement-every-recommended-refactoring-and-publication-control.md)

## Publication Boundary

This is a public-safe derivative of the visible task conversation. It excludes hidden instructions, private reasoning, tool arguments, tool outputs, credentials and local evidence paths. Commentary and final responses are preserved.

## User Prompt

- Timestamp: `2026-08-04T07:14:19.203Z`

````text
## My request for Codex:
Discuss the **Further questions**
Should promotion/status metadata ever be inside a candidate rather than exclusively in a signed promotion envelope?
Which browser change classes need three engines per pull request, and which can move to nightly plus terminal-release assurance?
Should YAML-LD or JSON-LD be canonical, with the other materialized only at release time?
Should link validation be hash-sharded and refreshed on its own freshness schedule?
Which publication unit should own future exemplars before the current Pages closure reaches its limit?
````

## Codex Response

### Response 1 (final_answer)

- Timestamp: `2026-08-04T07:17:11.238Z`

````text
My recommended position is:

| Question | Recommendation |
|---|---|
| Promotion/status metadata | Keep workflow status outside the candidate in signed envelopes |
| Browser coverage | Risk-based per-PR selection; full three-engine assurance nightly and at release |
| YAML-LD vs JSON-LD | YAML-LD authoring source, normalized semantic model, generated JSON-LD interchange |
| Link validation | Separate deterministic structural checks from independently refreshed external evidence |
| Future exemplars | Separate domain-owned publication units; keep OKF Explorer as the shell and registry |

## 1. Promotion and status metadata

Promotion status should normally be exclusively in a signed promotion envelope.

The candidate may contain immutable facts about itself:

- candidate identifier and content roots;
- source-freeze and schema versions;
- generator and consumer contract versions;
- applicable promotion policy;
- its declared role, such as `candidate`.

It should not be rewritten to say `evaluated`, `published`, `superseded`, or `revoked`. Those are decisions or observations made about the candidate after it exists.

A promotion envelope should bind:

- candidate, Explorer and Site-component roots;
- stable test-result fingerprints;
- required policy version;
- deployment identity;
- approval or verification actor;
- observation timestamp;
- status and any expiry;
- signature.

Later envelopes can promote, supersede or revoke the same candidate without changing its bytes. The registry and interface can display the latest valid envelope while retaining the complete history.

The exception is domain status that was itself present in the source—for example, a heritage asset’s risk status at a particular date. That belongs in the candidate as a qualified assertion. It is distinct from the publication workflow’s status.

This separation is the most important decision because it removes the evidence→candidate observer loop.

## 2. Three-engine browser assurance

I would use three risk classes rather than treating “browser tests” as one indivisible suite.

| Change class | Pull-request assurance | Scheduled/release assurance |
|---|---|---|
| Browser runtime, routing, hydration, workers, storage, graph/map rendering, CSS/layout, accessibility interaction, browser dependencies or the journey runner itself | Affected journeys in Chrome, Firefox and WebKit | Complete three-engine suite at release |
| Generated data, search shards, semantic mappings, registry projections or presentation configuration with an unchanged consumer contract | Unit/contract checks plus a targeted Chromium consumer journey | Complete three-engine suite nightly and at release |
| Markdown, reports, evidence envelopes, release metadata and external-link observations | Render/link/Site checks; browser reading smoke when HTML changes | Nightly documentation journey and terminal publication journey |
| Pure schemas, Python processing or internal tooling that cannot affect published bytes | Deterministic and contract tests only | Covered transitively by periodic complete audits |

Some qualifications matter:

- Changes to browser-test infrastructure require all three engines because the evidence mechanism itself changed.
- CSS, focus management, downloads, service workers, URL restoration, SVG/canvas and worker behaviour deserve cross-engine PR testing.
- An authenticated check of a protected Historic England page is source-identity evidence, not an Explorer compatibility test. It generally needs one genuine browser, not three engines.
- Terminal release should retain the complete matrix until the impact planner has accumulated strong historical and mutation evidence.

Thus PR #69 should have received registry, Site, reading-page and terminal-publication checks—not the complete corpus and Explorer matrix.

## 3. YAML-LD or JSON-LD canonical form

“Canonical” should be separated into three meanings:

1. **Authoring source:** constrained YAML-LD front matter in Markdown.
2. **Semantic identity:** a normalized graph/data model independent of serialization.
3. **Interchange format:** generated JSON-LD.

YAML-LD is the right authoring source here because Markdown is already the repository’s source of truth and YAML is approachable for beginners and curators. But it must be a deliberately constrained, lossless YAML representation of the JSON-LD data model—not an alternative semantic language.

The normalized graph should determine semantic equality and semantic roots. Raw YAML bytes should have their own source hash, but formatting, key ordering or quoting changes should not imply a different graph when the meaning is unchanged.

I would not generate JSON-LD only at release time. That would move projection defects—such as the YAML quoting issue already encountered—to the latest possible stage. Instead:

- generate and validate affected JSON-LD shards whenever semantic inputs change;
- reuse unchanged content-addressed projections;
- assemble the complete JSON-LD release view at promotion time.

The Explorer should consume the normalized contract rather than depending on YAML parser behaviour. JSON-LD then remains the standards-facing interchange form without forcing authors to maintain two equivalent sources.

## 4. Link-validation sharding and freshness

Yes, but internal and external links need different treatment.

Internal Site links are deterministic build dependencies. They should be checked immediately for affected pages against a complete route/fragment index. They do not need a freshness schedule.

External links should have two separate artifacts:

- a stable **link-intent manifest** in the candidate, containing the canonical URL, expected identifier or page identity, source record and criticality;
- timestamped **observation receipts** outside the candidate, containing response status, redirects, final URL, identity match, access method, ETag/Last-Modified where available, and expiry.

Storage should be hash-sharded by canonical URL, with a reverse index from records to link hashes. This means:

- a changed record rewrites only its adjacency and relevant link shards;
- the same official URL is checked once even if many records use it;
- domain grouping can still control concurrency and rate limits;
- a refreshed observation does not alter the corpus or Site candidate.

Freshness should be risk-based:

- critical identity/provenance links: required at terminal promotion and refreshed relatively frequently;
- ordinary official references: scheduled refresh with a longer lifetime;
- immutable commit/tag evidence: validate at publication;
- transient authentication, throttling and server errors: retry/classify without immediately treating them as broken identity.

Promotion should fail when a required critical observation is expired or conclusively broken—not merely because an optional contextual link is temporarily unavailable.

This would replace the current 19.5 MB monolithic link-validation output with bounded, reusable evidence.

## 5. Publication ownership for future exemplars

No further production-scale exemplar should be added to the current `okf-explorer` Pages closure. The current local Site is 988,193,432 bytes, leaving only 11,806,568 bytes below its configured one-billion-byte guard.

I would separate ownership as follows:

- `okf-explorer`: application shell, general documentation, schemas, registry and compatibility routes;
- one independently deployed unit per exemplar family or domain lifecycle;
- a separate promotion/evidence channel referencing both the Explorer build and exemplar roots.

For this exemplar, a natural unit would be something like `okf-heritage-coventry-warwickshire`, containing:

- faithful corpus;
- tiny assurance fixture;
- isolated synthetic supplement;
- domain documentation and semantic exports;
- its own releases, Pages deployment and receipts.

The central registry would point to its descriptor and latest signed promotion envelope. A thin compatibility route could remain in `okf-explorer`.

The boundary should follow ownership and update cadence, not merely file size. Two packs belong together only when they share:

- source freeze and refresh schedule;
- curator or accountable owner;
- rights/access policy;
- schema/profile lifecycle;
- promotion and rollback decision.

I would introduce a soft capacity threshold—well below the hard limit—so ordinary updates and evidence never consume the last few percent of headroom. Existing heritage material can migrate after byte-for-byte and browser parity is proved; future exemplars should use the separated model immediately.

Taken together, these decisions produce a clean architecture: human-authored YAML-LD generates independently rooted data components; JSON-LD is a validated projection; the Explorer is a separately rooted consumer; external observations and promotion decisions live in signed envelopes; and an impact planner chooses only the affected build and assurance cones.
````

## Contribution Reading

- User contribution: Asked for explicit decisions on candidate status, browser tiers, semantic canonicalization, link freshness and exemplar ownership.
- Codex contribution: Resolved the five architecture questions as one coherent candidate, assurance and publication model.

[EX-0006](0006-create-the-end-to-end-engineering-postmortem.md) | [start-to-finish reader](../readers/conv-001-heritage-evaluation-foundry.md) | [EX-0008](0008-implement-every-recommended-refactoring-and-publication-control.md)
