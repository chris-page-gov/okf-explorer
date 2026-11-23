# OKF 0.3 estate acceptance

The programme is complete only when every in-scope bundle has its own recorded
source, Explorer, AI-access and visual-walkthrough results, and the final release
contains the exact accepted revision. Repository discovery is the starting
inventory. It is not acceptance evidence.

Use the [central standards register](okf-standards.md), its
[machine-readable register](../registry/okf-standards.json) and the
[migration assessment](okf-0.3-migration.md). The implementation follows the
[pinned OKF 0.3 specification](https://github.com/open-knowledge-format/open-knowledge-format/blob/527e81aff55992be21507e97004286789126f88c/SPEC.md).

## One record for every bundle

Resolve the actual distribution and authored source boundaries from the
producer's contracts. A repository-level contract marker, an embedded bundle,
a generated projection and a test fixture can describe different things.
Inspect independently declared nested roots in their own records. Reconcile
release-only and Markdown-only producers against the source registers before
closing inventory coverage. Retain inaccessible paths and new discoveries as
outstanding work.

An active producer needs these results:

1. **Source:** all declared Markdown source is inspected against OKF 0.3;
   reserved files, identifiers, paths, verification history and unknown metadata
   are handled correctly. Record the source commit and content digests.
2. **Generation:** run the producer's reviewed generators and declared checks.
   Verify graph equivalence, concept coverage, assertion identities and evidence
   digests. Preserve unknown authored keys and regenerate projections.
3. **Explorer:** load the exact descriptor and its complete declared dependencies
   with the verified Explorer build. Check identity, navigation, graph traversal,
   source inspection, incomplete-coverage behaviour and console errors in a real
   browser. A successful import alone does not establish this result.
4. **AI access:** retrieve the graph or declared shards and source documents from
   the same pinned revision. Verify their declared digests and traverse the
   dependencies needed by the bundle's question. Record unavailable access and
   unsupported client capabilities. HTTP availability alone is insufficient.
5. **Visual walkthrough:** provide a bundle-specific complex question, the
   inspected source passages, the relevant graph path and the complete executed
   consumer journey. Show qualifications, missing evidence and a negative
   control. A reusable layout does not replace bundle-specific content.
6. **Publication:** bind the resulting artefacts and receipts to the exact
   candidate. Follow the producer's publication and rights gates and verify the
   deployed identity and journey before reporting a public bundle URL.

The representative journey is question, scope selection, graph traversal,
source inspection and a qualified source-linked answer. This is an editorial
choice for a common knowledge-discovery task, not a claim from usage analytics.

Frozen releases retain their original bytes and version labels. Record their
compatibility with the current Reader separately from new producer adoption.
An intentionally invalid fixture needs its expected rejection result; it is
not a conformant producer. Neither case can silently stand in for an active
producer's migration or positive access checks.

## Bounded source check

Run the check in the governed Explorer environment, with evidence outside the
selected bundle:

```sh
uv run --locked python scripts/check_okf_03_source.py /path/to/bundle \
  --output /path/to/evidence/source-check.json \
  --projection /path/to/evidence/reader-projection.json \
  --require-0.3
```

The check uses the reviewed read-only snapshot boundary. It refuses symlinks,
special files, unreadable inputs and exceeded budgets. It excludes independently
declared nested roots and lists them for separate inspection. It records every
inspected Markdown digest, source concept paths and reserved navigation paths,
then independently compares the Reader's imported concept coverage. Its YAML
parser uses YAML 1.2 and rejects duplicate keys.

This check does not execute bundle code, fetch URLs, inspect asset contents or
establish browser, AI-answer, specialist or release acceptance. A legacy version
declaration can pass syntax checks without becoming a 0.3 adoption claim.
The source check's limits and excluded roots must be reconciled with the full
estate inventory. An incomplete inspection cannot pass.

The current analytical-trial reproduction receipts record the current path and
URL validator digest. Regenerate these derived receipts when that validator
changes, using the retained captures. This does not update the observation
dates, replace denied downloads or alter the historical source captures and
frozen release artefacts.

## Final release

Publish the new release only after the complete inventory has a justified
disposition and all required acceptance results pass. Archive exact source,
generated bytes, digests, walkthroughs and test receipts. Verify release assets
and the live consumer journey against that revision. Keep the existing v0.8.2
OKF 0.2 baseline immutable and clearly labelled.
