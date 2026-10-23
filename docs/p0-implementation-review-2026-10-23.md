# P0 whole-implementation review

Review date: 23 October 2026. Executable baseline:
`460f7245352e5d1e407d37e9d40a9b2b6b55ee0a`.
Architecture-plan commit `d1fceb23` changes documentation only.

Status: source review completed; six initial findings corrected in #178, with
two additional dependency corrections from the post-merge alert refresh. Candidate
acceptance and publication remain bound to exact pull-request checks and
deployment receipts. This is a risk-based integration review of the whole
implementation, not an exhaustive line-by-line audit or certification.

## Scope and method

Follow the [P0 architecture plan](architecture-and-implementation-plan.md#a-review-the-whole-implementation-through-its-boundaries):
inventory first-party executable material, review entry points and trust
boundaries, compare contracts and tests, reproduce defects, add regression
checks and run affected assurance planes. Two independent automated review
passes cover the engine/transports and remaining source/build/Reader
boundaries. The lead also reviews and implements corrections. Requested
independent-review settings were GPT-6 Luna, Medium; actual resolved settings
were not exposed by the review tools.

The [coverage inventory](../validation/p0-review/2026-10-23/coverage.json)
records baseline hashes, component responsibilities, review depth, findings
and exclusions. Inventory membership does not imply independent review of
every line.

| Component | Coverage and outcome |
| --- | --- |
| Context engine, corpus discovery, allocation and exact delivery | Independent current-source/control-flow review and engine mutation/contract tests; no additional validated finding |
| Remote MCP, source admission and versioned replay | Service/adapters, immutable source/engine policy, bounded protocol and Worker tests; R5; historical engines unchanged |
| Retained context archive | Independent runtime, schema, export, reconstruction and archive tests; no additional validated finding |
| Source loaders, rich graph and search worker | Risk-based URL/range/hash/snapshot and query-boundary review, with existing application regressions; no additional validated finding |
| Workbench, reading help, passage review and PDF | Fetch/parse/render/export boundaries and source-bound negative controls; R1; proposal adoption remains separate |
| Reader, navigation, persistence and specialist views | Rendering sinks, URL/state and storage boundaries, existing component/browser coverage; R3; human accessibility and comprehension excluded |
| Compatibility app, service worker and generated viewer | Startup, cache lifecycle and embedded-graph serialisation review; R2–R4 |
| Semantic generators, Foundry, evaluation and publication | Central parser/validators, source/projection boundaries, cache/receipt/promotion logic, impact routing and CI; existing deterministic contracts; R6 in the governed Python dependency lock |
| Isolated controlled-language research | Reuse the unchanged #163 review boundary and reproduce its offline controls; no live model or compliance claim |

## Findings and corrections

### R1 — Redirected evidence requests and stalled workbench loads

Priority: P2. Affects `workbench.ts`, `readingHelp.ts` and `passages.ts` under
`apps/okf-explorer/src/lib/evidence`.

These loaders checked a changed response URL after the browser had followed a
redirect. An admitted URL could therefore contact an unadmitted destination
before rejection. Workbench loads also lacked their own deadline, allowing a
stalled response to leave the interface waiting indefinitely.

Correction: use `redirect: 'error'` in all three loaders and combine a
15-second workbench deadline with caller cancellation. Preserve byte ceilings,
identity checks and stream cancellation. Tests exercise the production loader
calls, redirect options, timeout and caller abort.

### R2 — Compatibility worker deletes unrelated origin caches

Priority: P2. Affects `explorer/service-worker.js`.

Activation deleted every origin cache except its fixed current name. Other
applications sharing the GitHub Pages origin could lose offline data. Fallback
also searched across origin caches; failed cache writes could produce an
unhandled rejection.

Correction: namespace caches by worker registration scope, delete only older
entries in that namespace and use only that cache for fallback. Preserve
unrelated and historical unscoped caches. Wait for writes and handle storage
failure without failing a successful network response. Executable worker tests
cover activation, offline isolation, cache misses and write failures.

### R3 — Invalid saved pins stop compatibility startup

Priority: P2. Affects `explorer/app.js`.

The top-level initialiser parsed local storage without error handling and
passed its value directly to `Set`. Malformed JSON, a non-iterable value or
storage-access failure stopped startup before bundle loading. Non-string
entries could break later pin processing.

Correction: read defensively, require an array and retain only strings.
Tests execute production initialisation against malformed, wrong-shaped,
mixed-type and unavailable storage.

### R4 — Source text can terminate the embedded viewer script

Priority: P1. Affects `scripts/update_viewer.py` and generated `viewer.html`.

The generator inserted JSON containing Markdown bodies directly into an HTML
script element. JSON quoting does not stop the HTML parser recognising a
closing script tag. Imported or authored source text containing that sequence
could escape its data context when the generated viewer opened.

Correction: escape HTML-significant characters and JavaScript line separators
before embedding. The regression includes mixed-case closing tags, an injected
script, separators and a pound sign; decoding must recover the exact original
graph. Regenerate the viewer through its authoritative script.

### R5 — Affected Zod version in the service lockfile

Priority: P1 dependency remediation. Affects the remote service package and
lockfile. A fresh audit reported the high-severity
[Zod resource-consumption advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
against 4.6.5; the advisory lists 4.6.6 as patched. This review does not
demonstrate a service exploit or override its existing request limits.

Correction: pin compatible 4.6.7, preserve other dependencies and source/engine
identities, rebuild and run both SDK generations and Worker checks. The
post-update audit reports no known vulnerabilities. This source merge does not
redeploy the independently hosted service; its [deployment record](remote-mcp-publication.md)
retains its original scope.

### R6 — Python lockfile retains versions affected by 44 alerts

Priority: P1 dependency remediation. GitHub reported 44 open version alerts
against `uv.lock`, covering Pillow, certifi, multidict and urllib3, including
critical and high severities. These are dependency advisories, not a claim that
this review exploited the application. See the bounded
[alert and version comparison](../validation/p0-review/2026-10-23/python-advisories.json).

Correction: allow Pillow 13 in the development dependency group and update
only those four locked packages. Retain CPython 3.12.11, uv 0.12.2 and the
other resolved dependencies. Keep multidict on its patched 6.x line. Declare
resolution constraints and test the reviewed minimum versions so a later lock
refresh cannot silently reintroduce these versions. Rerun deterministic Python
and publication checks; current-head CI remains the merge gate.

The [Pillow 13 release notes](https://pillow.readthedocs.io/en/stable/releasenotes/13.0.0.html)
and the [certifi](https://github.com/advisories/GHSA-6q48-6c7w-9gw2),
[multidict](https://github.com/advisories/GHSA-54p9-h82j-f925) and
[urllib3](https://github.com/advisories/GHSA-vxq7-64xx-v4gw) advisories support
the reviewed update boundaries. The comparison covers the retained alert set;
GitHub's default-branch alert state updates separately after merge.

## Assurance and release gate

### Post-merge dependency refresh

GitHub closed all 44 Python alerts after #178 merged as
`abc26ef2fef55bcc63f5e6ceb04d781f13c01654`. Its refreshed graph then exposed
eight additional low/moderate JavaScript alert records. These represent two
SvelteKit advisories duplicated across the manifest and lockfile, and four
fast-uri advisories. They are recorded separately from the initial inventory.

**R7 — SvelteKit dependency, P2:** upgrade 2.70.3 to patched 3.0.0 and static
adapter 4.0.0. The [enhanced-form redirect advisory](https://github.com/sveltejs/kit/security/advisories/GHSA-pfhg-q3qv-9q6r)
and [prerender header advisory](https://github.com/sveltejs/kit/security/advisories/GHSA-27mw-82g8-phjj)
have no established trigger in authored Explorer code: it uses neither
enhanced form actions nor untrusted cache-control headers. Apply the upstream
package correction regardless. Follow the [official migration guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3):
move settings into Vite, extend the framework type configuration and declare
the existing source alias explicitly. Preserve adapter settings, relative paths,
prerender exceptions and deterministic version identity. Set deployment polling
to zero to preserve the earlier behaviour. Keep Node 24 and existing Svelte,
Vite and TypeScript versions. Replace the broad cookie override with a
conditional floor so Kit 3 uses its required cookie 2.0.1 dependency.

**R8 — fast-uri dependency, P2:** update only the service lockfile's
development-only 3.1.8 to patched 3.1.9. The legacy test SDK reaches it through
Ajv; production service source does not import it, and the Worker build excludes
that provider. The upstream advisories cover
[scheme decoding](https://github.com/fastify/fast-uri/security/advisories/GHSA-w74x-v6f9-j3xg),
[relative paths](https://github.com/fastify/fast-uri/security/advisories/GHSA-xhq7-xmqj-769h),
[host canonicalisation](https://github.com/fastify/fast-uri/security/advisories/GHSA-wjr9-j795-jxcr)
and [suffix references](https://github.com/fastify/fast-uri/security/advisories/GHSA-333x-w4r6-6crp).
Preserve its development-only scope and existing immutable engine/source pairs.

An independent read-only pass checked applicability and migration boundaries.
The follow-up retains the same current-head checks and exact-deployment gate.
Retain its [eight alert records](../validation/p0-review/2026-10-23/framework-follow-up/advisories.json)
and [preceding browser evidence](../validation/p0-review/2026-10-23/framework-follow-up/pre-review/preservation.json)
alongside the refreshed application-bound receipt.

### Candidate validation

Targeted regressions cover all corrections. Engine controls, archive tests,
application and Python contracts, deterministic builds, service tests and the
selected browser/Foundry jobs provide wider integration evidence. Exact
candidate outcomes belong to the pull-request checks and retained CI artefacts;
a list of required checks is not a claim they passed.

Preserve the previous Heritage candidate receipt and compressed results
[byte for byte](../validation/p0-review/2026-10-23/pre-review/preservation.json).
Refresh the 100-question browser suite and three local journeys against the
new assembled application, then materialise its build-bound receipt. Source
snapshot dates and historical failures remain intact.

Merge only after every required current-head check passes. Then verify the
exact deployed commit, identity and intended journey in a real browser. A
failure remains a blocker. Static-site and independent MCP-service deployments
are separate operations.

No unresolved critical or high first-party code finding was identified in the
reviewed boundaries after correction. Residual limits are explicit: lines
outside the selected boundary paths, upstream/vendored code, independently
owned corpora, live providers, restricted-data controls, domain/legal
acceptance, human accessibility and current AI-host/Voice compatibility. Those
remain separate P1–P3 or producer assurance work.
