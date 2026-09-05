# Shared Explorer interaction implementation

This local change implements the UI review of 5 September 2026 and the user's
SeeLinks refinements. The base Explorer commit is
`c8af0b05cab49a5341e0b787e17d49a674868d3a`. The implementation belongs to this repository. The separate
[early-years rehearsal kit](https://github.com/chris-page-gov/gds-local-hackathon-20260909-early-years)
contains the fictional producer fixture and portable consumer acceptance.
SeeLinks was inspected read-only. The kit's original pinned Explorer build and
historical execution receipts are preserved. The owner authorised public publication of this synthetic rehearsal on 5 September 2026; production gates remain required.

## Interaction and state boundaries

Query and committed scope, preview highlight, presentation folds, inspected
record and graph focus are separate state. Plain clicks toggle selected values off; an unselected value replaces the
selection in its own facet; Command on macOS or Ctrl on Windows/Linux gives OR within it.
Populated facets combine with AND. Keep highlighted/unhighlighted commits a
reversible predicate; folding retains a membership snapshot. An active zero-match
preview is distinct from having no preview. Double-click and Alt+Enter commit the
whole preview; they never toggle an existing reduction off.

The indexed worker applies these predicates to complete candidate identities
before ranking display limits and bounded document hydration. It returns a
separate current-scope facet distribution and, where complete and bounded,
fold-membership IDs. Legacy `filter.*` links remain supported. The additive
`explore` query parameter retains preview and reduction history; malformed or
oversized expressions are rejected visibly. The same predicate also constrains
hydrated records used by other large-corpus views.

## Reviewable modules

| Module | Responsibility |
| --- | --- |
| `viewer/facetSelection.ts` | Pure selection algebra, URL validation, bounded keep history and identity-set operations |
| `viewer/smallExploration.ts` | Small-bundle facet values and counts over one shared scope |
| `viewer/localExploration.ts` | Complete local-index and bounded map counts, fold membership and explicitly simple local text matching |
| `viewer/smallGraph.ts` | Explicit graph focus independent of inspection; scope and fold boundaries |
| `viewer/bookmarks.ts` | Bundle-qualified bookmark identity and defensive persistence parsing |
| `viewer/workspaceNavigation.ts` | Panel order and horizontal swipe thresholds |
| `components/WorkspaceShell.svelte` | Three-panel layout, independent scrolling, footer, touch and focus handling, keyboard splitters and rails |
| `components/FacetPanel.svelte` | Shared facet values, pin/open controls, compact selection summaries, bounded distributions and explicit multi-selection |
| `components/ExplorationToolbar.svelte` | Keep, complement, Undo, reset and live folded summaries |
| `components/ResultList.svelte` | Shared cards/list, selection, highlighting, honest loading/empty states and stable evidence-capture attributes |
| `components/BookmarkShelf.svelte` | Pin disclosure, open/remove and explicit copy/download actions |
| `components/InspectorSections.svelte` | Accessible inspector tabs with independently pinned sections |
| `components/SmallRecordInspector.svelte` | Existing safe Markdown, provenance, lifecycle, trust and passive attestation content in the common tab structure |

The route coordinates loading and existing specialist large-corpus views. New
interaction rules are not duplicated across adapters. Obsolete private facet
and resize functions were removed. The existing route still contains substantial
specialist graph and data-card code; this change establishes bounded extraction
seams rather than claiming the entire historical application is now small.

Tests cover state invariants, actual server-rendered component output and the
worker boundary. Extracted behaviour is no longer tested by counting copies of
source strings in the route. Existing production descriptors, semantic schemas,
assertion authority, safe rendering and static-search ceilings remain governed
by their existing contracts.

## Local execution evidence

The kit contains portable consumer checks and a curated public evidence summary.
Raw local receipts remain outside the published source tree. The receipt records
exact commands, runtime, source hashes, URLs, outcomes and any unrun gates. The
browser journey navigates the actual built Svelte Explorer and fixture URLs, checks
22 concepts and 23 relationships, exercises the small and indexed formats, and
opens a corrupted JSON copy. Development failures are retained separately from
final acceptance. Injected HTML is not used as URL-navigation evidence.

The portable kit server binds `127.0.0.1:4175` and serves the actual built
Explorer plus the fixture directly. The former proxy to the historical server is
not required. The project permission profile retains network-proxy enforcement,
both authorised roots and explicit loopback additions. Where the host sandbox
still restricts browser launch or socket binding, scoped host execution is used
under the owner's local-testing authorisation. Browser tools and shell networking
are verified independently; no global approval or administrator restriction is
relaxed.

Acceptance is recorded against the completed app build and fixture materials in
the kit's public summary and repository CI. Earlier development runs remain
historical evidence, not final release receipts. Coverage includes the three
browser engines, runtime schema validation, the synthetic fixture, corrupted
input, accessibility checks and indexed-corpus journeys. These checks do not
establish complete accessibility certification or full upstream conformance.

The owner authorised the Explorer update and public synthetic kit repository.
Publication still requires protected-main checks and the existing Pages gates.
Paid model calls, live referrals, identity merges and real-personal-data
processing remain outside this work's authority.

## Evaluation compatibility

The released Heritage profiles retain their exact historical bytes. The current
impact planner classifies four explicitly named repository journey manifests
through the existing browser-control rule; other unknown paths still fail closed.
Version 2 receipt comparison validates the complete artefact root and the separate
semantic identity using the shared receipt algorithm. A serialisation change does
not become a graph-meaning change, and a malformed identity still blocks trust.
The obsolete Python facet source-string assertion is covered instead by the
shared component rendering tests and actual browser search, paging and selection
journeys.
