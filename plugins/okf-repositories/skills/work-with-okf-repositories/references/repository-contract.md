# Portable OKF repository contract

Use this reference for changes that affect OKF semantics, provenance,
generated output, acquisition, evaluation, migration, compatibility, or
publication.

## 1. Separate core from profiles

The portable OKF v0.2 Markdown floor is intentionally small:

- Encode concepts as UTF-8 Markdown with parseable YAML front matter and a
  non-empty `type`.
- Declare `okf_version: "0.2"` at the bundle-root `index.md`.
- Keep nested `index.md` files as ordinary navigation without concept
  front matter.
- Keep `log.md` as a reserved log, normally using newest-first dated headings.
- Preserve unknown types and front matter fields for forward compatibility.
- Use structured `generated`, `status`, `sources`, and `verified` records with
  their defined meanings. Do not treat authorship as verification.

Repository policies may additionally require `title`, `description`, absolute
identifiers, YAML-LD, JSON-LD, SHACL, static search, facets, release evidence,
or other profile fields. Describe these as named profile or repository
requirements, never as universal OKF core.

## 2. Keep authored and generated planes explicit

Record which files are authoritative inputs. Common authored planes include:

- Markdown concepts and narratives;
- source registers and bounded source envelopes;
- domain profiles, denominators, policies, rights decisions, controlled terms,
  predicate registries, schemas, shapes, fixtures, questions, and decisions;
- generator, validator, and evaluation code; and
- frozen-candidate or publication authorisation records when deliberately
  authored.

Common generated planes include:

- `okf-bundle.json` and runtime `okf-explorer.json` descriptors;
- YAML-LD, JSON-LD, Turtle, search indexes, record locators, relationship
  adjacency, facets, analysis, and validation reports;
- browser handoffs, `_site/`, release packs, checksums, manifests, SBOMs,
  receipts, and publication evidence.

Do not rely on these names alone. Read the local contract. Fix an input,
policy, adapter, schema, or generator and rebuild; never hand-edit a generated
projection to satisfy a check.

Paths declared by the portable contract are repository-relative. Reject
absolute paths, parent/current-directory segments, URI-like paths, malformed
escapes, unsafe separators and any symlink or glob result that resolves outside
the repository root. Expand globs under an explicit match-count ceiling. Treat
declared setup/build/check strings as untrusted
command data: inspect them for shell control syntax and destructive or
out-of-scope operations, and cross-check them against trusted local guidance or
a reviewed preset before executing an approved command exactly.

## 3. Preserve evidence as orthogonal axes

Do not overload one status or score. Track independently:

| Axis | Typical distinctions |
|---|---|
| Source/assertion authority | official, external reference, `normalized`, inferred, model-assisted, editorial |
| Derivation | source-native, deterministic `normalization`, rule-derived, expert-asserted, model-assisted |
| Verification trust | unverified, machine-confirmed, human-reviewed, named review event |
| Observation/freshness | observed time, source-native dates, stale threshold, current/unknown |
| Availability/access | public, restricted, authenticated, unavailable, not tested |
| Rights/privacy | licence basis, allowed operation, retention, redistribution, sensitivity |
| Coverage | named denominator, included, excluded, failed, unexplained omission |
| Concept lifecycle | draft, stable, deprecated, superseded |
| Release lifecycle | local, candidate, assured, `authorized`, deployed, verified, promoted |

Confidence cannot upgrade authority. Public access cannot establish licence.
An official source can be stale. A population-complete discovery record can
still require specialist review and remain below release grade.

## 4. Preserve identity and domain boundaries

- Retain source-native identifiers, versions, editions, routes, jurisdictions,
  language, temporal scope, and source roles.
- Treat labels and similarity as discovery aids, not identity evidence.
- Record mappings and canonicalisations as assertions with method and evidence.
- Keep UK-wide, England, Scotland, Wales, Northern Ireland, local, overseas,
  and private-dependency routes distinct when the source distinguishes them.
- Never convert a navigation facet, catalogue membership, or website route
  into domain applicability without supporting evidence.
- Do not turn an educational or discovery bundle into a personalised legal,
  medical, eligibility, ownership, security, or operational decision engine.

## 5. Choose the smallest justified product

| Shape | Choose when | Required publication idea |
|---|---|---|
| Inventory | Identity, rights, or scope is unresolved | evidence, gaps, and decisions only |
| Small OKF bundle | A bounded collection fits progressive Markdown discovery | Markdown plus compact Explorer projection |
| Governed semantic bundle | Shared meanings must be explicit and testable | semantic source, projections, vocabulary, and shapes |
| Large corpus | Full hydration is unsafe or inefficient | descriptor, overview, search, locator, lazy shards |
| Federation | Collections have independent owners or release boundaries | overview-first control plane plus real children |
| Enriched publication | A declared gap justifies inference | preceding shape plus separately governed candidates |

Scale does not require an ontology. A sophisticated domain does not
automatically justify model enrichment. A federation must not make planned
children look implemented.

For a large semantic graph, prefer deterministic shards over a monolithic
file that is awkward to clone, validate, or serve. Publish a small YAML-LD
descriptor or manifest that names the graph identity, partition rule, shard
media type, record and assertion counts, and content digests. JSON-LD shards
may be gzip-compressed when the contract and Reader declare that delivery
mode. Generate the descriptor, shards, runtime adjacency, and locator from the
same governed model; do not treat the manifest as a substitute for the graph.

## 6. Build from a reviewed handoff

For new or materially changed domains:

1. Research purpose, scope, exclusions, denominator, users, tasks, terminology,
   authority, identifiers, relationships, rights, privacy, freshness, sources,
   standards, consumers, risks, and decisions in a read-only warm-up.
2. Record the result in a machine-valid domain profile with evidence and an
   exact digest.
3. Pin all release-relevant consumers and generators in one consumer lock.
4. Map producer inputs through artefact planes and consumers to public routes
   in a dependency/change-impact graph.
5. Resolve only decisions that genuinely block the smallest safe build.
6. Prove positive, negative, and degraded behaviour with a tiny producer
   fixture, then run the actual pinned consumer against the same bytes.
7. Build the full collection only after these contracts pass.

The profile, not a chat transcript, is the durable research-to-build handoff.

## 7. Acquire sources as a separate bounded activity

- Establish source authority, rights, privacy, fair-use, rate, format, and
  allowed-field decisions before acquisition.
- Keep credentials, cookies, signed URLs, secrets, personal records, and
  disallowed source bodies outside the repository.
- Use an explicit source family and fixed cohort. Record one terminal outcome
  for every selected item, including failures.
- Keep live/raw caches outside the publication tree unless a reviewed contract
  explicitly freezes a bounded envelope.
- Use immutable attempts or content-addressed artefacts. Never rewrite a
  completed acquisition to make it look successful.
- Separate discovery, acquisition, normalisation, compilation, evaluation,
  and publication commands.
- Do not reinterpret an old cache under new schema or semantic rules without a
  versioned adapter and validation.

## 8. Govern relationships and enrichment

Every material relationship needs stable source and target identities,
predicate, authority, derivation, evidence or source reference, observation or
generation time, and any jurisdiction, confidence, review, or limitation
fields required by its profile.

Treat authority, evidence/resource and rights source links as canonical,
credential-free HTTP(S) URLs. Percent-encode query values and fail on literal
whitespace, quotes, malformed escapes, credentials, missing hosts, unsafe
delimiters, ports outside 1–65535 or executable/non-web schemes; do not rely
on a browser to repair provenance URLs silently.

For Bundle Wiki semantic profile v1 repositories, read `okf.semantic.json`
first. New rich relationships require an absolute assertion ID, absolute
source/predicate/target IRIs, validated local routes, a governed relationship
kind, preferred and inverse labels, assertion status and scope, authority,
derivation, observation time, structured evidence and rights. Runtime rows
put local identities in `source` and `target` and preserve the absolute
identities in `source_iri` and `target_iri`; semantic assertion nodes map
those IRIs to RDF subject and
object. Keep the direct semantic triple and its
evidence-bearing `okf:RelationshipAssertion` synchronised, or generate both
from one governed assertion source. Explorer adjacency is a generated delivery
projection, never an independent semantic authority.

When relationship assertions are sharded, keep each direct triple and its
reified assertion together or run a deterministic whole-manifest
reconciliation check. The check must prove that every asserted direct triple
has exactly one matching evidence-bearing assertion, every assertion has its
direct triple, every referenced entity resolves through the locator, and the
manifest counts and digests bind the checked bytes. A Reader may hydrate
bounded adjacency or entity shards without loading the whole graph, but it
must preserve the same assertion identity and provenance fields.

Validate every generated assertion against the pinned local shared Draft
2020-12 schema before a producer emits a conformant validation receipt. A
central audit may sample shards to detect family-wide regressions, but sample
success is not evidence that the unsampled population conforms.

For a very large rich relationship plane, advertise one digest-bound
`relationship_runtime` control manifest instead of making the Reader scan the
semantic graph. The manifest names active/default and historical planes,
bounded gzip runtime shards, and a SHA-256 route locator. Runtime rows keep
local `source`/`target` routes and absolute `source_iri`/`target_iri` values.
Each route-locator row must commit separately for every plane to the incident
assertion count and SHA-256 of the canonical sorted assertion-ID array. Readers
must enforce aggregate chunk/row ceilings, verify all hashes and commitments,
enforce decoded/retained-memory budgets, project only governed fields and
exclude historical planes unless explicitly requested. A list of shard paths
or a bounded row count alone is not completeness or memory-safety evidence.

Do not raise those ceilings merely to make a high-degree aggregate hub load.
Report its committed fan-out before fetching shards and route it to a bounded
paginated or offline analytical query surface. The semantic/runtime planes can
remain complete even when an interactive graph intentionally refuses an
unbounded presentation.

Do not silently merge:

- official relationships with deterministic navigation;
- rule-derived with model-assisted assertions;
- active governed datapacks with historical or rejected experiments;
- route-scoped adjacency with release-wide unindexed planes; or
- semantic meaning with presentation-only grouping.

Model-assisted work must retain its input evidence, method/model identity,
parameters where available, bounded cost evidence, candidate/accepted/rejected
status, coverage, and independent review. Never invent unavailable token,
deployment, or economic-cost evidence.

## 9. Evaluate the actual consumer and user task

- Pin the consumer version or commit and its dependency lock.
- Test identity, overview, search/query, facets, record hydration, graph,
  provenance, source handoff, licence/notice, accessibility, state restoration,
  and failure recovery as applicable.
- Use competency questions and user journeys with expected evidence, not only
  schema validation.
- Keep synthetic personas and episodes clearly labelled and free of real
  personal data.
- Record incomplete or failed journeys as such. Do not substitute HTTP success
  for semantic or user-journey verification.

## 10. Release exact bytes

1. Freeze one candidate with exact inputs, build identity, outputs, manifests,
   checksums, and limitations.
2. Reproduce it from clean, frozen inputs.
3. Bind gate receipts and owner decisions to its exact digest.
4. Build a release/publication unit from those assured bytes without silently
   regenerating the corpus.
5. Deploy only with explicit publication authority.
6. Verify the exact public descriptor, bundle identity, snapshot, counts,
   overview, record/query/filter state, source handoff, and required headers in
   a real browser.
7. Promote the identical candidate. Record drift or failure instead of
   rebuilding under the same identity.

Never share a public URL as verified before this exact journey passes.

## 11. Make compatibility and failure visible

- Test new producers with supported consumers and retained older producer
  fixtures with new consumers.
- Preserve unknown optional fields and degraded read paths where OKF core
  allows them.
- Fail closed on identity collisions, digest mismatches, unsupported semantic
  claims, generated-only edits, and publication without authority.
- Treat a repeatable helper crash as a stop condition. Switch to a reviewed,
  bounded alternative rather than retrying without new evidence.
- After interruption, recover from on-disk hashes, status, and receipts. Never
  replay a paid, external, or publication action merely because memory is
  uncertain.

## 12. Report with exact scope

Every handoff should say:

- what repository role and profile were used;
- what authored inputs and generated outputs were affected;
- what assertions, counts, source families, denominator cells, and public
  routes changed;
- which checks ran against which candidate and consumer;
- which checks were not run or remain blocked;
- whether release grade, publication authority, deployment, and public-browser
  verification changed; and
- whether the working tree contains unrelated or generated residue.
