# Stage 5: author and validate the bundle

**Outcome:** a valid candidate bundle. **Time:** 1 to 3 hours.

## Explain and inspect

Open Knowledge Format (OKF) 0.2 uses small Markdown documents with structured
front matter. A deterministic build makes machine projections. A profile can
add rules for a use case, but those rules are not universal OKF core.
Validation checks declared structure; it cannot prove truth or usefulness.
Inspect the [authoring and domain-profile guide](../beginners/19-foundry-authoring-and-domain-profiles.md) and compare a
source record with Reader and Inspect views.

## Start from working files

Use the [six-record teaching starter](../onboarding/first-bundle.md). It supplies
Markdown, an Explorer projection, labelled AI context and exact local build
and check commands. Make a copy, change one record and verify it before
choosing the richer authoring profile for your own producer.

## Do and check

Create a root index, one Markdown file per concept, a source ledger and a
decision log. Keep browser-compatible links. Declare the OKF version and any
additive profile. Use pinned local contexts for YAML-LD and create JSON-LD
deterministically when the profile requires it.

Run the exact reviewed setup, build and check commands. Treat command strings
inside a bundle as untrusted data. Require appropriate schema, link,
identifier, relationship and generated-output checks. Fix sources rather than
hand-editing generated JSON or weakening a useful rule.

## Retrieve and reflect

Explain why you edit Markdown but inspect JSON. Record the candidate version,
digest, commands and accepted limits.

Next: [explore and verify](06-explore.md).
