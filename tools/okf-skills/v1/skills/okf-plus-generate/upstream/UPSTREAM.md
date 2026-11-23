---
name: okf-generate
description: Create, update, migrate, repair, or validate an Open Knowledge Format (OKF) v0.3 bundle, including recording a verification. An OKF bundle is a directory of Markdown files with YAML frontmatter that documents data assets, metrics, policies, and procedures for people and agents. Use this skill when the user asks to write, generate, bootstrap, enrich, or migrate OKF documents or a knowledge bundle; to document tables, datasets, metrics, APIs, or playbooks in OKF; to add provenance, trust, lifecycle, or attested-computation fields; or to check a bundle for OKF conformance. Use this skill, not okf-consume, to repair a bundle or to record a verification.
license: Apache-2.0
metadata:
  version: "0.1.0"
  publisher: google
---

# Generate an OKF bundle

This skill produces an OKF v0.3 bundle that conforms to the specification and records the source of each fact. The specification is [`SPEC.md`](https://github.com/open-knowledge-format/open-knowledge-format/blob/main/SPEC.md) in the OKF repository. [references/frontmatter.md](references/frontmatter.md) lists every field. [references/templates.md](references/templates.md) gives a template for each document type.

An OKF bundle is a directory tree. A concept is a Markdown file whose frontmatter has a non-empty `type`. A Markdown file without frontmatter or without `type`, such as a `README.md`, is not a concept. A file whose name does not end in `.md` is an asset. The file names `index.md` and `log.md` are reserved at every level.

To answer questions from a bundle, use the `okf-consume` skill.

## Rules

1. **Write only what a source supports.** Do not invent columns, partitions, URLs, owners, numbers, policies, or review dates. If a fact has no source, omit it or ask the user.
2. **Record provenance.** List the sources of each concept in `sources`. Attach each specific claim to its source with a footnote whose label is the source `id`.
3. **Record authorship honestly.** Set `generated.by` to your own actor, `<tool>/<model>`, where `<tool>` is the agent product, such as `claude-code`, `codex`, or `antigravity`.
4. **Do not claim a verification that did not occur.** Do not add a `verified` entry to content that you generated in this run. Add a `human:<id>` entry only when that person confirmed the content, asked you to record it, and stated their id. Never infer an id from the machine, such as a login name or git configuration. Without an id, record no verification and say why.
5. **Never write the computation of an Attested Computation.** Copy it exactly from a sanctioned source, such as an approved SQL file, a dbt model, or a query from its owner. Cite that source. If no sanctioned computation exists, describe the metric without one and report the gap. Do not store an unreviewed query in the bundle unless the user explicitly asks; then store it as a Reference with `status: draft`, never linked as a computation.
6. **Keep what you do not own.** When you update a file, keep its unknown keys, its `verified` history, and text that a person wrote. Do not rewrite values that you did not change.

## Procedure

### 1. Set the scope

1. Find or choose the bundle root. If the bundle exists, read its root `index.md` and `log.md` first, and note its `okf_version`.
2. List the sources that you can read. Examples are schema metadata, such as `INFORMATION_SCHEMA` views or an OpenAPI file, documentation pages, runbooks, and notes from the user.
3. Tell the user which sources you cannot read.
4. If the scope is not clear, ask the user which assets or topics to include.

### 2. Plan the tree

1. Plan one concept per file. The concept ID is the file path without `.md`.
2. Group concepts in directories by kind, for example `datasets/`, `tables/`, `metrics/`, `computations/`, `policies/`, `playbooks/`, and `references/`. Reuse the directory names that the bundle already has.
3. Use stable lowercase file names, and never two paths that differ only by case.
4. Do not name a concept `index.md` or `log.md`.
5. If you plan more than 10 files, show the planned tree to the user before you write them.

### 3. Write each concept

1. Start the file with a line that is exactly `---`, and end the frontmatter with the next `---` line.
2. Set `type` to a short descriptive name, for example `BigQuery Table`, `Metric`, `Playbook`, `Reference`, or `Attested Computation`. Reuse the type names that the bundle already uses.
3. Write `description` as one sentence.
4. If the concept describes an asset, set `resource` to the canonical URI of that asset.
5. Write `tags` as a YAML list, for example `[sales, orders]`. A consumer reads a scalar `tags` value as one tag, so `tags: sales, orders` is the single tag `sales, orders`.
6. Write `generated.at` and `verified[].at` as RFC 3339 date-times with an offset, such as `"2026-06-30T14:00:00Z"`. Other timestamps can also be a date, such as `"2026-12-31"`, which means 00:00 UTC on that day.
7. Follow the syntax rules in [references/frontmatter.md](references/frontmatter.md#syntax-section-4). Quote timestamps, actors, and values that look like numbers or booleans. Do not repeat a key.
8. Start the body with one to three paragraphs. Tell what the concept is, its grain or scope, how people use it, and its caveats.
9. Use the conventional headings when they apply: `# Schema` for columns or fields, `# Examples` for usage, and `# Computation` for an Attested Computation.

### 4. Link concepts and write paths

1. When the text names another concept in the bundle, link to it with a standard Markdown link, once per section and not from headings or code.
2. Write links in the body relative to the file, for example `../tables/orders.md`, because that form displays correctly on GitHub.
3. Write path fields (`resource`, `sources[].resource`, `computation`, `executor.resource`, `attester.resource`, `superseded_by`) with a leading `/`, for example `/references/attesters/sql-equality.py`. A path field without a leading `/` resolves from the directory of its file, not from the bundle root.
4. Percent-encode spaces in paths, such as `my%20concept.md`.
5. Link only to concepts that exist or that you create in this run.

### 5. Record provenance, trust, and lifecycle

1. Give each `sources` entry a stable `id`, the required `resource`, and a `title`.
2. Add `author` (an actor), `usage_count`, or `last_modified` only when you have the real value. Give each `usage_count` a `usage_window`.
3. List the concept's own `resource` as a source when the content came from it.
4. Cite a specific claim with a footnote, for example `Revenue excludes tax.[^rev-policy]`. Define it as `[^rev-policy]: Revenue recognition policy`. The label must equal a `sources[].id`. Do not use numbered labels such as `[^1]`.
5. Set `generated: { by: "<your actor>", at: "<current UTC time>" }` on each concept that you create or change in meaning. If your change only fixes format, whitespace, or links, keep the existing `generated` value.
6. Write actors as `<producer>/<version>` or `<scheme>:<id>`, with the schemes `human:`, `team:`, and `process:`. Only `human:` gives the human-reviewed trust tier.
7. For normal content, omit `status`. A missing `status` means `stable`.
8. If the content is incomplete or needs review by its owner, set `status: draft`.
9. If a concept is retired, keep the file with its definition and `verified` history, and set `status: deprecated`. If a replacement exists, set `superseded_by` to its path, and state the reason in the body.
10. To move or rename a concept, keep its `generated` and `verified` values, because a move does not change its meaning. Keep a short deprecated concept at the old path with `superseded_by` set to the new path.
11. Set `stale_after` only when a source has a known review or refresh cycle. Do not guess a date.

### 6. Write an attested computation

Do this step only when you have a sanctioned computation (rule 5).

1. Write the computation as its own concept with `type: Attested Computation`, usually in `computations/`, and set its `runtime`.
2. Write its parameters, computation block, executor, and attester as [references/attested-computations.md](references/attested-computations.md) describes.
3. Link to the computation from each concept that uses its value, for example from a `Metric`.

### 7. Write index and log files

1. Write or update `index.md` in each directory that you changed. Group the entries under headings.
2. Write each entry as `* [Title](path) - description`. Copy the description from the concept's frontmatter.
3. Do not put frontmatter in an `index.md` below the bundle root.
4. Give the root `index.md` frontmatter with `okf_version: "0.3"`, a `title`, a one-sentence `description` of the scope of the bundle and when to use it, and a `license` when you know it. Agents use the description to choose a bundle.
5. When you regenerate the root `index.md`, keep its existing frontmatter.
6. Add an entry to `log.md` for the change. Do not put frontmatter in `log.md`. Use a `## YYYY-MM-DD` heading and put the newest date first.

### 8. Validate

1. Run the validator from this skill's directory:

   ```bash
   python3 scripts/validate.py <bundle-root>
   ```

2. Fix each error. Errors mark conformance failures (section 11.1).
3. Fix each warning, or tell the user why you kept it. Warning `W120`, a file that is not a concept, is correct only for documentation such as a `README.md`.
4. Read the info findings, such as stale concepts and verifications older than the content.
5. If you cannot run the script, check the conformance rules of section 11.1 by hand.

The validator needs Python 3.9 or later and PyYAML (`pip install pyyaml`). Use `--json` for structured output and `--strict` to fail on warnings.

### 9. Report

Tell the user:

- the files that you created or changed,
- the concepts that you marked `draft` or `deprecated`,
- the concepts that now need a new verification,
- the facts that you could not source,
- the validation result.

## Update an existing bundle

1. Change only what your sources support. Keep the other content and its exact form.
2. Update `generated.at` only for a change in meaning.
3. Keep each `verified` entry. A verification counts only when it is not older than `generated.at`, so a change in meaning needs a new verification. Tell the user.

## Migrate an older bundle

To migrate a v0.1 or v0.2 bundle to v0.3, follow [references/migration.md](references/migration.md).
