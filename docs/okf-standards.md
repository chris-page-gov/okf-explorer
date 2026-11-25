# Open Knowledge Format standards register

This page is the stable human-readable entry point for OKF standards and
bundle discovery maintained by `chris-page-gov`. Its companion
[machine-readable register](../registry/okf-standards.json) records the same
references. Other repositories can link here without changing their declared
OKF version or adopting a new profile.

## Current core specification

The current core is [Open Knowledge Format 0.3 (OKF 0.3)](https://github.com/open-knowledge-format/open-knowledge-format/blob/527e81aff55992be21507e97004286789126f88c/SPEC.md), pinned to commit
`527e81aff55992be21507e97004286789126f88c` in the standalone
[upstream repository](https://github.com/open-knowledge-format/open-knowledge-format).
The upstream default branch was checked on 23 November 2026 and pointed to
that same commit.

Google Cloud's [announcement](https://cloud.google.com/blog/products/data-analytics/introducing-okf-v0-3)
is dated 18 November 2026 and says v0.3 was released that day. The upstream
specification change merged earlier, on 26 October 2026. These are different
events: use 18 November as the announced release date and 26 October as the
merge date.

## Historical core references

- **OKF 0.2:** [pinned specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/3fcbb9f828c2f23d109c855ee403c3a4c81f3a96/okf/SPEC.md) at commit
  `3fcbb9f828c2f23d109c855ee403c3a4c81f3a96`. Existing bundles and historical
  evidence that declare 0.2 remain labelled with that version.
- **OKF 0.1:** [pinned draft specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/ee67a5ca27044ebe7c38385f5b6cffc2305a9c1a/okf/SPEC.md) at commit
  `ee67a5ca27044ebe7c38385f5b6cffc2305a9c1a`, dated 12 June 2026 by its Git
  commit metadata. The immutable document identifies itself as “Version 0.1 —
  Draft”. This is a revision date, not a separately verified release date.

## Local semantic profile

[Bundle Wiki v2](../profiles/bundle-wiki/v2/) targets core 0.3 and retains
the frozen v1 schema/context bytes as structural dependencies. New
[authoring v2 handoffs](../profiles/authoring/v2/) and the repository bootstrap
target core 0.3. Historical v1 authoring handoffs continue to target core 0.2.
Each producer must pass its declared source, graph, Explorer, AI access and
release gates; these profile references do not certify adoption.

The Explorer's [Bundle Wiki profile v1](../profiles/bundle-wiki/v1/) is a
separately versioned local semantic profile. It remains frozen and targets
OKF core 0.2. The profile version, repository publication lifecycle and core
version are separate values. A repository can link to this register without
changing its core declaration, and a profile or Reader implementation does
not by itself establish that its producer has adopted OKF 0.3.

## Public bundle catalogues

- [Public OKF walkthrough register](walkthrough-register.md) records the wider
  public repository/root denominator, declared aliases and dated current
  descriptor observations. Its walkthrough evidence is hash-checked; pending
  roots remain visible and are not treated as accepted bundles.
- [Curated public bundle access directory](public-bundle-access.md) and its
  [machine-readable entries](../registry/public-bundle-access.json): thirteen
  reviewed public producer entries at the directory's recorded observation
  date. It provides access and source-snapshot details, not a completeness or
  conformance decision.
- [Public owner candidate scan](evidence/okf-public-owner-candidates-2026-11-23.json):
  discovery evidence from 218 public repositories, with 20 candidate
  repositories. A candidate can be a declared index or a runtime marker;
  review is needed before treating it as a bundle. This public scan excludes
  private repositories and does not prove conformance, adoption or release.

The scan and curated directory answer different questions. Use the curated
directory for the reviewed public access routes. Use the dated scan to inspect
the broader set of public repositories that may merit review. Neither is a
register of private repositories.

## Source producers

[Hansard's source repository](https://github.com/chris-page-gov/okf-hansard) builds generated releases outside Git. It is recorded separately in the machine register with its source revision. Discovery of checked-in descriptors and version-declaring indexes therefore needs this additional source review. Published artefacts and serving endpoints require their own acceptance evidence.

## Reuse this reference

For a durable human link, use this page:

`https://github.com/chris-page-gov/okf-explorer/blob/main/docs/okf-standards.md`

For machine processing, use the raw JSON URL:

`https://raw.githubusercontent.com/chris-page-gov/okf-explorer/main/registry/okf-standards.json`

The JSON is the authored register. Generated catalogues and Explorer views
remain projections. Keep source commits and observation dates with any
reproduced claims, and preserve the original version labels in historical
bundles and evidence.
