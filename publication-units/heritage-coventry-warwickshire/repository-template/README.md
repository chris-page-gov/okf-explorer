# Coventry and Warwickshire Heritage Evaluation Exemplar

This repository is the independent publication unit for the complete Coventry
and Warwickshire heritage Evaluation Foundry exemplar. The immutable candidate
is rooted at `site/`; workflow receipts and promotion evidence remain outside
that directory so observations never rewrite the candidate they describe.

The public Site is
<https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/>.
Candidate and promotion releases use the two-release closure described in
`site/release-assurance/release-policy.json`.

Install all five templates as `.github/workflows/ci.yml`, `pages.yml`,
`candidate-release.yml`, `terminal-assurance.yml`, and
`promotion-release.yml`. Keep
`release-assurance/promotion-envelope.template.json` at repository root,
outside `site/`.

Push an annotated `heritage-coventry-warwickshire-YYYYMMDD` R1 tag only after
the same commit is deployed by Pages. Dispatch the candidate workflow from
updated `main` with the existing tag and a 40-hex OKF Explorer assurance
commit. It checks out the tagged `site/` separately from the release controls;
the archive-attestation receipt therefore binds the assurance workflow ref and
commit without confusing either with the candidate source commit. Dispatch
terminal assurance at the R1 tag with the same assurance commit. The terminal gate reconstructs
the exact union of all rendered external anchors and all faithful, tiny and
synthetic link-intent manifests. Every URL must be bulk-observed or exactly
covered by the genuine-Chrome journey, and promotion rejects any gap. The
bulk step has a reviewed 14,000-URL ceiling and 75-minute outer timeout inside
the 180-minute job. It then runs 21 actions live and consumes genuine-Chrome
receipts for 11 protected actions in each of Chromium, Firefox, and WebKit.
After it succeeds, create the annotated
`heritage-coventry-warwickshire-YYYYMMDD-promotion.N` R2 tag at the identical
commit and dispatch promotion from updated `main` with the successful terminal run
ID and the same exact 40-hex OKF Explorer assurance commit. Both workflows
need no PAT or repository-administration read. They finish by requiring
`release.immutable == true`, checking GitHub's verified release attestation,
and requiring every policy-declared asset to match its exact published name,
byte count and SHA-256 digest.

Pushes that change only workflows or other root control files do not redeploy
Pages: the Pages push trigger is limited to `site/**`. A deliberate manual
Pages dispatch remains available.
