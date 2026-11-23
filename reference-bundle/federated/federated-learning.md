---
type: "Concept"
title: "Federated learning"
description: "Many clients train a shared model under orchestration while data stays decentralised."
resource: "https://arxiv.org/abs/1602.05629"
tags: [fl, federated]
generated: { by: human:crpage, at: 2026-07-09T09:44:00Z }
status: stable
sources: [{ id: primary, resource: "https://arxiv.org/abs/1602.05629" }]
---

A machine-learning setting in which many clients collaborate to train a shared model while keeping training data **decentralised**, distinguished from ordinary distributed learning by heterogeneous data, intermittent participation and decentralised control. Federated AI reduces the need to centralise raw data, but does **not** remove the need for privacy engineering or governance — updates can still leak information.

Relates to: [The federation layer](../stack/federation-layer.md), [FedAvg](../research/fedavg.md), [Secure aggregation](secure-aggregation.md).
