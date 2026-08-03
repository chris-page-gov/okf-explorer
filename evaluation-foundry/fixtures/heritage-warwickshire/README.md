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

Publication assurance is provisional. The clean local build produced 239
reading pages, resolved 4,135 internal page references, passed the deterministic
1 GB GitHub Pages size gate with more than 12 MB of headroom and exercised the
eight Explorer presentation views, but the publication capability remains
undemonstrated until the exact
deployed GitHub Pages URLs pass the terminal publication journey.
