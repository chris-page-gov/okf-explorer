# OKF v0.1 conformance notes

This repository targets [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md). The hand-authored Markdown corpus (the directories listed in `scripts/update_viewer.py` `OKF_DIRS`) conforms to §9: every concept file carries parseable YAML frontmatter with a non-empty `type`. The deviations below are intentional and should be read alongside `docs/code-review-2026-07-07.md` (findings P8/P15).

## Intentional deviations

**`index.md` files carry frontmatter.** OKF §6 says index files contain no frontmatter (§11 permits only `okf_version` at the bundle root). In this corpus, index pages are first-class typed concepts (`type: "Index"`) so they participate in the graph, search, and the viewers like any other node. Consumers that follow the spec's permissive model (§9: tolerate unknown fields) handle this without issue.

**Repo validation is stricter than the spec.** `REQUIRED_FIELDS` in `scripts/update_viewer.py` requires `type`, `title`, `description`, and `timestamp`. Only `type` is required by OKF §4.1; the other three are spec-*recommended* and are promoted to mandatory here as repository policy so generated indexes, previews, and the timeline view are never degraded. This is a policy superset, not a claim about what OKF conformance requires.

**`log.md` carries frontmatter.** The spec does not define frontmatter for `log.md`; the validation tooling requires it (same policy as above). The body follows §7: date-grouped entries under `## YYYY-MM-DD` headings, newest first.

## Scope of validation

`scripts/check_okf.py` validates the hand-authored Markdown corpus only. `uk-government-apis/` is a generated large-corpus Explorer artefact (JSON descriptor + shards), not a Markdown OKF bundle, and is deliberately outside `check_okf.py`'s scope; it is exercised end to end in CI via the fixture-based generator run. Emitting a spec-conformant Markdown layer for that corpus (the `api-records/*.md` files its `concept_id` fields already reference) is tracked as P2 in the code-review completion plan.
