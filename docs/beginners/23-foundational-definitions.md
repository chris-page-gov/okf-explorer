# Foundational Definitions

These are the stable teaching definitions for the beginner curriculum. Each
term has one heading so other chapters can link to a predictable browser
anchor. The definitions state how this project uses a term; they do not claim
to settle every academic or professional debate.

Read [From a missed collection to an ontology](00-data-information-knowledge-and-ontology.md)
for the continuous example. Use the
[authoritative-source register](24-authoritative-source-register.md) to check
the formal specifications, guidance, status and limits behind these
definitions. The [beginner glossary](16-beginner-glossary.md) remains the
broader quick-reference list.

## Data

**Definition.** Recorded representations used as inputs to a task: for
example text, numbers, dates, identifiers, images or structured observations.
Data is shaped by collection choices, formats and context; “raw” does not mean
neutral or self-explanatory.

**Boundary and example.** A synthetic scheduled date and an observation that
a container remains outside are data. Neither establishes why collection did
not occur. Data quality is fitness for a declared purpose, not a universal
score. See [information](#information), [observation time](#observation-time),
the [on-ramp data section](00-data-information-knowledge-and-ontology.md#data-recorded-values-with-a-boundary)
and the [Government Data Quality Framework](24-authoritative-source-register.md#s28-government-data-quality-framework).

## Information

**Definition.** Data selected, organised or interpreted in context so that it
answers or helps answer a question.

**Boundary and example.** Combining a collection date, waste type and place
with the correct council's current schedule produces information relevant to
whether a collection was expected. Clear presentation does not guarantee
accuracy, freshness or applicability. Information and knowledge overlap in
ordinary language; this curriculum uses [knowledge](#knowledge) when the
justification and limits of a usable claim are explicit. See the
[on-ramp information section](00-data-information-knowledge-and-ontology.md#information-data-put-into-a-useful-context).

## Knowledge

**Definition.** A claim or model that can support understanding or action
because its meaning, basis and limits are inspectable.

**Boundary and example.** “This synthetic event appears reportable under the
selected local route observed on this date” can be knowledge when the rule,
authority, evidence, derivation and scope are retained. Knowledge is not
whatever an interface states fluently, and a schema-valid claim can still be
wrong. See [assertion](#assertion), [evidence](#evidence), [scope](#scope),
[DIKW](#dikw) and
[Evidence before fluency](08-validation-provenance-and-catalogue-standards.md#evidence-before-fluency).

## DIKW

**Definition.** Data–Information–Knowledge–Wisdom (DIKW) is a teaching
heuristic that asks how recorded values gain context and how conclusions
support judgement.

**Boundary and example.** DIKW is contested, not a universal law or a required
pipeline. Data is never wholly context-free, boundaries between information
and knowledge vary, and more data does not automatically produce better
judgement. This curriculum does not model “wisdom” as a machine-generated
layer. See [the full caution](00-data-information-knowledge-and-ontology.md#dikw-a-useful-prompt-not-a-universal-law),
[data](#data), [information](#information) and [knowledge](#knowledge).

## Ontology

**Definition.** An explicit model of kinds of things, identified properties
and semantic relationships in a domain. An ontology may support inference,
but its expressiveness depends on the language and profile used.

**Boundary and example.** A missed-collection ontology can distinguish
expected collections, observations, reports, outcomes and complaints. It
does not make four councils' local rules identical, and it is not merely a
JSON object or a list of tags. Contrast [taxonomy](#taxonomy) and
[controlled vocabulary](#controlled-vocabulary). Continue with
[Vocabulary and ontology](06-knowledge-graphs-and-identifiers.md#vocabulary-and-ontology)
and the [OWL 2 source boundary](24-authoritative-source-register.md#s13-owl-2-primer).

## Taxonomy

**Definition.** A classification that arranges concepts into a governed
structure, commonly broader and narrower categories.

**Boundary and example.** A taxonomy may place household collections under
rubbish, recycling and street services. It supports classification and
browsing but need not define service episodes, evidence or formal inference.
A taxonomy is not every navigation menu. See [controlled vocabulary](#controlled-vocabulary),
[ontology](#ontology), [SKOS](24-authoritative-source-register.md#s12-skos-reference)
and the [GOV.UK taxonomy principles](24-authoritative-source-register.md#s25-govuk-taxonomy-principles).

## Controlled Vocabulary

**Definition.** A governed set of permitted terms or codes, with maintained
identifiers, labels, definitions and lifecycle decisions.

**Boundary and example.** A service-outcome vocabulary might permit
acknowledged, rejected, return planned and unresolved. The control lies in
governance and validation, not in alphabetical presentation. A controlled
vocabulary can be flat; a [taxonomy](#taxonomy) adds classification structure,
and an [ontology](#ontology) can add richer semantics. See
[Governed terms](20-governed-enrichment-and-release-assurance.md#governed-terms).

## Identifier

**Definition.** A value assigned to distinguish and refer to a thing within a
declared identity system.

**Boundary and example.** A stable service-family ID should survive label
changes. An identifier need not be a web address, and a human-readable label
is not a reliable identifier. Local IDs need a declared namespace; global
semantic identities use absolute IRIs in this profile. See [URL](#url),
[URI](#uri), [IRI](#iri) and
[Labels are not identifiers](06-knowledge-graphs-and-identifiers.md#labels-are-not-identifiers).

## URL

**Definition.** A Uniform Resource Locator is a web identifier that also
provides a location or access mechanism.

**Boundary and example.** An HTTPS council page URL can identify where a
reader retrieves current instructions. Availability, ownership and semantic
identity are separate questions: a URL can redirect, disappear or serve new
content. This curriculum uses credential-free HTTP(S) source URLs and checks
their syntax and policy before generation. See [URI](#uri), [IRI](#iri),
[RFC 3986](24-authoritative-source-register.md#s05-rfc-3986) and
[URLs](02-web-and-browser-foundations.md#urls).

## URI

**Definition.** A Uniform Resource Identifier is an identifier conforming to
the generic URI syntax. It may identify by name, location or both.

**Boundary and example.** In the classic RFC distinction, a URL is a kind of
URI associated with access. Not every URI is safely fetchable, and a syntactic
URI does not prove that a resource exists. See [URL](#url), [IRI](#iri),
[RFC 3986](24-authoritative-source-register.md#s05-rfc-3986) and
[URI, URL and IRI](06-knowledge-graphs-and-identifiers.md#uri-url-and-iri).

## IRI

**Definition.** An Internationalized Resource Identifier extends the URI
identifier model to a wider repertoire of characters while retaining defined
mapping and syntax rules.

**Boundary and example.** RDF uses IRIs to identify resources and properties.
This project's material semantic nodes and predicates use absolute IRIs plus
validated local Explorer routes. An IRI can identify without being a page the
Reader may fetch. See [URI](#uri), [identifier](#identifier),
[RFC 3987](24-authoritative-source-register.md#s06-rfc-3987) and
[RDF 1.1 Concepts](24-authoritative-source-register.md#s08-rdf-11-concepts).

## Class

**Definition.** A category whose members are things of a described kind.

**Boundary and example.** Public Service can be a class; one council's
missed-collection route can be an [instance](#instance). A class is not simply
a display group or a tag, and membership should have declared semantics. In
RDFS and OWL, class statements can participate in inference; validation is a
separate layer. See [Classes, instances and properties](06-knowledge-graphs-and-identifiers.md#classes-instances-and-properties)
and [RDFS](24-authoritative-source-register.md#s09-rdf-schema-11).

## Instance

**Definition.** A particular thing represented as a member of one or more
classes.

**Boundary and example.** A synthetic missed-collection report is an instance
of a Report class. Two records with similar labels are not necessarily the
same instance, and one real-world thing can have multiple records that require
evidence-backed reconciliation. See [class](#class), [identifier](#identifier)
and [Identity and similarity](06-knowledge-graphs-and-identifiers.md#identity-and-similarity).

## Property

**Definition.** An identified characteristic or relationship used to make a
statement about something.

**Boundary and example.** “Applies within jurisdiction” can be a property
linking a service to a place. A local JSON key is not automatically an RDF
property; semantic use requires a declared mapping to an IRI. When a property
occupies the middle position of an RDF triple it is the [predicate](#predicate).
See [RDF](24-authoritative-source-register.md#s08-rdf-11-concepts) and
[Classes, instances and properties](06-knowledge-graphs-and-identifiers.md#classes-instances-and-properties).

## Predicate

**Definition.** The IRI in the middle position of an RDF triple, identifying
the property that relates the subject to the object.

**Boundary and example.** In “report — submitted through — online channel,”
submitted through is the predicate. Its human label can vary while its IRI
keeps identity stable. An ordinary Markdown link must not be interpreted as a
domain predicate. See [triple](#triple), [property](#property),
[Directed and typed relationships](06-knowledge-graphs-and-identifiers.md#directed-and-typed-relationships)
and [the link boundary](00-data-information-knowledge-and-ontology.md#ordinary-links-are-not-domain-predicates).

## Triple

**Definition.** The basic RDF statement form: subject, predicate and object.

**Boundary and example.** A triple can state that one identified report was
submitted through one identified channel. It does not, by itself, carry the
claim's authority, evidence, derivation, status or observation time. This
profile therefore keeps a direct triple synchronised with an evidence-bearing
[assertion](#assertion). See
[RDF: the graph model](07-semantic-web-and-ontologies.md#rdf-the-graph-model)
and [RDF 1.1 Concepts](24-authoritative-source-register.md#s08-rdf-11-concepts).

## Assertion

**Definition.** A statement represented in the knowledge product. In this
profile, a material directed relationship is also represented as an
evidence-bearing assertion record with stable identity and governance fields.

**Boundary and example.** The assertion that a report used a channel retains
source and target identities, predicate, kind, labels, status, scope,
authority, derivation, observation time, evidence and rights. An assertion is
not true merely because it is present. See [triple](#triple), [evidence](#evidence),
[status](#status), [scope](#scope) and
[Assertion-level evidence](08-validation-provenance-and-catalogue-standards.md#assertion-level-evidence).

## Evidence

**Definition.** Material that supports, challenges or helps assess a claim or
whether a requirement is met.

**Boundary and example.** A dated official schedule can support what a council
published; a synthetic observation can support what the example says was
seen. Neither automatically supports every claim in the record. Evidence can
be incomplete, conflicting or unavailable. It remains separate from
[authority](#authority), [confidence](#confidence) and [rights](#rights). See
[CCCEV](24-authoritative-source-register.md#s20-cccev-220) and
[Evidence before fluency](08-validation-provenance-and-catalogue-standards.md#evidence-before-fluency).

## Authority

**Definition.** The competence, mandate or recognised role that makes a source
appropriate for a particular type of claim.

**Boundary and example.** A council is authoritative for its current local
reporting route; a resident is the source for their observation; an ombudsman
states its own complaint scope. Authority is claim-specific and does not prove
freshness, availability or correctness. High [confidence](#confidence) does
not create authority. See
[Authority, derivation and freshness](18-federated-bundles.md#authority-derivation-and-freshness)
and [Assertion status](06-knowledge-graphs-and-identifiers.md#assertion-status).

## Provenance

**Definition.** Information about the origin, custody and transformation of a
claim, record or artefact.

**Boundary and example.** Provenance can record which source supplied a rule,
when it was observed, which activity normalised it and which output was
generated. Provenance supports assessment but does not itself decide trust or
truth. See [evidence](#evidence), [observation time](#observation-time),
[Provenance](08-validation-provenance-and-catalogue-standards.md#provenance)
and [PROV-O](24-authoritative-source-register.md#s15-prov-o).

## Rights

**Definition.** The permissions, restrictions, duties and other legal or
policy conditions governing access to and use of material.

**Boundary and example.** Rights can cover viewing, linking, copying,
modification and redistribution. A source being public on the web does not
make it open data. Rights are broader than a [licence](#licence), and an open
licence does not make a claim accurate or authoritative. See
[Licensing](13-security-privacy-accessibility-and-responsible-use.md#licensing),
[DCMI Terms](24-authoritative-source-register.md#s17-dcmi-metadata-terms)
and [OGL 3.0](24-authoritative-source-register.md#s32-open-government-licence-30).

## Licence

**Definition.** An explicit grant of permission to use material under stated
conditions.

**Boundary and example.** The Open Government Licence 3.0 permits broad reuse
of covered information subject to its terms. It does not cover material that
the provider excludes or third-party rights it does not own. A licence is one
part of [rights](#rights), not evidence of factual correctness. See
[OGL 3.0](24-authoritative-source-register.md#s32-open-government-licence-30)
and [Markdown is content, not permission](03-markdown-okf-and-small-bundles.md#markdown-is-content-not-permission).

## Confidence

**Definition.** A documented estimate of uncertainty about an assertion under
a stated method, scale and calibration.

**Boundary and example.** A model may assign 0.9 confidence to a proposed
classification. That number does not make the assertion official, confer
authority or measure relationship strength. A confidence value without its
method is ambiguous. See [authority](#authority), [status](#status),
[Confidence, strength and count](06-knowledge-graphs-and-identifiers.md#confidence-strength-and-count)
and [Evidence has several axes](19-foundry-authoring-and-domain-profiles.md#evidence-has-several-axes).

## Status

**Definition.** A governed label describing the state or origin of a record or
assertion within a declared lifecycle or assertion scheme.

**Boundary and example.** `Official`, `normalized`, `inferred`,
`model-derived` and `editorial-example` are assertion-origin statuses; draft,
stable and deprecated are lifecycle statuses. The applicable scheme must be
named. Status does not describe geographic or population coverage; that is
[scope](#scope). See
[Assertion status](06-knowledge-graphs-and-identifiers.md#assertion-status) and
[Two independent labels](22-evaluation-foundry-and-yaml-ld.md#two-independent-labels-status-and-scope).

## Scope

**Definition.** The declared boundary within which a claim, record, rule or
evaluation applies.

**Boundary and example.** Scope may be one council, one jurisdiction, one
observation date, a synthetic fixture or a defined source population. It is
not a confidence score or an assertion origin. Explicit scope prevents a
local example from appearing universal. See [status](#status),
[jurisdiction](#jurisdiction), [observation time](#observation-time) and
[Two independent labels](22-evaluation-foundry-and-yaml-ld.md#two-independent-labels-status-and-scope).

## Life Event

**Definition.** A situation or change in a person's circumstances that can
trigger needs, duties, rights or interactions with services.

**Boundary and example.** Birth, leaving school, moving home, learning to
drive, bereavement and caring can be life events. People do not experience one
universal sequence, and the same event can create different branches by
jurisdiction and circumstance. A life event is not a department or a single
transaction. See [user need](#user-need), [service episode](#service-episode)
and [CPSV-AP](24-authoritative-source-register.md#s19-cpsv-ap-320).

## User Need

**Definition.** What a person or organisation needs from a service to achieve
the right outcome for them, grounded in research rather than assumed from a
preferred solution.

**Boundary and example.** “Know whether my expected collection was missed and
what to do next” is a need. “Receive an email” is usually a proposed solution
or channel. Needs can span organisational boundaries. See [outcome](#outcome),
[channel](#channel), the [GOV.UK guidance](24-authoritative-source-register.md#s23-govuk-learning-about-users-and-their-needs)
and [Start with the person](00-data-information-knowledge-and-ontology.md#start-with-the-person-not-the-data-model).

## Public Service

**Definition.** A capacity or activity through which a public authority or
authorised provider helps people or organisations meet needs, exercise rights,
fulfil duties or obtain an output under applicable rules.

**Boundary and example.** Reporting a missed collection can be modelled as a
public service family with local routes. A service is not identical to its
web page, form, channel, organisation or one person's episode. See
[service episode](#service-episode), [channel](#channel), [CPSV-AP](24-authoritative-source-register.md#s19-cpsv-ap-320)
and [Open Referral UK](24-authoritative-source-register.md#s21-open-referral-uk).

## Service Episode

**Definition.** One bounded interaction or attempt involving a person and a
service within a longer journey.

**Boundary and example.** Checking a schedule, submitting a report or making a
complaint can each be an episode. An episode has time, channel, evidence and an
outcome, including failure or unresolved state. It is not the public-service
definition itself and need not be a successful transaction. See
[public service](#public-service), [channel](#channel), [outcome](#outcome) and
[the branching example](00-data-information-knowledge-and-ontology.md#model-a-service-episode-including-failure).

## Requirement

**Definition.** A condition, demand or information need that something or
someone is expected to satisfy or address.

**Boundary and example.** A local reporting route may require a collection
date and address context. A requirement should retain its source,
jurisdiction, validity and assessment method. It is not automatically a legal
duty, a software field or a decision [rule](#rule). See [evidence](#evidence),
[CCCEV](24-authoritative-source-register.md#s20-cccev-220) and
[JSON Schema](08-validation-provenance-and-catalogue-standards.md#json-schema).

## Rule

**Definition.** An explicit statement used to constrain, classify, route or
decide what follows under stated conditions.

**Boundary and example.** “Do not accept a report before the locally stated
time” may be represented as a sourced operational rule. A rule needs authority,
jurisdiction and observation time; it must not be copied from another council
because the labels look similar. A rule may implement or assess a
[requirement](#requirement), but the two are not synonyms. See [scope](#scope)
and [CPSV-AP](24-authoritative-source-register.md#s19-cpsv-ap-320).

## Channel

**Definition.** A means through which a person or system accesses or
communicates with a service, such as web, phone, post or in person.

**Boundary and example.** An online form is a channel, not the whole public
service or user need. Channel availability, accessibility and failure should
be recorded; digital access must not be assumed. See [user need](#user-need),
[public service](#public-service), [service episode](#service-episode),
[CPSV-AP](24-authoritative-source-register.md#s19-cpsv-ap-320) and
[Accessibility](13-security-privacy-accessibility-and-responsible-use.md#accessibility).

## Outcome

**Definition.** The result or state reached for a person, service episode or
process, including an unresolved or adverse result.

**Boundary and example.** Acknowledged, rejected, return collection completed,
explained and unresolved are possible episode outcomes. An output such as a
reference number is not automatically the desired user outcome. Never infer
success from submission alone. See [user need](#user-need),
[service episode](#service-episode), [redress](#redress) and
[CPSV-AP](24-authoritative-source-register.md#s19-cpsv-ap-320).

## Redress

**Definition.** A route through which a person can seek review, correction,
remedy or accountability after a problem, decision or unresolved outcome.

**Boundary and example.** A council complaint followed, where applicable, by
an external ombudsman route is redress. It is not a guaranteed remedy, and
scope, time limits and prerequisite stages belong to the responsible body.
See [outcome](#outcome), [jurisdiction](#jurisdiction),
[the missed-collection journey](https://github.com/chris-page-gov/okf-uk-living/blob/main/journeys/missed-rubbish-collection.md)
and [Data and AI ethics](24-authoritative-source-register.md#s30-data-and-ai-ethics-framework).

## Jurisdiction

**Definition.** The geographic, legal or administrative area within which an
authority, rule, service or decision applies.

**Boundary and example.** United Kingdom, England, Scotland, Wales, Northern
Ireland and a local-authority area are different relevant jurisdictions.
Place similarity does not establish legal applicability, and one UK-wide
routing page does not prove a uniform process. See [scope](#scope), [rule](#rule),
[UK legislation data](11-uk-legislation-data.md) and the
[four local variants](00-data-information-knowledge-and-ontology.md#information-data-put-into-a-useful-context).

## Observation Time

**Definition.** The date or time when a source, fact or condition was observed
for the purpose of the record.

**Boundary and example.** A council page observed on 10 August can support
what the project saw then; it is not necessarily the page's publication date,
the service-event time or the assertion-generation time. Recording precision
matters: a year is not a day. See [provenance](#provenance), [scope](#scope),
[Timeline](09-explorer-views-and-presentation.md#timeline) and
[Assertion-level evidence](08-validation-provenance-and-catalogue-standards.md#assertion-level-evidence).

## Relationships Among The Terms

The definitions are meant to be used together:

- a [life event](#life-event) can trigger a [user need](#user-need);
- a [public service](#public-service) can address part of that need through
  one or more [channels](#channel) and [service episodes](#service-episode);
- [requirements](#requirement) and [rules](#rule) apply within a
  [jurisdiction](#jurisdiction) and [scope](#scope);
- episodes produce [outcomes](#outcome), including failure, and may lead to
  [redress](#redress);
- an [assertion](#assertion) can express the relationship with stable
  [identifiers](#identifier), a [predicate](#predicate), [status](#status),
  [evidence](#evidence), [authority](#authority), [provenance](#provenance),
  [rights](#rights) and [observation time](#observation-time); and
- a [controlled vocabulary](#controlled-vocabulary), [taxonomy](#taxonomy) or
  [ontology](#ontology) governs how selected parts of that model are named and
  connected.

That chain is a modelling aid, not a claim that every person experiences one
linear journey.
