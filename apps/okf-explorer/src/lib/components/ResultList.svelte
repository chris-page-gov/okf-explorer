<script lang="ts">
  export type ResultItem = { id: string; route: string; title: string; description: string; type: string; metadata?: string; reason?: string; highlighted?: boolean; canonicalUrl?: string };
  let { items, selected = '', layout = $bindable('cards'), query = '', busy = false, onselect, oninspect, emptyMessage = 'No records match. Clear a highlight, undo a keep step or change your search.' }:
    { items: ResultItem[]; selected?: string; layout?: 'cards' | 'list'; query?: string; busy?: boolean;
      onselect: (route: string) => void; oninspect?: (route: string) => void; emptyMessage?: string } = $props();
</script>

<section class="results-surface">
  <div class="results-layout" aria-label="Result layout"><button aria-pressed={layout === 'cards'} onclick={() => layout = 'cards'}>Cards</button><button aria-pressed={layout === 'list'} onclick={() => layout = 'list'}>List</button><span>{items.length.toLocaleString('en-GB')} shown</span></div>
  <div class="result-list" class:cards={layout === 'cards'} aria-busy={busy} data-okf-ranked-results="primary" data-okf-query={query} data-okf-search-state={busy ? 'searching' : 'settled'}>
    {#each items as item (item.route)}
      <article class="result-row" class:active={selected === item.route} class:highlighted={item.highlighted} data-okf-ranked-result data-result-canonical-url={item.canonicalUrl} data-highlighted={item.highlighted || undefined}>
        <button class="result-open" aria-pressed={selected === item.route} onclick={() => onselect(item.route)}><span class="badge">{item.type}</span><h2>{item.title}</h2>{#if item.metadata}<small>{item.metadata}</small>{/if}<p>{item.description}</p>{#if item.reason}<small>Why this matched: {item.reason}</small>{/if}</button>
        {#if oninspect}<button class="preview-record" onclick={() => oninspect?.(item.route)} aria-label={`Preview ${item.title}`}>Preview</button>{/if}
      </article>
    {:else}<p class="empty-state" role="status">{busy ? 'Updating results…' : emptyMessage}</p>{/each}
  </div>
</section>

<style>
  .results-surface { padding:14px; min-height:0; } .results-layout { display:flex; gap:5px; align-items:center; margin-bottom:10px; }
  .results-layout button { padding:5px 10px; } .results-layout [aria-pressed=true] { background:#005ea5; color:white; } .results-layout span { margin-left:auto; font-size:.8rem; }
  .result-list { display:grid; gap:10px; scroll-margin-top:60px; } .result-list.cards { grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr)); }
  .result-row { border:1px solid #a9b9cc; border-radius:7px; background:white; min-width:0; overflow:hidden; }
  .result-row.active { outline:3px solid #0068bc; outline-offset:-3px; } .result-row.highlighted { background:#fff9d8; border-left:6px solid #8c7000; }
  .result-open { display:block; width:100%; height:100%; border:0; border-radius:0; text-align:left; padding:14px; background:transparent; color:inherit; }
  h2 { font-size:1.15rem; margin:10px 0; } p { margin:10px 0; line-height:1.5; } small { color:#52677e; } .badge { font-size:.75rem; }
  .preview-record { margin:0 10px 10px; } .empty-state { grid-column:1/-1; }
</style>
