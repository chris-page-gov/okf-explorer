# Evidence workbench

The Evidence workbench lets a reviewer move from a question to the source
passages selected for it. It is the start of an authoring environment: a reviewer
can inspect the interpretation and export a proposed correction. It does not
change the source or decide a person's entitlement.

## Search, Ask OKF and the workbench

- **Search** finds potentially relevant records.
- **Ask OKF** assembles a bounded evidence package and records how it selected
  each item, which relationships it followed and what remains missing.
- **Evidence workbench** opens a retained package for inspection. It does not
  secretly rerun the question or replace the evidence with a model answer.
- **An AI answer** is a separate interpretation of that package. The workbench
  neither generates nor certifies an answer.

Open `/evidence/` in Explorer and supply a workbench manifest URL. A manifest is
a small catalogue of public questions and links to their exact evidence. The
URL can retain `manifest`, `case`, `record` and `tab` parameters for sharing.

## Review a question

1. Choose a question. Only that question's package is downloaded.
2. Read its evidence status, budget omissions and unresolved requirements.
3. Choose a selected record. Open the cited PDF page beside its extracted text.
4. Use the tabs to inspect the whole passage, source spans, conceptual
   relationships, dependencies and selection trace.
5. Inspect the machine-readable package or export a local review proposal.

A PDF page number identifies a location. A logical unit groups text which
belongs together, potentially across several pages. A discovery card is a short
description used to find that text. Neither the card nor a relationship label
changes the authority of the underlying evidence. Source publication dates and
capture dates are displayed separately; absent dates remain unknown.

The interface links to the cited page. It does not imply word-level PDF
highlighting when the package contains no bounding coordinates. A remote PDF may
decline to display inside a frame; its ordinary source link remains available.

## Manifest and delivery contract

`okf-evidence-workbench.v1` contains a title and a bounded `questions` array.
Each entry supplies `id`, `label`, the exact `question`, and a `package`
reference with URL, SHA-256 checksum and optional byte count. Optional `parts`
references carry existing `okf-evidence-read.v1` package slices. The reconstructed
document must be the existing `okf-governed-context.v1` package.

The loader requires HTTPS, with HTTP allowed only for local development.
Evidence references stay within the manifest's origin and directory. It rejects
path escapes, credentials, unexpected redirects, mismatched checksums and
malformed packages. Source links are untrusted data, never instructions.

`packageContextForDelivery` reuses the context delivery primitives. It exports
catalogues and exact package slices with a maximum response body of 32 KiB.
This is a **delivery limit**, separate from the assembly limit of up to 512 KiB.
It verifies complete reconstruction, provenance, omissions and context identity
before reporting success. The reader bounds part count and cumulative bytes.
Recorded response sizes describe serialised bodies, not measured HTTP traffic.

## Source-bound discovery

The existing `okf-bm25.v1` behaviour remains unchanged. A producer can opt into
`okf-bm25-weighted.v2`, which gives the authored discovery channel a declared
weight of two and source text a weight of one. Bounded, source-bound navigation
routes can prioritise a card; every selected route remains inspectable and is
checked against the hashed card when loaded. These routes propose where to look,
not what the law means. The engine contains no benefit names or paragraph IDs.

A route can declare conjunctive groups of literal alternatives: all groups must
match, including an explicit scope group. The card's declared scope also gates
its lexical nomination. Missing scope is reported as a navigation omission; it
does not establish that the source is legally inapplicable. Pattern and candidate
counts are bounded, and exact spelling alternatives remain producer-authored.

For this opt-in mode, the leading discovered source unit's outgoing dependencies
are considered before broad concept expansion spends the resource budget.
Unmatched guards, missing targets and truncation still remain visible. The
ranking change cannot by itself prove that a selected passage answers a question.

## Review and publication boundary

Review exports are local proposals linked to the package and record identities.
They require normal source review and a separately authorised publication change
before becoming part of a bundle. There are no write-capable remote tools.
Opening a saved package is not a fresh source check or an external MCP-client
acceptance test. A deployment must publish the matching producer data and
consumer, then verify the actual journey.

The first producer is OKF-DWP's 40 public staff-question occurrences. Other
bundles can use the same contracts without importing DWP-specific logic.
