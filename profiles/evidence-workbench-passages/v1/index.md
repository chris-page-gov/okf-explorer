# Passage boundary review profile v1

This generic profile describes a local, source-bound review of proposed passage
boundaries. Its [manifest schema](manifest.schema.json) lists bounded case
references with exact byte counts and SHA-256 hashes. Each hashed case follows
the [case schema](case.schema.json) and points to an extracted UTF-8 file under
the manifest directory. The PDF and extraction have separate identities. The
browser verifies the extraction, source spans, retained text and cited literals
before displaying a case. When `pdf.delivery_url` is supplied, the browser
downloads a bounded PDF copy and verifies it against the separately declared
frozen PDF hash. A bounded canvas renderer draws the selected PDF page beside
the matching extracted page text. The source-declared `pdf.url` remains the
provenance link and a fallback when delivery or rendering fails. The page
locator is synchronised; the profile supplies no word-level PDF coordinates.
Optional `parser.settings_text` and successor `candidate_comparison.settings_text`
are bounded and checked against their separate settings SHA-256 values before
display. Implementation binding hashes retain their own identity.

The [correction schema](correction.schema.json) permits a split, join or role
change tied to the same source and baseline hashes. `added_spans` explicitly
names source bytes outside the old passage. Preview rejects stale identities,
invalid spans, lost or overlapping bytes, undeclared additions, changed text
and undeclared joiners. It keeps failed previews visible and never edits the
producer's files. The four impact scales use supplied counts where available
and say `unknown` when dependencies, discovery records, question packages or
budget omissions have not been measured. An ID migration proposal does not
redirect legal references.

The route is `/evidence/passages/?manifest=…`. A producer can publish the
manifest and its case and extraction files from any corpus that follows these
schemas. A review export is a local `okf-passage-review-decision.v1` JSON file
with reviewer, date, decision, reason, source and baseline identities, parser
settings, correction and preview result. Independent source and specialist
review remain separate from this browser preview.
