# Heritage browser evidence for the reading-help build

The Explorer reading-help increment changed the application build, so the earlier
Heritage local browser receipt could no longer attest to the current app.
`pre-refresh/` preserves that receipt and both compressed result files byte for
byte. Its `inventory.json` records their SHA-256 hashes. The Heritage source
snapshot, faithful, tiny and synthetic release roots were not changed.

An initial 100-question run was interrupted after its Site publication identity
was found to name source commit `2d91eac7`, preceding the final focus correction.
It produced no result file and is not a passing run. The Site was then assembled
from a clean `9f602be150ed53152b8166904d321f99b2e95589` checkout, reusing
the exact built Explorer app. Its app tree is
`9e7431aca2a328819c12ab9169385f56c9886c87a72152292762b9b7d3fbb105`,
manifest SHA-256 is
`18bea913ffa562bb4af04aee61df89ff492f5584b455f957b8a101becf959ec9`,
and assembled Site tree is
`2199f21e109fa463cf83b1986110cb6719d45b5ccd366490fca81ede8afbddb9`.

The fresh 100-question Playwright run against that Site scored all 100 questions.
All 100 met the 80-point threshold; the mean was 92.6 and none scored below 60.
The tiny, faithful and synthetic-isolation browser journeys all passed, with no
failed or validation-only records. The governed materialiser checked the
executed result bytes, current app and Site identities, source roots, scores,
journey outcomes and observation times before writing the current
[local candidate receipt](../../../evaluation-foundry/fixtures/heritage-warwickshire/evidence/local-candidate-receipt.json)
and its compressed results. The receipt was observed at
`2026-09-26T15:42:17Z`.

These checks are local cross-domain runtime evidence for the Explorer build. They
do not verify a public deployment, official DWP interpretation or entitlement.
The current receipt leaves its terminal public publication gate pending.
