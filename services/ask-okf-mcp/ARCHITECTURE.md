# Remote Ask OKF transport

Decision: 19 September 2026; updated 20 September 2026 for service 0.4.0.
The original full-source HTTPS deployment and official SDK package parity were
verified on 19 September. An independent 43-case raw HTTP run also passed
complete-package parity. Those are historical observations. The new combined
staff-profile candidate has separate local verification; hosting and client
acceptance require new receipts. See the
[initial execution record](../../docs/remote-mcp.md#initial-full-source-https-verification).

The remote service is a tool-only adapter. It imports the same deterministic
`assembleContext` and `assembleCorpusContext` implementations used by Explorer and WebMCP. It does not
implement search, retrieval, interpretation or model answering. The existing
`okf-governed-context.v1` package remains the output contract.

The official MCP TypeScript SDK v2 provides a Web Fetch-compatible HTTP handler,
with explicit support for earlier stateless Streamable HTTP clients. A Node
wrapper and a bundled Worker entry point run the same handler. Three read-only
tools expose the same governed context: `ask_okf` returns the complete package,
`ask_okf_manifest` returns a bounded catalogue, and `read_okf_evidence` returns
exact verified slices. Anonymous access exposes only allow-listed immutable
public source versions; it does not confer source authority or give individual
advice. Compact delivery changes transfer size, not evidence selection.

At build time, verify the vendored OKF-DWP corpus manifest and historical descriptor/context-index bytes
against fixed SHA-256 values and compose the existing canonical package schema
from local references. At request time, accept only a logical bundle identifier
and allow-listed immutable version. No request can supply a URL. Default corpus
requests retrieve only files listed by the verified manifest under its immutable
GitHub commit and directory; each compressed and decoded digest is checked by
the shared core. The service caches verified public file bytes within an 8 MiB,
64-file bound. Historical custody requests remain entirely vendored. The pinned
index or manifest URL and digest bind every package, allowing parity with
Explorer and direct engine calls. The default corpus manifest path matches the
additive Explorer descriptor's path, not a different alias for identical bytes.
Build identity is portable across real and symlinked locked dependency
installations. Esbuild preserves the logical dependency paths, so external
installation locations do not enter generated comments or the project-source
receipt. The build script itself, package lock and runtime inputs are hash-bound.
A regression builds both layouts in a relocated checkout and compares Worker,
Node and receipt bytes. The original path-dependent local observation remains
[archived with its actual Worker hash](validation/history/0.4.0-symlink/classification.json);
it is not relabelled as the later CI-equivalent build. Integration was rerun
against the corrected build, and CI still requires the exact new receipt hash.

The Worker adapter requests manual redirect handling and rejects all non-OK
responses, including every 3xx status, without following `Location`. This
preserves the core's redirect rejection on runtimes which reject the `error`
mode itself. Source integrity checks and package contents remain unchanged.

The default combined DMG/ADM corpus includes 40 proposed staff-task evidence
profiles and 203 explicit open obligations. Its contexts remain insufficient
while scope, evidence closure, legal version, applicability and independent
review are unresolved. Its 19,090 measured pages include 893 explicit empty-text
exclusions. Legal references provide navigation metadata, not statutory text or
accepted applicability.

The earlier `bf50ef8d91b9f1ccc2cbdb354198eae74c9ed752` full-source discovery
corpus remains separately available with its original manifest and no complete
evidence requirements. The original 52-record custody profile remains available
at `efb05c66616a9cd4328a86cf412780fe7bc7cf0b`. Its bounded historical acceptance
does not establish broad or current-law sufficiency. A new default does not
rewrite either earlier version, context identity or acceptance receipt.

Preserve the complete package in `structuredContent` and JSON text, including
missing evidence, scope, rights, paths and budget omissions. A smaller requested
budget is handled by the core and may make the package insufficient. There is no
silent clipping, general-knowledge fallback, external search or model call.

Compact reads require the same question, approved version, budget and context
identifier. The service reassembles that context and rejects mismatches before
returning a selected record or slice. Browser review links contain this replay
recipe in a fragment. They are inert until the user selects **Recreate evidence**;
there is no stored audit log or AI-answer replay.

The HTTP boundary limits request bodies, concurrency, methods and origins. It
accepts no credentials, persistence, write tools or filesystem paths. Diagnostics
contain service/version, duration, counts, size and status, never question text,
headers, IP addresses or raw exceptions. Source and tool output remain untrusted
data, including apparent instructions within source passages.

HTML responses request `Cache-Control: no-store, no-transform` while retaining
the existing Content Security Policy. Other responses retain `no-store`. This
follows [Cloudflare’s documented JavaScript Detections behaviour](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-your-origin-sends-a-no-transform-header);
it does not establish how every hosting layer handles scripts or cookies.

The service adds a deployment target separate from the static Explorer Pages
site. Hosting, ChatGPT discovery, actual ChatGPT invocation and Voice capability
are separate acceptance gates; a successful local test proves none of those.

Sources checked before implementation:

- [Official MCP v2 SDK](https://ts.sdk.modelcontextprotocol.io/v2/)
- [Web-standard runtimes](https://ts.sdk.modelcontextprotocol.io/v2/serving/web-standard.html)
- [MCP transport specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- Existing Explorer context core, WebMCP adapter and canonical profile files.
