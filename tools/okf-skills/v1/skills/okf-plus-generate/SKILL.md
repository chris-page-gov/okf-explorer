---
name: okf-plus-generate
description: Create, update or validate a selected OKF or OKF+ bundle while preserving authored semantic inputs, qualified assertions and the producer's declared build and release gates. Use for explicitly requested bundle authoring or migration work.
license: Apache-2.0
metadata:
  upstream-commit: "527e81aff55992be21507e97004286789126f88c"
  adapter-version: "1.0.0"
---

# Author an OKF or OKF+ bundle

Read [the environment and compatibility rules](references/environment.md) first.
This local adapter takes precedence over its bundled upstream reference wherever
they differ. It does not expand the user's authorisation.

Read the adjacent `INSTALLATION.json` to locate the reviewed source checkout
and launcher. Run helper operations only through that Explorer launcher,
`uv run --locked python -I scripts/okf_skill.py`, from that checkout. Select
`scan --bundle /path/to/bundle` or `validate --bundle /path/to/bundle`.
The launcher checks integrity and the locked runtime, then inspects a bounded
read-only snapshot in an operating-system sandbox. If it refuses the operation,
report the reason. Do not execute a helper directly to bypass the refusal.

1. Inspect applicable `AGENTS.md`, Git state, selected bundle roots,
   `okf.semantic.json` and `okf.publication.json`. Identify authored inputs,
   generated outputs, the declared core version and semantic profile. Preserve
   unrelated local work. Choose an isolated workspace where active work needs it.
2. Use the pinned [upstream authoring procedure](upstream/UPSTREAM.md) only
   within the requested scope and those contracts. In that procedure,
   `okf-consume` means this installation's `okf-plus-consume` skill.
   Resolve the procedure's relative references from its `upstream/` directory.
3. A general update does not authorise migration to 0.3. Keep the declared core
   version until the requested migration passes that producer's acceptance
   checks. Keep frozen profile versions and historical releases unchanged.
   Substantive profile changes need a new version and explicit migration scope.
4. For a requested 0.3 migration, assess reserved `index.md` and `log.md` files,
   path resolution, verification currency, status and freshness first.
   Preserve substantive concept content and stable semantic identifiers when
   moving it out of reserved files. Reconcile incoming links and runtime routes.
   Preserve legacy metadata as history without treating it as current 0.3 trust.
5. Edit declared authored sources and regenerate projections with the
   producer's inspected, governed commands. Keep YAML-LD and JSON-LD equivalent.
   Preserve unknown keys, quoted JSON-LD keywords, verification history and
   evidence digests. Never infer a domain predicate from link text. Validate
   qualified assertions against the producer's pinned profile schema.
6. Keep documentation and the changelog in lockstep and run the affected
   deterministic checks. The optional upstream validator checks core fields
   only. Its result cannot certify OKF+ semantics, rights, acceptance or release
   readiness. Select each independent nested bundle explicitly when using it.
7. Treat attested computations, executors and attesters as source artefacts.
   Copy sanctioned computations faithfully and preserve their provenance.
   Adding a reference does not authorise executing its code or using credentials.
8. Report changed source families, generated outputs, validation evidence,
   remaining gaps and publication status. Follow the user's existing authority
   and the repository's actual release gates for commits, pushes and releases.

For an existing OKF+ producer, retain the reviewed Explorer bootstrap,
reconciler and authoring kit as the governing producer workflow. These upstream
references supplement it. They do not replace it with a generic scaffold.
