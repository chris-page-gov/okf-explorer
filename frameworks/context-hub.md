---
type: "Tool / registry"
title: "Context Hub"
description: "Andrew Ng open content/skills registry: curated, versioned docs (and skills) for coding agents."
resource: "https://github.com/andrewyng/context-hub"
tags: [registry, agent-skill, discovery, tool]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
vendor: "Andrew Ng / AI Suite"
---

# What it is
**Context Hub** (Andrew Ng; MIT-licensed, npm `@aisuite/chub`) gives coding agents **curated, versioned, language-specific documentation** — with agent skills on the roadmap — so they stop hallucinating APIs and forgetting what they learn within a session. All content is **open markdown with YAML frontmatter** in a public repo (the same shape as an OKF bundle), so you can inspect exactly what an agent reads and contribute back by pull request.

# How it works
Designed for the **agent**, not the human, through a `chub` CLI: `chub search`, `chub get <id> --lang py|js`, `chub annotate`, `chub feedback up|down`. **Incremental fetch** returns only the reference files needed, to avoid wasting tokens. It can be wrapped as an [agent skill](../glossary/agent-skill.md) via a SKILL.md.

# Self-improving loop
**Annotations** are local notes an agent attaches to a doc; they persist across sessions and can be re-injected (`--with-annotations`, off by default) but are **treated as untrusted input**. **Feedback** (up/down ratings) flows back to doc authors, so the curated content improves for everyone — not just locally. This directly addresses the [prompt injection](../glossary/prompt-injection.md) risk for retrieved content.

# Where it sits in the stack
A **content/skills registry** layer that serves the [discovery and retrieval](../stack/discovery-and-retrieval.md) layer with curated, versioned, trust-annotated context. It is conceptually **distinct** from [MCP](../standards/mcp.md) (agent-to-tool transport) and [A2A](../standards/a2a.md) (agent-to-agent interoperability) — the concrete instance that resolves the "Context Hub" open question flagged in the source paper.

Relates to: [MCP](../standards/mcp.md), [A2A](../standards/a2a.md), [Discovery and retrieval](../stack/discovery-and-retrieval.md), [Agent skill](../glossary/agent-skill.md), [Evaluation note](../document/peer-review.md).

# Terms
Glossary terms used here: [Agent skill](../glossary/agent-skill.md), [Prompt injection](../glossary/prompt-injection.md).
