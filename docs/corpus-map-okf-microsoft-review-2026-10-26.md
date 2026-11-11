# Corpus Map research review for OKF+ and Microsoft integration

26 October 2026. Research review and proposed direction for maintainers,
knowledge owners and Microsoft platform teams. Review baseline:
`0762e9e067fdb4b32d8e5dc9a9b3ccc572195906`.

Prepared for publication on 2 November 2026. The findings and capability
descriptions retain their original evidence date. Later Explorer changes do
not establish adoption or validation of the proposals below.

## Recommended direction

**Keep OKF+ as a portable, governed evidence bundle and add an optional entity
map that helps people and agents find related source documents.** The research
supports investing in reusable navigation and good starting candidates. It
does not establish that a larger semantic graph, a generated wiki or a bundle
uploaded into Copilot will produce complete, dependable answers.

For Microsoft use, retain one governed bundle and generate two consumer
projections: readable documents for a scoped SharePoint/Copilot experience,
and a read-only service for agents that need explicit navigation, exact source
reads and evidence assembly. Start with one small corpus and compare these
routes before adopting a new storage platform or extending the core format.

The immediate changes should be:

1. Give recurring entities stable identities, grounded aliases and links to
   every document in the admitted snapshot that mentions them, with declared
   coverage gaps.
2. Generate concise entity pages and a searchable entity-to-document index.
   Supply relevant document candidates at query time and retain ordinary
   search for unmapped material.
3. Keep navigation associations separate from governed domain assertions and
   from checks that all required evidence has been retained.
4. Make access control apply to the map, summaries, titles and counts as well
   as the original documents.
5. Assess held-out multi-document questions, identity collisions, permissions,
   changed sources and total operating cost before widening deployment.

These are proposed additions. This review changes documentation; it does not
implement a new profile, configure a Microsoft tenant or establish Microsoft
client compatibility.

## What the paper establishes

The supplied paper is *Follow the Entities: A Corpus Map for Agentic Search*,
by Soyeong Jeong, Sujay Kumar Jauhar, Sung Ju Hwang and Andrew Joohun Nam,
arXiv:2609.37226v1, dated 29 September 2026. It is a preprint with KAIST and
Microsoft affiliations. References to paper pages below use its printed page
numbers. See the [versioned arXiv record](https://arxiv.org/abs/2609.37226v1)
and [version 1 PDF](https://arxiv.org/pdf/2609.37226v1). The
[central bibliography entry](../sources-index.md#corpusmap) records the
citation and the fingerprint of the retained local input PDF.

CorpusMap builds a reusable map before a question is asked. It identifies
document-local mentions, resolves them against an entity registry and exposes
each recurring entity through a page containing an overview, source-attributed
facts, observed names and links to its documents. An entity can connect many
documents across folders, and a document can belong to many entity
neighbourhoods. The graph has two node types, entities and documents. It does
not require direct entity-to-entity relationships. Documents without a
recurring entity remain available through ordinary search. The paper retains
entities linked to at least two documents for this navigation purpose
(sections 3.2 to 3.4, pages 4 to 6).

Construction has four stages: establish an entity type catalogue, extract
grounded mentions, resolve identity and render pages. Resolution can link an
existing entity, add a new one or leave a mention unresolved. Name similarity
alone does not establish identity. Appendix C's construction prompts are
examples of the authors' method; they are not instructions for this review or
authority to execute document content.

### Results and their practical limits

The main experiment uses 80 selected EnterpriseRAG-Bench questions, 79
multi-document WixQA questions and 238 HERB content questions. The respective
corpora contain 2,819, 6,221 and 6,365 documents. Table 1 reports three runs
for each of four GPT models. Further experiments extend the evidence to other
models and settings; the seven models named in the paper do not all receive
the full main evaluation.

| Finding | Evidence | Implication for OKF+ |
| --- | --- | --- |
| Better quality with lower average input use in the main experiment | Table 1: overall quality gains of about 6.4 to 11.7 percentage points; input-token ratios of 0.43 to 0.66 relative to raw search | A credible hypothesis to test locally, rather than a promised saving |
| A relevant starting shortlist matters | Table 8: GPT-5.5 raw search scores 65.60 using 206.5k input tokens; a map without candidates scores 69.04 using 496.4k; a map with candidate linked documents scores 76.60 using 88.1k | Build query-to-candidate selection alongside the map |
| Extra graph edges can add expense without useful evidence | Appendix B.4: direct entity edges enlarge pages by 27% to 52%, with document recall changing by −2.6 to +0.2 points and input use increasing by up to 28% | Do not require agents to consume the whole semantic graph |
| The map can be reused across models and extended incrementally | Table 4 and Figure 3 | Separate the map's lifecycle from the answering model; rebuild affected neighbourhoods |
| Extraction and rendering need not use a generative model | Section 5.2 uses GLinker and deterministic rendering | Start with existing IDs and reproducible extraction; catalogue induction is still described as an LLM stage |

The overall quality measure averages benchmark-specific scores; it is not a
universal accuracy percentage. The relative token measure is a geometric mean
of input-token ratios across datasets. It does not mean every question,
dataset or model uses fewer tokens. For example, Table 1's Luna/HERB condition
uses more input tokens with the map. Token use is also distinct from latency,
total lifecycle cost and a tenant's billed consumption.

The candidate mechanism is material: rank entity pages with BM25, a lexical
relevance method, pool their linked documents, rerank those documents and give
the agent candidate titles, paths and IDs. It still chooses what to open and
can search beyond the shortlist (Appendix B.3, pages 18 to 19). Simply adding
entity pages to a library would reproduce only part of the tested design.

The experimental agent uses shell tools over files. A managed Microsoft
retriever has different indexing, chunking, permissions and orchestration.
The corpora are selected benchmark collections, with larger tests reaching
20,000 documents. They do not establish performance across an entire tenant.
Most answer scores use model judges, although the paper includes another
judge comparison and document recall has a deterministic component.

The preprint supplies enough evidence to justify a bounded prototype. It does
not establish independently reviewed domain correctness, robust identity
resolution on our sources, secure tenant deployment or production cost. Its
ethics statement explicitly recognises that aggregated entity pages can reveal
sensitive information and documents a user cannot access (page 10).

## Implications for the existing OKF+ design

Here, OKF+ means the richer experimental bundle and evidence practices around
OKF 0.2 and additive profiles. It is not a separate universal core standard.
The current [architecture plan](architecture-and-implementation-plan.md),
[semantic contract](../okf.semantic.json) and
[Bundle Wiki profile](../profiles/bundle-wiki/v1/index.md) already make that
distinction.

| Existing capability | What to retain | What the research suggests adding |
| --- | --- | --- |
| Stable semantic IDs, aliases and local routes | A sound basis for reusable entity identity | An explicit register of source mentions and resolution decisions |
| Markdown, YAML-LD and generated runtime projections | One declared semantic authority and reproducible consumer outputs | A generated navigation projection with its own version and coverage |
| Search, facets, federation and bounded shards | Multiple ways to find evidence without loading everything | Entity-to-document postings and reverse document-to-entity lookup |
| Evidence-bearing directed assertions | Authority, direction, derivation, scope, rights and dates | A clear boundary between a mention association and a domain relationship |
| Ask OKF context assembly | Explicit dependencies, qualifications, ambiguity, conflicts and budgets | A preceding discovery stage that proposes candidates without claiming sufficiency |
| Compact MCP manifests and exact evidence reads | Small catalogues followed by verified source delivery | Optional navigation tools, evaluated separately from the current service |
| Source-bound reading help | Exact passages beside explanations | Entity pages that open those passages and retain disagreements |

The strongest confirmation is of the bundle as reusable infrastructure between
source documents and different AI clients. The strongest challenge is to any
assumption that a richer graph or more generated prose automatically improves
retrieval. A graph needs a task-specific interface and a relevant entry route.

### Preserve three distinct kinds of information

An entity map answers **where else this subject is mentioned**. A governed
semantic assertion answers **what relationship a source or reviewed derivation
supports**. Evidence assembly answers **whether the declared context needed for
this question is present within the admitted scope**. Their outputs should
remain distinguishable in files, tools and the Reader.

For example, a mention of a project in a risk register creates a discovery
route. It does not establish that the project has approval or that the risk
caused a delay. Those claims need source evidence and, where represented as
domain relationships, the existing assertion contract. A generated entity page
must not turn an older status and a newer proposal into a single current fact.

The [context engine](../apps/okf-explorer/src/lib/context/index.ts) currently
resolves declared concepts and follows a bounded set of predicates. Its
[requirements checks](context-assembly.md) run after traversal; requirements
are not hidden retrieval seeds. A map should improve discovery without
bypassing that contract. Newly found evidence must enter through a separately
designed admission step or producer update. Discovery alone cannot turn an
insufficient package into a sufficient one.

### Add an optional navigation profile

Prototype a separately versioned profile before proposing any core change.
The names below are design suggestions, not accepted schema fields or current
Reader features.

| Proposed artefact | Minimum content |
| --- | --- |
| Navigation manifest | Bundle and snapshot identity, profile version, catalogue version, builder identity, digests, resource bounds and coverage |
| Entity register | Stable ID, type, preferred name, observed aliases, identity criteria, resolution method and review state |
| Mention records | Entity ID, document/version ID, exact source locator and digest, observed text, extraction/resolution provenance and unresolved alternatives |
| Document and passage index | Original document identity, version, source URL, available passages, authority, dates, rights and access-policy reference |
| Entity and reverse postings | Entity-to-document membership and document-to-entity membership, generated from the same mention records |
| Entity pages | Bounded overview, individually attributed facts, conflicting or dated statements and links to source evidence |

Keep document membership as the primary map structure, matching the paper.
Passage links are a useful OKF+ adaptation for precise reading; they should not
silently replace the document's context with an isolated chunk. Retain
single-document entities where useful for source identity, while distinguishing
them from the recurring entities used to connect documents.

Prefer existing producer IDs, explicit references and reviewed aliases before
introducing model-based resolution. Define how to distinguish an organisation
from its team, a service from a service family, and a current body from its
predecessor. Type catalogues can be informed by source sampling, but should be
reviewed and versioned. Domain concepts without a neat named entity still need
facets, semantic relationships and ordinary search.

Do not hand-edit canonical profile mirrors or repurpose `skos:exactMatch` or
another domain predicate to mean co-mention. If a navigation association is
published as a semantic assertion, it must meet the existing assertion
requirements. Otherwise retain it as explicitly derived navigation metadata.

Bind the map and pages to exact source versions. On additions, changes,
deletions, identity merges/splits or permission changes, invalidate all affected
mentions, postings, pages and consumer projections. Preserve tombstones and
replay identities where policy permits. Incremental addition experiments in
the paper do not settle deletion or permission-revocation behaviour.

## Using a bundle in Microsoft environments

Choose an integration route according to the required control over evidence.
Microsoft 365 Copilot, Copilot Studio and a custom Azure application offer
different retrieval and orchestration controls. Microsoft Graph is Microsoft's
API and data platform; it does not automatically interpret an OKF+ semantic
graph. The repository's authoring “Foundry” is also distinct from Microsoft
Foundry.

| Route | Bundle use | Best fit | Main limitation |
| --- | --- | --- | --- |
| SharePoint and scoped Microsoft 365 Copilot | Generate source records and entity pages as supported documents | An accessible first pilot for knowledge workers | Native retrieval controls which content reaches the model |
| Copilot Studio with an OKF read-only service | Call navigation, assembly and exact-read operations | Explicit evidence workflow in a conversational interface | Requires service hosting, identity enforcement and actual client acceptance |
| Microsoft 365 Copilot connector | Index generated records and entity pages as external items | Discovery across approved organisational sources | Indexing alone does not enforce OKF dependency closure |
| Custom Azure application | Store bundle snapshots, query indexes and run the shared evidence engine | Strong control over selection, replay and presentation | More engineering, operations and separately metered services |
| Dataverse and Power Platform | Maintain reviewed entity mappings, ownership and workflow state | Curation, review and operational integration | Requires an explicit mapping back to the bundle and source versions |

### First route through SharePoint and Copilot

Keep canonical authored sources and release identities in the existing
governed process. Generate a Microsoft-facing document set: a collection
overview, one readable record per useful source unit, and concise entity pages.
Each derivative should carry its bundle ID, snapshot, stable record/entity ID,
source version, source link, locator and review status. Entity pages should
list the underlying source documents and preserve dates and disagreement.

Place one admitted snapshot in a deliberately scoped SharePoint library or
folder. Exclude retired derivatives from the agent's active knowledge scope
while retaining governed history elsewhere. Configure a dedicated agent with
that source scope, a clear evidence task and instructions to inspect sources,
state ambiguity and avoid filling gaps. Microsoft documents explicit
SharePoint scoping for declarative agents; omitting the scope can make all
user-accessible SharePoint/OneDrive content available. See [adding knowledge
to declarative agents](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/build-declarative-agents-add-knowledge).

This is a projection experiment. A link in an entity page does not prove the
host will traverse it, read every source or preserve a qualification. Check
indexing, actual citations and the source text observed in the response. A ZIP
or JSON file is not evidence that a host understands OKF+ identities, shards,
digests or semantic relationships.

The existing [SharePoint trial](sharepoint-m365-copilot-trial.md) reports
292 exact family selections from 293 authored development situations using
generated Word records. The remaining case selected an existing broader
neighbour. This supports the feasibility of useful Microsoft-facing
derivatives, with a specific identity-resolution weakness. It does not test
CorpusMap traversal, independent domain answers or cross-user access control.
Use the same frozen records as a baseline and a new held-out question set.

Microsoft documents permission trimming for the signed-in user on the
SharePoint knowledge route, alongside encryption and authentication limits.
Apply those controls to the generated pages themselves; a restricted fact
copied into a broadly readable page has already crossed the boundary. Check
the exact tenant, channel, format and licence configuration against
[SharePoint knowledge guidance](https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-add-sharepoint).

### Preferred controlled route through Copilot Studio

Use Copilot Studio as the conversational client of an authenticated, read-only
OKF service when the task needs explicit evidence selection. Microsoft
documents Streamable HTTP MCP connections, API-key or OAuth authentication,
and a custom-connector alternative. These capabilities provide an integration
path; they do not prove the current Ask OKF service works in a particular
tenant. See [connecting an MCP server](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent).

Reuse the existing service's compact manifest and verified read pattern. Add
navigation as a separate capability: search entities and documents, inspect
ambiguities, list a permitted entity neighbourhood, then read selected original
evidence. Retain the option to search documents outside the map. A Microsoft
adapter can use REST through a custom connector if the chosen client cannot
reliably consume the MCP results.

The proposed query journey is:

1. Authenticate the user and establish the allowed corpus and current access.
2. Resolve candidate entities, exposing collisions rather than silently merging
   them. Rank relevant pages and then their linked documents.
3. Return a small shortlist with reasons and source identities. Let the agent
   request complementary evidence within explicit call and byte budgets.
4. Admit selected evidence through the governed assembly contract. Check
   required context, dates, scope, conflicting evidence and omissions.
5. Generate an explanation only from the admitted package. Retain its
   snapshot, map, engine and context identities and allow source inspection.

The current [remote service](../services/ask-okf-mcp/README.md) serves approved
immutable public OKF-DWP sources anonymously. Its
[three tool definitions](../services/ask-okf-mcp/src/service.ts) do not provide
general entity search or arbitrary document access. Hosting the code on Azure
or adding a login would not make it a secure tenant-wide service. A restricted
deployment needs server-side authorisation for every operation and a new
admitted-source design.

### Search and connector options

For a custom application, keep immutable bundle snapshots in approved storage
and project searchable documents, entity pages and IDs into Azure AI Search.
Implement entity postings in the service or a suitable data store. Search
ranks candidates; the OKF service retains source verification, relationship
meaning and dependency checks. Keep original document identity on every
indexed passage so citations can return to the exact source version.

Azure AI Search now distinguishes generally available minimal extractive
retrieval from preview LLM planning, answer synthesis and other capabilities.
Pin the chosen API and feature set, rather than treating “agentic retrieval”
as one readiness category. Microsoft also documents additional latency and
separate Search and model charges. See the [agentic retrieval
overview](https://learn.microsoft.com/en-us/azure/search/agentic-retrieval-overview).
Its current knowledge-source matrix marks indexed/remote SharePoint, remote
MCP and several Fabric integrations as preview. Use the [source
matrix](https://learn.microsoft.com/en-us/azure/search/agentic-knowledge-source-overview)
when deciding which dependencies are acceptable.

An alternative is to generate Microsoft 365 Copilot connector items from the
bundle. Each external item has its own stable item ID, metadata, searchable
content and access control list. Project entity pages and source records as
distinct items, retain their OKF IDs, and synchronise updates and deletions.
Microsoft's [external-item
guidance](https://learn.microsoft.com/en-us/graph/connecting-external-content-manage-items)
defines this indexing contract. It does not import RDF semantics or make
Copilot follow the map's paths.

Use Dataverse for reviewed mappings, ownership, review decisions and workflow
state if these need a Power Apps interface. Keep source passages and immutable
bundle versions separately governed. Any round trip must preserve IDs,
provenance, rights, assertion status and unresolved identities. Fabric is an
option when an existing analytics programme needs it; the paper supplies no
reason to migrate the whole bundle estate there.

## Permissions and information handling

An entity page aggregates knowledge. Protect its aliases, facts, document
titles, neighbourhood counts and citations as well as its source text.
Filtering only the final document download is too late.

For a first pilot, choose a corpus whose participants share the same access
boundary. A static page assembled from mixed-permission sources must be
restricted to users permitted to see every included contribution. For wider
use, either maintain verified access partitions or construct pages at query
time from currently authorised contributions. Apply filtering before ranking,
summarisation and counts; partition caches by effective access policy and
invalidate them when permissions change. Never trust group IDs supplied only
in an agent prompt.

Preserve organisational sensitivity labels, retention requirements, source
rights and permitted processing locations in the Microsoft projection design.
An OKF rights statement is metadata, not access enforcement or permission to
copy a source. Derived summaries can retain a source's restrictions. Include
service logs, prompts, cached pages and retained answers in the handling plan.
Treat source and tool text as untrusted data throughout.

Test two users with deliberately different access, including a restricted
document that shares an entity with a public document. The less privileged
user must not receive the restricted title, fact, alias, link or revealing
count. Test revocation during an existing conversation and against a warm
cache. The previous trial's absence of permission-related response text does
not discharge these controls.

## How to reshape the programme

The existing plan's priority of one dependable evidence journey remains sound.
Add a bounded navigation experiment to its domain and client acceptance work,
with the following order. These are proposed responsibilities to assign.

| Step | Deliverable and owner role | Evidence needed to continue |
| --- | --- | --- |
| 1. Freeze a pilot | Domain owner: one admitted corpus, existing IDs, rights, access boundary and source inventory | A denominator for documents, mapped mentions, unresolved identities and extraction gaps |
| 2. Build the smallest map | Bundle maintainer: entity catalogue, grounded mentions, both posting directions and deterministic pages | All links resolve to the frozen versions; ambiguous names remain unresolved; changed documents invalidate outputs |
| 3. Compare retrieval locally | Evaluation lead: existing search, map alone, search shortlist alone, and map plus shortlist | Same questions, model, budgets and sources; retained retrieval paths and complete input accounting |
| 4. Compare Microsoft consumers | Integration owner: scoped SharePoint baseline and controlled service route | Actual client calls, source reads, citations, continuity and independent access tests |
| 5. Decide profile adoption | Maintainer and independent domain assessor: findings and failure analysis | Demonstrated benefit with no weakened identity, evidence or permission gate |

Start with synthetic or already admitted non-sensitive sources. A suggested
pilot scale is 100 to 300 documents with deliberate overlaps and a held-out
set of 40 to 60 independently written questions. These are manageable design
choices, not numbers validated by the paper. Include a second source type and
some unmapped documents so the test cannot succeed through entity pages alone.

Questions should require joining approval, requirements and current status;
finding exceptions; distinguishing near-neighbour services; disambiguating
identical names; handling historical versions; and recognising missing or
inaccessible evidence. Freeze expected supporting documents and essential
qualifications independently of the map builder. Reuse the existing
[A–H evaluation](context-assembly-evaluation.md) and add entity-resolution and
map-navigation measures.

Report document recall, supporting-passage precision, false identity merges,
unresolved rates, citation fidelity, qualification retention, completeness
against declared requirements and specialist answer assessment separately.
Also measure calls, bytes, input/output tokens where observable, latency and
failures. If a managed client does not expose token use or model-visible
context, record that measurement gap and use observed latency and tenant
consumption; do not infer a saving from response length.

Adoption should require a pre-agreed improvement over the strongest baseline,
with no false merge in the critical identity controls, no unauthorised
disclosure and no loss of required qualifications. Zero failures on these
controls is an acceptance gate for that trial, not a universal safety claim.

### Cost and maintenance decisions

Count initial extraction, resolution, review, page generation, updates,
permission synchronisation, hosting, Search, model use and operations. A cheap
query can still be an expensive system. Table 4's construction estimates range
widely by builder; its Luna upper bound of $74.65 applies to the paper's
EnterpriseRAG-Bench setting, not to our corpus or Microsoft prices.

For a fixed evaluation period, compare:

`map total = initial build + updates + hosting + governance + query count × mapped query cost`

with the corresponding baseline total. A financial break-even exists only if
the measured per-query saving exceeds any extra recurring cost at the expected
volume. Include review effort and permission updates, and use tenant billing
records for actual Microsoft charges. The historical SharePoint report's
counterfactual prices are not a current deployment quote. Any metered pilot
needs its own approved budget.

Keep larger graph rendering, unconstrained wiki synthesis, broad automatic
entity linking and platform migration behind this evidence. The research
supports making the existing knowledge easier to navigate and reuse. OKF+
should contribute the provenance, exact source identity and visible evidence
limits that a navigation map alone cannot supply.

## Evidence and decision boundaries

Paper findings above refer to the supplied v1 PDF, particularly sections 3 to
5, Tables 1 and 4, Appendix A, Appendix B.3/B.4 and the ethics statement.
Microsoft capability descriptions were checked against the linked official
documentation on 26 October 2026; availability, licensing and policy still
depend on the selected tenant and deployment. The repository links describe
the stated baseline and retained experiments. Proposed files, tools, pilot
sizes and architecture choices in this review have not been implemented or
tested by this review.
