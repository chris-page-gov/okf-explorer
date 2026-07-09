---
type: "Specification"
title: "DCAT Application Profile 3.0.0"
description: "European DCAT application profile for interoperable data portals and federated catalogue metadata."
resource: "https://semiceu.github.io/DCAT-AP/releases/3.0.0/"
tags: [dcat-ap, dcat, standard, catalogue, federation]
timestamp: 2026-07-09T00:00:00Z
verified: "yes"
---

DCAT-AP is an application profile over DCAT for interoperable data portals. It matters for OKF API/data bundles because data.gov.uk and related public data catalogues already use DCAT-style concepts, and API catalogue records need to federate with datasets rather than create a parallel vocabulary.

In this repo, DCAT-AP is treated as a conformance target for future RDF exports. The generated OKF large-corpus descriptor records the likely DCAT/DCAT-AP class and missing export requirements for each API/data record, but it does not claim DCAT-AP conformance unless an RDF artefact is generated and validated.
