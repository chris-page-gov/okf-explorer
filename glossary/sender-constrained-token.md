---
type: "Glossary term"
title: "Sender-constrained token"
description: "A token usable only by the client that presents the right proof."
tags: [glossary]
timestamp: 2026-06-27T00:00:00Z
verified: "yes"
aliases: "sender-constrained token; sender constrained; proof-of-possession"
---

# Definition
A credential bound to the presenting client (via [mTLS](../standards/mtls-bound-tokens.md) or [DPoP](../standards/dpop.md)) so a stolen token cannot be replayed by another party — unlike a [bearer token](bearer-token.md).

# Used in this bundle
Appears in: [dpop](../standards/dpop.md), [mtls-bound-tokens](../standards/mtls-bound-tokens.md), [identity-and-authorisation](../stack/identity-and-authorisation.md).

# Related terms
[bearer token](bearer-token.md).
