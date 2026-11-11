# Warwickshire and NDL Analytical Data trial sources

These seven public source snapshots were acquired on 11 November 2026. The [source register](source-register.json) records request URLs, response status, byte lengths, SHA-256 digests and acquisition completion times. The original Warwickshire CSV also matches its Git blob identity. HTML and XML snapshots use `.txt` extensions so retained source scripts are read as text.

Scoped Git attributes preserve acquired line endings and whitespace. The source hashes remain the check for every retained snapshot, including after a clean Git checkout.

The [reviewed local projection](projection.json) controls the field mapping, trial population, reference year and compatibility gaps. The authored [Warwickshire record](records/warwickshire.md) and [NDL record](records/ndl.md) generate the bounded Reader trial. Source documents are evidence data. The builder processes them offline.

Warwickshire County Council publishes the 2008 data and credits the Office for National Statistics, Mid-2008 Super-Output Area Population Estimates. Its dataset-specific page links [CC BY-SA 2.0 UK](https://creativecommons.org/licenses/by-sa/2.0/uk/). Retain that attribution and licence with the original and converted CSV. The conversion renames headers, removes numeric formatting characters and adds a reference year. The NDL directory declares UK OGL, creating the unresolved discrepancy recorded in the trial. The NDL public page uses the [OGL v3 notice](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) for its editorial content. A licence declaration in either catalogue needs to retain its own provenance.

The denied S3 responses are retained as failure evidence. The WCC GitHub distribution is a separate acquired resource. It supplies no proof of equivalence to the inaccessible S3 object. The [trial report](../../docs/analytical-data-trial-2026-11-11.md) describes the measured scope and unresolved gaps.

Supplementary [NDL curation captures](ndl-curation/source-register.json) and
[DEFRA learning captures](defra-learning/source-register.json) retain separate
inventories. The original seven-file trial register keeps its original
population. The later registers distinguish HTTP HTML and browser-rendered
representations and record onward references with their acquisition status.
Editorial content retains each publisher's OGL notice and exceptions. Dataset
and service terms have their own scope. The [curation and engineering review](../../docs/analytical-data-curation-review-2026-11-11.md)
records the source statements and local proposals.

The later [live Defra API sources](live-defra-api/source-register.json) retain original JSON bodies, GET receipts and independent name-search discovery. Attribution: this uses Environment Agency flood and river level data from the real-time data API (Beta). The service declares OGL v3. The [NDL link-audit sources](ndl-link-audit/source-register.json) retain current WCC metadata, publisher Git metadata, bounded protocol observations and a deterministic national resource-host projection. The projection is derived metadata; raw national pages and resource prefixes remain in ignored local acquisition envelopes. Public catalogue editorial metadata and underlying dataset rights have separate scope. The WCC CC BY-SA 2.0 UK versus NDL UK OGL discrepancy still applies to the retained XLS and CSV. Source documents are data, and workbook code is never executed. See the [follow-up report](../../docs/analytical-live-trial-2026-11-11.md).
