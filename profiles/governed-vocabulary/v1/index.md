# Governed vocabulary v1 candidate

This candidate publishes three [SKOS concept schemes](https://www.w3.org/TR/skos-reference/).
The [registry](registry.json) binds the exact bytes of
[the Turtle graph](vocabulary.ttl). It records the version, responsible
maintainers and scheme identifiers. A producer can pin the registry and use
the concept IRI as a stable identifier. Explorer's existing label-only and
predicate-aware Readers continue to use their existing contracts.

## Topics

The topics scheme groups subject concepts used in the Explorer.

### Education

Use `education` for learning and services that support access to education.
The project scope is informed by [GOV.UK education and learning](https://www.gov.uk/browse/education).

## Formats

The formats scheme describes the media type of a distribution or resource.

### CSV

Use `text/csv` for the registered comma-separated values media type. The
[IANA media type registration](https://www.iana.org/assignments/media-types/text/csv)
defines the format reference.

## Licences

The licences scheme identifies the rights requested or declared for a
distribution. Confirm the actual licence and applicable rights against the
producer's evidence.

### CC BY 4.0

Use `CC-BY-4.0` for Creative Commons Attribution 4.0 International. The
[Creative Commons deed and legal code](https://creativecommons.org/licenses/by/4.0/)
are the external rights reference.

## Version and mapping policy

The graph records an exact notation within each scheme. Each `dcterms:source`
links to the source used to define the notation or scope. Each SKOS mapping
records the relationship between the project term and a named external term.

| Project term | Mapping | Reason |
| --- | --- | --- |
| Education | `skos:broadMatch` | The GOV.UK topic also covers training and skills. [GOV.UK taxonomy](https://www.gov.uk/education) |
| CSV | `skos:closeMatch` | The EU file type uses the same IANA media-type notation and describes the broader file representation. [EU Publications Office CSV entry](https://publications.europa.eu/resource/authority/file-type/CSV) |
| CC BY 4.0 | `skos:exactMatch` | The SPDX identifier names the same licence version and points to its legal code. [SPDX licence entry](https://spdx.org/licenses/CC-BY-4.0.html) |

The project checks the byte count, digest, scheme membership, notation
uniqueness and preferred labels. The [named SHACL Core shapes](shapes.ttl)
check concept labels, scheme links and notation. Add new concepts through a reviewed
vocabulary revision. If a concept's meaning changes, mint a new identifier
and preserve the earlier identity and its deprecation record.

This initial vocabulary supports review of [issue #49](https://github.com/chris-page-gov/okf-explorer/issues/49).
Adoption still needs a producer exemplar and exact published resolver and
Reader evidence. The review of that exemplar covers any accepted use of these
candidate mappings.
