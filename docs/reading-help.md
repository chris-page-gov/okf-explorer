# Reading help for exact source passages

The [reading-help view](../reading-help/) opens a separately governed
`okf-reading-help.v1` JSON manifest. It displays exact text from frozen page
extractions and adds help only to declared occurrences. It does not search a
document for similar words or choose a meaning by spelling alone.

The producer supplies:

- `sources`: the frozen page JSON path and SHA-256, source PDF URL and PDF
  SHA-256 for each cited document;
- `passages`: ordered, page-labelled UTF-8 byte spans for the source text;
- `occurrences`: exact source spans and roles, such as an abbreviation or a
  source reference marker;
- `cards`: reading explanations, their review status, exact supporting source
  quotations and a resolved or unresolved destination;
- `limitations`: the scope and unresolved evidence gaps to show readers.

The page checks the manifest shape, page JSON hashes and source identities. It
then checks every passage, occurrence and supporting quotation against the
frozen page text. A cross-page passage remains split into labelled pages. The
PDF links use the source-declared URL; this view does not download the PDF to
check its bytes.

Each help button is an explicit occurrence in the manifest. For example,
`GB` and the adjacent source marker `6` can lead to different cards. Unresolved
references show their gap and the exact source quotation. A resolved local
destination must name a passage in the same manifest. Help cards keep
project-authored explanation separate from official source text and cannot
establish current legal applicability or decide entitlement.

The DWP Chapter 60 producer maintains the first bounded example for paragraphs
60025 and 60033 in its own repository. Its frozen source bytes, occurrence
choices and review status remain producer responsibilities. The Explorer route
contains no DWP terms or rules.
