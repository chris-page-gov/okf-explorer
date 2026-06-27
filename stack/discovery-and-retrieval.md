---
type: "Stack layer"
title: "Discovery and current-context retrieval"
description: "Finding that a capability exists, and selecting a small candidate set at inference time."
tags: [stack, discovery, retrieval]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
---

# Role in the stack
Discovery should be a **first-class runtime capability**, not a side effect of stuffing all tools into one prompt. Discovery finds *that* a capability exists (catalogues, OpenAPI docs, A2A [Agent Cards](../glossary/agent-card.md), protocol registries, and content/skills registries such as [Context Hub](../frameworks/context-hub.md)); retrieval selects a small candidate set from a large inventory at inference time.

# Evidence
[Gorilla](../research/gorilla.md) + a retriever and [ToolLLM](../research/toolllm-toolbench.md) + a neural retriever both address the scaling problem when the tool set is too large for naïve prompting. Retrieval narrows the search space and improves freshness — necessary but insufficient for trustworthy action.

Relates to: [UK API Catalogue](../uk-government/uk-api-catalogue.md), [Contracts and interfaces](contracts-and-interfaces.md).

# Terms
Glossary terms used here: [Agent Card](../glossary/agent-card.md).
