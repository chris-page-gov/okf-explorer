# Decision: inspect retained evidence beside its source

Date: 24 September 2026. Status: implemented candidate; publication and specialist
acceptance require their own observations.

## Problem

A passage can exist intact but still fall below a retrieval candidate limit.
Broad graph expansion can then spend the remaining resource budget before the
best passage's dependencies are loaded. A compact response limit is a third,
separate concern. More acquisition or another answer-model call cannot diagnose
these three boundaries reliably.

## Decision

Keep Search, Ask OKF and model interpretation separate. Add a generic Evidence
workbench which consumes retained canonical context packages. A producer supplies
the question catalogue; Explorer validates and lazily opens one package at a time.
Use source page locations for navigation and exact spans for extracted passages.
Export local review proposals with package and record identities.

Reuse existing context-manifest and exact-read primitives for delivery. The new
shared reconstruction gate verifies ordering, byte bounds, hashes, canonical
JSON and context identity. Delivery preserves missing evidence and never supplies
an omitted qualification. A public producer must separately approve its questions
and reject restricted records before publication.

Offer opt-in deterministic discovery weights and bounded producer-authored
navigation routes. Literal phrase routes and conjunctive synonym groups are
checked against the hashed discovery card. A declared scope group prevents that
card being nominated for a different or unspecified scope; the omission is
reported, not treated as legal inapplicability. No domain names, paragraphs or
evaluation questions occur in the engine. Existing ranking contracts are frozen.

Follow the leading discovered source unit's dependencies before broad expansion
in the new mode. Retain truncation, unresolved endpoints and route guards. Compare
the same representation and budgets across algorithms; changes in record counts
alone are not retrieval-quality evidence.

## Consequences

This is an inspectable, deterministic first authoring surface without a remote
write API or a model dependency. It does not promise arbitrary paraphrase recall,
automatic ontology creation or complete legal answers. Source-led authored routes
need prospective tests and can sacrifice recall when scope is unclear. Retained
failure results and specialist review remain essential.

A source-site embed can be blocked by its host. The ordinary cited PDF link must
still work. PDF text highlighting requires coordinates; the UI must not invent
them from a page number.

See [the user and producer guide](evidence-workbench.md) and the existing
[context assembly decision](adr-ask-okf-context-assembly.md).
