# Web And Browser Foundations

OKF Explorer is a static web application. That phrase is easy to misread:
“static” describes how it is hosted, not how little it can do.

## Client And Server

When you visit a website:

- the **client** is usually your browser;
- a **server** returns files or data in response to requests.

A traditional web application may ask a server to run a database query for
every search. OKF Explorer instead downloads a prebuilt application and
prebuilt data indexes. Search, filtering and most presentation then happen in
the browser.

The pack's source publisher may still provide external services. For example,
the legislation view can request current provision XML from an official
service when a user asks for it. That progressive request is different from
running the Explorer itself.

## URLs

A URL identifies something available through the web:

```text
https://example.org/data/okf-explorer.json
```

Its important parts are:

- `https` — the protocol;
- `example.org` — the host;
- `/data/okf-explorer.json` — the path.

URLs can also have a query string and fragment:

```text
https://explorer.example/?bundle=ENCODED_URL&view=reader#overview
```

The query string carries named values such as the bundle URL and active view.
The fragment begins with `#` and identifies state within the page. The
Explorer also serializes searches and filters into the URL so Back, Forward,
bookmarking and sharing behave predictably.

An **absolute URL** contains the whole address. A **relative URL** such as
`data/chunk-01.json` is resolved against another URL. Large-pack descriptors
use both.

## HTTP, HTTPS And Requests

HTTP is the request-and-response protocol of the web. HTTPS is HTTP protected
by transport encryption and server authentication.

A browser request receives:

- a status such as `200` for success or `404` for not found;
- headers describing the response;
- a body containing HTML, JSON, XML, an image or other bytes.

The Explorer retries selected temporary failures, applies timeouts and limits
the number of bytes it will accept. These are reliability and safety controls,
not just performance tweaks.

## Same Origin And CORS

An **origin** is the combination of protocol, host and port. A browser protects
one origin from silently reading arbitrary responses from another.

Cross-Origin Resource Sharing, or **CORS**, is the mechanism by which a server
allows a browser application on another origin to read its response. A public
pack can be downloadable in a browser tab yet still fail to load inside the
Explorer if its server does not send suitable CORS headers.

This is why bundle authors must test the published URL through the hosted
Explorer, not only by opening the JSON file directly.

## Common Web Data Formats

### HTML

HTML describes the structure of a web page: headings, links, buttons, forms
and regions.

### CSS

CSS controls layout and appearance, including responsive behaviour for
different screen sizes and visible keyboard focus.

### JavaScript And TypeScript

JavaScript is the programming language executed by the browser. TypeScript
adds development-time type checking so the code can state what shape of value
it expects. TypeScript is compiled to JavaScript before publication.

Types catch many mistakes during development, but they do not prove that a
remote JSON file is trustworthy. Runtime checks and publication validation are
still required.

### JSON

JSON represents objects, arrays, strings, numbers, booleans and null:

```json
{
  "id": "dataset/monthly-house-prices",
  "title": "Monthly House Prices",
  "tags": ["housing", "prices"]
}
```

It is strict about quotes, commas and value types. Generated bundle,
descriptor, manifest and search files use JSON because browsers can parse it
directly.

### XML

XML represents nested elements and attributes. UK legislation services use
Atom and CLML XML, so the Explorer includes domain-specific XML parsing even
though most OKF runtime artifacts are JSON.

## What “Static” Means

A static host serves files that were built in advance. It does not need to run
this repository's Python or TypeScript source for each visitor.

This has useful consequences:

- hosting can be simple and inexpensive;
- published files can be cached and mirrored;
- a release can be integrity-checked and reproduced;
- there is no application database to operate;
- the browser must do more work;
- data needing server-side secrets cannot be fetched directly;
- large collections must be split so initial downloads remain useful.

GitHub Pages is the static host used by this repository.

## Svelte, SvelteKit And Vite

The canonical Explorer is written with:

- **Svelte**, a component system for building reactive interfaces;
- **SvelteKit**, the application structure and static-site adapter;
- **Vite**, the development and production build tool.

A component combines structure, behaviour and styling for a part of the
interface. For example, the geospatial map and legislation detail surface are
specialized components. Shared TypeScript modules handle loading, search,
normalization and presentation rules.

The build produces ordinary browser files. A user does not need Svelte
installed to visit the published Explorer.

## Progressive Web App

A Progressive Web App, or **PWA**, is a web application with installable and
offline-oriented capabilities supplied through a web manifest and, commonly,
a service worker.

The repository retains a dependency-free compatibility PWA under `explorer/`.
The canonical Svelte application is the main product. A service worker can
cache files, but stale caches can also make upgrades confusing, so migration
and retirement behaviour must be deliberate.

## Browser Storage

The browser provides small stores such as `localStorage`. The Explorer uses it
for best-effort history of recently loaded bundle URLs. It is not the source
of truth for the corpus, and it may be unavailable in private browsing or
cleared at any time.

Shareable state belongs in the URL or the published pack rather than only in
one browser's storage.

## Web Workers

JavaScript normally updates the interface on the browser's main thread. A
large search could make buttons and scrolling feel frozen.

A **Web Worker** runs JavaScript in a background browser context. The large
search index is queried in a worker, which sends structured results back to
the interface. The worker cannot directly manipulate the page, which helps
keep retrieval logic separate from presentation logic.

## Responsive And Accessible Interaction

The same static application must work with:

- mouse, touch and keyboard input;
- narrow and wide screens;
- zoomed text;
- screen readers and other assistive technologies;
- reduced motion or limited processing power.

Semantic HTML, labelled controls, focus management, contrast and non-pointer
alternatives are part of implementation correctness. They are not decoration
added after the data model is complete.

## The Runtime In One Sequence

When a user opens the Explorer:

1. the static HTML, CSS and JavaScript load;
2. the application reads the requested bundle URL;
3. it fetches a small bundle or large descriptor;
4. it validates enough structure to choose a loader;
5. it loads overview and search artifacts as needed;
6. the worker handles large search calculations;
7. components render the selected view;
8. URL state and browser history record meaningful interaction.

The source server only sends files. The intelligence in this sequence is split
between pre-publication builders and the browser.

## Next

[Markdown, OKF and small bundles](03-markdown-okf-and-small-bundles.md)
explains the simplest source and publication path.
