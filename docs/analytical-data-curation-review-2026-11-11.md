# NDL curation and DEFRA lessons for Analytical Data

The initial candidate and Warwickshire trial used the DfE publishing guidance and an NDL directory record. This supplementary review adds NDL's curation guidance and DEFRA's Data Services Platform documentation. It records source statements, their implications for the trial and local proposals for adoption. The Analytical Data package contract remains at `1.0.0-rc.1`.

## NDL source statements

NDL describes collections as selections made by experienced public-sector data practitioners. Its criteria guide judgement without a precise selection algorithm. The required scope concerns public-sector ownership or production. Collections can include resources with controlled or paid access. Relevance considers a broad audience, with a current national emphasis and local coverage under consideration. Demand draws on service activity, research, feedback and wider interests, including activity on DEFRA's platform. Quality considers currency, accuracy, completeness, authoritative provenance, ownership and suitable maintenance. Page proposals receive human review. The page also points to self-publication through the directory. [How we curate data](https://www.data.gov.uk/data-curation/)

The publisher route requires a publisher account. Its linked technical guidance explains that organisations host their datasets and supporting documents, then register descriptions and resource links in the directory. Collection proposals use a further editorial route. [Publish your data](https://www.data.gov.uk/publishers/) · [Publish and manage datasets](https://guidance.data.gov.uk/publish_and_manage_data/)

## Effect on the Warwickshire trial

| Area | Recorded evidence and local assessment |
| --- | --- |
| Catalogue surface | The tested NDL URL identifies a directory dataset record. Curated collection membership and an editorial acceptance decision remain unverified. |
| Scope | WCC is the recorded publisher and ONS is credited as the source producer. These declarations support the public-sector provenance assessment. |
| Relevance | The trial serves a historical analytical compatibility exercise. A case for a wider collection-browsing audience needs human review. Local coverage and the 2008 period should remain visible. |
| Demand | The trial retains no NDL search, user-research or wider demand evidence. The user's request establishes the purpose of this exercise. |
| Quality | All 333 captured observations survive the documented conversion. Structural integrity and conversion fidelity are evidenced. Statistical accuracy, population completeness, geographic edition and current comparability remain unassessed. |
| Ownership and maintenance | Publisher and producer credit are present. An accountable dataset steward, maintenance decision and review schedule need confirmation for a maintained publication. A deliberately frozen historical dataset can have a documented maintenance decision. |
| Dates | The source period is 2008. The NDL metadata modification is in 2013. Acquisition occurred in November 2026. Each date retains its own meaning. A recent acquisition supplies evidence of the acquired bytes. |
| Access and rights | The WCC route supplies a captured CSV. The NDL S3 route returned 403. The cause of denial and resource equivalence remain unresolved. The differing licence declarations retain their existing `unverified` status. |

The [local curation assessment](analytical-data-curation-assessment-2026-11-11.json) records these qualifications in a proposed review structure. Its field names and review states are local proposals. Collection selection remains an NDL editorial decision. The [NDL captures](../sources/analytical-data-trial-2026-11-11/ndl-curation/source-register.json) preserve three public pages and 91 hyperlink occurrences with parent locators. Other linked pages have explicit acquisition status in that inventory.

## DEFRA source evidence

| Source | Learning retained from the publisher |
| --- | --- |
| Platform and API portal | DSP offers downloads, APIs, spatial services and applications. Some partner or contractor data has third-party access restrictions. Its API portal distinguishes near-real-time feeds and longer-term archives. [Platform](https://environment.data.gov.uk/) · [API portal](https://environment.data.gov.uk/apiportal) |
| Metadata explanation | The documented fields cover exclusions and quality issues, use limitations, licence and attribution, access constraints, lineage, coordinate system, extent, publisher contact, temporal coverage and supporting resources. [Metadata guidance](https://environment.data.gov.uk/support/faqs/275808874/275809095) |
| Dates explanation | The FAQ, last updated in April 2021, distinguishes data creation, revision, publication and update frequency. It warns that dates entered manually can be unreliable and that a catalogue metadata update can occur without a data revision. This is dated publisher guidance. Current service fields still need checking against the relevant contract. [Dates guidance](https://environment.data.gov.uk/support/faqs/275808874/275809488) |
| Fair use | The observed policy is in a trial phase. It gives limits of 200 requests per minute for standard users and automated API services, and 10 for web bots and crawlers, subject to change. Dataset terms take precedence where they differ. Attribution includes identifying modifications. [Fair-use policy](https://environment.data.gov.uk/support/faqs/275808874/1169555459) |
| Water Quality migration | The November 2025 notice documents endpoint and parameter changes, format negotiation through `Accept`, and format-dependent page limits. Observations have a 250-result page limit. A redirect or accessible landing page leaves query and response compatibility to be checked. [Migration notice](https://environment.data.gov.uk/support/faqs/275879249/1156874241) |
| Access strategy | Ecology guidance recommends APIs for selected segments and bulk downloads for large areas or time ranges. The appropriate acquisition route depends on the user's task. [Ecology access guidance](https://environment.data.gov.uk/support/faqs/275874849/275874938) |
| Measurement semantics and service limits | The flood reference describes measure URIs, observation timestamps, units and qualifiers, while distinguishing polling from the frequency of underlying transfers. It states that the open APIs provide no service-level guarantee and cautions against safety-critical reliance. [Flood API reference](https://environment.data.gov.uk/flood-monitoring/doc/reference) |

The [DEFRA capture register](../sources/analytical-data-trial-2026-11-11/defra-learning/source-register.json) distinguishes original HTTP HTML bodies from browser-rendered text and links. It retains acquisition observations, hashes and reference locators. The homepage rendered in Chrome with a React hydration error recorded. This is an observation of the review session. The reviewed articles and visible homepage text were available. The review supplies document and navigation evidence. Live API compatibility, quotas, bulk completeness and spatial transformations retain separate test scope.

## Local proposals for governance and engineering

| Priority | Proposed change | Relationship to the candidate |
| --- | --- | --- |
| First | Attach a human curation review with an intended audience, user need, source-selection rationale, owner, maintenance decision and evidence. Keep directory membership and collection selection as separate recorded facts. | Add an optional review document beside the analytical package. A package pass supports integrity review. Editorial acceptance has its own evidence. |
| First | Distinguish source period, data revision, metadata modification, acquisition time, expected cadence and next review. Record uncertainty and deliberately historical scope. | The current package binds an acquisition observation and data release. A maintained publication needs additional currency evidence. |
| First | Retain source-specific licence, attribution, use limitations, lineage and access conditions with the actual resource. | Extend the adoption review. The WCC/NDL rights discrepancy and denied route retain their open status. |
| Next | Version each access contract and acquisition recipe, including method, format negotiation, filters, paging, bounds and an explicit completion witness. Prefer the documented bulk route when appropriate. | A frozen CSV manifest can bind the resulting bytes. Evidence that an API query retrieved the intended population belongs with its acquisition record. |
| Next | Apply the provider's published request budget, cache policy and failure behaviour to each adapter. Preserve the dated policy reference. | The reference CSV validator is offline. Future network adapters need separate service-specific controls and tests. |
| Next | Review observation timestamps, timezone semantics, units, datum, coordinate system, extent and boundary edition before joining data. | The current types include `date` and `string`. Typed datetime validation and richer spatial contracts would require a reviewed contract revision with fixtures and consumer tests. Preserve original timestamp literals while recording that gap. |
| Next | Check content completeness as well as transport status when acquiring web evidence. Record the representation, required section, source identifier and retrieval date. | A JavaScript shell, a rendered article and a data distribution have different capture evidence. Acquisition receipts should describe which representation was retained. |

These proposals strengthen the adoption and service-contract review around the existing profile. The current Explorer can present the review notes and companion links. Editorial workflows, human approval state, richer currency displays and typed analytical previews would need separately scoped application work. A future change to package validation requires a reviewed candidate revision. The original trial receipts, producer gaps, eight skipped checks and intermittent help-layout observation retain their recorded status. [Trial and verification](analytical-data-trial-2026-11-11.md)
