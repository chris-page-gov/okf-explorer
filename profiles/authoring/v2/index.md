# OKF authoring profile v2

This domain handoff targets core OKF 0.3 and the separately versioned Bundle
Wiki v2 implementation profile. The [schema](domain-profile.schema.json) and
[template](domain-profile.template.yaml) retain the existing evidence, rights,
consumer lock, impact, evaluation and publication controls. They change the
versioned handoff identity and required core target to 0.3.

The [v1 profile](../v1/) remains available for historical core 0.2 handoffs.
The checker selects the schema by the handoff's declared version and rejects
unknown versions or a mismatched core target. A new repository scaffold declares
migration status until its actual source, graph, consumer and release checks
have passed.

Use the [central standards register](../../../docs/okf-standards.md), its
[machine register](../../../registry/okf-standards.json), the [prompt kit](../../../docs/okf-authoring-prompt-kit.md)
and the [per-bundle acceptance contract](../../../docs/okf-0.3-estate-acceptance.md).
A catalogue entry or successful scaffold check does not establish conformance.
