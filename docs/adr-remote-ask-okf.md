# Decision: remote access to the existing Ask OKF engine

Status: accepted for implementation, 19 September 2026. Public deployment and
client acceptance are separate observations; this decision does not certify
either.

## Context

Explorer's Ask OKF interface and optional WebMCP adapter already use
`apps/okf-explorer/src/lib/context/index.ts`. Its bounded, deterministic
`assembleContext` operation does not depend on a browser, model or network.
The Python prototype under `mcp/` serves an earlier lexical context format and
is not this implementation. ChatGPT needs a remotely reachable transport;
opening an Explorer page does not grant its model access to page tools.

## Decision

Add a tool-only service under `services/ask-okf-mcp/`. Import and compile the
existing engine directly. Expose one read-only `ask_okf` tool over HTTPS MCP.
Return the existing `okf-governed-context.v1` package, with its original status,
identity, evidence, paths, provenance, omissions and budgets. There is no new
answer format, model call, summarising layer or domain-specific retrieval code.

The server resolves a logical bundle identifier and optional immutable version
through a reviewed allow-list. Approved indexes are local deployment inputs,
bound to their immutable upstream URL and digest. A caller cannot provide a
URL, file path, alternate index or remote context. Verification precedes context
assembly; a mismatch yields a tool error without evidence. Tool discovery can
still advertise the capability before that verification. Updating a bundle
requires a reviewed source change and new deployment.

Use the current official MCP SDK and retain its compatibility path for earlier
clients. Keep protocol negotiation in the transport, outside the context engine.
No separate HTTP query API is required: it would duplicate the public surface
without improving the first acceptance case.

## Separation of responsibilities

| Layer | Responsibility |
| --- | --- |
| OKF-DWP producer | Source capture, rights, scope, semantic assertions and context requirements. |
| Shared context engine | Deterministic resolution, traversal, bounded selection and explicit insufficiency. |
| Explorer | Human inspection of that package and links to evidence. |
| WebMCP adapter | Optional browser-local tool exposure, subject to host support. |
| Remote MCP adapter | Input validation, approved bundle binding, protocol transport and operational diagnostics. |
| Hosting operator | HTTPS, deployment identity, resource limits, availability and infrastructure logging policy. |
| AI client | Tool choice, handling untrusted source data, reasoned output and claim-level citations. |
| Domain reviewer | Assess substantive interpretations and whether the declared scope is fit for use. |

`sufficient` means the declared evidence requirements were retained within the
package's scope. It is not specialist approval, current-law assurance or a
claimant entitlement decision. `insufficient` and `conflicting` remain useful
results. Neither a successful protocol call nor a plausible model response
changes source authority.

## Publication and assurance

The service has its own locked dependencies, deterministic tests and build.
It is checked by a required independent CI job. Service-only paths do not
invalidate unchanged Heritage app or fixture bytes. Changes to the shared engine
still pass the existing engine/application gates and the service gate. Unknown
paths continue to fail closed. The publication contract retains its established
`application` classification rather than changing the frozen plane vocabulary.

Keep the deployment, raw MCP responses, independent client receipts and actual
ChatGPT observations separate. Evidence of tool discovery alone is not proof
that an AI invoked the tool or received the whole package. A second client must
produce the same context identity for the same question, budget, engine and
bundle binding.

## Alternatives

- Copy the browser assembler into the server: rejected because fixes could
  diverge and package equality would become accidental.
- Add an LLM-backed answer endpoint: rejected because it conflates governed
  evidence assembly with interpretation and adds credentials and cost.
- Accept arbitrary bundle URLs: rejected because it expands authority and
  creates server-side request forgery and mutable-input risks.
- Build a search/fetch chatbot first: rejected because a single governed context
  operation already provides the required complete evidence workflow.
- Depend on WebMCP for ChatGPT access: rejected because browser tool registration
  and remote MCP are separate host capabilities.

## Standards checked

On 19 September 2026, MCP's latest specification resolved to
[2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28). Its
[transport overview](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
distinguishes the current stateless protocol from earlier initialisation-based
revisions. The SDK owns that compatibility boundary.

OpenAI's [MCP connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt)
documents public HTTPS MCP and developer-mode testing. Its terminology and
account controls can change; the [remote access guide](remote-mcp.md) separates
documented setup from observed host behaviour.
