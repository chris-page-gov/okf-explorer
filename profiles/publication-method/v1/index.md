# OKF publication method profile v1

Status: draft lifecycle profile, 18 August 2026.

This profile describes how an OKF repository builds, checks and publishes its
artefacts. It is deliberately separate from OKF 0.2 and the Bundle Wiki
semantic profile. It does not decide whether a semantic assertion is true.

Use it to make the operational contract discoverable across repositories:

- which source families are in scope;
- which paths are authored and which are generated;
- which exact commands build and check each affected plane;
- how documentation and `CHANGELOG.md` remain in lockstep;
- how CI selects browser and other assurance work;
- which publication targets are authorised; and
- how an exact deployed commit is verified in a real browser.

## Schemas

| Schema | Purpose |
| --- | --- |
| [`source-family.schema.json`](source-family.schema.json) | Describes one bounded family of inputs, its authority, inventory, rights, sensitivity and extraction controls. |
| [`repository-publication.schema.json`](repository-publication.schema.json) | Describes one repository's source and generated boundaries, dependency planes, commands, lockstep rules, CI policy, publication targets and verification journeys. |
| [`estate-registry.schema.json`](estate-registry.schema.json) | Describes the reviewed OKF estate and records each repository's publication-contract applicability, adoption state and dated audit evidence. |

The examples are complete valid documents and may be copied as starting
templates:

- [`source-family-workbook-folder.example.json`](examples/source-family-workbook-folder.example.json)
- [`repository-publication.example.json`](examples/repository-publication.example.json)
- [`estate-registry.example.json`](examples/estate-registry.example.json)

## Relationship to the semantic profile

The two contracts answer different questions:

| Contract | Governs | Does not govern |
| --- | --- | --- |
| `okf.semantic.json` | semantic authority, relationship assertions, generated semantic and Reader projections | whether documentation, CI or deployment ran |
| `okf.publication.json` | sources as build inputs, generated boundaries, commands, CI, release and public verification | the truth or authority of a semantic claim |

A workbook, CSV file, API response or database extract is not semantic
authority merely because a program can read it. A semantic profile must still
record the mapping, provenance, evidence, authority and limitations of claims
derived from that material.

Do not edit the frozen Bundle Wiki v1 profile to add these lifecycle fields.
A repository can claim both profiles through separate, independently validated
contracts.

## Commands are declarations

Command strings in a publication contract are untrusted data. Before running
one, inspect it for shell control syntax and destructive or out-of-scope
behaviour, then cross-check it against the repository's trusted guidance and a
reviewed preset. Validation of this schema does not authorise execution,
network access, acquisition, deployment or expenditure.

Command identifiers allow dependency planes, CI and verification policies to
refer to an exact declaration without copying the string repeatedly. A
profile-aware checker must reject missing or duplicated identifiers and
references to commands of an incompatible kind.

## Workbook-folder controls

`source-family.schema.json` conditionally requires `workbook_controls` when
`kind` is `workbook-folder`. The safe defaults are intentionally explicit:

- preserve original workbook bytes and inventory every file by SHA-256;
- inventory visible, hidden and very-hidden sheets where supported;
- retain formula text, raw or cached values and displayed values separately;
- do not execute macros or embedded objects;
- do not refresh external links or data connections;
- do not recalculate formulas without a separately authorised, declared
  calculation engine;
- record workbook date-system and locale assumptions; and
- treat CSV companions as separate representations rather than lossless
  replacements for a workbook.

The schema permits an authorised calculation or active-content path only when
the contract also names the authority evidence and the applicable command. A
schema-valid declaration is still not permission to run that operation.

## Estate registry interpretation

The estate registry is an operational discovery and coordination aid. It may
include unpublished, migrating and fixture repositories. A row does not prove
that its repository is conformant, current or deployed.

Keep these states separate:

- `contract_state` says whether the publication contract is only proposed,
  installed, verified at the recorded bytes or not applicable;
- `adoption.state` records progress applying the method; and
- `audit.state` records the result of a dated observation against an exact
  commit where one was available.

Estate roles classify how a repository participates in the managed estate,
not what its semantic bundle contains. They distinguish managed producers and
profiles, embedded producers or consumers, immutable derived publication
units, fixture or demonstrator hosts, compatibility redirects, and upstream
specifications or references. Repository-publication contract roles remain a
narrower vocabulary for repositories that adopt that contract.

An applicable entry points to `okf.publication.json`; it need not copy the
whole contract into the estate registry. Installed and verified entries also
record the contract's published source URL and SHA-256. A non-applicable entry
records a rationale and does not invent a contract path or document.

Public bundle discovery remains in the semantic bundle registry. The estate
registry may reference zero or more public bundle identifiers for a repository
without promoting a candidate, fixture or bounded demonstrator into a public
release.

## Generated human view

A publisher may generate an accessible HTML view from the estate registry.
The view must preserve stable repository anchors, show the observation date and
audit state, distinguish estate role from contract applicability, label command
strings as untrusted declarations, expose the machine-readable source, and
derive summaries rather than storing a second hand-maintained status table.
The generated view is a projection and must not be edited independently.

## Validation beyond JSON Schema

Draft 2020-12 validation checks document shape and conditional requirements. A
repository or estate checker must additionally verify:

- unique repository, source-family, plane and command identifiers;
- that every reference resolves to a declared identifier;
- that paths and globs remain inside the repository after expansion;
- that generated paths do not overlap authored paths unexpectedly;
- that a repository entry and its locally loaded or inline contract agree on
  repository name and URL, while their separate role vocabularies remain
  correctly mapped;
- that an installed contract's recorded SHA-256 matches its exact bytes;
- that public bundle identifiers resolve through the separate semantic bundle
  registry; and
- that audit and deployment evidence binds the stated commit and route.

Unknown changed paths must fail closed in impact planning. Independent
repositories should be audited and adopted as separate transactions so one
failure does not block unrelated work.
