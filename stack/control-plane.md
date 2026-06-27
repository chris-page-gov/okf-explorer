---
type: "Architecture"
title: "The discovery-to-governance control plane"
description: "The end-to-end lifecycle that turns a tool-calling model into governed agent execution."
tags: [architecture, stack, agentic]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
---

# What it is
The architecture that emerges across the evidence is a **discovery-to-governance lifecycle**: a user expresses intent; the runtime retrieves current capability descriptions; the model selects tools and binds arguments against formal schemas; an authorisation layer establishes *who or what* is acting, for whom and with which limits; an execution substrate handles retries, timeouts and compensation; and an evidence layer records provenance, traces, policy decisions and consents.

# Why it matters
API-calling is only **one layer** of an agent-capable stack. Reliable deployment depends on capabilities outside the model: [contracts](contracts-and-interfaces.md), [discovery](discovery-and-retrieval.md), [identity](identity-and-authorisation.md), [execution](execution-and-orchestration.md), [policy](policy-enforcement.md) and [observability/provenance](observability-and-provenance.md). None substitutes for the others.

Relates to: [Agent-ready, not agent-trusting](../document/themes/agent-ready-not-agent-trusting.md), [The federation layer](federation-layer.md).

# Terms
Glossary terms used here: [Compensation](../glossary/compensation.md), [Provenance](../glossary/provenance.md).
