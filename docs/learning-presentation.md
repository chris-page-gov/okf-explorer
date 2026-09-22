# Designing a learning bundle for Explorer

A learning bundle should help someone choose a goal, follow a useful sequence,
practise a skill and trace an interpretation to its evidence. A list of files is
an evidence inventory, not a learning path.

## The producer and reader contract

Small bundles can opt in with `meta.learning_presentation`. This is an additive
Explorer presentation contract, not a new requirement of OKF 0.2 or a claim of
Bundle Wiki conformance. It applies to both the small JSON projection and an
explicit YAML-LD or JSON-LD graph with equivalent metadata.

```json
{
  "schema": "okf-learning-presentation.v1",
  "start_route": "learning/start.md",
  "title": "Learn by doing",
  "introduction": "Choose a goal, practise it and review the evidence.",
  "facets": [
    { "key": "topic", "label": "Topic" },
    { "key": "capability", "label": "Capability" }
  ],
  "groups": [
    {
      "title": "Your learning journey",
      "description": "Start with the outcome you want to achieve.",
      "routes": ["learning/check-evidence.md", "learning/test-an-idea.md"]
    }
  ]
}
```

Every route must resolve in the loaded corpus. Nodes declare filter values in
`learning_facets`, for example `{"topic":["Critical thinking"],"capability":["Assess evidence"]}`.
Values can overlap. Missing values mean unclassified, not an inferred negative.
The reader does not derive classifications from filenames, titles, search
matches or source mentions. Only producer-authored values drive these facets.

The reader validates the opt-in shape and bounds facets, groups, routes and
labels. Invalid or absent presentation falls back to the existing catalogue.
Explicit valid deep links take precedence over the starting route. A file import
selects that file's starting route and clears the previous inspection state.
The file remains in browser memory; reloading the page requires reselecting it.
A URL-loaded bundle supports durable routes and filter state.

Conceptual facets appear first, with the first one expanded to show labels.
Type, trust, lifecycle and section remain inside **Source and review filters**.
Highlight, keep, undo, reset and URL history retain their existing semantics.
The guided reader starts with ordered groups of goal cards. Its record pages
show connections and expandable evidence passages. The full catalogue remains
available below the path or through search and filters. Legacy bundles keep
existing facets and catalogue behaviour.

## A content designer's workflow

1. Identify learner questions and observable outcomes before choosing facets.
2. Keep original sources and record their versions, authority and gaps.
3. Author concepts, activities, outputs and directed relationships with evidence.
4. Assign useful, overlapping classifications. Do not classify every item under
   every topic merely because it shares a source document.
5. Design an ordered starting page with a small number of meaningful choices.
6. Name variants explicitly: “Welcome — Module 2, condensed” is distinguishable
   from “Welcome — Module 1, full”. Put timings and purpose in the description.
7. Validate the actual journey in Explorer: goal → activity → expected output →
   safeguard → supporting passage. Test narrow screens and back navigation.
8. Keep sources and review information accessible without making them the
   primary way people navigate the subject.

## Acceptance questions

| Need | Observable acceptance |
| --- | --- |
| Where do I start? | The first view explains the learning goals and gives ordered entry points. |
| Which content helps me? | Topic and capability filters find meaningful records across source files. |
| What will I practise? | Activities have a purpose, a variant, a duration and connections to capabilities. |
| What should I produce? | Outputs and next steps are reachable from relevant activities. |
| What should I check? | Safeguards and evidence are accessible from the learning content. |
| Can I trust this interpretation? | Source statements, interpretation and gaps remain distinguishable. |
| Can I return here? | URL-loaded routes and filter state survive reload and back/forward navigation. |

A producer's counts and loader tests do not prove these journeys. Browser
acceptance is a separate gate. The AI in Action exemplar is private and is not
included in this repository, fixtures or publication outputs.
