---
okf_version: "0.3"
---

# ai-infrastructure-wiki

An **Open Knowledge Format (OKF 0.3)** bundle covering **AI infrastructure** in two complementary threads: the **agent-ready vertical stack** (contracts → discovery → identity → execution → policy → observability/provenance) and the **federated collaborative-learning layer**. It uses standard Markdown concepts and the provenance, trust and lifecycle families, with optional Explorer YAML-LD, federation and presentation extensions.

The upstream 0.3 standard was announced on 18 November 2026. This bundle's OKF+ 0.3 implementation date is 23 November 2026. See the [current and historical standards register](https://github.com/chris-page-gov/okf-explorer/blob/main/docs/okf-standards.md) for the pinned specification and publication evidence.

## Contents
- **[The reviewed sources](document/index.md)** — overview, [themes](document/themes/index.md), [source documents](document/sources/index.md), [evaluation](document/peer-review.md).
- **[Stack layers](stack/index.md)** (9) · **[Standards](standards/index.md)** (21) · **[Federated AI](federated/index.md)** (15)
- **[Frameworks](frameworks/index.md)** (12) · **[Research & benchmarks](research/index.md)** (17)
- **[UK government](uk-government/index.md)** (10) · **[Organisations](organisations/index.md)** (16) · **[Glossary](glossary/index.md)** (25)
- **[Sources index](sources-index.md)** · **[Change log](log.md)**

## Linking conventions

OKF links are plain markdown — unidirectional and untyped. This bundle adopts two conventions the spec leaves open:

1. **Glossary/vocabulary** terms are linked **from the concept that uses them** (a `Terms` section), mirroring wiki practice; each glossary entry also lists where it is used, so the term↔concept relationship is bidirectional in the files.
2. **Direction is meaningful** (a link means *source references target*); consumers build the reverse index (the viewer's "Referenced by"). Relationship *types* (defines, stewards, introduces, adopts…) are inferred by the viewer from section + direction.

## Companion
This is a standalone sibling of `api-mcp-wiki`. Where they share standards (OpenAPI, MCP, A2A, Arazzo, OAuth), each bundle describes them in its own realm's context.
