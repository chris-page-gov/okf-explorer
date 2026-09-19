# Ask OKF service changelog

## 0.3.1 — replay-link correction

- Remove a displayed replay link when the question or source version changes,
  or a new replay starts. A link created for an earlier context could otherwise
  reappear beneath a later context. Regenerate the link only when requested for
  the current verified context.
- Add a browser regression that recreates two different questions and checks
  the second link's question, version and context identity, plus repeated replay
  and version-change invalidation.
- Preserve 0.3.0 observations. Deployment and acceptance of 0.3.1 require their
  own build, hosted-service and browser receipts.

## 0.3.0 — compact evidence delivery

- Add bounded evidence catalogues, exact evidence reads and an inspectable
  browser replay page alongside the existing full-package tool. Context
  assembly and evidence authority remain separate from delivery and AI answers.
