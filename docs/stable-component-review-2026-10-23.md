# Stable component review

Checked on 23 October 2026 at 22:37 UTC. This is a dated release-currency
snapshot for the P0 follow-up. `latest` is not the same as an LTS designation
or a tested compatible release. Prerelease tags are excluded. The
[machine-readable comparison](../validation/p0-review/2026-10-23/framework-follow-up/stable-components.json)
retains the same decisions.
The baseline is merged commit `abc26ef2`, before PR #181. The superseded,
unmerged Kit 3.0 candidate has separately retained evidence; it is not the
selected release in this comparison.

| Component | Earlier baseline | Selected candidate | Current stable or relevant line | Decision |
| --- | --- | --- | --- | --- |
| [SvelteKit](https://registry.npmjs.org/%40sveltejs%2Fkit) | 2.70.3 | 3.1.0 | 3.1.0 | Update: Current stable release; retain the reviewed Kit 3 migration. |
| [Svelte](https://registry.npmjs.org/svelte) | 5.57.1 | 5.57.2 | 5.57.2 | Update: Compatible patch in the existing major line. |
| [Static adapter](https://registry.npmjs.org/%40sveltejs%2Fadapter-static) | 3.0.10 | 4.0.0 | 4.0.0 | Update: Required compatible adapter for Kit 3. |
| [Svelte Vite plugin](https://registry.npmjs.org/%40sveltejs%2Fvite-plugin-svelte) | 7.3.1 | 7.3.1 | 7.3.1 | Retain: Already current stable. |
| [Vite](https://registry.npmjs.org/vite) | 8.3.3 | 8.3.5 | 8.3.5 | Update: Compatible patch in the existing major line. |
| [Svelte checker](https://registry.npmjs.org/svelte-check) | 4.7.6 | 4.7.7 | 4.7.7 | Update: Compatible patch; published TypeScript peers remain 5.x or 6.x. |
| [Vitest and coverage](https://registry.npmjs.org/vitest) | 4.1.12 | 4.1.12 | 5.0.5 | Proposed: Retain the supported V4 tag; assess the coupled major upgrade separately. |
| [Application TypeScript](https://registry.npmjs.org/typescript) | 6.0.3 | 6.0.3 | 7.0.2 | Proposed: Kit 3.1 and the current checker require TypeScript 6; do not force a peer-incompatible major. |
| [Service TypeScript](https://registry.npmjs.org/typescript) | 7.0.2 | 7.0.2 | 7.0.2 | Retain: Already current stable in its separate service toolchain. |
| [PDF.js](https://registry.npmjs.org/pdfjs-dist) | 6.4.299 | 6.4.299 | 6.4.299 | Retain: Already current stable. |
| [Playwright](https://registry.npmjs.org/%40playwright%2Ftest) | 1.64.1 | 1.64.1 | 1.64.1 | Retain: Already current stable; do not select next or beta tags. |
| [axe browser checks](https://registry.npmjs.org/%40axe-core%2Fplaywright) | 4.14.0 | 4.14.0 | 4.14.0 | Retain: Already current stable. |
| [YAML parser](https://registry.npmjs.org/yaml) | 2.9.1 | 2.9.1 | 2.9.1 | Retain: Already current stable; 3.0.0-2 is a prerelease. |
| [MCP Node adapter](https://registry.npmjs.org/%40modelcontextprotocol%2Fnode) | 2.0.0 | 2.0.0 | 2.1.2 | Proposed: Assess with the server/client pair as one transport update. |
| [MCP server](https://registry.npmjs.org/%40modelcontextprotocol%2Fserver) | 2.3.1 | 2.3.1 | 2.4.0 | Proposed: Retain the reviewed adapter and replay baseline during P0; assess the coupled pair separately. |
| [MCP client](https://registry.npmjs.org/%40modelcontextprotocol%2Fclient) | 2.3.0 | 2.3.0 | 2.4.0 | Proposed: Keep paired transport regression evidence before adopting this release. |
| [Legacy MCP test SDK](https://registry.npmjs.org/%40modelcontextprotocol%2Fsdk) | 1.32.0 | 1.32.0 | 1.32.2 | Proposed: Include in the bounded transport refresh; its vulnerable URI dependency is corrected now. |
| [Zod](https://registry.npmjs.org/zod) | 4.6.7 | 4.6.7 | 4.6.7 | Retain: Already patched and current stable. |
| [Service esbuild](https://registry.npmjs.org/esbuild) | 0.28.2 | 0.28.2 | 0.28.2 | Retain: Already current stable. |
| [fast-uri](https://registry.npmjs.org/fast-uri) | 3.1.8 | 3.1.9 | 4.2.3 | Update: Use the current patched three tag, compatible with Ajv; the latest major is not required. |
| [Rolldown](https://registry.npmjs.org/rolldown) | 1.2.9 | 1.2.9 | 1.2.15 | Proposed: Retain the explicitly reviewed native bundler override; assess a dedicated patch change. |
| [pnpm](https://registry.npmjs.org/pnpm) | 10 / local 10.33.2 | 10.34.7 | 12.15.0 | Update: Pin the current latest-10 patch; retain the governed major and lockfile format. |
| [Node LTS](https://nodejs.org/dist/index.json) | 24 (floating) | 24.22.1 | 24.22.1 in 24.x | Update: Pin the current security release in the existing LTS line. |
| [Node Current test jobs](https://nodejs.org/dist/index.json) | 26.7.0 | 26.12.1 | 26.12.1 in 26.x | Update: Replace the older explicit pin with the current security release; retain the existing two-line CI coverage. |
| [CPython](https://www.python.org/doc/versions/) | 3.12.11 | 3.12.11 | 3.15.1 overall; 3.12.15 in 3.12 | Proposed: The supplied repository instructions require the exact governed runtime. Prioritise a separate patch-policy transaction to 3.12.15 before considering another minor. |
| [uv](https://pypi.org/pypi/uv/json) | 0.12.2 | 0.12.2 | 0.13.5 overall; 0.12.24 in 0.12 | Proposed: Retain the explicit required-version and setup contract. Assess the 0.12.24 patch with the governed Python transaction; a 0.13 upgrade can change behaviour. |

## Scope and follow-up acceptance

The current change updates Kit and its compatible adapter, applies three
framework/checker patches, pins pnpm within its existing major, and pins
Node security releases in the existing LTS/Current CI lines. See the
[Node security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
The application type check, deterministic build, full browser matrix and
exact Pages journey must pass on the final candidate. The runtime pins
apply to CI; hosted MCP release evidence remains a separate acceptance plane.

Proposed changes are separate maintenance transactions, not claims of
implementation or permission to change the supplied runtime contract:

- Prioritise CPython 3.12.15 and uv 0.12.24 as one governed patch review.
  Update the instructions, runtime pin, required uv version, setup action,
  lockfile metadata and toolchain tests together; retain Ubuntu latest and run
  the full Python/publication checks before deployment. The current task
  continues to use the explicitly required CPython 3.12.11 and uv 0.12.2.
- Assess the MCP Node adapter, server, client and legacy SDK together.
  Preserve immutable engine/source pairs, both client generations, Worker
  exclusions, package audits and the service browser contract. Hosting requires
  its own observation.
- Assess Vitest 5 with matching coverage and mocks, including failure tests
  and coverage interpretation. Keep application TypeScript 6 until the
  framework and checker publish compatible TypeScript 7 peers.
- Review the Rolldown patch and native bindings separately, then repeat the
  deterministic build and affected browser checks before changing its override.

The [uv version policy](https://docs.astral.sh/uv/reference/policies/versioning/)
explains why its minor releases need a compatibility review. A stable tag or
a package audit alone does not prove application behaviour or domain correctness.
