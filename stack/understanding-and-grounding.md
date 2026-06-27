---
type: "Stack layer"
title: "Understanding and grounding"
description: "Schema grounding vs semantic grounding: matching types vs matching intent."
tags: [stack, grounding, semantics]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
---

# Role in the stack
Schema grounding asks whether fields and types match a formal contract; **semantic grounding** asks whether the model mapped user intent to the right operation, entity and parameters. A call can be schema-valid yet semantically wrong, policy-violating or goal-failing.

# Practice
A hierarchy for schema extraction: first authoritative published contracts; then introspection / generated descriptors ([GraphQL](../standards/graphql.md) introspection, .proto); last resort, inferred schema from examples — useful for bootstrapping but not ground truth.

Relates to: [Failure taxonomy](../document/themes/failure-taxonomy.md), [Contracts and interfaces](contracts-and-interfaces.md).

# Terms
Glossary terms used here: [Schema grounding](../glossary/schema-grounding.md), [Semantic grounding](../glossary/semantic-grounding.md).
