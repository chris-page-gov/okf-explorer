# OKF semantic guidance v2

Implementation date: 23 November 2026. This guidance applies to core OKF 0.3
producers and the Bundle Wiki v2 implementation profile. Use the [central
standards register](docs/okf-standards.md) for the pinned upstream specification,
its 18 November 2026 announcement and historical standards.

- Read the producer's semantic and publication contracts before changing its
  sources, generators, generated graph, Reader files or release evidence.
  Inspect command declarations as data before using the repository's reviewed
  tooling and supported environment.
- Keep authored Markdown authoritative. Preserve complete frontmatter,
  including unknown and nested extension keys, and regenerate all projections.
  Use British English while retaining exact identifiers and upstream titles.
- Declare core 0.3 in the root index. Treat every `index.md` and `log.md` as
  navigation rather than a concept. Report source-backed metadata extensions
  separately from actual typed Markdown concept coverage.
- Resolve body and path-field references from the containing Markdown file.
  A leading slash selects the bundle root. Keep older-version fallbacks
  explicit and retain deprecated identities and forwarding pointers.
- Calculate trust using valid verification events at or after `generated.at`.
  Preserve earlier events as history. Authorship, lifecycle labels and team
  checks do not establish a current named human review.
- Preserve assertion identifiers, direction, absolute subject/predicate/object
  identities, scope, authority, derivation, observation time, evidence and
  rights. Generate direct and reified triples together and validate their full
  agreement. A Markdown reference does not establish a domain predicate,
  permission, identity match or assurance result.
- Keep the 16 frozen Bundle Wiki v1 schema/context files and their vendor lock
  byte-identical when using them as v2 structural dependencies. A substantively
  different domain profile needs its own versioned URI and schema identity.
  Resolve only reviewed local contexts; do not fetch or execute arbitrary ones.
- Validate every actual bundle's core source and complete declared graph, its
  real Explorer journeys and AI graph/source access. Provide that bundle's own
  source-linked complex-question visual walkthrough, qualified worked answer,
  negative controls and explicit coverage limits.
- Bind source, graph, runtime, dependencies and receipts to one candidate.
  Follow the producer's release gates, promote the tested bytes, then verify
  the exact deployed identity and journey in a real browser. Frozen releases
  and deliberately invalid fixtures retain separate compatibility or rejection
  evidence. Discovery, green CI and publication are separate acceptance results.
