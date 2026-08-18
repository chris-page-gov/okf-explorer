# Build and publish OKF bundles consistently

Status: estate standard under implementation, 18 August 2026.

This methodology governs how an OKF repository turns reviewed source material
into generated bundle projections, documentation and a public release. It is a
lifecycle contract. It does not change OKF 0.2 or the semantic meaning of the
Bundle Wiki YAML-LD profile.

## The two contracts

Every governed OKF producer keeps two concerns separate:

| Contract | Answers | Does not answer |
| --- | --- | --- |
| `okf.semantic.json` | What is semantic authority, what is generated, and how relationships and Reader projections behave | Whether CI, documentation or deployment ran |
| `okf.publication.json` | Which source families, build planes, documentation, checks, deployment and live journeys govern publication | Whether a semantic assertion is true |

The repository's own reviewed commands remain authoritative. A shared checker
may validate or schedule them, but must not silently replace them with commands
copied from Explorer or another producer.

## Start with a publication-impact plan

Before editing publication-affecting material, record:

1. the authored source and source family;
2. the generated projections that depend on it;
3. the human documentation and `CHANGELOG.md` entry;
4. affected unit, conformance, browser and release checks;
5. the deployment target and immutable candidate identity; and
6. the exact post-deployment journey.

This plan is updated when investigation discovers another dependency. CI uses
the same dependency graph to select checks. The plan is not permission to skip
a required release gate: it is evidence for why a plane is affected or safely
unaffected.

## Standard publication planes

| Plane | Typical material | Invalidated by |
| --- | --- | --- |
| Source | Markdown, snapshots, spreadsheets or acquired envelopes | Source, rights, scope or inventory change |
| Semantic | YAML-LD, JSON-LD, contexts, schemas and assertion receipts | Identity, vocabulary, evidence or relationship change |
| Runtime | Explorer descriptor, records, shards, adjacency and locators | Projection schema, semantic or consumer change |
| Documentation | README, guides, methodology, generated reference pages and changelog | User-visible behaviour, commands, boundaries or release change |
| Application | Explorer source and deterministic application build | UI, dependency or application configuration change |
| Browser | Targeted journeys and optionally the full engine matrix | Interaction, accessibility, routing or browser-contract change |
| Release | Manifests, checksums, SBOMs, receipts, tags and candidate identity | Any byte bound by release evidence |
| Deployment | Pages or another host plus exact public routes | Published candidate, host configuration or route change |

A change may invalidate more than one plane. Hash-bound SBOMs, manifests and
receipts are regenerated whenever their bound bytes change, even if application
tests still pass.

## Documentation and changelog lockstep

When controlled source, generators, tests, workflows or publication contracts
change, the same pull request must include:

- documentation explaining any user, operator or assurance effect; and
- a concise `CHANGELOG.md` entry describing the material change and validation
  or publication boundary.

The publication contract lists controlled paths and recognised documentation
paths. CI checks the whole pull-request diff. Automated dependency changes do
not receive a blanket exception when they can change generated or release-bound
bytes.

Update documentation and the changelog while planning the change. The CI check
is the final backstop, not the first reminder.

## Dependency-routed validation

Run independent affected planes in parallel. A failure in one repository or
plane blocks only its dependants; it must not stop unrelated repository audits,
documentation work or tests.

Use these rules:

- fail closed when a changed path has no mapping;
- keep an explicit default for manual runs;
- build each deterministic artefact once, upload it and reuse its exact bytes;
- use content-addressed caches only for components whose inputs are completely
  declared;
- record job and expensive-step timings so the routing policy can be reviewed;
- bound network-dependent installation and acquisition steps; and
- never refresh mutable upstream data inside a candidate build unless that
  acquisition is the reviewed purpose of the run.

## Browser policy

Ordinary Chromium acceptance uses a compatible browser already installed on
the governed runner where possible. Do not run
`playwright install --with-deps chromium` merely to obtain a browser that the
runner already supplies.

Firefox, WebKit or a downloaded browser remain appropriate when a change affects
cross-engine behaviour or a release gate explicitly requires them. Their
installation must have a bounded timeout and should run only on the affected
assurance path. A targeted installed-Chrome path does not replace the full
matrix when the full matrix is genuinely required.

## Source-family intake

Every input belongs to a declared source family. The contract records its paths,
formats, authority, snapshot/inventory method, rights, sensitivity boundary,
extraction constraints and the planes it can invalidate.

### Folders of spreadsheets

A folder of Excel or OpenDocument workbooks is not one opaque source and is not
semantic authority merely because cells can be read. Before building:

1. inventory every file with relative path, bytes and SHA-256;
2. record workbook format and whether macros are present;
3. inventory visible, hidden and very-hidden sheets where the format supports
   them;
4. preserve raw values separately from displayed values and formulas;
5. identify named ranges, tables, merged cells, comments, external links,
   connections and embedded objects;
6. define header, blank-row, multi-table and repeated-sheet rules;
7. detect formula errors and stale cached results without executing macros;
8. record date system, locale and number-format assumptions;
9. assess personal, sensitive, licensed and access-controlled content; and
10. create stable source-row or source-cell evidence identities before semantic
    normalisation.

Macro execution, external refresh and formula recalculation are separate,
explicitly authorised acquisition operations. A safe default preserves the
original workbook, does not execute active content and reports unsupported or
ambiguous structures instead of guessing.

CSV companions are distinct representations. They do not preserve formulas,
sheet visibility, types or workbook structure, so a CSV export must not silently
replace its workbook as the evidence source.

## Candidate, merge and deployment

1. Build and validate one immutable candidate.
2. Record exact generated identities and assurance receipts.
3. Merge through the repository's protected workflow.
4. Confirm that deployment uses the merged commit and expected candidate bytes.
5. Open the exact public URL in a real browser.
6. Check page identity, the intended navigation journey and browser console.
7. Only then publish or recommend the URL.

A failed URL check is not permission to trigger an unrelated release rebuild.
Use the dependency graph to identify the smallest correction and repeat only
the affected planes and their required downstream gates.

## Estate registry

Explorer publishes two related registries:

- the semantic bundle registry lists public bundle descriptors, versions,
  profiles and routes; and
- the estate registry lists governed repositories, source families, declared
  tooling, lockstep status, CI/browser policy, publication mode and verification
  state.

The estate registry is generated from reviewed repository presets and bounded
governance metadata. It is an operational discovery aid, not proof that every
repository is currently conformant or deployed. Each entry reports its audit
state and evidence date explicitly.

[Open the browser-readable estate registry](../registry/estate/index.html), or
use its [`okf-estate-registry.json`](../okf-estate-registry.json) projection
from another tool. The authored source is
`registry/okf-estate-registry.yaml`; neither generated projection should be
edited by hand.

## Introducing another repository or source type

- add or review the repository reconciliation preset;
- declare `okf.semantic.json` and `okf.publication.json` independently;
- add the repository and any public bundle to the appropriate registry;
- define source-family intake before acquiring or transforming data;
- implement lockstep and affected-plane CI checks;
- prove a small deterministic fixture through the actual consumer;
- document unresolved formats and optimisation work in the estate backlog; and
- deploy only after repository-specific review and exact-route verification.

Do not copy a neighbouring repository's commands, scope claims or publication
mode merely because its data looks similar.
