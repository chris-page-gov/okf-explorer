# Reconstructed BEP profile — v0.1-r1

Status: newly reconstructed research proposal. It is not the original missing schema,
not a standards-track specification and not a modification of Ask OKF.

## Contract

The envelope contains `core` and `package_id`. The immutable core binds source/index and
requirement identities, the accepted request, scope and time, compiler/canonicalisation
versions, an explicit public evidence view and deterministic resource budgets. It carries
source records, literal evidence, typed relationships, AND/OR support alternatives,
coverage, omissions, conflicts and limitations. `ai_answer` is always null.

The package ID is `sha256:` followed by SHA-256 over:

```
UTF8("BEP\0reconstructed-core\0v0.1-r1\0") || canonical(core)
```

The envelope ID is excluded from its own preimage. Per-execution timings and cache receipts
are not part of this immutable core. Array order is significant. UTF-16 object-key ordering,
ECMAScript finite numeric serialisation and unchanged Unicode strings are used by the
candidate canonicaliser; duplicate keys and lone surrogates are rejected. Refer to RFC 8785
in the source register. The included bounded vector suite is not full conformance certification.
Arbitrary-precision numeric observations are decimal strings, with explicit units and denominator.

## Support and status

Each requirement has one or more alternatives. Every `all_of` list within an alternative
must be present; one complete alternative is enough for that declared requirement. The
validator checks current retained IDs; it does not prove the producer model complete or
correct. No declared requirement means a sufficient claim cannot be accepted.

`complete` means declared-requirement coverage only. The evidential status is scoped:
`sufficient-within-declared-scope`, `insufficient`, `conflicting`, or `unknown`.
This reconstruction conservatively disallows a sufficient claim when any omission,
unresolved term or ambiguity is recorded. A conflict must remain explicit.

A record's source references, exact literal hash, assertion status and scope remain visible.
The source's authority and the assertion's derivation status are different. Synthetic fixture
sources cannot be promoted to official evidence. Provenance and hashes are not proof of truth.

## Boundaries

The schema is closed and bounded. It supports passages, observations and API capability
records. It deliberately allows only public-source views: it is NOT a restricted-data
permission implementation. Do not place restricted records or personal profiles in these
fixtures. A future permission-aware profile needs an independently assessed authorisation
layer and non-disclosing diagnostics.

`max_depth` and `max_operations` bind the intended compiler policy; this validator does not
execute a graph traversal or measure those quantities. It checks record/relationship and
complete canonical envelope byte limits. The transport wrapper and token count must be
measured separately by a real adapter.

## What is tested

See `verification.json` for exact fresh runs. Tests cover example shape, literal/package
integrity, declared coverage, missing qualifiers, some ambiguity/conflict cases, byte/count
limits, bounded canonicalisation vectors, stable input copies and citation export utilities.
They do not test full retrieval, optimal selection, specialist truth, permission enforcement,
full-source currentness, real Ask OKF behaviour, LLM consumption or voice delivery.
