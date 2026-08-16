# Documentation style and British English

Status: repository documentation guidance, checked 16 August 2026.

Use British English in all authored documentation. Write for the reader's
need, use the active voice where it improves clarity, prefer familiar words
and explain specialist terms or acronyms on first use. These principles follow
the GOV.UK guidance to [use clear language](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/)
and its [A to Z style guide](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/).
They guide this project; they do not make the documentation GOV.UK content.

## Preferred forms

Use forms such as:

- organisation, organise and organisational;
- behaviour, colour and centre;
- analyse, modelling and labelled;
- artefact, authorise, normalise, recognise and summarise;
- fulfil, defence, optimisation and specialisation;
- licence for the noun and license for the verb; and
- programme for a scheme of work, but program for computer code.

Prefer short sentences and specific verbs. Address the reader as “you” in
instructions. Avoid jargon where a familiar word says the same thing. When a
technical term is necessary, define it before relying on it.

## Exact-text exceptions

Do not alter text whose spelling is part of its identity or evidence. Preserve:

- code identifiers, schema keys and governed values such as `assertion_status`
  and `normalized`;
- commands, file names and literal interface values;
- URLs and Internationalized Resource Identifier (IRI) strings;
- official titles such as “Simple Knowledge Organization System”;
- official titles such as “Data Catalog Vocabulary”;
- official titles such as “Artifact attestations”;
- official titles such as “Supply-chain Levels for Software Artifacts”; and
- direct quotations.

Use inline code or a code block when prose names an exact technical value. Name
an official source and link to it so readers can distinguish an exact title
from the project's surrounding British-English explanation.

## Editorial check

Run the context-aware check after changing beginner documentation:

```sh
uv run --locked python scripts/check_british_english.py
```

You can supply other documentation paths explicitly:

```sh
uv run --locked python scripts/check_british_english.py docs/repository-guide.md
```

The checker examines prose but skips fenced code, inline code, link targets and
a small set of exact official titles. It detects high-confidence American
forms and likely noun uses of “license”. It cannot decide whether an unmarked
quotation is exact, whether “practice” is a noun or verb, or whether
“program” means software. A human must review those cases in context.

Do not fix a reported word automatically. First decide whether it is prose, an
exact technical value, an official title or quoted evidence.
