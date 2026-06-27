---
type: "Stack layer"
title: "Contracts and interfaces"
description: "Authoritative, machine-readable descriptions of what a capability is and how to call it."
tags: [stack, contracts, standards]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
---

# Role in the stack
The base layer: formal, machine-readable interface contracts. [OpenAPI](../standards/openapi.md) describes HTTP APIs; [AsyncAPI](../standards/asyncapi.md) describes message-driven ones; [GraphQL](../standards/graphql.md) exposes a typed query layer; [gRPC/protobuf](../standards/grpc-protobuf.md) define typed RPC; [JSON Schema](../standards/json-schema.md) validates arguments; [Arazzo](../standards/arazzo.md) describes multi-step workflows over them.

# Principle
A schema-valid call is **not** the same as a valid or authorised action — contracts give form, not authority or correctness. Prefer authoritative published contracts over inferred schemas.

Relates to: [Understanding and grounding](understanding-and-grounding.md), [Control plane](control-plane.md).
