---
type: "Stack layer"
title: "Execution and orchestration"
description: "Durable, stateful multi-step execution owned by the runtime, not the prompt."
tags: [stack, execution, orchestration]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
---

# Role in the stack
Single-call tool use is insufficient for many tasks. The **runtime, not the model**, should own retries, backoff, [idempotency](../glossary/idempotency.md), timeout budgets, batching, circuit breaking, webhook correlation and [compensation](../glossary/compensation.md). Where workflows matter, describe them explicitly with [Arazzo](../standards/arazzo.md) rather than leaving the model to infer every step.

# Evidence
[ToolSandbox](../research/toolsandbox.md) and [τ-bench](../research/tau-bench.md) show state dependence and consistency remain weak points — which is exactly why orchestration belongs in infrastructure.

Relates to: [Workflow engine](../glossary/workflow-engine.md), [OpenAI Agents SDK](../frameworks/openai-agents-sdk.md).

# Terms
Glossary terms used here: [Compensation](../glossary/compensation.md), [Idempotency](../glossary/idempotency.md), [Tool use](../glossary/tool-use.md), [Workflow engine](../glossary/workflow-engine.md).
