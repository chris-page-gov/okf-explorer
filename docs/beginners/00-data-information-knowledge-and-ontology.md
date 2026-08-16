# From A Missed Collection To An Ontology

This is the conceptual on-ramp to the OKF Explorer learning path. It starts
with an ordinary situation: a household expected a rubbish collection, but the
container is still outside. From that one situation we can separate
[data](23-foundational-definitions.md#data),
[information](23-foundational-definitions.md#information),
[knowledge](23-foundational-definitions.md#knowledge) and an
[ontology](23-foundational-definitions.md#ontology) without pretending that
they form a universal ladder.

The example is synthetic. It does not identify a real household, decide
whether a real collection is reportable, or replace a council's current
instructions. The applied material lives in the separate
[okf-uk-living repository](https://github.com/chris-page-gov/okf-uk-living).
This guide links to that corpus; it does not copy it.

## Start With The Person, Not The Data Model

A person is not trying to “create a graph edge.” They are trying to get their
rubbish collected, understand what happened and know what to do next.

A useful first statement of the [user need](23-foundational-definitions.md#user-need)
is:

> I need to find out whether my expected collection was missed and what I can
> do next, so that the rubbish is dealt with safely and I can challenge a
> continuing failure.

That need may involve several [public services](23-foundational-definitions.md#public-service),
organisations and [channels](23-foundational-definitions.md#channel). It may
start with a collection schedule, continue through a reporting form, and only
later reach a complaint or ombudsman route. The GOV.UK Service Manual calls for
teams to understand needs and work towards solving a whole problem, even when
different organisations own different parts. See the annotated entries for
[user-needs guidance](24-authoritative-source-register.md#s23-govuk-learning-about-users-and-their-needs)
and [whole-problem guidance](24-authoritative-source-register.md#s24-govuk-service-standard-point-2).

## One Situation, Several Different Things

Suppose our invented example records these observations:

| Item | Example value | What it does not establish |
|---|---|---|
| Place context | a synthetic address in a named council area | that the first council selected is correct |
| Scheduled date | 10 August 2026 | that the schedule is still current or applies to this waste type |
| Waste type | household recycling | that the container met local presentation rules |
| Observation | container still present at 18:05 | why it was not collected |
| Channel attempt | online report submitted at 18:12 | that the council accepted the report |
| Acknowledgement | synthetic reference MR-1042 | that a return collection will occur |

Each value is [data](23-foundational-definitions.md#data). The rows are already
selected and labelled, so they are not context-free “raw facts.” A person or
system chose what to observe, how to represent it and what not to record.

When we connect the scheduled date and waste type to the correct council's
current schedule, presentation conditions and disruption notices, the values
become useful [information](23-foundational-definitions.md#information) for a
particular question. The same time value may be irrelevant to a different
question, such as how much waste the council recycled last year.

When we can justify a conclusion such as “this event appears to meet the
selected council's current reporting conditions,” record the reasoning and
retain its evidence, we have a usable piece of
[knowledge](23-foundational-definitions.md#knowledge). It remains situated:
another council, waste type, date or revised rule may produce a different
conclusion.

An [ontology](23-foundational-definitions.md#ontology) supplies explicit,
shared meanings for concepts such as expected collection, observed
non-collection, missed-collection report, service outcome and external
complaint. It also defines meaningful relationships among those concepts. The
ontology does not sit “above” knowledge as a more advanced substance. It is a
model used to describe and connect data, information and claims consistently.

## Data: Recorded Values With A Boundary

In this guide, data means recorded representations used as inputs to a task.
Data can be numbers, text, dates, identifiers, images or structured records.
The representation and collection method matter.

For the missed-collection example, useful data might include:

- a local-authority [identifier](23-foundational-definitions.md#identifier);
- an expected collection date and waste type;
- an observation time and a description of what was seen;
- whether the container was at the collection point;
- an official page [URL](23-foundational-definitions.md#url);
- a reporting-channel acknowledgement; and
- an [outcome](23-foundational-definitions.md#outcome) recorded later.

Do not collect a real name, full address or contact detail merely to make a
teaching example look realistic. Data minimisation is part of responsible
modelling, not a cleanup step. Chapter 13 explains
[privacy and data minimisation](13-security-privacy-accessibility-and-responsible-use.md#privacy-and-data-minimization).

Data quality is always relative to a purpose. “18:05” may be syntactically
valid yet unusable if the date, time zone, observation method or expected
collection is missing. The
[Government Data Quality Framework](24-authoritative-source-register.md#s28-government-data-quality-framework)
is guidance for managing fitness for purpose; it does not certify an
individual record.

Questions to ask at the data layer:

1. Who or what recorded this value?
2. What was observed, and what was merely assumed?
3. Which format, unit, identifier and time zone apply?
4. What is missing?
5. Is personal data necessary for this purpose?

## Information: Data Put Into A Useful Context

Information answers a question by arranging and interpreting data in context.
For this example, the relevant context includes:

- which authority is responsible for the location;
- which schedule applies to the waste type;
- the local timing and presentation conditions;
- current disruption information;
- the available reporting [channel](23-foundational-definitions.md#channel);
- the [jurisdiction](23-foundational-definitions.md#jurisdiction); and
- when each source was observed.

A table saying “report after 5pm” becomes dangerous if the council, date and
source are stripped away. Four councils can use similar words while applying
different times, exclusions and complaint processes. The applied
[missed-rubbish journey](https://github.com/chris-page-gov/okf-uk-living/blob/main/journeys/missed-rubbish-collection.md)
keeps the Coventry, Edinburgh, Cardiff and Belfast variants separate.

Information is not automatically correct because it is well presented. A
page can be clear but stale, a schedule can be current but associated with the
wrong place, and a lookup can return a plausible but incorrect authority.

Questions to ask at the information layer:

1. Which question does this arrangement answer?
2. Which place, date, waste type and user situation does it cover?
3. Which source supplied the context?
4. Are apparently similar local processes being collapsed?
5. Can the reader see important omissions and uncertainty?

## Knowledge: A Justified And Usable Claim

Knowledge, in this curriculum, is a claim or model that can support
understanding or action because its meaning, basis and limits are inspectable.
For example:

> Under the selected local route and the evidence observed on a stated date,
> the synthetic event appears reportable through the named channel.

That claim should retain:

- the responsible authority and jurisdiction;
- the local [rule](23-foundational-definitions.md#rule) applied;
- the observation and source times;
- the supporting [evidence](23-foundational-definitions.md#evidence);
- the [assertion status](23-foundational-definitions.md#status), such as
  `official`, `normalized` or an editorial example;
- the [scope](23-foundational-definitions.md#scope);
- any method and [confidence](23-foundational-definitions.md#confidence); and
- the next route if the issue remains unresolved.

An official source has [authority](23-foundational-definitions.md#authority)
for some claims, not all claims. A council page can be authoritative for its
own current reporting route while the resident remains the source for what
they observed. An ombudsman is authoritative for its own acceptance and
investigation process, not for promising the outcome of a complaint.

High confidence never upgrades a model-derived statement into an official
one. A source being official never proves that a page is current or that it
applies outside its jurisdiction. Chapter 8 develops this separation in
[Assertion-level evidence](08-validation-provenance-and-catalogue-standards.md#assertion-level-evidence).

## DIKW: A Useful Prompt, Not A Universal Law

Data–Information–Knowledge–Wisdom (DIKW) is often drawn as a pyramid. This
curriculum uses the first three labels as a teaching prompt, with caution.

The heuristic is useful when it reminds us to ask how recorded values acquire
context and how a conclusion is justified. It becomes misleading when it
suggests:

- data is naturally context-free;
- information and knowledge have one agreed boundary;
- every project follows a one-way pipeline;
- adding more data inevitably produces better knowledge; or
- “wisdom” is a machine-produced layer that can be validated like JSON.

Real work loops. A proposed conclusion exposes missing data. A changed rule
forces information to be rebuilt. A user's experience challenges the model.
An ontology reveals that two teams used one label for different concepts.

Use DIKW as four questions, not four ranks:

| Prompt | Missed-collection question |
|---|---|
| Data | What was recorded, by whom, when and in which representation? |
| Information | Which context makes the values relevant to this user need? |
| Knowledge | Which claim is justified, by what evidence and within what limits? |
| Judgement | What should an accountable person do, considering law, ethics, risk and the person's circumstances? |

The final row is deliberately called judgement here. A public body must not
hide a consequential decision behind a diagram that implies “wisdom” emerged
automatically from data.

## Vocabulary, Taxonomy And Ontology

These three tools solve different problems.

A [controlled vocabulary](23-foundational-definitions.md#controlled-vocabulary)
governs which terms or codes may be used. It might define allowed service
outcomes such as acknowledged, rejected, return collection planned and
unresolved.

A [taxonomy](23-foundational-definitions.md#taxonomy) arranges concepts,
usually through broader and narrower groupings. Rubbish, recycling and street
services might contain household collections, bulky waste, fly-tipping and
street cleaning. A taxonomy helps classification and browsing; it need not
describe an end-to-end service journey.

An ontology identifies classes and properties and states semantic
relationships. A small missed-collection model may distinguish:

- **classes:** expected collection, observed non-collection, report, outcome,
  council complaint and external complaint;
- **instances:** one synthetic expected collection or report;
- **properties:** applies within jurisdiction, supported by evidence,
  submitted through channel and resulted in outcome; and
- **constraints or policies:** an assertion must retain source, target,
  predicate, status, scope, evidence, rights and observation time under this
  repository's additive Bundle Wiki profile.

The applied project publishes a bounded
[missed-rubbish ontology module](https://github.com/chris-page-gov/okf-uk-living/blob/main/ontology/missed-rubbish-collection.md).
It normalises comparison concepts without declaring four councils' processes
identical.

## From Sentence To Triple To Evidence-Bearing Assertion

Consider the sentence:

> The synthetic report was submitted through the council's online channel.

In Resource Description Framework (RDF) terms, a
[triple](23-foundational-definitions.md#triple) has subject, predicate and
object:

| Triple position | Example |
|---|---|
| Subject | synthetic report MR-1042 |
| Predicate | submitted through |
| Object | named council online channel |

The [predicate](23-foundational-definitions.md#predicate) must have a stable
Internationalized Resource Identifier (IRI) if publications are to agree on
its identity. Its display label is for readers; the IRI establishes which
property is meant.

A triple alone does not say who made the claim, whether it is official or
synthetic, when it was observed, or which evidence supports it. This
repository's additive YAML-LD profile therefore represents an evidence-bearing
[assertion](23-foundational-definitions.md#assertion) as well as the direct
semantic triple. The two must be generated from one assertion source so their
identities do not drift.

YAML-LD 1.0 is currently a **W3C Working Draft**, not a Recommendation. The
repository uses a constrained, pinned local profile and generates JSON-LD; it
does not claim that every YAML file is YAML-LD or that the draft is a completed
standard. See the dated
[YAML-LD source entry](24-authoritative-source-register.md#s11-yaml-ld-10).

## Ordinary Links Are Not Domain Predicates

This sentence contains an ordinary Markdown link to the
[bounded evidence set](https://github.com/chris-page-gov/okf-uk-living/blob/main/evidence/missed-rubbish-collection-sources.md).
The link lets a reader navigate. It does not, by itself, assert that one
resource legally authorises another, proves a requirement, or is the evidence
for a specific graph edge.

The Explorer may project a Markdown link as a generic derived reference. It
must not infer a domain predicate from anchor text, nearby headings or screen
position. Material domain relationships come from the declared semantic
assertion graph or authored YAML-LD frontmatter.

This separation prevents wording such as “see complaints” from silently
becoming a formal redress relationship.

## Model A Service Episode, Including Failure

A [service episode](23-foundational-definitions.md#service-episode) is one
bounded interaction or attempt within a longer journey. The synthetic example
might branch as follows:

1. identify the responsible authority;
2. check schedule, waste type and disruption information;
3. classify the event as reportable, excluded, too early, too late or
   unresolved;
4. attempt the official channel;
5. record acknowledgement, rejection, channel failure or no response;
6. record any return collection or explanation; and
7. if necessary, follow the council complaint stages and then the relevant
   external redress route.

The list is not a promise that everyone follows one path. “Wrong authority,”
“no internet access,” “container contaminated,” “collection disrupted,”
“deadline passed” and “channel failed” are legitimate branches. A model that
contains only its ideal happy path does not describe the service people
actually encounter.

Do not join every branch into one fictional person's history. The full worked
example later in this curriculum uses a set of branching situations across a
life course, not one impossible linear biography.

## Keep Evidence, Authority, Provenance And Rights Separate

For each important claim, ask four independent questions:

| Dimension | Question |
|---|---|
| Evidence | What material supports or challenges the claim? |
| Authority | Who is entitled or competent to state this kind of claim? |
| Provenance | Where did the claim come from and how was it transformed? |
| Rights | May this material be accessed, linked, copied, adapted or redistributed? |

A source can be official yet unavailable. Evidence can be strong yet not
licensed for redistribution. A normalised statement can be traceable without
being source-declared. A source can be openly licensed without being accurate
for the current situation.

The applied project therefore keeps a
[linked-reference register](https://github.com/chris-page-gov/okf-uk-living/blob/main/source/missed-rubbish-collection.v1.yaml)
and separate rights decisions. This curriculum links to those records rather
than copying their source corpus.

## A Compact Modelling Checklist

Before publishing a public-service concept or relationship, check:

1. **Need:** what is the person trying to achieve?
2. **Identity:** which stable local identifier and absolute IRI identify each
   material thing or term?
3. **Meaning:** is this a label, controlled term, taxonomy concept, class,
   instance, property, triple or assertion?
4. **Context:** which jurisdiction, service, channel, date and scope apply?
5. **Evidence:** which claim does each source support, and when was it
   observed?
6. **Authority:** is the source competent for that claim type?
7. **Derivation:** is the result `official`, `normalized`, `inferred`,
   `model-derived` or `synthetic`?
8. **Rights:** what licence or other rights decision permits the intended
   use?
9. **Branches:** are exclusions, failures, redress and unknown outcomes
   represented?
10. **Presentation:** can a reader understand the same distinctions without a
    graph or colour cue?

## Check Your Understanding

Try to explain why each statement is unsafe:

- “The bin was still there, so the council failed.”
- “The GOV.UK route proves all four nations use the same process.”
- “The model is 95% confident, so the relationship is official.”
- “The source is openly licensed, so every claim in it is current.”
- “The Markdown link says ‘complaint,’ so it is a formal redress predicate.”
- “The ontology says an outcome exists, so this episode must have succeeded.”

A sound answer mentions missing context, jurisdiction, evidence, authority,
derivation, rights, open-world uncertainty or the separation between
navigation and semantics.

## Continue

- Use the [stable foundational definitions](23-foundational-definitions.md)
  whenever a term is unclear.
- Check the [annotated authoritative-source register](24-authoritative-source-register.md)
  before making a conformance or authority claim.
- Read [The product in plain language](01-product-in-plain-language.md) to see
  where these layers appear in OKF Explorer.
- Read [Markdown, OKF and small bundles](03-markdown-okf-and-small-bundles.md)
  for the source format.
- Read [Knowledge graphs and stable identifiers](06-knowledge-graphs-and-identifiers.md)
  and [The semantic web and ontologies](07-semantic-web-and-ontologies.md) for
  the graph model.
- Read [Validation, provenance and catalogue standards](08-validation-provenance-and-catalogue-standards.md)
  for structural and evidence checks.
- Inspect the applied project's
  [rubbish, recycling and street domain](https://github.com/chris-page-gov/okf-uk-living/blob/main/life-course/rubbish-recycling-and-street.md),
  [journey](https://github.com/chris-page-gov/okf-uk-living/blob/main/journeys/missed-rubbish-collection.md),
  [evidence set](https://github.com/chris-page-gov/okf-uk-living/blob/main/evidence/missed-rubbish-collection-sources.md)
  and [ontology module](https://github.com/chris-page-gov/okf-uk-living/blob/main/ontology/missed-rubbish-collection.md).
