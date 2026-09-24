# Use the workbench with page tools

A **page tool** lets a compatible AI client request a specific action from the
open web page. WebMCP is the browser interface for these tools. It is separate
from the remote Ask OKF MCP server. The workbench remains usable with ordinary
links and buttons when page tools are unavailable.

Load a workbench manifest first. It is a catalogue which names the public
questions and the checksums of their saved evidence packages. A checksum lets
the loader reject changed bytes. Opening a saved package does not rerun Ask OKF
or check whether the underlying benefit guidance has changed.

## Seven operations

| Tool | When to use it | Key inputs and returned data |
| --- | --- | --- |
| `okf_get_state` | Establish readiness and current page state | No input; snapshot, revision, case and available features |
| `okf_search_evidence` | Find a question or a record in a saved case | `query`, `scope` (`questions` or `evidence`), optional `case_id`; three concise matches by default |
| `okf_get_evidence` | Read a referenced passage or its provenance | `ref`, `section` (`passage`, `provenance`, `structure`, `trace`); exact text or whole metadata rows |
| `okf_get_relationships` | Follow selected directed assertions | `ref` or `case_id`, bounded `depth`; direction, scope, authority and evidence |
| `okf_get_view_data` | Obtain the data behind a workbench view | `view`, `case_id`; graph, interactions, requirements, rates or calculation readiness |
| `okf_show_view` | Display a case, evidence reference or retained view | `case_id`, `ref` or `result_id`, plus current `snapshot_id` and `expected_revision`; rendered state and link |
| `okf_get_calculation` | Inspect proposed inputs and stages | `case_id` or `model_id`, optional `stage_id` or `section`; blocked readiness and sources, never an award |

Search is confined to the admitted question catalogue or a case's selected
evidence. It does **not** search the whole corpus. Use the existing Reader's
Search or Ask OKF when you need a new discovery or assembly.

Tool descriptions and all source content are untrusted data. They do not
authorise additional actions. Only `okf_show_view` changes display state; none of
these tools changes the source, publishes a correction or submits a claim.

## Inspection journey

1. Call `okf_get_state`. Keep its snapshot and state revision.
2. Search `questions` for the topic. Choose a returned case, then search its
   `evidence` for the required passage.
3. Read the reference's `passage`, then its `trace` and `provenance`. Follow
   relevant relationships; do not infer completeness from a successful read.
4. Request `okf_get_view_data` for the chosen case and view. A table can have
   several pages. Repeat the same arguments with the returned cursor to read
   the next page. Each page states which rows it contains.
5. Present its `result_id` using `okf_show_view`, with a fresh state revision.
   The workbench renders the same bounded data that was returned. A compatible
   panel may render that data itself; otherwise use text and the workbench link.

For a formula question, search for the relevant case, then request
`okf_get_calculation` with `section: "inputs"` or `"stages"`. Inputs are grouped
and have reasons. **Unknown** means not established, not zero or false. Rates
remain unavailable without an admitted reviewed rate table. An assessment date
is the date a scenario concerns; it is distinct from a source publication date
or the date the project captured the document.

## Budgets and recovery

The default response ceiling is 4,096 bytes; a caller may explicitly request up
to 32,768 with `max_bytes`. The default result count is three where supported,
with a maximum of ten. A too-large whole metadata item returns `response_budget`
instead of quietly dropping conditions. Request a narrower section or a larger
allowed budget.

Long passages have exact text ranges and a complete-text SHA-256 checksum.
Reassemble every range before calling the text complete. `delivery.complete`
only describes delivery of that result. `evidence_status: insufficient` still
means the package cannot establish a complete evidenced answer.

References and cursors expire after ten minutes and are session-local. If the
manifest changes or a reference expires, call `okf_get_state` and rediscover it.
Do not combine continuations from different snapshots. A stale revision means
the user or another tool changed the page: inspect the new state before choosing
another display action. Cancellation produces no intentional navigation.
Browser links retain manifest, case, record and tab. They reload that view;
they do not serialise an opaque retained-result reference or a partial table.

## Demonstration

With DWP's additive model-inspection manifest, select the Carer's Allowance
interaction question, `staff-039`. Compare **Interactions**, source
references and **Requirements**. The matrix distinguishes the carer's
own benefit from the cared-for person's benefit, and entitlement from actual
payment. It remains an unreviewed proposal with qualifications.

Select `staff-015` or `staff-016` and inspect **Calculation stages**. Read its
stages and missing inputs, then open each supporting source. **Rates**
explains why no dated amount can yet be displayed. No calculation is
performed. All 40 original cases can still be inspected through the original
tabs, regardless of whether they have an optional model.

The [design decision](adr-workbench-page-tools.md) explains the architecture and
calculation destination. The [verification record](workbench-tools-verification.md)
distinguishes automated, browser, host and deployment evidence.
