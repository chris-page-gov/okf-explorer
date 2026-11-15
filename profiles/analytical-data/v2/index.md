# Analytical Data v2 candidate

**Local proposal: 2.0.0-rc.1.** This optional profile adds typed datetime values and explicit spatial declarations to the [frozen v1 candidate](../v1/index.md). It is not an adopted UK government standard or a change to OKF 0.2 or Bundle Wiki v1. Existing producers and trials are not upgraded automatically.

Use [the exact schema](package.schema.json), [descriptor/digest](profile.json), [shared conformance vectors](conformance-vectors.json) and [synthetic library observations](examples/library-observations/okf-analytical-data.json). The [implementation and migration guide](../../../docs/analytical-data-v2-preview.md) records coverage and gaps.

## Datetime

`dataType: datetime` accepts this deliberately bounded local subset of [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339): years 0001–9999, uppercase `T`/`Z`, a valid Gregorian date, seconds 00–59, zero to nine fractional digits and a known `Z` or numeric offset. Naive time, `-00:00`, leap-second literals, lowercase separators, longer fractions and timezone-name annotations are unsupported. This is narrower than the RFC; it is not full RFC conformance.

The validator retains every original literal and CSV digest. Observation-key equality compares the represented instant exactly at nanosecond precision. Equivalent offsets therefore collide; distinct nanoseconds do not. No model, locale-dependent parser, floating-point timestamp rounding or automatic source rewriting is involved. Source `observedAt` uses the same bounded subset in v2; v1 keeps its original behaviour.

## Spatial declaration

An optional `tables[].spatial` object declares a supported CRS URI, exact axis order, coordinate field names, unit, extent and coverage note. This candidate supports OGC CRS84 (longitude/latitude, degrees), EPSG:4326 (latitude/longitude, degrees) and EPSG:27700 (easting/northing, metres), using the exact HTTP definition URIs in the schema. Field units must agree. Headers do not imply a CRS.

`extent` contains four **exact decimal strings** in declared axis order: first-axis minimum, second-axis minimum, first-axis maximum, second-axis maximum. Strings avoid rounding the metadata before comparison. Bounds must be ascending, angular bounds must fit their declared axes and every present coordinate pair must fall within the declared extent. Both declared special values count as a missing pair; a partial pair fails. Wrapping/antimeridian extents are unsupported.

Optional vertical metadata names a separate numeric metre field. A declared datum needs a credential-free source URL; `not-recorded` retains a visible gap. A declaration or successful range check does not independently verify that datum, accuracy, height interpretation, physical plausibility or geographic completeness. No reprojection or geometry transformation occurs.

The concepts are informed by [OGC referencing by coordinates](https://docs.ogc.org/as/18-005r5/18-005r5.html), [OGC axis-order examples](https://docs.ogc.org/is/06-042/06-042.pdf) and [OS British National Grid documentation](https://docs.os.uk/os-downloads/products/transport-network-portfolio/os-open-usrn/os-open-usrn-overview/coordinate-reference-system). Our table shape, supported set and acceptance limits are local design choices. Direct OGC registry lookups returned unavailable/403 responses during review on 14 November 2026; the validator does not fetch those URLs or infer requirements from them.

## Validation and preview

```sh
uv run --locked python scripts/check_analytical_data_v2.py profiles/analytical-data/v2/examples/library-observations
```

The Python gate validates the complete local package against the pinned Draft 2020-12 schema and all declared tables, using the existing bounded path/URL helpers and no remote schema retrieval. The separate browser preview checks one explicitly selected local table within lower resource limits. It does not claim full schema/package conformance. Existing v1 schema and validator hashes are frozen by regression tests.

The sample is synthetic: no real library, patron, loan, Warwickshire coverage or observed service outcome is represented. Its vertical datum and rights remain explicitly unverified. WCC acquisitions, feed probes and remediation stay parked.
