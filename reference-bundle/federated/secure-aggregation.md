---
type: "Concept"
title: "Secure aggregation"
description: "The server learns the aggregate of updates, not any individual update."
resource: "https://arxiv.org/abs/1611.04482"
tags: [fl, privacy, security, federated]
generated: { by: human:crpage, at: 2026-07-09T09:44:00Z }
status: stable
sources: [{ id: primary, resource: "https://arxiv.org/abs/1611.04482" }]
---

A cryptographic protocol so the coordinating server can compute the *sum* of client updates without reading any individual contribution. Often necessary because model updates can leak information. A composable trust layer alongside [differential privacy](differential-privacy.md).

Relates to: [Federated learning](federated-learning.md), [Membership inference](membership-inference.md).
