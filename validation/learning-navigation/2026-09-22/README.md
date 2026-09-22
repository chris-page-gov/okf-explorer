# Learning navigation verification

The public observation at Explorer `4445adecc2a760c9658def2c1664a02c71f53b39`
found two problems. The DWP Try link opened generic programme-design
documentation. Svelte's client router also attempted to load static generated
documentation as an application route, reporting `Not found` before falling back
to the actual document. The separate [native compact evidence observation](../../context-compact/2026-09-22/public-native-edge.json)
retains this failure alongside the successful Ask OKF checks.

The authored catalogue now links a dedicated DWP programme launch guide. Normal
browser navigation handles learning-home links, including static guides. The
existing catalogue entry still opens the combined Reader; neither the curriculum
nor the interpretation of DWP sources changes.

## Checks

- Independent review found no blockers.
- Five Chrome learner-hub journeys pass. The new hydrated regression clicks the
  general **Start here** and **Try DWP learning paths** links, requires actual
  document requests and rejects console or page errors. It stubs destination
  documents, so it is separate from the real rendered-page check below.
- Svelte checking reports zero errors and warnings; deterministic build, both
  learner-hub contracts, registry projection checks and the unchanged 131-package
  SBOM pass.
- A separate native Edge observation followed the actual assembled local hub to
  **Try the DWP learning programme**, then its public launch link. The destination
  displayed **DWP demonstration learning programme**, the foundation path and
  assessed-learning controls. Both transitions recorded no console errors.
- The existing Heritage gate was rerun against the changed app: 100 questions
  meet the unchanged 80-point threshold and all three local journeys pass.
  These checks do not establish DWP legal or specialist acceptance.

The app tree is
`ac840094c6599f1fcda1e0f30daf5d9389744504f77adfbc65ec5440f7d83234`;
its manifest SHA-256 is
`fa5b1d0bc4ca37d74f7f3cc6170b26dc9d0e0f8cdfa4e487aefcda269afd54db`.
`previous-app/` preserves all three previous Heritage receipt files unchanged
before the canonical current-app receipt was regenerated. Source bytes,
classifications and the context engine were not changed.

## Retained failures and publication boundary

The first two focused browser invocations encountered a stale Vite route map
after earlier production builds; restarting only the isolated local development
server resolved the HTTP 500 before the navigation tests. An initial local
Heritage invocation selected the separate publication journey without its
required receipt and was rejected. The next invocation supplied a doubly rooted
candidate URL and was also rejected. Selecting the declared three local journeys
with the correct candidate URL passed; the publication journey was not weakened
or relabelled as a local result.

This is local candidate evidence. Exact merged CI, Pages identity and the final
public learning journey are recorded in the follow-up pull request after
deployment. The earlier compact receipt remains bound to its own deployed app;
it is not relabelled as an observation of this later app.
