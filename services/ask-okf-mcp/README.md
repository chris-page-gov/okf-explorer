# Ask OKF remote MCP service

A tool-only remote transport for Explorer's existing governed context assembly
engine. It serves one approved public OKF-DWP snapshot anonymously. It makes no
model calls and requires no API key. This is an independent experiment, not an
official DWP service or individual benefits advice.

## Run and check

Use Node 22 or later from the repository root:

```sh
cd services/ask-okf-mcp
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm start
```

The local development endpoint is `http://127.0.0.1:8787/mcp`. The equivalent
`/okf/mcp` route avoids a hosting-platform-reserved `/mcp` path; the public
landing page advertises `/okf/mcp`. Both routes use the same handler and tool.
`GET /health`
verifies the vendored bundle and reports its immutable identity. `ASK_OKF_PORT`
changes the local port. The Node wrapper binds loopback deliberately. HTTPS
production hosting uses the Worker build, `dist/server/index.js`, whose default
export implements `fetch(request)`. It has no Node or Ajv dependency and is tested
with dynamic code generation prohibited. Build metadata is in
`dist/build-receipt.json`. Host and origin allow-lists are deployment-owned source
configuration in `src/service.ts`, not caller-supplied parameters.

## Tool contract

`ask_okf` accepts this object:

```json
{
  "bundle": "okf-dwp",
  "version": "efb05c66616a9cd4328a86cf412780fe7bc7cf0b",
  "question": "A claimant is imprisoned. Explain the effect on JSA, IS, State Pension Credit and ESA, distinguishing loss of payment from loss of entitlement, and trace each conclusion to the relevant DMG guidance."
}
```

`version` is optional; omission selects that same pinned revision. Arbitrary URLs,
unknown bundles/versions and extra fields are rejected. An optional `budget`
accepts `max_nodes`, `max_relationships`, `max_depth` and `max_bytes`, with the
existing core limits. A lower budget can produce an insufficient package.

The response's `structuredContent` is the unchanged `okf-governed-context.v1`
package. Its sole text content block is JSON for the same complete package.
There is no answer wrapper or second schema. The output contract composes
[the canonical package schema](../../profiles/context-assembly/v1/package.schema.json)
and local common definitions. All selection, evidence status, scope, provenance,
paths and omissions come from the shared core. HTTP timings remain outside the
reproducible evidence package.

The official SDK 2.0.0 serves current `2026-07-28` requests and stateless legacy
Streamable HTTP. Tests use both the current SDK with the protocol pinned and
SDK 1.30.0. Legacy responses are SSE; current responses are JSON. Standalone
GET streams, sessions, write tools and subscriptions are not supported. No
`search`/`fetch` pair is needed for ordinary one-call context assembly; this
service does not claim ChatGPT Deep Research compatibility.

## Security and operational limits

- No runtime fetching: vendored index and descriptor hashes are checked during
  build and before first use. Provenance URLs are data, never fetch targets.
- Maximum 32 KiB request body, 2,000-character question and 10-second body-read
  deadline. Encoded bodies, batch requests and URL query parameters are rejected.
- Four admitted requests at once and 120 per minute per process/isolate. These
  protect a single instance; hosting must provide any deployment-wide quota or
  distributed denial-of-service protection.
- Origins are exact HTTPS allow-list entries. Requests without Origin are
  permitted for remote non-browser MCP clients. Host checks prevent DNS rebinding.
- No cookies, credentials, user identities, saved questions or cross-request
  evidence cache. Do not send personal claimant data.
- Diagnostics contain tool/service/bundle version, elapsed time, considered and
  selected record/assertion counts, selected path-step count, package size,
  evidence status, truncation and fixed error codes. They exclude question text,
  raw input, source text, IP addresses, headers and raw exception strings.
- `traversed_path_steps` counts steps in retained explanatory paths; it is not a
  claim to instrument every internal graph operation. Considered counts describe
  the supplied index. Hosting access logs have their own retention policy.
- Tools are annotated read-only, idempotent and closed-world. Those annotations
  are hints, not a security boundary. Source text, tool descriptions and returned
  data remain untrusted inputs to any AI client.
- Complete packages are about 0.5 MiB; JSON text plus structured content can make
  the MCP response approximately 1 MiB. A client must ingest the complete result
  or disclose its own limit; this service never silently clips it.

## Assurance and deployment

Tests cover immutable hashes, current and legacy SDK parity with the direct
engine, full-text/structured-content equality, input rejection, small-budget
failure, absent hospital evidence, exact origins/hosts, malformed requests,
concurrency, rate limits, safe diagnostics and Worker execution without dynamic
code generation. They prove transport behaviour, not ChatGPT or Voice access.

The deployment owner must test the actual HTTPS endpoint from ChatGPT and retain
raw responses before claiming live compatibility. Explorer page-local WebMCP and
remote MCP are separate transports over the same core. See
[the architecture decision](ARCHITECTURE.md) and
[remote access documentation](../../docs/remote-mcp.md) for the deployment
and client acceptance record.

## Updating the approved bundle

Use a reviewed change to replace the immutable vendor files and update the
registry URL, version, snapshot, size and SHA-256 values together. Regenerate the
Worker and rerun the exact context acceptance checks. Never change a public
version to serve different bytes. No runtime refresh or mutable branch alias is
provided.
