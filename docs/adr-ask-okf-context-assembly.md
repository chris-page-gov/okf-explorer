# Decision: governed context assembly alongside Search

Status: accepted for implementation, 16 September 2026.

## Decision

Add a transport-independent TypeScript library under `src/lib/context`. It has
no browser state, DWP terminology, model dependency or external retrieval. A
small, digest-bound optional producer index supplies canonical concept aliases,
evidence passages, governed assertions and explicit context dependencies. An
indexed bundle declares this through `entrypoints.context_assembly`; a small
bundle may provide the same document through an explicit adapter.

The engine resolves declared phrases, traverses directed assertions and checks
mandatory dependencies. It does not infer predicates from ordinary hyperlinks.
Existing `dcterms:references`, `dcterms:requires` and SKOS relations express the
graph. A producer may mark records as evidence requirements and publish the
scope of that requirement. This is versioned authoring, not hidden engine logic.

Whole evidence items are retained or omitted. Byte, node, relationship and depth
budgets are explicit. Missing records, undeclared provenance, conflicts, ambiguous
aliases, unsupported concepts and required-item omissions are visible. A package
may report sufficient evidence only within its declared requirements and scope;
it cannot certify an arbitrary question as completely answered. A bundle with no
governed context index receives an explicit unsupported/insufficient result.

Canonical package identity hashes the deterministic content. Build timestamps
belong to execution observations, not source publication dates. Original source
dates, capture dates and bundle snapshot identifiers remain separate.

The UI presents Search and Ask OKF as separate interactions. It shows the same
package supplied by read-only tools, with record links, traversal, evidence,
authority and gaps. Source text and tool output remain untrusted data. There is
no execution of source instructions, automatic remote context fetch, AI answer
generation or mutation tool.

## Compatibility and scope

This deliberately extends the earlier search design's exclusion of a context
compiler. The independent library is consumed by Explorer, not implemented in
its search handler. Existing Search and Python `okf-context-pack.v1` remain
compatible. New contracts are additive and do not alter the frozen Bundle Wiki
v1 mirrors or Evaluation Foundry's closed v1 capability enum.

WebMCP is optional transport, following feature detection of the current draft's
`document.modelContext`. Registration is not proof that a particular AI host can
call it. The machine-readable package works without WebMCP or a language model.

## Alternatives considered

* Replace Search with a chat box: loses deterministic discovery and mixes
  evidence selection with reasoning.
* Expand every graph edge indiscriminately: structural membership and broad
  associations would overwhelm bounded evidence and obscure qualifications.
* Hard-code this DWP question: cannot generalise or demonstrate missing evidence.
* Treat a lexical top-k package as sufficient: good matches do not establish that
  exceptions, scope or dependent evidence have been retained.

## Validation

Use a synthetic non-DWP graph and the actual DWP producer index. Evaluate A–H
separately, with removal, direction, provenance, ambiguity, conflict, injection
and budget controls. Keep new engine observations separate from the previously
exposed DWP research trials. A complete dependency closure is a structural result;
legal interpretation and specialist acceptance remain separately stated.
