# UK Legislation runtime acceptance

The release gate uses the production Explorer build and the generated local
`okf-uk-legislation/bundle/` publication. It does not substitute a small test
fixture for the corpus.

Run from `apps/okf-explorer/`:

```sh
pnpm acceptance:legislation
```

The runner first creates private, byte-copy snapshots of the complete
production build and legislation publication. Files in those snapshots are
read-only and are not hard links back to either checkout. The temporary
same-origin server serves only the snapshots, with real gzip transfer and the
byte ranges used by release datapacks. It executes the same journey in Chrome,
Firefox and WebKit:

1. load the Whole-Law federation and confirm its 36 source classes;
2. open the declared UK Legislation child and wait for static search to finish
   initialising;
3. reload the legislation descriptor in a fresh context and measure compressed
   startup transfer;
4. measure a first cold search and a second warm search;
5. inspect the real facet inventory, coloured distributions and workspace
   geometry;
6. verify that the official-effects reconciliation panel exposes agreement,
   live-addition, superseded and inaccessible states, including explicit zero
   counts;
7. open the Consumer Credit Act graph, verify official and derived relationship
   line styles, and activate an edge with the keyboard;
8. search for The Air Navigation (Amendment) Order 2026, hydrate its aligned
   governed v3 accepted model-enrichment shard, verify distinct official,
   derived and model-assisted relationship lines plus ordered evidence
   provenance, then hide and restore only the model-assisted class through the
   URL-backed authority filter;
9. run WCAG 2.2 axe checks and capture the Chrome renderer JavaScript heap.

The limits are 1 MiB compressed startup transfer, 3 seconds for cold search,
1 second for warm search, and 256 MiB for the nominated Chrome CDP JavaScript
heap measure. Firefox and WebKit do not expose that Chromium-only memory
metric; the receipt records those measurements as unavailable rather than
passing them.

The v0.6.1 release-bound canonical destination is
`release-assurance/explorer-runtime-acceptance.json`. It is intentionally
absent until the clean Explorer commit, annotated v0.6.1 tag and exact
legislation candidate can be bound by the v2 release gate. The byte-preserved
[26 July v1 receipt](../release-assurance/archive/explorer-runtime-acceptance-v1-2026-07-26.json)
is retained only as historical evidence under the
[archive classification](../release-assurance/archive/README.md); its legacy
overall `passed` field is not current release authority.
An unbound local run emits an `okf-explorer-runtime-acceptance.v1` diagnostic
receipt. Diagnostic evidence is deliberately assigned overall status `failed`
even when all its individual browser checks pass, so it cannot be mistaken for
a release gate. A release gate supplies all candidate and Explorer revision
arguments plus a fresh external `--output` path whose basename must be
`explorer-runtime-acceptance.json`; that run emits
`okf-explorer-runtime-acceptance.v2`.

Release evidence is pinned to Explorer v0.6.1. The runner reads the package
version, derives the Explorer `HEAD`, tree and v0.6.1 tag object from Git, and
requires an annotated tag that resolves to that `HEAD`. It independently derives the
legislation candidate `HEAD`, tree and the complete bundle inventory digest.
Both checkouts must be clean. The supplied revision arguments are expectations,
not evidence: every supplied value must exactly equal the corresponding
derived value. See the [Git object model](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
for the distinction between commits, trees and tag objects.

The public `pnpm acceptance:legislation` command acquires the checkout lock and
performs the deterministic build before it starts this inner runner. Do not
invoke the inner runner or start a separate preliminary build: both would
bypass or duplicate the governed build-first sequence. A release-bound run
requires the validated on-disk manifest and does not use the local in-memory
fallback.
The wrapper records a completed-build attestation in its live lock only after
the deterministic command succeeds. Before opening the acceptance server, the
runner verifies the exact command digest, build-script bytes, canonical
manifest bytes and app-build tree. It binds the runner, runtime contract,
build-manifest module, wrapper, lock module, deterministic-build script,
package metadata and dependency lock before the browser work, then rereads all
of them afterwards. It also revalidates the live completed-build lock after all
browser contexts and the server have closed. The receipt projects only safe
repository-relative paths and digests from that proof; it does not expose the
owner token, absolute local paths, URL query strings or credentials.
Both live-lock verifications receive the runner's deadline. Lock and build
material reads are byte-bounded, check the deadline before allocation and each
read, and pass that same deadline into canonical build inspection.

The complete source bundle and build are scanned within bounded entry, file,
depth, per-file and aggregate-byte limits while being copied. Directory
entries are consumed incrementally and the entry ceiling is checked before a
name is retained. Files are size-checked before any result buffer is allocated,
opened without following links, read in bounded chunks and checked for
truncation, growth, replacement and identity changes. The shared canonical
build inspector applies the same finite deadline and ceilings before it reads
the manifest or any build material, and checks it again before allocating read
buffers and before and after canonical parsing or serialisation. The runner rejects symbolic links, hard
links and special files. It computes the bundle digest with the same canonical
JSON inventory algorithm as the legislation release tooling. After the browser
journeys it rehashes both live sources and both snapshots and requires all four
identities to remain exact.

On a successful path the private snapshot directory is removed and its absence
verified before the canonical receipt is constructed or published. A cleanup
failure therefore cannot leave a passing receipt. Failure paths also attempt
bounded cleanup, while the wrapper's process-group timeout remains the final
hard stop.

Every invocation stages a self-contained, write-once evidence tree beside the
receipt:

- the exact bytes of its runner, runtime contract, build-manifest module,
  wrapper, lock module, deterministic-build script, package metadata and
  dependency lock beneath their repository-relative paths;
- both descriptors under the safe relative `bundle/` root;
- the canonical production-build manifest at
  `explorer-build/okf-explorer-build-manifest.json`;
- every file described by that manifest beneath `explorer-build/`, including
  the unique production index at `explorer-build/index.html`; and
- both current Chrome captures under `output/playwright/`.

Every material has an exact positive byte count and SHA-256 digest. The receipt
reports only these safe paths, never a `../` path back into an Explorer or
legislation checkout. Its `outputs.receipt` value is exactly
`explorer-runtime-acceptance.json`, matching the Whole-Law pre-RC controller.
The deployed `okf-explorer-build-manifest.json` is canonical UTF-8 JSON plus a
final line feed. It has schema `okf-explorer-app-build-manifest.v1`, algorithm
`sha256-canonical-json-materials-v1`, a positive `file_count`, `tree_sha256`
and `materials` strictly sorted by raw Unicode code-point path order. Each
material is a unique, safe, build-root-relative POSIX path with positive bytes
and SHA-256. Directories are not included. The manifest excludes itself to
avoid recursive hashing, and the tree digest is SHA-256 over the UTF-8 bytes
`JSON.stringify(materials) + "\n"` with material key order
`path`, `bytes`, `sha256`.

The release-bound runner requires that deployed manifest, canonical-parses and
re-renders it, scans the complete app build without following links, and
rejects missing, extra, duplicate, unsafe, linked or tampered files. It stages
the manifest and every described file independently with write-once semantics.
`inputs.explorer_build` exposes `root`, `manifest`, the exactly matching
`index`, `files`, `sha256`, `algorithm` and the complete ordered staged
`materials` array so a downstream finalizer can enumerate and independently
rehash the evidence tree. The integrity projection also reconstructs the
canonical manifest from those rows and requires the staged manifest byte count
and digest to match it. A mutable local v1 run may derive the same manifest in
memory when a plain local build predates the deployed manifest.
Publication is durable and write-once: the runner synchronises a private
temporary file, publishes it atomically without replacement, removes the
temporary name, synchronises the containing directory and then independently
rereads the exact expected byte count through a no-follow file descriptor. It
verifies and synchronises the destination inode itself, then verifies the
complete bytes and physical parent for both a newly created file and an
already-present identical file. It fails rather than replacing a
divergent, symbolic or linked destination. The receipt and
`output/playwright/` captures must be physically contained by the same evidence
root. A release evidence root must be a new, absent directory whose parent
already exists, and must be disjoint from both source checkouts: it may neither
contain a source checkout nor be contained by one. Use a different external
directory for each measured attempt. This follows the durability distinction
documented for Node file handles and `fsync` in the
[Node.js file-system API](https://nodejs.org/api/fs.html).

The hard aggregate limits are 19 minutes for the runner, 20,000 bundle entries,
12,000 bundle files, 2 GiB of bundle bytes, 2,000 build entries, 1,000 build
files, 128 MiB of build bytes, 128 MiB per file, a 16 MiB canonical build
manifest, 50,000 HTTP transfer rows, 8 GiB each of wire and decoded transfer
bytes, 16 concurrent requests, 256 MiB of in-flight decoded source bytes,
8 MiB of retained telemetry, 64 KiB per retained string, 10,000 graph edges,
two screenshots of at most 20 MiB each, and a 32 MiB receipt. The snapshot
cleanup allowance is 15 seconds. At least 10 seconds of the governed runner
deadline must remain before receipt publication begins. Receipt and telemetry
sizes are measured incrementally before their complete JSON representations
are allocated, with deadline checks during measurement and immediately before
and after complete serialisation and durable publication. The final
post-publication deadline check prevents an earlier duration observation from
authorising late evidence. Every admitted HTTP request holds a concurrency
reservation until its response finishes or closes; successful, ranged, compressed and
not-found responses also reserve their transfer row and byte budgets before
material is read or a response is queued. Exceeding any bound puts the same-origin acceptance server into
a sticky fatal state or otherwise fails the run; a later request cannot erase
that failure, and no bound is reported merely as an advisory observation.

The receipt binds every browser version, exact measurements, resource ceilings,
gate decisions and limitations. Live official full-text search is replaced
with an empty deterministic Atom response so source availability cannot change
the static local-search measurement. The accessibility gate names its assessed
standard as [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) and uses the
[axe-core Playwright integration](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright).

The detailed `gates` and `browsers` evidence remains authoritative. Stable
release-facing projections additionally expose overall runtime counts plus
`cross_engine`, `accessibility`, `performance` and `integrity` statuses. These
paths are the contract consumed by the UK Legislation clean-room reproduction
gate. The integrity projection fails closed unless both descriptors, the
canonical build manifest, its complete staged material set and the exact
two-current-Chrome-screenshot set have canonical paths, positive byte counts
and valid SHA-256 evidence. A stale, missing, duplicated, extra or internally
inconsistent material cannot satisfy a passing receipt.

The projection contract can be tested without building the application or
running the real corpus:

```sh
pnpm test:acceptance-contract
```
