# Trust, freshness, conflict, path, and value rules

This file gives the exact rules behind steps 3 to 6 of the `okf-consume` procedure. Section numbers refer to [`SPEC.md`](https://github.com/open-knowledge-format/open-knowledge-format/blob/main/SPEC.md) (OKF v0.3).

## Trust tier

The trust tier comes from the current verification events (section 5.3).

1. Read `verified`. If it is a single mapping, treat it as a list with that one entry.
2. Ignore each event that does not have both `by` and `at`.
3. An event is current when its `at` is equal to or later than `generated.at`, or when `generated` is absent. Compare the two values as instants. A date without a time means the start of that day in UTC.
4. If no event is current, the tier is *unverified*.
5. If a current event has a `by` value that starts with `human:`, the tier is *human-reviewed*.
6. Otherwise, the tier is *machine-confirmed*. This includes `team:`, `process:`, other schemes, and `<producer>/<version>` actors.

Events that are older than `generated.at` stay in the file as history. Report them as "verified before the last change": the person who verified the concept did not read its current text. A trust tier is advice for the reader, not access control. Do not refuse a concept because its tier is low.

## Status

| `status` | Meaning (section 5.4) | Action |
|---|---|---|
| Absent or `stable` | Current | Use the concept. |
| `draft` | Current, but not reviewed and possibly incomplete | Use the concept, and say that it is a draft. |
| `deprecated` | Kept for links and history | Do not present it as current. Follow `superseded_by` to the replacement. If it is absent, look for the replacement in the links and the body. |
| Any other value | Not current | Do not present it as current. Show the raw value. |

`superseded_by` is a path field. It has a meaning only with `status: deprecated`.

## Freshness

1. Read `stale_after` (section 5.5). A null or empty value is the same as no value.
2. A valid value is an RFC 3339 date-time with an offset, such as `2026-12-31T00:00:00Z`, or a date, such as `2026-12-31`. A date means the start of that day in UTC.
3. The concept is stale when the current time is equal to or later than `stale_after`.
4. If the value does not parse, treat the concept as stale, and say that the value is malformed. Never treat it as fresh.
5. Report each stale concept with the date when it became stale.

Stale means that a person or a process must check the content again. It does not mean that the content is false. Freshness and trust are independent: a human-reviewed concept can be stale.

## Source credibility

OKF stores facts about each source, not a score (section 5.1).

| Signal | Shows | How to read it |
|---|---|---|
| `author` | Authority | An actor such as `human:<id>`, `team:<id>`, or `process:<id>`. |
| `usage_count` with `usage_window` | Liveness | Compare counts only at the level of used or unused and by order of magnitude. Do not rank sources of different kinds by exact count. |
| `last_modified` | Recency | When the source itself changed. This is not the time when the concept was written. |

If a `sources[].resource` points to another concept in the bundle, you can read that concept's own `sources` to follow the lineage.

To resolve a footnote `[^label]`, find the `sources` entry whose `id` equals `label`. Do not parse the footnote text.

## Conflicts

When two concepts disagree, compare them in this order. The first difference decides.

1. Status: a current concept (`stable` or `draft`) wins over a deprecated concept or a concept with an unknown status.
2. Trust tier: human-reviewed wins over machine-confirmed, which wins over unverified.
3. Freshness: a concept that is not stale wins over a stale one.
4. Recency: the later `generated.at` wins.

Report the conflict and the decision. If no step decides, show both answers and name the concept that supports each.

## Attestation gate

| Result (sections 10.2 and 10.5) | What to show |
|---|---|
| The attestation passed, and the computation is not stale | The value, the verdict, and the receipt reference. |
| The attestation passed, and the computation is stale | The value, with a warning that the definition passed its `stale_after` date. |
| The attestation failed | No value. Show the `reason` from the verdict. |
| The computation did not run | No value. Show the computation with the parameter values bound, and say that it did not run. |
| The concept has no `runtime` or no `attester` | The value only if it ran, labeled as not attested. Never call it attested. |
| The computation is missing | No value. Say that the concept is not attestable. |

`verified` confirms that the definition still matches its policy, and the bundle records it. Attestation confirms that one run produced the value in the sanctioned way. It happens at run time, and the bundle does not record it (section 10.6). Report both.

## Paths

Links in a body and path fields in frontmatter use the same rules (section 6).

1. A value with a URI scheme, such as `https:`, is an absolute URL.
2. A value that starts with `/` resolves from the bundle root.
3. Any other value resolves from the directory of the file that contains it.
4. A value that resolves outside the bundle root is external. Do not read it from the local file system.
5. Paths are case-sensitive. Decode percent-encoding, such as `%20`, before you look for a file.
6. A `sources[].resource` that contains spaces is a scope descriptor, such as `all queries in BigQuery project acme`. It is not a path.

In a bundle that declares `okf_version` 0.2 or earlier, or no version, a path field without a leading `/` that does not resolve from its file can resolve from the bundle root (section 6.2). This fallback does not apply to links in the body.

## Values

These rules apply to every field (section 11.2).

- A null value, an empty string, and an empty list are the same as an absent key.
- Where a field is a list (`tags`, `sources`, `verified`, `parameters`), a single item counts as a list with one item.
- A scalar `tags` value is one tag. Do not split it at commas.
- Ignore an entry of a family that does not have its required key, for example a `sources` entry without `resource`.
- If a defined key has a value outside its vocabulary, keep the value and show it.
