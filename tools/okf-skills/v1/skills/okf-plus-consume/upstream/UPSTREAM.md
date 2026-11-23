---
name: okf-consume
description: Answer questions from an Open Knowledge Format (OKF) bundle, a directory of Markdown files with YAML frontmatter, and report the provenance, trust tier, freshness, and attestation status of every concept used. Use this skill when the user points at an OKF bundle or at a directory of Markdown files with index.md files and frontmatter type fields; asks what a metric, table, policy, or procedure means according to that bundle; asks for a number that the bundle defines with an Attested Computation; or asks which concepts are stale, deprecated, or unverified.
license: Apache-2.0
metadata:
  version: "0.1.0"
  publisher: google
---

# Answer from an OKF bundle

This skill only reads a bundle. If the task is to create, change, repair, migrate, or verify a bundle, stop and use the `okf-generate` skill instead.

This skill answers questions from an OKF v0.3 bundle and reports how far the reader can trust each concept that it used. The specification is [`SPEC.md`](https://github.com/open-knowledge-format/open-knowledge-format/blob/main/SPEC.md) in the OKF repository. [references/trust.md](references/trust.md) gives the exact trust, freshness, conflict, path, and value rules.

## Rules

1. **Answer from the bundle.** If the bundle does not cover the question, say so. Label any statement from general knowledge as general knowledge.
2. **Report trust.** For each concept that you use, report its trust tier, its status, and whether it is stale.
3. **Do not write your own computation or executor.** If an Attested Computation defines a value, supply only its parameter values. Do not write or edit a query for that value, and run the executor exactly as the bundle gives it.
4. **Do not reject content.** Use a concept even if it has unknown keys, an unknown `type`, missing optional fields, or broken links (section 11.2).
5. **Do not change the bundle.**

## Procedure

### 1. Find the bundle root

1. Look for an `index.md` with frontmatter. That file marks the bundle root, also when the bundle is a subdirectory of a larger repository.
2. Read its `okf_version`, `title`, and `description`. The description states the scope of the bundle and when to use it. If you have more than one bundle, use the descriptions to choose.
3. If there is no root `index.md`, use the top directory whose `.md` files have frontmatter with a `type` field.
4. If `okf_version` is not `0.3`, read the bundle on a best-effort basis. For version 0.2, an earlier version, or no version, apply the fallbacks in [Read an older bundle](#read-an-older-bundle).

### 2. Find the relevant concepts

Do not read the whole bundle at once. Use one of these methods:

- **Scan script.** Run `python3 scripts/scan.py <bundle-root>` from this skill's directory. It prints one entry per concept with its ID, type, trust tier, status, freshness, title, and description. Filter with `--type`, `--tag`, `--grep`, `--current`, `--stale`, `--deprecated`, or `--unverified`. Use `--json` for structured output. The script needs Python 3.9 or later and PyYAML.
- **Index files.** Read the root `index.md`. Then read only the `index.md` files of the directories that relate to the question. If a directory has no `index.md`, list its files and read the frontmatter of each.

Then open only the concept documents that you need. Before you answer, look for other concepts on the same topic, for example with `scan.py --grep`, so that you find any conflict.

### 3. Read each concept

1. A concept is a `.md` file whose frontmatter has a non-empty `type`. Skip `index.md`, `log.md`, files without frontmatter or `type`, and paths that start with `.`.
2. Read the frontmatter first: `type`, `title`, `description`, `resource`, `tags`, and the trust and lifecycle fields.
3. Read the body: the definition, `# Schema`, `# Examples`, and the `Computation` section.
4. Follow the links that relate to the question, such as definitions, joins, policies, and computations.
5. Resolve each link and path field with the rules in [references/trust.md](references/trust.md#paths). Do not read a path that resolves outside the bundle root from the local file system.
6. If a link target does not exist, treat it as missing knowledge, not as an error.

### 4. Judge trust and freshness

Do these checks for each concept that you use.

1. **Trust tier.** Use only current verification events. An event is current when its `at` is equal to or later than `generated.at`, or when `generated` is absent.
   - No current event means *unverified*.
   - Current events from non-`human:` actors only, such as `team:` or `process:`, mean *machine-confirmed*.
   - A current event from a `human:` actor means *human-reviewed*.

   If every event is older than `generated.at`, say that the concept was verified only before its last change.
2. **Status.** A missing `status` means `stable`.
   - If the status is `draft`, say that the concept is a draft.
   - If the status is `deprecated`, do not present the concept as current. Follow `superseded_by` to the replacement. If `superseded_by` is absent, look for the replacement in the links and the body. Say that you did this.
   - If the status is any other value, the concept is not current. Show the raw value.
3. **Freshness.** The concept is stale when the current time is at or after `stale_after`. A date without a time means the start of that day in UTC. Say when the concept became stale. If `stale_after` does not parse, treat the concept as stale and say that the value is malformed. Stale means "check again", not "false".
4. **Sources.** Use the credibility signals of the sources to weigh claims that disagree. They are facts, not scores:
   - `author` shows authority.
   - `usage_count` over `usage_window` shows liveness. Compare counts only by order of magnitude.
   - `last_modified` shows recency.

### 5. Resolve conflicts

If two concepts disagree, prefer them in this order. The first difference decides.

1. A current concept: its status is `stable` or `draft`.
2. A higher trust tier: human-reviewed, then machine-confirmed, then unverified.
3. A concept that is not stale.
4. The later `generated.at`.

Tell the user about the conflict and the choice that you made.

### 6. Get a value from an attested computation

If the question asks for a value, and an Attested Computation produces it, do these steps:

1. **Load.** Read `runtime`, `parameters`, `executor`, and `attester`. Find the computation:
   - If `computation` is present, the computation is the file that it names.
   - Otherwise, it is the first fenced code block in the section with the heading `Computation`, at any heading level.
   - If neither exists, the concept is not attestable. Say so.
2. **Parameterize.** Supply values for the declared parameters only. If a required value is not clear, ask the user. Do not change the computation, add filters, or write a different query.
3. **Execute.** Follow the instructions or code at `executor.resource` exactly. Do not modify it, replace it, or write a substitute, even to repair it. Bind the parameters the way that the runtime expects, for example as BigQuery named parameters, not as text in the query. Collect the receipt fields that `executor.receipt` lists.
4. **Attest.** Run the code at `attester.resource` on the receipt and on the value that you plan to show. It returns a mapping with `ok` and an optional `reason`. Do not imitate the attester. Run it.
5. **Gate.** Use the table in [references/trust.md](references/trust.md#attestation-gate):
   - If the attestation fails, do not show the value in any form, even inside an explanation. Show the reason.
   - If the concept has no `runtime` or no `attester`, never call the value attested.
   - If the computation is stale, warn the user before you show the value.
   - If the attestation passes, show the value with the verdict and a receipt reference, such as the job ID.
6. **If you cannot execute,** for example because you have no credentials or no executor, do not write your own query. Show the computation with the parameter values bound, and say that it did not run and is not attested.

`verified` and attestation answer different questions. `verified` shows that a person or a process confirmed the definition. Attestation shows that one run used the sanctioned computation. Report both.

### 7. Answer

Give the answer first. Then list the items below. Write each OKF term exactly as it appears here, not as a paraphrase.

- **Concepts used:** each concept ID with its trust tier (`unverified`, `machine-confirmed`, or `human-reviewed`), its status, and its freshness. The trust tier describes the definition. When a value comes from an Attested Computation, also write `attested` or `not attested`. That result describes this run.
- **Citations:** for each footnote label `[^id]` that supports the answer, the `title` and `resource` of the `sources` entry with that `id`.
- **Gaps:** the parts of the question that the bundle does not cover.

## Read an older bundle

A bundle that declares `okf_version` 0.2 or earlier, or that declares no version, can use these fallbacks (section 12.1):

- If a path field has no leading `/` and does not resolve from the directory of its file, resolve it from the bundle root.
- If `generated` is absent, use `timestamp` as the time of the last change.
- If `sources` is absent, read the `# Citations` list in the body.

A concept with no trust fields is unverified. It is still usable.

## Bundles in other systems

A search index or a data catalog can also serve a bundle. Apply the same rules to the copy that you read. The [`connectors/`](https://github.com/open-knowledge-format/open-knowledge-format/tree/main/connectors) directory of the OKF repository has guides for specific systems, such as Google Cloud Knowledge Catalog.
