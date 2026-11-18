# Audit the beginner guide

Run the beginner guide browser suite against the assembled Site. The suite
opens each chapter, checks its declared headings and fragment navigation,
tests the keyboard skip link and reflow at 320 pixels, and runs Axe. Record
manual checks of full keyboard order, focus visibility,
reflow, touch, reduced motion and sidebar behaviour alongside those results.

Build the source inventory from the same Site’s `cross-references.json` and
chapter HTML. The inventory covers external links and HTTP identifiers in
code examples. Each record lists the chapter routes, source classification
and whether the audit expects a response. A new origin requires a decision
about its role before it can be observed.

```sh
uv run --locked python scripts/audit_beginner_guide_sources.py \
  --site _site --output /tmp/okf-guide-source-inventory.json
uv run --locked python scripts/audit_beginner_guide_sources.py \
  --site _site --output /tmp/okf-guide-source-observations.json --observe
```

The observation records the requested and final URL, redirects, HTTP status,
time and tool. For responses it records the media type, the HTML title when
available and a digest of up to 64 KiB. Review titles and identities against
the references the guide describes. A response shows what a publisher served
at the recorded time. Use the publisher’s provenance to assess authority and
check that the content supports the guide’s claim.

Carry HTTP errors, access challenges and redirects that need review into the
release audit. For example, keep a documented historical identifier in a
worked example and link to the current authoritative lookup for readers.
The local inventory and its observations form inputs to the exact deployed
browser audit.

## Record a deployed audit

Run the guide browser test with `OKF_BEGINNER_RELEASE_AUDIT=1` and
`PLAYWRIGHT_BASE_URL` set to the published Explorer root. Use all three
projects with the JSON reporter. The test records the exact Site identity,
application manifest, browser version and observed routes for each run.

The **Audit the deployed beginner guide** GitHub workflow runs this check
against the live Site when given its full deployed commit. Download the
`beginner-guide-live-browser-report` artifact after the workflow passes.
The receipt records the repeatable commands for this run, the source
observations and receipt generation. Replace the placeholders with the exact
release inputs.

```sh
cd apps/okf-explorer
OKF_BEGINNER_RELEASE_AUDIT=1 pnpm exec playwright test \
  --config=playwright.foundry.config.ts tests/foundry/beginner-guide-fragments.spec.ts \
  --project=chrome --project=firefox --project=webkit --reporter=json \
  > /tmp/okf-guide-browser-report.json
```

Record the manual review against the exact published chapter URLs. The
[receipt schema](../../profiles/beginner-guide-audit/v1/receipt.schema.json)
defines the reviewer, time, chapter checks and source exception notes. Use
`passed`, `finding` or `not-applicable` for each of the 12 named checks in
the receipt builder. Explain exemptions, open findings and any reviewed
external access restrictions in the supplied notes.

Use the pre-deployment Site candidate receipt and the source observations
from that same build. Run the builder from the repository root. It writes
the validated machine receipt and a readable summary to a new directory.

```sh
uv run --locked python scripts/build_beginner_guide_audit_receipt.py \
  --guide-base "${PLAYWRIGHT_BASE_URL}docs/beginners/" \
  --candidate /tmp/site-candidate-receipt.json \
  --references _site/docs/beginners/cross-references.json \
  --sources /tmp/okf-guide-source-observations.json \
  --browser-report /tmp/okf-guide-browser-report.json \
  --manual /tmp/okf-guide-manual-observations.json \
  --output /tmp/okf-guide-release-audit
```
