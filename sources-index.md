---
type: "Index"
title: "Sources index and bibliography"
description: "Central bibliography and source register for the bundle and its research reviews, with versioned citations and retention records."
tags: [index, sources, bibliography]
generated: { by: human:crpage, at: 2026-07-09T09:44:00Z }
modified: "2026-11-11"
status: stable
---

# Sources index

This is the central bibliography for papers, standards, frameworks and other
sources used in the bundle and its research reviews. Keep source identities
here and link to the separate notes that explain their relevance to OKF+.

The original index recorded a source check on 27 June 2026. Existing compact
entries are retained below; they have not all been reverified for this update.
New or revised entries carry their own check date. Inclusion is not evidence
that a source is current, independently validated or available for reuse.

## Using this bibliography

For each new or revised research entry, record:

- the official title, authors, publication or submission date and publication status;
- a stable identifier, the exact version used, and source-record and PDF URLs;
- the date those links and citation details were checked, the source's rights
  information, and links to our reviews or evaluations; and
- for a retained copy, its local location, original filename, byte size,
  SHA-256 checksum and the date that fingerprint was recorded.

Use the versioned source URLs for retrieval. Keep the cited version when a
newer version appears, and distinguish any later review from the original
one. Missing metadata in older entries remains unrecorded until checked.

Retain exact copies used for reviews or evaluations when needed for
reproducibility. Store local copies in `.local-research/`, which is excluded
from Git and outside the public site's input directories. Record their
locations as text, not public download links. The source's terms govern reuse;
a bibliography entry does not grant permission to redistribute its PDF.
Compare a retained copy with its recorded checksum before reusing it, and do
not silently replace it with a download that has different bytes.


## Standards & specifications

- [Agent2Agent (A2A)](standards/a2a.md) — <https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/>
- [Arazzo](standards/arazzo.md) — <https://spec.openapis.org/arazzo/latest.html>
- [AsyncAPI](standards/asyncapi.md) — <https://www.asyncapi.com/docs/reference/specification/latest>
- [DPoP — RFC 9449](standards/dpop.md) — <https://www.rfc-editor.org/rfc/rfc9449>
- [GraphQL](standards/graphql.md) — <https://spec.graphql.org/October2021/>
- [HTTP Message Signatures — RFC 9421](standards/http-message-signatures.md) — <https://www.rfc-editor.org/rfc/rfc9421>
- [JSON Schema](standards/json-schema.md) — <https://json-schema.org/draft/2020-12>
- [Model Context Protocol (MCP)](standards/mcp.md) — <https://modelcontextprotocol.io/specification/2025-06-18>
- [OAuth 2.0](standards/oauth-2-0.md) — <https://www.rfc-editor.org/rfc/rfc6749>
- [OAuth 2.0 Security BCP — RFC 9700](standards/oauth-2-0-security-bcp.md) — <https://www.rfc-editor.org/rfc/rfc9700>
- [OAuth Token Exchange — RFC 8693](standards/token-exchange.md) — <https://www.rfc-editor.org/rfc/rfc8693>
- [Open Policy Agent (OPA)](standards/opa.md) — <https://www.openpolicyagent.org/docs/latest/>
- [OpenAPI](standards/openapi.md) — <https://spec.openapis.org/oas/latest.html>
- [OpenTelemetry](standards/opentelemetry.md) — <https://opentelemetry.io/docs/concepts/observability-primer/>
- [PKCE — RFC 7636](standards/pkce.md) — <https://www.rfc-editor.org/rfc/rfc7636>
- [SPIFFE / SPIRE](standards/spiffe-spire.md) — <https://spiffe.io/docs/latest/spiffe-about/overview/>
- [Structured Outputs](standards/structured-outputs.md) — <https://platform.openai.com/docs/guides/structured-outputs>
- [W3C PROV](standards/w3c-prov.md) — <https://www.w3.org/TR/prov-overview/>
- [Zero trust architecture (NIST SP 800-207)](standards/zero-trust.md) — <https://csrc.nist.gov/pubs/sp/800/207/final>
- [gRPC / Protocol Buffers](standards/grpc-protobuf.md) — <https://protobuf.dev/overview/>
- [mTLS-bound tokens — RFC 8705](standards/mtls-bound-tokens.md) — <https://www.rfc-editor.org/rfc/rfc8705>

## Frameworks & middleware

- [Context Hub](frameworks/context-hub.md) — <https://github.com/andrewyng/context-hub>
- [AutoGen](frameworks/autogen.md) — <https://microsoft.github.io/autogen/stable/>
- [FATE](frameworks/fate.md) — <https://github.com/FederatedAI/FATE>
- [FedML / TensorOpera](frameworks/fedml.md) — <https://fedml.ai/>
- [Flotilla](frameworks/flotilla.md)
- [Flower](frameworks/flower.md) — <https://flower.ai/>
- [NVIDIA FLARE](frameworks/nvidia-flare.md) — <https://nvflare.readthedocs.io/en/main/>
- [OpenAI Agents SDK & Responses API](frameworks/openai-agents-sdk.md) — <https://openai.com/index/new-tools-for-building-agents/>
- [OpenFL](frameworks/openfl.md) — <https://openfl.readthedocs.io/>
- [PySyft](frameworks/pysyft.md) — <https://github.com/OpenMined/PySyft>
- [Semantic Kernel](frameworks/semantic-kernel.md) — <https://learn.microsoft.com/en-us/semantic-kernel/overview/>
- [Substra](frameworks/substra.md) — <https://docs.substra.org/>
- [TensorFlow Federated](frameworks/tensorflow-federated.md) — <https://www.tensorflow.org/federated>

## Research & benchmarks

The paper entries below cover the 33 distinct papers identified in the
repository's research notes, BEP source registers and reports, and design
reviews. Bibliographic metadata and retrieval links were checked on
**11 November 2026**. This is a citation inventory, not a fresh review of each
paper's claims or the reports that cite them. Standards, product documentation
and live project links retain their separate sections and earlier check limits.

For older unversioned arXiv citations, version 1 is now pinned as a reproducible
retrieval reference unless an entry explains another choice. This does not
establish the version used in an earlier review or claim that the pinned
version is the latest. Sufficient Context retains the explicitly cited v3;
FedAvg and Trusty URIs use v3 to match the titles already cited. The source and
PDF URLs name the same version, and all 25 newly pinned PDF endpoints responded
successfully with a PDF content type. CorpusMap retains its separately checked
v1 entry below.

For each arXiv entry, the source record supplies the complete author list and
licence link; long author lists are abbreviated here with *et al.*. Other
papers retain their publisher or author-hosted rights statements. A source
check does not grant redistribution rights. No external paper PDFs were added
to Git or downloaded into public Site inputs for this update. The two retained
BEP report exports are listed separately in the
[curation inventory](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep-curation-inventory.json)
with their local retention paths and unchanged checksums.

Paper and journal titles retain their official spelling, including American
English forms such as `Visualization`, `Decentralized` and `Artifacts`.

### CorpusMap

Jeong, Soyeong; Jauhar, Sujay Kumar; Hwang, Sung Ju; and Nam, Andrew Joohun
(2026). *Follow the Entities: A Corpus Map for Agentic Search*.
arXiv:2609.37226v1. Preprint submitted on 29 September 2026.

- **Cited version:** `v1`; stable reference: `arxiv:2609.37226v1`.
- **Source record:** [arXiv:2609.37226v1](https://arxiv.org/abs/2609.37226v1).
- **PDF:** [Read version 1](https://arxiv.org/pdf/2609.37226v1).
- **Citation and links checked:** 11 November 2026.
- **Rights information:** use the licence link on the
  [arXiv source record](https://arxiv.org/abs/2609.37226v1). The retained copy is
  local; the public bibliography links to the publisher's copy.
- **Related review:** [Corpus Map implications for OKF+ and Microsoft](https://github.com/chris-page-gov/okf-explorer/blob/main/docs/corpus-map-okf-microsoft-review-2026-10-26.md),
  dated 26 October 2026. Its recommendations remain proposals.

The supplied PDF is retained for reproducibility under its original filename,
`OKF+ like A Corpus Map for Agentic Search - 2609.37226v1.pdf`.
Its local location is
`.local-research/OKF+ like A Corpus Map for Agentic Search - 2609.37226v1.pdf`.
The copy contains **523,503 bytes**. Its SHA-256 checksum, recorded on
11 November 2026, is:

```text
de52222fe3bc1d16ba62d3f193d2986b5a183a60913d5c17829cd01922e16373
```

This fingerprint identifies the retained input file; it is not a claim that a
fresh download has identical bytes.

### Agent and tool-use papers

#### API-Bank

Li, Minghao; Song, Feifan; Yu, Bowen; et al. *API-Bank: A Benchmark for Tool-Augmented
LLMs*.
ArXiv manuscript, version 1, 14 April 2023.

- **Source:** [arXiv:2304.08244v1](https://arxiv.org/abs/2304.08244v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2304.08244v1).
- **Referenced in:** [Repository note](research/api-bank.md).

#### APIGen

Liu, Zuxin; Hoang, Thai; Zhang, Jianguo; et al. *APIGen: Automated Pipeline for
Generating Verifiable and Diverse Function-Calling Datasets*.
ArXiv manuscript, version 1, 26 June 2024.

- **Source:** [arXiv:2406.18518v1](https://arxiv.org/abs/2406.18518v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2406.18518v1).
- **Referenced in:** [Repository note](research/apigen.md).

#### AgentBench

Liu, Xiao; Yu, Hao; Zhang, Hanchen; et al. *AgentBench: Evaluating LLMs as Agents*.
ArXiv manuscript, version 1, 7 August 2023.

- **Source:** [arXiv:2308.03688v1](https://arxiv.org/abs/2308.03688v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2308.03688v1).
- **Referenced in:** [Repository note](research/agentbench.md).

#### Gorilla and APIBench

Patil, Shishir G.; Zhang, Tianjun; Wang, Xin; Gonzalez, Joseph E. *Gorilla: Large
Language Model Connected with Massive APIs*.
ArXiv manuscript, version 1, 24 May 2023.

- **Source:** [arXiv:2305.15334v1](https://arxiv.org/abs/2305.15334v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2305.15334v1).
- **Referenced in:** [Repository note](research/gorilla.md).

#### MRKL

Karpas, Ehud; Abend, Omri; Belinkov, Yonatan; et al. *MRKL Systems: A modular,
neuro-symbolic architecture that combines large language models, external knowledge
sources and discrete reasoning*.
ArXiv manuscript, version 1, 1 May 2022.

- **Source:** [arXiv:2205.00445v1](https://arxiv.org/abs/2205.00445v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2205.00445v1).
- **Referenced in:** [Repository note](research/mrkl.md).

#### ReAct

Yao, Shunyu; Zhao, Jeffrey; Yu, Dian; et al. *ReAct: Synergizing Reasoning and Acting in
Language Models*.
ArXiv manuscript, version 1, 6 October 2022.

- **Source:** [arXiv:2210.03629v1](https://arxiv.org/abs/2210.03629v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2210.03629v1).
- **Referenced in:** [Repository note](research/react.md).

#### ToolACE

Liu, Weiwen; Huang, Xu; Zeng, Xingshan; et al. *ToolACE: Winning the Points of LLM
Function Calling*.
ArXiv manuscript, version 1, 2 September 2024.

- **Source:** [arXiv:2409.00920v1](https://arxiv.org/abs/2409.00920v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2409.00920v1).
- **Referenced in:** [Repository note](research/toolace.md).

#### ToolLLM and ToolBench

Qin, Yujia; Liang, Shihao; Ye, Yining; et al. *ToolLLM: Facilitating Large Language
Models to Master 16000+ Real-world APIs*.
ArXiv manuscript, version 1, 31 July 2023.

- **Source:** [arXiv:2307.16789v1](https://arxiv.org/abs/2307.16789v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2307.16789v1).
- **Referenced in:** [Repository note](research/toolllm-toolbench.md).

#### ToolSandbox

Lu, Jiarui; Holleis, Thomas; Zhang, Yizhe; et al. *ToolSandbox: A Stateful,
Conversational, Interactive Evaluation Benchmark for LLM Tool Use Capabilities*.
ArXiv manuscript, version 1, 8 August 2024.

- **Source:** [arXiv:2408.04682v1](https://arxiv.org/abs/2408.04682v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2408.04682v1).
- **Referenced in:** [Repository note](research/toolsandbox.md).

#### Toolformer

Schick, Timo; Dwivedi-Yu, Jane; Dessì, Roberto; et al. *Toolformer: Language Models Can
Teach Themselves to Use Tools*.
ArXiv manuscript, version 1, 9 February 2023.

- **Source:** [arXiv:2302.04761v1](https://arxiv.org/abs/2302.04761v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2302.04761v1).
- **Referenced in:** [Repository note](research/toolformer.md).

#### τ-bench

Yao, Shunyu; Shinn, Noah; Razavi, Pedram; Narasimhan, Karthik. *τ-bench: A Benchmark for
Tool-Agent-User Interaction in Real-World Domains*.
ArXiv manuscript, version 1, 17 June 2024.

- **Source:** [arXiv:2406.12045v1](https://arxiv.org/abs/2406.12045v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2406.12045v1).
- **Referenced in:** [Repository note](research/tau-bench.md).

### Federated learning papers

#### FedAvg

McMahan, H. Brendan; Moore, Eider; Ramage, Daniel; Hampson, Seth; Arcas, Blaise Agüera
y. *Communication-Efficient Learning of Deep Networks from Decentralized Data*.
ArXiv manuscript, version 3, 28 February 2017.

- **Source:** [arXiv:1602.05629v3](https://arxiv.org/abs/1602.05629v3).
- **PDF:** [Version 3](https://arxiv.org/pdf/1602.05629v3).
- **Referenced in:** [Repository note](research/fedavg.md).
- **Version note:** Version 3 matches the 2017 FedAvg title used by the repository; version 1 has a different title and author list. The original unversioned citation does not establish which bytes were reviewed.

#### Mobile keyboard prediction

Hard, Andrew; Rao, Kanishka; Mathews, Rajiv; et al. *Federated Learning for Mobile
Keyboard Prediction*.
ArXiv manuscript, version 1, 8 November 2018.

- **Source:** [arXiv:1811.03604v1](https://arxiv.org/abs/1811.03604v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/1811.03604v1).
- **Referenced in:** [Repository note](research/google-keyboard-fl.md).

#### Federated learning open problems

Kairouz, Peter; McMahan, H. Brendan; Avent, Brendan; et al. *Advances and Open Problems
in Federated Learning*.
ArXiv manuscript, version 1, 10 December 2019.

- **Source:** [arXiv:1912.04977v1](https://arxiv.org/abs/1912.04977v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/1912.04977v1).
- **Referenced in:** [Repository note](research/kairouz-open-problems.md).

#### Secure aggregation

Bonawitz, Keith; Ivanov, Vladimir; Kreuter, Ben; et al. *Practical Secure Aggregation
for Federated Learning on User-Held Data*.
ArXiv manuscript, version 1, 14 November 2016.

- **Source:** [arXiv:1611.04482v1](https://arxiv.org/abs/1611.04482v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/1611.04482v1).
- **Referenced in:** [Repository note](federated/secure-aggregation.md).

### Retrieval, evidence and search papers

#### REALM

Guu, Kelvin; Lee, Kenton; Tung, Zora; Pasupat, Panupong; Chang, Ming-Wei. *REALM:
Retrieval-Augmented Language Model Pre-Training*.
ArXiv manuscript, version 1, 10 February 2020.

- **Source:** [arXiv:2002.08909v1](https://arxiv.org/abs/2002.08909v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2002.08909v1).
- **Referenced in:** [Repository note](research/realm.md).

#### Trusty URIs

Kuhn, Tobias; Dumontier, Michel. *Trusty URIs: Verifiable, Immutable, and Permanent
Digital Artifacts for Linked Data*.
ArXiv manuscript, version 3, 28 May 2014.

- **Source:** [arXiv:1401.5775v3](https://arxiv.org/abs/1401.5775v3).
- **PDF:** [Version 3](https://arxiv.org/pdf/1401.5775v3).
- **Referenced in:** [BEP source register, S16](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep-research-2026-09-19/SOURCES.md#s16--trusty-uris-verifiable-immutable-and-permanent-digital-artifacts-for-linked-data).
- **Version note:** Version 3 matches the cited Trusty URIs title; version 1 was titled *Hash-URIs for Verifiable, Immutable, and Permanent Digital Artifacts*. The original review did not record a version.

#### Sufficient context

Joren, Hailey; Zhang, Jianyi; Ferng, Chun-Sung; Juan, Da-Cheng; Taly, Ankur; Rashtchian,
Cyrus. *Sufficient Context: A New Lens on Retrieval Augmented Generation Systems*.
ArXiv manuscript, version 3, 23 April 2025.

- **Source:** [arXiv:2411.06037v3](https://arxiv.org/abs/2411.06037v3).
- **PDF:** [Version 3](https://arxiv.org/pdf/2411.06037v3).
- **Referenced in:** [Repository note](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep-research-2026-09-19/SOURCES.md#s19--sufficient-context-a-new-lens-on-retrieval-augmented-generation-systems).
- **Version note:** The BEP source register explicitly identifies version 3, April 2025; this entry preserves that version.

#### Attribution and AIS

Rashkin, Hannah; Nikolaev, Vitaly; Lamm, Matthew; et al. *Measuring Attribution in
Natural Language Generation Models*.
ArXiv manuscript, version 1, 23 December 2021.

- **Source:** [arXiv:2112.12870v1](https://arxiv.org/abs/2112.12870v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2112.12870v1).
- **Referenced in:** [Repository note](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep-research-2026-09-19/SOURCES.md#s20--measuring-attribution-in-natural-language-generation-models).

#### ALCE

Gao, Tianyu; Yen, Howard; Yu, Jiatong; Chen, Danqi. *Enabling Large Language Models to
Generate Text with Citations*.
ArXiv manuscript, version 1, 24 May 2023.

- **Source:** [arXiv:2305.14627v1](https://arxiv.org/abs/2305.14627v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2305.14627v1).
- **Referenced in:** [Repository note](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep-research-2026-09-19/SOURCES.md#s21--enabling-large-language-models-to-generate-text-with-citations).

#### Lost in the Middle

Liu, Nelson F.; Lin, Kevin; Hewitt, John; et al. *Lost in the Middle: How Language
Models Use Long Contexts*.
ArXiv manuscript, version 1, 6 July 2023.

- **Source:** [arXiv:2307.03172v1](https://arxiv.org/abs/2307.03172v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2307.03172v1).
- **Referenced in:** [Repository note](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep-research-2026-09-19/SOURCES.md#s25--lost-in-the-middle-how-language-models-use-long-contexts).

#### RECOMP

Xu, Fangyuan; Shi, Weijia; Choi, Eunsol. *RECOMP: Improving Retrieval-Augmented LMs with
Compression and Selective Augmentation*.
ArXiv manuscript, version 1, 6 October 2023.

- **Source:** [arXiv:2310.04408v1](https://arxiv.org/abs/2310.04408v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2310.04408v1).
- **Referenced in:** [Repository note](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep-research-2026-09-19/SOURCES.md#s26--recomp-improving-retrieval-augmented-lms-with-compression-and-selective-augmentation).

#### MAIN-RAG

Chang, Chia-Yuan; Jiang, Zhimeng; Rakesh, Vineeth; et al. *MAIN-RAG: Multi-Agent
Filtering Retrieval-Augmented Generation*.
ArXiv manuscript, version 1, 31 December 2024.

- **Source:** [arXiv:2501.00332v1](https://arxiv.org/abs/2501.00332v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2501.00332v1).
- **Referenced in:** [Repository note](https://github.com/chris-page-gov/okf-explorer/blob/main/docs/search-filtering-design.md).
- **Version note:** The record gives 31 December 2024 as the submission date despite the January 2025 identifier. Tracking parameters from the earlier citation are omitted.

#### Faceted scholarly search

Heidari, Golsa; Ramadan, Ahmad; Stocker, Markus; Auer, Sören. *Demonstration of Faceted
Search on Scholarly Knowledge Graphs*.
ArXiv manuscript, version 1, 5 July 2021.

- **Source:** [arXiv:2107.05738v1](https://arxiv.org/abs/2107.05738v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2107.05738v1).
- **Referenced in:** [Repository note](https://github.com/chris-page-gov/okf-explorer/blob/main/docs/search-filtering-design.md).

#### Agent-as-a-Graph

Nizar, Faheem; Lumer, Elias; Gulati, Anmol; Basavaraju, Pradeep Honaganahalli; Subbiah,
Vamse Kumar. *Agent-as-a-Graph: Knowledge Graph-Based Tool and Agent Retrieval for LLM
Multi-Agent Systems*.
ArXiv manuscript, version 1, 22 November 2025.

- **Source:** [arXiv:2511.18194v1](https://arxiv.org/abs/2511.18194v1).
- **PDF:** [Version 1](https://arxiv.org/pdf/2511.18194v1).
- **Referenced in:** [Repository note](https://github.com/chris-page-gov/okf-explorer/blob/main/docs/search-filtering-design.md).

### Workflow and assurance papers

#### Workflow consistency and correctness

Stonebraker, Michael; Zhou, Xinjing; Kraft, Peter; and Li, Qian.
*Consistency and Correctness in Data-Oriented Workflow Systems*.
CIDR 2026 conference paper, 18 to 21 January 2026.

- **Source:** [CIDR 2026 accepted papers](https://www.cidrdb.org/cidr2026/papers.html).
- **PDF:** [CIDR 2026 paper p9](https://www.vldb.org/cidrdb/papers/2026/p9-stonebraker.pdf).
- **Referenced in:** [BEP source register, S12](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep-research-2026-09-19/SOURCES.md).
- **Edition and metadata note:** no numbered revision is supplied. The author
  list above follows the PDF; the conference list omits Zhou. The PDF includes
  a 2025 copyright date and placeholder DOI, so neither is treated as a
  verified DOI or the conference year.

#### OLTP communication bottlenecks

Zhou, Xinjing; Leis, Viktor; Yu, Xiangyao; and Stonebraker, Michael.
*OLTP Through the Looking Glass 16 Years Later: Communication is the New Bottleneck*.
CIDR 2025 conference paper, 19 to 22 January 2025.

- **Source:** [CIDR 2025 programme](https://www.cidrdb.org/cidr2025/program.html).
- **PDF:** [CIDR 2025 paper p17](https://vldb.org/cidrdb/papers/2025/p17-zhou.pdf).
- **Referenced in:** [BEP source register, S13](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep-research-2026-09-19/SOURCES.md).
- **Edition and rights:** conference edition; no numbered revision supplied.
  The PDF states CC BY 4.0 with attribution to the authors and CIDR 2025.

#### Proof-carrying code

Necula, George C. (1997). *Proof-carrying code*. POPL '97, pages 106–119.

- **Source:** [DOI:10.1145/263699.263712](https://doi.org/10.1145/263699.263712).
- **PDF:** no accessible PDF verified. The [author's publication list](https://people.eecs.berkeley.edu/~necula/papers.html)
  links the POPL 1997 paper in PostScript; the publisher page was access-restricted
  during direct retrieval. Do not substitute the separate 1996 technical report.
- **Referenced in:** [Reconstructed BEP report, S37](https://github.com/chris-page-gov/okf-explorer/blob/main/research/bep_research_A_RECONSTRUCTED_2026-09-19/REPORT.md).
- **Edition and check:** 1997 proceedings edition; no numbered revision supplied.
  The DOI-only seed was identified using the publisher's citation record and
  the author's publication list. This does not recheck the report's claims.

### Graph and ontology papers

These four papers are referenced in the
[ontology and semantic graph architecture review](https://github.com/chris-page-gov/okf-explorer/blob/main/docs/ontology-and-semantic-graph-architecture-2026-07-24.md).
Journal editions and author-hosted copies do not expose numbered revisions;
their dates and venues identify the editions below, without asserting that
the hosted PDF bytes are immutable.

#### Semantic substrates

Shneiderman, Ben; and Aris, Aleks (2006).
*Network Visualization by Semantic Substrates*.
IEEE Transactions on Visualization and Computer Graphics, 12(5), pages 733–740.

- **Source:** [DOI:10.1109/TVCG.2006.166](https://doi.org/10.1109/TVCG.2006.166).
- **PDF:** [Author-hosted 2006 journal copy](https://www.cs.umd.edu/~ben/papers/Shneiderman2006Network.pdf).
- **Check:** title and authors checked in the PDF; DOI and publication details
  checked against publisher-registered Crossref metadata.

#### Search, context and expansion

van Ham, Frank; and Perer, Adam (2009).
*“Search, Show Context, Expand on Demand”: Supporting Large Graph Exploration with Degree-of-Interest*.
IEEE Transactions on Visualization and Computer Graphics, 15(6), pages 953–960.

- **Source:** [DOI:10.1109/TVCG.2009.108](https://doi.org/10.1109/TVCG.2009.108).
- **PDF:** [Author-hosted 2009 journal copy](https://perer.org/papers/adamPerer-DOIGraphs-InfoVis2009.pdf).
- **Check:** title and authors checked in the PDF; DOI and publication details
  checked against publisher-registered Crossref metadata.

#### Ontology visualisation survey

Katifori, Akrivi; Halatsis, Constantin; Lepouras, George; Vassilakis, Costas;
and Giannopoulou, Eugenia (2007). *Ontology visualization methods—a survey*.
ACM Computing Surveys, 39(4), article 10, 2 November 2007.

- **Source:** [DOI:10.1145/1287620.1287621](https://doi.org/10.1145/1287620.1287621)
  and [author laboratory record](https://soda.dit.uop.gr/?q=node%2F200).
- **PDF:** [Author-hosted manuscript](https://soda.dit.uop.gr/sites/soda.dit.uop.gr/files//onto-vis-survey-final.pdf).
- **Access note:** the old `users.uop.gr` PDF URL returned 404. The replacement
  is linked from the authors' laboratory record and returned PDF content.
  No numbered revision is stated; the publisher page was access-restricted.

#### Hierarchical system structures

Sugiyama, Kozo; Tagawa, Shojiro; and Toda, Mitsuhiko (1981).
*Methods for Visual Understanding of Hierarchical System Structures*.
IEEE Transactions on Systems, Man, and Cybernetics, 11(2), pages 109–125.

- **Source:** [DOI:10.1109/TSMC.1981.4308636](https://doi.org/10.1109/TSMC.1981.4308636).
- **PDF:** no accessible PDF verified; use the publisher's access options.
- **Edition and check:** 1981 journal edition; no numbered revision supplied.
  Citation identity was checked against publisher-registered Crossref metadata;
  the publisher's full text was not retrieved.

### Research projects and live benchmarks

These existing references identify a project or changing leaderboard, rather
than a specific paper. No paper version or PDF is inferred from them.

- [Berkeley Function Calling Leaderboard (BFCL)](research/bfcl.md) — [Project source](https://gorilla.cs.berkeley.edu/leaderboard.html).
- [MELLODDY (2019–2022)](research/melloddy.md) — [Project source](https://www.melloddy.eu/).

## Federated AI

- [Cross-device vs cross-silo](federated/cross-device-vs-cross-silo.md)
- [Differential privacy](federated/differential-privacy.md)
- [Federated / confidential RAG](federated/federated-rag.md)
- [Federated analytics](federated/federated-analytics.md)
- [Federated evaluation](federated/federated-evaluation.md)
- [Federated learning](federated/federated-learning.md) — <https://arxiv.org/abs/1602.05629>
- [Federated unlearning](federated/federated-unlearning.md)
- [Homomorphic encryption & MPC](federated/homomorphic-encryption-mpc.md)
- [Hub-and-spoke vs hierarchical coordination](federated/hub-and-spoke-vs-hierarchical.md)
- [Membership inference & gradient leakage](federated/membership-inference.md)
- [Model poisoning & backdoors](federated/model-poisoning-backdoors.md)
- [Multi-dimensional evaluation rubric](federated/evaluation-rubric.md)
- [Non-IID data](federated/non-iid-data.md)
- [Secure aggregation](federated/secure-aggregation.md) — <https://arxiv.org/abs/1611.04482>
- [Trusted execution environments (TEEs)](federated/trusted-execution-environments.md) — <https://confidentialcomputing.io/>

## UK government

- [AI Management Essentials](uk-government/ai-management-essentials.md) — <https://www.gov.uk/government/consultations/ai-management-essentials-tool>
- [Algorithmic Transparency Recording Standard (ATRS)](uk-government/atrs.md) — <https://www.gov.uk/government/collections/algorithmic-transparency-recording-standard-hub>
- [Blueprint for modern digital government](uk-government/blueprint-modern-digital-government.md) — <https://www.gov.uk/government/publications/a-blueprint-for-modern-digital-government>
- [Data Ethics Framework](uk-government/data-ethics-framework.md) — <https://www.gov.uk/government/publications/data-ethics-framework>
- [Data Protection Impact Assessment (DPIA)](uk-government/dpia.md) — <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/>
- [GDS API technical and data standards](uk-government/gds-api-standards.md) — <https://www.gov.uk/guidance/gds-api-technical-and-data-standards>
- [GOV.UK API Catalogue](uk-government/uk-api-catalogue.md) — <https://www.api.gov.uk/>
- [ICO guidance on AI and data protection](uk-government/ico-ai-guidance.md) — <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/guidance-on-ai-and-data-protection/>
- [NCSC Guidelines for secure AI system development](uk-government/ncsc-secure-ai.md) — <https://www.ncsc.gov.uk/collection/guidelines-secure-ai-system-development>
- [State of digital government review](uk-government/state-of-digital-government.md) — <https://www.gov.uk/government/publications/state-of-digital-government-review>

## Organisations

- [AI Security Institute (AISI)](organisations/aisi.md) — <https://www.aisi.gov.uk/>
- [Anthropic](organisations/anthropic.md) — <https://www.anthropic.com/>
- [CNCF](organisations/cncf.md) — <https://www.cncf.io/>
- [DSIT](organisations/dsit.md) — <https://www.gov.uk/government/organisations/department-for-science-innovation-and-technology>
- [Flower Labs](organisations/flower-labs.md) — <https://flower.ai/>
- [Google](organisations/google.md) — <https://ai.google/>
- [Government Digital Service (GDS)](organisations/gds.md) — <https://www.gov.uk/government/organisations/government-digital-service>
- [ICO](organisations/ico.md) — <https://ico.org.uk/>
- [IETF / RFC Editor](organisations/ietf.md) — <https://www.rfc-editor.org/>
- [Linux Foundation](organisations/linux-foundation.md) — <https://www.linuxfoundation.org/>
- [NCSC](organisations/ncsc.md) — <https://www.ncsc.gov.uk/>
- [NVIDIA](organisations/nvidia.md) — <https://www.nvidia.com/>
- [OpenAI](organisations/openai.md) — <https://openai.com/>
- [OpenAPI Initiative](organisations/openapi-initiative.md) — <https://www.openapis.org/about>
- [OpenMined](organisations/openmined.md) — <https://openmined.org/>
- [W3C](organisations/w3c.md) — <https://www.w3.org/>
