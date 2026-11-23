# Migrate an older bundle to OKF v0.3

This file gives the migration steps for the `okf-generate` skill. Section numbers refer to [`SPEC.md`](https://github.com/open-knowledge-format/open-knowledge-format/blob/main/SPEC.md). Section 13 lists the changes from v0.2, and Appendix B lists the changes from v0.1.

## From v0.2

1. Add `okf_version: "0.3"`, a `title`, and a `description` to the frontmatter of the root `index.md`.
2. Find each path field without a leading `/` that was written from the bundle root, and add the `/`. Under v0.3, such a path resolves from the directory of its file.
3. Remove any frontmatter from each `log.md`.
4. Convert each scalar `tags` value to a YAML list, and split a comma-separated string into separate tags. For example, `tags: sales, orders` becomes `tags: [sales, orders]`.
5. Add `superseded_by` to each deprecated concept that has a replacement.
6. Add an offset to each date-time that has none. If you do not know the time zone, ask the user.
7. Run the validator. Then tell the user which concepts lost their trust tier, because their verifications are older than `generated.at` (finding `I204`).

## From v0.1

1. If a concept has `timestamp` and you know its producer, replace it with `generated: { by: "<actor>", at: "<timestamp>" }`.
2. If you do not know the producer, keep `timestamp`. Consumers use it as a fallback.
3. Convert each `# Citations` list in a body to `sources` entries.
4. Cite the claims with footnotes, and then remove the `# Citations` section.
5. Then do the v0.2 to v0.3 steps.
