# OKF Explorer federation profile v2

Federation profile v2 retains the control-plane structure introduced by
`okf-explorer-federation.v1` and declares OKF core 0.3. Its descriptor schema
uses the distinct `okf-explorer-federation.v2` identifier. The v1 descriptor
schema remains frozen for existing core 0.2 bundles.

The normative descriptor schema is [`descriptor.schema.json`](descriptor.schema.json).
Inline relationship rows use the v2 profile's local copy of the frozen
relationship-assertion structure. Its `$id` is profile-specific so validators
can resolve it offline; its schema content is otherwise identical to the
canonical v1 relationship schema.

This profile version changes the federation descriptor contract only. It does
not assert that child data is complete, authoritative, current or suitable for
reuse. Child loading remains explicit and controlled by the descriptor's
declared routes.
