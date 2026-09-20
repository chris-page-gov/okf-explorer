# Ask OKF service changelog

## 0.4.0 — combined staff evidence candidate

- Prepare the combined DMG and ADM corpus as the default, including the proposed
  staff-task concepts, evidence requirements and explicit unresolved obligations.
  Pin the source to `9de52acf1db84b27f8933d80480eaa850e74fa33`; the release
  build rejects an unpinned candidate or altered manifest.
- Preserve the earlier `bf50ef8d91b9f1ccc2cbdb354198eae74c9ed752`
  full-source discovery corpus and `efb05c66616a9cd4328a86cf412780fe7bc7cf0b`
  custody profile as explicit versions with separate identities and integrity
  checks. Add manifest-swap, altered-byte and version-routing regressions, a
  real three-version loader test and a retained hash-bound local corpus replay
  receipt. Keep the architecture notes aligned with all three read-only tools.
- Extend the live verifier with a 256 KiB staff Child DLA/PIP context and compact
  replay across current, earlier corpus and original custody versions. Preserve
  the primary browser-receipt fields and existing historical observations.
- Send `Cache-Control: no-store, no-transform` on HTML only while preserving CSP.
  Other responses keep `no-store`. This follows the
  [documented Cloudflare JavaScript Detections behaviour](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-your-origin-sends-a-no-transform-header).
  Add route-level header regressions. Live transformation and cookie checks remain
  separate; no hosting issue is declared resolved by the candidate.
- Retain earlier release receipts. Source tests and local builds do not establish
  deployment, ChatGPT acceptance, Voice access or specialist approval.

## 0.3.1 — replay-link correction

- Remove a displayed replay link when the question or source version changes,
  or a new replay starts. A link created for an earlier context could otherwise
  reappear beneath a later context. Regenerate the link only when requested for
  the current verified context.
- Add a browser regression that recreates two different questions and checks
  the second link's question, version and context identity, plus repeated replay
  and version-change invalidation.
- Preserve 0.3.0 observations. Deployment and acceptance of 0.3.1 require their
  own build, hosted-service and browser receipts.

## 0.3.0 — compact evidence delivery

- Add bounded evidence catalogues, exact evidence reads and an inspectable
  browser replay page alongside the existing full-package tool. Context
  assembly and evidence authority remain separate from delivery and AI answers.
