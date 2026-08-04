# Coventry and Warwickshire heritage publication unit

This external unit owns the faithful corpus, tiny assurance fixture,
default-off synthetic supplement, evaluation documentation, semantic exports,
release assets and its eventual GitHub Pages site. OKF Explorer remains the
owner of the browser runtime and shared schemas.

The split has four operational stages, recorded outside this candidate:

1. A deterministic export is built and validated without claiming deployment.
2. An annotated R1 tag publishes a deterministic, attested, immutable candidate
   archive without any promotion claim.
3. After R1 exists, one exact closure combines every rendered external anchor
   with the faithful, tiny and synthetic link-intent manifests. Every URL must
   pass the bulk observer or be one of the 11 exact genuine-Chrome actions;
   the promotion gate independently reconstructs the union and rejects gaps.
   All 32 journey actions are also checked for each of Chromium, Firefox and
   WebKit against the deployed candidate. In each engine, 21 actions run live
   and 11 protected actions are satisfied by the same genuine-Chrome receipt.
   The bulk observer has a reviewed 14,000-URL ceiling and a 75-minute outer
   timeout, leaving 105 minutes of the 180-minute job for the browser gates.
4. An annotated same-commit R2 tag publishes the attested promotion envelope;
   the promotion dispatch repeats and binds the exact 40-hex assurance commit,
   while R2's own immutable-platform observation stays outside the envelope.

The [publication-unit descriptor](publication-unit.json) is deliberately
stable candidate metadata. Run observations, deployment status and promotion
claims belong in signed release attestations or promotion envelopes, not in
this descriptor.

Bootstrap the owning repository by exporting into its `site/` directory and
copying all five reviewed workflows (`ci.yml`, `pages.yml`,
`candidate-release.yml`, `terminal-assurance.yml`, and `promotion-release.yml`)
from `repository-template/` into the repository-root `.github/workflows/`. The
promotion envelope remains at the repository root, outside `site/`; candidate
validation rejects an envelope placed inside the candidate it binds. The
receipts named by the terminal envelope also live outside `site/` at their
envelope-relative paths. Pages needs neither mutable evidence nor a promoted
envelope. Copy `promotion-envelope.template.json` to repository-root
`release-assurance/promotion-envelope.template.json` as the runtime template.
R1 needs only the exact candidate closure; R2 needs the complete receipt
closure and a GitHub attestation for the exact promoted envelope bytes. After
each release is published, GitHub's verified release attestation and release
API must agree with every policy-declared asset's exact name, byte count and
SHA-256 digest.
