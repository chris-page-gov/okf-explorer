# Review GIS AI GO learning in Explorer

This local integration uses the existing Explorer large-bundle Reader, learning
paths and Ask OKF context assembly. The producer belongs to the separate
[GIS AI GO repository](https://github.com/chris-page-gov/gis-ai-go), which owns
the OS/ONS metadata, source evidence and small linked learning records.

The three unassessed paths cover pavement width, building heights and road
elevation. Ordered steps and practice prompts are generated from those records.
Selecting a step uses the Reader's normal record locator and inspection panel.
Supporting concept links use the same selection mechanism. Suggested
prerequisites do not award competence or activate assessed programmes.

The optional `gis-ai-go.okf-plus-record-context.v1` projection retains the complete
original record metadata, stable identifier and source revision. The inspection
panel presents source/version, definitions and qualifications, with explicit
gaps for units, methods, coverage and retrieval evidence. It does not infer an
absolute elevation from relative height, a vertical datum from a field name, or
permission to retrieve data from catalogue inclusion. The full metadata remains
available with the record; the projection does not add semantic assertions.

## Build a portable candidate

Follow GIS AI GO's
[handoff](https://github.com/chris-page-gov/gis-ai-go/blob/codex/okf-223-reconcile-main/docs/implementation/OKF_EXPLORER_CLOUD_HANDOFF.md)
to build the public metadata bundle, context corpus and Reader projection. Keep
the generated `explorer` and `context` directories beside one another. Their
snapshot and digest bindings must match. No private captures or API keys belong
in this package.

Build the application with its locked dependencies and exact package manager:

```sh
cd apps/okf-explorer
pnpm install --frozen-lockfile
pnpm check
pnpm build:determinism
cd ../..
uv run --locked python scripts/build_site.py
node scripts/package_gis_learning_preview.mjs GIS_PROJECTION_ROOT NEW_OUTPUT_DIRECTORY GIS_SOURCE_COMMIT GIS_LICENCE_FILE
```

The packager verifies the app build manifest and GIS source revision, retains
the supplied GIS licence and both Explorer licences, and creates
a package manifest of the exact files. The generated `START-HERE.md` explains
how to run `node serve.mjs` in the package. Open its printed localhost address;
the preview needs HTTP to verify and fetch bounded local files. It requires
Node.js 24 or later, with no installation or API key at review time.

The app, core guides and local metadata work offline. Official source links require internet
access. The local package neither registers GIS AI GO with a hosted Ask OKF
service nor publishes a public bundle URL.

## Review journeys and limits

Choose each path, open its steps and supporting concepts, and inspect the
source, version and qualifications. Search for pavement width, building height
and road elevation. Use Ask OKF to inspect a bounded evidence package and its
omissions. Its sufficiency result remains authoritative: a metadata search hit
does not establish that a complete answer is available.

Check keyboard access, narrow-screen layout, local source links and browser
errors. Network evidence should show no eager dataset shards on initial load
and a targeted shard when selecting a step. Human comprehension, assistive
technology acceptance, current protected-data entitlement and release assurance
remain separate from this local technical preview.

## Compact search and facet navigation

Closed facet rows use an 8 px colour stripe and a 4 px highlight track. The
labelled colour-control button sits in the header beside pinning and options;
opening it reveals the existing labelled controls. Header controls retain 36 px
targets. The longer explanation stays under **How selection works**, so it
does not push the facets down before it is needed. Search/Ask OKF spacing is
reduced and the facet tabs stick within their own pane.

This layout applies to large and small bundles, including narrow screens.
It preserves the same selection, counts, multi-selection, pinning and keyboard
actions. Colour-strip segments remain descriptive; small slices do not become
tiny click targets. Browser checks exercise folded-row height, colour controls,
keyboard selection and Escape/focus, with existing interaction and accessibility
checks retained.
