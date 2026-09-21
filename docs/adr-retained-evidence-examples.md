# Retained evidence examples

**Decision date:** 21 September 2026. **Status:** implementation candidate;
publication and public verification are separate gates.

## Problem

Ask OKF already separates the evidence selected for a task from the size of each
tool response. Its compact catalogue and exact reads address response limits.
The existing browser link reconstructs the package using an approved source,
question, budget and engine. That protects identity across supported upgrades,
but inspection still requires a running service and supported assembler.

Approved demonstration examples need a small, durable evidence view. This does
not justify persisting anonymous questions or creating a second retrieval
engine. Earlier staff review packs also have a different purpose: they contain
independently chosen candidate excerpts, not necessarily the evidence selected
by Ask OKF. Neither publication replaces the other.

## Decision

Add a generic offline exporter under `tools/context-archive/` and the additive
[archive profile](../profiles/context-archive/v1/README.md). A reviewed registry
names fixed canonical packages and receipts by their exact hashes. Export
reuses `contextManifest()` and `readContextEvidence()` from
`apps/okf-explorer/src/lib/context/delivery.ts`; it never assembles a question.

The exported directory contains a small index, hash-linked catalogues, exact
record text and metadata, relationship and diagnostic streams, the unchanged
whole package and a static reader. Opaque content-derived paths avoid using
source identifiers as filenames. Limits are explicit and overflow fails closed.

The browser checks each resource before parsing or display, then verifies all
parts and the complete digest of the selected value. It renders source text as
text, retains provenance and missing evidence, and distinguishes capture dates
from source dates. No source URL is fetched automatically. Selected relationship
paths remain inspectable without loading the full corpus or asserting that
unselected endpoints have evidence in the archive.

The reader says **recorded evidence**, identifies whether the observation was
local, public or synthetic, and makes no AI-answer or legal acceptance claim.
Source version and engine attribution are reviewed registry declarations bound
to the retained receipt; the exporter validates bytes, not every upstream
receipt's meaning. Unknown original engine identity remains unknown.

## Alternatives and coupling

- **Store every query in the service:** rejected for this work. It introduces
  persistence, retention and privacy decisions without helping the approved
  fixed-example requirement.
- **Embed all snapshots in the Worker:** unnecessary deployment size and
  coupling. Static publication works independently of service upgrades.
- **Create another full Explorer bundle:** adds navigation/schema projection
  work and risks confusing retained selection with the full corpus. The small
  view uses existing delivery structures and selected paths directly.
- **Serve native MCP resources now:** deferred. A future read-only resource
  transport can expose an approved archive catalogue without changing its
  content or accepting arbitrary remote URLs.

The existing live service, recipes, engine compatibility rules and package
family remain unchanged. The static archive does not recreate an AI answer or
constitute an answer audit log. Such an audit would also need a separately
governed model output, claim-level citations and assessment record.

## Publication and acceptance

A publishing repository explicitly admits the reviewed registry and generated
archive subtree, verifies every output against its artifact manifest and binds
the exporter revision. Existing DWP Pages rules only admit public documentation;
they must be extended narrowly rather than copying arbitrary JSON or private
inputs. Frozen source captures, model trials and receipts remain unchanged.

The offline controls and actual local browser command are documented in the
[tool guide](../tools/context-archive/README.md). They cover synthetic non-DWP
data and retained current, historical and empty packages. No legal completeness
or model quality is inferred from successful reconstruction. Public release
requires an additional actual-host identity and journey check.
