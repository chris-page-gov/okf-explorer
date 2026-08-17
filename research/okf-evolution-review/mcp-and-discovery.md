---
type: "Research"
title: "MCP access and OKF bundle discovery"
description: "Design for bounded machine access to OKF bundles and a digest-bound registry rather than an unbounded meta-bundle."
tags: [okf, mcp, discovery, registry, grounding]
language: en-GB
generated: { by: "process:okf-evolution-review", at: "2026-08-17T00:00:00Z" }
status: stable
---

# MCP access and OKF bundle discovery

The prototype MCP server in `mcp/okf_mcp_server.py` exposes a local bundle by
read-only JSON-RPC. Its bounded operations are:

- list bundles and report identity/digest;
- search records with deterministic lexical ranking;
- fetch one exact record;
- follow explicit relationships;
- assemble a byte-limited context pack; and
- expose provenance and source links already present in the record.

It does not execute commands declared by a bundle, fetch arbitrary URLs,
resolve arbitrary remote JSON-LD contexts or invent semantic edges. The server
is deliberately dependency-light so its retrieval behaviour can be tested
independently from a particular MCP SDK. A production adapter should expose
the same core through the client-supported MCP revision, authentication and
transport.

## Prompt and link compared with MCP

| Direct prompt and bundle link | MCP retrieval |
| --- | --- |
| Lowest integration cost and already useful in Microsoft 365 Copilot. | Explicit query, limits, identity, digest and structured results. |
| Client decides how to crawl, index, rank and truncate. | Data owner can test deterministic retrieval and context budgets. |
| Fewer moving parts and familiar permissions where the content already lives. | More code, hosting, authentication, monitoring and client compatibility work. |
| Harder to observe why a near-neighbour won. | Ranking and returned evidence can be logged and compared. |
| Good default for small, stable and already indexed collections. | Better when bundles are numerous, large, sharded or require governed traversal. |

The responsible sequence is to benchmark the simple route first, then add MCP
only when its measurable retrieval, control or observability benefit exceeds
its operational cost.

## Discovery structure

The recommended control plane is a small catalogue registry, inspired by DCAT
but specialised for OKF delivery. Each entry should carry:

- stable bundle IRI and human title;
- current version, OKF core version and optional profile IRIs;
- descriptor and human landing-page URLs;
- media types and supported projections;
- publisher, licence, access class and jurisdiction;
- themes, spatial/temporal coverage and languages;
- issued, modified, observed and stale-after times;
- record/relationship counts and sharding capabilities;
- immutable snapshot digest and signature/attestation references; and
- health, deprecation, replacement and compatibility information.

This is best treated as a registry/control-plane dataset. It may itself be
published *as* a small OKF bundle to gain human navigation and provenance, but
the narrative meta-bundle must not become the authority for the child content.
The digest-bound child descriptors remain authoritative. Registries can
federate, and duplicate entries are reconciled by stable bundle identity and
snapshot digest rather than title matching.

## Discovery flow

1. A client discovers one trusted registry by configuration or organisation
   policy.
2. It filters entries by theme, jurisdiction, access and freshness without
   loading child bundles.
3. It verifies the selected descriptor and immutable snapshot digest.
4. It selects a supported access path: static files, shards, MCP or a domain
   API.
5. It retrieves bounded evidence and retains the registry and child identities
   in the answer receipt.

This keeps discovery cheap and makes authority visible. Crawling every bundle
or creating one enormous “bundle of bundles” would recreate the scale problem
that progressive disclosure was intended to solve.
