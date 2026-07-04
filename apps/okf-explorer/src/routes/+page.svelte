<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    BundleRegistryEntry,
    LargeDataset,
    LargeFullIndex,
    LargePublisher,
    LargeRelationship,
    LargeResource,
    LoadedSource,
    NormalizedCorpus,
    OkfNode,
    SearchResultDoc,
    SearchSuggestion,
    ViewMode
  } from '$lib/types';
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
    { id: 'type', label: 'Type' },
    { id: 'resources', label: 'Resources' }
  ];
  const FULL_INDEX_VIEWS = new Set<ViewMode>(['links', 'timeline', 'type', 'resources']);
  const RELATIONSHIP_VIEWS = new Set<ViewMode>(['links']);
  const LARGE_FACET_KEYS = ['publisher', 'format', 'tag', 'license', 'host', 'resource_type', 'update_year', 'govuk_linked', 'publisher_family', 'publisher_state'];
  const GRAPH_WIDTH = 900;
  const GRAPH_HEIGHT = 620;

  type LargeDetail =
    | {
        kind: 'dataset';
        route: string;
        dataset: LargeDataset;
        resources: LargeResource[];
        publisher?: LargePublisher;
        relationships: LargeRelationship[];
      }
    | {
        kind: 'resource';
        route: string;
        resource: LargeResource;
        dataset?: LargeDataset;
        relationships: LargeRelationship[];
      }
    | {
        kind: 'publisher';
        route: string;
        publisher: LargePublisher;
        datasets: LargeDataset[];
        relationships: LargeRelationship[];
      }
    | {
        kind: 'search';
        route: string;
        result: SearchResultDoc;
      }
    | {
        kind: 'route';
        route: string;
        label: string;
        relationships: LargeRelationship[];
      };

  type LargeGraphNode = {
    id: string;
    label: string;
    type: string;
    count?: number;
    stackFor?: string;
  };

  type LargeGraphEdge = {
    source: string;
    target: string;
    label: string;
  };

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
  let largeAppliedQuery = $state('');
  let largeResults = $state<SearchResultDoc[]>([]);
  let largeSuggestions = $state<SearchSuggestion[]>([]);
  let largeSelectedRoute = $state('');
  let largeInspectedRoute = $state('');
  let largeHighlightedRoute = $state('');
  let largeExpandedStackRoute = $state('');
  let largeIndex = $state<LargeFullIndex | null>(null);
  let largeRelationships = $state<LargeRelationship[]>([]);
  let largeFacetFilters = $state<Record<string, string[]>>({});
  let largeFullLoading = $state(false);
  let largeRelationshipsLoading = $state(false);
  let largeSearching = $state(false);
  let largePreserveSelectionUntilSearch = $state(false);
  let largeSearchClient = $state<LargeSearchClient | null>(null);
  let largeSearchRequest = 0;
  let activeFacetKey = $state('publisher');
  let pins = $state<string[]>([]);

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
  let largeResultNames: Set<string> = $derived(new Set(largeResults.map((result) => result.name)));
  let largeResultOrder: Map<string, number> = $derived(new Map(largeResults.map((result, index) => [result.name, index])));
  let largeVisibleDatasets: LargeDataset[] = $derived(largeIndex ? visibleLargeDatasets() : []);
  let largeVisibleDatasetNames: Set<string> = $derived(new Set(largeVisibleDatasets.map((dataset) => dataset.name)));
  let visibleLargeSearchCount: number = $derived(largeIndex && largeAppliedQuery.trim() ? largeVisibleDatasets.length : largeResults.length);
  let largeVisibleResources: LargeResource[] = $derived(
    largeIndex ? largeVisibleDatasets.flatMap((dataset) => largeIndex?.resourcesByDataset.get(dataset.name) || []).slice(0, 600) : []
  );
  let largeDetail: LargeDetail | null = $derived(resolveVisibleLargeDetail(largeInspectedRoute || largeSelectedRoute));
  let largeFacetKeys: string[] = $derived(largeIndex ? Object.keys(largeIndex.facets) : Object.keys(source?.kind === 'large' ? source.overview.facet_previews || {} : {}));
  let activeLargeFilterCount: number = $derived(Object.values(largeFacetFilters).reduce((total, values) => total + values.length, 0));
  let pinnedLabels: Array<{ route: string; label: string }> = $derived(pins.map((route) => ({ route, label: largeLabelForRoute(route) })));

  onMount(() => {
    void initialize();
    window.addEventListener('popstate', applyBrowserRoute);
    return () => window.removeEventListener('popstate', applyBrowserRoute);
  });

  async function initialize() {
    history = loadHistory();
    registry = await loadRegistry(DEFAULT_REGISTRY);
    pins = loadPins();
    bundleUrl = initialBundleUrl();
    const initialView = initialViewMode();
    if (initialView) activeView = initialView;
    await loadSource(bundleUrl);
  }

  function initialBundleUrl(): string {
    const params = new URLSearchParams(location.search);
    return params.get('bundle') || DEFAULT_BUNDLE;
  }

  function initialViewMode(): ViewMode | null {
    const params = new URLSearchParams(location.search);
    const view = params.get('view') as ViewMode | null;
    return view && VIEW_MODES.some((item) => item.id === view) ? view : null;
  }

  function toAbsoluteUrl(url: string): string {
    return new URL(url, location.href).toString();
  }

  function syncExplorerUrl() {
    const next = new URL(location.href);
    const absoluteDefault = toAbsoluteUrl(DEFAULT_BUNDLE);
    if (bundleUrl === absoluteDefault) next.searchParams.delete('bundle');
    else next.searchParams.set('bundle', bundleUrl);
    if (activeView === 'reader') next.searchParams.delete('view');
    else next.searchParams.set('view', activeView);
    if (source?.kind === 'large' && largeQuery.trim()) next.searchParams.set('q', largeQuery.trim());
    else next.searchParams.delete('q');
    const route = source?.kind === 'large' ? largeSelectedRoute : selectedId;
    next.hash = route || (source?.kind === 'large' ? 'overview' : '');
    window.history.replaceState(null, '', next);
  }

  function syncBundleUrlParam(url: string) {
    bundleUrl = url;
    syncExplorerUrl();
  }

  function smallBundleTitle(corpus: NormalizedCorpus): string {
    return corpus.title || 'OKF bundle';
  }

  function applyBrowserRoute() {
    const nextView = initialViewMode();
    if (nextView) void selectView(nextView);
    const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (source?.kind === 'large') {
      largeSelectedRoute = hash && hash !== 'overview' ? hash : '';
      largeInspectedRoute = '';
      if (largeSelectedRoute && FULL_INDEX_VIEWS.has(activeView)) void ensureLargeFullIndex();
      reconcileLargeSelection();
    } else if (smallCorpus && hash && smallCorpus.nodes[hash]) {
      selectedId = hash;
      inspectedId = '';
    }
  }

  async function loadSource(url: string) {
    const absoluteUrl = toAbsoluteUrl(url);
    loading = true;
    error = '';
    selectedId = '';
    inspectedId = '';
    largeSelectedRoute = '';
    largeInspectedRoute = '';
    largeHighlightedRoute = '';
    largeExpandedStackRoute = '';
    largeAppliedQuery = '';
    largeResults = [];
    largeSuggestions = [];
    largeIndex = null;
    largeRelationships = [];
    largeFacetFilters = {};
    largePreserveSelectionUntilSearch = false;
    activeFacetKey = 'publisher';
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
        bundleUrl = absoluteUrl;
        const params = new URLSearchParams(location.search);
        const query = params.get('q') || '';
        const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
        if (hash && hash !== 'overview') {
          largeSelectedRoute = hash;
          largeInspectedRoute = hash;
          if (FULL_INDEX_VIEWS.has(activeView)) void ensureLargeFullIndex();
        }
        if (query) void runLargeSearch(query, { preserveSelection: true });
        if (FULL_INDEX_VIEWS.has(activeView) || RELATIONSHIP_VIEWS.has(activeView)) void hydrateForView(activeView);
      } else {
        const corpus = normalizeSmallBundle(raw);
        source = { kind: 'small', url: absoluteUrl, title: smallBundleTitle(corpus), corpus };
        visibleTypes = new Set([...new Set(Object.values(corpus.nodes).map((node) => node.type || 'Node'))]);
        history = rememberHistory({ url: absoluteUrl, title: corpus.title, description: corpus.description, kind: 'bundle' });
        bundleUrl = absoluteUrl;
        const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
        selectedId = hash && corpus.nodes[hash] ? hash : Object.keys(corpus.nodes)[0] || '';
      }
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

  async function selectView(view: ViewMode) {
    activeView = view;
    await hydrateForView(view);
    syncExplorerUrl();
  }

  async function hydrateForView(view: ViewMode) {
    if (source?.kind !== 'large') return;
    if (FULL_INDEX_VIEWS.has(view) || RELATIONSHIP_VIEWS.has(view)) await ensureLargeFullIndex();
    if (RELATIONSHIP_VIEWS.has(view)) await ensureLargeRelationships();
  }

  async function ensureLargeFullIndex(): Promise<LargeFullIndex | null> {
    if (source?.kind !== 'large') return null;
    largeFullLoading = true;
    try {
      largeIndex = await source.loadFullIndex();
      if (!activeFacetKey) activeFacetKey = Object.keys(largeIndex.facets)[0] || 'publisher';
      reconcileLargeSelection();
      return largeIndex;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      return null;
    } finally {
      largeFullLoading = false;
    }
  }

  async function ensureLargeRelationships(): Promise<LargeRelationship[]> {
    if (source?.kind !== 'large') return [];
    largeRelationshipsLoading = true;
    try {
      largeRelationships = await source.loadRelationships();
      return largeRelationships;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      return [];
    } finally {
      largeRelationshipsLoading = false;
    }
  }

  function selectNode(id: string) {
    selectedId = id;
    inspectedId = '';
    activeView = activeView || 'reader';
    syncExplorerUrl();
  }

  function inspectNode(id: string) {
    inspectedId = id;
    rightCollapsed = false;
  }

  function selectLargeRoute(route: string) {
    if (!largeRouteInReduction(route)) return;
    largeSelectedRoute = route;
    largeInspectedRoute = '';
    largeHighlightedRoute = route;
    rightCollapsed = false;
    if (FULL_INDEX_VIEWS.has(activeView)) void ensureLargeFullIndex();
    syncExplorerUrl();
  }

  function inspectLargeRoute(route: string) {
    if (!largeRouteInReduction(route)) return;
    largeInspectedRoute = route;
    largeHighlightedRoute = route;
    rightCollapsed = false;
    if (FULL_INDEX_VIEWS.has(activeView)) void ensureLargeFullIndex();
  }

  function recenterLargeRoute(route: string) {
    if (route.startsWith('resource-stack/')) {
      largeExpandedStackRoute = route.replace(/^resource-stack\//, '');
      return;
    }
    if (!largeRouteInReduction(route)) return;
    largeSelectedRoute = route;
    largeInspectedRoute = '';
    largeHighlightedRoute = route;
    activeView = 'graph';
    void hydrateForView('graph');
    syncExplorerUrl();
  }

  function copyRoute() {
    let route = location.href;
    if (source?.kind === 'small' && detailNode) {
      const next = new URL(location.href);
      next.hash = detailNode.id;
      route = next.toString();
    } else if (source?.kind === 'large') {
      syncExplorerUrl();
      route = location.href;
    }
    void navigator.clipboard?.writeText(route);
  }

  function pinRoute(route = source?.kind === 'large' ? largeSelectedRoute || largeInspectedRoute : selectedId) {
    if (!route) return;
    pins = [route, ...pins.filter((item) => item !== route)].slice(0, 20);
    savePins();
  }

  function loadPins() {
    try {
      const raw = localStorage.getItem('okf-explorer:pins');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  function savePins() {
    try {
      localStorage.setItem('okf-explorer:pins', JSON.stringify(pins));
    } catch {
      // Ignore storage failures in private windows.
    }
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

  function toggleLargeFacet(key: string, value: string) {
    const current = new Set(largeFacetFilters[key] || []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    largeFacetFilters = { ...largeFacetFilters, [key]: [...current] };
    if (!current.size) {
      const { [key]: _removed, ...rest } = largeFacetFilters;
      largeFacetFilters = rest;
    }
    void ensureLargeFullIndex();
    reconcileLargeSelection();
  }

  function clearLargeFilters() {
    largeFacetFilters = {};
    reconcileLargeSelection();
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
        graphPosition(index, model.nodes.length, selectedNode ? 210 : 250, GRAPH_WIDTH / 2, GRAPH_HEIGHT / 2)
      ])
    );
  }

  async function runLargeSearch(query: string, options: { preserveSelection?: boolean } = {}) {
    largeQuery = query;
    const trimmed = query.trim();
    const requestId = ++largeSearchRequest;
    if (!trimmed) {
      largeAppliedQuery = '';
      largeResults = [];
      largeSuggestions = [];
      largeSelectedRoute = '';
      largeInspectedRoute = '';
      largeHighlightedRoute = '';
      largeSearching = false;
      largePreserveSelectionUntilSearch = false;
      syncExplorerUrl();
      return;
    }
    if (!largeSearchClient) return;
    largeAppliedQuery = trimmed;
    largeResults = [];
    largeSuggestions = [];
    largePreserveSelectionUntilSearch = Boolean(options.preserveSelection);
    if (!options.preserveSelection) {
      largeSelectedRoute = '';
      largeInspectedRoute = '';
      largeHighlightedRoute = '';
    }
    largeSearching = true;
    syncExplorerUrl();
    await new Promise((resolve) => setTimeout(resolve, 160));
    if (requestId !== largeSearchRequest) return;
    try {
      const [results, suggestions] = await Promise.all([largeSearchClient.query(query), largeSearchClient.suggest(query)]);
      if (requestId !== largeSearchRequest) return;
      largeResults = results;
      largeSuggestions = suggestions;
      if (!largeSelectedRoute && results[0]) largeHighlightedRoute = `dataset/${results[0].name}`;
      largePreserveSelectionUntilSearch = false;
      reconcileLargeSelection(Boolean(options.preserveSelection));
      syncExplorerUrl();
    } catch (err) {
      if (requestId === largeSearchRequest) largePreserveSelectionUntilSearch = false;
      error = err instanceof Error ? err.message : String(err);
    } finally {
      if (requestId === largeSearchRequest) largeSearching = false;
    }
  }

  function chooseLargeResult(result: SearchResultDoc) {
    largeSelectedRoute = result.open || `dataset/${result.name}`;
    largeInspectedRoute = largeSelectedRoute;
    largeHighlightedRoute = largeSelectedRoute;
    rightCollapsed = false;
    if (FULL_INDEX_VIEWS.has(activeView)) void ensureLargeFullIndex();
    syncExplorerUrl();
  }

  function largeRouteInReduction(route: string): boolean {
    if (!route) return true;
    const kind = routeKind(route);
    const value = routeValue(route);
    if (!largeIndex) {
      return kind !== 'dataset' || !largeAppliedQuery.trim() || largeResultNames.has(value);
    }
    if (kind === 'dataset') return largeVisibleDatasetNames.has(value);
    if (kind === 'resource') {
      const resource = largeIndex.resourceById.get(value);
      return Boolean(resource && largeVisibleDatasetNames.has(resource.dataset));
    }
    if (kind === 'publisher') return largeVisibleDatasets.some((dataset) => dataset.publisher === value);
    if (kind === 'format') return largeVisibleDatasets.some((dataset) => (dataset.formats || []).includes(value));
    if (kind === 'tag') return largeVisibleDatasets.some((dataset) => (dataset.tags || []).includes(value));
    if (kind === 'license') return largeVisibleDatasets.some((dataset) => dataset.license_id === value);
    if (kind === 'host') return largeVisibleDatasets.some((dataset) => largeDatasetFacetValues(dataset, 'host').includes(value));
    if (kind === 'resource_type') return largeVisibleDatasets.some((dataset) => largeDatasetFacetValues(dataset, 'resource_type').includes(value));
    if (kind === 'resource-stack') return largeRouteInReduction(value);
    return true;
  }

  function reconcileLargeSelection(preserveIfStillVisible = true) {
    if (source?.kind !== 'large') return;
    if (preserveIfStillVisible && largePreserveSelectionUntilSearch && largeAppliedQuery.trim() && !largeResults.length) return;
    if (!preserveIfStillVisible) {
      largeSelectedRoute = '';
      largeInspectedRoute = '';
      largeHighlightedRoute = '';
      return;
    }
    if (largeSelectedRoute && !largeRouteInReduction(largeSelectedRoute)) largeSelectedRoute = '';
    if (largeInspectedRoute && !largeRouteInReduction(largeInspectedRoute)) largeInspectedRoute = '';
    if (largeHighlightedRoute && !largeRouteInReduction(largeHighlightedRoute)) largeHighlightedRoute = '';
  }

  function visibleLargeDatasets(): LargeDataset[] {
    if (!largeIndex) return [];
    const queryActive = Boolean(largeAppliedQuery.trim());
    const rows = largeIndex.datasets.filter((dataset) => {
      if (queryActive && !largeResultNames.has(dataset.name)) return false;
      for (const [key, selected] of Object.entries(largeFacetFilters)) {
        if (!selected.length) continue;
        const values = largeDatasetFacetValues(dataset, key);
        if (!selected.some((value) => values.includes(value))) return false;
      }
      return true;
    });
    if (queryActive) {
      rows.sort((left, right) => (largeResultOrder.get(left.name) ?? 999999) - (largeResultOrder.get(right.name) ?? 999999));
    } else {
      rows.sort((left, right) => String(right.timestamp || right.metadata_modified || '').localeCompare(String(left.timestamp || left.metadata_modified || '')));
    }
    return rows;
  }

  function largeDatasetFacetValues(dataset: LargeDataset, key: string): string[] {
    if (!largeIndex) return [];
    if (key === 'publisher') return dataset.publisher ? [dataset.publisher] : [];
    if (key === 'format') return dataset.formats || [];
    if (key === 'tag') return dataset.tags || [];
    if (key === 'license') return dataset.license_id ? [dataset.license_id] : [];
    if (key === 'host') return [dataset.host, ...(dataset.resource_hosts || [])].filter((value): value is string => Boolean(value));
    if (key === 'govuk_linked') return (dataset.govuk_content_paths || []).length ? ['yes'] : ['no'];
    if (key === 'update_year') {
      const stamp = dataset.metadata_modified || dataset.timestamp || '';
      return stamp ? [String(stamp).slice(0, 4)] : [];
    }
    if (key === 'resource_type') return [...new Set((largeIndex.resourcesByDataset.get(dataset.name) || []).map((resource) => resource.resource_type || 'unknown'))];
    if (key === 'publisher_state') {
      const publisher = dataset.publisher ? largeIndex.publisherByName.get(dataset.publisher) : null;
      return publisher?.state ? [publisher.state] : [];
    }
    if (key === 'publisher_family') {
      const publisher = dataset.publisher ? largeIndex.publisherByName.get(dataset.publisher) : null;
      return [publisherFamily(publisher || dataset)];
    }
    return [];
  }

  function publisherFamily(value: LargePublisher | LargeDataset): string {
    const text = `${value.title || ''} ${'publisher_title' in value ? value.publisher_title || '' : ''} ${value.name || ''}`.toLowerCase();
    if (/\b(nhs|health|hospital|ambulance|care)\b/.test(text)) return 'health';
    if (/\b(council|borough|county|district|city of|combined authority|mayor)\b/.test(text)) return 'local government';
    if (/\b(department|ministry|office|hmrc|cabinet|treasury|home office|defra|dwp|ofsted)\b/.test(text)) return 'central government';
    if (/\b(environment|natural england|forestry|geological|met office|ordnance|statistics|ons|research)\b/.test(text)) return 'environment and science';
    return 'other public body';
  }

  function largeFacetRows(key: string) {
    if (!largeIndex) {
      return source?.kind === 'large' ? source.overview.facet_previews?.[key] || [] : [];
    }
    const counts = new Map<string, number>();
    for (const dataset of largeVisibleDatasets) {
      for (const value of largeDatasetFacetValues(dataset, key)) counts.set(value, (counts.get(value) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
      .slice(0, 18);
  }

  function stripHtml(value = '') {
    return value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function datasetRoute(dataset: LargeDataset | SearchResultDoc): string {
    const open = (dataset as SearchResultDoc).open;
    return typeof open === 'string' && open ? open : `dataset/${dataset.name}`;
  }

  function resourceRoute(resource: LargeResource): string {
    return `resource/${resource.id}`;
  }

  function publisherRoute(publisher: LargePublisher | string): string {
    return `publisher/${typeof publisher === 'string' ? publisher : publisher.name}`;
  }

  function routeKind(route: string): string {
    return route.split('/')[0] || 'route';
  }

  function routeValue(route: string): string {
    return route.split('/').slice(1).join('/');
  }

  function largeLabelForRoute(route: string): string {
    if (!route) return 'Overview';
    const kind = routeKind(route);
    const value = routeValue(route);
    if (kind === 'dataset') {
      return largeIndex?.datasetByName.get(value)?.title || largeResults.find((result) => result.name === value)?.title || value;
    }
    if (kind === 'resource') return largeIndex?.resourceById.get(value)?.name || value;
    if (kind === 'publisher') return largeIndex?.publisherByName.get(value)?.title || value;
    if (kind === 'resource-stack') {
      const dataset = largeIndex?.datasetByName.get(value);
      return `Resources: ${dataset?.title || value}`;
    }
    return value || route;
  }

  function routeRelationships(route: string, limit = 120): LargeRelationship[] {
    if (!route || !largeRelationships.length) return [];
    const rows: LargeRelationship[] = [];
    for (const relationship of largeRelationships) {
      if (relationship.source === route || relationship.target === route) {
        rows.push(relationship);
        if (rows.length >= limit) break;
      }
    }
    return rows;
  }

  function resolveLargeDetail(route: string): LargeDetail | null {
    if (!route) return null;
    const kind = routeKind(route);
    const value = routeValue(route);
    if (kind === 'dataset') {
      const dataset = largeIndex?.datasetByName.get(value);
      if (dataset) {
        return {
          kind: 'dataset',
          route,
          dataset,
          resources: largeIndex?.resourcesByDataset.get(dataset.name) || [],
          publisher: dataset.publisher ? largeIndex?.publisherByName.get(dataset.publisher) : undefined,
          relationships: routeRelationships(route)
        };
      }
      const overviewResult = source?.kind === 'large' ? source.overview.recent_datasets?.find((item: SearchResultDoc) => item.name === value) : undefined;
      const result = largeResults.find((item) => item.name === value) || overviewResult;
      if (result) return { kind: 'search', route, result };
    }
    if (kind === 'resource') {
      const resource = largeIndex?.resourceById.get(value);
      if (resource) return { kind: 'resource', route, resource, dataset: largeIndex?.datasetByName.get(resource.dataset), relationships: routeRelationships(route) };
    }
    if (kind === 'publisher') {
      const publisher = largeIndex?.publisherByName.get(value);
      if (publisher) {
        return {
          kind: 'publisher',
          route,
          publisher,
          datasets: largeIndex?.datasets.filter((dataset) => dataset.publisher === publisher.name).slice(0, 200) || [],
          relationships: routeRelationships(route)
        };
      }
    }
    return { kind: 'route', route, label: largeLabelForRoute(route), relationships: routeRelationships(route) };
  }

  function resolveVisibleLargeDetail(route: string): LargeDetail | null {
    if (!route || !largeRouteInReduction(route)) return null;
    return resolveLargeDetail(route);
  }

  function largeGraphModel(): { center: string; nodes: LargeGraphNode[]; relationships: LargeGraphEdge[] } {
    const selectedCenter = largeSelectedRoute && largeRouteInReduction(largeSelectedRoute) ? largeSelectedRoute : '';
    const compactResultCenter = !largeIndex && largeResults[0] ? datasetRoute(largeResults[0]) : '';
    const center = selectedCenter || (largeVisibleDatasets[0] ? datasetRoute(largeVisibleDatasets[0]) : compactResultCenter);
    const nodeMap = new Map<string, LargeGraphNode>();
    const edges: LargeGraphEdge[] = [];

    const addNode = (id: string, type = routeKind(id), label = largeLabelForRoute(id), count?: number, stackFor?: string) => {
      if (!id) return;
      if (!nodeMap.has(id)) nodeMap.set(id, { id, label, type, count, stackFor });
    };
    const addEdge = (sourceId: string, targetId: string, label: string) => {
      addNode(sourceId);
      addNode(targetId);
      edges.push({ source: sourceId, target: targetId, label });
    };

    if (center) addNode(center);
    if (center && largeRelationships.length) {
      for (const relationship of routeRelationships(center, 120)) {
        addEdge(relationship.source, relationship.target, relationship.kind);
      }
    }

    if (!largeIndex && center.startsWith('dataset/')) {
      const result = largeResults.find((item) => datasetRoute(item) === center || item.name === routeValue(center));
      if (result) {
        if (result.publisher) addEdge(center, publisherRoute(result.publisher), 'published by');
        for (const format of (result.formats || []).slice(0, 8)) addEdge(center, `format/${format}`, 'has format');
        for (const tag of (result.tags || []).slice(0, 8)) addEdge(center, `tag/${tag}`, 'tagged');
        if (result.resource_count > 0) {
          const stackId = `resource-stack/${center}`;
          addNode(stackId, 'resource-stack', `Resources (${result.resource_count})`, result.resource_count, center);
          edges.push({ source: center, target: stackId, label: 'has resources' });
        }
      }
    } else if (largeIndex && center.startsWith('dataset/')) {
      const datasetName = routeValue(center);
      const dataset = largeIndex.datasetByName.get(datasetName);
      if (dataset) {
        if (dataset.publisher) addEdge(center, publisherRoute(dataset.publisher), 'published by');
        for (const format of (dataset.formats || []).slice(0, 8)) addEdge(center, `format/${format}`, 'has format');
        for (const tag of (dataset.tags || []).slice(0, 8)) addEdge(center, `tag/${tag}`, 'tagged');
        if (dataset.license_id) addEdge(center, `license/${dataset.license_id}`, 'licensed as');
        const resources = largeIndex.resourcesByDataset.get(dataset.name) || [];
        if (resources.length > 8 && largeExpandedStackRoute !== center) {
          const stackId = `resource-stack/${center}`;
          addNode(stackId, 'resource-stack', `Resources (${resources.length})`, resources.length, center);
          edges.push({ source: center, target: stackId, label: 'has resources' });
        } else {
          for (const resource of resources.slice(0, 80)) addEdge(center, resourceRoute(resource), 'has resource');
        }
      }
    } else if (largeIndex && !center) {
      for (const dataset of largeVisibleDatasets.slice(0, 42)) {
        const datasetId = datasetRoute(dataset);
        addNode(datasetId, 'dataset', dataset.title);
        if (dataset.publisher) addEdge(datasetId, publisherRoute(dataset.publisher), 'published by');
      }
    }

    if (!edges.length && largeIndex) {
      for (const dataset of largeVisibleDatasets.slice(0, 42)) {
        const datasetId = datasetRoute(dataset);
        addNode(datasetId, 'dataset', dataset.title);
        if (dataset.publisher) addEdge(datasetId, publisherRoute(dataset.publisher), 'published by');
      }
    }

    return { center, nodes: [...nodeMap.values()].slice(0, 140), relationships: edges.slice(0, 160) };
  }

  function largeGraphPositions(model: ReturnType<typeof largeGraphModel>) {
    const center = model.center && model.nodes.some((node) => node.id === model.center) ? model.center : model.nodes[0]?.id;
    const positions = new Map<string, { x: number; y: number }>();
    if (center) positions.set(center, { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 });
    const others = model.nodes.filter((node) => node.id !== center);
    const grouped: Record<string, LargeGraphNode[]> = {};
    for (const node of others) {
      const type = node.type || 'route';
      grouped[type] = [...(grouped[type] || []), node];
    }
    const groups = Object.values(grouped);
    groups.forEach((group, groupIndex) => {
      const radius = 150 + groupIndex * 58;
      group.forEach((node, index) => {
        positions.set(node.id, graphPosition(index, group.length, radius, GRAPH_WIDTH / 2, GRAPH_HEIGHT / 2));
      });
    });
    return positions;
  }

  function largeTypeColor(type: string) {
    if (type === 'dataset') return '#0b6bcb';
    if (type === 'resource') return '#007a5a';
    if (type === 'resource-stack') return '#5d3fd3';
    if (type === 'publisher') return '#b36b00';
    if (type === 'format') return '#7f5f01';
    if (type === 'tag') return '#b93386';
    if (type === 'license') return '#596773';
    return '#607080';
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
        <button class:active={activeView === view.id} type="button" onclick={() => void selectView(view.id)}>{view.label}</button>
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
  {#if loading || largeFullLoading || largeRelationshipsLoading}
    <div class="status">
      {#if loading}Loading bundle...{/if}
      {#if largeFullLoading} Loading records...{/if}
      {#if largeRelationshipsLoading} Loading relationships...{/if}
    </div>
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

          {#if pins.length}
            <section class="pinned-list">
              <h2>Pins</h2>
              {#each pinnedLabels as pin}
                <button type="button" onclick={() => selectLargeRoute(pin.route)}>{pin.label}</button>
              {/each}
            </section>
          {/if}

          <section class="facet-preview">
            <div class="filter-heading">
              <span>Filters {activeLargeFilterCount ? `(${activeLargeFilterCount})` : ''}</span>
              <button type="button" onclick={clearLargeFilters}>Clear</button>
            </div>
            <div class="facet-sections" aria-label="Facet filters">
              {#each (largeFacetKeys.length ? largeFacetKeys : LARGE_FACET_KEYS) as key}
                {@const selectedFacetCount = (largeFacetFilters[key] || []).length}
                <details class="facet-section" open={activeFacetKey === key || selectedFacetCount > 0}>
                  <summary onclick={() => { activeFacetKey = key; void ensureLargeFullIndex(); }}>
                    <span>{key.replaceAll('_', ' ')}</span><small>{selectedFacetCount}</small>
                  </summary>
                  <div class="facet-values">
                    {#each largeFacetRows(key).slice(0, 18) as value}
                      <button
                        class:active={(largeFacetFilters[key] || []).includes(value.value)}
                        type="button"
                        onclick={() => toggleLargeFacet(key, value.value)}
                      >
                        <span>{value.value}</span><small>{value.count.toLocaleString()}</small>
                      </button>
                    {/each}
                  </div>
                </details>
              {/each}
            </div>
          </section>

          {#if largeIndex}
            <div class="node-list">
              {#each largeVisibleDatasets.slice(0, 80) as dataset}
                <button class:active={datasetRoute(dataset) === largeSelectedRoute} type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>
                  <strong>{dataset.title}</strong>
                  <span>{dataset.publisher_title || dataset.publisher || 'Unknown publisher'} · {dataset.resource_count || 0} resources</span>
                </button>
              {/each}
            </div>
          {:else if largeResults.length}
            <div class="node-list">
              {#each largeResults.slice(0, 80) as result}
                <button class:active={datasetRoute(result) === largeSelectedRoute} type="button" onclick={() => chooseLargeResult(result)}>
                  <strong>{result.title}</strong>
                  <span>{result.publisher_title || result.publisher || 'Unknown publisher'} · {result.resource_count || 0} resources</span>
                </button>
              {/each}
            </div>
          {/if}
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
          {#if source?.kind === 'large' && (largeSelectedRoute || largeInspectedRoute)} / {largeLabelForRoute(largeInspectedRoute || largeSelectedRoute)}{/if}
          {#if detailNode} / {detailNode.title}{/if}
        </div>
        <div class="stage-actions">
          <button type="button" onclick={copyRoute}>Copy route</button>
          <button type="button" onclick={() => pinRoute()}>Pin</button>
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

          {#if activeView === 'reader'}
            {#if largeQuery}
              <div class="view-heading">
                <h2>Search Results</h2>
                <span>{largeSearching ? 'Searching static index...' : `${visibleLargeSearchCount.toLocaleString()} shown`}</span>
              </div>
              <div class="result-list">
                {#if largeIndex}
                  {#each largeVisibleDatasets.slice(0, 160) as dataset}
                    <button class:active={datasetRoute(dataset) === largeSelectedRoute} type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>
                      <strong>{dataset.title}</strong>
                      <span>{dataset.publisher_title || dataset.publisher || 'Unknown publisher'} · {dataset.resource_count || 0} resources</span>
                      <p>{stripHtml(dataset.notes || '').slice(0, 220)}</p>
                    </button>
                  {:else}
                    <p class="muted">No static-search matches in the current reduction.</p>
                  {/each}
                {:else}
                  {#each largeResults as result}
                    <button class:active={datasetRoute(result) === largeSelectedRoute} type="button" onclick={() => chooseLargeResult(result)}>
                      <strong>{result.title}</strong>
                      <span>{result.publisher_title} · {result.resource_count} resources · score {result.score}</span>
                      <p>{stripHtml(result.notes || '').slice(0, 220)}</p>
                    </button>
                  {:else}
                    <p class="muted">No static-search matches.</p>
                  {/each}
                {/if}
              </div>
            {:else if largeIndex}
              <div class="view-heading">
                <h2>Datasets</h2>
                <span>{largeVisibleDatasets.length.toLocaleString()} in current reduction</span>
              </div>
              <div class="result-list">
                {#each largeVisibleDatasets.slice(0, 160) as dataset}
                  <button class:active={datasetRoute(dataset) === largeSelectedRoute} type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>
                    <strong>{dataset.title}</strong>
                    <span>{dataset.publisher_title || dataset.publisher || 'Unknown publisher'} · {dataset.resource_count || 0} resources</span>
                    <p>{stripHtml(dataset.notes || '').slice(0, 220)}</p>
                  </button>
                {/each}
              </div>
            {:else}
              <h2>{source.overview.title}</h2>
              <p class="muted">Overview-first mode. Search loads generated static search shards; graph, resource stack, filters, and detail routes hydrate chunked records only when needed.</p>
              <div class="overview-grid">
                <section>
                  <h3>Recent datasets</h3>
                  {#each (source.overview.recent_datasets || []).slice(0, 10) as dataset}
                    <button type="button" onclick={() => chooseLargeResult(dataset)}>{dataset.title}<span>{dataset.publisher_title}</span></button>
                  {/each}
                </section>
                <section>
                  <h3>Formats</h3>
                  {#each (source.overview.format_counts || []).slice(0, 14) as format}
                    <span class="chip">{format.value} {format.count.toLocaleString()}</span>
                  {/each}
                </section>
              </div>
            {/if}
          {:else if activeView === 'graph'}
            {@const model = largeGraphModel()}
            {@const positions = largeGraphPositions(model)}
            <div class="view-heading">
              <h2>Graph</h2>
              <span>{model.nodes.length} nodes · {model.relationships.length} relationships</span>
            </div>
            <svg class="graph" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} role="img" aria-label="Large corpus graph">
              {#each model.relationships as relationship}
                {@const sourcePos = positions.get(relationship.source)}
                {@const targetPos = positions.get(relationship.target)}
                {#if sourcePos && targetPos}
                  <line class:highlight={largeHighlightedRoute === relationship.source || largeHighlightedRoute === relationship.target} x1={sourcePos.x} y1={sourcePos.y} x2={targetPos.x} y2={targetPos.y} />
                  <text class="edge-label" x={(sourcePos.x + targetPos.x) / 2} y={(sourcePos.y + targetPos.y) / 2}>{relationship.label}</text>
                {/if}
              {/each}
              {#each model.nodes as node}
                {@const pos = positions.get(node.id) || { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 }}
                <g
                  class:active={node.id === largeSelectedRoute || node.id === largeInspectedRoute || node.id === largeHighlightedRoute}
                  role="button"
                  tabindex="0"
                  onclick={() => inspectLargeRoute(node.id)}
                  ondblclick={() => recenterLargeRoute(node.id)}
                  onkeydown={(event) => keyboardActivate(event, () => inspectLargeRoute(node.id))}
                >
                  <circle cx={pos.x} cy={pos.y} r={node.type === 'resource-stack' ? 18 : node.id === largeSelectedRoute ? 15 : 10} fill={largeTypeColor(node.type)}></circle>
                  <text x={pos.x + 16} y={pos.y + 5}>{node.label}</text>
                  {#if node.count}
                    <text class="stack-count" x={pos.x - 5} y={pos.y + 4}>{node.count}</text>
                  {/if}
                </g>
              {/each}
            </svg>
          {:else if activeView === 'links'}
            <div class="view-heading">
              <h2>Links</h2>
              <span>{largeRelationships.length ? 'relationship chunks loaded' : 'loading on demand'}</span>
            </div>
            <section class="links-view">
              {#each (largeSelectedRoute && largeRouteInReduction(largeSelectedRoute) ? routeRelationships(largeSelectedRoute, 180) : largeRelationships.filter((relationship) => relationship.source.startsWith('dataset/') && largeVisibleDatasetNames.has(routeValue(relationship.source))).slice(0, 180)) as relationship}
                <button type="button" onclick={() => inspectLargeRoute(relationship.target)}>
                  <strong>{largeLabelForRoute(relationship.source)}</strong>
                  <span>{relationship.kind}</span>
                  <strong>{largeLabelForRoute(relationship.target)}</strong>
                </button>
              {:else}
                <p class="muted">Select a dataset or open graph/links to load relationship chunks.</p>
              {/each}
            </section>
          {:else if activeView === 'timeline'}
            <div class="view-heading">
              <h2>Timeline</h2>
              <span>{largeVisibleDatasets.length.toLocaleString()} datasets in current reduction</span>
            </div>
            <section class="timeline-view timeline-axis">
              {#each largeVisibleDatasets.filter((dataset) => dataset.timestamp || dataset.metadata_modified).slice(0, 180) as dataset, index}
                <button style={`--row:${index}`} type="button" onclick={() => inspectLargeRoute(datasetRoute(dataset))} ondblclick={() => recenterLargeRoute(datasetRoute(dataset))}>
                  <time>{String(dataset.timestamp || dataset.metadata_modified).slice(0, 10)}</time>
                  <div><strong>{dataset.title}</strong><span>{dataset.publisher_title || dataset.publisher || 'Unknown publisher'}</span></div>
                </button>
              {/each}
            </section>
          {:else if activeView === 'type'}
            <div class="view-heading">
              <h2>Types And Facets</h2>
              <span>filter chips affect every display</span>
            </div>
            <section class="type-view">
              {#each LARGE_FACET_KEYS as key}
                <article>
                  <h2>{key.replaceAll('_', ' ')}</h2>
                  {#each largeFacetRows(key).slice(0, 12) as row}
                    <button class:active={(largeFacetFilters[key] || []).includes(row.value)} type="button" onclick={() => toggleLargeFacet(key, row.value)}>
                      {row.value}<span>{row.count.toLocaleString()}</span>
                    </button>
                  {/each}
                </article>
              {/each}
            </section>
          {:else if activeView === 'resources'}
            <div class="view-heading">
              <h2>Resource Stack</h2>
              <span>{largeVisibleResources.length.toLocaleString()} resources shown from current reduction</span>
            </div>
            <section class="resource-stack-view">
              {#each largeVisibleDatasets.filter((dataset) => (largeIndex?.resourcesByDataset.get(dataset.name) || []).length).slice(0, 80) as dataset}
                {@const resources = largeIndex?.resourcesByDataset.get(dataset.name) || []}
                <article>
                  <button class="stack-heading" type="button" onclick={() => inspectLargeRoute(datasetRoute(dataset))} ondblclick={() => recenterLargeRoute(datasetRoute(dataset))}>
                    <strong>{dataset.title}</strong>
                    <span>{resources.length} resources · {dataset.publisher_title || dataset.publisher}</span>
                  </button>
                  <div class="resource-stack">
                    {#each resources.slice(0, 12) as resource}
                      <button
                        class:highlight={largeHighlightedRoute === resourceRoute(resource)}
                        type="button"
                        onclick={() => { largeHighlightedRoute = resourceRoute(resource); inspectLargeRoute(resourceRoute(resource)); }}
                        ondblclick={() => recenterLargeRoute(resourceRoute(resource))}
                      >
                        <strong>{resource.name || resource.id}</strong>
                        <span>{resource.format || 'unknown'} · {resource.host || 'unknown host'}</span>
                      </button>
                    {/each}
                    {#if resources.length > 12}<span class="chip">+{resources.length - 12} more</span>{/if}
                  </div>
                </article>
              {/each}
            </section>
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
          <svg class="graph" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} role="img" aria-label="OKF graph">
            {#each model.relationships as relationship}
              {@const sourcePos = positions.get(relationship.source)}
              {@const targetPos = positions.get(relationship.target)}
              {#if sourcePos && targetPos}
                <line x1={sourcePos.x} y1={sourcePos.y} x2={targetPos.x} y2={targetPos.y} />
              {/if}
            {/each}
            {#each model.nodes as node}
              {@const pos = positions.get(node.id) || { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 }}
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
          {#if largeDetail}
            {#if largeDetail.kind === 'dataset'}
              <span class="badge">Dataset</span>
              <h2>{largeDetail.dataset.title}</h2>
              <p>{stripHtml(largeDetail.dataset.notes || '')}</p>
              <div class="detail-actions">
                <button type="button" onclick={() => void selectView('graph')}>Graph</button>
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
                <button type="button" onclick={copyRoute}>Copy route</button>
              </div>
              <dl>
                <dt>Publisher</dt><dd>{largeDetail.dataset.publisher_title || largeDetail.dataset.publisher || 'Unknown'}</dd>
                <dt>Resources</dt><dd>{(largeDetail.dataset.resource_count || largeDetail.resources.length).toLocaleString()}</dd>
                <dt>Licence</dt><dd>{largeDetail.dataset.license_title || largeDetail.dataset.license_id || 'Unknown'}</dd>
                <dt>Modified</dt><dd>{largeDetail.dataset.metadata_modified || largeDetail.dataset.timestamp || 'None'}</dd>
                <dt>API</dt><dd>{largeDetail.dataset.source_api_url || 'None'}</dd>
              </dl>
              <div class="chips">
                {#each (largeDetail.dataset.formats || []).slice(0, 16) as format}<span class="chip">{format}</span>{/each}
                {#each (largeDetail.dataset.tags || []).slice(0, 16) as tag}<span class="chip">{tag}</span>{/each}
              </div>
              <h3>Resources</h3>
              {#each largeDetail.resources.slice(0, 30) as resource}
                <button type="button" onclick={() => { largeHighlightedRoute = resourceRoute(resource); inspectLargeRoute(resourceRoute(resource)); }} ondblclick={() => recenterLargeRoute(resourceRoute(resource))}>
                  <strong>{resource.name || resource.id}</strong>
                  <span>{resource.format || 'unknown'} · {resource.host || 'unknown host'}</span>
                </button>
              {/each}
              {#if largeDetail.relationships.length}
                <h3>Relationships</h3>
                {#each largeDetail.relationships.slice(0, 24) as relationship}
                  <button type="button" onclick={() => inspectLargeRoute(relationship.source === largeDetail?.route ? relationship.target : relationship.source)}>
                    {relationship.kind} · {largeLabelForRoute(relationship.source === largeDetail.route ? relationship.target : relationship.source)}
                  </button>
                {/each}
              {/if}
            {:else if largeDetail.kind === 'resource'}
              <span class="badge">Resource</span>
              <h2>{largeDetail.resource.name || largeDetail.resource.id}</h2>
              <p>{stripHtml(largeDetail.resource.description || '') || largeDetail.resource.url}</p>
              <div class="detail-actions">
                <button type="button" onclick={() => largeDetail?.kind === 'resource' && selectLargeRoute(datasetRoute(largeDetail.dataset || { name: largeDetail.resource.dataset, title: largeDetail.resource.dataset }))}>Dataset</button>
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
              </div>
              <dl>
                <dt>Dataset</dt><dd>{largeDetail.dataset?.title || largeDetail.resource.dataset}</dd>
                <dt>Format</dt><dd>{largeDetail.resource.format || 'unknown'}</dd>
                <dt>Host</dt><dd>{largeDetail.resource.host || 'unknown'}</dd>
                <dt>Type</dt><dd>{largeDetail.resource.resource_type || 'unknown'}</dd>
                <dt>URL</dt><dd>{largeDetail.resource.url || 'None'}</dd>
              </dl>
            {:else if largeDetail.kind === 'publisher'}
              <span class="badge">Publisher</span>
              <h2>{largeDetail.publisher.title}</h2>
              <p>{stripHtml(largeDetail.publisher.description || '')}</p>
              <dl>
                <dt>Datasets</dt><dd>{(largeDetail.publisher.dataset_count || largeDetail.datasets.length).toLocaleString()}</dd>
                <dt>Resources</dt><dd>{(largeDetail.publisher.resource_count || 0).toLocaleString()}</dd>
                <dt>State</dt><dd>{largeDetail.publisher.state || 'unknown'}</dd>
              </dl>
              <h3>Datasets</h3>
              {#each largeDetail.datasets.slice(0, 40) as dataset}
                <button type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>{dataset.title}</button>
              {/each}
            {:else if largeDetail.kind === 'search'}
              <span class="badge">Dataset</span>
              <h2>{largeDetail.result.title}</h2>
              <p>{stripHtml(largeDetail.result.notes || '')}</p>
              <dl>
                <dt>Publisher</dt><dd>{largeDetail.result.publisher_title}</dd>
                <dt>Resources</dt><dd>{largeDetail.result.resource_count.toLocaleString()}</dd>
                <dt>Route</dt><dd>{largeDetail.result.open}</dd>
                <dt>Timestamp</dt><dd>{largeDetail.result.timestamp || 'None'}</dd>
              </dl>
              <button type="button" onclick={() => void ensureLargeFullIndex()}>Load full record</button>
            {:else}
              <span class="badge">{routeKind(largeDetail.route)}</span>
              <h2>{largeDetail.label}</h2>
              <dl>
                <dt>Route</dt><dd>{largeDetail.route}</dd>
                <dt>Links</dt><dd>{largeDetail.relationships.length}</dd>
              </dl>
            {/if}
          {:else}
            <h2>{source.descriptor.title}</h2>
            <p>{source.descriptor.description}</p>
            <dl>
              <dt>Schema</dt><dd>{source.descriptor.schema}</dd>
              <dt>Generated</dt><dd>{source.descriptor.generated_at || source.manifest.generated_at}</dd>
              <dt>Search</dt><dd>{source.manifest.search?.tokens?.toLocaleString() || 'Unknown'} tokens</dd>
              <dt>Hydration</dt><dd>{largeIndex ? 'records loaded' : 'overview only'}</dd>
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
