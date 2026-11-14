# Typed datetimes, spatial declarations and local CSV previews

This is an unreleased, local candidate. The [v2 contract](../profiles/analytical-data/v2/index.md) uses a new URI and `2.0.0-rc.1` because datetime key interpretation and metadata rules change. Frozen v1 `1.0.0-rc.1`, its schema digest, validator bytes and historical Warwickshire/NDL/Defra trials remain unchanged. No producer pin, research release or public learning Reader is silently updated.

## Functionality implemented

- A separate Python package validator adds exact nanosecond datetime key comparison, valid calendar/offset checks and the deliberately limited timestamp subset documented in the profile. Original literals and source hashes remain unchanged.
- Explicit point-coordinate metadata checks supported CRS/axis/unit agreement, exact decimal-string extents, coordinate fields, bounds, missing/partial pairs and declared/unknown vertical references. A missing vertical datum remains a gap.
- The `/inspect-data/` page accepts a local manifest and one selected CSV. It verifies SHA-256 before parsing, then checks ordered headers, supported types, declared special values, controlled values, observation keys and supported spatial rules. It retains literal display values and separates real measure zeroes from special states.
- The page uploads nothing, saves no file contents and registers no AI tools. Rendering escapes source text. A file picker stays disabled until client initialisation; replacing or clearing inputs invalidates unfinished reads and stale results. This page does not perform lending, service referral or authenticated retrieval.
- The terminal browser suite explicitly includes the new journey. Unmapped v2 profile changes currently invoke the existing fail-closed full CI selection; no frozen Heritage profile population was revised to hide the new scope.

## Resource and conformance boundaries

| Plane | Scope and limit |
| --- | --- |
| Python v2 | Full pinned schema and all declared tables, at the existing 64 MiB per-file, 256 MiB package and 100,000-row table ceilings. Other declared profiles remain unevaluated. |
| Browser manifest | Strict JSON, duplicate properties rejected, depth at most 32 and at most 256 KiB. Supported version/metadata checks; this is not a replacement JSON Schema implementation. |
| Browser selected CSV | At most 8 MiB, 5,000 data rows, 128 columns and 65,536 characters per field. UTF-8 decoding is strict. Failure clears the result rather than presenting a partial success. |
| Browser display | At most 50 rows and 12 columns, labelled separately from the whole selected-file checks. Nested table paths use explicit selection and exact basename/checksum; the preview currently supports ASCII portable paths. |
| Spatial scope | Two coordinate columns plus optional vertical metadata. No reprojection, polygons, rasters, accuracy assessment, authoritative code membership, time-varying reference frame or county-coverage claim. |
| Timestamp scope | Explicit local RFC 3339 subset. Leap seconds, unknown offsets, named timezone annotations and fractions beyond nine digits need another reviewed design; original source representations remain evidence. |

The CSV preview recognises either frozen v1 or the new v2 candidate. It never treats a preview as a complete multi-table package check or analytical usefulness assessment. A declared licence, datum, source URL or extent is not independently verified simply by being well formed. No external data request is needed to use the example.

## Validation evidence and remaining work

Shared vectors challenge calendar/offset validity, equal instants, distinct nanoseconds and exact decimal identities across Python and browser logic. Python tests also freeze v1 hashes and challenge spatial metadata, state/zero collisions, unknown datums and silent migration. Browser tests cover uploads/storage absence, inert text, checksum/key failures, clear-during-read behaviour, keyboard scrolling, automated accessibility and narrow layouts.

Current local targeted results: 14 Python cases and 37 browser-logic cases passed; all twelve targeted Chrome/WebKit journeys passed after fixing the early file-selection race, including asynchronous clearing. Final complete-suite and CI results are tracked separately. Local Firefox startup remains blocked before application load, and the earlier intermittent Chrome help PageDown failure remains explicit. Later CI evidence must name its exact commit, engines and skips.

Independent schema/domain review, producer migration decisions, representative analyst tasks and human assistive-technology acceptance remain outstanding. Browser formal schema parity, broader CRS/geometry support, wraparound extents and unknown/high-precision temporal formats remain unsupported. WCC live work stays parked. The feature inventory's wider architecture B–F acceptance programme is not discharged by this bounded implementation.

## Reproduce

```sh
uv run --locked python scripts/check_analytical_data_v2.py profiles/analytical-data/v2/examples/library-observations
uv run --locked python -m unittest tests.test_analytical_data_v2 -v
pnpm --dir apps/okf-explorer exec vitest run src/lib/analytical/preview.test.ts
pnpm --dir apps/okf-explorer exec playwright test tests/ui/analytical-preview.spec.ts --project=chrome --project=webkit
```

Use the manifest and CSV in `profiles/analytical-data/v2/examples/library-observations/` for the manual preview. This is a synthetic library observation table, separate from the standards repository's lending-action boundary. Source facts and published specifications inform the design; the new table contract and limits are local proposals pending adoption.

The [targeted validation receipt](analytical-data-v2-targeted-validation-2026-11-14.json) binds these results to source hashes; it does not assert the pending complete candidate suite.

The optional v2 inputs are declared in the publication source family and their own profile descriptor. They do not enter the default semantic graph. CI caught an inappropriate hand edit to the generated semantic contract; regeneration from the unchanged reviewed preset corrected it without altering the shared path/URL helper or frozen v1 trials.
