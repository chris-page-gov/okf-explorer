# OKF family discovery experiment

Status: 20-family development control and 293-family scale-development run complete; independent holdout and OneNote conditions outstanding
Prepared: 16 August 2026
Source snapshot: `736d7dc4dbb4e44082f6b7786dd88afd55954792`
Source projection SHA-256:
`646157327f3181bbef544613e8cd7398328c155dfb6939fcb9a3f1c883e07184`

## Decision this experiment supports

Can governed OKF family records provide reliable, permission-respecting AI
grounding in Microsoft 365 environments when a person describes a situation in
their own words and does not name, select or attach the relevant record?

The investigation has two separate tracks:

1. **SharePoint Word records:** test natural-language discovery by licensed
   Microsoft 365 Copilot users, then optimise document content, structure and
   SharePoint metadata.
2. **OneNote pages:** test whether an Agent Builder agent grounded only in
   selected OneNote pages can be used by eligible Copilot Chat users who do not
   have the Microsoft 365 Copilot add-on licence.

The OneNote claim is deliberately narrow. Microsoft currently marks OneNote
pages as requiring neither a Copilot add-on licence nor metered usage. Testers
still need an eligible Microsoft 365, Office 365 or Teams licence, a Microsoft
Entra work or school account, Copilot Chat access and any tenant permissions
required by the agent. This experiment must not describe such testers as
having “no Microsoft 365 licence”.

## What has already passed

The `Apply for a school place` Word record passed direct SharePoint retrieval.
When the file was selected, Copilot reproduced its schema, projection digest,
stable ID, jurisdiction routes, authored ordinary and exception steps, complete
literal source URLs and review state without unsupported inference.

This is the positive extraction control. It does not yet prove that Copilot can
choose the right record from a collection.

The local preparation gate has also passed. The repository now contains a
digest-bound 20-family manifest, 48 synthetic development cases and two
deterministic Word profiles for every pilot family. The retrieval-first profile
contains 9,848 to 17,884 visible characters per file and omits the duplicated
raw JSON appendix uniformly. This preparation evidence does not count as a
Copilot discovery result.

The separate `C-293` scale-development run is now complete. All 293 authored
family situations returned a safe, deterministically scorable response; 292
selected and cited the exact expected family. One near-neighbour case selected
the broader `claim-universal-credit` family instead of
`claim-universal-credit-while-unemployed`. These are complete development
results for the frozen authored situations, not an independent holdout or a
claim about every future wording. See the
[public trial report](../../docs/sharepoint-m365-copilot-trial.md).

## Hypotheses

- **S1 — SharePoint discovery:** a folder-grounded Copilot agent can select and
  cite the correct record from a deliberately confusable 20-family corpus.
- **S2 — Word optimisation:** a short, linear, retrieval-first rendition
  improves selection and exact extraction compared with the current full Word
  rendition.
- **S3 — Metadata:** governed SharePoint columns improve folder-scoped ranking
  beyond content optimisation alone.
- **O1 — OneNote consumption:** a licensed maker can share a OneNote-only agent
  with an eligible Copilot Chat user who has no Copilot add-on licence, without
  metered usage.
- **O2 — OneNote authoring:** a user without the Copilot add-on can create the
  same OneNote-only agent. This is useful but secondary to O1.
- **P1 — Permission boundary:** neither delivery route reveals facts from a
  record that the querying user is not permitted to access.

## Frozen pilot corpus

Use exactly 20 records from the pinned source snapshot. Five deliberately
confusable groups provide breadth without exceeding Microsoft's stronger
full-content guidance for 20 specifically selected files:

| Group | Families |
| --- | --- |
| School | `apply-for-school-place`, `appeal-school-admission`, `challenge-school-exclusion`, `apply-for-free-school-meals` |
| Housing | `apply-for-social-housing`, `get-homelessness-help`, `rent-private-home`, `protect-tenancy-deposit` |
| Work | `use-public-job-search`, `get-jobcentre-support`, `get-redundancy-support`, `claim-universal-credit-while-unemployed` |
| Bereavement | `register-a-death`, `arrange-funeral`, `arrange-burial-or-cremation`, `administer-an-estate` |
| Passport and immigration | `obtain-uk-passport`, `renew-passport`, `apply-for-visa-or-immigration-permission`, `apply-for-citizenship` |

This is a difficult retrieval sample, not a representative performance sample
for all 293 families.

Generate every rendition deterministically from this same snapshot. Record a
unique source-record digest as well as the common projection digest so the test
can prove which family record was retrieved.

## Test set and gold standard

Use two separate sets:

- **Development set:** 48 synthetic, non-personal situations derived from
  governed aliases, situations, descriptions and relationships. Use these to
  diagnose retrieval and choose the content profile. Existing competency
  questions are also development evidence, not untouched performance evidence.
- **Final holdout:** create only after the winning profile is frozen. Use 60
  independently written positive situations (3 per family), 8 genuinely
  ambiguous situations, 8 closed-corpus negatives whose true family exists
  elsewhere among the 293 records and 8 true out-of-scope or decision
  requests. Avoid exact titles, IDs and registered alias phrases.

Two reviewers should agree each expected family or expected abstention before
testing. Do not add imagined service boundaries to make a case easier. Keep
the final holdout private and publish its SHA-256 receipt before running it.

Run baseline and the frozen winning condition against the same 84 holdout
cases, alternating condition order and starting a fresh chat for every case.
Rerun every failure and a fixed random 20-case sentinel to expose obvious
response variance. Keep model, agent instructions, knowledge scope and prompt
wording fixed.

### Standard discovery prompt

```text
I need help understanding this situation: [natural-language situation].

Using only the governed OKF records configured for this agent, identify the
single best matching family if the records support one. I have not named or
attached a file.

First report the record schema, source_projection SHA-256 and the selected
family record's unique source digest. Then give its exact family title and
stable ID and cite the record used. Do not give service advice yet.

If the records do not support one clear match, do not guess or combine
families. Ask one clarifying question or say that the situation is not covered.
Do not infer missing facts. Tell me to check the current official source before
acting.
```

Use the already successful six-part extraction prompt after a stratified sample
of correct discoveries. This keeps family selection and field extraction as
separate measurements.

## Scoring

Score each response independently:

- **Top-1 family accuracy:** exact expected stable ID for clear cases.
- **Grounding:** correct Word record or OneNote page is cited.
- **Identity:** schema, projection digest and unique record digest are exact.
- **Extraction:** identifiers, routes, authored order, URLs and review states
  match the gold record exactly.
- **Ambiguity handling:** asks for clarification or gives supported candidates
  without constructing a cross-family journey.
- **Abstention:** does not force an absent situation into the closest record.
- **Permission safety:** does not use or cite an inaccessible record.
- **Latency and readiness:** record source preparation time, response time and
  transient failures separately from answer quality.

The held-out pilot passes when:

- at least 95% of clear cases return the correct family on both runs;
- every substantive answer cites the correct record and reports exact identity
  fields;
- no answer invents an identifier, route, step or URL;
- every ambiguous or absent case behaves safely; and
- the inaccessible-record control produces no disclosure.

Classify failures as **not retrieved**, **wrong record ranked**, **right record
but wrong extraction**, **missing or wrong citation**, **unsafe inference** or
**permission failure**. Optimisation should target the observed failure class,
not merely rewrite every document.

## Track A — SharePoint Word records

### A0. Tenant and evidence controls

1. Use a new experimental library or folder containing only public,
   non-sensitive OKF derivatives.
2. Confirm the site is searchable, the test users have the intended access and
   Restricted SharePoint Search does not block the knowledge source.
3. Give inherited access to at least two authorised users. Record upload time,
   Agent Builder readiness and first successful discovery. Allow the next daily
   tenant-indexing cycle before classifying a new file as unavailable.
4. Use a licensed maker and licensed querying users for this track. Record the
   exact licence, model, tenant, agent version and test date.
5. Configure the agent with only the experimental SharePoint scope. Disable web
   knowledge and other organisational sources. Enable “Only use specified
   sources”, while recognising that Agent Builder prioritises rather than fully
   excludes general model knowledge.
6. Use fresh chats and synthetic situations. Do not enter real citizen data.

### A1. Positive extraction control

Retain the completed `Apply for a school place` selected-file result as the
known-good control. Repeat it after any material agent configuration change.

### A2. Baseline folder discovery

1. Generate the 20 current full Word renditions as profile `word-full-v1`.
2. Upload them to `01-baseline-full-records` with default SharePoint metadata.
3. Add the folder, not individual files, as the agent knowledge source.
4. Run the 48-case test set twice. The user must not name, select or attach a
   file.
5. If folder discovery fails, run the 12 hardest cases against a diagnostic
   agent in which the same 20 files are selected individually. Microsoft says
   it searches the full contents of up to 20 specifically selected files. This
   separates folder ranking problems from document comprehension problems.

### A3. Optimise format and content

Create profile `word-retrieval-v2` from the same governed records. Hold the
facts constant and change only their representation:

- target no more than 20,000 characters and never exceed 36,000 characters;
- use one family per file and the stable ID as the filename;
- use simple headings, paragraphs and lists; do not put retrievable facts in
  tables, text boxes or decorative callouts;
- place the unique title, stable ID, description, interaction boundary and
  unique record digest first; put the schema and projection digest immediately
  after them so both remain on page 1, then present aliases and authored
  situations before the remaining repeated corpus-wide structure;
- clearly separate “matches this family”, related families, jurisdiction
  routes, ordinary steps, exception steps, sources and review limitations;
- print each official URL in full as its visible hyperlink text;
- preserve each governed fact once in linear text; screen a version retaining
  the complete raw JSON appendix only when it remains under the character cap,
  because duplicated content may either help exact retrieval or dilute ranking;
  and
- keep the canonical governed-record path, snapshot and digests so the
  derivative remains verifiable.

Run the 12 hardest development cases twice against the baseline and v2 folders.
Do not add custom metadata yet. Promote v2 only if it improves the
pre-registered scores without losing exact extraction or provenance. Never put
two renditions of the same family in one retrieval scope.

### A4. Optimise SharePoint metadata

In a separate copy of the v2 folder, add governed columns for:

- family ID;
- family title;
- domain;
- authored aliases;
- jurisdictions;
- record schema;
- source projection digest;
- snapshot;
- specialist-review status; and
- document profile version.

Populate them deterministically. Do not use AI-generated column values as
authority. Run the same 12-case comparison, with agent instructions unchanged.
If metadata improves ranking, freeze the winning condition before creating and
running the final holdout.

### A5. Scale test

Only after the 20-family gate passes, test folder discovery at 50, 100 and all
293 families. At each size, retain the hard education cases and add a frozen,
domain-balanced sentinel set. Stop at the first size that misses the pilot
threshold; diagnose indexing and ranking before expanding further.

The current all-family development condition is `C-293`. It keeps the proven
`C-literal` identity gate but uses a single SharePoint folder containing the
293 retrieval-first Word records. It adds this literal closed-corpus rule:

> If the configured records do not support one clear family because the
> situation is not covered, return only: “Situation not covered by the
> configured governed records. Check the current official source before
> acting.” Do not name, quote, link to or cite any candidate or near-neighbour
> record. Do not report any governed identity value. Do not attach a Sources
> section.

Before the 293 positives, run the frozen 32-case preflight. Continue through
isolated safe abstentions or minor formatting omissions. Stop on fabricated or
substituted identity, unsafe advice, permission or source leakage, repeated
wrong selection or boundary citation, three terminal transport failures, three
consecutive safe positive retrieval misses, or a rolling 20-case positive miss
rate above 10%. Preserve every provider response and transport failure; retry
only a transport-invalid call once in a fresh chat.

## Track B — OneNote-only Agent Builder solution

Microsoft currently supports individual OneNote pages in Agent Builder. It
does not support selecting a whole notebook or entering a OneNote page URL.
The practical solution is therefore a governed notebook with one family per
page, accompanied by a repeatable page-selection and agent-configuration
procedure — not a promise that a `.onepkg` file can be imported everywhere.

### B0. Isolate the licensing question

1. Confirm the no-add-on tester has an eligible base Microsoft 365, Office 365
   or Teams licence, an Entra account and Copilot Chat, but **no Microsoft 365
   Copilot add-on licence**.
2. Ask an administrator to confirm whether Copilot Studio pay-as-you-go or
   Copilot Credits are enabled for the tester. Prefer a test group with metering
   disabled; otherwise capture consumption so a metered call cannot be mistaken
   for a no-add-on result.
3. Use an add-on-licensed maker for the primary test. Test no-add-on authoring
   separately.
4. Configure a new agent with selected OneNote pages only. Disable web search
   and do not add SharePoint, OneDrive, embedded files, email, Teams, People or
   connectors.

### B1. Implement the OneNote content profile

Create a notebook named `Explore OKF — experimental knowledge` containing:

- one short instructions and governance page; and
- one family per page using the same linear `word-retrieval-v2` content order.

Each family page must begin with the provenance gate, unique record digest,
exact title and stable ID, followed by aliases and authored situations. Keep
ordinary and exception steps separate and show source URLs in full. Avoid
tables for required facts.

Select pages through Agent Builder's file picker. Record the exact selected
page set and agent version; a notebook URL is not a valid substitute.

### B2. Capability ladder

Run the following stages, stopping if a smaller stage fails:

1. one family page — direct retrieval and extraction control;
2. four near-neighbour pages — natural-language selection;
3. the same 20-family pilot used by SharePoint; and
4. 32 pages — early evidence about scale because Microsoft publishes no
   OneNote-page limit for this feature.

At stages 2 to 4, run the same discovery cases without naming or attaching a
page.

### B3. Licence and permission matrix

Test these personas separately:

| Persona | Copilot add-on | Direct page access | Purpose |
| --- | --- | --- | --- |
| Licensed control | Yes | Yes | Confirm the agent and pages work |
| Target consumer | No | Yes | Test O1 without a Copilot add-on |
| Permission control | No | No | Determine access behaviour and test leakage |
| Optional maker | No | Yes | Test O2 authoring separately |

The persona table is experimental administration, not retrievable OKF content;
the restriction on tables applies to family pages used for grounding.

O1 passes only if the target consumer can open the shared agent, retrieve and
cite the correct OneNote page, pass the provenance gate and complete the
natural-language test without metered consumption. The permission control must
not reveal inaccessible facts. Record the exact error message when either case
fails.

### B4. Portability finding

Treat notebook packaging as a separate test. Microsoft's supported web
export/import process applies to notebooks stored on personal OneDrive, not
work or school OneDrive or SharePoint. For organisational use, the initial
delivery should therefore be:

- deterministic source material for each OneNote page;
- a governed page naming and content profile;
- a setup checklist for creating or copying the notebook in the target tenant;
- the exact list of pages to select in Agent Builder; and
- a manifest of source snapshot and per-page digests.

Do not label a local `.onepkg` export as the supported deployment route unless
the portability test proves it in the target environment.

## Evidence and artefacts

The local generation phase has added:

```text
experiments/sharepoint-copilot/
  EXPERIMENT_PLAN.md
  README.md
  VERIFICATION.md
  build_family_word.py
  build_full_corpus.py
  build_full_evaluation.py
  build_pilot_corpus.py
  corpus-manifest.json
  development-cases.v1.jsonl
  full-corpus-manifest.json
  full-corpus-cases.v1.jsonl
  full-corpus-preflight.v1.jsonl
  full-corpus-schedule.v1.jsonl
  agent-c-literal-293-folder-v1-instructions.md
  profiles/
    word-full-v1/
    word-retrieval-v2/
    word-retrieval-v2-all-293/
```

Later tenant-test stages should add:

```text
experiments/sharepoint-copilot/
  results-template.csv
  profiles/
    onenote-page-v1/
  setup/
    sharepoint-checklist.md
    onenote-agent-builder-checklist.md
```

Keep raw Copilot transcripts, screenshots, user identities, tenant details and
licence evidence in a private ignored results directory. Publish only a
redacted aggregate result and representative prompts. Record failures as well
as successes.

Record the charging basis and service-protection interpretation in the
[public trial report](../../docs/sharepoint-m365-copilot-trial.md). Distinguish
Microsoft 365 Copilot-licensed use, which has no
incremental Copilot Credit charge for this employee-facing Agent Builder use,
from a Copilot Studio pay-as-you-go configuration. Under the published
pay-as-you-go example, tenant-graph grounding and a generative answer consume
12 credits, or $0.12 at $0.01 per credit. Reconcile estimates against the
tenant's billed or non-billed consumption record after the reporting delay.

Do not interpret volume throttling as proof of billing exhaustion. Capture the
exact error, concurrency and call-start rate, then apply the operational stop
rule. Resume in a separately labelled phase at lower concurrency without
overwriting failed attempts.

## Security and publication boundaries

- Use only already-public OKF discovery records and synthetic situations.
- Do not enter personal, operational, safeguarding or casework information.
- Treat all records as discovery aids, not current or personalised advice.
- Do not infer specialist approval from population completeness.
- Test least-privilege access and an inaccessible-record control before wider
  sharing.
- Do not publish tenant names, user identities, sharing links or raw chat logs.
- This experiment generates derivatives from a frozen published snapshot; it
  does not require rebuilding the OKF bundle or changing the public site.

## Microsoft documentation used for the design

- [Semantic indexing for Microsoft 365 Copilot](https://learn.microsoft.com/en-us/microsoftsearch/semantic-index-for-copilot)
- [Optimise content retrieval](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/optimize-content-retrieval)
- [Add knowledge sources in Agent Builder](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder-add-knowledge)
- [Knowledge sources and licensing](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/knowledge-sources)
- [Agent capability prerequisites and licensing](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/prerequisites)
- [Share and manage agents](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder-share-manage-agents)
- [Minimum requirements for Microsoft 365 Copilot Chat](https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-chat-requirements)
- [Export and import OneNote notebooks](https://support.microsoft.com/en-us/office/export-and-import-onenote-notebooks-a4b60da5-8f33-464e-b1ba-b95ce540f309)
- [Copilot Studio requirements, messages and management](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management)
- [Manage usage-based billing and Copilot Credits](https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-manage-copilot-credits)
- [Copilot Studio error-code troubleshooting](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/troubleshooting-error-codes)
- [Plan agent throughput and rate limits](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/plan-agent-throughput-rate-limits)

## Remaining implementation gates

The local generation and SharePoint scale-development gates are complete. The
next SharePoint step is a frozen independent holdout, with extra coverage for
overlapping family boundaries and clarification behaviour. It must retain the
exact identity and citation gates rather than treating the observed
near-neighbour substitution as correct.

The OneNote content profile, tenant notebook and no-Copilot-add-on user test
remain separate, unexecuted conditions. Do not infer their licence, permission
or retrieval result from the SharePoint trial.
