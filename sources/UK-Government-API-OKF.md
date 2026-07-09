## Core conclusion

The same OKF Explorer pattern should work for UK Government APIs, but the API domain needs to be treated less like a document catalogue and more like an **operational API control-plane view**: discoverable products, versions, operations, schemas, events, workflows, ownership, access conditions, security posture, lifecycle state, dependencies, samples, and evidence.

The OKF spec is a good envelope for this because it is deliberately simple: a knowledge bundle is a directory of Markdown files with YAML frontmatter; concepts can describe things such as APIs; frontmatter is extensible; and consumers are expected to tolerate unknown fields. It also explicitly says OKF should not replace domain-specific schemas such as OpenAPI, but should reference them. That is the key design principle: **OKF describes, links, governs and narrates the API estate; OpenAPI, AsyncAPI, Arazzo and related standards remain the executable domain contracts.** ([GitHub][1])

I could not read `/Users/crpage/repos/api-mcp-wiki` directly from here, so I used the public GitHub Pages and repository versions.

---

## What your current work already implies

Your API/MCP wiki is already pointing in the right direction. It is an OKF bundle for “From GET to agentic government”, with a self-contained viewer, corpus directories, validation/build scripts, and categories such as `standards`, `uk-government`, `organisations`, `glossary` and `document`. The public index says the bundle uses plain Markdown links, with the viewer inferring relationship types from section and direction. ([GitHub][2])

The API/MCP paper already contains the seed ontology for the next phase. It names the standards family — OpenAPI, AsyncAPI, Arazzo, OAuth 2.0 security BCP, MCP and A2A — and argues that a future API catalogue should become an active control plane with owner/support metadata, OpenAPI/AsyncAPI descriptions, data classification, access conditions, conformance/security results, SLO/current health, lifecycle notices, dependencies, lineage and provenance. ([GitHub][3])

The CKAN/GOV.UK data work gives you the large-corpus pattern. The explorer documentation says the first context should be an `overview`, that the left panel acts as a global context reducer, and that large corpora should avoid hydrating all records, resources and relationships before the first useful screen. It also already distinguishes search, facets, analysis artefacts, lazy full-record hydration, relationship graph loading and route-addressable detail panels. ([GitHub][4])

The CKAN fixture also shows the scale pattern: a descriptor, search shards, deferred relationship loading and a compact overview. The GOV.UK CKAN corpus has 58,461 datasets, 268,241 resources and almost two million relationships, while the overview facet preview includes formats, hosts, licences, publishers, resource types, tags, topics and update years. This is a strong precedent for an API corpus, but the API version needs richer operational and security dimensions. ([GitHub][5])

---

## Recommended OKF mapping for the API domain

| OKF idea             | API-domain interpretation                                                                                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Knowledge Bundle** | `uk-government-apis-okf`: the national API knowledge bundle, published as a static bundle plus large-corpus descriptor.                                                                                                                              |
| **Concept**          | Any meaningful API-domain thing: API product, API version, operation, endpoint, event, workflow, schema, organisation, service, data product, access policy, credential requirement, sample, sandbox, scorecard, standard, legal/governance control. |
| **Concept ID**       | Stable path-like identifier, not merely a title. Example: `apis/hmrc/vat/mtd-vat`, `api-versions/hmrc/mtd-vat/v1`, `operations/hmrc/mtd-vat/get-obligations`.                                                                                        |
| **Frontmatter**      | The machine-readable discovery card: title, description, publisher, lifecycle, visibility, auth model, data sensitivity, spec links, standards conformance, tags, timestamps and relationship hints.                                                 |
| **Markdown body**    | Human-readable narrative: what it is, who owns it, how to use it, access conditions, examples, quality, security, known limitations, provenance and relationship explanations.                                                                       |
| **Links**            | Human-readable links remain OKF-native, but the explorer should also generate a typed relationship index from frontmatter, sections and harvested contracts.                                                                                         |
| **`index.md`**       | Progressive disclosure entry point: government API estate → departments → domains → API products → versions → operations/events/workflows.                                                                                                           |
| **`log.md`**         | Bundle-level provenance and change log: harvests, validation runs, catalogue updates, deprecations, source changes and curation decisions.                                                                                                           |

The most important modelling choice is to separate an **API Product** from an **API Version** and from an **API Operation**. Most catalogues collapse these, but a useful government API knowledge graph cannot. Product-level metadata answers “what is this capability?”; version-level metadata answers “what contract is live?”; operation-level metadata answers “what can be called, with what authority, side effects and data sensitivity?”

---

## Proposed concept types

A definitive UK Government API OKF should use a controlled but extensible type vocabulary. I would start with these groups.

### 1. Portfolio and discovery types

| Type                         | Purpose                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `API Product`                | The named API capability as seen by developers or service teams.                           |
| `API Version`                | A specific version of an API product, with lifecycle, contract and compatibility metadata. |
| `API Operation`              | A callable operation, endpoint, query, mutation, procedure or message interaction.         |
| `API Environment`            | Production, sandbox, test, mock, reference or deprecated endpoint environment.             |
| `API Documentation`          | Human documentation, developer portal page, reference page or onboarding guide.            |
| `Publisher` / `Organisation` | Owning or publishing public body.                                                          |
| `Service`                    | Government service, product or user journey supported by the API.                          |
| `Data Product`               | Dataset or authoritative data asset exposed through the API.                               |

### 2. Contract and interoperability types

| Type                   | Purpose                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OpenAPI Description`  | REST/HTTP contract reference. OpenAPI is explicitly designed as a language-agnostic description for HTTP APIs, usable by humans and machines without access to source code or other documentation. ([OpenAPI Initiative Publications][6]) |
| `AsyncAPI Description` | Event/message API contract reference. AsyncAPI describes operations, messages, channels and protocols such as HTTP, Kafka, MQTT, AMQP and WebSocket. ([AsyncAPI][7])                                                                      |
| `Arazzo Workflow`      | Multi-step API workflow. Arazzo describes sequences of API calls and dependencies needed to achieve an outcome, normally against API descriptions such as OpenAPI. ([OpenAPI Initiative Publications][8])                                 |
| `Schema`               | JSON Schema, XML Schema, protobuf, GraphQL schema, AsyncAPI schema or domain model.                                                                                                                                                       |
| `Event` / `Message`    | Event, command, request, response or message definition.                                                                                                                                                                                  |
| `Code List`            | Controlled vocabulary used by one or more APIs.                                                                                                                                                                                           |
| `Identifier`           | Persistent identifier, reference number or canonical entity identifier.                                                                                                                                                                   |

### 3. Governance, access and security types

| Type                     | Purpose                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `Access Policy`          | Who can use the API, under what conditions, through what approval route.                            |
| `Authentication Scheme`  | OAuth 2.0, mTLS, DPoP, API key, JWT bearer, basic auth, mutual TLS, etc.                            |
| `Authorisation Scope`    | Named OAuth/API gateway scope or permission.                                                        |
| `Credential Requirement` | Describes required credentials without storing secret values.                                       |
| `Security Assessment`    | OWASP/API security check, penetration-test evidence, threat model, DPIA/security review reference.  |
| `Quality Scorecard`      | Documentation, standards, uptime, lifecycle, testability, support and security scoring.             |
| `SLO` / `Health Check`   | Reliability target, current status, uptime and operational health.                                  |
| `Data Classification`    | Public, official, official-sensitive, personal data, special category data, commercial sensitivity. |
| `Lifecycle Notice`       | Deprecated, retired, replacement, breaking change, migration deadline.                              |

### 4. Developer experience and agentic types

| Type                     | Purpose                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Sandbox`                | Safe test environment. GDS guidance recommends API test services or sandboxes, with no real personal or transactional data. ([GOV.UK][9]) |
| `Sample Request`         | Safe sample request, response or generated code snippet.                                                                                  |
| `Mock Server`            | Generated or hosted mock implementation.                                                                                                  |
| `SDK` / `Client Library` | Reusable client package or generated SDK.                                                                                                 |
| `MCP Server`             | MCP server exposing API-backed resources/tools/prompts.                                                                                   |
| `MCP Tool`               | Agent-callable tool mapped to an API operation or workflow.                                                                               |
| `Agent Capability`       | Safe capability exposed to agents, with authority boundaries.                                                                             |
| `Approval Gate`          | Required human or organisational approval before execution.                                                                               |
| `Audit Event`            | Invocation, approval, delegation or policy decision record.                                                                               |

MCP should be modelled as a related but governed access layer, not as an automatic right to call underlying APIs. The MCP specification itself stresses user consent and control, data privacy, tool safety and explicit authorisation flows. ([Model Context Protocol][10])

---

## Frontmatter shape

A synthetic example, using the OKF style but with API-domain extensions:

```yaml
---
type: API Product
title: Example Payments API
description: Payments capability exposed by Example Department for approved service integrations.
publisher: organisations/example-department
owner: organisations/example-department/payments-platform-team
status: production
visibility: restricted-public-catalogue
interaction_styles:
  - rest
contracts:
  - type: OpenAPI Description
    url: https://developer.example.gov.uk/apis/payments/openapi.yaml
    version: 3.1.0
environments:
  - type: sandbox
    url: https://sandbox.api.example.gov.uk/payments
  - type: production
    url: https://api.example.gov.uk/payments
auth:
  primary: oauth2
  grant_types:
    - client_credentials
  sender_constrained_tokens: required
access_model: approval_required
data_classification:
  - official-sensitive
  - personal-data
standards:
  - standards/openapi
  - standards/oauth2-security-bcp
  - standards/gds-api-standards
quality:
  documentation_score: 0.82
  security_score: 0.76
  contract_score: 0.91
relationships:
  - verb: published_by
    target: organisations/example-department
  - verb: described_by
    target: contracts/example-payments/openapi
  - verb: uses_auth_scheme
    target: auth/oauth2-client-credentials
  - verb: exposes_data_product
    target: data-products/example-payments
tags:
  - payments
  - finance
  - openapi
  - oauth2
timestamp: 2026-07-07T00:00:00Z
---
```

And the body could follow a predictable card-driven structure:

```markdown
# What it is

# Who owns it

# Access conditions

# Authentication and authorisation

# Contract

# Environments

# Sample requests

# Data and legal considerations

# Quality and security evidence

# Relationships

# Citations
```

This keeps the bundle human-readable, but gives the explorer enough structured material to build facets, graph edges, scorecards and right-hand cards.

---

## Progressive discovery model

Your CKAN pattern should transfer almost directly, but with API-specific reducers.

### Left panel: narrowing the estate

Use the left panel as a **context reducer**, not just a filter list. The CKAN explorer documentation already frames this well: search plus analysed facets, with different control types such as hierarchy, searchable select, chips, histogram/range, value input and suppressed dimensions. ([GitHub][4])

For APIs, the strongest facets are:

| Facet                           | Why it matters                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Search                          | Find by title, path, operationId, schema term, organisation, service, acronym or business concept.                     |
| Publisher / owning organisation | Main route into government accountability.                                                                             |
| Organisation family             | Department, agency, ALB, local authority, NHS body, police, devolved administration, supplier-operated public service. |
| Domain / service area           | Tax, benefits, identity, health, transport, environment, education, planning, justice, local government.               |
| Interaction style               | REST, GraphQL, gRPC, SOAP/WSDL, event, webhook, file/API hybrid, MCP tool, Arazzo workflow.                            |
| Contract availability           | OpenAPI present, AsyncAPI present, Arazzo present, partial docs only, undocumented.                                    |
| Lifecycle status                | Proposed, alpha, beta, production, deprecated, retired, unknown.                                                       |
| Visibility                      | Publicly documented, public but approval-required, government-only, restricted partner, internal, unknown.             |
| Access model                    | Anonymous, API key, OAuth 2.0, mTLS, DPoP, signed request, basic auth, legacy, manual approval.                        |
| Data sensitivity                | Open data, official, official-sensitive, personal data, special category, law enforcement, commercial.                 |
| Environment                     | Production, sandbox, mock, test, reference implementation.                                                             |
| Quality band                    | Documentation, standards, security, reliability and lifecycle maturity.                                                |
| Update/deprecation year         | Helps find stale or risky APIs.                                                                                        |
| Standards conformance           | GDS API standard, OpenAPI, AsyncAPI, OAuth security BCP, OWASP coverage.                                               |
| Agent readiness                 | Safe read-only, tool-callable with approval, workflow-ready, not agent-ready.                                          |
| Relationship density            | Isolated API, well-linked API, dependency hub, hidden critical dependency.                                             |

This lets a user move from “all government APIs” to something like:
**HMRC + production + OAuth 2.0 + OpenAPI present + personal data + sandbox available + read-only operations**.

That is much more valuable than a flat API catalogue.

---

## Main canvas views

The centre canvas should keep your existing modes, but each needs API-specific enrichment.

| View          | API-specific behaviour                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Reader**    | Narrative overview of the current filtered context: what kinds of APIs, who owns them, dominant auth schemes, missing contracts, risks and notable clusters.                         |
| **Graph**     | Aggregate graph first, then lazy-load detail. Nodes: organisations, API products, versions, operations, schemas, events, workflows, standards, policies, services and data products. |
| **Links**     | Relationship-type analysis: `published_by`, `described_by`, `has_operation`, `uses_schema`, `requires_scope`, `supports_service`, `replaces`, `depends_on`, `exposes_data_product`.  |
| **Timeline**  | Publication, last update, deprecation, retirement, security review, contract validation, incident or change notice.                                                                  |
| **Type**      | Distribution and quality of concept types: how many APIs have contracts, sandboxes, owners, scopes, samples, security evidence.                                                      |
| **Resources** | Contracts, documentation, sandboxes, SDKs, mocks, Postman/Bruno collections, examples, status pages.                                                                                 |

I would add five API-specific views:

| New view       | Purpose                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Contract**   | Render OpenAPI, AsyncAPI or Arazzo summaries without forcing the user into raw YAML.                                                      |
| **Operations** | Explore operations by method, path, side effect, scope, data sensitivity and sample availability.                                         |
| **Access**     | Show access route, credential type, approval path, scopes and policy requirements — never secret values.                                  |
| **Samples**    | Render safe request/response examples, generated snippets and mock/sandbox calls.                                                         |
| **Scorecard**  | Combine documentation quality, contract validity, security posture, freshness, lifecycle clarity, sandbox availability and support route. |

---

## Right-hand data card

The right card should become the “single trustworthy card” for a selected API-domain concept.

For an **API Product**, show:

1. **Identity**: title, publisher, owner, support contact/route, lifecycle state, visibility.
2. **Purpose**: plain-English description, service/domain, user journey, authoritative data role.
3. **Access**: public/restricted/internal, approval process, authentication method, scopes, environment availability.
4. **Contracts**: OpenAPI/AsyncAPI/Arazzo links, detected versions, validation status.
5. **Operations summary**: count by method, read/write, side-effectful, personal-data handling, sandbox support.
6. **Samples**: safe placeholders, mock calls, sandbox calls where available.
7. **Quality/security**: scorecard, stale metadata warnings, OWASP risk coverage, API gateway/logging evidence where known.
8. **Relationships**: publisher, data products, schemas, services, standards, consumers, dependencies, replacements.
9. **Lifecycle**: first seen, last changed, deprecation notices, replacement APIs.
10. **Provenance**: source URL, harvested timestamp, curator notes, confidence.

For an **API Operation**, the card should be more operational:

```text
GET /example/{id}
Read-only: yes
Side effects: no
Requires auth: OAuth 2.0 client credentials
Required scopes: example.read
Data sensitivity: personal data
Sandbox: available
Sample: safe placeholder rendered
Contract source: OpenAPI
Owner: Example Department
Relationships: uses schema X, supports service Y, exposed by API version Z
```

---

## Relationship model

The current OKF spec treats links as directed and essentially untyped, with semantics conveyed by prose. Your existing viewer already infers relationship types from section and direction. For the government API corpus, I would make typed relationships explicit as an OKF extension while still preserving Markdown links for compatibility. ([GitHub][1])

A useful initial verb set:

| Relationship               | Meaning                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `published_by`             | API is published by organisation.                                      |
| `owned_by`                 | Operational ownership or service owner.                                |
| `documented_by`            | API has human documentation.                                           |
| `described_by`             | API/version/operation is described by OpenAPI, AsyncAPI or Arazzo.     |
| `has_version`              | Product has version.                                                   |
| `has_operation`            | Version has operation.                                                 |
| `has_environment`          | Version has sandbox, production, mock or test environment.             |
| `requires_auth_scheme`     | API requires OAuth, mTLS, API key, etc.                                |
| `requires_scope`           | Operation requires named scope/permission.                             |
| `uses_schema`              | Operation/event uses schema.                                           |
| `exposes_data_product`     | API exposes authoritative data product.                                |
| `supports_service`         | API supports government service or journey.                            |
| `implements_standard`      | API claims or demonstrates standard conformance.                       |
| `replaces` / `replaced_by` | Lifecycle migration relationship.                                      |
| `depends_on`               | API, workflow or service depends on another API.                       |
| `invokes`                  | Arazzo workflow or MCP tool invokes an operation.                      |
| `guarded_by`               | Operation is guarded by approval, policy or human-in-the-loop control. |
| `evidenced_by`             | Claim is supported by source, test result or assessment.               |

For “definitive” status, each relationship should carry provenance and confidence:

```yaml
relationships:
  - verb: described_by
    target: contracts/example-payments/openapi
    source: https://developer.example.gov.uk/apis/payments
    evidence_type: harvested_link
    confidence: high
    observed_at: 2026-07-07T00:00:00Z
```

---

## Source strategy for a UK Government API OKF

The current GOV.UK API Catalogue says it exists to help users understand what UK public-sector APIs are published, where development is taking place and whether APIs may be suitable for reuse; it also states that inclusion does not mean an API is publicly accessible or required for use. That distinction is important: the OKF should model **discoverability and access conditions**, not assume openness or usability. ([API Catalogue][11])

The DSA API discovery found exactly the problems this OKF could solve: variable and generally low maturity, limited documentation, inconsistent standards, security/governance concerns, manual sharing, governance barriers and fragmented discoverability. ([Data in Government][12])

The API Hub alpha points to the product shape: refreshed API catalogue, quality/security scores, role-based guidance, practical developer tooling, signed-in developer experience and compliance information. ([Data in Government][13])

I would build the corpus from these source classes:

| Source                                     | Role in the OKF                                                                                                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing GOV.UK API Catalogue              | Seed list of known public-sector APIs.                                                                                                                                            |
| Department developer portals               | Rich API product, documentation, sandbox and onboarding metadata.                                                                                                                 |
| OpenAPI/AsyncAPI/Arazzo files              | Contract truth where available.                                                                                                                                                   |
| data.gov.uk / CKAN resources marked as API | Additional discovery seed, not a definitive source. Your CKAN overview currently shows only 142 resources classified as `api`, so it is useful but not sufficient. ([GitHub][14]) |
| GitHub/GitLab repositories                 | Source contracts, examples, SDKs and changelogs.                                                                                                                                  |
| API gateway/developer platform metadata    | Authoritative ownership, environment, auth, traffic, scopes and lifecycle metadata where available.                                                                               |
| Manual curation/self-declaration           | Needed for restricted/internal APIs and access policy.                                                                                                                            |
| Validation/enrichment pipeline             | Contract validation, link checking, freshness checks, security linting, standards conformance and quality scoring.                                                                |

### Source tiers and adapters

The enriched pack must not treat every discovered URL as the same kind of API.
It should record the source tier, adapter, evidence and confidence for each
record so the Explorer can distinguish declared API products from observed data
service endpoints.

| Source tier               | Meaning                                                                                                              | Initial adapters                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `declared_api_catalogue`  | A named API product declared through the GOV.UK API Catalogue or an equivalent authoritative catalogue submission.    | `api_gov_uk_catalogue` for `https://raw.githubusercontent.com/co-cddo/api-catalogue/main/data/catalogue.csv`.                        |
| `provider_native_api`     | A provider-owned API root, index or developer portal that describes its own APIs and endpoint groups.                 | `ordnance_survey_api_os_uk` for `https://api.os.uk/`; `ons_beta_api` for `https://api.beta.ons.gov.uk/v1` and ONS Developer Hub.     |
| `data_access_endpoint`    | A dataset/resource endpoint that exposes government data through a service protocol but is not itself a declared API product. | `data_gov_uk_ckan` over paginated CKAN `package_search` records for WMS, WFS, WMTS, WCS, OGC API, ArcGIS/Esri REST, SPARQL and API. |
| `contract_discovery`      | A discovered machine-readable contract or capability document that describes endpoints, operations or schemas.        | OpenAPI, WSDL, OGC capabilities, SPARQL service descriptions, ArcGIS service metadata and provider-published YAML/JSON contracts.    |
| `provider_portal_allowlist` | Official public-sector domains selected for targeted enrichment. No broad web crawling in v1.                      | Provider domains with explicit allowlist entries and source notes.                                                                    |

The initial provider-native adapters should include two known high-value
sources:

- **Ordnance Survey**: recursively traverse `https://api.os.uk/` JSON link
  documents. The root groups APIs into mapping, features, search, downloads and
  positioning. Service endpoints, documentation links and service descriptions
  should be retained as typed evidence.
- **Office for National Statistics**: model `https://api.beta.ons.gov.uk/v1` as
  the ONS Beta API product. Harvest the published datasets endpoint as `Data
  Product` records and record endpoint templates for datasets, editions,
  versions, observations/filtering, code lists and topics. The ONS Developer
  Hub states the API is open and unrestricted with no API keys required.

### Canonical counts

The descriptor and overview must separate breadth from assurance. The following
counts are canonical:

| Count                          | Meaning                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| `declared_api_products`        | API products declared by GOV.UK API Catalogue or equivalent official catalogue source.     |
| `provider_native_api_products` | Provider-owned API products or API groups discovered from official provider API indexes.   |
| `data_access_endpoints`        | Data service endpoint records harvested from data.gov.uk, provider indexes or contracts.   |
| `data_products`                | Dataset/data-product records exposed by one or more APIs or endpoint templates.            |
| `contracts`                    | OpenAPI, WSDL, OGC capabilities, SPARQL service descriptions or ArcGIS metadata records.   |
| `operations`                   | Parsed or templated callable operations.                                                   |
| `schemas`                      | Parsed schemas, code lists, dimensions or schema-like structures.                          |

The Explorer should continue to expose compatibility counts such as `datasets`,
`resources`, `publishers` and `relationships`, but those are implementation
containers, not the authoritative API estate counts.

For the “all UK Government APIs” ambition, I would distinguish three statuses:

| Status     | Meaning                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| `observed` | Found by harvesting public sources.                                                                     |
| `declared` | Confirmed by owning organisation or API catalogue submission.                                           |
| `assured`  | Has validated metadata, owner, lifecycle, access policy, contract status and security/quality evidence. |

That avoids pretending the corpus is definitive before governance catches up.

Licence metadata should follow the same evidence hierarchy. Source-declared
licences are authoritative for the harvested record. Dataset/resource endpoint
records may inherit a package-level licence from the source dataset metadata. If
the source omits a licence but an official provider publishes clear site-wide
terms for its data/API content, the builder may infer a provider-level licence
only when it records the basis, source URL, confidence and warning counter. In
the UK Government APIs exemplar, missing ONS CKAN licence fields infer Open
Government Licence v3.0 from ONS terms. Ordnance Survey provider-native records
infer that an OS licence is required from OS licensing guidance rather than
being treated as OGL. These records are marked `provider-terms-inferred`, not
`source-declared`.

### Standards alignment

API-related records must be aligned to the repository standards crosswalk in
[OKF Standards Crosswalk](../docs/okf-standards-crosswalk.md). The generator
should prefer standards names where they are exact, and keep OKF-native names
where DCAT/OpenAPI do not have an exact concept.

Minimum generated standards fields for each API/data record:

- `dcat_type`;
- `openapi_type`;
- `dcat_export_status`;
- `openapi_export_status`;
- `openapi_security_scheme`;
- `standards_alignment.dcat.required_missing`;
- `standards_alignment.openapi.required_missing`.

The descriptor must include links to local standards concept pages and official
standard sources for DCAT 3, DCAT-AP 3.0.0, OpenAPI and DQV. DCAT names such as
`dcat:DataService`, `dcat:Dataset`, `dcat:endpointURL` and `dcterms:license`
should be rendered as standards terms in the Explorer, not as ordinary prose
labels.

Export rules:

- DCAT-AP export is only conformant after RDF is emitted and validated; OKF JSON
  records are standards-alignable metadata.
- OpenAPI export is only conformant after an `openapi` document is emitted with
  servers, paths, methods, parameters, responses, schemas and security metadata.
- Where harvested sources only provide endpoint/documentation metadata, the
  exporter may emit a labelled service stub or operation fragment, but must not
  invent HTTP methods, schemas, examples, licences or authentication details.

---

## Security and API keys

The explorer should **not store API keys**. Not in Markdown, not in frontmatter, not in bundle JSON, not in search indexes, not in localStorage, not in URLs, not in generated samples and not in browser logs.

This is not merely a preference. UK government API guidance says OAuth 2.0 should be used for access control, basic authentication should not be used, and API keys should be avoided because they are easy to intercept and reuse; where API keys are used, they should be time-limited and regularly changed. ([GOV.UK][9]) The NCSC also warns that relying solely on API keys is no longer best practice, citing risks including theft, leaked source code, lack of built-in expiry and weak granularity; it points towards stronger authentication such as OAuth 2.0 or token-based approaches. ([National Cyber Security Centre][15])

The right model is:

```text
OKF Explorer
  stores: metadata, access requirements, secret references, sample templates
  never stores: secret values

Credential Broker / API Access Service
  stores: encrypted secrets or retrieves tokens
  enforces: identity, policy, scopes, expiry, approval, audit
  returns: short-lived tokens or executes calls server-side

Secret Manager / KMS
  stores: actual client secrets, API keys, certificates, private keys
  supports: rotation, access control, audit, destruction
```

For state-of-the-art security, the preferred route should be:

1. **Avoid long-lived API keys** where possible.
2. Prefer **OAuth 2.0 / OIDC**, short-lived access tokens, narrow scopes and audience restriction.
3. Use **sender-constrained tokens** such as mTLS or DPoP for higher-risk APIs; the OAuth 2.0 Security BCP recommends sender-constraining access tokens to prevent misuse of stolen or leaked tokens. ([RFC Editor][16])
4. Prefer asymmetric client authentication such as mTLS or `private_key_jwt`, so an authorisation server is not storing sensitive symmetric secrets unnecessarily. ([RFC Editor][16])
5. Store secrets only in a managed secrets platform backed by KMS/HSM-grade controls. NCSC guidance describes cloud KMS as a way to generate, store, use and destroy cryptographic key material, and notes the use of envelope encryption and secure hardware roots. ([National Cyber Security Centre][17])
6. Automate rotation. OWASP’s secrets guidance describes cloud-native secret managers with scheduled rotation functions and a safe create/test/promote rotation flow. ([OWASP Cheat Sheet Series][18])
7. Log every access decision and sample invocation, but redact secrets and sensitive payloads.
8. Use explicit approval gates for side-effectful operations.

In OKF terms, store this:

```yaml
credential_requirements:
  - type: oauth2_client_credentials
    token_endpoint: https://auth.example.gov.uk/oauth2/token
    scopes:
      - payments.read
    sender_constrained: required
    secret_ref_allowed: true
    secret_value_stored_in_okf: false
    broker_policy: policies/example-payments-access
```

Never this:

```yaml
api_key: sk_live_...
client_secret: ...
private_key: ...
```

---

## Sample rendering

Samples are essential, but they need a safety model.

The explorer should support four levels of sample:

| Level               | Behaviour                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Static example**  | Render request/response examples from OpenAPI/AsyncAPI docs. No execution.                                       |
| **Mock example**    | Call generated mock server or static fixture. Safe by default.                                                   |
| **Sandbox example** | Call provider sandbox using user-approved credentials. No real personal or transactional data.                   |
| **Live example**    | Disabled by default. Requires explicit user action, policy approval, scope check, audit and side-effect warning. |

GDS guidance says sandboxes should not use real personal or transactional data, though real reference data may be acceptable; it also recommends useful test data, simulated dependencies and protection/restoration of sandbox state. ([GOV.UK][9])

For each operation, add safety metadata:

```yaml
sample_policy:
  static_examples: true
  mock_available: true
  sandbox_available: true
  live_try_available: false
  side_effectful: false
  requires_approval: false
  redaction:
    request_headers:
      - Authorization
      - X-API-Key
    response_fields:
      - nationalInsuranceNumber
      - dateOfBirth
```

For side-effectful operations:

```yaml
sample_policy:
  static_examples: true
  mock_available: true
  sandbox_available: true
  live_try_available: false
  side_effectful: true
  requires_approval: true
  approval_gate: approval-gates/human-confirmation-and-policy-check
```

This also maps well to the agentic principle already in your paper: an agent characteristic is not authority to use an API. ([GitHub][3])

---

## Explorer development implications

The current explorer can remain the base, but I would add these capabilities.

### 1. API contract ingestion

Add build-time processors for:

```text
OpenAPI → API Product / Version / Operation / Schema / Auth Scheme / Scope / Sample
AsyncAPI → Event API / Channel / Message / Operation / Protocol / Binding
Arazzo → Workflow / Step / Dependency / Input / Output / Invoked Operation
MCP → Server / Tool / Resource / Prompt / Underlying API relationship
```

OpenAPI 3.2 was published in September 2025, and Arazzo 1.1 in May 2026, so the parser should not assume older versions only. ([OpenAPI Initiative Publications][6])

### 2. Typed relationship index

Keep Markdown links, but generate `relationships.jsonl` or relationship shards with typed edges, provenance and confidence.

### 3. API-specific analysis overview

Equivalent to CKAN’s overview, but with API dimensions:

```json
{
  "counts": {
    "api_products": 0,
    "api_versions": 0,
    "operations": 0,
    "schemas": 0,
    "publishers": 0,
    "contracts": 0,
    "sandboxes": 0,
    "samples": 0
  },
  "facets": {
    "publisher": [],
    "interaction_style": [],
    "auth_scheme": [],
    "lifecycle_status": [],
    "visibility": [],
    "data_classification": [],
    "contract_type": [],
    "quality_band": []
  },
  "warnings": {
    "missing_owner": 0,
    "missing_contract": 0,
    "deprecated_without_replacement": 0,
    "api_key_only": 0,
    "licence_inferred_from_provider_terms": 0,
    "stale_metadata": 0
  }
}
```

### 4. Contract rendering

The explorer should render contract summaries directly:

```text
API version
  operations by method
  auth schemes
  scopes
  request/response schemas
  examples
  errors
  servers/environments
  deprecation notices
```

For AsyncAPI:

```text
channels
messages
publish/subscribe operations
protocol bindings
event schemas
consumer/producer roles
```

For Arazzo:

```text
workflow purpose
steps
dependencies
required inputs
outputs
called operations
approval gates
```

### 5. Credential broker integration

The static explorer should be able to run without credentials. For signed-in/internal deployments, add an optional backend:

```text
/credential/status
/sample/render
/sample/mock
/sample/sandbox-call
/policy/evaluate
/audit/write
```

The browser should receive only redacted status or short-lived, narrow tokens where absolutely necessary. For higher-risk APIs, the broker should execute calls server-side and return redacted responses.

### 6. Scorecard engine

Use a transparent scoring model, not a mysterious grade.

Example dimensions:

| Dimension            | Example signals                                                                   |
| -------------------- | --------------------------------------------------------------------------------- |
| Discoverability      | Title, description, owner, support route, source URL.                             |
| Contract quality     | OpenAPI/AsyncAPI/Arazzo present, valid, current, examples included.               |
| Security             | OAuth/mTLS/DPoP, no basic auth, API key risk, scopes, TLS, gateway, logging.      |
| Lifecycle            | Version, last updated, deprecation policy, replacement links.                     |
| Developer experience | Docs, sandbox, examples, SDKs, error model, onboarding route.                     |
| Governance           | data classification, access policy, DPIA/security review references, audit route. |
| Interoperability     | shared schemas, code lists, identifiers, standards alignment.                     |
| Operability          | SLO, status page, rate limits, support, monitoring.                               |

OWASP’s API Top 10 includes risks directly relevant to the scorecard, including broken object-level authorisation, broken authentication, unrestricted resource consumption, improper inventory management and unsafe consumption of APIs. ([OWASP][19])

---

## Proposed repository shape

For a definitive API OKF, I would separate authored concepts, harvested records and generated indexes.

```text
uk-government-apis-okf/
  index.md
  log.md

  organisations/
    cabinet-office.md
    hmrc.md
    dwp.md
    ...

  api-products/
    hmrc/
      mtd-vat.md
      ...
    companies-house/
      company-information.md
      ...

  api-versions/
    hmrc/
      mtd-vat/
        v1.md

  operations/
    hmrc/
      mtd-vat/
        get-obligations.md
        submit-return.md

  contracts/
    hmrc/
      mtd-vat/
        openapi.md
        openapi.yaml

  schemas/
    hmrc/
      mtd-vat/
        obligation.md
        vat-return.md

  workflows/
    hmrc/
      mtd-vat/
        submit-vat-return.md

  auth/
    oauth2.md
    api-key.md
    mutual-tls.md
    dpop.md

  policies/
    access/
    data-classification/
    security/
    approval-gates/

  samples/
    hmrc/
      mtd-vat/
        get-obligations.md

  standards/
    openapi.md
    asyncapi.md
    arazzo.md
    oauth2-security-bcp.md
    gds-api-standards.md
    owapi-api-security-top-10.md

  generated/
    okf-bundle.json
    descriptor.json
    analysis-overview.json
    search-manifest.json
    relationship-shards/
    record-shards/
    operation-index/
    contract-index/
```

For large scale, publish like the CKAN fixture: a small descriptor and overview first, then lazy-load records, relationships, resources and search shards. ([GitHub][5])

---

## Minimal viable version

A practical first phase would be:

1. **Harvest GOV.UK API Catalogue** into `API Product` concepts.
2. **Harvest provider-native APIs** from the initial allowlist: Ordnance Survey
   `api.os.uk` and the ONS Beta API.
3. **Harvest data.gov.uk API-like resources** as `Data Access API Endpoint`
   records, not as declared API products.
4. **Normalise organisations** against a canonical public-body list.
5. **Classify visibility/access** from catalogue and documentation text.
6. **Find contracts**: OpenAPI, AsyncAPI, WSDL, OGC capabilities, SPARQL service
   descriptions, ArcGIS service metadata and docs pages.
7. **Generate right-card metadata**: owner, source, access conditions, docs, known endpoints, contract availability.
8. **Build analysis overview**: split counts, facets, warnings, top publishers, missing contracts and inferred licences.
9. **Add typed relationships**: publisher, docs, contract, service, standards,
   data-product, endpoint and provider-portal relationships.
10. **Add scorecard v0**: documentation, contract, lifecycle, access clarity.
11. **Render samples as static placeholders only**.
12. **Do not implement credential storage in v0**; model credential requirements only.

Then phase two:

1. Parse OpenAPI/AsyncAPI/Arazzo into operations/events/workflows.
2. Add operation-level cards and sample rendering.
3. Add sandbox/mock support.
4. Add security-quality scoring.
5. Add credential broker for internal deployments.
6. Add signed-in developer experience and access-request workflows.

That aligns with the API Hub alpha direction: catalogue, role-based guidance, developer tooling, signed-in developer experience, compliance information and quality/security scores. ([Data in Government][13])

---

## Strategic framing

The most valuable framing is:

> **The UK Government API OKF should be a knowledge graph of public-sector digital capabilities, not merely a list of endpoints.**

That means it should answer questions such as:

```text
Which APIs expose authoritative data about a person, business, property, payment or case?

Which APIs are safe for reuse by another department?

Which APIs have OpenAPI contracts and sandboxes?

Which APIs are still API-key-only?

Which APIs are production but have no declared owner?

Which APIs are deprecated but still depended on?

Which APIs could safely be exposed through MCP tools?

Which operations are read-only, which are side-effectful, and which require approval?

Which APIs support a cross-government user journey?

Which services depend on the same hidden data product?

Where are the biggest gaps in API maturity?
```

This directly supports the government direction in the Blueprint for Modern Digital Government, which includes a Digital Backbone, shared infrastructure, standard APIs/events, cyber resilience, transparency and better cross-government data exchange. ([GOV.UK][20])

The most important architectural boundary is equally clear:

> **OKF can safely describe credentials, policies and access requirements. It must not become the place where secrets live.**

Use OKF for discoverability, semantics, governance and evidence. Use a broker, KMS/secrets manager, short-lived tokens, policy checks and audit for actual access.

[1]: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md "knowledge-catalog/okf/SPEC.md at main · GoogleCloudPlatform/knowledge-catalog · GitHub"
[2]: https://github.com/chris-page-gov/api-mcp-wiki "GitHub - chris-page-gov/api-mcp-wiki: OKF bundle and viewer for From GET to Agentic Government · GitHub"
[3]: https://raw.githubusercontent.com/chris-page-gov/api-mcp-wiki/main/document/paper/from-get-to-agentic-government.md "raw.githubusercontent.com"
[4]: https://raw.githubusercontent.com/chris-page-gov/ai-infrastructure-wiki/main/docs/explorer-overview-context.md "raw.githubusercontent.com"
[5]: https://raw.githubusercontent.com/chris-page-gov/ai-engineering-lab-hackathon-london-2026/main/gov-ckan/okf-explorer.json "raw.githubusercontent.com"
[6]: https://spec.openapis.org/oas/latest.html "OpenAPI Specification v3.2.0"
[7]: https://www.asyncapi.com/docs/reference/specification/latest "3.1.0 | AsyncAPI Initiative for event-driven APIs"
[8]: https://spec.openapis.org/arazzo/latest.html "The Arazzo Specification v1.1.0"
[9]: https://www.gov.uk/guidance/gds-api-technical-and-data-standards "API technical and data standards - GOV.UK"
[10]: https://modelcontextprotocol.io/specification/latest "Specification - Model Context Protocol"
[11]: https://www.api.gov.uk/ "API Catalogue"
[12]: https://dataingovernment.blog.gov.uk/2025/04/03/joining-up-the-dots-the-findings-of-our-recent-api-discovery/ "Joining up the dots: the findings of our recent API discovery – Data in government"
[13]: https://dataingovernment.blog.gov.uk/2025/11/28/strengthening-and-extending-connectivity-what-we-learned-from-the-api-hub-alpha/ "Strengthening and extending connectivity: what we learned from the API hub alpha – Data in government"
[14]: https://raw.githubusercontent.com/chris-page-gov/ai-engineering-lab-hackathon-london-2026/main/gov-ckan/data/overview.json "raw.githubusercontent.com"
[15]: https://www.ncsc.gov.uk/blog-post/new-guidance-on-securing-http-based-apis "New guidance on securing HTTP-based APIs | National Cyber Security Centre"
[16]: https://www.rfc-editor.org/info/rfc9700 "RFC 9700: Best Current Practice for OAuth 2.0 Security | RFC Editor"
[17]: https://www.ncsc.gov.uk/collection/cloud/understanding-cloud-services/choosing-and-configuring-a-kms-for-secure-key-management-in-the-cloud "Choosing and configuring a KMS for secure key management in the cloud | National Cyber Security Centre"
[18]: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html "Secrets Management - OWASP Cheat Sheet Series"
[19]: https://owasp.org/www-project-api-security/ "OWASP API Security Project | OWASP Foundation"
[20]: https://www.gov.uk/government/publications/a-blueprint-for-modern-digital-government/a-blueprint-for-modern-digital-government-html "A blueprint for modern digital government (HTML) - GOV.UK"
