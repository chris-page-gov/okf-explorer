# Inspect a retained evidence example

Use this seven-step walkthrough for a short demonstration. Open the `index.html`
from a reviewed, served archive. A file on your laptop is a **local example**;
only describe it as a verified public example when its publication receipt
checks the actual public URL. This guide does not announce a deployed archive.

1. **Choose the recorded example.** Select a named question from the list.
   Explain that it is a fixed evidence package: the material Ask OKF selected
   in a particular recorded run. Opening it makes no AI call and sends no new
   question to Ask OKF.
2. **Read the status and gaps first.** *Insufficient* means something needed
   to address the question is missing or unresolved. It does not mean that a
   person is ineligible for a benefit. If a short term has several meanings,
   show those alternatives without choosing one silently.
3. **Check which material and software were used.** Point to the source
   version, bundle snapshot and assembler identity. A *snapshot* is a fixed
   version of the inputs. The *assembler* is the software that selected the
   evidence. An unknown original assembler stays labelled unknown.
4. **Read one complete selected passage.** Select **Read evidence** for a
   record. The reader downloads every part and checks its SHA-256 hash before
   showing it. A *hash* is a fingerprint of the exact bytes; it detects changed
   files but does not establish that their statements are true. Identify any
   controlling heading, condition or exception actually present in the text.
5. **Follow provenance and the selection path.** *Provenance* means where
   the material came from and how it was captured. Show its source URL, page
   locator, authority, rights and separate source/capture dates. Read why it
   was included and the directed relationship path. An authored association
   is not automatically a legal rule. Source links open only when selected.
6. **Inspect the same bytes a client can read.** Open the small text or
   metadata JSON link, explaining that a single part may be incomplete. Use
   **Verify complete machine package** for the whole reconstruction and its
   download link. *JSON* is the structured text format used by software; the
   readable passages and their metadata are the same retained evidence.
7. **Finish with a checkable review task.** Ask a reviewer to name a passage,
   missing qualification or unresolved requirement using its record identifier.
   Show the empty unknown-term control if available: no records is a useful
   honest result. Record feedback through the project's existing review
   process, without entering claimant personal data or treating the page as an
   entitlement decision.

## What this demonstration establishes

It can demonstrate exact delivery and inspection of recorded evidence. It does
not demonstrate a fresh AI answer, complete legal coverage, current law,
specialist acceptance, an award calculation or Voice integration. A complete
download can still contain insufficient evidence. No anonymous question,
feedback message or model output is stored by this reader.

The initial exporter limits a package to 512 KiB, 200 records and 1,000
relationships. Catalogues are at most 16 KiB; each evidence response is at most
64 KiB. The reader loads selected resources on demand and rejects a changed,
missing or oversized file. It does not search outside the retained package or
fetch further corpus pages to fill a gap.

For preparation and exact commands, read the
[tool guide](../tools/context-archive/README.md). The
[decision record](adr-retained-evidence-examples.md) explains why this static
archive is separate from live replay and an AI-answer audit log. The
[retained local checks](../tools/context-archive/validation/README.md) document
the observed browser scope and earlier failures.
