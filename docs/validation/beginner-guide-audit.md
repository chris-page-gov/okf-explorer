# Audit the beginner guide

Run the beginner guide browser suite against the assembled Site. The suite
opens each chapter, checks its declared headings and fragment navigation,
tests the keyboard skip link and reflow at 320 pixels, and runs Axe. Record
manual checks of full keyboard order, focus visibility,
reflow, touch, reduced motion and sidebar behaviour alongside those results.

Build the source inventory from the same Site’s `cross-references.json` and
chapter HTML. The inventory covers external links and HTTP identifiers in
code examples. Each record lists the chapter routes, source classification
and whether the audit expects a response. A new origin requires a decision
about its role before it can be observed.

```sh
uv run --locked python scripts/audit_beginner_guide_sources.py \
  --site _site --output /tmp/okf-guide-source-inventory.json
uv run --locked python scripts/audit_beginner_guide_sources.py \
  --site _site --output /tmp/okf-guide-source-observations.json --observe
```

The observation records the requested and final URL, redirects, HTTP status,
time and tool. For responses it records the media type, the HTML title when
available and a digest of up to 64 KiB. Review titles and identities against
the references the guide describes. A response shows what a publisher served
at the recorded time. Use the publisher’s provenance to assess authority and
check that the content supports the guide’s claim.

Carry HTTP errors, access challenges and redirects that need review into the
release audit. For example, keep a documented historical identifier in a
worked example and link to the current authoritative lookup for readers.
The local inventory and its observations form inputs to the exact deployed
browser audit.
