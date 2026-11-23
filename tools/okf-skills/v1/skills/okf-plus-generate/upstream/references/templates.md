# OKF v0.3 templates

Copy a template, replace each `<placeholder>`, and delete each line that you cannot fill from a source. The templates follow the v0.3 examples: timestamps and actors are quoted, path fields start with `/`, and links in the body are relative to the file.

## Concept that describes an asset

````markdown
---
type: BigQuery Table
title: <Display name>
description: <One sentence that states what one row represents.>
resource: https://console.cloud.google.com/bigquery?p=<project>&d=<dataset>&t=<table>
tags: [<tag>, <tag>]
generated: { by: "<tool>/<model>", at: "<YYYY-MM-DDTHH:MM:SSZ>" }
sources:
  - id: <table-schema>
    resource: https://console.cloud.google.com/bigquery?p=<project>&d=<dataset>&t=<table>
    title: <Table name> schema in BigQuery
---

<One to three paragraphs: the grain (one row per X), the time range, how people use the table, and caveats such as sampling.>[^<table-schema>]

# Schema

| Column | Type | Description |
|---|---|---|
| `<column>` | `<TYPE>` | <What the column holds.> |

# Examples

```sql
<A realistic query that uses this table.>
```

[^<table-schema>]: <Table name> schema in BigQuery
````

## Concept that describes an idea

````markdown
---
type: Metric
title: <Metric name>
description: <One sentence that defines the metric.>
tags: [<tag>]
generated: { by: "<tool>/<model>", at: "<YYYY-MM-DDTHH:MM:SSZ>" }
sources:
  - id: <policy>
    resource: /policies/<policy>.md
    title: <Document title>
---

# Definition

<What the metric measures, and the rules that define it.>[^<policy>]

The sanctioned computation is [<computation title>](../computations/<name>.md). Use it instead of a new query.

[^<policy>]: <Document title>
````

## Attested Computation

Use this template only with a computation from a sanctioned source.

````markdown
---
type: Attested Computation
title: <The value that the computation produces>
description: <One sentence.>
tags: [<tag>]
runtime: bigquery
parameters:
  - { name: <name>, type: integer, required: true }
executor:
  resource: /references/skills/<run-on-bq>.md
  receipt: [job_id, executed_sql, result]
attester:
  resource: /references/attesters/<sql-equality>.py
stale_after: "<YYYY-MM-DD at the end of the review cycle>"
generated: { by: "<tool>/<model>", at: "<YYYY-MM-DDTHH:MM:SSZ>" }
sources:
  - id: <sanctioned-source>
    resource: <URL or /path of the approved query, model, or policy>
    title: <Title>
---

# Computation

```sql
<The sanctioned computation, copied exactly from its source. Each parameter is a bind variable such as @year.>
```

<The rules that the computation implements.>[^<sanctioned-source>]

[^<sanctioned-source>]: <Title>
````

For a working executor and attester, see `bundles/acme_retail/skills/run-on-bq.md` and `bundles/acme_retail/attesters/sql_equality.py` in the OKF repository. An attester returns a mapping with `ok` and an optional `reason`.

## Deprecated concept

Use this template to retire a concept, or to keep a short concept at the old path after a move.

````markdown
---
type: Metric
title: <Old name>
description: <One sentence that says the concept is retired and what replaces it.>
status: deprecated
superseded_by: /metrics/<replacement>.md
generated: { by: "<tool>/<model>", at: "<YYYY-MM-DDTHH:MM:SSZ>" }
---

This concept is retired. Use [<replacement title>](<replacement>.md). <The reason for the change.>
````

## Procedure

````markdown
---
type: Playbook
title: "<Task>: <situation>"
description: <One sentence that states when to use this playbook.>
tags: [<tag>]
generated: { by: "<tool>/<model>", at: "<YYYY-MM-DDTHH:MM:SSZ>" }
---

# Trigger

<The event or condition that starts the procedure.>

# Steps

1. <Step.>
2. <Step.>
````

## Root index

````markdown
---
okf_version: "0.3"
title: <Bundle name>
description: <One sentence that states the scope of the bundle and when to use it.>
license: <SPDX expression, such as CC-BY-4.0>
---

# <Bundle name>

* [Tables](tables/index.md) - <What the directory holds.>
* [Metrics](metrics/index.md) - <What the directory holds.>
````

## Directory index

An `index.md` below the bundle root has no frontmatter.

````markdown
# Tables

* [Orders](orders.md) - One row per completed customer order.
````

## Log

A `log.md` has no frontmatter.

````markdown
# Bundle history

## <YYYY-MM-DD>

* **Creation**: Added [Orders](tables/orders.md) from the BigQuery table schema.
````
