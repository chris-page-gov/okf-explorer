# Provider Datapacks: Governed Snapshots And Reviewed References

## Status

Experimental generic Explorer contract, 23 July 2026.

## Purpose

A static OKF bundle is a governed snapshot. A provider's external service can
change after that snapshot is published. Explorer must make both states visible
without silently treating a previously reviewed upstream revision as current
live data.

The optional `okf-explorer-provider-datapack.v1` contract supplies that
distinction. It is separate from:

- `okf-explorer-presentation.v1`, which contains non-semantic display hints;
- normalized record and resource shards, which remain the governed discovery
  snapshot; and
- `okf-operational-metadata.v1`, which describes source-backed maintenance and
  access facts rather than comparing a pinned provider revision with a reviewed
  reference.

The first implementation is the ONS Explore Local Statistics provider lane in
`okf-ons`. Its governed metadata uses source revision `795eaf2`, while a bounded
review of revision `d5f0ac9` found that Average house price extended through May
2026 rather than the snapshot's April 2026. This is legitimate snapshot drift,
not a reason to mutate the published record in the browser.

The normative authoring schemas are
[`provider-datapack-manifest.schema.json`](../profiles/bundle-wiki/v1/provider-datapack-manifest.schema.json)
and
[`provider-datapack.schema.json`](../profiles/bundle-wiki/v1/provider-datapack.schema.json).
Explorer also performs runtime cross-document checks that JSON Schema cannot
express, including snapshot, identity, revision-prefix, URL and review-date
bindings.

## Publication Shape

A large-corpus descriptor must advertise the provider manifest and bind its
bytes through `entrypoint_integrity`:

```json
{
  "entrypoints": {
    "provider_datapacks": "data/providers/manifest.json"
  },
  "entrypoint_integrity": {
    "provider_datapacks": {
      "path": "data/providers/manifest.json",
      "sha256": "244cf74ad696211ac11ad7b4fe04096194cde26041df6d6303712cbb7092d0dc"
    }
  }
}
```

The data-manifest index may mirror the same discovery path:

```json
{
  "indexes": {
    "provider_datapacks": "data/providers/manifest.json"
  }
}
```

The manifest is small and loads with the Explorer control plane:

```json
{
  "schema": "okf-explorer-provider-datapack-manifest.v1",
  "snapshot": "monday-2026-07-17-r2",
  "packCount": 1,
  "packs": [
    {
      "id": "ons-explore-local-statistics",
      "selector": {
        "field": "source_surface",
        "operator": "equals",
        "value": "ons-explore-local-statistics"
      },
      "path": "data/providers/ons-explore-local-statistics.json",
      "sha256": "570d3fc49dc94422bf751295dc95b0663af740ff8abceda7781ecc47f86880c6",
      "status": "known-drift",
      "lastChecked": "2026-07-23"
    }
  ]
}
```

Each referenced pack has:

- a top-level `snapshot` equal to the descriptor, data manifest and provider
  manifest snapshot;
- a provider identity and record selector;
- `governedSnapshot`, including the pinned revision, as-of basis, record count
  and explicit metadata-only boundary;
- `reviewedLiveReference`, including when and how a bounded upstream reference
  was checked;
- `comparison`, including evidence-backed differences and whether execution
  still requires live validation; and
- presentation wording plus bounded external-link actions.

The descriptor integrity reference binds the provider manifest bytes. Each
manifest row's lowercase `sha256` then binds the exact published bytes of its
pack. Snapshot equality rejects material from another governed snapshot; these
digests separately prevent a mutable same-snapshot sidecar from being accepted
as the reviewed evidence.

`comparison.evidenceScope` is `reviewed-record-examples` and
`comparison.exhaustive` is `false` in v1. A difference for one record must never
be presented as a complete live comparison of every provider record.
`known-drift` requires at least one difference; `aligned` and `unknown` require
an empty differences array.

## Selector And Record Inheritance

The v1 selector is a simple equality match against one normalized record field:

```json
{
  "field": "source_surface",
  "operator": "equals",
  "value": "ons-explore-local-statistics"
}
```

The provider state applies to matching full records and lightweight search
documents. A selected resource inherits the state of its parent record. The
live provider action remains separate from the frozen resource row: it is an
external hand-off, not evidence that the bundled resource itself was refreshed.

Reviewed record examples use the stable normalized `record_id`. A pack can
supply snapshot and reviewed coverage for that ID and list the exact compared
fields. A record listed in both reviewed arrays without a difference is labelled
**Aligned in reviewed fields**: no difference was recorded in the bounded
fields, but this is not an exhaustive live-alignment claim. Records without a
reviewed example still receive the provider-level snapshot warning and actions.
Their detail badge reads **Record alignment not reviewed** and does not repeat
an example-specific provider comparison as though it applied to that record.

## User Interface

Explorer presents the contract at three levels:

1. **Bundle overview** — provider, governed revision, reviewed revision,
   last-checked date, comparison status and an external service or evidence
   action. An action requiring a record identifier is omitted; a static
   **Open live service ↗** action can therefore be primary.
2. **Record/search detail** — inherited provider state, exact reviewed example
   where available, and a record-bound action such as **Open live indicator ↗**
   as the primary action. Record status distinguishes a known difference,
   alignment in reviewed fields and no reviewed example.
3. **Resource detail** — the same parent-record status and action, while the
   normalized resource metadata remains visibly frozen.

The generic badge for `known-drift` is **Known snapshot/live difference**. The
direction and significance come only from `comparison.summary`; Explorer does
not assume that a reviewed reference is newer for every provider.

The reviewed reference is labelled **External, not live-validated here**.
Opening the service does not rewrite the OKF record, confirm current values or
authorise an MCP/data execution. The provider must be validated at the time of
use when `executionRequiresLiveValidation` is true.

Explorer displays the upstream revision's `sourceCommitAsOf` separately from
the review's `lastChecked` date. A commit dated 22 July and a review performed
on 23 July are different provenance facts; neither is presented as a current
service timestamp.

## Safe Loading And Actions

Advertised provider datapacks fail closed:

- manifest and pack schemas must match v1;
- descriptor, data manifest, provider manifest and every pack must carry the
  same non-empty snapshot identifier;
- the descriptor must advertise the provider-manifest entrypoint and bind it
  through `entrypoint_integrity` with a valid SHA-256;
- a data-manifest index may mirror the provider-manifest reference; when
  present, its path and any digest must match the descriptor trust root;
- every manifest row must carry the lowercase SHA-256 of the exact referenced
  pack bytes, which Explorer verifies before parsing;
- manifest pack paths must be safe, bundle-relative paths with no scheme,
  leading slash, traversal (including percent-encoded traversal), percent
  encoding, query, fragment, backslash or null byte; the resolved URL must
  remain inside the bundle base path;
- loaded pack ID, selector, comparison status and checked date must match its
  manifest row;
- provider identity and provider/reference URLs must agree, abbreviated commits
  must be prefixes of their full commits, and the comparison date must equal
  the reference's last-checked date;
- difference record IDs and field names must be unique; when a record is listed
  in both reviewed arrays, every changed title, coverage end or modification
  date must have an exact field-and-value entry in `comparison.differences`;
  every difference must point back to a record in both arrays, and known fields
  must match those rows exactly. Otherwise the pack is rejected rather than
  shown as aligned or as a manufactured difference;
- the governed state must assert `metadataOnly: true` and
  `observationsIncluded: false`;
- action kind and network must be `external-link` and `external`;
- action targets must be absolute HTTPS URLs without credentials; and
- the only v1 URL-template token is `{native_id}`, used as one complete path
  segment and percent-encoded; `.` and `..` identifiers suppress that action
  rather than being normalized as navigation.

Unknown, unresolved or unsafe actions are not rendered. External links use a
new tab with `noopener noreferrer`; provider JSON cannot inject scripts, HTML,
CSS or arbitrary UI commands.

## Authoring And Review

Provider datapacks are review evidence, not a browser polling mechanism:

1. Build and validate the governed metadata snapshot.
2. Review a named upstream revision or bounded reference.
3. Record the comparison date, input digest and representative differences.
4. Keep the comparison explicitly non-exhaustive unless an independently
   specified future schema supports a complete comparison.
5. Publish the pack and manifest with the same snapshot ID as the bundle,
   recording the pack digest in the manifest and the manifest digest in an
   entrypoint integrity reference.
6. Test the bundle panel, known-difference, aligned-reviewed, unreviewed and
   non-matching records, inherited resource state, safe action resolution and
   snapshot-mismatch failure.
7. Refresh by producing a new reviewed reference or governed snapshot; never
   overwrite the meaning of an existing published snapshot.

The deterministic Explorer fixture covers the ONS April/May example without
making network requests. Production review and live execution remain separate
provider responsibilities.
