# OKF 0.3 conformance and Explorer profile

The [central standards register](okf-standards.md) records the current upstream
location, the pinned historical specifications and the owner's bundle catalogues.

The current reference corpus targets [Open Knowledge Format 0.3](https://github.com/open-knowledge-format/open-knowledge-format/blob/527e81aff55992be21507e97004286789126f88c/SPEC.md), announced on 18 November 2026. Its local implementation date is 23 November 2026. It separates the interoperable core from Bundle Wiki v2. The frozen v0.8.2 release remains the core 0.2 baseline; a new implementation is not a claim that every estate producer or release has been accepted.

## Core conformance

The canonical hand-authored bundle is the Markdown tree enumerated by
`scripts/update_viewer.py`. Its independent `reference-bundle/` export excludes
other producers, frozen experiments and fixtures. It follows the 0.3 core rules:

- every non-reserved concept is UTF-8 Markdown with parseable YAML frontmatter
  and a non-empty `type`;
- the current root `index.md` declares `okf_version: "0.3"`;
- nested `index.md` files have no frontmatter and provide progressive
  disclosure through ordinary Markdown headings and links;
- `log.md` has no frontmatter and uses newest-first `## YYYY-MM-DD` headings;
- concepts use structured `generated`, `status` and `sources`
  fields instead of legacy `timestamp`, string verification flags and body-only
  provenance;
- unknown types and frontmatter keys are retained in generated projections;
- broken links and missing optional families remain consumable, as required by
  the permissive core.

`scripts/check_okf.py` checks the controlled producer profile and the independent
export. `scripts/check_reference_core.py` separately inspects every exported
Markdown file under the pinned core 0.3 rules, compares all 151 concepts'
complete frontmatter and bodies with an independent Reader import, and compares
all 418 directed core reference pairs. The rich projection preserves 165 record
identities and 588 assertion identities; 14 navigation records remain extensions.
Optional family/profile diagnostics are not reclassified as core syntax failures.

Build the export with `uv run --locked python scripts/build_reference_bundle.py`.
It includes its own [council tool-access walkthrough](../reference-bundle/walkthrough.html),
diagram, worked answer, source digests and negative controls. Real-browser,
public retrieval and release acceptance have separate receipts. Neither
the export checker nor a graph reference grants permission to invoke a tool.

For the migrated canonical corpus, `generated.at` uses the actual Git authoring
commit time (9 July 2026), rather than reusing publication dates that the v0.1
`timestamp` field had overloaded. Legacy actor-free `verified: yes` flags are
not promoted into named verification events: a Git author record is evidence
of authorship, not evidence that the concept was checked against its sources.
Publication and coverage dates belong in source or domain-specific temporal
metadata.

## v0.1 compatibility

Explorer reads core 0.3 and retains explicit v0.2 and v0.1 compatibility:

- `generated.at` wins when `generated` is present; otherwise the UI and
  Timeline may use legacy `timestamp`;
- frontmatter `sources` wins when the key is present; otherwise a bounded
  legacy `# Citations` list may be projected as provenance;
- a bare `verified: { by, at }` mapping and a list of mappings normalise to the
  same representation;
- missing trust and lifecycle fields never reject a concept.

Compatibility fallbacks are labelled in the UI. They do not silently invent a
generator, verifier, lifecycle status beyond the specified `stable` default, or
source credibility.

## Trust, lifecycle and attestation

The Svelte Explorer derives the trust tier from valid `verified` events.
For core 0.3, only events at or after the latest `generated.at` can raise it;
earlier events remain history. Actor schemes such as `team:` count as machine
confirmation; a current named `human:` event is needed for human review:

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

## Federation conformance

`okf-explorer-federation.v1` is also an Explorer projection, not a replacement
for an OKF root index. A Whole-Law publication therefore keeps its authored
OKF 0.2 Markdown/YAML-LD layer and generates the federation JSON descriptor as
a discovery control plane.

Federation loading is overview-first and passive. It validates child
availability, coverage, authority, freshness and declared routes without
loading a child. `okf-relationship-assertion.v2` preserves official,
deterministically derived, model-assisted and unclassified authority as
different evidence states. The Viewer does not promote one state into another.

The complete contract, YAML-LD transport rules and generator checks are in
[Federated OKF bundles](federated-bundles.md).

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
