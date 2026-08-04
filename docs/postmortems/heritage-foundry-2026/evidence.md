---
"@context":
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/context.jsonld
  - https://chris-page-gov.github.io/okf-explorer/profile/bundle-wiki/v1/semantic-context.jsonld
"@id": https://chris-page-gov.github.io/okf-explorer/docs/postmortems/heritage-foundry-2026/evidence.html
"@type": https://schema.org/Report
type: Report
title: "Heritage Foundry postmortem evidence"
description: "Evidence inventory, retention boundary, hashes and release qualifications."
generated:
  by: process:heritage-foundry-postmortem-builder
  at: "2026-08-04T13:16:54Z"
assertion_status: normalized
assertion_scope: real-world
tags:
  - postmortem
  - evidence
  - provenance
---
# Heritage Foundry Postmortem Evidence

## Collection Result

The ignored private evidence plane contains structured PR/run metadata, six
gzipped Actions logs, Git/reflog snapshots, all six release assets and three
deployment archives captured before their one-day retention expired. The public
[evidence register](data/evidence-register.json) publishes source URLs, byte
counts, hashes and treatment decisions without publishing raw logs or local paths.

The current rollout is a separate
[normalized input](../../../release-assurance/heritage-postmortem-publication-evidence.json).
It records PR #70, the external candidate and Pages deployment, R1, terminal
assurance and R2. Its generated
[current-publication register](data/current-publication-evidence.json) and the
appended public records in the [evidence register](data/evidence-register.json)
apply that fail-closed contract. All six milestones are verified from exact public identities, timestamps, claims and URLs; no success state is inferred from local implementation.

The separate [R1/terminal/R2 attempt register](data/publication-attempt-register.json)
reconstructs all nine closure runs from their public workflow logs. It records the
failed step, bounded correction, control commit and retained artifact digest where
present. All nine records explicitly prove that neither candidate nor Site bytes
changed during closure.

| ID | Milestone | State | Subject | Claims | Public evidence |
|---|---|---|---|---|---|
| PUBEV-001 | central-pull-request | verified | [subject](https://github.com/chris-page-gov/okf-explorer/pull/70) | 2/2 | [evidence 1](https://github.com/chris-page-gov/okf-explorer/actions/runs/30908799442)<br>[evidence 2](https://github.com/chris-page-gov/okf-explorer/commit/b0b78b8772341ec2b99ddd588389e4635eebe9e9)<br>[evidence 3](https://github.com/chris-page-gov/okf-explorer/pull/70) |
| PUBEV-002 | external-candidate | verified | [subject](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire) | 2/2 | [evidence 1](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/publication-unit-manifest.json)<br>[evidence 2](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire)<br>[evidence 3](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/commit/51881ccc0ce1b77346b9cd8d4462c320bf203114) |
| PUBEV-003 | external-pages | verified | [subject](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/) | 2/2 | [evidence 1](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/)<br>[evidence 2](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30900729931)<br>[evidence 3](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908844005)<br>[evidence 4](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/download/heritage-coventry-warwickshire-20260804-promotion.1/publication-journey-receipt.json) |
| PUBEV-004 | candidate-release-r1 | verified | [subject](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/tag/heritage-coventry-warwickshire-20260804) | 4/4 | [evidence 1](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30903522306)<br>[evidence 2](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/attestations/38772918)<br>[evidence 3](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/tag/heritage-coventry-warwickshire-20260804) |
| PUBEV-005 | terminal-assurance | verified | [subject](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908844005) | 4/4 | [evidence 1](https://github.com/chris-page-gov/okf-explorer/commit/b0b78b8772341ec2b99ddd588389e4635eebe9e9)<br>[evidence 2](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30908844005)<br>[evidence 3](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/download/heritage-coventry-warwickshire-20260804-promotion.1/link-observation-receipt.json)<br>[evidence 4](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/download/heritage-coventry-warwickshire-20260804-promotion.1/protected-link-browser-receipt.json)<br>[evidence 5](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/download/heritage-coventry-warwickshire-20260804-promotion.1/publication-journey-receipt.json) |
| PUBEV-006 | promotion-release-r2 | verified | [subject](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/tag/heritage-coventry-warwickshire-20260804-promotion.1) | 4/4 | [evidence 1](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/actions/runs/30909191165)<br>[evidence 2](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/attestations/38789095)<br>[evidence 3](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/tag/heritage-coventry-warwickshire-20260804-promotion.1) |


## Preserved Deployment Archives

GitHub downloads the Pages artifact as an exact `artifact.tar`. The private copy
is stored with lossless gzip compression. The last column proves that
decompression reproduces the original downloaded tar bytes.

| Pages run | Stored bytes | Stored gzip SHA-256 | Decompressed tar SHA-256 |
|---|---|---|---|
| [30800609874](https://github.com/chris-page-gov/okf-explorer/actions/runs/30800609874) | 209,566,482 | `5ebbada97a2e6652400311951af7b3d93eacd617c6c4ff80481a0e550f80fea5` | `ab7fea01c0298a849eb0a049de0f6011823960eef096f9ed28412f44b377c071` |
| [30813485357](https://github.com/chris-page-gov/okf-explorer/actions/runs/30813485357) | 209,599,179 | `5d54136cbe8628f582706ffefd74616cc2cb9e1ac408863a4fa09bf4e7d9eeae` | `341391ab234c8a34a372e01e3b971561601ed0f4e3ab6b5a6bf15e195601b976` |
| [30819232224](https://github.com/chris-page-gov/okf-explorer/actions/runs/30819232224) | 209,594,113 | `03fd9186911bcb4707cf730df4ddf9565de31cf63f0e0b2db6f7dd722a421e71` | `dfd9472a78bf1fd0378abe9ede5b4980b44b77d4342c03a350b01c88df259be3` |


## GitHub Evidence Quality

- All six relevant workflow runs were successful attempt 1 runs with no rerun.
- PRs #67–#69 had no comments, reviews or review decision. Their required CI
  check was green.
- Each feature commit tree exactly matches its squash-merge tree, so CI tested
  the exact tree later deployed.
- The three Pages logs bind app, corpus, Site-tree and uploaded-artifact hashes.
- The terminal release contains six uniquely named receipt assets with reported
  SHA-256 digests.
- The independent R1 is immutable and retains five exact candidate assets; R2 is
  immutable and its GitHub Releases attestation binds all ten promotion assets.
- The final terminal artifact is independently hashed as
  `sha256:2f9e5544a06bd143ab4f069c6cf65a4edf6f1c54a9fd88c0a7bfc74322f1447c`.

## Release Qualification

The **historical 3 August release** is content-addressed and frozen by project
policy, but it is not platform-enforced immutable. GitHub reports
`isImmutable: false`, the tag is a lightweight commit tag, and neither the tag
nor assets are protected from a privileged maintainer.

The replacement policy is now implemented in
[`release-policy.json`](../../../release-assurance/release-policy.json), its
[validator](../../../scripts/check_release_policy.py) and the
[external promotion workflow template](../../../publication-units/heritage-coventry-warwickshire/repository-template/promotion-release.yml).
It requires an annotated tag, GitHub artifact attestation, immutable releases,
draft-first asset attachment and a deterministic archive retained as a release
asset.

The normalized current-publication evidence records exact verified R1, terminal and R2 identities, claims and public evidence URLs.

## Publication Boundary

Public trace pages exclude hidden instructions, private reasoning, tool payloads,
credentials and raw logs. Raw evidence remains ignored because it contains local
paths and high-volume operational detail. Every public file is link-linted and
scanned for forbidden local/token patterns.
