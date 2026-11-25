---
type: "Reader Guide"
title: "Trace a complex ELS API question"
description: "A source-linked route through frozen wiki claims, reviewed application evidence, and preserved conflicts."
resource: "/source/walkthrough.json"
tags: ["reader-guide","provenance","complex-question"]
status: "draft"
generated: {"by":"process:okf-els-api-build","at":"2026-11-25T00:00:00Z"}
sources: [{"id":"els-wiki","resource":"https://github.com/ONSdigital/explore-local-statistics-app/wiki","title":"Explore Local Statistics application wiki","last_modified":"2026-07-20","pinned_commit":"3da822e28d775f1213d328573da34aba8278d79f"},{"id":"els-application","resource":"https://github.com/ONSdigital/explore-local-statistics-app/tree/795eaf204f47986f6be248a63f857a42afe4fdf2","title":"Explore Local Statistics application source review","last_modified":"2026-07-17","pinned_commit":"795eaf204f47986f6be248a63f857a42afe4fdf2"}]
snapshot_mode: "frozen"
live_status: "not-checked"
---

# Question

When requesting indicator data, which geography and date filters can a client plan, and what evidence limits apply to an answer?

![Evidence path from wiki request guidance, through the operation concept and review issues, to a non-executing selection plan](artifacts/complex-question.svg)

## Follow the evidence

1. Read the [data request page](documents/Requesting-data.md) and [geographic information page](documents/Requesting-geographic-information.md), both pinned to the declared wiki snapshot.
2. Compare the [data operation](operations/data.md) and [geographic lookup operation](operations/geo-lookup.md) with the [preserved review findings](issues/index.md).
3. Use the [selection plan](artifacts/selection-plan.md) to check whether proposed arguments match the reviewed shape. It does not call the API.
4. Keep any answer qualified by the [snapshot boundary](snapshots/wiki-and-source.md): this bundle does not establish current live behaviour.

## Copyable AI handoff

Copy the bounded prompt in [AI handoff](artifacts/ai-handoff.md). It names the source records and asks the model to separate claims, conflicts and unknowns.
