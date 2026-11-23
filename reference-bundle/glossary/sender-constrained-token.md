---
type: "Glossary term"
title: "Sender-constrained token"
description: "A token usable only by the client that presents the right proof."
tags: [glossary]
generated: { by: human:crpage, at: 2026-07-09T09:44:00Z }
aliases: "sender-constrained token; sender constrained; proof-of-possession"
status: stable
---

# Definition
A credential bound to the presenting client (via [mTLS](../standards/mtls-bound-tokens.md) or [DPoP](../standards/dpop.md)) so a stolen token cannot be replayed by another party — unlike a [bearer token](bearer-token.md).

# Used in this bundle
Appears in: [dpop](../standards/dpop.md), [mtls-bound-tokens](../standards/mtls-bound-tokens.md), [identity-and-authorisation](../stack/identity-and-authorisation.md).

# Related terms
[bearer token](bearer-token.md).
