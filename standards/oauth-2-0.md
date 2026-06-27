---
type: "Specification"
title: "OAuth 2.0"
description: "Delegated, scoped access to an HTTP service without sharing credentials."
resource: "https://www.rfc-editor.org/rfc/rfc6749"
tags: [oauth, security, standard]
timestamp: 2012-10-01T00:00:00Z
verified: "yes"
---

Grants limited access on behalf of a user or in its own right. Bearer tokens are vulnerable because possession is enough; current practice (see [RFC 9700](oauth-2-0-security-bcp.md), [PKCE](pkce.md), [token exchange](token-exchange.md), [mTLS-bound tokens](mtls-bound-tokens.md), [DPoP](dpop.md)) narrows, binds and sender-constrains authority.

# Terms
Glossary terms used here: [Bearer token](../glossary/bearer-token.md).
