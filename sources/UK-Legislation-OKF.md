---
type: "Source"
title: "UK Legislation OKF"
source: "https://www.legislation.gov.uk"
tags: [legislation, okf, eli, clml, schema-org, provenance]
---

# UK Legislation OKF source specification

The canonical source is legislation.gov.uk, operated by The National Archives. The generated corpus enumerates the official Atom year facets, verifies each annual result count, includes draft instruments, retains official identifiers and manifestations, and resolves subdivisions from official CLML only when a work is selected.

The semantic profile combines [ELI 1.5](https://op.europa.eu/en/web/eu-vocabularies/eli), [ELI-I](https://interoperable-europe.ec.europa.eu/collection/eli-european-legislation-identifier/solution/eli-i), [Schema.org Legislation](https://schema.org/Legislation), the [legislation.gov.uk data model](https://legislation.github.io/data-documentation/model/legislation.html), [CLML](https://legislation.github.io/clml-schema/userguide.html) and [Akoma Ntoso](https://docs.oasis-open.org/legaldocml/akn-core/v1.0/).

Source facts and legal text remain distinct from derived topic labels and normalized convenience fields. Title topics are non-authoritative. Legal currency requires point-in-time, commencement, extent and effects checks. The Research bulk/SPARQL surfaces documented at `research.legislation.gov.uk/data` returned an authentication challenge at generation time, so the pack records but does not claim ingestion from them.

The public viewer, rebuild instructions, complete access-method inventory and barrister-oriented provenance contract are documented in [docs/uk-legislation-okf.md](../docs/uk-legislation-okf.md).
