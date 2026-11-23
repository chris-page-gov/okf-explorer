# Using OKF 0.3 in Explorer

The upstream project published OKF 0.3 on **26 October 2026** when the specification change merged at 23:30 UTC. This implementation uses the revision of **18 November 2026**. The first OKF+ 0.3 Reader implementation on this branch is dated **23 November 2026**. The released Explorer v0.8.2 reference bundle declares OKF 0.2. The OKF+ producer migration, its acceptance date and its public release date are still pending. [Upstream publication](https://github.com/open-knowledge-format/open-knowledge-format/pull/1) · [Reviewed specification](https://github.com/open-knowledge-format/open-knowledge-format/blob/527e81aff55992be21507e97004286789126f88c/SPEC.md) · [Explorer baseline release](https://github.com/chris-page-gov/okf-explorer/releases/tag/v0.8.2)

## Open a Markdown directory

From the Explorer checkout, run the following command with the path to the directory you want to read. Open the resulting JSON file using Explorer's local bundle control.

```sh
uv sync --locked
uv run --locked python scripts/import_okf_directory.py /path/to/bundle > /tmp/imported-okf.json
```

The importer discovers typed Markdown concepts, preserves their front matter and builds the directed graph from CommonMark links and the six path fields in section 6.2. The two reserved filenames, `index.md` and `log.md`, are excluded at every level. The root index contributes bundle metadata. Field paths resolve from the containing file. A leading slash selects the bundle root. Earlier and undeclared bundles can use a bare field path from the root when its relative target is missing. External references remain available in the authored content. Duplicate keys produce a diagnostic with the filename.

Use the **Evidence** tab to see the verification history and the tier applicable after the last content change. A team verification counts as machine confirmation. An unrecognised status remains visible. A malformed freshness deadline gets an invalid-date badge. The Reader treats date-only deadlines as midnight UTC and compares offset date-times as instants. A deprecated concept can link to its successor through a `superseded_by` edge. Imported core references retain their source fields. Only a producer's OKF+ graph can supply its qualified assertions, evidence, rights and authority. An existing OKF+ projection may explicitly identify its navigation root with the route `index`.

The pinned upstream Acme Retail example produces **9 concepts and 24 distinct directed edges**. The old gross-margin metric links to its successor through both a Markdown link and `superseded_by`. [Upstream example](https://github.com/open-knowledge-format/open-knowledge-format/tree/527e81aff55992be21507e97004286789126f88c/bundles/acme_retail)

## Give an AI one link

For a small OKF+ bundle, give a URL-capable client the **commit-pinned JSON-LD graph** in the catalogue entry's `agent_graph.url`. The catalogue supplies the media type, bundle identifier, commit, byte length and SHA-256. The graph is a projection of the authored YAML-LD. A client can traverse it using an ordinary JSON parser. The released Explorer example has 165 entities and 588 qualified assertions. Chrome retrieved it, resolved an assertion's source and target identifiers, then opened the corresponding Markdown at the same commit and verified its evidence digest. [Open the checked graph](https://raw.githubusercontent.com/chris-page-gov/okf-explorer/954d44a345b31a3142bc69a822295e6420108d93/okf-bundle.jsonld) · [Browser receipt](evidence/okf-0.3-pinned-graph.json)

A client can use this instruction with the link.

> Read this graph. Find a relationship that bears on my question. Report its source, predicate and target, the assertion's scope and authority, and the evidence that supports it. Open the cited source at the graph's commit before quoting it. Say which parts you could retrieve.

For example, this local query reads one assertion with its provenance. The same query works on downloaded bytes after checking their digest against the catalogue.

```sh
jq 'first(.["@graph"][] | select(."@type" | index("RelationshipAssertion")) |
    {source, predicate, target, assertion_status, assertion_scope, authority, rights, evidence})' okf-bundle.jsonld
node apps/okf-explorer/scripts/check_pinned_public_graph.mjs
```

Clients with a context limit can select an assertion and its incident entities locally. For sharded publications, start at the producer descriptor and use its declared indexes and integrity metadata. Each producer needs its own verified public graph or shard link. The catalogue currently records one graph with a verified traversal. Client access to URLs and binary downloads varies by host.

## Find bundles under a GitHub owner

Run the read-only inventory with an authenticated GitHub CLI session. It pages through every public repository owned by the named account, irrespective of its name, including forks and archives. It records the commit, tree, nested candidate roots and blob identities. The optional index scan also detects bundles that declare their version in Markdown alone.

```sh
uv run --locked python scripts/discover_okf_repositories.py chris-page-gov --inspect-indexes --candidates-only > /tmp/okf-candidates.json
jq '.repositories[] | select(.roots | length > 0) | {repository, commit, roots}' /tmp/okf-candidates.json
```

Discovery can find fixtures, configurations, mirrors and multiple roots in one repository. Review their identity, access and publication role before adding a public graph to the [access directory](public-bundle-access.md). The inventory records inaccessible trees and uninspected indexes. Release-only bundles and Markdown bundles without declarations still require separate inspection.

On 23 November 2026 the public scan covered **218 repositories**, including the repository whose first recursive tree response was truncated. The scanner followed its subtrees and inspected eligible Markdown indexes. It found **67 candidate roots in 20 repositories**. Thirteen repositories contained a named graph projection. Twenty-five root indexes declared a version, six at 0.1 and nineteen at 0.2. One repository appeared only through its declared indexes. No eligible indexes remained unchecked. Inspect each root's evidence to distinguish a publication from an example or a contract. [Machine-readable public candidate catalogue](evidence/okf-public-owner-candidates-2026-11-23.json)

## Impact on the Explorer checkout

Run `uv run --locked python scripts/assess_okf_03_impact.py` to repeat the scan. The baseline held **3,937 tracked Markdown files**. The scan assigned non-hidden paths to the nearest bundle descriptor or version-declaring root and parsed their front matter. Its 12 roots include fixtures and descriptor-only examples. Counts measure source files. Navigation and runtime nodes have their own identities.

| Source group | Typed non-reserved Markdown | Typed reserved files | Migration work |
| --- | ---: | ---: | --- |
| Repository root and unassigned project material | 177 | 1 | Limit the published graph to the producer's configured sources. The earlier scan of its content sections counted 150 typed non-reserved files. Verify identities and all 588 assertions before publishing a new projection. |
| Embedded UK legislation | 72 | 7 | Preserve work and edition identifiers and citation routes when moving substantive index content. |
| Embedded UK Government APIs | 3,412 | 2 | Update the generator and check operation and resource identities across the generated output. |
| Heritage, tiny and synthetic roots | 3 | 3 | Each root has a typed wrapper index. Check wrapper navigation separately from its referenced data. |
| Introductory bundle | 6 | 0 | Exercise authoring and local import with the original Markdown. |
| Five descriptor-only fixture or profile roots | 0 | 0 | Assess their declared data, shards and semantic exports through their own contracts. |

The scan found no parse errors, historical verification events or populated path fields relying solely on the earlier bundle-root fallback in these tracked sources. Independent GitHub producers and their released shards require separate checks. Before a producer declares 0.3, compare its identifiers and evidence digests, regenerate projections from the authored source, and test its deployed Reader and graph links. The first estate inventory identified 25 candidate repositories in 428 complete trees from 463 accessible repositories. A further tree was truncated and 34 had no default branch. Candidate discovery does not certify conformance.
