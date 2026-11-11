# Warwickshire link scope and live Defra API trial

On 11 November 2026, read-only public checks confirmed a substantial Warwickshire
link problem in the NDL directory. A national metadata census found the same
legacy host only under Warwickshire. This scopes that host migration; the health
of other publishers' resource links remains unassessed. The separate Environment
Agency flood-monitoring trial passes Analytical Data `1.0.0-rc.1` for a bounded
Warwick locality snapshot, with explicit datetime and spatial compatibility gaps.

## Warwickshire diagnosis and measured scope

A supplied diagnosis was treated as an intake lead. Its proposed operational
instructions were not executed. The following findings come from independent
public metadata, publisher Git metadata and HTTP GET observations. No catalogue
record, publisher setting or external feedback was changed.

| Check | Observed result and qualification |
| --- | --- |
| Warwickshire publisher inventory | 59 dataset records, 67 resource occurrences; 18 records have no resource entries. Empty arrays need a separate access assessment. |
| Legacy host | 40 records contain 66 resource occurrences on `opendata.s3.amazonaws.com`. All 66 stored URLs returned HTTP 403 in bounded GET probes. The remaining resource returned HTTP 206 from a National Archives route. |
| Public publisher tree | 62 exact corresponding paths exist at Git commit `e4d26dd92f202958fd3d593256349c62cd2a0a55`; all 62 GitHub candidates returned HTTP 206 to ranged GETs. Publisher approval for replacement remains pending. |
| Paths requiring owner investigation | `lower-super-output-areas.kml`, `schools/schools-detail-warwickshire.csv`, `schools/schools-detail-warwickshire.xls` and `schools/schools-detail-warwickshire.xml` were absent from that tree. No substitute name or format was inferred. |
| Ageing-population CSV | GitHub supplied the complete 32,018-byte object; UTF-8 CSV parsing recovered 333 data rows and seven fields. SHA-256 is `a62d69f9906d9a2b900028d79c5a76ffcc421d262a76ea4865d1a4e089a71601`. It matches the earlier retained GitHub source. |
| Ageing-population XLS | GitHub supplied the complete 70,144-byte object with an OLE compound-file signature, SHA-256 `214d8214ecbb683a2b5b06a94dbb313c28bcd5bd8daeee96c7cbca05b6f4b2fe`. Workbook content, formulae and macros were not executed or semantically validated. |
| Historical equivalence and rights | The inaccessible S3 bytes cannot be compared with GitHub. The WCC CC BY-SA 2.0 UK and NDL UK OGL declarations still differ. Reachability does not resolve either issue. |

The stored route fails before CSV parsing: access is denied. The failure is
consistent with a stale distribution route following
a host migration, with strong public evidence for candidate replacement paths.
The historical denial cause and equivalence remain unverified. This is a local
assessment, rather than an accepted publisher correction.

The probes used GET, a `bytes=0-131071` range, a 15-second resource timeout and a
2 MiB transfer ceiling. Redirect hops, times, statuses, content types, prefix
hashes, object-size witnesses and inspection results are retained. HTTP 206 is
the expected partial-content response. Most candidate files were inspected only
as prefixes; 62 responses do not constitute 62 complete dataset validations.
The original HTTP S3 links and additional HTTPS case controls were both tested.

Inspect the [67-row resource results](examples/analytical-live-trial/wcc-resource-results.csv),
[WCC scope](examples/analytical-live-trial/wcc-link-scope.json) and
[source inventory](../sources/analytical-data-trial-2026-11-11/ndl-link-audit/source-register.json).

## Is this a national NDL problem?

The [public API documentation](https://guidance.data.gov.uk/get_data/api_documentation/)
provides read-only catalogue access. An indexed resource-URL query returned zero
matches despite the independently known Warwickshire cases. This failed positive
control means that query cannot establish a national zero. The original result
body was retained without its numeric HTTP status. A separate
[repeat query receipt](../sources/analytical-data-trial-2026-11-11/ndl-link-audit/indexed-host-query-recheck.json)
retains the exact GET URL, HTTP 200 and an identical zero-result body. The cause
of the search behaviour remains unassessed.

A complete scan of the observed public dataset index used `fq=type:dataset`,
`include_private=false`, stable `id asc` sorting and 1,000-record pages. Between
05:50:26 and 05:54:22 UTC on 11 November 2026, it retained 61 page witnesses and a
deduplicated logical inventory:

| Population | Result |
| --- | --- |
| Public dataset records | 60,155 distinct IDs; reported count remained stable during acquisition. |
| Resource occurrences | 221,687, counted within their parent dataset records. |
| Exact legacy host | 66 occurrences in 40 records, all under `warwickshire-county-council`. |
| Records with no resource entries | 12,153. Other access routes may exist; this is a review signal, not a failure total. |
| URL-parser anomalies | One malformed URL observation. It is counted separately. |
| Other hosts' link health | Unassessed. No national broken-link percentage follows from this census. |

This is a non-atomic snapshot of the public directory, not private holdings,
curated collection acceptance or a guarantee about subsequent catalogue changes.
The offline check verifies every inventory ID, page membership/count and exact
host witness. Full national HTTP pages remain in ignored local acquisition
envelopes. The portable deterministic gzip retains dataset/publisher IDs,
resource IDs, host, scheme, parser state and parent-page hashes. It is a derived
metadata projection, rather than original HTTP bytes.
[National scope](examples/analytical-live-trial/ndl-national-host-scope.json) ·
[Page ledger](../sources/analytical-data-trial-2026-11-11/ndl-link-audit/national-index-ledger.json)

### Proposed national assurance scope

1. **Repair the evidenced cohort first.** Ask the publisher to review the 62
   candidates, four missing paths, 18 empty-resource records and licence conflict.
   Confirm intended dataset identity and maintenance before approving changes.
   The retained CSV is a useful positive control; denied historical bytes need
   explicit unresolved status.
2. **Audit catalogue access contracts across all hosts.** Classify every resource
   as a download, API, service, landing page or controlled route before testing it.
   Group by publisher and host; use provider budgets, caching, bounded GETs and
   redirect receipts. Confirm transient failures with spaced retries. Record
   authentication and access restrictions separately from content loss. Use
   known good and known failed controls to check search and probe coverage.
3. **Measure usability as well as transport.** Check expected media type,
   parsability, declared formats, data versus HTML errors, timestamps and
   completeness. Sample bounded API queries with page completion witnesses;
   do not count a service root or a single successful page as a usable dataset.
4. **Report denominators and ownership.** Keep record, resource occurrence,
   distinct URL, host, publisher and protocol counts separate. Prioritise
   repeatable clustered failures and high-demand resources. Assign stewards,
   remediation decisions and review dates through NDL's publisher and editorial
   processes. No national automated catalogue edit is proposed.

These are local proposals informed by the measured gap and
[NDL curation guidance](https://www.data.gov.uk/data-curation/). A national
link-health audit is justified; its outcome has not yet been measured.
The wider engineering risk is catalogue metadata remaining discoverable while
the underlying distribution is unusable. This trial demonstrates that assurance
gap for Warwickshire. Adoption reviews should therefore retain separate evidence
for catalogue quality, access-contract health and acquired-data validation.

## Real Defra API covering Warwick

The tested service is the Environment Agency's
[real-time flood-monitoring API](https://environment.data.gov.uk/flood-monitoring/doc/reference),
whose responses declare service version `0.9` and Beta status. This is distinct
from the Water Quality API and its migration parameters. Eleven unauthenticated
GETs were spaced seven seconds apart, within the retained platform fair-use
policy's stricter 10-request-per-minute bot budget. The local build makes no
network calls. Source JSON-LD context links were retained without resolution.

Name search alone included Warwick Bridge in Cumbria. The fixture instead uses
the named Warwick station `2091`, its recorded town and coordinates, and a
5 km circle centred at latitude `52.284932`, longitude `-1.562658`:

```text
/id/stations?lat=52.284932&long=-1.562658&dist=5&_view=full&_limit=1000
/id/measures/2091-level-stage-i-15_min-mASD/readings?date=2026-11-10&_sorted=true&_limit=1000
```

The circle supplies a real Warwick locality fixture in Warwickshire. It does not
claim complete county coverage or an authoritative county-boundary clip.
[Original request URLs and receipts](../sources/analytical-data-trial-2026-11-11/live-defra-api/capture-plan.json)
retain the complete host and parameters for every request.

| Acceptance check | Result and limit |
| --- | --- |
| Station pagination | Five stations; `_limit=2`, offsets 0, 2, 4 and 5 returned 2, 2, 1 and 0 rows. Unique IDs equal the bounded reference set. |
| Reading pagination | 96 readings for 10 November 2026 UTC; `_limit=37`, offsets 0, 37, 74 and 96 returned 37, 37, 22 and 0 rows. No repeated identities; exact reference-set equality and empty terminal page. |
| Observation timestamps | Original strings retained. Supplementary checks require explicit timezone, UTC-day membership and unique measure/instant pairs. Readings span 00:00 to 23:45 UTC at observed 900-second intervals. |
| Time filter | `since=2026-11-10T12:00:00Z` returned 47 rows, matching the strictly-after-noon predicate on the full day's readings. |
| Spatial metadata | All five coordinate pairs pass degree bounds and the local circle check. Source fields retain latitude/longitude and easting/northing. The reference documents WGS84 and British National Grid; the response lacks an explicit CRS identifier. |
| Units and datum | The measure declares `mASD`, `Stage` and period 900 seconds. These literals are preserved. No vertical datum conversion, reprojection or coordinate-accuracy acceptance is inferred. |
| Candidate validation | Two CSV tables pass RC.1: five station rows and 96 reading rows. Four absent town values use declared `missing` tokens. Current observations do not exercise genuine zero or suppression states; the existing synthetic fixtures retain that role. |
| Datetime gap | RC.1 stores observation timestamps as `string`. A negative probe confirms that its date-only type rejects these values. Instant and timezone checks are supplementary adapter evidence, not universal profile conformance. |

The [API result](examples/analytical-live-trial/defra/results.json),
[manifest](examples/analytical-live-trial/defra/okf-analytical-data.json) and
[validator receipt](examples/analytical-live-trial/defra/receipt.json) bind the
projection and qualifications to exact bytes. Source URIs, timestamp strings and
decimal values are preserved. The snapshot version includes observation day and
capture completion, independently of API version and analytical profile version.

Provider attribution: this uses Environment Agency flood and river level data
from the real-time data API (Beta). The response declares OGL v3. The reference
provides no service-level guarantee and cautions against safety-critical reliance.
One day's successful observations establish bounded compatibility, not a service
availability commitment, continuous cadence or completeness beyond the query.

## Candidate and Explorer decision

The candidate validator and pinned schema remain at `1.0.0-rc.1`. Explorer needs
these evidence, test and documentation updates to support the adoption decision.
The existing application can link to the companion files. Typed datetime,
CRS/datum-aware validation, county clipping and in-browser analytical previews
require separately reviewed, versioned contract or application work. These trials
do not approve an estate-wide producer migration.

The original rights discrepancy, geography-edition gap, 13 WCC and one NDL producer
errors, eight skipped checks and intermittent narrow help-layout failure remain
explicit in the [original trial](analytical-data-trial-2026-11-11.md). A later
passing check does not erase its initial failure or skipped evidence.

## Reproduce and verify

```sh
uv run --locked python scripts/build_analytical_live_trial.py --check
uv run --locked python -m unittest tests.test_analytical_live_trial -v
uv run --locked python scripts/check_analytical_data.py docs/examples/analytical-live-trial/defra
```

The builder verifies source hashes, every national page/count, WCC resource
coverage, pagination, timestamps and locality bounds before reproducing all
outputs. Eight regression tests also reject duplicated/partial pages, wrong
offsets, duplicate instants with different timezone lexemes, naive timestamps,
out-of-day values and swapped/projected coordinates.
[Reproduction receipt](examples/analytical-live-trial/reproduction-receipt.json)
records input/output digests. The [dated verification record](analytical-live-trial-2026-11-11-verification.json)
retains the full repository check results and their scope.
