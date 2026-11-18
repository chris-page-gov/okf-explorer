# A fictional life in public services

Follow Alex Taylor, a fictional person in England, through ten possible
[life events](23-foundational-definitions.md#life-event). Their service
interactions and outcomes are invented. The official links describe real
services as observed on 18 November 2026. The examples make no claim about
personal eligibility or what someone should do in a particular case.

Start with [knowledge graphs and stable identifiers](06-knowledge-graphs-and-identifiers.md)
and [validation and provenance](08-validation-provenance-and-catalogue-standards.md).
For the choices a graph modeller makes before writing a record, read
[the missed collection example](00-data-information-knowledge-and-ontology.md).

## Follow Alex through ten life events

A person, service, organisation or episode can be an [entity](16-beginner-glossary.md#entity) in the model.
A [class](23-foundational-definitions.md#class) groups similar entities, and
an [instance](23-foundational-definitions.md#instance) is one particular
member. Alex is an instance of `Person`. A fictional school application is
an instance of `ServiceEpisode`. It has an [identifier](23-foundational-definitions.md#identifier)
and may have a [property](23-foundational-definitions.md#property) such as
its recorded date. The arrow shows a relationship from its source to its
target. All Alex-specific data in the table are fictional.

| Life event | Example entity, class and directed relationship | Official reference |
| --- | --- | --- |
| Birth and identity | Birth registration (`ServiceEpisode`) → records birth of → Alex (`Person`) | [Register a birth](https://www.gov.uk/register-birth) |
| Early years and education | School application (`ServiceEpisode`) → uses service → primary school admissions (`PublicService`) | [Apply for a primary school place](https://www.gov.uk/apply-for-primary-school-place) |
| Housing and local services | Council lookup (`ServiceEpisode`) → uses service → local council finder (`PublicService`) | [Find your local council](https://www.gov.uk/find-local-council) |
| Health and care | GP registration (`ServiceEpisode`) → uses service → GP registration (`PublicService`) | [Register with a GP surgery](https://www.nhs.uk/nhs-services/gps/how-to-register-with-a-gp-surgery/) |
| Travel and driving | Licence application (`ServiceEpisode`) → uses service → first provisional licence application (`PublicService`) | [Apply for your first provisional driving licence](https://www.gov.uk/apply-first-provisional-driving-licence) |
| Work, tax and social security | Tax check (`ServiceEpisode`) → uses service → current-year Income Tax check (`PublicService`) | [Check your Income Tax for the current year](https://www.gov.uk/check-income-tax-current-year) |
| Family and civil status | Civil partnership enquiry (`ServiceEpisode`) → uses service → civil partnership guidance (`PublicService`) | [Marriages and civil partnerships](https://www.gov.uk/marriages-civil-partnerships) |
| Civic, police and legal interactions | Electoral registration (`ServiceEpisode`) → uses service → voter registration (`PublicService`) | [Register to vote](https://www.gov.uk/register-to-vote) |
| Later life | Pension forecast request (`ServiceEpisode`) → uses service → State Pension forecast (`PublicService`) | [Check your State Pension forecast](https://www.gov.uk/check-state-pension) |
| Death, registration and estate | Death registration (`ServiceEpisode`) → records death of → Alex (`Person`). A separate probate enquiry models an estate interaction. | [Register a death](https://www.gov.uk/register-a-death), [applying for probate](https://www.gov.uk/applying-for-probate) |

The [jurisdiction](23-foundational-definitions.md#jurisdiction) is England
for this example. Service coverage and institutional responsibilities can
vary across the UK. The table records a single illustrative journey. It
leaves early-years provision, housing tenure, social care, social security
awards, police and court proceedings outside its detail. It does not assume
that each person drives, forms a civil partnership or needs probate. The
[public service](23-foundational-definitions.md#public-service) remains
distinct from a particular person's [service episode](23-foundational-definitions.md#service-episode).

## Trace one relationship to its evidence

The human label is “uses service”. Its machine-readable
[predicate](23-foundational-definitions.md#predicate) is the illustrative
[IRI](23-foundational-definitions.md#iri) `urn:example:predicate:uses-service`.
Reading the [triple](23-foundational-definitions.md#triple) left to right
gives “Alex's fictional school application uses the primary school admissions
service”. Reversing the arrow changes the meaning.

```ntriples
<urn:example:episode:alex-school-application> <urn:example:predicate:uses-service> <urn:example:service:primary-school-admissions> .
```

The evidence-bearing [assertion](23-foundational-definitions.md#assertion)
keeps that statement and its review context together. This YAML illustrates
the explanation fields. It is a teaching example outside the Explorer's
published data contracts.

```yaml
id: urn:example:assertion:alex-school-application-service
source: urn:example:episode:alex-school-application
predicate: urn:example:predicate:uses-service
target: urn:example:service:primary-school-admissions
label: uses service
status: asserted
scope: fictional teaching example in England
authority: author of the fictional application note
derivation: direct transcription from the exercise note
evidence: urn:example:note:alex-primary-school-application
service_reference: https://www.gov.uk/apply-for-primary-school-place
rights: original fictional note for this exercise, no personal data
observed_at: 2026-11-18
```

Here the [evidence](23-foundational-definitions.md#evidence) is the fictional
note in the next exercise. The author supplies the scenario's
[authority](23-foundational-definitions.md#authority). The GOV.UK page
supports the service description. It cannot verify Alex's application. The
[provenance](23-foundational-definitions.md#provenance) records where the
statement came from and how the modeller obtained it. The
[rights](23-foundational-definitions.md#rights) entry applies to the exercise
note. The [observation time](23-foundational-definitions.md#observation-time)
is when the note was consulted, at day precision.

See [web and browser foundations](02-web-and-browser-foundations.md#learning-path-connections)
for addresses and fragments, and [large corpora and progressive loading](04-large-corpora-and-progressive-loading.md#learning-path-connections)
for fetching a selected record or relationship with its source evidence.

## Exercise 1. Recognise entities and concepts

Use the [beginner glossary](16-beginner-glossary.md#learning-path-connections)
alongside the source note to review the terms in this exercise.

Related chapters include [From A Missed Collection To An Ontology](00-data-information-knowledge-and-ontology.md#learning-path-connections),
[The Product In Plain Language](01-product-in-plain-language.md#learning-path-connections),
[Markdown, OKF And Small Bundles](03-markdown-okf-and-small-bundles.md#learning-path-connections),
[Search, Filters, Facets And Context](05-search-filters-facets-and-context.md#learning-path-connections),
[Foundational Definitions](23-foundational-definitions.md#learning-path-connections).

**Task.** Identify two entities in this extract and choose a stage label
from the example [controlled vocabulary](23-foundational-definitions.md#controlled-vocabulary)
`education`, `health`, `tax`.

**Source extract.** A fictional note reads, “Alex's parent used the primary
school admissions service to apply for a place for Alex.”

**Hint.** Look for one particular application and a service available to
other applicants too.

**Worked answer.** Alex's application is a `ServiceEpisode`. Primary school
admissions is a `PublicService`. The controlled stage concept is `education`.

**Why the alternatives are weaker.** Treating `education` as the application
identifier would give every application the same identifier. Treating a
particular application as the whole service would lose the difference between
the individual episode and the public offer.

**Self-check.** Could a second application use the same stage concept and
service while retaining its own identifier? Yes.

## Exercise 2. Author a directed relationship

Related chapters include [Knowledge Graphs And Stable Identifiers](06-knowledge-graphs-and-identifiers.md#learning-path-connections),
[The Semantic Web And Ontologies](07-semantic-web-and-ontologies.md#learning-path-connections),
[Explorer Views And Presentation](09-explorer-views-and-presentation.md#learning-path-connections),
[Geospatial Data](10-geospatial-data.md#learning-path-connections),
[the contributor's repository tour](15-contributor-repository-tour.md#learning-path-connections),
[Federated Bundles](18-federated-bundles.md#learning-path-connections),
[Foundry Authoring And Domain Profiles](19-foundry-authoring-and-domain-profiles.md#learning-path-connections).

**Task.** Give the source identifier, predicate IRI and target identifier for
the school application. Say which evidence supports the relationship and
whose authority applies.

**Source extract.** Use the fictional note in [exercise 1](#exercise-1-recognise-entities-and-concepts)
and the official [primary school application guidance](https://www.gov.uk/apply-for-primary-school-place).

**Hint.** Read the relationship out loud as a full sentence. Ask which
source could support which part of it.

**Worked answer.** Use `urn:example:episode:alex-school-application` →
`urn:example:predicate:uses-service` →
`urn:example:service:primary-school-admissions`. Label the relationship “uses
service”. The exercise author directly asserts the episode link through the
fictional note. GOV.UK is authority for the published service guidance.
Keep both sources distinct as in [the assertion above](#trace-one-relationship-to-its-evidence).

**Why the alternatives are weaker.** The general guidance does not contain
an individual application record. A generic “related to” link also loses the
reason the two entities are connected.

**Self-check.** If you remove the fictional note, what evidence remains?
The guidance still supports the service description. The Alex-specific
relationship then lacks evidence.

## Exercise 3. Review the status of a claim

Related chapters include [Validation, Provenance And Catalogue Standards](08-validation-provenance-and-catalogue-standards.md#learning-path-connections),
[UK Legislation Data](11-uk-legislation-data.md#learning-path-connections),
[AI infrastructure and federated AI](12-ai-infrastructure-and-federated-ai.md#learning-path-connections),
[Security, Privacy, Accessibility And Responsible Use](13-security-privacy-accessibility-and-responsible-use.md#learning-path-connections),
[building, testing and publishing](14-building-testing-and-publishing.md#learning-path-connections),
[OKF v0.2 Trust, Lifecycle And Attestation](17-okf-v02-trust-lifecycle-and-attestation.md#learning-path-connections),
[Governed Enrichment And Release Assurance](20-governed-enrichment-and-release-assurance.md#learning-path-connections),
[Release Gates, Evidence And Owner Review](21-release-gates-evidence-and-owner-review.md#learning-path-connections),
[Evaluation Foundry And YAML-LD](22-evaluation-foundry-and-yaml-ld.md#learning-path-connections),
[Annotated Authoritative-Source Register](24-authoritative-source-register.md#learning-path-connections).

**Task.** Decide which of the four statements is asserted, inferred, proposed
or unsupported. Record the reason for each [status](23-foundational-definitions.md#status).

**Source extract.** The note says Alex's parent applied for a place. A second
fictional record tags primary school admissions as `education`. The exercise
supplies a rule that an episode inherits the stage of the service it uses.
The modeller suggests connecting each application to a future reminder
service. The exercise supplies no admission decision.

**Hint.** Ask whether the statement is recorded, follows a named rule, is
under consideration, or has no support in the available evidence.

| Statement | Worked answer |
| --- | --- |
| The application used primary school admissions. | Asserted directly by the fictional note. |
| The application belongs to the education stage. | Inferred from the two records and the explicitly supplied stage rule. |
| The graph should connect each application to a future reminder service. | Proposed by the modeller. The design still needs a decision. |
| Alex was offered a place. | Unsupported by these records. An application establishes neither an offer nor a refusal. |

**Why the alternatives are weaker.** Labelling the inferred stage as directly
asserted would lose its derivation. Turning the reminder proposal into a
service fact would give a design idea unwarranted authority. The graph cannot
resolve an outcome that its evidence never records.

**Self-check.** Which result would change if you withdrew the stage rule?
The inferred stage must be reconsidered. The fictional note still supports
the assertion that the episode used the service.

## Continue learning

Use [federated bundles](18-federated-bundles.md) to see how organisations can
publish related evidence with separate responsibilities. Use
[the authoritative-source register](24-authoritative-source-register.md)
to review the source's remit before applying a definition or rule. Return to
[the beginner learning path](index.md) to choose another route.

## Learning path connections

- [Learning path overview](index.md#learning-path)
- Previous chapter is [Annotated Authoritative-Source Register](24-authoritative-source-register.md#learning-path-connections).
- Glossary terms in this chapter include [Assertion](16-beginner-glossary.md#assertion),
  [Entity](16-beginner-glossary.md#entity),
  [Provenance](16-beginner-glossary.md#provenance),
  [Triple](16-beginner-glossary.md#triple).
