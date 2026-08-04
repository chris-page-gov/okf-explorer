# Coventry And Warwickshire Heritage Fixture Family

This fixture family has three non-overlapping products:

1. The [tiny assurance landing page](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/tiny/index.html)
   is generated from a separate small source fixture for deterministic
   producer, negative-case and real-consumer checks; its
   [descriptor](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/tiny/okf-explorer.json) is the machine entry point.
2. The [faithful landing page](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/index.html)
   is generated from the frozen Historic England, Office for National
   Statistics and Heritage at Risk snapshots; its
   [descriptor](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/okf-explorer.json) is the machine entry point.
3. The [synthetic capability landing page](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/synthetic/index.html)
   is a separate, default-off demonstration namespace for relationships or
   narratives that the permitted source layers cannot evidence. It contributes
   to no faithful count or conclusion; its
   [descriptor](https://chris-page-gov.github.io/okf-heritage-coventry-warwickshire/synthetic/okf-explorer.json) is explicit and separate.

NHLE inclusion is exact spatial intersection with Coventry (`E08000026`) or
one of the five Warwickshire local-authority boundaries (`E07000218` through
`E07000222`) from the declared ONS boundary vintage. Records intersecting more
than one boundary are emitted once and retain every intersected geography.
Heritage at Risk workbooks do not provide equivalent geometry, so their
inclusion is a separate, reversible normalization of the workbook's local
planning authority, local authority, unitary, district, borough or council
field. Locality-only matches are excluded and no spatial intersection is
claimed for those rows.

The [evaluation profile](evaluation-profile.yaml), [mapping proposals](mapping-proposals.yaml)
and [journeys](journeys.json) are the controlling artifacts. The
[beginner report](../../../docs/heritage-evaluation-report.md) explains the
results and limitations.

The candidate and its observations are deliberately separate. The candidate
contains stable facts, mappings, questions, journeys, link intents and plane
roots. It contains no workflow run, observation timestamp, current deployment
status or promotion decision. External-link availability is sampled on its own
freshness schedule and written to receipts outside the candidate. A signed
promotion envelope may bind those receipts to the exact deployed bytes only
after the public journey passes.

The corpus, its reading pages and future release assets are owned by the
[external heritage publication unit](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire).
The reusable [OKF Explorer](https://chris-page-gov.github.io/okf-explorer/)
remains a separate runtime. The planned release identity is
[`heritage-coventry-warwickshire-20260804`](https://github.com/chris-page-gov/okf-heritage-coventry-warwickshire/releases/tag/heritage-coventry-warwickshire-20260804);
it is not described as promoted until its signed envelope and immutable-release
checks exist.

For historical context, the earlier
[`heritage-coventry-warwickshire-20260803`](https://github.com/chris-page-gov/okf-explorer/releases/tag/heritage-coventry-warwickshire-20260803)
release records the first deployment observation. It was mutable at the GitHub
platform level and its tag was lightweight, so it is evidence of that earlier
run, not an immutable promotion record.
