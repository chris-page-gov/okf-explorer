# Federation descriptors with OKF core 0.3

Federation descriptors have their own versioned control-plane schema as well
as an `okf_version` for the OKF core they declare. A descriptor declaring core
0.3 uses the federation v2 descriptor schema and its
`okf-explorer-federation.v2` identifier. Existing core 0.2 federation
descriptors continue to use the frozen v1 schema.

The v2 descriptor preserves the v1 child, discovery, coverage, freshness and
relationship-summary structure. The v2 relationship-assertion schema is an
offline-resolvable profile copy of the v1 structural contract with a distinct
`$id`; the frozen v1 schema is unchanged. Consumers must select the descriptor
contract by its schema identifier and validate the declared core version.

This change does not upgrade, rewrite or revalidate historical federation
descriptors. A producer's successful local schema check is not evidence of
publication, consumer support or complete source coverage. Validate the exact
consumer revision and bundle bytes separately.

## Descriptor-relative context links

A large-bundle record can expose a structured context link with a bundle path,
route and title. The Reader resolves the bundle path against the descriptor URL
that supplied the record, then builds a link using the current Explorer
application origin and path. This supports a Reader hosted separately from the
data bundle, including deployments below a path prefix. The link opens the
target bundle and record in the Reader; an existing absolute HTTP(S) URL
continues to be shown as an external resource.

These links are navigation metadata. They do not add a semantic relationship
between bundles or prove that the target is authoritative. Producers should
bind target descriptors and source records to their own acceptance evidence.

The published 0.9.1 release aligned the package, both citation versions,
dependency inventory and generated bundle metadata. Historical release entries
remain dated. The 0.9.2 candidate adds descriptor-relative context navigation
and derives the legislation runtime binding from the package version. Both
citation records date this resumed candidate 25 November 2026. Its
publication still needs exact CI, public and release-asset checks.
