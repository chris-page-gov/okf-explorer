# SharePoint and Microsoft 365 Copilot trial report

For knowledge workers, this trial demonstrates finding the intended service family from generated Word records in a configured SharePoint scope. It did not test arbitrary OKF JSON uploads. Start with [AI access routes](ai-okf-usage.md) or [a small fictional collection](onboarding/first-bundle.md); the development results and remaining tests below retain their original limits.


This report records aggregate findings from the `C-293` scale-development
trial. Raw Copilot transcripts, tenant identifiers and attempt-level evidence
remain in the ignored private results directory.

The authored-situation cases are development evidence, not an independent
holdout. The trial tests retrieval and governed identity fidelity. It does not
test service advice.

## Initial stopped phase

The initial phase made 150 provider attempts and obtained 142 valid semantic
responses: the 32-case preflight and 110 full-corpus family responses. The
valid full-corpus responses all passed the strict scoring contract. Microsoft
365 then repeatedly returned a response saying that it was temporarily unable
to respond to the volume of requests. The pre-registered operational stop rule
was applied after the permitted retry failed.

This was an operational service-protection stop, not a semantic or safety
failure. It left 183 scheduled family cases unresolved for a later, more
slowly paced continuation.

## Immutable continuation and recovery evidence

The initial run remains immutable. Its frozen schedule and append-only attempt
log were not reopened, rewritten or extended. The continuation is a separate
run built from the exact 183 unresolved original schedule positions: position
141 and positions 144 to 325. Each continuation row retains its original
schedule position, prompt, expected governed identity and the SHA-256 digests
of the parent schedule and parent attempt log. The
[continuation manifest](https://github.com/chris-page-gov/okf-explorer/blob/main/experiments/sharepoint-copilot/full-corpus-continuation-01-manifest.json)
records this binding.

The continuation also has a fresh, digest-bound agent snapshot, a separate
append-only attempt log, an append-only browser-event log and an atomically
replaced checkpoint. It uses one worker, a minimum 30-second interval between
call starts, a fresh chat for each case and at most one transport retry. The
runner stops on agent or permission drift, a serious semantic or safety
failure, evidence inconsistency or three terminal provider failures. Combined
reporting gives an already valid initial response precedence and can report
the 325-case corpus as complete only when every original schedule position has
one valid response.

Every failed recovery rehearsal was moved into a separate ignored archive
before the canonical continuation was started. Those archives are diagnostic
evidence and are never merged into the canonical result:

| Recovery archive | What it established | Provider-call accounting |
| --- | --- | ---: |
| Local runner lifecycle | Six local attempt rows failed in 11 to 18 milliseconds because asynchronous browser work had outlived its execution context. | 0 submissions |
| Send-control diagnostic | One attempt could not observe a response article and the following attempt was interrupted after its start event. Neither obtained submission acknowledgement. | 0 confirmed; 1 indeterminate |
| Composer-payload diagnostic | The first governed prompt completed, but the next two user messages contained only a line-break marker. This exposed a content-editable composer bug and explained the resulting retrieval misses. | 3 submissions |
| Acknowledgement-wrapper diagnostic | The first attempt was blocked before sending because its composer payload digest differed. The retry clicked **Send**, but the resulting user article did not contain the frozen prompt, so it was rejected as a governed attempt. | 1 non-governed submission |
| Digest-label parser diagnostic | A correct governed response used the possessive label `record's unique source digest`; the scorer did not yet recognise that label and conservatively recorded a safe retrieval miss. | 1 submission |

After those fixes, the canonical continuation canary used the exact frozen
prompt, obtained exact user-article acknowledgement and returned the expected
record schema, projection digest, governed-record digest, title, stable ID and
sole record citation. It passed the strict retrieval and safety contract on
its first transport attempt. This established that the paced canonical run
could start.

Through and including the canonical canary, the recovery work therefore made
6 confirmed Microsoft submissions: 3 in the composer diagnostic, 1 rejected
non-governed submission in the acknowledgement diagnostic, 1 parser
diagnostic and 1 canonical canary. The canary is part of the canonical
continuation, so only 5 of those submissions sit outside the canonical attempt
log. The interrupted send-control rehearsal adds one possible but unconfirmed
submission.

## Preserved stop and user-authorised final-11 resume

The continuation stopped under its serious-failure rule after attempting 172
of its 183 scheduled cases. All 172 responses passed the safety boundary, 171
passed the complete strict contract and there were zero transport retries. The
remaining 11 cases were untouched at that checkpoint.

Those aggregate counts include one recorded adjudication of an earlier
response. The automated advice scanner had matched Copilot's verbatim echo of
the frozen situation; removing that exact quotation left no service advice,
while every other gate already passed. The adjudication is digest-bound to the
attempt evidence. It changes the raw automated counts from 170 strict passes
and 171 safe responses to the reported 171 and 172, but it does not change the
near-neighbour collision below.

The exception was a near-neighbour collision. For the authored situation
about a person without work needing to check the current means-tested support
route, the frozen expected family was
`claim-universal-credit-while-unemployed`. Copilot instead selected and cited
`claim-universal-credit`.

This is a genuine retrieval-granularity failure:

- the broader selected record is a real governed corpus record in the correct
  subject area, but it is not the more specific record bound to this test;
- Copilot returned the selected sibling's internally consistent digest, title,
  stable ID and sole citation, so the parser correctly exposed the
  substitution rather than causing it;
- the agent snapshot, projection digest and record schema remained unchanged,
  and the call completed without a transport failure or retry; and
- the response gave no service advice, official-service URL, outside source or
  permission information. It retained the instruction to check the current
  official source, so it passed every safety check.

The scorer's `fabricated_or_substituted_identity` label means that the asserted
identity differed from the frozen expected identity. In this case the evidence
shows substitution of an existing near-neighbour record, not invention of a
non-existent service. The correct product response is therefore to improve
the distinction between overlapping family records, or ask a clarifying
question when both are plausible, rather than to weaken the identity gate.

The failed attempt and its score were preserved. The user then explicitly
authorised the decision `continue final 11`. The resume decision is
digest-bound to the frozen continuation schedule, the 172-row attempt-log
prefix, the 516-row browser-event prefix, the stopped checkpoint and the
failed response. Its scope allowed only continuation positions 173 to 183,
which correspond to original schedule positions 315 to 325. It prohibited a
retry of position 172 or any change to its failure score.

All 11 resumed cases passed the strict retrieval and safety contract on their
first transport attempt. The complete continuation therefore has 183 of 183
valid semantic responses, 182 strict passes, 183 safe responses and zero
transport retries. The wrong-family collision remains present and visible.

## Final result

The combined result has 325 of 325 valid semantic responses and the status
`complete_with_failures`. Here, valid semantic means that a response was
captured and could be deterministically scored; it does not turn the preserved
wrong-family response into a strict pass.

For the `full_293` family test specifically:

| Measure | Result |
| --- | ---: |
| Valid semantic responses | 293 of 293 |
| Safe responses | 293 of 293 |
| Strict passes | 292 of 293 |
| Top-1 family selections correct | 292 of 293 |
| All five identity fields exact | 292 of 293 |
| Correct-record-only citations | 292 of 293 |
| Strict rate among valid responses | 99.6587% |
| Current-official-source warnings | 293 of 293 |
| Safe retrieval misses | 0 |
| Service-advice responses | 0 |
| Outside-configured-source responses | 0 |
| Permission-leakage responses | 0 |

This is complete development evidence for the frozen authored-situation
schedule, not an independent holdout or a claim that every future natural
language formulation will select the right record. The near-neighbour result
supports a targeted follow-up: strengthen distinguishing terms and explicit
boundaries in overlapping family records, require a clarifying question when
both remain plausible, and rerun a held-out collision set without weakening
the exact identity and citation gates.

## Charging model and final counterfactual estimate

Microsoft's published charging model produces two materially different
outcomes:

- for an authenticated employee with a Microsoft 365 Copilot add-on licence,
  employee-facing Agent Builder use and SharePoint grounding have no
  incremental Copilot Credit charge beyond the existing licence, subject to
  Microsoft's fair-use and service-protection limits; and
- under Copilot Studio pay-as-you-go, the applicable published example is 10
  Copilot Credits for tenant-graph grounding and 2 Copilot Credits for the
  generative answer. At $0.01 per credit, this is $0.12 for each completed
  grounded generative response.

During the trial, the authenticated Microsoft 365 interface identified the
account as `M365 Copilot (Premium)`. This supports the licensed-user case and
therefore a likely incremental charge of $0, although the tenant consumption
record remains the billing authority.

On that pay-as-you-go basis:

| Basis | Calculation | Estimated charge |
| --- | ---: | ---: |
| 142 valid responses | 142 × 12 × $0.01 | $17.04 |
| Initial canonical attempt log | 150 × 12 × $0.01 | $18.00 |
| Complete continuation canonical attempt log | 183 × 12 × $0.01 | $21.96 |
| Both canonical attempt logs | 333 × 12 × $0.01 | $39.96 |
| 5 confirmed recovery-archive submissions outside the canonical logs | 5 × 12 × $0.01 | $0.60 |
| All 338 confirmed interactions | 338 × 12 × $0.01 | $40.56 |
| Upper bound including the indeterminate recovery send | 339 × 12 × $0.01 | $40.68 |

The canonical count is 333 provider attempts: 150 in the immutable initial
log and 183 in the continuation's append-only log. It does not absorb
diagnostic recovery calls. The confirmed interaction count is 338 because 5
confirmed archive submissions occurred before the canonical continuation; the
canonical canary itself is already one of the 183 continuation attempts. The
upper bound of 339 includes the one interrupted send that could not be
acknowledged or excluded.

These estimates count every included provider interaction as if it were a
completed grounded answer. The 333 canonical attempts include 8 initial
transport-failure attempts, which may not be billed as completed grounded
answers. The safe but incorrect near-neighbour response was completed and is
counted regardless of its test result. Local-only runner failures are
excluded. Only Microsoft's tenant consumption record can establish the actual
treatment.
Use of a premium reasoning model selected through `Auto` could also add
token-based consumption in a pay-as-you-go configuration.

These figures are incremental-usage estimates, not a statement of the
organisation's contract price, currency conversion, tax treatment or existing
prepaid credit allocation.

## Why the initial stop was service protection, not credit exhaustion

The observed message and timing are consistent with Microsoft service
protection rather than billing exhaustion. The trial used three concurrent
fresh-chat workers and reached approximately 9 to 10 call starts per minute.
Microsoft applies rolling limits across users, environments, models and
downstream services. Local time of day therefore does not show that spare
tenant or model capacity was available.

The interface identified the account as `M365 Copilot (Premium)`, and it did
not show an exhausted-credit or payment failure. Microsoft returned a
temporary volume message after a burst of successful grounded answers, and the
same governed retrieval subsequently passed when restarted with one paced
worker. Those observations distinguish a transient throughput guard from a
finding that the organisation had run out of Copilot Credits. The tenant
consumption report remains the authority for whether any interaction was
billed.

The continuation completed all 183 paced calls without a transport retry. It
paused after call 172 for the separate retrieval-granularity exception and
continued only after the digest-bound user decision described above. Neither
the pause nor the final 11 calls showed volume, authentication, payment,
parsing or safety failure.

## What remains to be tested

This completed development run does not replace the pre-registered independent
holdout. That holdout still needs independently written situations, deliberate
ambiguities, closed-corpus negatives and an inaccessible-record control. The
near-neighbour result should be represented explicitly so that the follow-up
tests whether clearer family boundaries or a clarifying question improve the
result without weakening provenance or citation checks.

The separate OneNote condition has also not been run. It must test whether a
licensed maker can share an agent grounded only in selected OneNote pages with
an eligible Copilot Chat user who does not have the Microsoft 365 Copilot
add-on licence. It must record the user's underlying Microsoft 365 eligibility,
permissions and any metered use; it must not describe this as access without a
Microsoft 365 licence.

Finally, the permission-safety result in this development run is a response
content result, not a cross-user access-control trial. A controlled test with
one inaccessible record is still required before claiming that either the
SharePoint or OneNote route enforces the intended permission boundary.

## Confirming the actual charge

An administrator should confirm the result after Microsoft's reporting delay:

1. In the Microsoft 365 admin centre, open **Copilot**, then **Cost
   Management**, then **Consumption**. Filter by the tester and agent and
   distinguish billed from non-billed credits.
2. As an alternative, use the Power Platform admin centre and open
   **Licensing**, then **Copilot Studio**.
3. Retain an export or screenshot with the trial evidence. If the entries are
   non-billed credits, the incremental run charge was $0. If they are
   pay-as-you-go entries, reconcile the recorded credits rather than relying
   on the estimates above.

## Microsoft sources

- [Copilot Studio requirements, messages and management](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management)
- [Manage usage-based billing and Copilot Credits](https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-manage-copilot-credits)
- [Copilot Studio error-code troubleshooting](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/troubleshooting-error-codes)
- [Plan agent throughput and rate limits](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/plan-agent-throughput-rate-limits)
