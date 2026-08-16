# Local pilot verification

Verified: 16 August 2026
Scope: frozen 20-family pilot and 293-family retrieval-first development corpus
External evidence: retained separately in the ignored private results directory

## Result

The local generation gate passes:

- 20 governed families are bound to the pinned source commit and exact family
  HTML and embedded-record SHA-256 values;
- 20 `word-full-v1` files and 20 `word-retrieval-v2` files are present and
  match `corpus-manifest.json`;
- 48 synthetic development cases are present and match their manifest digest;
- every retrieval file is within the 20,000-character experiment target;
- every retrieval file shows `Record schema` and `Source projection SHA-256`
  on page 1; and
- two consecutive complete builds produced byte-identical Word files.

## Automated checks

The builder verified the pinned 7,217,377-byte journey projection, all source
bindings, exact embedded records, contiguous authored ordering, source
references, safe HTTP(S) URLs, the exact full-profile JSON appendices, retrieval
structure, literal official hyperlink targets, ZIP integrity, visible-text
digests and the development-case digest.

The document accessibility audit reported:

- high severity: 0;
- medium severity: 0; and
- low severity: 190, all `hyperlink_raw_url`.

The low-severity findings are intentional for this experiment. Official URLs
must be visible in full so a reviewer and Copilot can recover the exact governed
handoff without a friendly label hiding the destination.

No generated Word package contains the local username or a local filesystem
path.

The full-corpus builder separately verified 293 unique families, 293 Word
records and 293 authored-situation development cases against the pinned source
projection. Its frozen evaluation schedule contains 32 preflight calls followed
by exactly one development call for every family.

## Visual checks

All 40 Word files were rendered through LibreOffice and all 515 final pages were
checked at original resolution:

- full profile: 354 pages; and
- retrieval profile: 161 pages.

The final correction converted relative Markdown in two authored narratives to
proper public-site hyperlinks. It changed 9 full-profile page renders, which
were re-inspected. The other 345 full-profile pages remained pixel-identical;
the retrieval profile was unchanged.

No clipping, overlap, broken URL wrapping, missing glyph, margin collision,
missing header or footer, blank page or corrupt rendering was found. Some full
baseline records retain sparse section-ending pages before the deliberately
page-broken technical appendix, and some appendices have short final pages.
These contain valid governed content and are recorded as baseline pagination,
not missing content.

## Boundaries

The local checks do not by themselves show that Copilot can discover the right
family. Tenant responses are separate experimental evidence. The exhaustive
293-family cases reuse authored situations and are not a final independent
holdout. This verification does not establish licence or permission behaviour
for other users, or the OneNote condition. No OKF bundle, viewer or website was
rebuilt.
