# Federated Bundles

A federation lets one Explorer landing describe several independently
published OKF bundles. It is a discovery control plane, not one enormous merged
corpus.

## Why Federation Exists

Different domains can have:

- different source authorities;
- different refresh schedules;
- different rights and access conditions;
- different schemas and search indexes;
- independent maintainers and release processes.

Copying them into one repository would blur those boundaries and make every
update depend on one publisher.

A federation instead describes the available children and lets the user cross
an explicit loading boundary.

## Overview First

Opening a federation fetches and validates one small descriptor. The Explorer
can display:

- federation purpose and snapshot;
- child titles and roles;
- availability;
- authority;
- coverage;
- freshness;
- documentation and recovery routes;
- relationship summaries.

It does not yet fetch a child descriptor, search index or record shard.

Selecting **Load child bundle** is the explicit transition into that child's
data plane. The child then uses the normal small- or large-bundle loader.

## Child Status

A child can be:

- available;
- partially available;
- restricted;
- unavailable;
- planned.

Available and partial children need a declared descriptor route. A planned or
restricted source can provide documentation without pretending there is a
loadable bundle.

The Explorer does not bypass an access control or invent a descriptor from a
repository name.

## Coverage

Coverage is meaningful only against a denominator:

```text
represented 365,786 of 365,786 applicable works
```

A coverage declaration should include:

- status;
- applicable count;
- represented count;
- percentage;
- observation time;
- denominator definition.

“Complete” without a named applicable population is not testable.

## Authority, Derivation And Freshness

Federated relationship assertions keep separate:

- source or assertion authority;
- derivation method;
- confidence;
- observation time;
- stale-after time;
- freshness state;
- evidence;
- rights.

Authority classes include:

- official;
- deterministically derived;
- model-assisted;
- unclassified compatibility data.

The Explorer never upgrades one class into another. Confidence cannot turn a
model-assisted assertion into an official statement.

## Relationship Summaries

A federation can summarize a large external relationship plane by predicate,
authority and freshness.

Each breakdown must add exactly to the declared total. The summary also states
its scope so a small set of inline control-plane edges is not confused with
millions of child data-plane relationships.

A summary supports overview and planning. It does not make every summarized
edge inspectable until the relevant child or route-scoped artifact is loaded.

## Source Families

A federation can describe researched source families that are wider than its
implemented children.

For example, a Whole-Law federation can list:

- legislation;
- case law;
- official guidance;
- treaties;
- explanatory material.

A source-family row can explain authority and intended coverage. It becomes a
loadable child only through an explicit implementation binding.

This prevents a roadmap from looking like completed corpus coverage.

## Discovery And Fallback Routes

A descriptor can declare ordered routes such as:

- published Pages descriptor;
- raw repository descriptor;
- release archive.

The Explorer tries only routes declared for the purpose `descriptor`. It does
not guess filenames beneath documentation, repository or archive URLs.

Errors list the attempted routes, which makes recovery explainable.

## Federated Search Boundary

Federation overview search examines child metadata. Record-level search remains
inside the selected child.

A true corpus-wide federated search would need its own governed index,
authority rules, result identity and coverage contract. Federation v1 does not
claim that capability.

## Large-Child Safety

Large children remain bounded:

- complete compact facets need not hydrate record shards;
- advertised whole indexes above the safety threshold are rejected;
- a record locator loads only the bucket and shard for one selected route;
- large relationship planes use route adjacency rather than whole-corpus
  hydration;
- model enrichment aligns with record chunks and loads only for a selected
  record.

The overview, facets, search and targeted record paths can remain useful even
when whole-index loading is unsafe.

## YAML-LD Transport

Federation descriptors can be JSON, JSON-LD or constrained YAML-LD.

YAML loading uses:

- YAML 1.2 rules;
- unique string keys;
- no merge keys;
- no aliases;
- no custom or executable tags;
- bounded bytes and structure.

The loader can recognize JSON content sent with a generic media type. YAML
requires a suitable file extension or media type. Packs should still publish
standards-correct media types and frozen JSON-LD representations.

## Federation Is Additive

The federation profile does not replace:

- the OKF v0.2 Markdown root;
- a small bundle;
- a large-corpus descriptor;
- child source authority;
- each child's release process.

It adds a controlled discovery layer above them.

## Continue

Read [Federated OKF bundles](../federated-bundles.md) and the
[federation profile](../../profiles/federation/v1/index.md) for the exact
contract.

## Next

[Foundry authoring and domain profiles](19-foundry-authoring-and-domain-profiles.md)
explains how a new domain is researched before its bundle architecture is
chosen.
