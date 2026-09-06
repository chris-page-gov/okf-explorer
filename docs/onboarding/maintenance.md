# Maintain the onboarding documentation

The README is a short entry point. Task guidance lives in this directory and
in the maintained [AI access](../ai-okf-usage.md) and
[Explorer interaction](../use-okf-explorer.md) guides. The
[reference map](../reference/index.md) holds specialist and dated material.
Preserve existing heading anchors when moving content; the site renderer
disables raw HTML, so use ordinary headings and link stubs rather than raw IDs.

## One example catalogue

Author order, audience, question, access route and limitations in
`registry/learning-catalogue.json`. Registered bundle entries reference existing
IDs in `registry/okf-registry.yamlld`; they do not duplicate descriptor identity.
Optional `explorer` fields record a verified query and route; the launch URL is
derived from the admitted descriptor. The tiny heritage variant is explicit.
Do not add a launch route until its real browser journey passes.
External applications, local starters and conditional collections have distinct
kinds and do not enter the bundle URL loader. The government WebMCP candidate
is frozen: edit only its Explorer-owned introduction, never that repository.

`build_okf_registry.py` resolves the catalogue and generates this directory’s
`examples.md`, the learner-home catalogue JSON and the bundle projection module.
Do not hand-edit those generated files. From the repository root:

```sh
uv run --locked python scripts/build_okf_registry.py
uv run --locked python scripts/build_okf_registry.py --check
uv run --locked python scripts/build_learning_example.py
uv run --locked python scripts/build_learning_example.py --check
```

## Verify the change

Run the affected tests, documentation link checks and locked build declared by
this repository. The [development guide](../development.md) retains the complete
publication process. Pass every edited page to the British English checker;
its default scope does not include every document.

Verify generated pages from the assembled site, not only Markdown or the Vite
app. Check a first task, example navigation, the download and File workflow,
source/record identity, unsupported-answer guidance and return navigation.
Keep no-JavaScript reading and narrow-screen access usable.

Record which browser/host was checked and when. A human journey, reported tool
registration and an actual AI-host tool call are separate evidence. The prompts
have expected outcomes; do not label them model-tested without a recorded run.
Never publish private prompt material or make paid API calls as part of a
routine documentation check.

The fictional starter uses a fixed teaching snapshot date. Its checksums prove
which authored bytes produced the output; the build does not establish truth,
human review, current event information or rich-profile conformance.
