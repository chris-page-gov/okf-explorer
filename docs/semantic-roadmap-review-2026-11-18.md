# Explorer semantic roadmap review

The [OKF 0.2 relationship contract](https://github.com/chris-page-gov/okf-explorer/pull/75)
merged at `596deb28ba25804bcea983f7be42acb89631e2e8`.
[Explorer v0.6.0](https://github.com/chris-page-gov/okf-explorer/releases/tag/v0.6.0)
released that foundation at `4bb7b92a64b7ba69bde9b1e86786217338cd166d`.
Its [vendored profile lock](../profiles/bundle-wiki/v1.vendor-lock.json)
records the immutable profile identity
`854d1853b71ec8bda3424924f0f0985fe24aa7bca4c180d15f359fe259ef4c7e`.
The review below uses that baseline and the current source as inspected on
18 November 2026. The roadmap items remain open while their acceptance
evidence is outstanding. [Roadmap review issue](https://github.com/chris-page-gov/okf-explorer/issues/77)

## Released foundations

The Explorer can show a predicate-aware focus graph from governed assertions.
Label-only bundles continue to work. The file-based contract can bind
predicate and identity registries, assertion status, scope, authority,
derivation, evidence and rights. The newer
[predicate registry v2](../profiles/predicate-registry/v2/index.md) binds
registry bytes independently. A rendered bundle can contain governed
assertions while its classification as an ontology remains unestablished.
The browser presents supplied relationships and performs no general OWL
inference. See the [consumer and authoring contract](okf-0.2-yaml-ld-semantic-authoring.md).

## Delivery and acceptance

| Issue | Foundation in the repository | Remaining implementation and evidence |
| --- | --- | --- |
| [#49 Governed vocabulary](https://github.com/chris-page-gov/okf-explorer/issues/49) | The semantic and assertion schemas, predicate registries and stable IRI rules cover directed relationships. Existing small graph generation projects its relationships into a registry. | Publish governed SKOS schemes with topic, format and licence identities, explicit mappings and integrity bindings. Check versioned exemplar consumption, resolution in the published site, authoring guidance and unchanged label-only fixtures. |
| [#50 Validation and remediation](https://github.com/chris-page-gov/okf-explorer/issues/50) | Builder and profile checks can validate structure and policy. Producers may run versioned SHACL conformance separately. | Define stable findings and publish deterministic reports from pinned shapes. Add a validation view with severity, focus node, path, source and remediation. Test a round trip between findings and records, including multi-bundle findings. Retain SHACL 1.2 experiments as their own work. |
| [#51 Bounded inference](https://github.com/chris-page-gov/okf-explorer/issues/51) | Assertion records have a status and derivation fields. Existing views preserve and display selected assertion evidence. | Implement an explicit allowlist of bounded rules with deterministic positive, negative, cycle and budget checks. Materialise results in the builder with supporting assertion IDs and a derivation activity. Add status filters, counts and a keyboard-accessible comparison in Explorer. |
| [#52 Ontology navigation](https://github.com/chris-page-gov/okf-explorer/issues/52) | The Graph supports a predicate-aware neighbourhood, grouping and inspection for authored input. Existing faceting and grouping help users navigate records. | Add coordinated class, property and SKOS views with stable URLs, qualified hierarchy-aware search and reversible source navigation. Preserve mapping strength and consume the report, inference and provenance contracts. Evaluate supported discovery and ontology-engineering tasks, including keyboard and list alternatives. |
| [#54 Standards and activity exports](https://github.com/chris-page-gov/okf-explorer/issues/54) | The standards crosswalk supplies mappings and limitations. Existing build receipts bind important inputs and outputs. | Each exporter needs a versioned mapping, deterministic fixtures, conformance checks and source navigation. OpenAPI retains parsed locations. PROV binds reviewed inputs and activities. |

### Acceptance to carry into the release

| Issue | Staged implementation | Release evidence still needed | Deferred scope |
| --- | --- | --- | --- |
| #49 | Three SKOS schemes, explicit mappings, registry and Reader example | Check the deployed term resolver, sample descriptor and label-only compatibility | Further public-sector terms follow reviewed revisions |
| #50 | Pinned SHACL Core, stable findings, filters, remediation and source links | Check both published examples and the finding-to-source round trip | SHACL 1.2 experiments and ontology consistency assessment have separate scope |
| #51 | Bounded subclass materialisation, supporting assertions, derivation activities and status counts. The PROV-O example retains two source assertions and one separate inference. | Verify the published comparison and a reviewed producer rule application | Additional rules need their own bounded evaluation |
| #52 | Class, property and SKOS navigation, scoped hierarchy search, mapping filters, shared URLs and explicit record links | Record representative discovery and ontology-engineering tasks against the published build | Hierarchy expansion of bundle record search needs separate policy and evidence |
| #54 | DCAT-AP, OpenAPI, DQV and Site activity exporters with deterministic checks. Site provenance covers validation, assembly, deployment and live verification. | Link production export artefacts to source records and retain independent review evidence | Further standards profiles need versioned input contracts |

Keep #54 as one integration issue while the four exporters share source
identity, validation and provenance evidence in the same release. Production
producer adapters can be verified independently as their input contracts are
ready.

Begin with **#49 → #50 → #51 → #52**. Build and review the PROV part of
**#54** alongside the validation finding contract. Agree activity identifiers
before materialising inference. The DCAT-AP, OpenAPI and DQV parts can proceed
when their inputs and mappings are ready. Incremental facet accessibility may
ship independently. Any hierarchy-driven narrowing needs #49 and its tests.

The planned views are class and property hierarchies, SKOS concept schemes,
hierarchy-aware facets, provenance paths, validation findings, and asserted
and inferred comparisons. Link each delivered view to its implementing pull
request, tests and exact release evidence before updating the
[beginner guide's status](beginners/09-explorer-views-and-presentation.md#current-behaviour-versus-roadmap).

## First candidate export

`scripts/export_site_provenance.py` projects the Site assembly receipt and
its exact publication identity into deterministic N-Triples. The graph links
the assembly activity to the recorded source commit and publication
configuration, the build script and Explorer manifest, and the generated Site
tree and identity. The graph leaves assembly times unspecified. An optional
`--live-verification` receipt adds the exact browser verification activity,
its verifier, the candidate inputs and the recorded observation time.
An optional `--deployment-job` also consumes the exact GitHub Actions job
JSON from the same verified Pages release. The export records the deployed
Site at its published location, the workflow and software agent, the input
identities, and the start and end of the successful deployment step. The
browser observation must follow that step and match the same Site identity.
Supply the exact successful Pages build job as `--build-job` to record the
conformance check before assembly and attach the observed assembly times.
The jobs must come from the same run and attempt. Independent review
requires its own evidence.
[PROV-O Recommendation](https://www.w3.org/TR/prov-o/)

```sh
uv run --locked python scripts/export_site_provenance.py \
  --receipt .site-components/assembly/site-candidate-receipt.json \
  --identity _site/okf-publication-identity.json \
  --output /tmp/okf-site-provenance.nt
```

## Candidate SHACL finding identities

`scripts/normalise_shacl_report.py` takes a bound bundle identifier and an
existing SHACL Core validation report in N-Triples. For results with named
focus nodes, shapes and simple paths, it produces deterministic finding IDs
from the bundle, severity, focus, shape, path and constraint. Multiple results
with those same fields share an ID and retain their occurrence count. The
output also records the report's exact SHA-256 and its conformance outcome.
The projection excludes free-text messages and values from the result.

`scripts/run_shacl_core.py` runs the pinned pySHACL version on up to 3,000
N-Triples statements and 256 Turtle shape statements. Supply the data and
shape files and their SHA-256 digests using `--graph`, `--shapes`,
`--graph-sha256` and `--shapes-sha256`. Set the examined bundle IRI with
`--bundle` and write the JSON findings to a fresh `--output` path. The
governed vocabulary provides [named Core shapes](../profiles/governed-vocabulary/v1/shapes.ttl).
The runner uses explicit Core targets and processes the supplied local
graphs. It records the graph and shapes digests, validator and version.
The report SHA-256 binds a deterministic N-Triples projection of named
findings and their occurrences.

Producers still need to bind the exact report to their deployed descriptor.
[SHACL Recommendation](https://www.w3.org/TR/shacl/)

### Inspect findings in the Explorer

Set the large-corpus descriptor's `@id` to the bundle IRI used in the report.
Declare `entrypoints.shacl_findings` with the projection's descriptor-relative
`path`, exact `bytes` and lowercase SHA-256 in `sha256`. The view checks these
bindings, the bundle identity and each stable finding ID before displaying
the producer's SHACL outcome. It supports up to 2,000 distinct findings in a
2 MiB JSON file. Use the descriptor URL to open the report and share its
`severity`, `finding` and `page` parameters.

Optional `entrypoints.shacl_review` uses the same resource binding. The
review document has schema `okf-shacl-review.v1`, the projection's
`findings_sha256` and a `findings` array. Each row has a known finding
`id`, plain-text `remediation` and one to 16 distinct `sources`. Each
source gives its `bundle` IRI, public `descriptor` URL, `record_route`
and `evidence` URL. Publish every participant in a cross-bundle finding
and use frozen descriptor URLs where available. The view labels the review
as publisher-declared and checks its binding to the findings projection.
The browser Back action restores the selected finding after opening a source
record. A browser retrieval error has its own message. The view displays
recorded outcomes, linking to source assertions for inspection.

## Candidate quality export

The DQV export reads the same SHACL Core N-Triples. It writes four
measurements for conformance and the occurrence counts for violations,
warnings and information. Each grouped finding produces an annotation with
its named focus, shape, predicate and severity. It binds every measurement
and annotation to the exact report digest and the projection activity. The
projection records the supplied SHACL outcome and leaves assessment of source
accuracy and fitness for use to the reader. [W3C DQV Note](https://www.w3.org/TR/2016/NOTE-vocab-dqv-20161215/)

```sh
uv run --locked python -m scripts.export_shacl_dqv \
  --report report.nt --bundle urn:example:bundle --output /tmp/quality.nt
```

Supply `--report-url` when publishing the same report beside its export.
The two vocabulary examples use Explorer’s **Related material** links to
open both artefacts. The quality graph binds the source by digest and
records the report’s published location. Its annotations identify the
affected concepts by their original IRIs.

## Candidate subclass inference

`scripts/materialise_subclass_candidate.py` supplies the first bounded
inference rule. Set `--enable-subclass-transitivity` explicitly to apply
`urn:okf:rule:subclass-transitive:v1`. The rule uses asserted subclass links
from one reviewed scope with the governed `official` assertion status. It
retains the source assertions, emits new non-reflexive edges and records the
rule, activity and each supporting assertion with `inferred` status. Its
machine-readable rule manifest records the limits of 2,048 input assertions,
20,000 edge visits and 50,000 support references. The PROV-O graph binds the
activity to the admitted input digest and the exact support for each output.
In Links, users can compare and filter assertion statuses within the visible
selection or current relationship page. Source records retain their existing
assertion status. Rule approval and integration with producer validation and
publication remain open. [OWL 2 Profiles Recommendation](https://www.w3.org/TR/owl2-profiles/)

The worked example takes two subclass statements from W3C PROV-O. The
comparison adds one transitive subclass statement from Revision to Entity
Influence. Select its supporting assertions to see the W3C source for
each direct link. The derivation export includes the rule manifest and
activity for the same inferred statement. [Source-only bundle](../profiles/bounded-inference/v1/asserted.json),
[comparison bundle](../profiles/bounded-inference/v1/comparison.json),
[derivation export](../profiles/bounded-inference/v1/derivation.json)

Reproduce and check the example with
`uv run --locked python -m scripts.build_subclass_inference_example --check`.

## Candidate ontology navigation index

`scripts/build_ontology_navigation_index.py` projects explicitly declared
class and property hierarchies, SKOS schemes, terms and mappings from a
bounded N-Triples graph. It binds the publication identifier and graph digest.
Each mapping retains its exact, close, broader, narrower or related predicate.
Declare the index under `entrypoints.ontology_navigation` with a relative
JSON path, exact byte length and SHA-256. The Explorer checks that binding
and the index's source IRI against the descriptor's `@id`. Use the Ontology
view to search labels, choose a term kind, follow declared parents and
children, and filter results to direct children. Select **Include nested
children** to follow the declared subclass, subproperty or narrower-concept
paths within that hierarchy. The scope remains visible while searching.
Mapping filters
preserve the recorded predicate and strength. The view records its search,
filters and selection in the URL and links to the bundle's validation and
assertion-status views. The governed vocabulary example links the exact Reader
record and ontology term in both directions. Published producer adoption and
task-based evaluation remain open.

## Independent work

- **#76** is a source-inspection correctness priority. Explorer
  `4d23db57ff5d2dba32edd9936254f33c2b7cded9` passed the published dated CLML
  journey. The legislation producer still needs a versioned typed Reader
  transport that preserves the frozen audit material. It consumes
  `okf-explorer-large-corpus.v1` and the existing
  [resource source access contract](large-record-narrative-source-contract.md).
  [Source inspection issue](https://github.com/chris-page-gov/okf-explorer/issues/76)
- **#53** is an independent accessibility priority. Its release evidence
  needs light, dark, system and forced-colours behaviour with keyboard
  focus, Graph, Map and print checked. [Accessible theme issue](https://github.com/chris-page-gov/okf-explorer/issues/53)
- **#84** needs a reusable boundary-pack contract and exact data provenance.
  The map can begin with a separately versioned sidecar. Any semantic joins
  should use governed identifiers and remain independently verifiable. [Boundary pack issue](https://github.com/chris-page-gov/okf-explorer/issues/84)
- **#100** needs an exact deployed guide audit across three browser engines
  and a review of every chapter and external reference. [Learning path issue](https://github.com/chris-page-gov/okf-explorer/issues/100)
- **#150** adds source-bound review in Evidence. Keep producer adoption
  separate from the Explorer release, and obtain the DWP specialist
  assessment before accepting a passage-boundary change. [DWP producer review](https://github.com/chris-page-gov/okf-dwp/issues/42)

The first three release phases also resolved #216, #217, #218, #219, #220,
#221, #222, #223, #89 and #92. The release tracker records the exact
deployments and browser journeys for those closed issues. [Phased release tracker](https://github.com/chris-page-gov/okf-explorer/pull/227)

Producer migrations keep their own locked source, schema, Reader and package
identities. Existing mirrors that claim the Bundle Wiki v1 URI retain its
exact published profile bytes. Any additive vocabulary or report profile has
its own version and consumer acceptance. The existing
[producer progress register](okf-0.2-yaml-ld-semantic-authoring.md#rollout-progress)
records those release decisions.
