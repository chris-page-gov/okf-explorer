---
type: "Concept"
title: "Agent-ready, not agent-trusting"
description: "Understanding a tool is never authority to use it."
tags: [theme, security, governance]
generated: { by: human:crpage, at: 2026-07-09T09:44:00Z }
status: stable
---

The proposition that *agent-ready must not mean agent-trusting* is strongly supported. An agent runtime should hold short-lived, narrowly-scoped, audience- and purpose-bound, preferably [sender-constrained](../../glossary/sender-constrained-token.md) credentials — never a single broad ambient credential. The model knowing *how* to call a tool says nothing about *whether*, *in whose name*, or *under what constraints*. See [identity and authorisation](../../stack/identity-and-authorisation.md).
