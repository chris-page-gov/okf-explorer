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
