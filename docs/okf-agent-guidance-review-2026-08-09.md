# Review of OKF repository guidance and portable agent packaging

Date: 2026-08-09

## Outcome

The baseline review found a coherent OKF production method distributed across
domain repositories. The implementation recorded by this document now makes
that method available to an unfamiliar agent through one portable workflow,
repository-local machine-readable contracts and bounded guidance blocks.

`okf-uk-living` is the strongest single **application exemplar**: it makes an
ontology understandable through everyday citizen journeys while retaining a
named denominator, jurisdiction variants, source and assertion status,
authority/redress, competency questions, population assurance, specialist
review, and publication boundaries. It is not the sole normative template.
The most reusable baseline combines:

- `okf-explorer` for OKF core, profiles, consumers, compatibility, Foundry, and
  evaluation;
- `okf-uk-living` for citizen-centred ontology, vertical slices, corpus
  population, and educational presentation;
- `okf-LandRegistry` for domain handoff, dependency graphs, exact-digest gates,
  and release assurance;
- `okf-ons` for metadata-evidence and bounded acquisition semantics; and
- `okf-govuk-content` plus `okf-uk-legislation` for immutable acquisition,
  large-corpus, model-derived, restart, and release controls.

The new `okf-repositories` Agent Plugin packages that synthesis as a focused
skill, references, a read-only inspector, and an adaptable `AGENTS.md`
template.

## Scope reviewed

- `okf-explorer`
- `okf-ai-infrastructure`
- `okf-govuk-content`
- `okf-ons`
- `okf-uk-government-apis`
- `okf-uk-legislation`
- `okf-LandRegistry`
- `okf-uk-living`
- the populated, non-Git `okf-testing` conformance-fixture workspace

The review compared repository guidance, authored/generated boundaries,
descriptors, source and assertion semantics, build and validation entrypoints,
evaluation, release state, and publication rules. It did not rerun every
repository's complete release suite.

## Findings

### P1 — The shared operating contract is implicit and fragmented

The strongest safeguards recur with different wording and depth across eight
`AGENTS.md` files. The shortest files are only a few lines; the longest contain
domain-specific acquisition semantics. An unfamiliar agent must reconstruct
the common method before it can decide which rules are portable and which
belong only to statistics, legislation, GOV.UK content, land registration, or
life-course services.

Consequence: an agent can over-apply a domain rule, miss a cross-repository
invariant, or spend context repeatedly rediscovering the same source/generated,
authority, denominator, and publication boundaries.

Correction: keep concise repository-specific `AGENTS.md` files and install or
invoke the portable `work-with-okf-repositories` skill for the shared method.

### P1 — Local, candidate, publication, and release state require an explicit read order

The strongest repositories correctly preserve multiple state planes. For
example, `okf-uk-living/okf-explorer.json` remains a local-evaluation
descriptor, while `publication/okf-explorer.json` records the separately
authorized preview. Generated assurance retains the pre-publication candidate
state. These are not contradictions, but an agent that reads one convenient
file can report the wrong current publication claim.

Consequence: population-complete, release-grade, publication-authorized,
deployed, and browser-verified can be collapsed into one inaccurate status.

Correction: require the agent to read status, candidate, publication unit, and
deployment verification as separate evidence and report each gate explicitly.

### P2 — OKF core and Explorer profile boundaries are clearest in documentation, not every agent file

`docs/okf-conformance.md` correctly keeps the permissive OKF v0.2 Markdown core
separate from richer Explorer, YAML-LD, JSON-LD, SHACL, large-corpus,
federation, and Foundry profiles. Several producer `AGENTS.md` files assume
that context without linking or restating the distinction.

Consequence: an agent can reject a valid core bundle for lacking profile fields
or present a local profile convention as universal OKF.

Correction: make core/profile classification an orientation step and include
it in all new agent guidance.

### P2 — Validation commands are intentionally heterogeneous but hard to discover uniformly

The repository family uses locked `uv`, pinned virtual-environment Python,
plain Python, Node, shell, Make, targeted check modes, and release reproduction
profiles. Translating one repository's commands into another environment can
break evidence identity; loading every README to find the right commands is
slow.

Correction: extract exact commands from local guidance, prefer check modes for
diagnosis, and never invent a common build command. The plugin's inspector
reports commands declared in root `AGENTS.md` without executing them.

### Resolved P2 — `okf-explorer/okf.config.json` retained a stale v0.1 profile label

The baseline root Markdown and generated bundle declared OKF v0.2 while
`okf.config.json` still labelled the profile `OKF v0.1 + explorer bundle`.

Consequence: tools or agents that use the configuration label during
orientation can report the wrong producer version even though the generated
bundle is correct.

Resolution: the configuration label now declares OKF v0.2 and the affected
runtime and semantic projections have been rebuilt and checked.

### Resolved P3 — The fixture workspace lacked an implementation contract

At baseline, `okf-testing` was an empty non-Git directory and therefore
provided no test contract despite its name. Editor state and unrelated
working-tree changes elsewhere remained repository hygiene concerns and were
deliberately not treated as migration inputs.

Resolution: `okf-testing` now contains a defined, executable fixture contract
with digest-bound positive, negative and sparse-compatibility expectations. It
intentionally remains non-Git and non-publishable. Agents must still inspect
and preserve each working tree and keep editor state ignored.

## Why a plugin rather than one enormous `AGENTS.md`

OpenAI's current guidance treats `AGENTS.md` as always-loaded repository
instruction context, with nested files providing more specific overrides. A
skill is loaded only when its trigger matches. The portable OKF method is too
large and too cross-repository for every root prompt, while domain paths,
commands, prohibitions, and publication authority must remain local.

The recommended split is:

- root `AGENTS.md`: repository role, authored/generated paths, exact commands,
  domain prohibitions, stop conditions, and publication authority;
- portable skill: orientation, task lanes, common evidence semantics, change,
  acquisition, evaluation, and release workflows;
- references: detailed contract, repository archetypes, and review rubric;
- asset: a template for new or repaired repository guidance; and
- script: deterministic, read-only orientation without loading a large corpus.

## Agent Plugins v1 packaging decision

The linked ExplainX article was published one day after the announcement and
correctly warned that the manifest shape was not then documented. The live
Agent Plugins v1.0.0 working draft now defines:

- root `plugin.json` with the canonical schema identifier;
- skills as immediate children under fixed `skills/`;
- optional root `mcp.json`; and
- client-specific behavior only through namespaced extensions.

The package therefore uses the portable root `plugin.json`. It also retains
`.codex-plugin/plugin.json` as a compatibility manifest for the currently
documented Codex local-plugin workflow. No MCP server is included: the skill
needs repository files and ordinary local validation, not a live authenticated
service. No marketplace entry or installation was created implicitly.

## Recommended adoption

1. Validate and forward-test the plugin with query, review, bounded change,
   incomplete-input, and should-not-trigger prompts.
2. Add a short link from each maintained OKF repository's `AGENTS.md` to the
   shared plugin or copy only the relevant repository-specific sections from
   its template.
3. Use `okf-explorer` as the distribution home and version the plugin
   independently from OKF core and Explorer releases.
4. Keep the now-correct Explorer v0.2 configuration label synchronized with
   generated descriptors.
5. Keep `okf-uk-living` as the primary educational/application showcase while
   describing the other exemplars as complementary assurance patterns.

## Standards and guidance consulted

- [Agent Plugins Specification v1.0.0](https://agent-plugins.org/specification)
- [Build an Agent Plugin](https://agent-plugins.org/plugin-authors)
- [OpenAI: package your plugin](https://developers.openai.com/plugins/build/plugins)
- [OpenAI: build skills](https://developers.openai.com/plugins/build/skills)
- [OpenAI: custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [ExplainX announcement review](https://explainx.ai/blog/agent-plugins-openai-standard-aws-cursor-github-vscode-2026)
