<script lang="ts">
  import {
    formatBytes,
    isJsonContainer,
    jsonCollectionLabel,
    jsonEntries,
    jsonNodeMatches,
    jsonPath,
    jsonScalarText,
    sourceHostname,
    sourceSummary
  } from './sourceInspector';

  interface Props {
    data: unknown;
    url: string;
    loading: boolean;
    error: string;
    bytes: number;
    contentType: string;
    retrievedAt: string;
    recordLabel: string;
    onclose: () => void;
  }

  let { data, url, loading, error, bytes, contentType, retrievedAt, recordLabel, onclose }: Props = $props();
  let mode = $state<'summary' | 'tree' | 'raw'>('summary');
  let query = $state('');
  let wrapRaw = $state(true);
  let copied = $state('');

  const summary = $derived(sourceSummary(data, recordLabel));
  const rawText = $derived(data === null || data === undefined ? '' : JSON.stringify(data, null, 2));

  async function copyText(value: string, label: string) {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    copied = label;
    window.setTimeout(() => {
      if (copied === label) copied = '';
    }, 1800);
  }
</script>

{#snippet renderJsonNode(value: unknown, key: string, path: string, depth: number)}
  {#if isJsonContainer(value)}
    <details class="tree-branch" open={depth < 1 || Boolean(query.trim())}>
      <summary><span class="tree-key">{key}</span> <span class="tree-count">{jsonCollectionLabel(value)}</span></summary>
      <div class="tree-children">
        {#each jsonEntries(value) as [childKey, childValue]}
          {@const childPath = jsonPath(path, childKey)}
          {#if jsonNodeMatches(childKey, childValue, childPath, query)}
            {@render renderJsonNode(childValue, childKey, childPath, depth + 1)}
          {/if}
        {/each}
      </div>
    </details>
  {:else}
    <div class="tree-leaf">
      <span class="tree-key">{key}</span><span aria-hidden="true">:</span>
      <span class:string-value={typeof value === 'string'}>{jsonScalarText(value)}</span>
      <span class="leaf-actions">
        <button type="button" title={`Copy ${path}`} onclick={() => void copyText(jsonScalarText(value), 'Value copied')}>Copy value</button>
        <button type="button" title={`Copy path ${path}`} onclick={() => void copyText(path, 'Path copied')}>Copy path</button>
      </span>
    </div>
  {/if}
{/snippet}

<section class="source-inspector" aria-labelledby="source-inspector-title">
  <header class="source-header">
    <div>
      <p class="eyebrow">External source response</p>
      <h2 id="source-inspector-title">Source data</h2>
      <p class="record-label">{recordLabel}</p>
    </div>
    <div class="source-actions">
      <button type="button" onclick={onclose}>← Back to record</button>
      <a class="button" href={url} target="_blank" rel="noopener noreferrer">Open raw JSON ↗</a>
    </div>
  </header>

  <p class="source-note">This response is loaded directly from <strong>{sourceHostname(url)}</strong>. Explorer renders it as text and does not alter the bundle’s normalized record.</p>

  {#if loading}
    <div class="source-status" role="status"><span class="spinner" aria-hidden="true"></span>Loading source data…</div>
  {:else if error}
    <div class="source-error" role="alert">
      <h3>Explorer could not display this source response</h3>
      <p>{error}</p>
      <p>The endpoint may block browser requests, be unavailable, or exceed Explorer’s 10 MB display limit.</p>
      <a class="button" href={url} target="_blank" rel="noopener noreferrer">Open raw JSON in a new tab ↗</a>
    </div>
  {:else if data !== null && data !== undefined}
    <dl class="response-meta">
      <div><dt>Host</dt><dd>{sourceHostname(url)}</dd></div>
      <div><dt>Response</dt><dd>{contentType || 'application/json'}</dd></div>
      <div><dt>Size</dt><dd>{formatBytes(bytes)}</dd></div>
      <div><dt>Retrieved</dt><dd>{retrievedAt ? new Date(retrievedAt).toLocaleString() : 'Just now'}</dd></div>
    </dl>

    <nav class="source-tabs" aria-label="Source data view">
      <button type="button" class:active={mode === 'summary'} aria-pressed={mode === 'summary'} onclick={() => (mode = 'summary')}>Summary</button>
      <button type="button" class:active={mode === 'tree'} aria-pressed={mode === 'tree'} onclick={() => (mode = 'tree')}>JSON tree</button>
      <button type="button" class:active={mode === 'raw'} aria-pressed={mode === 'raw'} onclick={() => (mode = 'raw')}>Raw JSON</button>
    </nav>

    {#if copied}<p class="copy-status" role="status">{copied}</p>{/if}

    {#if mode === 'summary'}
      <article class="source-summary">
        <h3>{summary.title}</h3>
        {#if summary.description}<p>{summary.description}</p>{/if}
        {#if summary.rows.length}
          <dl>
            {#each summary.rows as row}<dt>{row.label}</dt><dd>{row.value}</dd>{/each}
          </dl>
        {/if}
        {#if summary.tags.length}
          <div class="source-tags" aria-label="Source tags">
            {#each summary.tags as tag}<span>{tag}</span>{/each}
          </div>
        {/if}
        <p class="summary-guidance">Use JSON tree to inspect individual fields, or Raw JSON when you need the complete machine response.</p>
      </article>
    {:else if mode === 'tree'}
      <section class="tree-panel" aria-label="Searchable JSON tree">
        <div class="tree-tools">
          <label>Find a field or value <input type="search" bind:value={query} placeholder="publisher, licence, resource…" /></label>
          {#if query}<button type="button" onclick={() => (query = '')}>Clear</button>{/if}
          <button type="button" onclick={() => void copyText(rawText, 'JSON copied')}>Copy all JSON</button>
        </div>
        {#if jsonNodeMatches('$', data, '$', query)}
          <div class="json-tree">{@render renderJsonNode(data, '$', '$', 0)}</div>
        {:else}
          <p class="empty">No JSON fields or values match “{query}”.</p>
        {/if}
      </section>
    {:else}
      <section class="raw-panel" aria-label="Raw JSON source">
        <div class="raw-tools">
          <button type="button" aria-pressed={wrapRaw} onclick={() => (wrapRaw = !wrapRaw)}>{wrapRaw ? 'Disable line wrapping' : 'Wrap long lines'}</button>
          <button type="button" onclick={() => void copyText(rawText, 'JSON copied')}>Copy all JSON</button>
        </div>
        <pre class:wrap={wrapRaw}>{rawText}</pre>
      </section>
    {/if}
  {/if}
</section>

<style>
  .source-inspector { height: 100%; overflow: auto; padding: 1.1rem 1.25rem 2rem; background: #f7f9fc; color: #17212e; }
  .source-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .source-header h2 { margin: 0; font-size: 1.65rem; }
  .eyebrow { margin: 0 0 .25rem; color: #52667c; font-size: .75rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
  .record-label { margin: .3rem 0 0; color: #52667c; }
  .source-actions, .tree-tools, .raw-tools { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }
  button, .button { border: 1px solid #aebdce; border-radius: .5rem; background: #fff; color: #17212e; padding: .55rem .75rem; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
  button:hover, .button:hover { border-color: #1473d2; }
  .source-note { border-left: .25rem solid #1473d2; margin: 1rem 0; padding: .65rem .8rem; background: #edf5ff; color: #385069; }
  .source-status, .source-error { border: 1px solid #cbd6e2; border-radius: .65rem; padding: 1rem; background: #fff; }
  .source-status { display: flex; align-items: center; gap: .6rem; }
  .source-error { border-color: #d69a98; background: #fff7f6; }
  .source-error h3 { margin-top: 0; }
  .spinner { width: 1rem; height: 1rem; border: .15rem solid #b9cce0; border-top-color: #1473d2; border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .response-meta { display: grid; grid-template-columns: repeat(4, minmax(9rem, 1fr)); gap: .6rem; margin: 1rem 0; }
  .response-meta div { border: 1px solid #d4dde7; border-radius: .55rem; padding: .65rem .75rem; background: #fff; min-width: 0; }
  .response-meta dt { color: #5a6e83; font-size: .75rem; font-weight: 800; text-transform: uppercase; }
  .response-meta dd { margin: .2rem 0 0; overflow-wrap: anywhere; }
  .source-tabs { display: flex; gap: .25rem; border-bottom: 1px solid #bdcbd9; margin: 1rem 0; }
  .source-tabs button { border: 0; border-radius: .45rem .45rem 0 0; background: transparent; }
  .source-tabs button.active { background: #116dcc; color: #fff; }
  .copy-status { position: sticky; top: .5rem; z-index: 2; float: right; margin: 0; border-radius: 1rem; background: #173b63; color: #fff; padding: .35rem .65rem; }
  .source-summary, .tree-panel, .raw-panel { border: 1px solid #cbd6e2; border-radius: .65rem; padding: 1rem; background: #fff; }
  .source-summary h3 { margin-top: 0; font-size: 1.35rem; }
  .source-summary > p { max-width: 80rem; line-height: 1.55; }
  .source-summary dl { display: grid; grid-template-columns: minmax(8rem, 13rem) 1fr; gap: .6rem 1rem; border-top: 1px solid #dce4ec; padding-top: 1rem; }
  .source-summary dt { font-weight: 800; }
  .source-summary dd { margin: 0; overflow-wrap: anywhere; }
  .source-tags { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: 1rem; }
  .source-tags span { border-radius: 1rem; background: #e8f1fb; padding: .35rem .6rem; }
  .summary-guidance { color: #52667c; font-size: .9rem; }
  .tree-tools { justify-content: flex-end; margin-bottom: .75rem; }
  .tree-tools label { display: flex; align-items: center; gap: .5rem; margin-right: auto; font-weight: 700; }
  .tree-tools input { min-width: min(25rem, 46vw); border: 1px solid #aebdce; border-radius: .4rem; padding: .5rem .6rem; font: inherit; }
  .json-tree { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .88rem; }
  .tree-branch { margin: .18rem 0; }
  .tree-branch > summary { cursor: pointer; padding: .2rem; }
  .tree-children { border-left: 1px solid #c7d4e1; margin-left: .55rem; padding-left: .85rem; }
  .tree-key { color: #174e87; font-weight: 700; overflow-wrap: anywhere; }
  .tree-count { color: #6c7d8f; }
  .tree-leaf { display: flex; align-items: flex-start; gap: .4rem; min-width: 0; padding: .22rem .15rem; overflow-wrap: anywhere; }
  .tree-leaf .string-value { color: #7a3216; }
  .leaf-actions { display: inline-flex; gap: .25rem; margin-left: auto; opacity: 0; }
  .tree-leaf:hover .leaf-actions, .tree-leaf:focus-within .leaf-actions { opacity: 1; }
  .leaf-actions button { padding: .15rem .35rem; font-size: .72rem; white-space: nowrap; }
  .raw-tools { justify-content: flex-end; margin-bottom: .65rem; }
  .raw-panel pre { max-height: 62vh; overflow: auto; margin: 0; border-radius: .45rem; background: #111b27; color: #edf5ff; padding: 1rem; font-size: .82rem; }
  .raw-panel pre.wrap { white-space: pre-wrap; overflow-wrap: anywhere; }
  .empty { color: #52667c; }
  @media (max-width: 800px) {
    .source-header { flex-direction: column; }
    .response-meta { grid-template-columns: 1fr 1fr; }
    .tree-tools label { width: 100%; flex-direction: column; align-items: stretch; }
    .tree-tools input { min-width: 0; width: 100%; box-sizing: border-box; }
    .source-summary dl { grid-template-columns: 1fr; }
  }
</style>
