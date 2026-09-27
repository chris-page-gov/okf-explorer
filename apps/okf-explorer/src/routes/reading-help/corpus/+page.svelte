<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { replaceState } from '$app/navigation';
  import { corpusParts, crossTargets, loadCatalogue, loadCorpusPassage, loadCrossTarget, loadDocument, type CorpusCard, type CorpusOccurrence, type CorpusPassage, type CorpusReferenceRow, type CorpusSpan, type CrossTarget, type LoadedCatalogue, type LoadedDocument, type LoadedPassage } from '$lib/evidence/readingHelpCorpus';

  let catalogueInput = $state('');
  let catalogue = $state<LoadedCatalogue | null>(null);
  let document = $state<LoadedDocument | null>(null);
  let passage = $state<LoadedPassage | null>(null);
  let selectedOccurrence = $state<CorpusOccurrence | null>(null);
  let selectedReference = $state<CorpusReferenceRow | null>(null);
  let familyFilter = $state('');
  let documentFilter = $state('');
  let passageFilter = $state('');
  let abbreviationFilter = $state('');
  let loading = $state('');
  let error = $state('');
  let controller: AbortController | null = null;
  let occurrenceOpener: HTMLButtonElement | null = null;
  let referenceOpener: HTMLButtonElement | null = null;
  let expectedCatalogueSha = $state('');
  let expectedCatalogueBytes = $state<number | null>(null);
  const documents = $derived(catalogue?.catalogue.documents.filter(row => (!familyFilter || row.family === familyFilter) && row.document_id.toLowerCase().includes(documentFilter.trim().toLowerCase())).slice(0, 50) ?? []);
  const families = $derived([...new Set(catalogue?.catalogue.documents.map(row => row.family) ?? [])].sort());
  const passageRefs = $derived.by(() => {
    const seen = new Set<string>();
    const rows = document?.index.passages ?? [];
    const query = passageFilter.trim().toLocaleLowerCase('en-GB');
    const abbreviation = abbreviationFilter.trim().toLocaleLowerCase('en-GB');
    return rows.filter(row => {
      if (seen.has(row.unit_id)) return false;
      seen.add(row.unit_id);
      const parts = rows.filter(part => part.unit_id === row.unit_id);
      return parts.some(part => [part.role, part.label ?? '', ...(part.paragraph_labels ?? []), part.unit_id, part.pages.join(' ')].join(' ').toLocaleLowerCase('en-GB').includes(query)) &&
        (!abbreviation || parts.some(part => part.abbreviations?.some(item => item.toLocaleLowerCase('en-GB') === abbreviation)));
    }).slice(0, 100);
  });
  const cards = $derived(passage?.cards.filter(row => row.occurrence_id === selectedOccurrence?.id) ?? []);
  const targets = $derived(passage ? crossTargets(passage) : []);
  const abbreviations = $derived(document?.index.abbreviation_definitions?.filter(row => `${row.term} ${row.expansion}`.toLocaleLowerCase('en-GB').includes(abbreviationFilter.trim().toLocaleLowerCase('en-GB'))).slice(0, 50) ?? []);

  function begin(label: string) {
    controller?.abort();
    const next = new AbortController(); controller = next;
    loading = label; error = '';
    return next;
  }
  function active(request: AbortController) { return controller === request && !request.signal.aborted; }
  function failure(request: AbortController, cause: unknown) { if (active(request)) error = cause instanceof Error ? cause.message : String(cause); }
  function finish(request: AbortController) { if (active(request)) loading = ''; }
  function address() {
    if (!catalogue) return;
    const params = new URLSearchParams({ catalogue: catalogue.url.href });
    if (expectedCatalogueSha) params.set('catalogue_sha256', expectedCatalogueSha);
    if (expectedCatalogueBytes !== null) params.set('catalogue_bytes', String(expectedCatalogueBytes));
    if (document) { params.set('family', document.index.family); params.set('document', document.index.document_id); }
    if (passage) params.set('unit', passage.id);
    if (selectedOccurrence) params.set('occurrence', selectedOccurrence.id);
    replaceState(`${location.pathname}?${params}`, {});
  }
  async function openCatalogue(raw: string, wantedFamily = '', wantedDocument = '', wantedUnit = '', wantedOccurrence = '', expectedSha = '', expectedBytes = '') {
    const request = begin('Checking catalogue…'); catalogue = null; document = null; passage = null; selectedOccurrence = null; selectedReference = null;
    expectedCatalogueSha = expectedSha; expectedCatalogueBytes = expectedBytes ? Number(expectedBytes) : null;
    try {
      if (expectedSha && !/^[a-f0-9]{64}$/.test(expectedSha)) throw new Error('Invalid bound catalogue SHA-256.');
      if (expectedBytes && (!Number.isSafeInteger(Number(expectedBytes)) || Number(expectedBytes) < 1)) throw new Error('Invalid bound catalogue byte count.');
      const result = await loadCatalogue(raw, location.href, request.signal);
      if (expectedSha && result.sha256 !== expectedSha || expectedBytes && result.bytes !== Number(expectedBytes)) throw new Error('Catalogue bytes differ from the selected workbench binding.');
      if (!active(request)) return;
      catalogue = result; catalogueInput = result.url.href; loading = '';
      address();
      if (wantedFamily && wantedDocument) await openDocument(wantedFamily, wantedDocument, wantedUnit, wantedOccurrence);
    } catch (cause) { failure(request, cause); }
    finally { finish(request); }
  }
  async function openDocument(family: string, documentId: string, wantedUnit = '', wantedOccurrence = '') {
    if (!catalogue) return;
    const request = begin('Checking selected document index…'); document = null; passage = null; selectedOccurrence = null; selectedReference = null;
    try {
      const result = await loadDocument(catalogue, family, documentId, request.signal);
      if (!active(request)) return;
      document = result; familyFilter = family; documentFilter = documentId; loading = ''; address();
      if (wantedUnit) await openPassage(wantedUnit, wantedOccurrence);
    } catch (cause) { failure(request, cause); }
    finally { finish(request); }
  }
  async function openPassage(unitId: string, wantedOccurrence = '') {
    if (!document) return;
    const request = begin('Checking selected passage and frozen source pages…'); passage = null; selectedOccurrence = null; selectedReference = null;
    try {
      const result = await loadCorpusPassage(document, unitId, request.signal);
      if (!active(request)) return;
      passage = result; address();
      if (wantedOccurrence) {
        const row = result.occurrences.find(item => item.id === wantedOccurrence);
        if (!row) throw new Error('The requested exact occurrence is unavailable in this passage.');
        selectedOccurrence = row; address();
        await tick();
        occurrenceOpener = Array.from(window.document.querySelectorAll<HTMLButtonElement>('[data-occurrence-id]')).find(item => item.dataset.occurrenceId === wantedOccurrence) ?? null;
        occurrenceOpener?.focus({ preventScroll: true });
        occurrenceOpener?.scrollIntoView({ block: 'center' });
      }
    } catch (cause) { failure(request, cause); }
    finally { finish(request); }
  }
  async function openTarget(target: CrossTarget) {
    if (!catalogue) return;
    const request = begin('Checking exact cross-document target…');
    try {
      const result = await loadCrossTarget(catalogue, target, request.signal);
      if (!active(request)) return;
      document = result.document; passage = result;
      selectedOccurrence = result.occurrences.find(row => row.id === target.occurrence_id) ?? null; selectedReference = null;
      address();
      await tick();
      occurrenceOpener = Array.from(window.document.querySelectorAll<HTMLButtonElement>('[data-occurrence-id]')).find(item => item.dataset.occurrenceId === target.occurrence_id) ?? null;
      occurrenceOpener?.focus({ preventScroll: true });
    } catch (cause) { failure(request, cause); }
    finally { finish(request); }
  }
  function selectOccurrence(row: CorpusOccurrence, button: HTMLButtonElement) { selectedOccurrence = row; selectedReference = null; occurrenceOpener = button; address(); }
  function selectReference(row: CorpusReferenceRow, button: HTMLButtonElement) { selectedReference = row; selectedOccurrence = null; referenceOpener = button; address(); }
  function closeReference() { selectedReference = null; referenceOpener?.focus(); referenceOpener = null; }
  function closeOccurrence() { selectedOccurrence = null; address(); occurrenceOpener?.focus(); occurrenceOpener = null; }
  function sourceUrl(page: number) { return document ? `${document.index.source.url}#page=${page}` : ''; }
  function pageLabel(span: CorpusSpan) { return `Page ${span.page}, UTF-8 bytes ${span.start_utf8}–${span.end_utf8}`; }
  function segmentLabel(row: CorpusPassage) { return `${row.role} · segment ${row.segment.ordinal + 1} of ${row.segment_count}`; }
  function cardExpansions(card: CorpusCard) { return [...new Set(card.source_table_rows?.map(row => row.expansion).filter((value): value is string => !!value) ?? [])]; }
  onMount(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('catalogue');
    if (raw) void openCatalogue(raw, params.get('family') ?? '', params.get('document') ?? '', params.get('unit') ?? '', params.get('occurrence') ?? '', params.get('catalogue_sha256') ?? '', params.get('catalogue_bytes') ?? '');
    return () => controller?.abort();
  });
</script>

<svelte:head><title>Reading-help corpus | OKF Explorer</title><meta name="description" content="Inspect one source-bound reading-help passage from a governed catalogue." /></svelte:head>
<div class="shell">
  <header><p><a href="../">← Bounded reading aid</a></p><h1>Reading-help corpus</h1><p>Select a document and passage from a governed catalogue. Source text and candidate help remain separate. This independent demonstration is not official DWP guidance and does not decide entitlement.</p></header>
  <form class="loader" onsubmit={(event) => { event.preventDefault(); void openCatalogue(catalogueInput); }}><label for="catalogue">Reading-help catalogue URL</label><input id="catalogue" type="url" bind:value={catalogueInput} required placeholder="https://…/reading-help-corpus/manifest.json" /><button type="submit">Load catalogue</button></form>
  {#if loading}<p role="status">{loading}</p>{/if}
  {#if error}<p role="alert" class="error">{error}</p>{/if}
  {#if catalogue}
    <p>{catalogue.catalogue.documents.length.toLocaleString()} processed documents · {catalogue.catalogue.counts.extraction_blocked_pages?.toLocaleString() ?? 0} extraction-blocked pages. Catalogue status: {catalogue.catalogue.status}.</p>
    <details><summary>Catalogue identity and limits</summary><p>SHA-256 <code>{catalogue.sha256}</code></p><ul>{#each catalogue.catalogue.limitations as limit}<li>{limit}</li>{/each}</ul></details>
    <section class="picker" aria-label="Choose document"><h2>Choose a document</h2><label for="family">Family</label><select id="family" bind:value={familyFilter}><option value="">All families</option>{#each families as family}<option value={family}>{family.toUpperCase()}</option>{/each}</select><label for="document-search">Document ID</label><input id="document-search" type="search" bind:value={documentFilter} placeholder="Search document IDs" /><p>Showing {documents.length} matching documents at most.</p><ul>{#each documents as row}<li><button type="button" aria-current={document?.index.document_id === row.document_id ? 'true' : undefined} onclick={() => openDocument(row.family, row.document_id)}>{row.family.toUpperCase()} · {row.document_id} · {row.counts.passages} passages</button></li>{/each}</ul></section>
  {/if}
  {#if document}
    <section class="picker" aria-label="Choose passage"><h2>{document.index.document_id}</h2><p>{document.index.passages.length.toLocaleString()} ordered passage segments · {document.index.extraction_blocked_pages.length.toLocaleString()} extraction-blocked pages. Specialist acceptance: {document.index.review.specialist_accepted ? 'recorded' : 'not recorded'}.</p><label for="passage-search">Find a paragraph or declared label</label><input id="passage-search" type="search" bind:value={passageFilter} placeholder="Paragraph number, declared label, role or page" /><label for="abbreviation-search">Exact abbreviation occurrence in this document</label><input id="abbreviation-search" type="search" bind:value={abbreviationFilter} placeholder="For example, CA" /><p>Showing up to 100 matching passages. Abbreviation search uses source-verified occurrence literals in the index.</p><ul>{#each passageRefs as row}<li><button type="button" aria-current={passage?.id === row.unit_id ? 'true' : undefined} onclick={() => openPassage(row.unit_id)}>{row.label || row.paragraph_labels?.join(', ') || row.role} · page {row.pages.join(', ')} · {row.role}</button></li>{/each}</ul>
      {#if document.index.abbreviation_definitions?.length}<h3>Proposed definitions in this document</h3><p>These definitions are source-derived proposals. Equal letters in another document do not establish equal meaning.</p><ul>{#each abbreviations as row}<li><button type="button" onclick={() => openPassage(row.passage_id)}>{row.term} — {row.expansion} · {row.status}</button></li>{/each}</ul>{/if}
      {#if document.index.repeated_phrase_proposals?.length}<details><summary>Repeated phrase proposals ({document.index.repeated_phrase_proposals.length})</summary><p>These source-derived phrases have no declared meaning or applicability. Use the paragraph and heading search above to locate a passage; phrase counts are discovery hints only.</p><ul>{#each document.index.repeated_phrase_proposals as row}<li><q>{row.literal}</q> · {row.passage_count} passages · {row.status}</li>{/each}</ul></details>{/if}
    </section>
  {/if}
  {#if passage}
    <section class="passage" aria-label="Selected source passage"><h2>Selected source passage</h2><p>Exact unit ID: <code>{passage.id}</code>. {passage.leafCount} bound leaf file{passage.leafCount === 1 ? '' : 's'} loaded. The complete text joins {passage.segments.length} verified segment{passage.segments.length === 1 ? '' : 's'}.</p><p>Selected load: {passage.metrics.fetched_files} files and {passage.metrics.fetched_bytes.toLocaleString()} bytes fetched; {passage.metrics.cache_hits} verified cache hits. The cache is limited to this browser session.</p>{#if passage.segments[0].paragraph_labels.length}<p>Declared paragraph label{passage.segments[0].paragraph_labels.length === 1 ? '' : 's'}: {passage.segments[0].paragraph_labels.join(', ')}.</p>{/if}
      <details class="segment"><summary>Ordered segment receipts</summary><ol>{#each passage.segments as segment}<li>{segmentLabel(segment)} · UTF-8 bytes {segment.segment.start_utf8}–{segment.segment.end_utf8} · SHA-256 <code>{segment.segment.sha256}</code></li>{/each}</ol></details>
      {#if !passage.segments[0].source_spans.length}<p class="boundary">Machine extraction is blocked for this passage. The PDF page has not been shown to be blank.</p>{/if}
      {#each passage.segments[0].source_spans as span}<div class="source-page"><p><a href={sourceUrl(span.page)} target="_blank" rel="noopener noreferrer">Open source PDF at page {span.page}</a> · {pageLabel(span)}</p><pre>{#each corpusParts(passage, span) as part}{#if part.occurrence}<button type="button" class="term" data-occurrence-id={part.occurrence.id} aria-expanded={selectedOccurrence?.id === part.occurrence.id} onclick={(event) => selectOccurrence(part.occurrence!, event.currentTarget)}>{part.text}</button>{:else}{part.text}{/if}{/each}</pre></div>{/each}
      <p class="boundary">The displayed source spans and occurrence literals match the frozen page extraction and joined passage hash. Candidate meanings and legal applicability remain unreviewed.</p>
      {#if targets.length}<h3>Exact cross-document references</h3><ul>{#each targets as target}<li><button type="button" onclick={() => openTarget(target)}>Open bound occurrence {target.occurrence_id} in {target.document_id}</button></li>{/each}</ul>{:else}<p>There is no exact cross-document occurrence target in this passage. Similar numbers or words are not linked by inference.</p>{/if}
      {#if passage.segments.some(row => row.reference_list_segments.length)}<h3>Printed reference rows</h3><p>These rows are unresolved unless an exact bound body occurrence is named. Matching digits alone do not establish a link.</p><ul>{#each passage.segments.flatMap(row => row.reference_list_segments) as row}<li><button type="button" aria-expanded={selectedReference?.occurrence_id === row.occurrence_id} onclick={(event) => selectReference(row, event.currentTarget)}>{row.literal} · page {row.page}</button></li>{/each}</ul>{/if}
    </section>
    <aside class="help" aria-live="polite"><h2>Occurrence-scoped reading help</h2>{#if selectedReference}<p><strong>Printed reference row:</strong> {selectedReference.literal}</p><p>Page {selectedReference.page}, UTF-8 bytes {selectedReference.start_utf8}–{selectedReference.end_utf8}. Row status: {selectedReference.status}.</p><p>{selectedReference.body_occurrence_ids.length ? `${selectedReference.body_occurrence_ids.length} body occurrence IDs are declared; this view does not infer an unbound destination.` : 'Body pairing unresolved. No exact body occurrence ID is declared.'}</p><button type="button" onclick={closeReference}>Close reference row</button>{:else if selectedOccurrence}<p><strong>{selectedOccurrence.literal}</strong> · source page {selectedOccurrence.page} · {selectedOccurrence.role}. Literal status: {selectedOccurrence.status}.</p><button type="button" onclick={closeOccurrence}>Close reading help</button>{#if cards.length}{#each cards as card}<article><h3>{card.kind}</h3><p>Candidate status: <strong>{card.status}</strong>. This is not reviewed guidance.</p>{#if card.target}<p>Proposed citation destination: {card.target.manual || 'Manual not declared'} · {card.target.target_kind || 'target kind not declared'} {card.target.target_label || 'label not declared'}. This is a label for review, not a verified link or legal applicability finding.</p>{/if}{#if card.scope}<p>Proposed scope: {card.scope.target_document_id || 'Target document not declared'}; printed abbreviation source: {card.scope.source_table_document_ids?.join(', ') || 'not declared'}.</p>{/if}{#if cardExpansions(card).length}<p>Proposed expansion from the named printed table: {cardExpansions(card).join('; ')}. This meaning remains a candidate for the declared document scope.</p>{/if}{#if card.source_table_rows?.length}<details><summary>Proposed printed-table support</summary><ul>{#each card.source_table_rows as row}<li>{row.document_id}, page {row.page}: <q>{row.literal}</q>{#if row.expansion} → {row.expansion}{/if}. Table row status: {row.status}. This view has not independently loaded that table page.</li>{/each}</ul></details>{/if}</article>{/each}{:else}<p>No candidate card is attached to this exact occurrence.</p>{/if}{:else}<p>Select an underlined occurrence or a printed reference row.</p>{/if}</aside>
  {/if}
</div>
<style>
  :global(body){margin:0;font-family:system-ui,sans-serif;color:#173047;background:#f7fafc}:global(*){box-sizing:border-box}.shell{max-width:1200px;margin:auto;padding:1rem 1.5rem 4rem}a{color:#145a91}button,input,select{font:inherit}button{cursor:pointer;border:1px solid #315a72;border-radius:4px;background:#fff;padding:.4rem .6rem;color:#173047;text-align:left}button:hover,button[aria-current]{background:#d9edf7}button:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #e68720;outline-offset:2px}.loader{display:flex;flex-wrap:wrap;gap:.5rem;align-items:end;margin:1.25rem 0}.loader label{width:100%;font-weight:700}.loader input{width:min(100%,44rem)}input,select{border:1px solid #708b9c;border-radius:3px;padding:.45rem;background:white;max-width:100%}.picker,.passage,.help,details{border:1px solid #ccd7de;background:white;padding:1rem;margin:1rem 0}.picker ul{max-height:16rem;overflow:auto;list-style:none;padding:0}.picker li{margin:.35rem 0}.picker label{display:block;margin-top:.5rem;font-weight:700}.picker input{width:min(100%,35rem)}.segment{border-top:1px solid #ccd7de}.source-page{margin:1rem 0}.source-page pre{white-space:pre-wrap;overflow-wrap:anywhere;font:1rem/1.6 ui-monospace,monospace;background:#f0f4f6;padding:1rem;max-height:38rem;overflow:auto}.term{display:inline;border:0;border-bottom:2px dotted #005a9c;border-radius:0;background:#e8f3fa;padding:0 .05rem;font:inherit;white-space:inherit}.term[aria-expanded=true]{background:#ffdd00}.boundary{border-left:4px solid #1d70b8;padding:.6rem;background:#eef5fa}.error{border-left:4px solid #b12b2b;padding:.8rem;background:#fff1f0}code{overflow-wrap:anywhere}.help article{border-top:1px solid #ccd7de;margin-top:1rem}q{white-space:pre-wrap}
</style>
