# Warwickshire analytical compatibility example

These generated files belong to the [11 November 2026 compatibility trial](../../analytical-data-trial-2026-11-11.md). Rebuild them from the [pinned public inputs and authored records](../../../sources/analytical-data-trial-2026-11-11/README.md) using `scripts/build_analytical_data_trial.py`.

The CSV conversion retains all 333 source observations. It renames headers, removes numeric grouping commas and percentage signs, and adds a reference-year column. Attribution is to Warwickshire County Council and the Office for National Statistics, Mid-2008 Super-Output Area Population Estimates. Retain the [publisher-linked CC BY-SA 2.0 UK licence](https://creativecommons.org/licenses/by-sa/2.0/uk/) with the source and conversion. The NDL catalogue's different licence declaration remains an explicit unresolved gap.

The Reader bundle presents two local assessment records and ordinary resource links. The manifest validates the local converted WCC distribution. The S3 distribution listed by NDL remains unassessed after 403 AccessDenied responses. The [receipt](warwickshire/receipt.json) and [catalogue link](ndl-catalogue-link.json) retain those distinct results.
