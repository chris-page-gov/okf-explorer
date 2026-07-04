<script lang="ts">
  import { onMount } from 'svelte';
  import type { BundleRegistryEntry, LoadedSource, NormalizedCorpus, OkfNode, SearchResultDoc, SearchSuggestion, ViewMode } from '$lib/types';
  import { LargeSearchClient } from '$lib/search/largeSearchClient';
  import { fetchJson, resolveUrl } from '$lib/sources/fetch';
  import { loadLargeCorpus } from '$lib/sources/largeCorpus';
  import { loadHistory, loadRegistry, rememberHistory } from '$lib/sources/registry';
  import { normalizeSmallBundle } from '$lib/sources/smallBundle';
  import './styles.css';

  const DEFAULT_BUNDLE = '../okf-bundle.json';
  const DEFAULT_REGISTRY = '../okf-registry.json';
  const VIEW_MODES: Array<{ id: ViewMode; label: string }> = [
    { id: 'reader', label: 'Reader' },
    { id: 'graph', label: 'Graph' },
    { id: 'links', label: 'Links' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'type', label: 'Type' }
  ];

  let bundleUrl = $state(DEFAULT_BUNDLE);
  let source = $state<LoadedSource | null>(null);
  let error = $state('');
  let loading = $state(false);
  let activeView = $state<ViewMode>('reader');
  let selectedId = $state('');
  let inspectedId = $state('');
  let smallQuery = $state('');
  let visibleTypes = $state(new Set<string>());
  let leftCollapsed = $state(false);
  let rightCollapsed = $state(false);
  let leftWidth = $state(320);
  let rightWidth = $state(420);
  let registry = $state<BundleRegistryEntry[]>([]);
  let history = $state<BundleRegistryEntry[]>([]);
  let suggestionsOpen = $state(false);
  let largeQuery = $state('');
  let largeResults = $state<SearchResultDoc[]>([]);
  let largeSuggestions = $state<SearchSuggestion[]>([]);
  let largeSelected = $state<SearchResultDoc | null>(null);
  let largeSearching = $state(false);
  let largeSearchClient = $state<LargeSearchClient | null>(null);
  let largeSearchRequest = 0;

  let smallCorpus = $derived(source?.kind === 'small' ? source.corpus : null);
  let nodeList = $derived(smallCorpus ? Object.values(smallCorpus.nodes) : []);
  let typeList = $derived([...new Set(nodeList.map((node) => node.type || 'Node'))].sort((a, b) => a.localeCompare(b)));
  let visibleNodes = $derived(
    nodeList.filter((node) => {
      const query = smallQuery.trim().toLowerCase();
      const type = node.type || 'Node';
      if (visibleTypes.size && !visibleTypes.has(type)) return false;
      if (!query) return true;
      return `${node.title} ${node.id} ${node.description || ''} ${node.summary || ''} ${(node.tags || []).join(' ')}`
        .toLowerCase()
        .includes(query);
    })
  );
  let selectedNode = $derived(smallCorpus && selectedId ? smallCorpus.nodes[selectedId] : null);
  let inspectedNode = $derived(smallCorpus && inspectedId ? smallCorpus.nodes[inspectedId] : null);
  let detailNode = $derived(inspectedNode || selectedNode);
  let visibleNodeIds = $derived(new Set(visibleNodes.map((node) => node.id)));
  let scopedRelationships = $derived(
    smallCorpus
      ? smallCorpus.relationships.filter((relationship) => visibleNodeIds.has(relationship.source) && visibleNodeIds.has(relationship.target))
      : []
  );
  let detailRelationships = $derived(
    smallCorpus && detailNode
      ? smallCorpus.relationships.filter((relationship) => relationship.source === detailNode.id || relationship.target === detailNode.id)
      : []
  );
  let bundleSuggestions = $derived(
    [...history, ...registry]
      .filter((entry) => entry.url && (!bundleUrl || `${entry.title || entry.label || ''} ${entry.url}`.toLowerCase().includes(bundleUrl.toLowerCase())))
      .slice(0, 10)
  );

  onMount(async () => {
    history = loadHistory();
    registry = await loadRegistry(DEFAULT_REGISTRY);
    bundleUrl = initialBundleUrl();
    await loadSource(bundleUrl);
  });

  function initialBundleUrl(): string {
    const params = new URLSearchParams(location.search);
    return params.get('bundle') || DEFAULT_BUNDLE;
  }

  function toAbsoluteUrl(url: string): string {
    return new URL(url, location.href).toString();
  }

  function syncBundleUrlParam(url: string) {
    const next = new URL(location.href);
    if (url === toAbsoluteUrl(DEFAULT_BUNDLE)) next.searchParams.delete('bundle');
    else next.searchParams.set('bundle', url);
    window.history.replaceState(null, '', next);
  }

  function smallBundleTitle(corpus: NormalizedCorpus): string {
    return corpus.title || 'OKF bundle';
  }

  async function loadSource(url: string) {
    const absoluteUrl = toAbsoluteUrl(url);
    loading = true;
    error = '';
    selectedId = '';
    inspectedId = '';
    largeSelected = null;
    largeResults = [];
    largeSuggestions = [];
    largeSearchClient?.destroy();
    largeSearchClient = null;
    try {
      const raw = await fetchJson<Record<string, unknown>>(absoluteUrl);
      if (raw.kind === 'okf-large-corpus') {
        const large = await loadLargeCorpus(absoluteUrl);
        source = large;
        const searchManifest = large.descriptor.entrypoints.search_manifest || large.manifest.indexes.search;
        if (searchManifest) {
          largeSearchClient = new LargeSearchClient();
          await largeSearchClient.init(large.baseUrl, resolveUrl(searchManifest, large.baseUrl));
        }
        history = rememberHistory({ url: absoluteUrl, title: large.descriptor.title, description: large.descriptor.description, kind: 'large-corpus' });
      } else {
        const corpus = normalizeSmallBundle(raw);
        source = { kind: 'small', url: absoluteUrl, title: smallBundleTitle(corpus), corpus };
        visibleTypes = new Set([...new Set(Object.values(corpus.nodes).map((node) => node.type || 'Node'))]);
        history = rememberHistory({ url: absoluteUrl, title: corpus.title, description: corpus.description, kind: 'bundle' });
        const first = Object.keys(corpus.nodes)[0];
        selectedId = first || '';
      }
      bundleUrl = absoluteUrl;
      syncBundleUrlParam(absoluteUrl);
      suggestionsOpen = false;
    } catch (err) {
      source = null;
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function loadFile(file: File | null) {
    if (!file) return;
    loading = true;
    error = '';
    try {
      const raw = JSON.parse(await file.text()) as Record<string, unknown>;
      if (raw.kind === 'okf-large-corpus') {
        throw new Error('Large-corpus descriptors need remote chunk URLs; publish the descriptor or load it by URL.');
      }
      const corpus = normalizeSmallBundle(raw);
      source = { kind: 'small', url: `file:${file.name}`, title: corpus.title, corpus };
      visibleTypes = new Set([...new Set(Object.values(corpus.nodes).map((node) => node.type || 'Node'))]);
      selectedId = Object.keys(corpus.nodes)[0] || '';
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function selectNode(id: string) {
    selectedId = id;
    inspectedId = '';
    activeView = activeView || 'reader';
    location.hash = id;
  }

  function inspectNode(id: string) {
    inspectedId = id;
    rightCollapsed = false;
  }

  function copyRoute() {
    const route = source?.kind === 'small' && detailNode ? `${location.origin}${location.pathname}${location.search}#${detailNode.id}` : location.href;
    void navigator.clipboard?.writeText(route);
  }

  function toggleType(type: string) {
    const next = new Set(visibleTypes);
    if (next.has(type) && next.size > 1) next.delete(type);
    else next.add(type);
    visibleTypes = next;
  }

  function resetTypes() {
    visibleTypes = new Set(typeList);
  }

  function keyboardActivate(event: KeyboardEvent, action: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  function relatedNodes(node: OkfNode) {
    if (!smallCorpus) return [];
    return detailRelationships
      .map((relationship) => (relationship.source === node.id ? relationship.target : relationship.source))
      .map((id) => smallCorpus.nodes[id])
      .filter(Boolean);
  }

  function graphPosition(index: number, count: number, radius: number, cx: number, cy: number) {
    if (count <= 1) return { x: cx, y: cy };
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  }

  function graphModel() {
    const nodes = selectedNode
      ? [selectedNode, ...relatedNodes(selectedNode)].filter((node, index, all) => all.findIndex((item) => item.id === node.id) === index)
      : visibleNodes.slice(0, 36);
    const ids = new Set(nodes.map((node) => node.id));
    return {
      nodes,
      relationships: smallCorpus?.relationships.filter((relationship) => ids.has(relationship.source) && ids.has(relationship.target)).slice(0, 80) || []
    };
  }

  function graphPositions(model: ReturnType<typeof graphModel>) {
    return new Map(
      model.nodes.map((node, index) => [
        node.id,
        graphPosition(index, model.nodes.length, selectedNode ? 210 : 250, 450, 310)
      ])
    );
  }

  async function runLargeSearch(query: string) {
    largeQuery = query;
    largeSelected = null;
    if (!largeSearchClient || !query.trim()) {
      largeResults = [];
      largeSuggestions = [];
      return;
    }
    const requestId = ++largeSearchRequest;
    largeSearching = true;
    await new Promise((resolve) => setTimeout(resolve, 160));
    if (requestId !== largeSearchRequest) return;
    try {
      const [results, suggestions] = await Promise.all([largeSearchClient.query(query), largeSearchClient.suggest(query)]);
      if (requestId !== largeSearchRequest) return;
      largeResults = results;
      largeSuggestions = suggestions;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      if (requestId === largeSearchRequest) largeSearching = false;
    }
  }

  function beginResize(side: 'left' | 'right', event: PointerEvent) {
    const startX = event.clientX;
    const startLeft = leftWidth;
    const startRight = rightWidth;
    const move = (next: PointerEvent) => {
      if (side === 'left') leftWidth = Math.max(220, Math.min(560, startLeft + next.clientX - startX));
      else rightWidth = Math.max(300, Math.min(680, startRight - (next.clientX - startX)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
</script>

<svelte:head>
  <title>OKF Explorer</title>
</svelte:head>

<div
  class:leftCollapsed={leftCollapsed}
  class:rightCollapsed={rightCollapsed}
  class="app"
  style={`--left-width:${leftWidth}px;--right-width:${rightWidth}px`}
>
  <header class="topbar">
    <div class="title-block">
      <h1>OKF Explorer</h1>
      <p>{source?.kind === 'large' ? source.descriptor.title : source?.kind === 'small' ? source.corpus.title : 'No bundle loaded'}</p>
    </div>
    <nav class="tabs" aria-label="Views">
      {#each VIEW_MODES as view}
        <button class:active={activeView === view.id} type="button" onclick={() => (activeView = view.id)}>{view.label}</button>
      {/each}
    </nav>
    <form class="bundle-form" onsubmit={(event) => { event.preventDefault(); void loadSource(bundleUrl); }}>
      <div class="bundle-box">
        <input bind:value={bundleUrl} onfocus={() => (suggestionsOpen = true)} oninput={() => (suggestionsOpen = true)} placeholder="Bundle or descriptor URL" />
        {#if suggestionsOpen && bundleSuggestions.length}
          <div class="bundle-suggestions">
            {#each bundleSuggestions as suggestion}
              <button type="button" onclick={() => void loadSource(suggestion.url)}>
                <strong>{suggestion.title || suggestion.label || suggestion.url}</strong>
                <span>{suggestion.url}</span>
                {#if suggestion.description}<small>{suggestion.description}</small>{/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <button type="submit">Load</button>
      <label class="file-button">
        <input type="file" accept="application/json,.json" onchange={(event) => void loadFile(event.currentTarget.files?.[0] || null)} />
        File
      </label>
    </form>
  </header>

  {#if error}
    <div class="error">{error}</div>
  {/if}
  {#if loading}
    <div class="status">Loading...</div>
  {/if}

  <main class="workspace">
    <aside class="left-panel">
      <div class="panel-bar">
        <button aria-label="Toggle navigation" type="button" onclick={() => (leftCollapsed = !leftCollapsed)}>{leftCollapsed ? '›' : '‹'}</button>
      </div>
      <div class="left-content">
        {#if source?.kind === 'large'}
          <input class="search-input" value={largeQuery} placeholder="Search static CKAN index" oninput={(event) => void runLargeSearch(event.currentTarget.value)} />
          {#if largeSuggestions.length}
            <div class="suggestions">
              {#each largeSuggestions as suggestion}
                <button type="button" onclick={() => void runLargeSearch(suggestion.token)}>{suggestion.token} <small>{suggestion.df}</small></button>
              {/each}
            </div>
          {/if}
          <section class="facet-preview">
            <h2>Overview Facets</h2>
            {#each Object.entries(source.overview.facet_previews || {}) as [key, values]}
              <details>
                <summary>{key.replaceAll('_', ' ')}</summary>
                {#each values.slice(0, 8) as value}
                  <span>{value.value} <small>{value.count}</small></span>
                {/each}
              </details>
            {/each}
          </section>
        {:else if smallCorpus}
          <input class="search-input" bind:value={smallQuery} placeholder="Search nodes" />
          <div class="type-filters">
            <div class="filter-heading">
              <span>Node Types</span>
              <button type="button" onclick={resetTypes}>All</button>
            </div>
            {#each typeList as type}
              <button class:active={visibleTypes.has(type)} type="button" onclick={() => toggleType(type)}>
                <span class="type-dot"></span>{type}
              </button>
            {/each}
          </div>
          <div class="node-list">
            {#each visibleNodes as node}
              <button class:active={node.id === selectedId} type="button" onclick={() => selectNode(node.id)}>
                <strong>{node.title}</strong>
                <span>{node.type || 'Node'} · {node.source || node.id}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </aside>

    <button class="splitter" aria-label="Resize navigation" type="button" onpointerdown={(event) => beginResize('left', event)}></button>

    <section class="stage">
      <div class="stage-bar">
        <div class="crumbs">
          {source?.kind === 'large' ? 'Large corpus' : smallCorpus?.title || 'OKF'} / {activeView}
          {#if detailNode} / {detailNode.title}{/if}
        </div>
        <div class="stage-actions">
          <button type="button" onclick={copyRoute}>Copy route</button>
          <button type="button" onclick={() => (rightCollapsed = false)}>Inspect</button>
        </div>
      </div>

      {#if source?.kind === 'large'}
        <section class="large-view">
          <div class="metrics">
            {#each Object.entries(source.manifest.counts).slice(0, 4) as [key, value]}
              <article><strong>{value.toLocaleString()}</strong><span>{key.replaceAll('_', ' ')}</span></article>
            {/each}
          </div>
          {#if largeQuery}
            <h2>Search Results</h2>
            {#if largeSearching}<p class="muted">Searching static index...</p>{/if}
            <div class="result-list">
              {#each largeResults as result}
                <button class:active={largeSelected?.name === result.name} type="button" onclick={() => (largeSelected = result)}>
                  <strong>{result.title}</strong>
                  <span>{result.publisher_title} · {result.resource_count} resources · score {result.score}</span>
                  <p>{result.notes}</p>
                </button>
              {/each}
            </div>
          {:else}
            <h2>{source.overview.title}</h2>
            <p class="muted">Overview-first mode. Search loads generated static search shards; graph and full record chunks remain deferred.</p>
            <div class="overview-grid">
              <section>
                <h3>Recent datasets</h3>
                {#each (source.overview.recent_datasets || []).slice(0, 8) as dataset}
                  <button type="button" onclick={() => (largeSelected = dataset)}>{dataset.title}<span>{dataset.publisher_title}</span></button>
                {/each}
              </section>
              <section>
                <h3>Formats</h3>
                {#each (source.overview.format_counts || []).slice(0, 12) as format}
                  <span class="chip">{format.value} {format.count}</span>
                {/each}
              </section>
            </div>
          {/if}
        </section>
      {:else if smallCorpus}
        {#if activeView === 'reader'}
          <section class="reader-view">
            {#each visibleNodes as node}
              <button class="node-card" class:active={node.id === selectedId} type="button" onclick={() => inspectNode(node.id)} ondblclick={() => selectNode(node.id)}>
                <span>{node.type || 'Node'}</span>
                <h2>{node.title}</h2>
                <p>{node.description || node.summary || node.source || node.id}</p>
              </button>
            {/each}
          </section>
        {:else if activeView === 'graph'}
          {@const model = graphModel()}
          {@const positions = graphPositions(model)}
          <svg class="graph" viewBox="0 0 900 620" role="img" aria-label="OKF graph">
            {#each model.relationships as relationship}
              {@const sourcePos = positions.get(relationship.source)}
              {@const targetPos = positions.get(relationship.target)}
              {#if sourcePos && targetPos}
                <line x1={sourcePos.x} y1={sourcePos.y} x2={targetPos.x} y2={targetPos.y} />
              {/if}
            {/each}
            {#each model.nodes as node}
              {@const pos = positions.get(node.id) || { x: 450, y: 310 }}
              <g
                class:active={node.id === selectedId}
                role="button"
                tabindex="0"
                onclick={() => inspectNode(node.id)}
                ondblclick={() => selectNode(node.id)}
                onkeydown={(event) => keyboardActivate(event, () => inspectNode(node.id))}
              >
                <circle cx={pos.x} cy={pos.y} r={node.id === selectedId ? 15 : 10}></circle>
                <text x={pos.x + 16} y={pos.y + 5}>{node.title}</text>
              </g>
            {/each}
          </svg>
        {:else if activeView === 'links'}
          <section class="links-view">
            {#each scopedRelationships as relationship}
              <button type="button" onclick={() => inspectNode(relationship.source)}>
                <strong>{smallCorpus.nodes[relationship.source]?.title || relationship.source}</strong>
                <span>{relationship.kind || 'related'}</span>
                <strong>{smallCorpus.nodes[relationship.target]?.title || relationship.target}</strong>
              </button>
            {/each}
          </section>
        {:else if activeView === 'timeline'}
          <section class="timeline-view">
            {#each visibleNodes.filter((node) => node.timestamp).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, 120) as node}
              <button type="button" onclick={() => inspectNode(node.id)}>
                <time>{String(node.timestamp).slice(0, 10)}</time>
                <div><strong>{node.title}</strong><span>{node.type || 'Node'}</span></div>
              </button>
            {/each}
          </section>
        {:else}
          <section class="type-view">
            {#each typeList as type}
              <article>
                <h2>{type}</h2>
                {#each visibleNodes.filter((node) => (node.type || 'Node') === type).slice(0, 20) as node}
                  <button type="button" onclick={() => inspectNode(node.id)}>{node.title}</button>
                {/each}
              </article>
            {/each}
          </section>
        {/if}
      {:else}
        <section class="empty-state">Load an OKF bundle or large-corpus descriptor.</section>
      {/if}
    </section>

    <button class="splitter" aria-label="Resize details" type="button" onpointerdown={(event) => beginResize('right', event)}></button>

    <aside class="right-panel">
      <div class="panel-bar">
        <button aria-label="Toggle details" type="button" onclick={() => (rightCollapsed = !rightCollapsed)}>{rightCollapsed ? '‹' : '›'}</button>
      </div>
      <div class="detail">
        {#if source?.kind === 'large'}
          {#if largeSelected}
            <span class="badge">Dataset</span>
            <h2>{largeSelected.title}</h2>
            <p>{largeSelected.notes}</p>
            <dl>
              <dt>Publisher</dt><dd>{largeSelected.publisher_title}</dd>
              <dt>Resources</dt><dd>{largeSelected.resource_count}</dd>
              <dt>Route</dt><dd>{largeSelected.open}</dd>
              <dt>Timestamp</dt><dd>{largeSelected.timestamp || 'None'}</dd>
            </dl>
            <div class="chips">{#each largeSelected.formats as format}<span class="chip">{format}</span>{/each}</div>
          {:else}
            <h2>{source.descriptor.title}</h2>
            <p>{source.descriptor.description}</p>
            <dl>
              <dt>Schema</dt><dd>{source.descriptor.schema}</dd>
              <dt>Generated</dt><dd>{source.descriptor.generated_at || source.manifest.generated_at}</dd>
              <dt>Search</dt><dd>{source.manifest.search?.tokens?.toLocaleString() || 'Unknown'} tokens</dd>
            </dl>
          {/if}
        {:else if detailNode}
          <span class="badge">{detailNode.type || 'Node'}</span>
          <h2>{detailNode.title}</h2>
          <p>{detailNode.description || detailNode.summary || detailNode.source || detailNode.id}</p>
          <dl>
            <dt>Route</dt><dd>{detailNode.id}</dd>
            <dt>Section</dt><dd>{detailNode.section || 'root'}</dd>
            <dt>Source</dt><dd>{detailNode.source || 'None'}</dd>
            <dt>Links</dt><dd>{detailRelationships.length}</dd>
          </dl>
          <h3>Relationships</h3>
          {#each detailRelationships.slice(0, 20) as relationship}
            <button type="button" onclick={() => inspectNode(relationship.source === detailNode?.id ? relationship.target : relationship.source)}>
              {relationship.kind || 'related'} · {smallCorpus?.nodes[relationship.source === detailNode.id ? relationship.target : relationship.source]?.title}
            </button>
          {/each}
        {:else}
          <h2>No selection</h2>
          <p>Select a node or search result to inspect its data.</p>
        {/if}
      </div>
    </aside>
  </main>
</div>
