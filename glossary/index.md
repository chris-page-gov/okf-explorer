---
type: "Index"
title: "Glossary"
description: "Plain-English definitions of the technical terms used across the bundle."
tags: [index]
timestamp: 2026-06-27T00:00:00Z
---

# Glossary

Plain-English definitions of the technical terms used across the bundle.

- [Structured output](structured-output.md) — Constraining a model's output to a schema; guarantees form, not authority.
- [Function calling](function-calling.md) — A model emitting a tool invocation against a declared function schema.
- [API calling](api-calling.md) — Outbound calls to remote services (REST, GraphQL, gRPC, events).
- [Tool use](tool-use.md) — The widest term: APIs, code execution, search, retrieval, workflow calls.
- [Tool discovery](tool-discovery.md) — Finding that a capability exists (catalogues, agent cards, registries).
- [Tool retrieval](tool-retrieval.md) — Selecting a small candidate set from a large inventory at inference time.
- [Schema grounding](schema-grounding.md) — Checking that fields and types match a formal contract.
- [Semantic grounding](semantic-grounding.md) — Checking that intent maps to the right operation and entities.
- [Agent skill](agent-skill.md) — A reusable, packaged instruction/workflow bundle for an agent.
- [API gateway](api-gateway.md) — Runtime enforcement point for authn/z, rate limiting, routing and logging.
- [Workflow engine](workflow-engine.md) — Orchestrates multi-step, stateful processes; Arazzo describes them declaratively.
- [Workload identity](workload-identity.md) — Cryptographic identity for software workloads; 'what is calling'.
- [Policy-as-code](policy-as-code.md) — Decoupling policy decisions from enforcement points across services.
- [Provenance](provenance.md) — The recorded entities, activities and agents that produced an outcome.
- [Idempotency](idempotency.md) — An operation that can be safely repeated with the same effect.
- [Compensation](compensation.md) — Undoing or offsetting a completed step in a multi-step workflow.
- [Sender-constrained token](sender-constrained-token.md) — A token usable only by the client that presents the right proof.
- [Bearer token](bearer-token.md) — A credential where mere possession grants access.
- [Least privilege](least-privilege.md) — Granting only the minimum authority needed for a task.
- [Confused deputy](confused-deputy.md) — A privileged component tricked into misusing its authority for another.
- [Prompt injection](prompt-injection.md) — Malicious instructions hidden in tool descriptions or retrieved content.
- [Agent Card](agent-card.md) — A2A's machine-readable description of an agent's capabilities.
- [Consent](consent.md) — Explicit user permission for data exposure or action.
- [Audit trail](audit-trail.md) — A trustworthy record of what an agent read, decided and did.
- [Attestation](attestation.md) — Cryptographic proof of a workload's or node's identity/integrity.
