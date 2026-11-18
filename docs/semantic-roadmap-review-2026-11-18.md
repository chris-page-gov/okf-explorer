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
| [#54 Standards and activity exports](https://github.com/chris-page-gov/okf-explorer/issues/54) | The standards crosswalk supplies mappings and limitations. Existing build receipts bind important inputs and outputs. | Keep #54 as the integration tracker. Deliver separate focused pull requests for DCAT-AP, OpenAPI, DQV and PROV. Each needs a versioned mapping, deterministic goldens, conformance checks and source navigation. The OpenAPI increment must retain parsed locations. The PROV increment must bind build and review activity without exposing secret material. |

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
tree and identity. It keeps only allowlisted identities. Assembly times are
absent from these inputs, so the graph leaves them unspecified. This is a
local candidate export. It supplies no deployment, validation or enrichment
activity. [PROV-O Recommendation](https://www.w3.org/TR/prov-o/)

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
Producers still need to publish reports from pinned shape execution.
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

## Candidate subclass inference

`scripts/materialise_subclass_candidate.py` supplies the first bounded
inference rule. Set `--enable-subclass-transitivity` explicitly to apply
`urn:okf:rule:subclass-transitive:v1`. The rule uses asserted subclass links
from one reviewed scope. It retains the source assertions, emits only new
non-reflexive edges, and records the rule, activity and supporting assertion
IDs with `inferred` status. Processing stops at 2,048 input assertions or
20,000 edge visits. No Reader or producer uses this candidate automatically.
The next work includes rule approval, validation integration, export
provenance and the Explorer comparison view. [OWL 2 Profiles Recommendation](https://www.w3.org/TR/owl2-profiles/)

## Candidate ontology navigation index

`scripts/build_ontology_navigation_index.py` projects explicitly declared
class and property hierarchies, SKOS schemes, terms and mappings from a
bounded N-Triples graph. It binds the publication identifier and graph digest.
Each mapping retains its exact, close, broader, narrower or related predicate.
The index supplies declared edges only. Browser navigation, hierarchy-aware
facets, links to findings and provenance, and the evaluation remain open.

## Independent work

- **#76** is a source-inspection correctness issue. Route official CLML and
  other declared media to an appropriate inspector or download. Keep the
  producer's typed source references and the Explorer routing change on
  separately verified release paths. [Source inspection issue](https://github.com/chris-page-gov/okf-explorer/issues/76)
- **#53** can proceed independently. Its release evidence needs light, dark,
  system and forced-colours behaviour with keyboard focus, graph, maps and
  print checked. [Accessible theme issue](https://github.com/chris-page-gov/okf-explorer/issues/53)
- **#84** needs a reusable boundary-pack contract and exact data provenance.
  The map can begin with a separately versioned sidecar. Any semantic joins
  should use governed identifiers and remain independently verifiable. [Boundary pack issue](https://github.com/chris-page-gov/okf-explorer/issues/84)

Producer migrations keep their own locked source, schema, Reader and package
identities. Existing mirrors that claim the Bundle Wiki v1 URI retain its
exact published profile bytes. Any additive vocabulary or report profile has
its own version and consumer acceptance. The existing
[producer progress register](okf-0.2-yaml-ld-semantic-authoring.md#rollout-progress)
records those release decisions.
