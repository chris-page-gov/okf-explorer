# OKF v0.2 conformance and Explorer profile

This repository targets [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/3fcbb9f828c2f23d109c855ee403c3a4c81f3a96/okf/SPEC.md). It deliberately separates the small interoperable core from the richer OKF Explorer bundle-wiki profile.

## Core conformance

The canonical hand-authored bundle is the Markdown tree enumerated by
`scripts/update_viewer.py`. It follows the v0.2 core rules:

- every non-reserved concept is UTF-8 Markdown with parseable YAML frontmatter
  and a non-empty `type`;
- the root `index.md` declares only `okf_version: "0.2"`;
- nested `index.md` files have no frontmatter and provide progressive
  disclosure through ordinary Markdown headings and links;
- `log.md` has no frontmatter and uses newest-first `## YYYY-MM-DD` headings;
- concepts use structured `generated`, `status` and `sources`
  fields instead of legacy `timestamp`, string verification flags and body-only
  provenance;
- unknown types and frontmatter keys are retained in generated projections;
- broken links and missing optional families remain consumable, as required by
  the permissive core.

`scripts/check_okf.py` reports core errors separately from the stricter profile
checks. `scripts/build_okf_bundle.py` and `scripts/update_viewer.py` project the
same Markdown source into the Svelte and classic viewers.

For the migrated canonical corpus, `generated.at` uses the actual Git authoring
commit time (9 July 2026), rather than reusing publication dates that the v0.1
`timestamp` field had overloaded. Legacy actor-free `verified: yes` flags are
not promoted into named verification events: a Git author record is evidence
of authorship, not evidence that the concept was checked against its sources.
Publication and coverage dates belong in source or domain-specific temporal
metadata.

## v0.1 compatibility

Explorer is a v0.2 consumer that can still open v0.1 bundles:

- `generated.at` wins when `generated` is present; otherwise the UI and
  Timeline may use legacy `timestamp`;
- frontmatter `sources` wins when the key is present; otherwise a bounded
  legacy `# Citations` list may be projected as provenance;
- a bare `verified: { by, at }` mapping and a list of mappings normalize to the
  same representation;
- missing trust and lifecycle fields never reject a concept.

Compatibility fallbacks are labelled in the UI. They do not silently invent a
generator, verifier, lifecycle status beyond the specified `stable` default, or
source credibility.

## Trust, lifecycle and attestation

The Svelte Explorer derives the v0.2 trust tier from `verified`:

- no verification events: **unverified**;
- non-`human:` actors only: **machine confirmed**;
- at least one `human:` actor: **human reviewed**.

Only a complete event with a valid OKF actor identifier and ISO 8601 datetime
can raise the displayed trust tier. Malformed optional metadata remains
inspectable but cannot become positive trust evidence.

It also displays `generated.by`, `generated.at`, `status`, `stale_after`,
shared and per-source usage windows, source credibility signals, and all
declared Attested Computation contract fields.

Attested Computation is discovery metadata, not permission to execute. Loading
or navigating a bundle never runs its computation, executor or attester.
Execution, receipts and verdicts require an explicitly authorized runtime
outside the passive Explorer load path. Explorer surfaces contract gaps and
does not claim an attestation verdict where no runtime verdict exists.

## Explorer bundle-wiki profile

The profile adds optional capabilities without redefining OKF core:

- YAML-LD and JSON-LD semantic projections;
- HTTPS federation and registry discovery;
- large-corpus manifests, deterministic search and lazy shards;
- provider datapacks and snapshot/live comparison;
- governed metadata-term registries and closed-world validation reports;
- facet, graph, timeline, map and detail presentation metadata;
- integrity manifests, release data planes and publication metadata.

The profile requires `title`, `description` and a usable content date for this
repository's authored concepts so its views remain informative. Those are
repository policy, not universal OKF requirements. A core-conformant document
carrying only `type` must still be accepted by Explorer.

## Generated exemplars

The UK Government APIs and UK Legislation builders emit:

- a root v0.2 `index.md`;
- reserved indexes and logs in their normative structures;
- selected Markdown concepts with structured generation, lifecycle and source
  metadata;
- an Explorer large-corpus descriptor marked `okf_version: "0.2"`;
- the existing JSON shards, semantic crosswalks and presentation extensions.

The JSON data plane is an Explorer profile projection. The Markdown concept
layer is the OKF core bundle.

Semantic descriptor link text is derived from each resource's serialization
(`.yamlld` → YAML-LD and `.jsonld` → JSON-LD). Producers may advertise one
canonical `semantic_descriptor` and explicit `semantic_yamlld` and
`semantic_jsonld` entrypoints. The current exemplar makes YAML-LD canonical
while retaining both serializations; the UI does not hard-code that choice.

## Compatibility acceptance

The v0.2 release was accepted locally against both sides of the ONS migration:

- the genuine pre-migration `okf-ons` bundle rebuilt from commit `74ad7f5`,
  whose descriptor has no `okf_version`; and
- the same frozen 5,097-record publication after its v0.2 Markdown layer and
  descriptor declarations were added.

Both versions loaded 12 compact facet distributions with 67 directly
selectable segments. Previewing and then committing `geography level = region`
produced the same governed count: 382 matching records, 200 shown, one
publisher and one active filter. The v0.2 view additionally identified the
core version and Markdown layer. Both views retained the explicit
`795eaf2` snapshot versus `d5f0ac9` reviewed-reference drift notice without
performing a live request.
