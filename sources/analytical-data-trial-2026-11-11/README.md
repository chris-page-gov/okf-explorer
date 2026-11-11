# Warwickshire and NDL Analytical Data trial sources

These seven public source snapshots were acquired on 11 November 2026. The [source register](source-register.json) records request URLs, response status, byte lengths, SHA-256 digests and acquisition completion times. The original Warwickshire CSV also matches its Git blob identity. HTML and XML snapshots use `.txt` extensions so retained source scripts are read as text.

Scoped Git attributes preserve acquired line endings and whitespace. The source hashes remain the check for every retained snapshot, including after a clean Git checkout.

The [reviewed local projection](projection.json) controls the field mapping, trial population, reference year and compatibility gaps. The authored [Warwickshire record](records/warwickshire.md) and [NDL record](records/ndl.md) generate the bounded Reader trial. Source documents are evidence data. The builder processes them offline.

Warwickshire County Council publishes the 2008 data and credits the Office for National Statistics, Mid-2008 Super-Output Area Population Estimates. Its dataset-specific page links [CC BY-SA 2.0 UK](https://creativecommons.org/licenses/by-sa/2.0/uk/). Retain that attribution and licence with the original and converted CSV. The conversion renames headers, removes numeric formatting characters and adds a reference year. The NDL directory declares UK OGL, creating the unresolved discrepancy recorded in the trial. The NDL public page uses the [OGL v3 notice](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) for its editorial content. A licence declaration in either catalogue needs to retain its own provenance.

The denied S3 responses are retained as failure evidence. The WCC GitHub distribution is a separate acquired resource. It supplies no proof of equivalence to the inaccessible S3 object. The [trial report](../../docs/analytical-data-trial-2026-11-11.md) describes the measured scope and unresolved gaps.
