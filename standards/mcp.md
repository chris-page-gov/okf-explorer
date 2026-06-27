---
type: "Specification"
title: "Model Context Protocol (MCP)"
description: "Agent-to-tool protocol: hosts, clients, servers, tools, resources, prompts over JSON-RPC."
resource: "https://modelcontextprotocol.io/specification/2025-06-18"
tags: [mcp, protocol, agentic]
timestamp: 2024-11-25T00:00:00Z
verified: "yes"
---

Introduced by [Anthropic](../organisations/anthropic.md) in November 2024; standardises agent-to-tool interaction over JSON-RPC, exposing tools, resources and prompts with explicit consent expectations. Its security section requires user consent for data exposure, tool invocation and sampling, while acknowledging it cannot enforce those principles alone; it does not provide authoritative registry curation — that registry role is filled by a content/skills registry such as [Context Hub](../frameworks/context-hub.md).

# Terms
Glossary terms used here: [Consent](../glossary/consent.md).
