# OKF learner hub specification

Status: researched implementation specification, 17 August 2026.

## Decision

The no-parameter root of the OKF Explorer Pages site will become a fast,
accessible learning hub called **Build a knowledge base your AI can trust**.
The full Explorer will move to the `/explore/` route. Existing root links that
contain a bundle, view, query, filter or record fragment will redirect to the
equivalent Explorer route without losing state.

The hub will not teach every technical detail on its landing page. It will
help a new learner choose a project, understand the outcome, start the next
small step, inspect working examples and recover when something is unfamiliar.
The existing 25-chapter beginner guide remains the reference curriculum. A new
project studio will turn that reference into an eight-stage build journey.

## Research basis

This specification uses the following current guidance.

- [CAST Universal Design for Learning Guidelines 3.0](https://udlguidelines.cast.org/)
  organises inclusive learning design around engagement, representation, and
  action and expression. The hub therefore offers subject choice, concise text,
  diagrams and worked examples, and several ways to demonstrate learning.
- The US Institute of Education Sciences practice guide on
  [organising instruction and study](https://ies.ed.gov/ncee/wwc/PracticeGuide/1)
  recommends spacing learning, alternating worked examples with problems,
  combining words and graphics, linking abstract and concrete representations,
  and active retrieval. Each stage therefore follows explain, inspect, do,
  check and retrieve.
- The Education Endowment Foundation's updated
  [metacognition and self-regulation evidence review](https://educationendowmentfoundation.org.uk/education-evidence/evidence-reviews/metacognition-and-self-regulated-learning-guidance-report)
  supports explicit planning, monitoring and evaluation. Every stage includes
  a learner decision, a visible checkpoint and a short reflection.
- [PRIMM](https://www.raspberrypi.org/teach/pedagogy/quick-reads) structures
  novice programming as Predict, Run, Investigate, Modify and Make. The final
  app stage begins with a working Explorer and starter interface before asking
  the learner to create a personal UI.
- [UNESCO's AI competency framework for students](https://www.unesco.org/en/articles/ai-competency-framework-students)
  uses understand, apply and create progression across human-centred practice,
  ethics, techniques and system design. The project requires learners to
  inspect AI evidence, evaluate answers and keep consequential decisions human.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and W3C cognitive accessibility
  guidance on
  [helping users understand controls](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/)
  require predictable navigation, clear purpose, labelled controls, visible
  focus and consistent help. WCAG conformance is a minimum, not evidence that
  every cognitive need is met.
- [GOV.UK user-needs guidance](https://www.gov.uk/service-manual/user-research/start-by-learning-user-needs)
  requires needs to be based on evidence and separated from assumed solutions.
  The learner must research the intended users of their own app rather than
  designing only for themselves.
- The ONS content guide on
  [identifying user needs](https://service-manual.ons.gov.uk/content/writing-for-users/user-needs)
  recommends plain language, front-loaded content and short scannable sections.
  The hub must explain acronyms before using them and put the next useful action
  before background detail.

These sources do not establish that one interface is universally “state of
the art”. They justify an evidence-led combination: user choice, worked
examples, active retrieval, gradual removal of scaffolding, explicit
self-checks, authentic projects and accessible plain language.

## Primary learner persona

### Sam, 18: independent project learner

Sam has just finished school or college and wants to build something useful
for a course, apprenticeship, portfolio or community interest. Their chosen
subject might be local music history, football statistics, public transport,
wildlife, game lore, family photographs, legislation, public services or a
private collection of study notes.

Sam can use a browser, edit ordinary files and ask an AI assistant questions.
They may have copied code before but do not yet understand data modelling,
linked data, provenance, licences, evaluation or deployment. Acronyms make a
page feel as if it was written for somebody else. They often use a phone for
reading and a laptop for building. They have limited money, may have an
unreliable connection, and cannot assume that a paid cloud service or API key
is available.

Sam wants a visible result early. They need to know why each new concept helps
their project, what “good enough for this stage” means and how to undo a
mistake. They should be able to pause and return through a durable URL or a
downloaded project record. They must not be encouraged to upload personal,
confidential, copyrighted or credential-bearing material to an AI without a
rights and privacy decision.

Sam succeeds when they can independently:

1. define an answerable knowledge domain and intended users;
2. write research and evaluation questions before choosing sources;
3. distinguish a source, claim, concept, relationship and presentation;
4. assess authority, licence, privacy, freshness and gaps;
5. create a valid OKF 0.2 Markdown bundle with stable identities;
6. add useful, evidenced semantic relationships without inventing facts;
7. inspect and verify the bundle in Explorer;
8. connect a chosen AI through files/links or a bounded retrieval tool;
9. measure retrieval and answer faithfulness on a held-back question set;
10. use AI as a coding collaborator to inspect, modify and create a personal
    interface; and
11. test the resulting learning experience with somebody unfamiliar with the
    subject and publish only what they have the right to share.

## Sam's user stories

| Stage | User story | Acceptance evidence |
| --- | --- | --- |
| Choose | As Sam, I need subject examples and a scope test so that I choose a project small enough to finish. | One-sentence domain, named audience, 5–15 competency questions and explicit exclusions. |
| Plan | As Sam, I need a project record so that I can pause, resume and explain decisions. | Versioned brief, source ledger and decision log. |
| Research | As Sam, I need to compare public and private sources so that I do not confuse easy access with permission or authority. | Each source has owner, URL/path, licence/access, observation time, authority and allowed use. |
| Model | As Sam, I need worked examples of things and relationships so that technical vocabulary connects to my subject. | Entity list, stable IDs, readable labels, relationship questions and rejected weak links. |
| Build | As Sam, I need a small template and exact checks so that syntax does not block learning. | Root index, concept files, sources, log and generated bundle pass the declared profile. |
| Explore | As Sam, I need Reader, Search, Links, Graph, Timeline and Inspect tasks so that I verify what both people and machines receive. | Journey receipt records expected and observed identities, labels, links and limitations. |
| Ground AI | As Sam, I need a simple prompt-and-link route before MCP so that added infrastructure must prove its value. | Frozen evaluation questions compare exact identity, citations, unsupported claims, bytes/tokens, latency and cost. |
| Create UI | As Sam, I need a working program to predict, run, investigate and modify before making my own so that AI-generated code remains understandable. | Personal UI meets researched user stories, uses bounded bundle data and passes accessibility/adverse tests. |
| Share | As Sam, I need a publication checklist so that a successful local demo is not confused with a safe public release. | Frozen candidate, rights check, tests, version, limitations, accessible public journey and correction route. |

## Cross-bundle personas and demonstration stories

These personas demonstrate distinct information-worker needs. They are
starting hypotheses to validate with real users, not claims that one invented
person represents an occupation.

| Pack or lineage | Persona | Demonstration story and limit |
| --- | --- | --- |
| OKF evolution review and AI Infrastructure | Junior knowledge engineer | Trace why an assertion exists from Reader to evidence and compare direct links with MCP. Do not treat a technology overview as operational authorisation. |
| ONS data discovery | Data journalist | Find the exact statistical product and geography for a deadline, distinguish near-neighbours and cite vintage. Metadata discovery does not calculate the statistic. |
| GOV.UK CKAN | Open-data analyst | Search and filter a large catalogue, inspect publisher/licence/resource evidence and identify missing metadata. Catalogue presence does not guarantee a working or suitable dataset. |
| UK Government APIs | Integration architect | Find an API product and observed access/contract evidence, then follow its actual OpenAPI or provider documentation. OKF must not invent methods, schemas or credentials. |
| UK Legislation catalogue | Legal researcher | Identify the correct work, type, jurisdiction and version, then resolve official provisions. The pack supports discovery and provenance, not legal advice. |
| UK Whole-Law federation | Policy researcher | Compare coverage and authority across independently governed legal sources and use declared fallback routes. Federation does not make conflicting sources equivalent. |
| Coventry and Warwickshire Heritage | Heritage officer or teacher | Build a local learning trail from source-backed places and themes while separating faithful, tiny and synthetic fixtures. Synthetic capability evidence is not a historical fact. |
| ELS API discovery | Education data developer | Find education-linked API capabilities and verify the live contract and access model. A hackathon discovery pack is not a production service guarantee. |
| Planning | Planning officer or community researcher | Connect applications, policies, places and authorities using exact identifiers and dates. The bundle does not replace the statutory register or determine an application. |
| GOV.UK content | Content designer or caseworker | Select exact guidance families, distinguish general and situation-specific content and retain canonical links. Retrieved content must not be turned into personalised eligibility advice without evidence. |
| HM Land Registry | Conveyancer or property researcher | Trace a dataset/service to publisher, source, rights and observation evidence using readable labels. The pack is not the title register and cannot prove ownership. |
| A Life in the UK | Citizen adviser or service designer | Navigate life events, services, organisations and evidence while preserving jurisdiction and authority. Editorial journeys do not determine a person's entitlement. |
| API-MCP-Wiki and early LLM-Wiki lineages | Research software developer | Compare direct files, lexical/semantic retrieval and bounded context packs. A successful retrieval benchmark does not prove final answer correctness. |

The root gallery will show only descriptors in the governed current registry.
The complete lineage table will link to the review for historical or
not-currently-registered products. This prevents a historical repository from
being presented as a live, conformant public bundle.

## Learning design

### The repeated learning loop

Every project stage uses the same five-part loop:

1. **Explain** — one plain-language idea, one reason it matters and acronyms
   expanded on first use.
2. **Inspect** — a small worked example in an existing bundle.
3. **Do** — one bounded action in the learner's chosen subject.
4. **Check** — deterministic validation plus a human question.
5. **Retrieve and reflect** — answer a no-notes question and record what will
   change next.

Worked examples appear before partially completed templates; scaffolding then
fades. The learner predicts what a viewer or program will do, runs it,
investigates the result, modifies one thing and finally makes a new component.

### Eight-stage project pathway

1. Choose a subject and define success.
2. Design questions and research users.
3. Find sources and decide rights, privacy and freshness.
4. Model concepts, identities and useful relationships.
5. Author and validate a small OKF bundle.
6. Navigate and verify it in Explorer.
7. Ground an AI and evaluate answers.
8. Build, test and share a personal learning interface.

The learner can open the existing complete guide at any stage, but the main
path should never require reading all 25 chapters before producing a result.

## Information architecture

The root page must answer four questions within its first screen:

- What can I build?
- Can I start without already knowing the terminology?
- What is the next step?
- Where can I see a real example?

Required root sections are:

1. outcome-led hero and two primary actions;
2. eight-stage journey with time and evidence outputs;
3. subject and source chooser, including private-data cautions;
4. current bundle gallery loaded from the governed registry;
5. Sam persona and project user stories;
6. information-worker examples and pack limitations;
7. concise explanation of OKF, linked data, grounding and MCP;
8. accessibility, responsible-AI and publication promises; and
9. routes to the full review, beginner reference, authoring kit and GitHub.

## Technical and performance contract

- Root content must be server-rendered static HTML and remain understandable
  without JavaScript.
- The root must not fetch or parse a bundle. It may use the small governed
  registry compiled into the page.
- Explorer code must be split into the `/explore/` route and loaded only when
  requested.
- Existing root query/fragment links must preserve all state when redirected.
- No external font, analytics, image or runtime dependency is allowed.
- A learner can reach the first project action in one interaction and any
  registered bundle in no more than two.
- Navigation is keyboard-operable, landmarks and heading order are meaningful,
  focus is visible, colour is not the only signal, motion respects reduced
  motion and the page has no serious or critical WCAG 2.2 automated findings.
- Mobile content remains usable at 320 CSS pixels without two-dimensional page
  scrolling; wide evidence tables may have labelled local scrolling.
- The root HTML must include title, description, canonical intent, social
  metadata and JSON-LD `LearningResource`/`WebSite` descriptions without
  claiming external accreditation.

## Explorer compatibility contract

- `/explore/` with no bundle opens the established default exemplar.
- Root URLs with any existing Explorer query or fragment redirect to
  `/explore/` with the exact query and fragment.
- The Explorer header offers a clear return to the learning hub.
- Registry bundle buttons create encoded `/explore/?bundle=...` links.
- The local review link selects `okf-bundle.json` and the review index record.
- Copy route, back/forward, search, filters, Graph, Links, Timeline, Resources,
  Map, Narrative and Inspect continue to use durable Explorer state.

## Acceptance journeys

1. With JavaScript disabled, a learner can understand the offer and open the
   first project-studio HTML page.
2. With JavaScript enabled, the root requests no bundle or search shards.
3. A keyboard-only learner can traverse skip link, primary actions, stages,
   bundle cards and help in a sensible order.
4. A 320-pixel viewport exposes no page-level horizontal overflow.
5. Opening the review selects the exact review index in Reader.
6. Opening ONS from the gallery loads its descriptor and overview, and the
   learner can return to the hub.
7. A legacy root deep link reaches the same bundle, view, query, filters and
   record after redirect.
8. Automated accessibility analysis reports no serious or critical WCAG 2.2
   findings on root and first project page.
9. The full repository bundle, site, semantic, British English, Node, Svelte
   and browser gates pass before merge.
10. After merge, the exact deployed root and at least one Explorer journey pass
    in a real browser before publication is reported complete.

## Out of scope for this release

- user accounts or cloud progress synchronisation;
- automatic ingestion of private data;
- a hosted model, vector database or production MCP service;
- certification, grading or external accreditation;
- writing back to source systems;
- claiming every historical OKF repository is currently deployed; and
- replacing the full beginner documentation, domain standards or professional
  advice.
