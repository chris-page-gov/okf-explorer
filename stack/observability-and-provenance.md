---
type: "Stack layer"
title: "Observability and provenance"
description: "The evidence layer: traces, metrics, logs and an interoperable provenance graph."
tags: [stack, observability, provenance, evidence]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
---

# Role in the stack
The evidence layer. [OpenTelemetry](../standards/opentelemetry.md) provides traces, metrics and logs; [W3C PROV](../standards/w3c-prov.md) provides an interoperable model of the entities, activities and agents that produced an outcome. Together they imply a **minimum evidence bundle** for agentic execution: intent, retrieved-context version, tool-selection rationale, delegated authority, execution trace, result and provenance graph.

# Why it is load-bearing
When an agent performs a lawful-but-undesired action, the question shifts from *what did the model know?* to *which principal delegated authority, under which policy, using which contract version, with what recorded consent and audit trail?*

Relates to: [Provenance](../glossary/provenance.md), [Audit trail](../glossary/audit-trail.md), [UK public-sector implications](../document/themes/uk-public-sector-implications.md).

# Terms
Glossary terms used here: [Audit trail](../glossary/audit-trail.md), [Consent](../glossary/consent.md), [Provenance](../glossary/provenance.md).
