---
type: "Specification"
title: "Data Catalog Vocabulary (DCAT) Version 3"
description: "W3C vocabulary for catalogues, datasets, data services, endpoint URLs, endpoint descriptions, publishers, licences and distributions."
resource: "https://www.w3.org/TR/vocab-dcat-3/"
tags: [dcat, standard, catalogue, data-service, dataset]
timestamp: 2026-07-09T00:00:00Z
verified: "yes"
---

DCAT is the W3C vocabulary used to describe data catalogues. For API-related OKF bundles, the core alignment is `dcat:DataService` for API products and data-access services, `dcat:Dataset` for data products, `dcat:endpointURL` for service entry points, `dcat:endpointDescription` for human or machine-readable endpoint descriptions, and `dcterms:license` / `dcterms:publisher` for legal and organisational metadata.

The UK Government APIs OKF uses DCAT terms as export targets, not as the native authoring format. The pack is DCAT-alignable until a generator emits RDF and validates it against DCAT/DCAT-AP profile rules.
