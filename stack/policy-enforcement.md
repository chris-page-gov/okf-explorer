---
type: "Stack layer"
title: "Policy enforcement"
description: "Decoupling policy decisions from enforcement points across the stack."
tags: [stack, policy, governance]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
---

# Role in the stack
Guardrails belong in infrastructure, decoupled from model-generated reasoning. [Policy-as-code](../glossary/policy-as-code.md) — notably [OPA](../standards/opa.md) — separates the *decision* from the *enforcement point* and can run across microservices, API gateways, CI/CD and Kubernetes. Log policy decisions independently of the model's rationale.

Relates to: [Identity and authorisation](identity-and-authorisation.md), [Observability and provenance](observability-and-provenance.md).

# Terms
Glossary terms used here: [Policy-as-code](../glossary/policy-as-code.md), [Provenance](../glossary/provenance.md).
