# Required facets for new Foundry bundles

Every new Foundry bundle must have meaningful domain facets, including small
workshop packs, prototypes and exploratory snapshots. Generic Reader fields
such as Type, Trust tier, Lifecycle and Section do not satisfy this requirement.
This is a Foundry authoring and build policy, separate from the permissive OKF
0.2 core. Existing bundles can still open in Explorer.

## Design the facets before building

Record `presentation_contract.domain_facets` in the
[domain profile](../profiles/authoring/v1/domain-profile.template.yaml).
Choose at least two independent dimensions that help readers complete declared
user tasks. For a Jobcentre support pack, possible dimensions include support
topic, caller barrier and next action. Review their relevance against the actual
content; do not copy these labels into an unrelated bundle.

For each facet, provide:

- a stable key, plain English label, description and reader question;
- references to the user tasks it helps;
- the emitted record field path and whether it accepts one or several values;
- a closed vocabulary or an explicit source-declared vocabulary policy;
- representative examples and a deliberate missing-value label.

Classify every record in the declared population. Use the missing-value label
when evidence is absent; do not invent a classification to satisfy the gate.
Each required facet must have at least two populated, meaningful values and
must distinguish record selections. Assigning the same two values to every
record fails. If the content cannot support this, the build remains incomplete:
revisit its scope or facet design before calling it a completed Foundry bundle.

## Validate the emitted artefacts

Bind the facet contract to a declared consumer and an error-severity release
gate. Declare exact record and consumer-declaration paths. The checker does not
search arbitrary fields and assume the Reader supports them.

For Explorer small bundles, select `explorer-small-learning-v1`. Emit the full
`meta.learning_presentation` opt-in: schema `okf-learning-presentation.v1`, a
valid `start_route`, non-empty titled `groups` with valid routes, and the authored
`facets` keys and labels. Put record values in `learning_facets`. Record fields
alone do not enable these Reader facets.

For another consumer or a large corpus, select `profile-defined`, declare its
actual field paths, and supply the complete compact record plane and actual
presentation/count artefacts. Require emitted counts when the producer emits
aggregate distributions. Count rows use `{value, count}` and count distinct
records per value; a record may contribute to several values.

Run both checks on the producer's actual output, using the pinned Explorer
checkout and its locked Python environment:

```sh
uv run --locked python scripts/check_domain_profile.py domain-profile/domain-profile.yaml
uv run --locked python scripts/check_foundry_facets.py \
  domain-profile/domain-profile.yaml \
  --bundle output/okf-bundle.json \
  --output output/validation/facets.json
```

Use `--records`, `--presentation` and `--counts` for separate JSON artefacts;
paths in the contract are relative to the corresponding supplied document.
Never substitute a small sample for the complete record population. Integrate
this command as a blocking build check, retain its exit status and failure
receipt, and rerun it whenever profile or producer bytes change. Do not emit a
successful build or release receipt if it fails.

The checker rejects missing contracts, generic-only designs, missing or invalid
values, constant facets, unsupported small-reader declarations, stale emitted
counts and incorrect expected record membership. Its receipt records input
SHA-256 digests, recomputed counts and pass/fail status. Schema/profile validation
also requires linked tasks, declared consumers and a blocking validation rule.
A valid profile alone does not prove that its bundle has working facets.

## Test the actual Reader

Author expected record IDs for a single value, OR within one facet, AND across
two facets, and a combination with no matches. The checker compares these
against complete classifications. In the pinned actual consumer, also verify:

- visible labels, values and counts;
- the same four selections and their exact result membership;
- keep and reset behaviour;
- a clear empty state;
- restored selection after reload.

Retain browser evidence against the same artefact digests before passing the
consumer gate. The static checker computes expected filtering; it does not
execute the Reader or prove domain relevance, source completeness or browser
behaviour. Those require content review and actual-consumer checks.

The [synthetic regression fixture](../tests/fixtures/foundry-facets/bundle.json)
and [tests](../tests/test_foundry_facets.py) exercise the gate in repository CI.
They are checker examples, not evidence that a newly built domain pack passed.

Explorer CI pins Ubuntu 24.04 alongside the governed Python 3.12.11 toolchain;
the moving Ubuntu latest image does not provide this Python version on 26.04.
