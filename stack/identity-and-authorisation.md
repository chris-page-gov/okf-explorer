---
type: "Stack layer"
title: "Identity and authorisation"
description: "Establishing who or what is acting, for whom, for what purpose, with which limits."
tags: [stack, identity, authorisation, security]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
---

# Role in the stack
The control plane must decide *whether*, *in whose name* and *under what constraints* a tool may be called — the model knowing *how* to call it is not enough. An agent runtime should almost never hold a single broad ambient credential; it should hold short-lived, narrowly-scoped, audience- and purpose-bound, preferably [sender-constrained](../glossary/sender-constrained-token.md) credentials.

# Two questions
[OAuth 2.0](../standards/oauth-2-0.md) (with [RFC 9700](../standards/oauth-2-0-security-bcp.md), [token exchange](../standards/token-exchange.md), [mTLS-bound tokens](../standards/mtls-bound-tokens.md), [DPoP](../standards/dpop.md)) answers *on whose behalf*; [SPIFFE/SPIRE](../standards/spiffe-spire.md) [workload identity](../glossary/workload-identity.md) answers *what is calling*; [zero trust](../standards/zero-trust.md) removes implicit network trust.

Relates to: [Agent-ready, not agent-trusting](../document/themes/agent-ready-not-agent-trusting.md).

# Terms
Glossary terms used here: [Workload identity](../glossary/workload-identity.md).
