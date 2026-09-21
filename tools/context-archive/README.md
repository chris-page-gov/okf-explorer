# Retained evidence exporter and static reader

This offline tool packages reviewed fixed examples for small, inspectable web
downloads. It reuses Explorer's existing delivery helpers and preserves the
whole canonical package. No live MCP service, question assembly, model call,
source fetching or storage service is involved.

Read the [archive profile](../../profiles/context-archive/v1/README.md) and
[decision record](../../docs/adr-retained-evidence-examples.md) first.

## Export an approved registry

Use Node.js 22.18 or later with native TypeScript stripping. There are no new
dependencies. The input root and every referenced file must be regular local
paths without symbolic links. The output's parent directory must exist; the
output itself must not exist.

```sh
node --experimental-strip-types tools/context-archive/export.ts \
  --registry /absolute/path/approved-registry.json \
  --input-root /absolute/path/public-inputs \
  --output /absolute/path/fresh-export
```

The registry schema contains the exact field names. `fixtures.ts` demonstrates
a fully populated synthetic registry and an explicitly selected, three-case
registry using retained local integration observations. Those fixture functions
are test helpers, not automatic publication approval or a directory scan.

The exporter checks the existing package schema with a closed interpreter for
the keywords used by the pinned local profile. Unknown keywords and remote
schema references fail closed; it is not a general JSON Schema implementation.
It checks the original context identifier separately from the full canonical
package hash and rejects non-canonical or duplicate-key package JSON.

Publish the entire exported directory byte for byte through a reviewed,
allowlisted static-site build. Bind its artifact manifest and source code
revision in the publishing repository. Do not add an unrestricted repository
copy rule or regenerate snapshots during a live demonstration.

## Offline controls

From the Explorer repository root:

```sh
node --experimental-strip-types --test tools/context-archive/archive.test.ts
```

Controls cover a synthetic non-DWP Unicode example; exact current, historical
and empty retained packages; deterministic output; package/receipt/question
tampering; existing output preservation; source symlinks and FIFO files; gzip
expansion and schema limits; unsafe URLs; mixed contexts; incomplete slices and
cancelled requests. Historical observations are inputs and remain unchanged.

## Actual local Chrome journey

Use an already installed Playwright runtime and Chrome. The explicit module
argument avoids dependency downloads or shared `node_modules` changes.

```sh
mkdir -p tools/context-archive/validation
node --experimental-strip-types tools/context-archive/check-browser.ts \
  --playwright-module /absolute/path/to/installed/@playwright/test/index.mjs \
  --output tools/context-archive/validation/a-fresh-attempt
```

The harness exports the three retained packages plus synthetic evidence into a
temporary directory, serves them over loopback and blocks external browser
requests. It records actual file hashes, screenshots, browser identity and
journey results. Its output must be new. It checks exact source text and whole
package hashes, directed relationships, source/capture date labels, keyboard
focus, narrow mobile layout and a deliberately tampered descriptor.

This is targeted automated browser evidence, not comprehensive accessibility,
screen-reader, public deployment, legal, model-answer or current-law acceptance.
The local reader does not establish that a public host serves the same bytes.
