# Remote Ask OKF transport

Decision: 19 September 2026. Status: implementation candidate.

The remote service is a tool-only adapter. It imports the same deterministic
`assembleContext` implementation used by Explorer and WebMCP. It does not
implement search, retrieval, interpretation or model answering. The existing
`okf-governed-context.v1` package remains the output contract.

The official MCP TypeScript SDK v2 provides a Web Fetch-compatible HTTP handler,
with explicit support for earlier stateless Streamable HTTP clients. A Node
wrapper and a bundled Worker entry point run the same handler. The single
read-only tool is `ask_okf`. Anonymous access exposes only an approved public
bundle snapshot; it does not confer source authority or give individual advice.

At build time, verify the vendored OKF-DWP descriptor and context-index bytes
against fixed SHA-256 values and compose the existing canonical package schema
from local references. At request time, accept only a logical bundle identifier
and allow-listed immutable version. No request can supply a URL; no source is
fetched at runtime. The original immutable index URL and digest bind every
returned package, allowing exact parity with Explorer and direct engine calls.

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
