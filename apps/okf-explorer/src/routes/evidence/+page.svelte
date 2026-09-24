<script lang="ts">
  import { onMount } from 'svelte';
  import type { ContextPackage, ContextRecord, ContextSelection } from '$lib/context/types';
  import { loadManifest, loadPackage, manifestUrl, reviewDownload, sourcePageUrl, unitSpanText, type WorkbenchCase, type WorkbenchManifest } from '$lib/evidence/workbench';
  import { isHttpUrl } from '$lib/viewer/helpers';

  type Tab = 'source' | 'extraction' | 'passage' | 'ontology' | 'definitions' | 'trace' | 'review';
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'source', label: 'Original source' }, { id: 'extraction', label: 'Extracted text and structure' },
    { id: 'passage', label: 'Complete passage' }, { id: 'ontology', label: 'Concepts and relationships' },
    { id: 'definitions', label: 'Definitions and exceptions' }, { id: 'trace', label: 'Retrieval trace' },
    { id: 'review', label: 'Review proposal' }
  ];
  let input = $state('');
  let sourceUrl = $state<URL | null>(null);
  let manifest = $state<WorkbenchManifest | null>(null);
  let selectedCase = $state<WorkbenchCase | null>(null);
  let context = $state<ContextPackage | null>(null);
  let selectedRecordId = $state('');
  let tab = $state<Tab>('source');
  let filter = $state('');
  let loading = $state(false);
  let error = $state('');
  let reviewStatus = $state('needs-specialist-review');
  let reviewComment = $state('');
  let reviewMessage = $state('');
  let controller: AbortController | null = null;
  let requestGeneration = 0;

  const records = $derived(context?.selected ?? []);
  const selected = $derived(records.find(item => item.record.id === selectedRecordId) ?? records[0] ?? null);
  const visibleCases = $derived(manifest?.questions.filter(item => `${item.label} ${item.question}`.toLocaleLowerCase('en-GB').includes(filter.toLocaleLowerCase('en-GB'))) ?? []);
  const sourceLink = $derived(selected ? sourcePageUrl(selected.record) : null);

  function link(caseId: string, recordId = '', chosenTab: Tab = tab): string {
    const params = new URLSearchParams();
    if (sourceUrl) params.set('manifest', sourceUrl.href);
    if (caseId) params.set('case', caseId);
    if (recordId) params.set('record', recordId);
    params.set('tab', chosenTab);
    return `?${params.toString()}`;
  }

  function syncAddress(caseId: string, recordId: string, chosenTab: Tab, mode: 'push' | 'replace' | 'none' = 'push') {
    if (mode === 'none') return;
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', link(caseId, recordId, chosenTab));
  }

  function beginRequest() {
    controller?.abort();
    const active = new AbortController();
    const generation = ++requestGeneration;
    controller = active;
    return { active, current: () => controller === active && generation === requestGeneration && !active.signal.aborted };
  }

  async function openCase(item: WorkbenchCase, wantedRecord = '', historyMode: 'push' | 'replace' | 'none' = 'push') {
    if (!sourceUrl) return;
    const source = sourceUrl;
    const request = beginRequest();
    selectedCase = item;
    context = null;
    selectedRecordId = '';
    error = '';
    loading = true;
    try {
      const loaded = await loadPackage(item, source, request.active.signal);
      if (!request.current()) return;
      context = loaded;
      selectedRecordId = loaded.selected.some(row => row.record.id === wantedRecord) ? wantedRecord : loaded.selected[0]?.record.id ?? '';
      syncAddress(item.id, selectedRecordId, tab, historyMode);
    } catch (cause) {
      if (request.current()) error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (request.current()) loading = false;
    }
  }

  async function openManifest(raw: string, wantedCase = '', wantedRecord = '', historyMode: 'push' | 'replace' | 'none' = 'push') {
    const request = beginRequest();
    sourceUrl = null;
    manifest = null;
    selectedCase = null;
    context = null;
    error = '';
    loading = true;
    try {
      const url = manifestUrl(raw, window.location.href);
      const loaded = await loadManifest(url, request.active.signal);
      if (!request.current()) return;
      input = url.href;
      sourceUrl = url;
      manifest = loaded;
      const item = loaded.questions.find(row => row.id === wantedCase) ?? loaded.questions[0];
      if (item) await openCase(item, wantedRecord, historyMode);
    } catch (cause) {
      if (request.current()) error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      if (request.current()) loading = false;
    }
  }

  function chooseCase(event: MouseEvent, item: WorkbenchCase) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    tab = 'source';
    void openCase(item);
  }

  function chooseRecord(event: MouseEvent, item: ContextSelection) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectedRecordId = item.record.id;
    reviewComment = '';
    reviewMessage = '';
    syncAddress(selectedCase?.id ?? '', selectedRecordId, tab);
  }

  function chooseTab(event: MouseEvent, next: Tab) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    tab = next;
    syncAddress(selectedCase?.id ?? '', selected?.record.id ?? '', tab);
  }

  function chooseRecordTab(event: MouseEvent, item: ContextSelection, next: Tab) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    chooseRecord(event, item);
    tab = next;
    syncAddress(selectedCase?.id ?? '', item.record.id, tab);
  }

  function recordLabel(id: string): string {
    return records.find(item => item.record.id === id)?.record.label ?? id;
  }

  function sourceDate(record: ContextRecord): string {
    const dated = record.provenance.find(value => value.source_date);
    return dated ? `${dated.source_date} (${dated.source_date_kind || 'date meaning not supplied'})` : 'Not supplied';
  }

  function capturedAt(record: ContextRecord): string {
    return record.provenance.find(value => value.captured_at)?.captured_at ?? 'Not supplied';
  }

  function exportProposal() {
    if (!context || !selectedCase || !selected || !reviewComment.trim()) return;
    const body = reviewDownload(context, selectedCase.id, selected.record.id, reviewComment.trim(), reviewStatus);
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `evidence-review-${selectedCase.id}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    reviewMessage = 'Proposal downloaded locally. It has not changed the source or publication.';
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const chosen = params.get('tab');
    if (tabs.some(item => item.id === chosen)) tab = chosen as Tab;
    input = params.get('manifest') || new URL('../evaluation/evidence-workbench/manifest.json', window.location.href).href;
    if (params.has('manifest')) void openManifest(input, params.get('case') ?? '', params.get('record') ?? '', 'replace');
    const followHistory = () => {
      const state = new URLSearchParams(window.location.search);
      const nextTab = state.get('tab');
      tab = tabs.some(item => item.id === nextTab) ? nextTab as Tab : 'source';
      const nextManifest = state.get('manifest');
      const nextCase = state.get('case') ?? '';
      const nextRecord = state.get('record') ?? '';
      if (!nextManifest) {
        controller?.abort();
        requestGeneration++;
        sourceUrl = null;
        manifest = null;
        selectedCase = null;
        context = null;
        loading = false;
        error = '';
        return;
      }
      let wantedUrl: URL;
      try { wantedUrl = manifestUrl(nextManifest, window.location.href); }
      catch (cause) {
        controller?.abort();
        requestGeneration++;
        sourceUrl = null;
        manifest = null;
        selectedCase = null;
        context = null;
        loading = false;
        error = cause instanceof Error ? cause.message : String(cause);
        return;
      }
      if (!sourceUrl || wantedUrl.href !== sourceUrl.href) {
        input = nextManifest;
        void openManifest(nextManifest, nextCase, nextRecord, 'none');
        return;
      }
      if (nextCase && nextCase !== selectedCase?.id) {
        const item = manifest?.questions.find(row => row.id === nextCase);
        if (item) void openCase(item, nextRecord, 'none');
      } else {
        selectedRecordId = records.some(row => row.record.id === nextRecord) ? nextRecord : records[0]?.record.id ?? '';
      }
    };
    window.addEventListener('popstate', followHistory);
    return () => { controller?.abort(); requestGeneration++; window.removeEventListener('popstate', followHistory); };
  });
</script>

<svelte:head>
  <title>Evidence workbench | OKF Explorer</title>
  <meta name="description" content="Inspect source documents, extracted passages, conceptual relationships and question evidence packages." />
</svelte:head>

<a class="skip-link" href="#evidence-main">Skip to evidence</a>
<div class="workbench">
  <header class="masthead">
    <div><a href="../explore/">← Explorer</a><h1>Evidence workbench</h1><p>Trace a staff question back to source pages, passages and declared evidence needs.</p></div>
    <form onsubmit={(event) => { event.preventDefault(); void openManifest(input); }}>
      <label for="manifest-url">Review manifest URL</label>
      <div><input id="manifest-url" type="url" bind:value={input} required /><button type="submit">Load</button></div>
    </form>
  </header>
  {#if error}<p class="alert" role="alert">{error}</p>{/if}
  {#if loading}<p class="busy" role="status">Loading selected evidence…</p>{/if}
  {#if manifest}
    <div class="columns">
      <aside class="cases" aria-labelledby="cases-title">
        <h2 id="cases-title">{manifest.title}</h2>
        <p>{manifest.questions.length} questions · {manifest.publication.label}</p>
        <label for="case-filter">Find a question</label>
        <input id="case-filter" type="search" bind:value={filter} />
        <nav aria-label="Staff questions">
          {#each visibleCases as item}
            <a href={link(item.id, '', 'source')} class:current={selectedCase?.id === item.id} aria-current={selectedCase?.id === item.id ? 'page' : undefined} onclick={(event) => chooseCase(event, item)}><span>{item.label}</span><small>{item.question}</small></a>
          {:else}<p>No questions match this search.</p>{/each}
        </nav>
      </aside>
      <main id="evidence-main">
        {#if context && selectedCase}
          <header class="case-heading">
            <p class="eyebrow">Question {selectedCase.id}</p>
            <h2>{selectedCase.question}</h2>
            <p><strong>Declared evidence status:</strong> {context.evidence_status}. This is an assembly result within the declared scope, not an answer or legal decision.</p>
            <p><strong>Scope:</strong> {context.scope}</p>
            <p class="identity">Snapshot {context.bundle.snapshot} · Context {context.context_id} · Index {context.binding.index_sha256}</p>
            {#if sourceUrl}<p><a href={new URL(selectedCase.package.url, sourceUrl).href} target="_blank" rel="noopener noreferrer">Open full machine-readable evidence package ↗</a></p>{/if}
            <p class="identity">Manifest source date: {manifest.publication.source_date || 'Not supplied'} · Manifest capture date: {manifest.publication.captured_at || 'Not supplied'}</p>
          </header>
          {#if selectedCase.ambiguities?.length || selectedCase.required_evidence?.length || selectedCase.scope_gaps?.length}
            <section class="review-brief" aria-labelledby="review-brief-title">
              <h3 id="review-brief-title">Original question review brief</h3>
              <p>These notes came with the question catalogue. They describe the intended review and its recorded gaps; they are separate from the current context package's requirements and retrieval findings.</p>
              {#if selectedCase.ambiguities?.length}<h4>Recorded ambiguities</h4><ul>{#each selectedCase.ambiguities as item}<li>{item}</li>{/each}</ul>{/if}
              {#if selectedCase.required_evidence?.length}<h4>Evidence identified for review</h4><ul>{#each selectedCase.required_evidence as item}<li>{item}</li>{/each}</ul>{/if}
              {#if selectedCase.scope_gaps?.length}<h4>Recorded scope gaps</h4><ul>{#each selectedCase.scope_gaps as item}<li>{item}</li>{/each}</ul>{/if}
            </section>
          {/if}
          <div class="record-layout">
            <aside class="record-list" aria-labelledby="records-title">
              <h3 id="records-title">Selected records ({records.length})</h3>
              <nav aria-label="Selected evidence and concepts">
                {#each records as item}
                  <a href={link(selectedCase.id, item.record.id, tab)} class:current={selected?.record.id === item.record.id} aria-current={selected?.record.id === item.record.id ? 'true' : undefined} onclick={(event) => chooseRecord(event, item)}><strong>{item.record.label}</strong><small>{item.record.kind} · {item.record.assertion_status}</small></a>
                {:else}<p>No records selected. See the retrieval trace for gaps.</p>{/each}
              </nav>
            </aside>
            <section class="inspector" aria-labelledby="inspector-title">
              {#if selected}
                <header><p class="eyebrow">{selected.record.kind} · {selected.record.assertion_status}</p><h3 id="inspector-title">{selected.record.label}</h3><p>{selected.record.authority?.label || 'Authority not supplied'} · {selected.record.review_status || 'Review status not supplied'}</p></header>
              {:else}<h3 id="inspector-title">Question evidence</h3>{/if}
              <nav class="tab-list" aria-label="Evidence views">
                {#each tabs as item}<a href={link(selectedCase.id, selected?.record.id ?? '', item.id)} class:active={tab === item.id} aria-current={tab === item.id ? 'page' : undefined} onclick={(event) => chooseTab(event, item.id)}>{item.label}</a>{/each}
              </nav>
              {#if tab === 'source'}
                {#if selected}
                  <h4>Original source</h4>
                  <p>The source document is separate from the extracted and project-authored material. Follow the cited locator to check the page.</p>
                  {#if sourceLink}<p><a class="primary-link" href={sourceLink} target="_blank" rel="noopener noreferrer">Open original document and cited page ↗</a></p>{:else}<p role="status">No safe public document URL was supplied for this record.</p>{/if}
                  <h5>Cited source locations</h5>
                  <ul>{#each selected.record.provenance as citation}{@const cited = sourcePageUrl({ ...selected.record, provenance: [citation] })}<li>{citation.locator || 'Locator not supplied'}{#if cited} · <a href={cited} target="_blank" rel="noopener noreferrer">Open this location ↗</a>{/if}</li>{/each}</ul>
                  <dl class="facts"><dt>Source locator</dt><dd>{selected.record.provenance.map(item => item.locator).join('; ') || 'Not supplied'}</dd><dt>Source publication date</dt><dd>{sourceDate(selected.record)}</dd><dt>Captured</dt><dd>{capturedAt(selected.record)}</dd><dt>Source SHA-256</dt><dd>{selected.record.provenance.map(item => item.source_sha256).filter(Boolean).join('; ') || 'Not supplied'}</dd><dt>Rights</dt><dd>{selected.record.rights || 'Not supplied'}</dd></dl>
                  {#if sourceLink && new URL(sourceLink).protocol === 'https:' && /\.pdf(?:#|$)/i.test(sourceLink)}
                    <iframe title={`Original PDF for ${selected.record.label}`} src={sourceLink} sandbox="allow-scripts allow-downloads" referrerpolicy="no-referrer" loading="lazy"></iframe>
                    <p><a href={sourceLink} target="_blank" rel="noopener noreferrer">Open PDF in a new tab if the embedded viewer is unavailable</a></p>
                  {/if}
                  <p class="note">PDF page navigation uses the recorded locator. Text offsets do not identify pixels in the PDF.</p>
                {:else}<p>Select a record to inspect its source.</p>{/if}
              {:else if tab === 'extraction'}
                {#if selected}
                  <h4>Extracted text and structure</h4>
                  <p>This text is a machine extraction. Its boundary and page position remain separate from the original document.</p>
                  {#if selected.record.evidence_unit}
                    <dl class="facts"><dt>Unit kind</dt><dd>{selected.record.evidence_unit.kind}</dd><dt>Boundary</dt><dd>{selected.record.evidence_unit.boundary_status}</dd><dt>Completeness</dt><dd>{selected.record.evidence_unit.completeness}</dd><dt>Offset unit</dt><dd>{selected.record.evidence_unit.offset_unit}</dd></dl>
                    <h5>Ordered source spans</h5>
                    <ol>{#each selected.record.evidence_unit.spans as span}<li><strong>{span.locator}</strong> · source text bytes {span.source_start}–{span.source_end}; passage bytes {span.unit_start}–{span.unit_end}.<br />Extraction SHA-256: <code>{span.extraction_sha256}</code>{#if isHttpUrl(span.extraction_url)} · <a href={span.extraction_url} target="_blank" rel="noopener noreferrer">Open extraction file ↗</a>{/if}{#if unitSpanText(selected.record, span.unit_start, span.unit_end)}<pre>{unitSpanText(selected.record, span.unit_start, span.unit_end)}</pre>{:else}<p>Span text could not be displayed from the declared passage offsets.</p>{/if}</li>{/each}</ol>
                  {:else}<p>No logical passage boundary was supplied for this record.</p>{/if}
                  <pre>{selected.record.text}</pre>
                  <details><summary>Record machine data</summary><pre>{JSON.stringify(selected.record, null, 2)}</pre></details>
                {:else}<p>Select a record to inspect extracted text.</p>{/if}
              {:else if tab === 'passage'}
                {#if selected}<h4>Complete logical passage</h4><p>{selected.record.evidence_unit ? `${selected.record.evidence_unit.kind}; ${selected.record.evidence_unit.completeness}.` : 'No declared logical passage boundary. This is record text only.'}</p><pre>{selected.record.text}</pre><p class="note">Read the full passage with its dependencies and the original source before drawing a conclusion.</p>{:else}<p>No passage was selected.</p>{/if}
              {:else if tab === 'ontology'}
                <h4>Concepts and relationships</h4><p>These are declared or derived connections for navigation. Their status and authority do not inherit from a source mention.</p>
                <h5>Concepts resolved for this question</h5><ul>{#each context.resolved_concepts as concept}<li><strong>{concept.label}</strong> — matched “{concept.matched.join(', ')}” by {concept.method}</li>{:else}<li>No concept was resolved.</li>{/each}</ul>
                {#if context.ambiguities.length}<h5>Ambiguous concepts</h5><ul>{#each context.ambiguities as ambiguity}<li>{ambiguity.phrase}: {ambiguity.candidates.map(recordLabel).join('; ')}</li>{/each}</ul>{/if}
                <h5>Directed relationships</h5><ul>{#each context.relationships.filter(row => !selected || row.source === selected.record.id || row.target === selected.record.id) as relationship}<li><strong>{recordLabel(relationship.source)}</strong> → {relationship.label} → <strong>{recordLabel(relationship.target)}</strong><br /><small>{relationship.assertion_status} · {relationship.authority?.label || 'Authority not supplied'} · {relationship.scope}</small></li>{:else}<li>No relationships are shown for this record.</li>{/each}</ul>
              {:else if tab === 'definitions'}
                <h4>Definitions, exceptions and dependencies</h4>
                <h5>Defined and qualifying passages in this package</h5>
                <ul>{#each records.filter(item => ['definition', 'exception', 'cross-reference'].includes(item.record.evidence_unit?.kind || '')) as item}<li><a href={link(selectedCase.id, item.record.id, 'passage')} onclick={(event) => chooseRecordTab(event, item, 'passage')}>{item.record.label}</a> — {item.record.evidence_unit?.kind}; {item.record.evidence_unit?.completeness}</li>{:else}<li>No definition, exception or cross-reference unit was selected for this question.</li>{/each}</ul>
                {#if selected}
                  <p><strong>Selected unit:</strong> {selected.record.evidence_unit?.kind || 'Unclassified'}. {selected.record.scope}</p>
                  <h5>Why this record was included</h5><ul>{#each selected.reasons as reason}<li>{reason}</li>{:else}<li>No inclusion reason supplied.</li>{/each}</ul>
                  <h5>Dependencies and routes</h5><ul>{#each selected.paths as path}<li>{path.records.map(recordLabel).join(' → ') || 'No path supplied'}</li>{:else}<li>No dependency route supplied.</li>{/each}</ul>
                {/if}
                <h5>Declared requirements</h5><ul>{#each context.requirements as requirement}<li><strong>{requirement.label}</strong> — {requirement.status}. {requirement.scope}{#if requirement.missing.length}<br />Missing: {requirement.missing.map(recordLabel).join('; ')}{/if}{#if requirement.limitations?.length}<br />Limits: {requirement.limitations.join('; ')}{/if}</li>{:else}<li>No applicable requirements declared.</li>{/each}</ul>
              {:else if tab === 'trace'}
                <h4>Question retrieval trace</h4>
                <p>Selected records show what reached this package. Missing evidence and bounded discovery remain visible even when a record is selected.</p>
                {#if context.retrieval}<dl class="facts"><dt>Method</dt><dd>{context.retrieval.method}</dd><dt>Records searched</dt><dd>{context.retrieval.corpus_records}</dd><dt>Candidates</dt><dd>{context.retrieval.candidate_count}</dd><dt>Query words</dt><dd>{context.retrieval.query_tokens.join(', ') || 'None'}</dd><dt>Fetches</dt><dd>{context.retrieval.fetched_files} files, {context.retrieval.fetched_bytes} bytes</dd><dt>Truncated</dt><dd>{context.retrieval.truncated ? 'Yes' : 'No'}</dd></dl><details><summary>Ranked candidates</summary><ol>{#each context.retrieval.candidates as candidate}<li>{recordLabel(candidate.id)} · score {candidate.score} · matched {candidate.matched.join(', ')}</li>{/each}</ol></details>{:else}<p>No lexical retrieval trace was supplied.</p>{/if}
                <h5>Missing evidence, conflicts and omissions</h5><ul>{#each [...context.missing_evidence, ...context.conflicts, ...context.budget.omissions, ...(context.retrieval?.omissions || [])] as issue}<li><strong>{issue.code}</strong>: {issue.message}{#if issue.ids?.length} ({issue.ids.map(recordLabel).join('; ')}){/if}</li>{:else}<li>No gaps recorded in this package.</li>{/each}</ul>
                <h5>Package limits</h5><p>{context.budget.used_nodes} of {context.budget.max_nodes} records; {context.budget.used_relationships} of {context.budget.max_relationships} relationships; {context.budget.used_bytes} of {context.budget.max_bytes} bytes. {context.budget.truncated ? 'Assembly was truncated.' : 'No budget truncation recorded.'}</p>
                {#if context.limitations.length}<h5>Limitations</h5><ul>{#each context.limitations as limitation}<li>{limitation}</li>{/each}</ul>{/if}
              {:else if tab === 'review'}
                <h4>Review and change proposal</h4><p>Write a local proposal for a specialist to assess. Downloading it does not edit the original document, extraction, semantic source or published package.</p>
                {#if selected}<form class="review-form" onsubmit={(event) => { event.preventDefault(); exportProposal(); }}><label for="review-status">Proposed review outcome</label><select id="review-status" bind:value={reviewStatus}><option value="needs-specialist-review">Needs specialist review</option><option value="boundary-correction">Passage boundary correction</option><option value="relationship-correction">Relationship correction</option><option value="source-check">Source or locator check</option><option value="no-change">No change proposed</option></select><label for="review-comment">Evidence and suggested change</label><textarea id="review-comment" bind:value={reviewComment} rows="8" maxlength="10000" required placeholder="Describe the issue, cite the source page and explain the proposed change."></textarea><button type="submit" disabled={!reviewComment.trim()}>Download review proposal</button></form>{#if reviewMessage}<p role="status">{reviewMessage}</p>{/if}{:else}<p>Select a record to propose a review.</p>{/if}
              {/if}
            </section>
          </div>
        {:else if !loading}<p>Select a question to inspect its evidence.</p>{/if}
      </main>
    </div>
  {:else if !loading}<main id="evidence-main"><h2>Open an evidence review</h2><p>Enter the URL of a published evidence workbench manifest above to inspect its questions, source records and review gaps. The DWP exemplar uses the suggested URL already in the field.</p></main>{/if}
</div>

<style>
  :global(body) { margin: 0; color: #17212e; background: #f3f6f8; font: 16px/1.5 system-ui, sans-serif; }
  :global(*) { box-sizing: border-box; }
  :global(:focus-visible) { outline: 3px solid #ffdd00; outline-offset: 2px; }
  :global(.skip-link) { position: absolute; left: -9999px; top: .4rem; z-index: 10; padding: .5rem; background: white; }
  :global(.skip-link:focus) { left: .4rem; }
  a { color: #075aa6; }
  button, input, select, textarea { font: inherit; border: 1px solid #8296a8; border-radius: .25rem; padding: .45rem .6rem; }
  button { background: #075aa6; color: white; cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .masthead { display: flex; justify-content: space-between; gap: 2rem; align-items: end; padding: 1.2rem 1.5rem; background: #163b5e; color: white; }
  .masthead a { color: white; }
  h1, h2, h3, h4, h5 { line-height: 1.2; }
  h1 { margin: .2rem 0; font-size: 1.75rem; }
  h2 { font-size: 1.35rem; }
  h3 { font-size: 1.2rem; }
  h4 { font-size: 1.1rem; margin-top: 1.3rem; }
  .masthead p { margin: .2rem 0; }
  .masthead form { width: min(34rem, 100%); }
  .masthead form div { display: flex; gap: .4rem; }
  .masthead input { width: 100%; min-width: 0; }
  .masthead label, .cases label, .review-form label { display: block; font-weight: 700; }
  .columns { display: grid; grid-template-columns: minmax(15rem, 21rem) minmax(0, 1fr); min-height: calc(100dvh - 8rem); }
  .cases { background: #e5edf4; padding: 1rem; border-right: 1px solid #bccdd9; }
  .cases p { color: #425669; }
  .cases input { width: 100%; margin: .3rem 0 .8rem; }
  .cases nav, .record-list nav { display: grid; gap: .3rem; max-height: 65dvh; overflow-y: auto; }
  .cases nav a, .record-list nav a { display: grid; gap: .2rem; padding: .55rem; text-decoration: none; border: 1px solid transparent; border-radius: .3rem; background: white; }
  .cases nav a.current, .record-list nav a.current { border-color: #075aa6; background: #eaf4ff; box-shadow: inset 4px 0 #075aa6; }
  .cases nav small, .record-list nav small { color: #425669; }
  main { min-width: 0; padding: 1rem 1.3rem 3rem; }
  .case-heading { background: white; padding: 1rem; border: 1px solid #c4d0db; border-radius: .3rem; }
  .case-heading h2, .case-heading p { margin: .35rem 0; }
  .review-brief { margin-top: 1rem; padding: 1rem; background: #fff; border: 1px solid #c4d0db; border-radius: .3rem; }
  .review-brief h3 { margin-top: 0; }
  .identity { overflow-wrap: anywhere; color: #526477; font-size: .8rem; }
  .eyebrow { color: #526477; text-transform: uppercase; font-size: .75rem; font-weight: 800; letter-spacing: .06em; }
  .record-layout { display: grid; grid-template-columns: minmax(12rem, 17rem) minmax(0, 1fr); gap: 1rem; margin-top: 1rem; }
  .record-list, .inspector { background: white; border: 1px solid #c4d0db; border-radius: .3rem; padding: 1rem; min-width: 0; }
  .record-list h3 { margin-top: 0; }
  .inspector header h3 { margin: .15rem 0; }
  .inspector header p { margin: .2rem 0; }
  .tab-list { display: flex; flex-wrap: wrap; border-bottom: 1px solid #b6c6d4; margin: 1rem 0; gap: .15rem; }
  .tab-list a { padding: .55rem .65rem; text-decoration: none; border-radius: .3rem .3rem 0 0; }
  .tab-list a.active { background: #075aa6; color: white; }
  .facts { display: grid; grid-template-columns: minmax(9rem, 14rem) minmax(0, 1fr); gap: .5rem 1rem; }
  .facts dt { font-weight: 700; }
  .facts dd { margin: 0; overflow-wrap: anywhere; }
  pre { background: #f2f5f7; border: 1px solid #d0dce4; padding: 1rem; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 55dvh; overflow: auto; }
  code { overflow-wrap: anywhere; }
  iframe { width: 100%; height: 60dvh; border: 1px solid #a9bdce; }
  .note { padding: .65rem; background: #f0f5fa; border-left: 4px solid #075aa6; }
  .primary-link { display: inline-block; padding: .55rem .8rem; background: #075aa6; color: white; font-weight: 700; }
  li { margin-bottom: .45rem; overflow-wrap: anywhere; }
  .review-form { display: grid; gap: .5rem; max-width: 44rem; }
  .review-form button { justify-self: start; }
  .alert { margin: 1rem; padding: 1rem; border: 2px solid #aa2929; background: #fff4f3; }
  .busy { padding: 1rem; }
  @media (max-width: 1000px) { .columns, .record-layout { grid-template-columns: 1fr; } .cases nav, .record-list nav { max-height: 15rem; } }
  @media (max-width: 650px) { .masthead { display: block; } .masthead form { margin-top: 1rem; } .facts { grid-template-columns: 1fr; } }
</style>
