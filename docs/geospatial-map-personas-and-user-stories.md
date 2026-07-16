# Geospatial Map Personas And User Stories

The Map canvas serves people who recognise geography in different ways. Some
arrive with coordinates or a service URL; others only know that a report is
about London, Scotland or another named area. Explorer treats both as useful
discovery evidence while keeping exact geometry distinct from representative
navigation points.

This document defines the user needs behind the Map. The interaction contract
is in [Geospatial Map exploration](geospatial-map-exploration.md), the practical
walkthrough is in the [illustrated Map manual](geospatial-map-manual.md), and
pack authors should use the
[geospatial metadata guidance](okf-bundle-authoring.md#geospatial-metadata-and-map-recovery).

Machine-readable traceability lives in
[`evaluation/okf-explorer/journeys.json`](../evaluation/okf-explorer/journeys.json).
The focused browser assertions are identified here as `GEO-E2E-*` and are
implemented in `apps/okf-explorer/tests/ui/geospatial-map.spec.ts`.

## Personas

| Persona | Primary need | Main risk |
|---|---|---|
| Area-based policy analyst (`API-P07`) | Find statistics, reports and services about a named area even when the record has no geometry. | Treating a place-name match or representative centroid as an authoritative boundary. |
| Spatial data analyst (`API-P06`) | Find coordinates, boundaries, spatial files and ArcGIS/OGC services, then inspect enough geometry to judge relevance. | Mistaking discoverability or a successful preview for currency, accuracy or fitness for use. |
| Data engineer (`API-P02`) | Reach a machine-readable spatial resource, understand its format and recover when browser preview is unavailable. | Assuming every linked WMS, WFS, archive or service can be safely parsed in-browser. |
| Service assessor (`API-P03`) | Verify that Map controls are understandable, keyboard-operable, responsive and represented in durable URLs. | A visually attractive map that hides state, relies on pointer use or loses the ordinary Explorer context. |
| Knowledge curator (`API-P04`) | Improve pack metadata so place, geometry, CRS, vintage, derivation and source evidence are explicit. | Encoding inferred geography as source fact or dropping boundary/version provenance. |
| Policy researcher (`API-P01`) | Move between a thematic reduction and a geographic reduction without losing provenance or the selected record. | Reading a filtered pack count as a claim about the wider world. |

## User Stories And Acceptance Coverage

| Story | User story | Browser coverage |
|---|---|---|
| `API-S10` — discover spatial evidence | As a policy researcher, I want Map to classify the current search/facet context so that spatial material is discoverable without AI or a runtime service. | `GEO-E2E-01`, `GEO-E2E-02`, `GEO-E2E-15`, `GEO-E2E-16`, `GEO-E2E-18` |
| `API-S11` — reduce by evidence or area | As an area-based policy analyst, I want to select an evidence class, recognised UK area or other declared coverage so that the shared result set becomes manageable. | `GEO-E2E-03`, `GEO-E2E-04`, `GEO-E2E-17`, `GEO-E2E-18` |
| `API-S12` — understand locator precision | As a service assessor, I want exact coordinates, representative centroids, clusters and unlocated records labelled differently so that the locator does not overclaim geometry. | `GEO-E2E-05`, `GEO-E2E-06` |
| `API-S13` — inspect a mapped record | As a policy researcher, I want marker and list selection to use the ordinary Explorer route and detail card so that spatial discovery retains provenance. | `GEO-E2E-06`, `GEO-E2E-07`, `GEO-E2E-08` |
| `API-S14` — preview direct geometry | As a spatial data analyst, I want an explicit, bounded GeoJSON or OGC API preview with feature, coordinate, response and bounds metadata so that I can judge relevance before leaving Explorer. | `GEO-E2E-09`, `GEO-E2E-11` |
| `API-S15` — discover an ArcGIS layer | As a spatial data analyst, I want Explorer to inspect an ArcGIS service and request a capped first feature layer so that common service roots remain useful. | `GEO-E2E-10` |
| `API-S16` — recover progressively | As a data engineer, I want linked-only formats and failed previews to retain an external source route and an explanation so that CORS, availability or format limits are not dead ends. | `GEO-E2E-08`, `GEO-E2E-12` |
| `API-S17` — share and revisit state | As a service assessor, I want `geo=` reductions to survive view changes, reload and Back/Forward so that I can cite and demonstrate the same context. | `GEO-E2E-03`, `GEO-E2E-13`, `GEO-E2E-18` |
| `API-S18` — browse accessibly | As a keyboard or narrow-screen user, I want named controls, keyboard marker activation and a single-column responsive layout so that Map is not pointer- or desktop-only. | `GEO-E2E-06`, `GEO-E2E-14` |
| `API-S19` — author trustworthy spatial metadata | As a knowledge curator, I want the pack contract to preserve source, geography code, vintage, CRS, boundary variant and derivation so that Explorer can explain what it displays. | Schema/classifier unit tests plus `GEO-E2E-02` |

## Shared Acceptance Rules

Every story inherits these rules:

- browsing and reduction are static, deterministic and inspectable;
- no AI, geocoder, tile provider, credentials or private proxy is required;
- the Map begins with the same search and facets as the other views;
- every selected record remains an ordinary provenance-bearing Explorer record;
- external bodies are fetched only after an explicit preview action;
- previews remain bounded to supported JSON geometry and visible caps;
- unavailable previews retain local evidence and an **Open source** route;
- source coordinates and pack-declared geometry are not conflated with
  representative centroids; and
- counts describe the loaded pack and active reduction, not universal coverage.

## Traceability And Review

The legacy persona journey `API-J03` exercises a real large corpus: search,
open Map, apply the map-service reduction and select a record. The dedicated
Playwright suite adds deterministic fixture coverage for every visible Map
state, including successful and failed remote previews, keyboard interaction,
responsive layout, URL history and linked-only formats. Unit tests continue to
cover lower-level classification, sanitisation, ArcGIS URL construction and
geometry projection.

The 18 focused scenarios cover these UI surfaces without relying on live
third-party responses:

| Surface | Tests |
|---|---|
| Map entry, no eager geometry request and all evidence/coverage chips | `GEO-E2E-01`–`02` |
| Evidence, recognised-area and other-coverage reductions and clearing | `GEO-E2E-03`–`04` |
| Exact/representative markers, clusters, unlocated records and keyboard selection | `GEO-E2E-05`–`06` |
| List selection, ordinary detail cards, area-only records and linked-only WMS | `GEO-E2E-07`–`08` |
| Direct GeoJSON loading/success, ArcGIS discovery/feature cap and OGC/drawing cap | `GEO-E2E-09`–`11` |
| Preview failure and source-link recovery | `GEO-E2E-12` |
| Cross-view URL state, reload, Back/Forward, responsive layout and Space-key activation | `GEO-E2E-13`–`14` |
| Large-index loading, empty contexts, the 160-row bound, shared search and malformed `geo` state | `GEO-E2E-15`–`18` |

Run the layers independently:

```sh
cd apps/okf-explorer
pnpm test
pnpm test:e2e
```

After the feature is merged and Pages has deployed, repeat all 18 Map scenarios
against the public Explorer build:

```sh
cd apps/okf-explorer
pnpm test:e2e:pages
```

This hosted pass loads the application shell from GitHub Pages while retaining
deterministic intercepted fixtures for geometry and service responses. It
therefore validates the deployed build without making third-party ArcGIS, OGC
or GeoJSON availability part of the acceptance result.

Validate persona/question traceability without launching a browser:

```sh
node scripts/evaluate_okf_explorer.mjs \
  --no-browser \
  --journeys-only \
  --journeys evaluation/okf-explorer/journeys.json
```
