# SharePoint and M365 Copilot experiment

This folder tests whether Microsoft 365 Copilot can find the right governed OKF
family record in SharePoint when a person describes a situation without naming,
selecting or attaching a file.

The [experiment plan](EXPERIMENT_PLAN.md) covers controlled SharePoint folder
discovery, Word content optimisation and a separate OneNote-only Agent Builder
investigation for eligible users without the Microsoft 365 Copilot add-on
licence.

The [public trial report](../../docs/sharepoint-m365-copilot-trial.md) preserves
the aggregate scale-development result, Microsoft charging estimate and
service-protection interpretation. The 293-family test returned 293 safe
responses and 292 exact top-1 selections. Actual billing must be confirmed from
the tenant consumption record.

The local generation stage is complete. Tenant execution evidence is kept in
the ignored `results/private/` directory and must not be published without
redaction. The checked-in files are deterministic derivatives of the published
`okf-uk-living` records. They are discovery aids, not official services,
current advice or a new source of truth.

## Frozen pilot artefacts

- `corpus-manifest.json` binds the 20 deliberately confusable families, source
  commit, exact source files, two Word profiles and every output digest.
- `development-cases.v1.jsonl` contains 48 synthetic development cases: 40
  clear or indirectly expressed matches, 4 deliberately ambiguous cases and 4
  closed-corpus negatives. It is not the final holdout.
- `profiles/word-full-v1/` contains 20 full readable records with the exact
  governed JSON envelope as an appendix.
- `profiles/word-retrieval-v2/` contains 20 shorter, linear records optimised
  for SharePoint retrieval. These retain governed facts and provenance but
  deliberately omit the duplicated raw JSON appendix.

The retrieval profile ranges from 9,848 to 17,884 visible characters per file,
within the experiment's 20,000-character target. The full profile ranges from
30,104 to 52,698 visible characters. See the [local verification
record](VERIFICATION.md) for deterministic, structural, accessibility and
page-by-page checks.

## Frozen full-corpus development artefacts

- `full-corpus-manifest.json` binds all 293 governed families and generated
  Word records to the same pinned source snapshot.
- `profiles/word-retrieval-v2-all-293/` contains one retrieval-first Word
  record per family.
- `full-corpus-cases.v1.jsonl` contains one exact authored-situation
  development case per family. This exhaustive coverage is not an independent
  holdout.
- `full-corpus-preflight.v1.jsonl` contains 24 domain-balanced positive
  sentinels, 4 deliberately ambiguous situations and 4 true closed-corpus
  negatives.
- `full-corpus-schedule.v1.jsonl` freezes the 32-call preflight followed by the
  293-family development run.
- `agent-c-literal-293-folder-v1-instructions.md` contains the folder-source
  agent instructions, including the fail-closed rule that prevents an absent
  situation from naming or citing a candidate or near-neighbour record.
- The [public trial report](../../docs/sharepoint-m365-copilot-trial.md)
  records aggregate results and the charging and throttling interpretation
  without publishing tenant or attempt-level evidence.

The full-corpus condition uses one SharePoint folder as its knowledge source.
It is therefore a separate scale condition from the leading 20-file
`C-literal` control and must not be presented as a like-for-like source
topology comparison.

## Source binding

- OKF UK Living commit: `736d7dc4dbb4e44082f6b7786dd88afd55954792`
- Family record paths and exact HTML and embedded-record SHA-256 values: see
  `corpus-manifest.json`
- Journey projection SHA-256:
  `646157327f3181bbef544613e8cd7398328c155dfb6939fcb9a3f1c883e07184`

Build the complete frozen pilot corpus from the `okf-explorer` repository root
using the governed environment:

```sh
uv run --locked python experiments/sharepoint-copilot/build_pilot_corpus.py
```

Check the existing outputs without rebuilding them:

```sh
uv run --locked python experiments/sharepoint-copilot/build_pilot_corpus.py --check
```

Build or check the 293-family retrieval corpus and freeze its evaluation
schedule using:

```sh
uv run --locked python experiments/sharepoint-copilot/build_full_corpus.py
uv run --locked python experiments/sharepoint-copilot/build_full_corpus.py --check
uv run --locked python experiments/sharepoint-copilot/build_full_evaluation.py
```

Validate the frozen continuation controls and browser-runner contract without
sending a Microsoft provider request:

```sh
uv run --locked python experiments/sharepoint-copilot/test_full_continuation.py
node --test experiments/sharepoint-copilot/m365_continuation_browser.test.mjs
```

The builder verifies the pinned 7,217,377-byte projection, all 20 source HTML
digests, exact embedded records, ordering, source references, safe URLs,
document structure, literal hyperlink targets, ZIP integrity, character limits
and manifest identity. It does not rebuild an OKF bundle, viewer or website.
