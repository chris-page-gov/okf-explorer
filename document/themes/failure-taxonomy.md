---
type: "Concept"
title: "Failure taxonomy"
description: "Seven failure classes, each with its own controls — not just 'stale data'."
tags: [theme, reliability, security]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
---

Agent failure is not merely stale training data. The classes are: **epistemic** (stale knowledge → retrieval/version pinning); **syntactic** (malformed calls → [JSON Schema](../../standards/json-schema.md)/structured output); **semantic** (schema-valid but wrong → [semantic grounding](../../stack/understanding-and-grounding.md)/evals); **operational** (timeouts, duplicates → retries/[idempotency](../../glossary/idempotency.md)); **security** ([prompt injection](../../glossary/prompt-injection.md), poisoned descriptions → trusted registries/sandboxing); **authority** (excess scope, [confused deputy](../../glossary/confused-deputy.md) → [least privilege](../../glossary/least-privilege.md)/scoped tokens); and **governance** (no audit/consent → [provenance](../../glossary/provenance.md), policy logging).

# Terms
Glossary terms used here: [Confused deputy](../../glossary/confused-deputy.md), [Consent](../../glossary/consent.md), [Idempotency](../../glossary/idempotency.md), [Least privilege](../../glossary/least-privilege.md), [Prompt injection](../../glossary/prompt-injection.md), [Provenance](../../glossary/provenance.md), [Semantic grounding](../../glossary/semantic-grounding.md), [Structured output](../../glossary/structured-output.md).
