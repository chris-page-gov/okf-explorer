# Source Constraint And Escalation Ledger

This prototype retains universal source adapters and product capabilities. It
does not silently omit a source or feature because a fair-use, access-control or
licensing concern was observed. It also does not bypass authentication or erase
publisher terms.

The machine-readable source is
[`constraints/source-constraints.yamlld`](../constraints/source-constraints.yamlld).

| Constraint | Current effect | Prototype response | Internal escalation |
|---|---|---|---|
| legislation.gov.uk fair-use request rate | Scheduling and caching only | Full Atom, CLML, effects and publication-log capabilities remain implemented | Agree production/bulk acquisition route with The National Archives |
| Research Legislation bulk/SPARQL HTTP 401 | Anonymous bulk adapter cannot retrieve data | Preserve adapters and provenance; use official Atom/document APIs without bypassing access control | Obtain internal credentials or approved transfer |
| OGL and additional source-specific terms | Item-level reuse obligations | Preserve licence source, basis, confidence and attribution | Confirm mixed-source production redistribution with legal/data owners |
| Remote YAML-LD/JSON-LD contexts | Determinism, availability and privacy risk | Pinned allowlisted local contexts; expanded JSON-LD output | Approve permanent profile/context hosting later |
| Model API project quota | Direct Responses API calls returned `insufficient_quota` with no usage | Preserve the API runner and use the active Codex session for a governed, provenance-bearing rule set | Add project billing/quota for reproducible batch refreshes |

New constraints must be added to the YAML-LD ledger when observed, including
the triggering source/action, actual impact, prototype response, evidence URL,
status and escalation route.

The rejected model API requests produced no token usage, so their recorded API
cost is **$0.00**. The governed fallback remains explicitly model-assisted and
is never represented as official legal classification.
