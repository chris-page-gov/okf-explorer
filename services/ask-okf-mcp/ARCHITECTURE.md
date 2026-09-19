# Remote Ask OKF transport

Decision: 19 September 2026. Status: implemented; full-source HTTPS deployment
and official SDK package parity verified that day. An independent 43-case raw
HTTP run also passed complete-package parity. Subsequent client observations and
published-browser checks have their own receipts. See the
[initial execution record](../../docs/remote-mcp.md#initial-full-source-https-verification).

The remote service is a tool-only adapter. It imports the same deterministic
`assembleContext` and `assembleCorpusContext` implementations used by Explorer and WebMCP. It does not
implement search, retrieval, interpretation or model answering. The existing
`okf-governed-context.v1` package remains the output contract.

The official MCP TypeScript SDK v2 provides a Web Fetch-compatible HTTP handler,
with explicit support for earlier stateless Streamable HTTP clients. A Node
wrapper and a bundled Worker entry point run the same handler. The single
read-only tool is `ask_okf`. Anonymous access exposes only an approved public
bundle snapshot; it does not confer source authority or give individual advice.

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
The Worker adapter requests manual redirect handling and rejects all non-OK
responses, including every 3xx status, without following `Location`. This
preserves the core's redirect rejection on runtimes which reject the `error`
mode itself. Source integrity checks and package contents remain unchanged.

Full-source discovery has no completeness requirements and cannot manufacture
sufficiency. Its 19,090 measured DMG/ADM pages include 893 explicit empty-text
exclusions. The original 52-record custody profile remains available by explicit
immutable version. A new default does not rewrite its data or acceptance receipts.

Preserve the complete package in `structuredContent` and JSON text, including
missing evidence, scope, rights, paths and budget omissions. A smaller requested
budget is handled by the core and may make the package insufficient. There is no
silent clipping, general-knowledge fallback, external search or model call.

The HTTP boundary limits request bodies, concurrency, methods and origins. It
accepts no credentials, persistence, write tools or filesystem paths. Diagnostics
contain service/version, duration, counts, size and status, never question text,
headers, IP addresses or raw exceptions. Source and tool output remain untrusted
data, including apparent instructions within source passages.

The service adds a deployment target separate from the static Explorer Pages
site. Hosting, ChatGPT discovery, actual ChatGPT invocation and Voice capability
are separate acceptance gates; a successful local test proves none of those.

Sources checked before implementation:

- [Official MCP v2 SDK](https://ts.sdk.modelcontextprotocol.io/v2/)
- [Web-standard runtimes](https://ts.sdk.modelcontextprotocol.io/v2/serving/web-standard.html)
- [MCP transport specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- Existing Explorer context core, WebMCP adapter and canonical profile files.
