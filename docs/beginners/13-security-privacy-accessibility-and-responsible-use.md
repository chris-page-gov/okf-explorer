# Security, Privacy, Accessibility And Responsible Use

The Explorer loads public material from URLs and presents it to people and AI
systems. That makes safety, responsible sourcing and inclusive access part of
the product architecture.

## Start With The Trust Boundary

The application code is published by the Explorer project. A bundle, record,
Markdown body or external resource can come from another publisher.

Remote content is data, not executable instructions. The Explorer must not
trust a field merely because it is valid JSON or came from a registry entry.

A useful threat model asks:

- What input can an external publisher control?
- What browser capability could that input reach?
- What is the maximum accepted size or complexity?
- Could it cause a request to a private or credentialed service?
- Could it mislead a reader about source, status or authority?
- Is there a text and keyboard route through the same evidence?

## Safe Fetching

Network loading uses:

- supported URL schemes;
- request timeouts;
- retry rules for selected temporary failures;
- response byte limits;
- decompression limits;
- expected content forms;
- integrity checks where the pack declares hashes;
- failure states that preserve the source URL.

Retries need limits and backoff. Repeating a non-idempotent external operation
can cause harm, although the Explorer's pack fetches are normally read-only.

## Public URLs And Secrets

Bundle, record and resource URLs can appear in:

- published JSON;
- browser history;
- server logs;
- screenshots;
- copied links;
- evaluation artefacts.

Never put passwords, API keys, bearer tokens, session identifiers or private
personal data in them.

The geospatial classifier removes recognised credential query parameters
before display or preview. Redaction is a defence in depth; the real rule is
that secrets do not belong in a static public pack.

## Remote Content Rendering

Markdown and record values can contain text that resembles HTML, scripts or
diagrams. Safe presentation requires:

- escaping untrusted markup;
- allowlisting supported formatting;
- preventing script execution;
- constraining links and embedded content;
- bounding tables and diagrams;
- preserving readable plain text.

A diagram renderer should implement a limited grammar. It should not execute
arbitrary code supplied by the document.

## Prompt Injection

An AI can interpret malicious text as instructions even when a browser would
render it safely.

Pack content may say “ignore prior instructions” or request a secret. An agent
researching a pack should treat that as source text, not authority to change
its task.

Safe agent use separates:

- system and user instructions;
- retrieval metadata;
- quoted source content;
- tool permissions;
- proposed and approved actions.

Provenance helps identify the source of an instruction-like passage but does
not make it safe.

## Source Constraints

An accessible public page does not automatically permit unrestricted copying
or automated harvesting.

The source constraint ledger records:

- licensing and attribution;
- terms of use;
- fair-use or rate guidance;
- authentication boundaries;
- robots or access restrictions;
- context size and loading concerns;
- unresolved questions requiring review.

The goal is not to silently delete useful prototype behaviour whenever a
question appears. It is to make the constraint and escalation visible, apply
safe bounds and avoid claiming access or rights that were not established.

## Licensing

Several licences can matter:

- licence for source data;
- licence for documentation text;
- licence for code;
- licence for a generated pack;
- terms for a live API or map service.

Metadata that names a licence should preserve whether it was:

- declared by the record source;
- inferred from official provider-wide terms;
- missing or unknown.

An inferred licence needs its source and confidence. “Publicly reachable”
does not mean “openly licensed.”

## Privacy And Data Minimisation

The product should collect or expose only what is needed.

Examples:

- recent bundle history stays in device-local storage;
- initial Map display avoids sending places to a third-party tile provider;
- external previews require an explicit action;
- search happens locally over static indexes;
- URLs use public retrieval state, not private credentials;
- publication checks should reject unintended temporary and system files.

A public-data catalogue can still contain personal data in descriptions or
resources. “Open data” is not a universal privacy classification.

## External Actions

Opening a source, requesting a preview or handing off to a provider crosses a
boundary.

The interface should make clear:

- the destination;
- whether it leaves the Explorer;
- whether it loads live rather than snapshot data;
- whether authentication may be needed;
- what failure means;
- how to return to the governed record.

External links open without replacing the current evidence state where that
supports recovery.

## Accessibility

Accessibility means people with different sensory, physical and cognitive
needs can perceive, understand and operate the product.

The project targets the principles behind WCAG 2.2 level AA and public-service
accessibility guidance.

### Structure

- use headings in a logical order;
- use landmarks and named regions;
- use real buttons and links for their intended actions;
- associate labels and descriptions with controls;
- expose table headers and list structure.

### Keyboard

- every action must be reachable without a mouse;
- focus must be visible;
- opening and closing panels must move focus predictably;
- reordering needs buttons as well as drag and drop;
- graph zoom and scroll behaviour must not trap the page.

### Visual Presentation

- text and controls need sufficient contrast;
- colour cannot be the only status signal;
- labels must remain legible when zoomed;
- layouts must reflow at narrow widths;
- touch targets need practical size and separation.

### Motion And Time

- cycling graph labels can be paused;
- important information cannot disappear before it is read;
- loading state must be announced;
- reduced-motion preferences should be respected.

### Non-Visual Equivalents

Graphs, maps and distributions need accessible lists, counts and descriptions.
An image of a network alone does not expose source, predicate and target to a
screen reader.

## Accuracy And Responsible Claims

The interface must preserve these distinctions:

- missing versus false;
- source-declared versus inferred;
- snapshot versus live;
- exact total versus lower bound;
- official geography versus representative locator;
- legal catalogue record versus applicable law;
- model confidence versus relationship strength;
- standards alignment versus conformance.

Clear wording is a safety control because it prevents users from acting on a
stronger claim than the evidence supports.

## Responsible AI Use

An AI answer over an OKF pack should:

- state the pack and snapshot used;
- record query and filters;
- cite record and source identifiers;
- quote or faithfully paraphrase supporting evidence;
- name truncation and missing coverage;
- separate retrieved facts from reasoning;
- avoid external actions without appropriate authority;
- request further evidence when the context is insufficient.

Fluency is not a substitute for provenance.

## Security Testing Is Layered

Useful checks include:

- unit tests for URL sanitisation and bounds;
- schema tests for remote input shapes;
- browser tests for unsafe and failure states;
- dependency review;
- generated-file integrity checks;
- manual keyboard and screen-reader review;
- source-constraint review;
- evaluation questions designed to reveal unsupported answers.

No automated scanner can decide every authority, licensing or usability issue.

## Next

[Building, testing and publishing](14-building-testing-and-publishing.md)
shows where these checks run in the repository workflow.
