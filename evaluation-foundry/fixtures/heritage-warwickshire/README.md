# Coventry And Warwickshire Heritage Fixture Family

This fixture family has three non-overlapping products:

1. The [tiny assurance landing page](../../../evaluation/heritage/tiny/index.md)
   is generated from a separate small source fixture for deterministic
   producer, negative-case and real-consumer checks; its
   [descriptor](../../../evaluation/heritage/tiny/okf-explorer.json) is the machine entry point.
2. The [faithful landing page](../../../evaluation/heritage/index.md)
   is generated from the frozen Historic England, Office for National
   Statistics and Heritage at Risk snapshots; its
   [descriptor](../../../evaluation/heritage/okf-explorer.json) is the machine entry point.
3. The [synthetic capability landing page](../../../evaluation/heritage/synthetic/index.md)
   is a separate, default-off demonstration namespace for relationships or
   narratives that the permitted source layers cannot evidence. It contributes
   to no faithful count or conclusion; its
   [descriptor](../../../evaluation/heritage/synthetic/okf-explorer.json) is explicit and separate.

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

Publication assurance passed for the exact deployment observed at
`2026-08-03T12:29:08.274Z`. The clean local build produced 239 reading pages,
resolved 4,135 internal page references, passed the deterministic 1 GB GitHub
Pages size gate with more than 12 MB of headroom and exercised all eight
Explorer presentation views. The terminal publication check then passed
**1/1 journey, 27/27 actions and 2/2 assertions** against
[Pages run 30813485357](https://github.com/chris-page-gov/okf-explorer/actions/runs/30813485357)
at commit
[`c8e8fac3ef2beddae7bdc99988ae9c5aac2431f2`](https://github.com/chris-page-gov/okf-explorer/commit/c8e8fac3ef2beddae7bdc99988ae9c5aac2431f2).
It observed descriptor SHA-256
`2b06dc70e8d1943e18617d4edcb09bd5041ff8f7b7611828d1c9d24070b37149`,
release root
`aa8f3367b7fb0e5de46a5c33ac4ef1906507defae114317e7bec88ee72fa7aeb`
and journey-result SHA-256
`36bcc3f2e31a7dcc73c793d4a44a12492a717d321f30926685341e45ea3ee1f4`.

The publication-evidence home is the immutable
[heritage-coventry-warwickshire-20260803 release](https://github.com/chris-page-gov/okf-explorer/releases/tag/heritage-coventry-warwickshire-20260803).
The promoted journey validates that page as action 28, and its exact terminal
results are attached to the tagged commit without mutating the verified Site
bytes. This public pass is evidence for the exact recorded deployment, not a
claim that mutable Pages or external source URLs remain unchanged, and it does
not alter Historic England's authority or the evaluation's snapshot and
synthetic-isolation limitations.
