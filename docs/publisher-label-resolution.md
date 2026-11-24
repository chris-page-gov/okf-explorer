# Publisher label resolution

Large-corpus publisher routes use labels in this order:

1. When the bundle advertises an endpoint-label index, its governed label for
   the exact route. If that advertised index has no label for the route, show
   **Missing label**; a source title must not conceal the coverage gap.
2. Without a governed label for the route, the publisher title in the already
   loaded full index.
3. A non-empty `publisher_title` on an already loaded record whose
   `publisher` identifier exactly matches the route identifier.
4. The existing route label or identifier fallback, subject to the opaque-ID
   guard. Opaque identifiers remain unavailable as human-readable labels.

The record fallback does not match on a similar name, a title, or a slug. It
does not trigger another data request. This keeps a publisher label tied to
the selected publisher identity while preserving the bounded Reader loading
model. A governed endpoint label takes precedence over either source-derived
title, and an advertised missing label remains explicit. The label is
presentation metadata; it does not create a semantic assertion or confirm an
organisation's legal identity.
