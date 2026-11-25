---
id: uk-country-boundaries
root: profiles/geospatial-boundary-pack/v1/examples/uk-countries-december-2025
title: Check country coverage, vintage and cartographic limits
question: Which UK countries can this pack compare, which boundary vintage and source conditions apply, and can it establish district-level or precise coastline conclusions?
answer: >-
  The four records cover England, Scotland, Wales and Northern Ireland.
  The manifest identifies December 2025 country boundaries, with separate
  overview and detail representations retrieved on 18 November 2026.
  Crown Dependencies and Overseas Territories are excluded. The source
  attribution and licence are retained. Cartographic generalisation and
  Mean High Water clipping limit coastline interpretation; country records
  do not provide district-level evidence.
records: [E92000001, S92000003, W92000004, N92000002]
expected_titles: {E92000001: England, S92000003: Scotland, W92000004: Wales, N92000002: Northern Ireland}
source_expectations:
  - {path: manifest.json, pointer: /vintage, equals: "2025-12"}
  - {path: manifest.json, pointer: /coverage/crown_dependencies, equals: excluded}
  - {path: manifest.json, pointer: /coverage/overseas_territories, equals: excluded}
  - {path: manifest.json, pointer: /representations/detail/source/retrieved_on, equals: "2026-11-18"}
  - {path: manifest.json, pointer: /representations/overview/source/retrieved_on, equals: "2026-11-18"}
expected_counts: {records: 4, relationships: 0}
relationships: []
records_path: data/datasets-0.json
sources: [manifest.json, receipt.json, data/overview.geojson, data/detail.geojson]
limitations:
  - The graph contains no asserted relationships between the four country records.
  - Crown Dependencies and Overseas Territories are outside the declared coverage.
  - Small islands are subject to scale generalisation; use source geometry for analysis.
  - The pack does not establish local district boundaries or current operational suitability.
---

Open **England**, compare the other country records, then inspect the two
representation entries and their source hashes. Keep the source attribution,
vintage and coverage exclusions with any exported answer.
