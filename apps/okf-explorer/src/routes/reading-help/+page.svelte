<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { loadReadingHelp, parts, type Loaded, type Occurrence, type Passage } from '$lib/evidence/readingHelp';

  let input = $state('');
  let loaded = $state<Loaded | null>(null);
  let selectedId = $state('');
  let selectedOccurrence = $state<Occurrence | null>(null);
  let loading = $state(false);
  let error = $state('');
  let controller: AbortController | null = null;
  let opener: HTMLButtonElement | null = null;
  const passage = $derived(loaded?.manifest.passages.find(row => row.id === selectedId) ?? null);
  const cards = $derived(selectedOccurrence ? loaded?.manifest.cards.filter(card => card.occurrence_ids.includes(selectedOccurrence?.id ?? '')) ?? [] : []);

  async function open(raw: string) {
    controller?.abort();
    const request = new AbortController(); controller = request;
    loading = true; error = ''; loaded = null; selectedOccurrence = null;
    try {
      const next = await loadReadingHelp(raw, window.location.href, request.signal);
      if (controller !== request || request.signal.aborted) return;
      loaded = next; input = next.url.href;
      const wanted = new URLSearchParams(window.location.search).get('passage');
      selectedId = next.manifest.passages.find(row => row.id === wanted)?.id ?? next.manifest.passages[0].id;
      const params = new URLSearchParams({ manifest: next.url.href, passage: selectedId });
      history.replaceState({}, '', `${window.location.pathname}?${params}`);
    } catch (cause) { if (controller === request && !request.signal.aborted) error = cause instanceof Error ? cause.message : String(cause); }
    finally { if (controller === request) loading = false; }
  }
  function selectPassage(row: Passage) {
    selectedId = row.id; selectedOccurrence = null;
    if (loaded) history.replaceState({}, '', `${window.location.pathname}?${new URLSearchParams({ manifest: loaded.url.href, passage: row.id })}`);
  }
  function selectOccurrence(row: Occurrence, button: HTMLButtonElement) {
    selectedOccurrence = row; opener = button;
    if (window.matchMedia('(max-width: 1050px)').matches) requestAnimationFrame(() => document.getElementById('reading-help-panel')?.scrollIntoView({ block: 'start' }));
  }
  function closeCard() { selectedOccurrence = null; opener?.focus(); opener = null; }
  function sourceLink(sourceId: string, page: number) {
    const source = loaded?.manifest.sources.find(row => row.id === sourceId);
    return source ? `${source.pdf_url}#page=${page}` : '';
  }
  function roleLabel(role: string) { return ({ abbreviation: 'Abbreviation', source_marker: 'Source reference', word: 'Reading explanation', manual_pointer: 'Manual reference', unresolved_reference_marker: 'Unclear source reference' } as Record<string, string>)[role] ?? 'Reading help'; }
  function kindLabel(kind: string) { return ({ expansion: 'Abbreviation', source_definition_pointer: 'Meaning and source', model_explanation: 'Reading explanation', citation_navigation: 'Source reference', unresolved_reference: 'Unclear source reference' } as Record<string, string>)[kind] ?? 'Reading help'; }
  async function goToTarget(id: string) {
    const found = loaded?.manifest.passages.find(row => row.id === id);
    if (!found) return;
    selectPassage(found);
    await tick();
    const heading = document.getElementById('passage-heading');
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start' });
  }
  onMount(() => {
    const raw = new URLSearchParams(window.location.search).get('manifest');
    if (raw) void open(raw);
    return () => controller?.abort();
  });
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape' && selectedOccurrence) closeCard(); }} />
<svelte:head><title>Reading help | OKF Explorer</title><meta name="description" content="Inspect exact source passages with occurrence-scoped reading help." /></svelte:head>
<div class="shell">
  <header><p><a href="../evidence/">← Evidence workbench</a></p><h1>Reading help</h1><p>Read the source wording, then select an underlined term or reference for help. This independent demonstration does not give official guidance or individual advice.</p></header>
  <form class="loader" onsubmit={(event) => { event.preventDefault(); void open(input); }}>
    <label for="manifest">Reading-help manifest URL</label><input id="manifest" type="url" bind:value={input} placeholder="https://…/reading-help-ch60.json" required /><button type="submit">Load</button>
  </form>
  {#if loading}<p role="status">Checking manifest and frozen source pages…</p>{/if}
  {#if error}<p role="alert" class="error">{error}</p>{/if}
  {#if loaded}
    <p>{loaded.manifest.scope}. Explanations are project-authored and unreviewed.</p>
    <div class="layout">
      <nav aria-label="Source passages"><h2>Source passages</h2><ol>{#each loaded.manifest.passages as row}<li><button type="button" class:current={row.id === selectedId} aria-current={row.id === selectedId ? 'page' : undefined} onclick={() => selectPassage(row)}>{row.label}</button></li>{/each}</ol></nav>
      <main>
        {#if passage}
          <h2 id="passage-heading" tabindex="-1">{passage.label}</h2><p>This is the frozen machine extraction. Its wording and page boundaries are unchanged. Select an underlined occurrence to read help beside it.</p>
          <div class="reading-grid"><div class="source-column">{#each passage.spans as span}
            <section class="source-page" aria-label={`Source page ${span.page}`}><h3>Source PDF page {span.page}</h3><p><a href={sourceLink(passage.source_id, span.page)} target="_blank" rel="noopener noreferrer">Open the source PDF at page {span.page}</a></p>
              <pre class="source-text">{#each parts(loaded, passage, span) as part}{#if part.occurrence && loaded.manifest.cards.some(card => card.occurrence_ids.includes(part.occurrence!.id))}<button type="button" class="term" aria-label={`${roleLabel(part.occurrence.role)}: ${part.text}. Read help`} aria-expanded={selectedOccurrence?.id === part.occurrence.id} aria-controls="reading-help-panel" onclick={(event) => selectOccurrence(part.occurrence!, event.currentTarget)}>{part.text}</button>{:else}{part.text}{/if}{/each}</pre>
              <details class="source-details"><summary>Source text identity</summary><p>Page {span.page}, UTF-8 bytes {span.page_start_utf8}–{span.page_end_utf8}; SHA-256 {span.literal_sha256}.</p></details>
            </section>
          {/each}</div>
          <section class="help" id="reading-help-panel" aria-live="polite"><h3>Reading help</h3>
            {#if selectedOccurrence}
              <p><strong>{selectedOccurrence.literal}</strong> · {roleLabel(selectedOccurrence.role)} · source PDF page {selectedOccurrence.page}</p>
              <button type="button" onclick={closeCard}>Close reading help</button>
              {#each cards as card}<article><p class="eyebrow">{kindLabel(card.kind)}</p><h4>{card.title}</h4><p>{card.body}</p><p class="small">Project reading help · {card.review_status}. The source quotations below are reproduced separately.</p>
                {#if card.target.status === 'unresolved'}<p class="unresolved"><strong>Not established here:</strong> {card.target.label}. The cited destination text has not been checked here.</p>{:else if card.target.id}<p><button type="button" onclick={() => goToTarget(card.target.id!)}>Read {card.target.label}</button></p>{:else if card.target.url}<p><a href={card.target.url} target="_blank" rel="noopener noreferrer">{card.target.label}</a></p>{/if}
                <details><summary>Show exact source support</summary><ul>{#each card.source_support as support}<li><a href={sourceLink(support.source_id, support.page)} target="_blank" rel="noopener noreferrer">{support.source_id}, PDF page {support.page}</a>: <q>{support.quote}</q></li>{/each}</ul><p class="small">Authority: {card.authority}. Proposal IDs: {card.proposal_ids.join(', ') || 'None'}.</p></details>
              </article>{/each}
            {:else}<p>Select an underlined source occurrence. Help appears here without changing the passage text.</p>{/if}
          </section></div>
        {/if}
      </main>
    </div>
    <details><summary>About these sources and limits</summary><ul>{#each loaded.manifest.limitations as limit}<li>{limit}</li>{/each}</ul><p>Source page JSON and every displayed span, occurrence and support quotation were checked against their declared SHA-256. The linked PDF is the source-declared URL; this view has not checked the downloaded PDF bytes. Reading help does not establish current legal applicability or decide entitlement.</p><p>Manifest SHA-256: {loaded.sha256}.</p></details>
  {:else if !loading}<section><h2>Open a reading aid</h2><p>Supply the URL of a separately governed, versioned reading-help manifest. This generic view does not select words or meanings automatically.</p></section>{/if}
</div>
<style>
  :global(body){margin:0;font-family:system-ui,sans-serif;color:#173047;background:#f7fafc} :global(* ){box-sizing:border-box}
  .shell{max-width:1400px;margin:auto;padding:1rem 1.5rem 4rem} h1{margin:.25rem 0} h2,h3,h4{line-height:1.2} a{color:#145a91} button,input{font:inherit} button{cursor:pointer;border:1px solid #315a72;border-radius:4px;background:#fff;padding:.45rem .7rem;color:#173047} button:hover,.current{background:#d9edf7} button:focus-visible,input:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #e68720;outline-offset:2px} label{display:block;font-weight:700;margin:.6rem 0 .25rem} input{border:1px solid #708b9c;border-radius:3px;padding:.45rem;background:#fff;color:#173047;max-width:100%}.loader{display:flex;align-items:end;gap:.6rem;flex-wrap:wrap;margin:1.2rem 0}.loader label{width:100%;margin:0}.loader input{width:min(100%,45rem)}.layout{display:grid;grid-template-columns:minmax(12rem,12rem) minmax(0,1fr);gap:1.5rem}.layout nav{border:1px solid #ccd7de;padding:1rem;align-self:start;background:#fff}.layout nav ol{padding-left:1.3rem}.layout nav li{margin:.5rem 0}.layout nav button{text-align:left;width:100%}main,.source-column{min-width:0}.reading-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(18rem,22rem);gap:1rem;align-items:start}.source-page,.help,details{border:1px solid #ccd7de;background:#fff;padding:1rem;margin:1rem 0}.help{position:sticky;top:1rem;max-height:calc(100vh - 2rem);overflow:auto}.source-text{white-space:pre-wrap;overflow-wrap:anywhere;font:1rem/1.6 ui-monospace,monospace;background:#f0f4f6;padding:1rem;max-height:45rem;overflow:auto}.term{display:inline;border:0;border-bottom:2px dotted #005a9c;border-radius:0;background:#e8f3fa;padding:0 .05rem;color:#003a69;font:inherit;white-space:inherit}.term:hover,.term[aria-expanded=true]{background:#ffdd00}.help article{border-top:1px solid #ccd7de;margin-top:1rem;padding-top:1rem}.help q{white-space:pre-wrap}.small{font-size:.9rem;overflow-wrap:anywhere}.eyebrow{font-weight:700;color:#005a9c}.unresolved{border-left:4px solid #b86c00;padding:.5rem;background:#fff6e8}.error{border-left:4px solid #b12b2b;padding:.8rem;background:#fff1f0}.source-details{padding:.5rem}@media(max-width:1050px){.reading-grid{grid-template-columns:1fr}.help{position:static;max-height:none}}@media(max-width:850px){.layout{grid-template-columns:1fr}.layout nav ol{display:flex;flex-wrap:wrap;gap:.5rem;padding:0;list-style:none}.layout nav li{margin:0}}
</style>
