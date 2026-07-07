<script lang="ts">
  import { onMount } from 'svelte';
  import { replaceState } from '$app/navigation';
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
    OkfRelationship,
    SearchResultDoc,
    SearchSuggestion,
    ViewMode
  } from '$lib/types';
  import { LargeSearchClient } from '$lib/search/largeSearchClient';
  import { fetchJson, resolveUrl } from '$lib/sources/fetch';
  import { loadLargeCorpus } from '$lib/sources/largeCorpus';
  import { loadHistory, loadRegistry, rememberHistory } from '$lib/sources/registry';
  import { normalizeSmallBundle } from '$lib/sources/smallBundle';
  import {
    analysisFacetForKey as findAnalysisFacetForKey,
    analysisFacetRows as getAnalysisFacetRows,
    analysisHierarchiesForFacet as findAnalysisHierarchiesForFacet,
    analysisHierarchyValueForRoute as findAnalysisHierarchyValueForRoute,
    analysisLabelForRoute,
    analysisNodeForRoute as findAnalysisNodeForRoute,
    colorForType,
    displayValue,
    facetLabel,
    facetSummary as getFacetSummary,
    formatPercent,
    isHttpUrl as isUrl,
    orderedFacetKeys,
    relationshipTitle as formatRelationshipTitle,
    routeForAnalysisNode,
    smallRelationshipKind as getSmallRelationshipKind,
    smallRelationshipTitle as getSmallRelationshipTitle,
    timelineBucketFacetFilter
  } from '$lib/viewer/helpers';
  import './styles.css';

  const DEFAULT_BUNDLE = '../okf-bundle.json';
  const DEFAULT_REGISTRY = '../okf-registry.json';
  const VIEW_MODES: Array<{ id: ViewMode; label: string }> = [
    { id: 'reader', label: 'Reader' },
    { id: 'graph', label: 'Graph' },
    { id: 'links', label: 'Links' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'type', label: 'Type' },
    { id: 'resources', label: 'Resources' },
    { id: 'narrative', label: 'Narrative' }
  ];
  const FULL_INDEX_VIEWS = new Set<ViewMode>(['graph', 'links', 'timeline', 'type', 'resources', 'narrative']);
  const RELATIONSHIP_VIEWS = new Set<ViewMode>();
  const LARGE_FACET_KEYS = ['publisher', 'topic', 'format', 'tag', 'license', 'host', 'resource_type', 'update_year', 'govuk_linked', 'publisher_family', 'publisher_state'];
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

  type AnyLargeRecord = Partial<LargeDataset & SearchResultDoc>;
  type ContextLink = { label: string; url: string; description?: string };

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
    count?: number;
  };

  type GraphPoint = { x: number; y: number };
  type GraphBox = { x: number; y: number; w: number; h: number };
  type GraphLabel = {
    x: number;
    y: number;
    anchor: 'start' | 'end' | 'middle';
    text: string;
    box: GraphBox;
    stable: boolean;
  };
  type GraphViewport = { x: number; y: number; w: number; h: number; baseW: number; baseH: number };

  let bundleUrl = $state(DEFAULT_BUNDLE);
  let source = $state<LoadedSource | null>(null);
  let error = $state('');
  let loading = $state(false);
  let activeView = $state<ViewMode>('reader');
  let selectedId = $state('');
  let inspectedId = $state('');
  let smallInspectedRelationship = $state<OkfRelationship | null>(null);
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
  let largeHighlightedEdge = $state('');
  let largeInspectedEdge = $state<LargeGraphEdge | null>(null);
  let largeExpandedStackRoute = $state('');
  let largeIndex = $state<LargeFullIndex | null>(null);
  let largeRelationships = $state<LargeRelationship[]>([]);
  let largeRelationshipsByRoute = $state<Map<string, LargeRelationship[]>>(new Map());
  let largeFacetFilters = $state<Record<string, string[]>>({});
  let largeFullLoading = $state(false);
  let largeRelationshipsLoading = $state(false);
  let largeSearching = $state(false);
  let largeFacetHydratingKey = $state('');
  let largePreserveSelectionUntilSearch = $state(false);
  let largeSearchClient = $state<LargeSearchClient | null>(null);
  let largeSearchRequest = 0;
  let loadRequest = 0;
  let largeApiRoute = $state('');
  let largeApiUrl = $state('');
  let largeApiJson = $state<unknown>(null);
  let largeApiLoading = $state(false);
  let largeApiError = $state('');
  let largeApiRequest = 0;
  let activeFacetKey = $state('publisher');
  let pins = $state<string[]>([]);
  let graphZoom = $state(1);
  let graphViewport = $state<GraphViewport>({ x: 0, y: 0, w: GRAPH_WIDTH, h: GRAPH_HEIGHT, baseW: GRAPH_WIDTH, baseH: GRAPH_HEIGHT });
  let graphDrag = $state<{ x: number; y: number; box: GraphViewport; moved: boolean } | null>(null);
  let graphSuppressClick = $state(false);
  let graphLabelPhase = $state(0);
  let spreadPins = $state(false);

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
    const labelTimer = window.setInterval(() => {
      if (activeView === 'graph') graphLabelPhase = (graphLabelPhase + 1) % 100000;
    }, 2200);
    return () => {
      window.removeEventListener('popstate', applyBrowserRoute);
      window.clearInterval(labelTimer);
    };
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

  function safeDecodeHash(): string {
    const raw = location.hash.replace(/^#/, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      // Malformed percent-encoding in a shared link should not break routing.
      return raw;
    }
  }

  function toAbsoluteUrl(url: string): string {
    return new URL(url, location.href).toString();
  }

  function buildExplorerUrl(route: string): string {
    const next = new URL(location.href);
    const absoluteDefault = toAbsoluteUrl(DEFAULT_BUNDLE);
    if (bundleUrl === absoluteDefault) next.searchParams.delete('bundle');
    else next.searchParams.set('bundle', bundleUrl);
    if (activeView === 'reader') next.searchParams.delete('view');
    else next.searchParams.set('view', activeView);
    if (source?.kind === 'large' && largeQuery.trim()) next.searchParams.set('q', largeQuery.trim());
    else next.searchParams.delete('q');
    next.hash = route || (source?.kind === 'large' ? 'overview' : '');
    return next.toString();
  }

  function syncExplorerUrl() {
    const route = source?.kind === 'large' ? largeSelectedRoute : selectedId;
    replaceState(buildExplorerUrl(route), {});
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
    const hash = safeDecodeHash();
    if (source?.kind === 'large') {
      largeSelectedRoute = hash && hash !== 'overview' ? hash : '';
      largeInspectedRoute = '';
      if (largeSelectedRoute && FULL_INDEX_VIEWS.has(activeView)) void ensureLargeFullIndex();
      reconcileLargeSelection();
    } else if (smallCorpus && hash && smallCorpus.nodes[hash]) {
      selectedId = hash;
      inspectedId = '';
      smallInspectedRelationship = null;
    }
  }

  async function loadSource(url: string) {
    const requestId = ++loadRequest;
    const absoluteUrl = toAbsoluteUrl(url);
    loading = true;
    error = '';
    selectedId = '';
    inspectedId = '';
    smallInspectedRelationship = null;
    largeSelectedRoute = '';
    largeInspectedRoute = '';
    largeHighlightedRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    largeExpandedStackRoute = '';
    clearLargeApiPanel();
    largeAppliedQuery = '';
    largeResults = [];
    largeSuggestions = [];
    largeIndex = null;
    largeRelationships = [];
    largeRelationshipsByRoute = new Map();
    largeFacetFilters = {};
    largeFacetHydratingKey = '';
    largePreserveSelectionUntilSearch = false;
    activeFacetKey = 'publisher';
    largeSearchClient?.destroy();
    largeSearchClient = null;
    try {
      const parsed = new URL(absoluteUrl);
      if (parsed.origin !== location.origin && parsed.protocol !== 'https:') {
        throw new Error('Only https:// bundle URLs (or same-origin paths) can be loaded.');
      }
      const raw = await fetchJson<Record<string, unknown>>(absoluteUrl);
      if (requestId !== loadRequest) return;
      if (raw.kind === 'okf-large-corpus') {
        const large = await loadLargeCorpus(absoluteUrl);
        if (requestId !== loadRequest) return;
        source = large;
        const searchManifest = large.descriptor.entrypoints.search_manifest || large.manifest.indexes.search;
        if (searchManifest) {
          const client = new LargeSearchClient();
          try {
            await client.init(large.baseUrl, resolveUrl(searchManifest, large.baseUrl));
            if (requestId !== loadRequest) {
              client.destroy();
              return;
            }
            largeSearchClient = client;
          } catch (searchError) {
            // A missing or broken search index must not discard a loaded corpus.
            client.destroy();
            if (requestId !== loadRequest) return;
            console.warn(`Search index unavailable for ${absoluteUrl}:`, searchError);
          }
        }
        history = rememberHistory({ url: absoluteUrl, title: large.descriptor.title, description: large.descriptor.description, kind: 'large-corpus' });
        bundleUrl = absoluteUrl;
        const params = new URLSearchParams(location.search);
        const query = params.get('q') || '';
        const hash = safeDecodeHash();
        if (hash && hash !== 'overview') {
          largeSelectedRoute = hash;
          largeInspectedRoute = hash;
          largeHighlightedRoute = hash;
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
        const hash = safeDecodeHash();
        selectedId = hash && corpus.nodes[hash] ? hash : Object.keys(corpus.nodes)[0] || '';
      }
      syncBundleUrlParam(absoluteUrl);
      suggestionsOpen = false;
    } catch (err) {
      if (requestId !== loadRequest) return;
      source = null;
      error = err instanceof Error ? err.message : String(err);
    } finally {
      if (requestId === loadRequest) loading = false;
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
    if (largeHasAnalysisOverview(view)) return;
    if (FULL_INDEX_VIEWS.has(view) || RELATIONSHIP_VIEWS.has(view)) await ensureLargeFullIndex();
    if (RELATIONSHIP_VIEWS.has(view)) await ensureLargeRelationships();
  }

  function largeIsOverviewContext(): boolean {
    if (source?.kind !== 'large') return false;
    return (
      !largeSelectedRoute &&
      !largeInspectedRoute &&
      !largeAppliedQuery.trim() &&
      !largeQuery.trim() &&
      activeLargeFilterCount === 0
    );
  }

  function largeHasAnalysisOverview(view: ViewMode = activeView): boolean {
    if (!largeIsOverviewContext()) return false;
    const analysis = largeAnalysis();
    if (!analysis) return false;
    if (view === 'reader') {
      return Boolean(analysis.summary || analysis.narrative || analysis.graph_overview?.nodes?.length || analysis.facet_analysis?.length);
    }
    if (view === 'graph') return Boolean(analysis.graph_overview?.nodes?.length);
    if (view === 'links') {
      return Boolean(analysis.relationship_overview?.types?.length || analysis.relationship_overview?.top_connected?.length);
    }
    if (view === 'timeline') return Boolean(analysis.timeline_overview?.buckets?.length);
    if (view === 'type') return Boolean(analysis.facet_analysis?.length);
    if (view === 'resources') {
      const distributions = analysis.resource_overview?.distributions;
      return Boolean(
        analysis.resource_overview?.high_resource_datasets?.length ||
          (distributions && Object.values(distributions).some((rows) => rows.length))
      );
    }
    if (view === 'narrative') return Boolean(analysis.narrative?.body || analysis.summary?.description);
    return false;
  }

  async function ensureLargeFullIndex(): Promise<LargeFullIndex | null> {
    if (source?.kind !== 'large') return null;
    if (largeIndex) return largeIndex;
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

  async function openLargeFacet(key: string) {
    activeFacetKey = key;
    if (!largeIndex) {
      largeFacetHydratingKey = key;
      await ensureLargeFullIndex();
      if (largeFacetHydratingKey === key) largeFacetHydratingKey = '';
    }
  }

  async function ensureLargeRelationships(): Promise<LargeRelationship[]> {
    if (source?.kind !== 'large') return [];
    largeRelationshipsLoading = true;
    try {
      if (!largeRelationships.length) {
        largeRelationships = await source.loadRelationships();
        largeRelationshipsByRoute = indexLargeRelationships(largeRelationships);
      }
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
    smallInspectedRelationship = null;
    activeView = activeView || 'reader';
    syncExplorerUrl();
  }

  function inspectNode(id: string) {
    inspectedId = id;
    smallInspectedRelationship = null;
    rightCollapsed = false;
  }

  function selectLargeRoute(route: string) {
    if (!largeRouteInReduction(route)) return;
    largeSelectedRoute = route;
    largeInspectedRoute = '';
    largeHighlightedRoute = route;
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    clearLargeApiPanel();
    rightCollapsed = false;
    if (FULL_INDEX_VIEWS.has(activeView)) void ensureLargeFullIndex();
    if (RELATIONSHIP_VIEWS.has(activeView)) void ensureLargeRelationships();
    syncExplorerUrl();
  }

  function inspectLargeRoute(route: string) {
    if (!largeRouteCanInteract(route)) return;
    largeInspectedRoute = route;
    largeHighlightedRoute = route;
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    clearLargeApiPanel();
    rightCollapsed = false;
    if (FULL_INDEX_VIEWS.has(activeView)) void ensureLargeFullIndex();
    if (RELATIONSHIP_VIEWS.has(activeView)) void ensureLargeRelationships();
  }

  function recenterLargeRoute(route: string) {
    const facetRoute = routeForAnalysisNode(route);
    if (facetRoute) {
      applyAnalysisFacet(facetRoute.key, facetRoute.value);
      activeView = 'graph';
      return;
    }
    if (route.startsWith('resource-stack/')) {
      largeExpandedStackRoute = route.replace(/^resource-stack\//, '');
      return;
    }
    if (!largeRouteCanInteract(route)) return;
    largeSelectedRoute = route;
    largeInspectedRoute = '';
    largeHighlightedRoute = route;
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    clearLargeApiPanel();
    activeView = 'graph';
    void hydrateForView('graph');
    syncExplorerUrl();
  }

  function copyRoute(routeOverride?: string | Event) {
    const explicitRoute = typeof routeOverride === 'string' ? routeOverride : '';
    let route = location.href;
    if (source?.kind === 'small' && detailNode) {
      route = buildExplorerUrl(explicitRoute || detailNode.id);
    } else if (source?.kind === 'large') {
      route = buildExplorerUrl(explicitRoute || largeInspectedRoute || largeSelectedRoute);
    }
    void navigator.clipboard?.writeText(route);
  }

  function pinRoute(route = source?.kind === 'large' ? largeSelectedRoute || largeInspectedRoute : selectedId) {
    if (!route) return;
    pins = [route, ...pins.filter((item) => item !== route)].slice(0, 20);
    savePins();
  }

  function clearInspection() {
    if (source?.kind === 'large') {
      largeInspectedRoute = '';
      largeHighlightedRoute = largeSelectedRoute;
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
      clearLargeApiPanel();
    } else {
      inspectedId = '';
      smallInspectedRelationship = null;
    }
  }

  function clearLargeApiPanel() {
    largeApiRequest += 1;
    largeApiRoute = '';
    largeApiUrl = '';
    largeApiJson = null;
    largeApiError = '';
    largeApiLoading = false;
  }

  async function loadLargeApiJson(route: string, url: unknown) {
    if (!route || !isUrl(url)) return;
    const requestId = largeApiRequest + 1;
    largeApiRequest = requestId;
    largeApiRoute = route;
    largeApiUrl = url;
    largeApiJson = null;
    largeApiError = '';
    largeApiLoading = true;
    try {
      const nextJson = await fetchJson<unknown>(url);
      if (requestId !== largeApiRequest || largeApiRoute !== route || largeApiUrl !== url) return;
      largeApiJson = nextJson;
    } catch (err) {
      if (requestId !== largeApiRequest || largeApiRoute !== route || largeApiUrl !== url) return;
      largeApiError = err instanceof Error ? err.message : String(err);
    } finally {
      if (requestId === largeApiRequest && largeApiRoute === route && largeApiUrl === url) largeApiLoading = false;
    }
  }

  function navigateBack() {
    if (source?.kind === 'large' && largeInspectedRoute && largeSelectedRoute && largeInspectedRoute !== largeSelectedRoute) {
      clearInspection();
      return;
    }
    if (source?.kind === 'small' && inspectedId) {
      clearInspection();
      return;
    }
    window.history.back();
  }

  function navigateForward() {
    window.history.forward();
  }

  function exportPins() {
    const payload = {
      exported_at: new Date().toISOString(),
      bundle: bundleUrl,
      pins
    };
    void navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
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

  function facetValueRoute(key: string, value: string): string {
    return `facet/${key}/${value}`;
  }

  function toggleLargeFacet(key: string, value: string) {
    const current = new Set(largeFacetFilters[key] || []);
    const route = facetValueRoute(key, value);
    const removing = current.has(value);
    activeFacetKey = key;
    if (removing) current.delete(value);
    else current.add(value);
    largeFacetFilters = { ...largeFacetFilters, [key]: [...current] };
    if (!current.size) {
      const { [key]: _removed, ...rest } = largeFacetFilters;
      largeFacetFilters = rest;
    }
    largeSelectedRoute = '';
    if (removing) {
      if (largeInspectedRoute === route) {
        largeInspectedRoute = '';
        largeHighlightedRoute = '';
      }
    } else {
      largeInspectedRoute = route;
      largeHighlightedRoute = route;
      rightCollapsed = false;
    }
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    clearLargeApiPanel();
    void ensureLargeFullIndex();
    reconcileLargeSelection();
    syncExplorerUrl();
  }

  function clearLargeFilters() {
    largeFacetFilters = {};
    if (largeInspectedRoute && routeForAnalysisNode(largeInspectedRoute)) {
      largeInspectedRoute = '';
      largeHighlightedRoute = '';
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
    }
    reconcileLargeSelection();
    syncExplorerUrl();
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

  function trimmedEdgePoints(source: GraphPoint, target: GraphPoint, pad = 28) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const trim = Math.min(pad, length / 3);
    const ux = dx / length;
    const uy = dy / length;
    return {
      x1: source.x + ux * trim,
      y1: source.y + uy * trim,
      x2: target.x - ux * trim,
      y2: target.y - uy * trim
    };
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

  function smallRelationshipKind(relationship: OkfRelationship): string {
    return getSmallRelationshipKind(relationship);
  }

  function smallRelationshipTitle(relationship: OkfRelationship): string {
    return getSmallRelationshipTitle(relationship, smallCorpus?.nodes);
  }

  function inspectSmallRelationship(relationship: OkfRelationship) {
    smallInspectedRelationship = relationship;
    inspectedId = '';
    rightCollapsed = false;
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
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
      clearLargeApiPanel();
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
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
      clearLargeApiPanel();
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
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    clearLargeApiPanel();
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
    if (kind === 'topic') return largeVisibleDatasets.some((dataset) => (dataset.topics || []).includes(value));
    if (kind === 'tag') return largeVisibleDatasets.some((dataset) => (dataset.tags || []).includes(value));
    if (kind === 'license') return largeVisibleDatasets.some((dataset) => dataset.license_id === value);
    if (kind === 'host') return largeVisibleDatasets.some((dataset) => largeDatasetFacetValues(dataset, 'host').includes(value));
    if (kind === 'resource_type') return largeVisibleDatasets.some((dataset) => largeDatasetFacetValues(dataset, 'resource_type').includes(value));
    if (kind === 'resource-stack') return largeRouteInReduction(value);
    return true;
  }

  function largeRouteKnown(route: string): boolean {
    if (!route || !largeIndex) return Boolean(route);
    const kind = routeKind(route);
    const value = routeValue(route);
    if (kind === 'dataset') {
      return largeIndex.datasetByName.has(value) || largeResults.some((result) => result.name === value);
    }
    if (kind === 'resource') return largeIndex.resourceById.has(value);
    if (kind === 'publisher') return largeIndex.publisherByName.has(value);
    if (kind === 'resource-stack') return largeRouteKnown(value);
    return Boolean(value || route);
  }

  function largeRouteCanInteract(route: string): boolean {
    if (!route) return false;
    if (largeRouteInReduction(route)) return true;
    if (activeView !== 'graph') return false;
    return largeRouteKnown(route);
  }

  function reconcileLargeSelection(preserveIfStillVisible = true) {
    if (source?.kind !== 'large') return;
    if (preserveIfStillVisible && largePreserveSelectionUntilSearch && largeAppliedQuery.trim() && !largeResults.length) return;
    if (!preserveIfStillVisible) {
      largeSelectedRoute = '';
      largeInspectedRoute = '';
      largeHighlightedRoute = '';
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
      clearLargeApiPanel();
      return;
    }
    if (largeSelectedRoute && !largeRouteInReduction(largeSelectedRoute)) largeSelectedRoute = '';
    if (largeInspectedRoute && !largeRouteInReduction(largeInspectedRoute)) largeInspectedRoute = '';
    if (largeHighlightedRoute && !largeRouteInReduction(largeHighlightedRoute)) largeHighlightedRoute = '';
    if (largeHighlightedEdge && !largeHighlightedRoute) largeHighlightedEdge = '';
  }

  function visibleLargeDatasets(): LargeDataset[] {
    if (!largeIndex) return [];
    const queryActive = Boolean(largeAppliedQuery.trim());
    const rows = largeIndex.datasets.filter((dataset) => {
      if (queryActive && !largeResultNames.has(dataset.name)) return false;
      return datasetMatchesLargeFilters(dataset);
    });
    if (queryActive) {
      rows.sort((left, right) => (largeResultOrder.get(left.name) ?? 999999) - (largeResultOrder.get(right.name) ?? 999999));
    } else {
      rows.sort((left, right) => String(right.timestamp || right.metadata_modified || '').localeCompare(String(left.timestamp || left.metadata_modified || '')));
    }
    return rows;
  }

  function datasetMatchesLargeFilters(dataset: LargeDataset, exceptKey = ''): boolean {
    for (const [key, selected] of Object.entries(largeFacetFilters)) {
      if (key === exceptKey || !selected.length) continue;
      const values = largeDatasetFacetValues(dataset, key);
      if (!selected.some((value) => values.includes(value))) return false;
    }
    return true;
  }

  function largeDatasetFacetValues(dataset: LargeDataset, key: string): string[] {
    if (!largeIndex) return [];
    if (key === 'publisher') return dataset.publisher ? [dataset.publisher] : [];
    if (key === 'format') return dataset.formats || [];
    if (key === 'interaction_style') return Array.isArray(dataset.interaction_style) ? dataset.interaction_style.map(String) : dataset.formats || [];
    if (key === 'topic') return dataset.topics || [];
    if (key === 'tag') return dataset.tags || [];
    if (key === 'license') return dataset.license_id ? [dataset.license_id] : [];
    if (key === 'host') return [dataset.host, ...(dataset.resource_hosts || [])].filter((value): value is string => Boolean(value));
    if (key === 'govuk_linked') return (dataset.govuk_content_paths || []).length ? ['yes'] : ['no'];
    if (key === 'update_year') {
      const stamp = dataset.metadata_modified || dataset.timestamp || '';
      return stamp ? [String(stamp).slice(0, 4)] : [];
    }
    if (key === 'update_month') {
      const stamp = String(dataset.metadata_modified || dataset.timestamp || '');
      return /^\d{4}-\d{2}/.test(stamp) ? [stamp.slice(0, 7)] : [];
    }
    if (key === 'update_date') {
      const stamp = String(dataset.metadata_modified || dataset.timestamp || '');
      return /^\d{4}-\d{2}-\d{2}/.test(stamp) ? [stamp.slice(0, 10)] : [];
    }
    if (key === 'update_decade') {
      const year = Number(String(dataset.metadata_modified || dataset.timestamp || '').slice(0, 4));
      if (!Number.isFinite(year)) return [];
      const decade = String(Math.floor(year / 10) * 10);
      return [decade, `${decade}s`];
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
    const dynamicValue = dataset[key];
    if (Array.isArray(dynamicValue)) return dynamicValue.map(String).filter(Boolean);
    if (dynamicValue === undefined || dynamicValue === null || dynamicValue === '') return [];
    return [String(dynamicValue)];
  }

  function indexLargeRelationships(relationships: LargeRelationship[]): Map<string, LargeRelationship[]> {
    const index = new Map<string, LargeRelationship[]>();
    for (const relationship of relationships) {
      const sourceRows = index.get(relationship.source) || [];
      sourceRows.push(relationship);
      index.set(relationship.source, sourceRows);
      const targetRows = index.get(relationship.target) || [];
      targetRows.push(relationship);
      index.set(relationship.target, targetRows);
    }
    return index;
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
    const queryActive = Boolean(largeAppliedQuery.trim());
    for (const dataset of largeIndex.datasets) {
      if (queryActive && !largeResultNames.has(dataset.name)) continue;
      if (!datasetMatchesLargeFilters(dataset, key)) continue;
      for (const value of largeDatasetFacetValues(dataset, key)) counts.set(value, (counts.get(value) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
      .slice(0, 18);
  }

  function largeAnalysis() {
    return source?.kind === 'large' ? source.analysis : undefined;
  }

  function applyAnalysisFacet(key: string, value: string) {
    const route = facetValueRoute(key, value);
    activeFacetKey = key;
    largeFacetFilters = { ...largeFacetFilters, [key]: [value] };
    largeSelectedRoute = '';
    largeInspectedRoute = route;
    largeHighlightedRoute = route;
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    clearLargeApiPanel();
    rightCollapsed = false;
    void ensureLargeFullIndex();
    syncExplorerUrl();
  }

  function applyAnalysisTimelineBucket(bucket: ReturnType<typeof analysisTimelineBuckets>[number]) {
    const filter = timelineBucketFacetFilter(bucket);
    if (!filter) return;
    applyAnalysisFacet(filter.key, filter.value);
  }

  function analysisFacetRows() {
    return getAnalysisFacetRows(largeAnalysis(), source?.kind === 'large' ? source.overview.facet_previews || {} : {});
  }

  function analysisTimelineBuckets() {
    return largeAnalysis()?.timeline_overview?.buckets || [];
  }

  function analysisRelationshipTypes() {
    return largeAnalysis()?.relationship_overview?.types || [];
  }

  function analysisTopConnected() {
    return largeAnalysis()?.relationship_overview?.top_connected || [];
  }

  function analysisResourceStacks() {
    return largeAnalysis()?.resource_overview?.high_resource_datasets || [];
  }

  function analysisResourceDistributionRows() {
    const distributions = largeAnalysis()?.resource_overview?.distributions || {};
    return Object.entries(distributions)
      .flatMap(([key, rows]) =>
        rows.slice(0, 8).map((row) => ({
          key,
          value: row.value,
          count: row.count
        }))
      )
      .slice(0, 32);
  }

  function analysisNodeForRoute(route: string) {
    return findAnalysisNodeForRoute(largeAnalysis(), route);
  }

  function analysisFacetForKey(key: string) {
    return findAnalysisFacetForKey(largeAnalysis(), key, source?.kind === 'large' ? source.overview.facet_previews || {} : {});
  }

  function analysisHierarchiesForFacet(key: string) {
    return findAnalysisHierarchiesForFacet(largeAnalysis(), key);
  }

  function analysisHierarchyValueForRoute(route: string) {
    return findAnalysisHierarchyValueForRoute(largeAnalysis(), route);
  }

  function orderedLargeFacetKeys() {
    return orderedFacetKeys(largeAnalysis(), largeFacetKeys, LARGE_FACET_KEYS, source?.kind === 'large' ? source.overview.facet_previews || {} : {});
  }

  function facetSummary(key: string): string {
    return getFacetSummary(largeAnalysis(), key, source?.kind === 'large' ? source.overview.facet_previews || {} : {});
  }

  function facetSelectedValues(key: string): string[] {
    return largeFacetFilters[key] || [];
  }

  function facetAvailableValueCount(key: string): number {
    const meta = analysisFacetForKey(key);
    return (
      largeIndex?.facets[key]?.length ||
      meta?.cardinality ||
      (source?.kind === 'large' ? source.overview.facet_previews?.[key]?.length || 0 : 0)
    );
  }

  function facetSummaryBadge(key: string): string {
    const selected = facetSelectedValues(key).length;
    if (selected) return `${selected} selected`;
    if (largeFacetHydratingKey === key || (largeFullLoading && activeFacetKey === key && !largeIndex)) return 'Loading';
    const available = facetAvailableValueCount(key);
    return available ? `${available} values` : 'Load';
  }

  function largeVocabulary(key: string, fallback: string): string {
    if (source?.kind !== 'large') return fallback;
    return source.descriptor.vocabulary?.[key] || fallback;
  }

  function recordSingular(): string {
    return largeVocabulary('record_singular', 'dataset');
  }

  function recordPlural(): string {
    return largeVocabulary('record_plural', 'datasets');
  }

  function resourceSingular(): string {
    return largeVocabulary('resource_singular', 'resource');
  }

  function resourcePlural(): string {
    return largeVocabulary('resource_plural', 'resources');
  }

  function publisherSingular(): string {
    return largeVocabulary('publisher_singular', 'publisher');
  }

  function publisherPlural(): string {
    return largeVocabulary('publisher_plural', 'publishers');
  }

  function formatPlural(): string {
    return largeVocabulary('format_plural', 'formats');
  }

  function resourceStackLabel(): string {
    return largeVocabulary('resource_stack_label', 'Resource stack');
  }

  function searchPlaceholder(): string {
    return largeVocabulary('search_placeholder', 'Search static index');
  }

  function primaryUrlLabel(): string {
    return recordSingular().toLowerCase().includes('api') ? 'Endpoint URL' : 'Landing URL';
  }

  function capitalise(value: string): string {
    return value ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;
  }

  function recordString(record: AnyLargeRecord | undefined, key: string): string {
    const value = (record as Record<string, unknown> | undefined)?.[key];
    return typeof value === 'string' ? value : '';
  }

  function apiContextNote(record: AnyLargeRecord | undefined): string {
    return recordString(record, 'context_note');
  }

  function apiRecordMeta(record: AnyLargeRecord | undefined): string {
    const recordType = recordString(record, 'record_type') || recordString(record, 'type');
    const sourceAdapter = recordString(record, 'source_adapter');
    const confidence = recordString(record, 'confidence');
    const endpointHost = recordString(record, 'endpoint_host');
    const documentationHost = recordString(record, 'documentation_host');
    const accessModel = recordString(record, 'access_model');
    const contractStatus = recordString(record, 'contract_status');
    const formats = Array.isArray(record?.protocol)
      ? record.protocol.map(String).slice(0, 2).join(', ')
      : Array.isArray(record?.formats)
        ? record.formats.map(String).slice(0, 2).join(', ')
        : '';
    return [
      recordType,
      sourceAdapter ? `source ${sourceAdapter}` : '',
      confidence ? `confidence ${confidence}` : '',
      endpointHost && endpointHost !== 'not-specified' ? `endpoint ${endpointHost}` : '',
      documentationHost && documentationHost !== 'not-specified' ? `docs ${documentationHost}` : '',
      accessModel ? `access ${accessModel}` : '',
      contractStatus ? `contract ${contractStatus}` : '',
      formats
    ]
      .filter(Boolean)
      .join(' · ');
  }

  function contextLinks(record: AnyLargeRecord | undefined): ContextLink[] {
    const links = (record as Record<string, unknown> | undefined)?.context_links;
    if (!Array.isArray(links)) return [];
    return links
      .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>) : null))
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item.url === 'string' && typeof item.label === 'string'))
      .map((item) => ({
        label: String(item.label),
        url: String(item.url),
        description: typeof item.description === 'string' ? item.description : undefined
      }));
  }

  function acronymExpansions(record: AnyLargeRecord | undefined): Array<{ acronym: string; expanded: string; source_url?: string }> {
    const expansions = (record as Record<string, unknown> | undefined)?.acronym_expansions;
    if (!Array.isArray(expansions)) return [];
    return expansions
      .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>) : null))
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item.acronym === 'string' && typeof item.expanded === 'string'))
      .map((item) => ({
        acronym: String(item.acronym),
        expanded: String(item.expanded),
        source_url: typeof item.source_url === 'string' ? item.source_url : undefined
      }));
  }

  function currentLargeContextLabel(): string {
    if (largeSelectedRoute || largeInspectedRoute) return largeLabelForRoute(largeInspectedRoute || largeSelectedRoute);
    if (largeAppliedQuery.trim()) return `Search: ${largeAppliedQuery.trim()}`;
    const filters = Object.entries(largeFacetFilters).flatMap(([key, values]) => values.map((value) => `${facetLabel(key)}: ${value}`));
    if (filters.length) return filters.join(', ');
    return largeAnalysis()?.narrative?.title || largeAnalysis()?.summary?.title || (source?.kind === 'large' ? source.descriptor.title : 'Overview');
  }

  function selectedLargeFilterLabels() {
    return Object.entries(largeFacetFilters).flatMap(([key, values]) =>
      values.map((value) => ({ key, value, label: `${facetLabel(key)}: ${value}` }))
    );
  }

  function largeContextMetrics() {
    const counts = source?.kind === 'large' ? source.manifest.counts : {};
    const hasApiCounts =
      counts.declared_api_products !== undefined || counts.provider_native_api_products !== undefined || counts.data_access_endpoints !== undefined || counts.data_products !== undefined;
    if (largeIndex) {
      const publisherCount = new Set(largeVisibleDatasets.map((dataset) => dataset.publisher).filter(Boolean)).size;
      const resourceCount = largeVisibleDatasets.reduce((total, dataset) => total + (dataset.resource_count || 0), 0);
      if (hasApiCounts) {
        return [
          { label: 'API products', value: largeVisibleDatasets.filter((dataset) => dataset.record_type === 'API Product').length },
          { label: 'data endpoints', value: largeVisibleDatasets.filter((dataset) => dataset.record_type === 'Data Access API Endpoint').length },
          { label: 'data products', value: largeVisibleDatasets.filter((dataset) => dataset.record_type === 'Data Product').length },
          { label: 'active filters', value: activeLargeFilterCount }
        ];
      }
      return [
        { label: recordPlural(), value: largeVisibleDatasets.length },
        { label: resourcePlural(), value: resourceCount },
        { label: publisherPlural(), value: publisherCount },
        { label: 'active filters', value: activeLargeFilterCount }
      ];
    }
    const summary = largeAnalysis()?.summary;
    if (hasApiCounts) {
      return [
        { label: 'API products', value: (counts.api_products || 0) as number },
        { label: 'data endpoints', value: (counts.data_access_endpoints || 0) as number },
        { label: 'data products', value: (counts.data_products || 0) as number },
        { label: 'active filters', value: activeLargeFilterCount }
      ];
    }
    return [
      { label: recordPlural(), value: summary?.record_count || counts.datasets || 0 },
      { label: resourcePlural(), value: summary?.resource_count || counts.resources || 0 },
      { label: 'relationships', value: summary?.relationship_count || counts.relationships || 0 },
      { label: 'active filters', value: activeLargeFilterCount }
    ];
  }

  function topContextFacetValues(key: string, limit = 6) {
    return largeFacetRows(key).slice(0, limit);
  }

  function overviewEntryPoints() {
    const analysis = largeAnalysis();
    const publisherEntries = (source?.kind === 'large' ? source.overview.top_publishers || [] : []).slice(0, 6).map((item) => ({
      label: String(item.label || item.id || capitalise(publisherSingular())),
      meta: `${Number(item.dataset_count || 0).toLocaleString()} ${recordPlural()}`,
      route: `facet/publisher/${String(item.id || '').replace(/^publisher\//, '')}`
    }));
    const recentEntries = (source?.kind === 'large' ? source.overview.recent_datasets || [] : []).slice(0, 6).map((item) => ({
      label: item.title,
      meta: `${item.publisher_title} · ${item.resource_count} ${resourcePlural()}`,
      route: datasetRoute(item)
    }));
    const analysisEntries =
      analysis?.graph_overview?.nodes
        .filter((node) => node.id.startsWith('facet/'))
        .slice(0, 6)
        .map((node) => ({
          label: node.label,
          meta: `${(node.count || 0).toLocaleString()} ${recordPlural()}`,
          route: node.id
        })) || [];
    return [...analysisEntries, ...publisherEntries, ...recentEntries].slice(0, 12);
  }

  function openOverviewEntry(route: string) {
    const facetRoute = routeForAnalysisNode(route);
    if (facetRoute) {
      applyAnalysisFacet(facetRoute.key, facetRoute.value);
      return;
    }
    const overviewResult = source?.kind === 'large' ? source.overview.recent_datasets?.find((item) => datasetRoute(item) === route) : undefined;
    if (overviewResult) chooseLargeResult(overviewResult);
    else selectLargeRoute(route);
  }

  function openHierarchyValue(key: string, route: string | undefined, label: string) {
    const facetRoute = route ? routeForAnalysisNode(route) : null;
    if (facetRoute) applyAnalysisFacet(facetRoute.key, facetRoute.value);
    else applyAnalysisFacet(key, label);
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

  function jsonText(value: unknown): string {
    return JSON.stringify(value, null, 2);
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
    const analysisLabel = analysisLabelForRoute(largeAnalysis(), route);
    if (analysisLabel) return analysisLabel;
    const kind = routeKind(route);
    const value = routeValue(route);
    if (kind === 'dataset') {
      return largeIndex?.datasetByName.get(value)?.title || largeResults.find((result) => result.name === value)?.title || value;
    }
    if (kind === 'resource') return largeIndex?.resourceById.get(value)?.name || value;
    if (kind === 'publisher') return largeIndex?.publisherByName.get(value)?.title || value;
    if (kind === 'resource-stack') {
      const datasetName = value.replace(/^dataset\//, '');
      const dataset = largeIndex?.datasetByName.get(datasetName);
      return `${resourceStackLabel()}: ${dataset?.title || datasetName}`;
    }
    return value || route;
  }

  function routeRelationships(route: string, limit = 120): LargeRelationship[] {
    if (!route || !largeRelationships.length) return [];
    const indexedRows = largeRelationshipsByRoute.get(route);
    if (indexedRows) return indexedRows.slice(0, limit);
    const rows: LargeRelationship[] = [];
    for (const relationship of largeRelationships) {
      if (relationship.source === route || relationship.target === route) {
        rows.push(relationship);
        if (rows.length >= limit) break;
      }
    }
    return rows;
  }

  function metadataRelationshipLabel(route: string): string {
    const analysisFacet = routeForAnalysisNode(route);
    if (analysisFacet) return `has ${facetLabel(analysisFacet.key)}`;
    const kind = routeKind(route);
    if (kind === 'publisher') return 'published by';
    if (kind === 'format') return 'has format';
    if (kind === 'topic') return 'classified as';
    if (kind === 'tag') return 'tagged';
    if (kind === 'license') return 'licensed as';
    if (kind === 'host') return 'landing host';
    if (kind === 'resource_type') return `has ${resourceSingular()} type`;
    if (kind === 'resource') return `has ${resourceSingular()}`;
    return 'related';
  }

  function datasetMatchesMetadataRoute(dataset: LargeDataset, route: string): boolean {
    if (!largeIndex || !route) return false;
    const analysisFacet = routeForAnalysisNode(route);
    if (analysisFacet) return largeDatasetFacetValues(dataset, analysisFacet.key).includes(analysisFacet.value);
    const kind = routeKind(route);
    const value = routeValue(route);
    if (kind === 'dataset') return dataset.name === value;
    if (kind === 'publisher') return dataset.publisher === value;
    if (kind === 'format') return (dataset.formats || []).includes(value);
    if (kind === 'topic') return (dataset.topics || []).includes(value);
    if (kind === 'tag') return (dataset.tags || []).includes(value);
    if (kind === 'license') return dataset.license_id === value;
    if (kind === 'host') return largeDatasetFacetValues(dataset, 'host').includes(value);
    if (kind === 'resource_type') return largeDatasetFacetValues(dataset, 'resource_type').includes(value);
    if (kind === 'resource') return largeIndex.resourceById.get(value)?.dataset === dataset.name;
    return false;
  }

  function datasetsForMetadataRoute(route: string, limit = 80): LargeDataset[] {
    if (!largeIndex) return [];
    return largeVisibleDatasets.filter((dataset) => datasetMatchesMetadataRoute(dataset, route)).slice(0, limit);
  }

  function resourcesForMetadataRoute(route: string, limit = 80): LargeResource[] {
    if (!largeIndex || !route) return [];
    const analysisFacet = routeForAnalysisNode(route);
    const kind = routeKind(route);
    const value = routeValue(route);
    if (kind === 'resource') {
      const resource = largeIndex.resourceById.get(value);
      return resource ? [resource] : [];
    }
    const resources: LargeResource[] = [];
    for (const dataset of datasetsForMetadataRoute(route, 220)) {
      for (const resource of largeIndex.resourcesByDataset.get(dataset.name) || []) {
        const facetKey = analysisFacet?.key || kind;
        const facetValue = analysisFacet?.value || value;
        if (facetKey === 'format' && resource.format !== facetValue) continue;
        if (facetKey === 'host' && resource.host !== facetValue) continue;
        if (facetKey === 'resource_type' && (resource.resource_type || 'unknown') !== facetValue) continue;
        resources.push(resource);
        if (resources.length >= limit) return resources;
      }
    }
    return resources;
  }

  function routeTypeLabel(route: string): string {
    const analysisFacet = routeForAnalysisNode(route);
    if (analysisFacet) return facetLabel(analysisFacet.key);
    const kind = routeKind(route);
    if (kind === 'dataset') return capitalise(recordSingular());
    if (kind === 'publisher') return capitalise(publisherSingular());
    if (kind === 'format') return 'Format';
    if (kind === 'topic') return 'Controlled topic';
    if (kind === 'license') return 'Licence';
    if (kind === 'tag') return 'Tag';
    if (kind === 'host') return 'Host';
    if (kind === 'resource_type') return `${capitalise(resourceSingular())} type`;
    if (kind === 'resource-stack') return resourceStackLabel();
    return kind ? `${kind.slice(0, 1).toUpperCase()}${kind.slice(1).replace(/_/g, ' ')}` : 'Route';
  }

  function relationshipTitle(edge: LargeGraphEdge): string {
    return formatRelationshipTitle(edge, largeLabelForRoute);
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
    if (!largeRouteCanInteract(route)) return null;
    return resolveLargeDetail(route);
  }

  function largeGraphModel(): { center: string; nodes: LargeGraphNode[]; relationships: LargeGraphEdge[] } {
    const analysis = largeAnalysis();
    if (largeHasAnalysisOverview('graph') && analysis?.graph_overview?.nodes?.length) {
      return {
        center: '',
        nodes: analysis.graph_overview.nodes.map((node) => ({
          id: node.id,
          label: node.label,
          type: node.type,
          count: node.count
        })),
        relationships: (analysis.graph_overview.edges || []).map((edge) => ({
          source: edge.source,
          target: edge.target,
          label: edge.label,
          count: edge.count
        }))
      };
    }

    const selectedCenter = largeSelectedRoute && largeRouteCanInteract(largeSelectedRoute) ? largeSelectedRoute : '';
    const center = selectedCenter;
    const nodeMap = new Map<string, LargeGraphNode>();
    const edges: LargeGraphEdge[] = [];
    const edgeKeys = new Set<string>();

    const addNode = (id: string, type = routeKind(id), label = largeLabelForRoute(id), count?: number, stackFor?: string) => {
      if (!id) return;
      if (!nodeMap.has(id)) nodeMap.set(id, { id, label, type, count, stackFor });
    };
    const addEdge = (sourceId: string, targetId: string, label: string) => {
      const key = `${sourceId}\u0000${targetId}\u0000${label}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
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
        for (const topic of (result.topics || []).slice(0, 8)) addEdge(center, `topic/${topic}`, 'classified as');
        for (const tag of (result.tags || []).slice(0, 8)) addEdge(center, `tag/${tag}`, 'tagged');
        if (result.resource_count > 0) {
          const stackId = `resource-stack/${center}`;
          addNode(stackId, 'resource-stack', `${capitalise(resourcePlural())} (${result.resource_count})`, result.resource_count, center);
          edges.push({ source: center, target: stackId, label: `has ${resourcePlural()}` });
        }
      }
    } else if (largeIndex && center.startsWith('dataset/')) {
      const datasetName = routeValue(center);
      const dataset = largeIndex.datasetByName.get(datasetName);
      if (dataset) {
        if (dataset.publisher) addEdge(center, publisherRoute(dataset.publisher), 'published by');
        for (const format of (dataset.formats || []).slice(0, 8)) addEdge(center, `format/${format}`, 'has format');
        for (const topic of (dataset.topics || []).slice(0, 8)) addEdge(center, `topic/${topic}`, 'classified as');
        for (const tag of (dataset.tags || []).slice(0, 8)) addEdge(center, `tag/${tag}`, 'tagged');
        if (dataset.license_id) addEdge(center, `license/${dataset.license_id}`, 'licensed as');
        const resources = largeIndex.resourcesByDataset.get(dataset.name) || [];
        if (resources.length > 8 && largeExpandedStackRoute !== center) {
          const stackId = `resource-stack/${center}`;
          addNode(stackId, 'resource-stack', `${capitalise(resourcePlural())} (${resources.length})`, resources.length, center);
          edges.push({ source: center, target: stackId, label: `has ${resourcePlural()}` });
        } else {
          for (const resource of resources.slice(0, 80)) addEdge(center, resourceRoute(resource), `has ${resourceSingular()}`);
        }
      }
    } else if (largeIndex && center) {
      const relationshipLabel = metadataRelationshipLabel(center);
      for (const dataset of datasetsForMetadataRoute(center, 84)) {
        const datasetId = datasetRoute(dataset);
        addEdge(datasetId, center, relationshipLabel);
      }
    } else if (!center && largeIndex) {
      for (const dataset of largeVisibleDatasets.slice(0, 64)) {
        const datasetId = datasetRoute(dataset);
        addNode(datasetId, 'dataset', dataset.title);
        if (dataset.publisher) addEdge(datasetId, publisherRoute(dataset.publisher), 'published by');
      }
    } else if (!center && !largeIndex) {
      for (const result of largeResults.slice(0, 42)) {
        const datasetId = datasetRoute(result);
        addNode(datasetId, 'dataset', result.title);
        if (result.publisher) addEdge(datasetId, publisherRoute(result.publisher), 'published by');
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

  function placeArc(positions: Map<string, GraphPoint>, nodes: LargeGraphNode[], cx: number, cy: number, radius: number, start: number, end: number) {
    if (!nodes.length) return;
    nodes.forEach((node, index) => {
      const t = nodes.length === 1 ? 0.5 : index / (nodes.length - 1);
      const angle = start + (end - start) * t;
      positions.set(node.id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    });
  }

  function placeGrid(
    positions: Map<string, GraphPoint>,
    nodes: LargeGraphNode[],
    startX: number,
    startY: number,
    columns: number,
    cellW: number,
    cellH: number
  ) {
    nodes.forEach((node, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      positions.set(node.id, { x: startX + col * cellW, y: startY + row * cellH });
    });
  }

  function largeOverviewGraphPositions(model: ReturnType<typeof largeGraphModel>) {
    const positions = new Map<string, GraphPoint>();
    const root = model.nodes.find((node) => node.id === 'corpus/overview') || model.nodes[0];
    if (!root) return positions;
    positions.set(root.id, { x: GRAPH_WIDTH * 0.49, y: GRAPH_HEIGHT * 0.53 });

    const groups: Record<string, LargeGraphNode[]> = {
      publisher_family: [],
      format: [],
      topic: [],
      tag: [],
      license: [],
      host: [],
      update_year: [],
      other: []
    };
    for (const node of model.nodes.filter((item) => item.id !== root.id)) {
      const facet = routeForAnalysisNode(node.id)?.key || node.type;
      const key = groups[facet] ? facet : 'other';
      groups[key].push(node);
    }
    Object.values(groups).forEach((nodes) => nodes.sort((left, right) => (right.count || 0) - (left.count || 0) || left.label.localeCompare(right.label)));

    placeGrid(positions, groups.format.slice(0, 10), GRAPH_WIDTH * 0.17, GRAPH_HEIGHT * 0.12, 5, 102, 52);
    placeGrid(positions, groups.topic.slice(0, 10), GRAPH_WIDTH * 0.07, GRAPH_HEIGHT * 0.16, 1, 96, 44);
    placeGrid(positions, groups.tag.slice(0, 6), GRAPH_WIDTH * 0.08, GRAPH_HEIGHT * 0.58, 1, 88, 44);
    placeGrid(positions, groups.update_year.slice(0, 8), GRAPH_WIDTH * 0.27, GRAPH_HEIGHT * 0.35, 2, 86, 54);
    placeGrid(positions, groups.license.slice(0, 6), GRAPH_WIDTH * 0.35, GRAPH_HEIGHT * 0.79, 6, 76, 48);
    placeGrid(positions, groups.host.slice(0, 8), GRAPH_WIDTH * 0.76, GRAPH_HEIGHT * 0.12, 1, 92, 48);
    placeGrid(positions, groups.publisher_family.slice(0, 6), GRAPH_WIDTH * 0.76, GRAPH_HEIGHT * 0.53, 1, 92, 50);
    placeGrid(positions, groups.other, GRAPH_WIDTH * 0.55, GRAPH_HEIGHT * 0.25, 2, 94, 54);
    return positions;
  }

  function largeGraphPositions(model: ReturnType<typeof largeGraphModel>) {
    if (!model.center && model.nodes.some((node) => node.id === 'corpus/overview')) return largeOverviewGraphPositions(model);
    const center = model.center && model.nodes.some((node) => node.id === model.center) ? model.center : model.nodes[0]?.id;
    const positions = new Map<string, GraphPoint>();
    if (model.center && center) {
      const centerType = routeKind(center);
      const cx = centerType === 'publisher' ? GRAPH_WIDTH * 0.27 : GRAPH_WIDTH * 0.5;
      const cy = GRAPH_HEIGHT * 0.54;
      positions.set(center, { x: cx, y: cy });
      const groups: Record<string, LargeGraphNode[]> = {
        publisher: [],
        dataset: [],
        resource: [],
        'resource-stack': [],
        format: [],
        topic: [],
        license: [],
        tag: [],
        host: [],
        resource_type: [],
        route: []
      };
      for (const node of model.nodes.filter((item) => item.id !== center)) {
        const key = groups[node.type] ? node.type : 'route';
        groups[key].push(node);
      }
      Object.values(groups).forEach((nodes) => nodes.sort((left, right) => left.label.localeCompare(right.label)));
      if (centerType === 'publisher') {
        placeGrid(positions, [...groups.dataset, ...groups.resource], GRAPH_WIDTH * 0.34, GRAPH_HEIGHT * 0.16, 6, 78, 58);
        placeArc(positions, [...groups.format, ...groups.license, ...groups.topic, ...groups.tag], cx, cy, GRAPH_HEIGHT * 0.32, -2.3, -1.1);
      } else {
        placeArc(positions, groups.publisher, cx, cy, GRAPH_HEIGHT * 0.31, -0.22, 0.25);
        placeGrid(positions, [...groups.resource, ...groups['resource-stack']], GRAPH_WIDTH * 0.13, GRAPH_HEIGHT * 0.18, 5, 82, 64);
        placeArc(positions, [...groups.format, ...groups.license], cx, cy, GRAPH_HEIGHT * 0.31, -2.4, -1.32);
        placeArc(positions, groups.topic, cx, cy, GRAPH_HEIGHT * 0.34, 2.05, 2.75);
        placeArc(positions, groups.tag, cx, cy, GRAPH_HEIGHT * 0.37, 2.85, 3.82);
        placeArc(positions, [...groups.host, ...groups.resource_type, ...groups.dataset, ...groups.route], cx, cy, GRAPH_HEIGHT * 0.28, -1.08, -0.55);
      }
      return positions;
    }
    if (center) positions.set(center, { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 });
    const others = model.nodes.filter((node) => node.id !== center);
    const publishers = model.nodes.filter((node) => node.type === 'publisher').sort((left, right) => left.label.localeCompare(right.label));
    const datasets = model.nodes.filter((node) => node.type === 'dataset').sort((left, right) => left.label.localeCompare(right.label));
    const other = others.filter((node) => node.type !== 'publisher' && node.type !== 'dataset');
    const columns = Math.max(1, Math.ceil(Math.sqrt(datasets.length)));
    const cellW = Math.min(92, (GRAPH_WIDTH * 0.58) / columns);
    const cellH = 58;
    const rows = Math.ceil(datasets.length / columns);
    placeGrid(positions, datasets, GRAPH_WIDTH * 0.18, GRAPH_HEIGHT * 0.5 - ((rows - 1) * cellH) / 2, columns, cellW, cellH);
    placeArc(positions, publishers, GRAPH_WIDTH * 0.78, GRAPH_HEIGHT * 0.5, GRAPH_HEIGHT * 0.28, -1.0, 1.0);
    placeArc(positions, other, GRAPH_WIDTH * 0.5, GRAPH_HEIGHT * 0.5, GRAPH_HEIGHT * 0.36, 1.35, 4.92);
    return positions;
  }

  function largeTypeColor(type: string) {
    if (type === 'dataset') return '#0b6bcb';
    if (type === 'resource') return '#5694ca';
    if (type === 'resource-stack') return '#1d70b8';
    if (type === 'publisher') return '#00703c';
    if (type === 'format') return '#4c2c92';
    if (type === 'topic') return '#007a7a';
    if (type === 'tag') return '#d4351c';
    if (type === 'license') return '#b58800';
    if (type === 'host' || type === 'resource_type') return '#5d6b78';
    return '#607080';
  }

  function graphLegendItems() {
    return [
      ['dataset', recordSingular()],
      ['publisher', publisherSingular()],
      ['resource', resourceSingular()],
      ['format', formatPlural()],
      ['topic', 'topic'],
      ['license', 'licence'],
      ['tag', 'tag'],
      ['host', 'host/other']
    ];
  }

  function shortLabel(value = '', max = 42): string {
    const text = stripHtml(String(value)).replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
  }

  function graphNodeBox(node: LargeGraphNode, point?: GraphPoint): GraphBox | null {
    if (!point) return null;
    if (node.type === 'resource-stack') return { x: point.x - 34, y: point.y - 26, w: 68, h: 52 };
    if (node.type === 'resource') return { x: point.x - 30, y: point.y - 24, w: 60, h: 48 };
    if (node.type === 'dataset') return { x: point.x - 31, y: point.y - 25, w: 62, h: 50 };
    return { x: point.x - 28, y: point.y - 28, w: 56, h: 56 };
  }

  function graphCombinedHitBox(node: LargeGraphNode, point: GraphPoint, label: GraphLabel): GraphBox | null {
    const nodeBox = graphNodeBox(node, point);
    if (!nodeBox) return label.box;
    const x = Math.min(nodeBox.x, label.box.x) - 3;
    const y = Math.min(nodeBox.y, label.box.y) - 3;
    const right = Math.max(nodeBox.x + nodeBox.w, label.box.x + label.box.w) + 3;
    const bottom = Math.max(nodeBox.y + nodeBox.h, label.box.y + label.box.h) + 3;
    return { x, y, w: right - x, h: bottom - y };
  }

  function graphLabelBox(text: string, x: number, y: number, anchor: GraphLabel['anchor']): GraphBox {
    const w = Math.min(240, text.length * 6.8 + 14);
    const h = 19;
    const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    return { x: left, y: y - 15, w, h };
  }

  function graphLabelInsideBounds(label: GraphLabel): boolean {
    return label.box.x >= 6 && label.box.y >= 6 && label.box.x + label.box.w <= GRAPH_WIDTH - 6 && label.box.y + label.box.h <= GRAPH_HEIGHT - 6;
  }

  function graphLabelCandidates(node: LargeGraphNode, point: GraphPoint): GraphLabel[] {
    const text = shortLabel(node.label, node.type === 'publisher' ? 44 : 40);
    const gap = node.type === 'resource' || node.type === 'dataset' || node.type === 'resource-stack' ? 36 : 30;
    const right = { x: point.x + gap, y: point.y + 5, anchor: 'start' as const };
    const left = { x: point.x - gap, y: point.y + 5, anchor: 'end' as const };
    const lateral = point.x > GRAPH_WIDTH * 0.66 ? [left, right] : [right, left];
    const labels = [
      ...lateral,
      { x: point.x, y: point.y - gap, anchor: 'middle' as const },
      { x: point.x, y: point.y + gap + 12, anchor: 'middle' as const }
    ].map((candidate) => ({ ...candidate, text, box: graphLabelBox(text, candidate.x, candidate.y, candidate.anchor), stable: true }));
    const bounded = labels.filter(graphLabelInsideBounds);
    return bounded.length ? bounded : labels;
  }

  function boxesOverlap(left: GraphBox, right: GraphBox): boolean {
    return left.x < right.x + right.w && left.x + left.w > right.x && left.y < right.y + right.h && left.y + left.h > right.y;
  }

  function pickGraphLabel(node: LargeGraphNode, point: GraphPoint, blockers: GraphBox[]): GraphLabel | null {
    return graphLabelCandidates(node, point).find((label) => !blockers.some((box) => boxesOverlap(label.box, box))) || null;
  }

  function graphLabelPriority(node: LargeGraphNode, alwaysId: string): number {
    if (node.id === alwaysId) return 0;
    if (node.type === 'publisher') return 1;
    if (node.type === 'dataset') return 2;
    if (['format', 'topic', 'license', 'tag', 'host', 'resource_type'].includes(node.type)) return 3;
    return 4;
  }

  function graphLabelLayers(nodes: LargeGraphNode[], positions: Map<string, GraphPoint>, alwaysId: string) {
    const labelBudget = nodes.length > 58 ? 18 : nodes.length > 34 ? 28 : 70;
    const labelable = [...nodes]
      .sort((left, right) => graphLabelPriority(left, alwaysId) - graphLabelPriority(right, alwaysId) || left.label.localeCompare(right.label))
      .slice(0, labelBudget);
    const blockers = nodes.map((node) => graphNodeBox(node, positions.get(node.id))).filter((box): box is GraphBox => Boolean(box));
    const layout = new Map<string, GraphLabel>();
    const always = alwaysId ? labelable.filter((node) => node.id === alwaysId || node.type === 'publisher') : [];
    for (const node of always) {
      const point = positions.get(node.id);
      if (!point) continue;
      const label = pickGraphLabel(node, point, blockers);
      if (label) {
        layout.set(node.id, label);
        blockers.push(label.box);
      }
    }

    const candidates = labelable
      .filter((node) => !layout.has(node.id))
      .map((node) => {
        const point = positions.get(node.id);
        const label = point ? pickGraphLabel(node, point, blockers) : null;
        return label ? { node, label } : null;
      })
      .filter((value): value is { node: LargeGraphNode; label: GraphLabel } => Boolean(value));

    const stable: Array<{ node: LargeGraphNode; label: GraphLabel }> = [];
    const rotating: Array<{ node: LargeGraphNode; label: GraphLabel }> = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const conflict = candidates.some((other, otherIndex) => otherIndex !== index && boxesOverlap(candidate.label.box, other.label.box));
      if (conflict) rotating.push(candidate);
      else stable.push(candidate);
    }
    stable.forEach(({ node, label }) => layout.set(node.id, { ...label, stable: true }));
    const layers: Array<Array<{ node: LargeGraphNode; label: GraphLabel }>> = [];
    for (const candidate of rotating) {
      const layer = layers.find((items) => !items.some((item) => boxesOverlap(item.label.box, candidate.label.box)));
      if (layer) layer.push(candidate);
      else layers.push([candidate]);
    }
    const activeLayer = layers.length ? layers[graphLabelPhase % layers.length] : [];
    activeLayer.forEach(({ node, label }) => layout.set(node.id, { ...label, stable: false }));
    return layout;
  }

  function edgeKindLabels(model: ReturnType<typeof largeGraphModel>, positions: Map<string, GraphPoint>) {
    const groups = new Map<string, { label: string; edgeCount: number; x: number; y: number }>();
    for (const relationship of model.relationships) {
      const source = positions.get(relationship.source);
      const target = positions.get(relationship.target);
      if (!source || !target) continue;
      const group = groups.get(relationship.label) || { label: relationship.label, edgeCount: 0, x: 0, y: 0 };
      group.edgeCount += 1;
      group.x += (source.x + target.x) / 2;
      group.y += (source.y + target.y) / 2;
      groups.set(relationship.label, group);
    }
    return [...groups.values()].map((group, index, all) => ({
      text: `${group.label}${group.edgeCount > 1 ? ` x${group.edgeCount}` : ''}`,
      x: group.x / group.edgeCount + 8,
      y: group.y / group.edgeCount + (index - (all.length - 1) / 2) * 16 - 6
    }));
  }

  function graphEdgeKey(edge: LargeGraphEdge): string {
    return `${edge.source}>${edge.target}:${edge.label}`;
  }

  function shouldHighlightGraphEdge(edge: LargeGraphEdge, model: ReturnType<typeof largeGraphModel>): boolean {
    if (largeHighlightedEdge) return graphEdgeKey(edge) === largeHighlightedEdge;
    if (!largeHighlightedRoute) return false;
    const touchesHighlighted = edge.source === largeHighlightedRoute || edge.target === largeHighlightedRoute;
    if (!touchesHighlighted) return false;
    if (model.center) return edge.source === model.center || edge.target === model.center;
    const highlightedFanOut = model.relationships.filter((item) => item.source === largeHighlightedRoute || item.target === largeHighlightedRoute).length;
    return highlightedFanOut <= 12;
  }

  function inspectLargeEdge(edge: LargeGraphEdge) {
    largeInspectedEdge = edge;
    largeInspectedRoute = '';
    largeHighlightedRoute = '';
    largeHighlightedEdge = graphEdgeKey(edge);
    clearLargeApiPanel();
    rightCollapsed = false;
  }

  function inspectLargeRelationship(relationship: LargeRelationship) {
    inspectLargeEdge({ source: relationship.source, target: relationship.target, label: relationship.kind });
  }

  function inspectAnalysisRelationshipType(row: { kind: string; count: number; samples?: Array<{ source: string; target: string; label?: string }> }) {
    const sample = row.samples?.[0];
    inspectLargeEdge({
      source: sample?.source || '',
      target: sample?.target || '',
      label: sample?.label || row.kind,
      count: row.count
    });
  }

  function currentLinkEdges(limit = 180): LargeGraphEdge[] {
    if (largeRelationships.length) {
      const relationships =
        largeSelectedRoute && largeRouteInReduction(largeSelectedRoute)
          ? routeRelationships(largeSelectedRoute, limit)
          : largeRelationships
              .filter((relationship) => relationship.source.startsWith('dataset/') && largeVisibleDatasetNames.has(routeValue(relationship.source)))
              .slice(0, limit);
      return relationships.map((relationship) => ({
        source: relationship.source,
        target: relationship.target,
        label: relationship.kind
      }));
    }
    return largeGraphModel().relationships.slice(0, limit);
  }

  function graphViewBox(): string {
    return `${graphViewport.x} ${graphViewport.y} ${graphViewport.w} ${graphViewport.h}`;
  }

  function resetGraphView() {
    graphZoom = 1;
    graphViewport = { x: 0, y: 0, w: GRAPH_WIDTH, h: GRAPH_HEIGHT, baseW: GRAPH_WIDTH, baseH: GRAPH_HEIGHT };
  }

  function setGraphZoom(value: number) {
    const cx = graphViewport.x + graphViewport.w / 2;
    const cy = graphViewport.y + graphViewport.h / 2;
    const nextZoom = Math.max(0.45, Math.min(4, value));
    const w = graphViewport.baseW / nextZoom;
    const h = graphViewport.baseH / nextZoom;
    graphZoom = nextZoom;
    graphViewport = { ...graphViewport, x: cx - w / 2, y: cy - h / 2, w, h };
  }

  function beginGraphPan(event: PointerEvent) {
    if (event.button !== undefined && event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest('[data-route], [data-edge]')) return;
    graphDrag = { x: event.clientX, y: event.clientY, box: { ...graphViewport }, moved: false };
    (event.currentTarget as SVGSVGElement).setPointerCapture?.(event.pointerId);
  }

  function moveGraphPan(event: PointerEvent) {
    if (!graphDrag) return;
    const svg = event.currentTarget as SVGSVGElement;
    const dx = event.clientX - graphDrag.x;
    const dy = event.clientY - graphDrag.y;
    if (Math.hypot(dx, dy) <= 3 && !graphDrag.moved) return;
    event.preventDefault();
    graphSuppressClick = true;
    graphDrag = { ...graphDrag, moved: true };
    graphViewport = {
      ...graphViewport,
      x: graphDrag.box.x - dx * (graphViewport.w / (svg.clientWidth || graphViewport.baseW)),
      y: graphDrag.box.y - dy * (graphViewport.h / (svg.clientHeight || graphViewport.baseH))
    };
  }

  function endGraphPan(event: PointerEvent) {
    const moved = graphDrag?.moved;
    graphDrag = null;
    (event.currentTarget as SVGSVGElement).releasePointerCapture?.(event.pointerId);
    if (moved) window.setTimeout(() => (graphSuppressClick = false), 80);
  }

  function graphNodeClick(route: string) {
    if (graphSuppressClick) {
      graphSuppressClick = false;
      return;
    }
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    inspectLargeRoute(route);
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
          <input class="search-input" value={largeQuery} placeholder={searchPlaceholder()} oninput={(event) => void runLargeSearch(event.currentTarget.value)} />
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
              {#each orderedLargeFacetKeys() as key}
                {@const selectedFacetValues = facetSelectedValues(key)}
                {@const selectedFacetCount = selectedFacetValues.length}
                {@const facetMeta = analysisFacetForKey(key)}
                {@const facetHint = facetSummary(key)}
                {@const facetHierarchies = analysisHierarchiesForFacet(key)}
                <details class="facet-section" open={activeFacetKey === key}>
                  <summary onclick={(event) => { event.preventDefault(); void openLargeFacet(key); }}>
                    <span>
                      {facetMeta?.label || key.replaceAll('_', ' ')}
                      {#if selectedFacetCount && activeFacetKey !== key}
                        <em>{selectedFacetValues.slice(0, 2).join(', ')}{selectedFacetCount > 2 ? ` +${selectedFacetCount - 2}` : ''}</em>
                      {/if}
                    </span>
                    <small>{facetSummaryBadge(key)}</small>
                  </summary>
                  {#if facetHint}
                    <p class="facet-hint">{facetHint}</p>
                  {/if}
                  {#if facetHierarchies.length}
                    <div class="facet-hierarchy">
                      {#each facetHierarchies.slice(0, 2) as hierarchy}
                        <strong>{hierarchy.label}</strong>
                        {#each hierarchy.values.slice(0, 5) as group}
                          <button type="button" onclick={() => openHierarchyValue(key, group.route || group.id, group.label)}>
                            <span>{group.label}</span><small>{group.count.toLocaleString()}</small>
                          </button>
                          {#each (group.children || []).slice(0, 4) as child}
                            <button class="child" type="button" onclick={() => openHierarchyValue(key, child.route || child.id, child.label)}>
                              <span>{child.label}</span><small>{child.count.toLocaleString()}</small>
                            </button>
                          {/each}
                        {/each}
                      {/each}
                    </div>
                  {/if}
                  <div class="facet-values">
                    {#if !largeIndex && largeFacetHydratingKey === key}
                      <p class="facet-loading">Loading facet values...</p>
                    {:else}
                      {#each largeFacetRows(key).slice(0, 18) as value}
                        <button
                          class:active={selectedFacetValues.includes(value.value)}
                          type="button"
                          onclick={() => toggleLargeFacet(key, value.value)}
                        >
                          <span>{value.value}</span><small>{value.count.toLocaleString()}</small>
                        </button>
                      {/each}
                    {/if}
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
                  <span>{dataset.publisher_title || dataset.publisher || `Unknown ${publisherSingular()}`} · {dataset.resource_count || 0} {resourcePlural()}</span>
                </button>
              {/each}
            </div>
          {:else if largeResults.length}
            <div class="node-list">
              {#each largeResults.slice(0, 80) as result}
                <button class:active={datasetRoute(result) === largeSelectedRoute} type="button" onclick={() => chooseLargeResult(result)}>
                  <strong>{result.title}</strong>
                  <span>{result.publisher_title || result.publisher || `Unknown ${publisherSingular()}`} · {result.resource_count || 0} {resourcePlural()}</span>
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
        <div class="nav-controls" aria-label="History navigation">
          <button type="button" title="Back" aria-label="Back" onclick={navigateBack}>←</button>
          <button type="button" title="Forward" aria-label="Forward" onclick={navigateForward}>→</button>
        </div>
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
          {#if activeView === 'reader'}
            <div class="metrics">
              {#each largeContextMetrics() as metric}
                <article><strong>{metric.value.toLocaleString()}</strong><span>{metric.label}</span></article>
              {/each}
            </div>
          {/if}

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
                      <span>{dataset.publisher_title || dataset.publisher || `Unknown ${publisherSingular()}`} · {dataset.resource_count || 0} {resourcePlural()}</span>
                      {#if apiContextNote(dataset)}<p class="context-note">{apiContextNote(dataset)}</p>{/if}
                      <p>{stripHtml(dataset.notes || '').slice(0, 220)}</p>
                      {#if apiRecordMeta(dataset)}<small class="result-meta">{apiRecordMeta(dataset)}</small>{/if}
                    </button>
                  {:else}
                    <p class="muted">No static-search matches in the current reduction.</p>
                  {/each}
                {:else}
                  {#each largeResults as result}
                    <button class:active={datasetRoute(result) === largeSelectedRoute} type="button" onclick={() => chooseLargeResult(result)}>
                      <strong>{result.title}</strong>
                      <span>{result.publisher_title} · {result.resource_count} {resourcePlural()} · score {result.score}</span>
                      {#if apiContextNote(result)}<p class="context-note">{apiContextNote(result)}</p>{/if}
                      <p>{stripHtml(result.notes || '').slice(0, 220)}</p>
                      {#if apiRecordMeta(result)}<small class="result-meta">{apiRecordMeta(result)}</small>{/if}
                    </button>
                  {:else}
                    <p class="muted">No static-search matches.</p>
                  {/each}
                {/if}
              </div>
            {:else if largeHasAnalysisOverview('reader')}
              {@const analysis = largeAnalysis()}
              <div class="view-heading">
                <h2>{analysis?.summary?.title || source.overview.title}</h2>
                <span>overview context</span>
              </div>
              <p>{analysis?.summary?.description || 'Metadata-first overview of the large OKF corpus before full record hydration.'}</p>
              {#if analysis?.narrative?.body}
                <p class="muted">{analysis.narrative.body}</p>
              {:else}
                <p class="muted">Search loads generated static shards; facets and deep links hydrate records only when needed. Graph and links start from generated aggregate analysis.</p>
              {/if}
              <div class="overview-grid">
                <section>
                  <h3>Entry points</h3>
                  {#each overviewEntryPoints() as entry}
                    <button type="button" onclick={() => openOverviewEntry(entry.route)}>
                      {entry.label}<span>{entry.meta}</span>
                    </button>
                  {/each}
                </section>
                <section>
                  <h3>{capitalise(formatPlural())}</h3>
                  {#each (source.overview.format_counts || []).slice(0, 14) as format}
                    <button type="button" onclick={() => applyAnalysisFacet('format', format.value)}>
                      {format.value}<span>{format.count.toLocaleString()} {recordPlural()}</span>
                    </button>
                  {/each}
                </section>
                {#if analysis?.summary?.notices?.length || source.overview.notices?.length}
                  <section>
                    <h3>Notes</h3>
                    {#each (analysis?.summary?.notices || source.overview.notices || []).slice(0, 4) as notice}
                      <p class="muted">{notice}</p>
                    {/each}
                  </section>
                {/if}
              </div>
            {:else if largeIndex}
              <div class="view-heading">
                <h2>{capitalise(recordPlural())}</h2>
                <span>{largeVisibleDatasets.length.toLocaleString()} in current reduction</span>
              </div>
              <div class="result-list">
                {#each largeVisibleDatasets.slice(0, 160) as dataset}
                  <button class:active={datasetRoute(dataset) === largeSelectedRoute} type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>
                    <strong>{dataset.title}</strong>
                    <span>{dataset.publisher_title || dataset.publisher || `Unknown ${publisherSingular()}`} · {dataset.resource_count || 0} {resourcePlural()}</span>
                    {#if apiContextNote(dataset)}<p class="context-note">{apiContextNote(dataset)}</p>{/if}
                    <p>{stripHtml(dataset.notes || '').slice(0, 220)}</p>
                    {#if apiRecordMeta(dataset)}<small class="result-meta">{apiRecordMeta(dataset)}</small>{/if}
                  </button>
                {/each}
              </div>
            {:else}
              <h2>{source.overview.title}</h2>
              <p class="muted">Overview-first mode. Search loads generated static search shards; graph, {resourceStackLabel().toLowerCase()}, filters, and detail routes hydrate chunked records only when needed.</p>
              <div class="overview-grid">
                <section>
                  <h3>Recent {recordPlural()}</h3>
                  {#each (source.overview.recent_datasets || []).slice(0, 10) as dataset}
                    <button type="button" onclick={() => chooseLargeResult(dataset)}>{dataset.title}<span>{dataset.publisher_title}</span></button>
                  {/each}
                </section>
                <section>
                  <h3>{capitalise(formatPlural())}</h3>
                  {#each (source.overview.format_counts || []).slice(0, 14) as format}
                    <span class="chip">{format.value} {format.count.toLocaleString()}</span>
                  {/each}
                </section>
              </div>
            {/if}
          {:else if activeView === 'graph'}
            {@const model = largeGraphModel()}
            {@const positions = largeGraphPositions(model)}
            {@const labels = graphLabelLayers(model.nodes, positions, model.center)}
            {@const edgeLabels = edgeKindLabels(model, positions)}
            <div class="graph-shell">
              <div class="graph-controls">
                <div class="graph-buttons" aria-label="Graph controls">
                  <button type="button" aria-label="Zoom out" title="Zoom out" onclick={() => setGraphZoom(graphZoom / 1.2)}>−</button>
                  <button type="button" aria-label="Reset graph zoom" title="Reset graph zoom" onclick={resetGraphView}>{Math.round(graphZoom * 100)}%</button>
                  <button type="button" aria-label="Zoom in" title="Zoom in" onclick={() => setGraphZoom(graphZoom * 1.2)}>+</button>
                </div>
                <div class="graph-summary">
                  <strong>{model.nodes.length}</strong> nodes · <strong>{model.relationships.length}</strong> relationships
                </div>
                <div class="legend" aria-label="Node type key">
                  {#each graphLegendItems() as [type, label]}
                    <span><i style={`background:${largeTypeColor(type)}`}></i>{label}</span>
                  {/each}
                </div>
              </div>
              <svg
                class="graph"
                class:dragging={Boolean(graphDrag)}
                viewBox={graphViewBox()}
                role="img"
                aria-label="Large corpus graph"
                onpointerdown={beginGraphPan}
                onpointermove={moveGraphPan}
                onpointerup={endGraphPan}
                onpointercancel={endGraphPan}
                onwheel={(event) => { event.preventDefault(); setGraphZoom(graphZoom * (event.deltaY < 0 ? 1.12 : 0.89)); }}
              >
                <defs>
                  <marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#9aaaba"></path>
                  </marker>
                  <marker id="graph-arrow-highlight" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#1d70b8"></path>
                  </marker>
                </defs>
                {#each model.relationships as relationship}
                  {@const sourcePos = positions.get(relationship.source)}
                  {@const targetPos = positions.get(relationship.target)}
                  {#if sourcePos && targetPos}
                    {@const edgeHighlighted = shouldHighlightGraphEdge(relationship, model)}
                    {@const edgeHit = trimmedEdgePoints(sourcePos, targetPos)}
                    <line
                      class:highlight={edgeHighlighted}
                      x1={sourcePos.x}
                      y1={sourcePos.y}
                      x2={targetPos.x}
                      y2={targetPos.y}
                      marker-end={edgeHighlighted ? 'url(#graph-arrow-highlight)' : 'url(#graph-arrow)'}
                    ></line>
                    <line
                      class="edge-hit"
                      data-edge={graphEdgeKey(relationship)}
                      role="button"
                      tabindex="0"
                      aria-label={relationshipTitle(relationship)}
                      x1={edgeHit.x1}
                      y1={edgeHit.y1}
                      x2={edgeHit.x2}
                      y2={edgeHit.y2}
                      onclick={() => inspectLargeEdge(relationship)}
                      onkeydown={(event) => keyboardActivate(event, () => inspectLargeEdge(relationship))}
                    >
                      <title>{relationshipTitle(relationship)}</title>
                    </line>
                  {/if}
                {/each}
                {#each edgeLabels as edgeLabel}
                  <text class="edge-label" x={edgeLabel.x} y={edgeLabel.y}>{edgeLabel.text}</text>
                {/each}
                {#each model.nodes as node}
                  {@const pos = positions.get(node.id) || { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 }}
                  {@const label = labels.get(node.id)}
                  {@const combinedHit = label && !['dataset', 'resource', 'resource-stack'].includes(node.type) ? graphCombinedHitBox(node, pos, label) : null}
                  <g
                    class:active={node.id === largeSelectedRoute || node.id === largeInspectedRoute || node.id === largeHighlightedRoute}
                    class:spotlight={node.id === largeHighlightedRoute}
                    data-type={node.type}
                    data-route={node.id}
                    role="button"
                    tabindex="0"
                    onclick={() => graphNodeClick(node.id)}
                    ondblclick={() => recenterLargeRoute(node.id)}
                    onkeydown={(event) => keyboardActivate(event, () => inspectLargeRoute(node.id))}
                  >
                    <title>{node.label}</title>
                    {#if combinedHit}
                      <rect class="node-hit cluster-hit" x={combinedHit.x} y={combinedHit.y} width={combinedHit.w} height={combinedHit.h} rx="6"></rect>
                    {/if}
                    {#if node.type === 'resource-stack'}
                      <rect class="node-hit" x={pos.x - 32} y={pos.y - 25} width="64" height="50" rx="6"></rect>
                      <rect class="stack-card stack-card-back" x={pos.x - 24} y={pos.y - 17} width="42" height="27" rx="5" fill={largeTypeColor(node.type)}></rect>
                      <rect class="stack-card stack-card-mid" x={pos.x - 20} y={pos.y - 14} width="42" height="27" rx="5" fill={largeTypeColor(node.type)}></rect>
                      <rect class="stack-card" x={pos.x - 16} y={pos.y - 11} width="42" height="27" rx="5" fill={largeTypeColor(node.type)}></rect>
                      <text class="stack-count" x={pos.x + 5} y={pos.y + 7}>{node.count}</text>
                    {:else if node.type === 'resource'}
                      <rect class="node-hit" x={pos.x - 25} y={pos.y - 19} width="50" height="38" rx="6"></rect>
                      <rect class="resource-card" x={pos.x - 16} y={pos.y - 11} width="32" height="22" rx="4" fill={largeTypeColor(node.type)}></rect>
                      <line class="card-line" x1={pos.x - 10} y1={pos.y - 3} x2={pos.x + 10} y2={pos.y - 3}></line>
                      <line class="card-line" x1={pos.x - 10} y1={pos.y + 4} x2={pos.x + 7} y2={pos.y + 4}></line>
                    {:else if node.type === 'dataset'}
                      <rect class="node-hit" x={pos.x - 26} y={pos.y - 20} width="52" height="40" rx="6"></rect>
                      <rect class="dataset-card" x={pos.x - 18} y={pos.y - 12} width="36" height="24" rx="5" fill={largeTypeColor(node.type)}></rect>
                    {:else}
                      <circle class="node-hit" cx={pos.x} cy={pos.y} r="20"></circle>
                      <circle cx={pos.x} cy={pos.y} r={node.id === largeSelectedRoute ? 12 : 9} fill={largeTypeColor(node.type)}></circle>
                    {/if}
                    {#if label}
                      <rect class="label-hit" x={label.box.x} y={label.box.y} width={label.box.w} height={label.box.h} rx="4"></rect>
                      <text class:rotating={!label.stable} x={label.x} y={label.y} text-anchor={label.anchor}>{label.text}</text>
                    {/if}
                  </g>
                {/each}
              </svg>
              <div class="edge-panel">
                <strong>Relationships ({model.relationships.length})</strong>
                <div>
                  {#each model.relationships.slice(0, 42) as relationship}
                    <button
                      class:active={largeHighlightedEdge === graphEdgeKey(relationship)}
                      type="button"
                      onclick={() => inspectLargeEdge(relationship)}
                    >
                      {largeLabelForRoute(relationship.source)} → {relationship.label} → {largeLabelForRoute(relationship.target)}
                    </button>
                  {/each}
                </div>
              </div>
              <p class="graph-caption">
                {#if model.center}
                  Showing {model.nodes.length} nodes directly related to {largeLabelForRoute(model.center)}.
                {:else}
                  Showing {model.nodes.length} nodes from the current left-panel reduction.
                {/if}
                Drag to pan, use +/- or the mouse wheel to zoom, single-click to inspect, double-click to centre or expand a {resourceStackLabel().toLowerCase()}.
              </p>
            </div>
          {:else if activeView === 'links'}
            {#if largeHasAnalysisOverview('links')}
              <div class="view-heading">
                <h2>Relationship Overview</h2>
                <span>summaries before relationship hydration</span>
              </div>
              <section class="links-view relationship-overview">
                {#each analysisRelationshipTypes().slice(0, 24) as row}
                  <button type="button" onclick={() => inspectAnalysisRelationshipType(row)}>
                    <strong>{row.kind}</strong>
                    <span>{row.count.toLocaleString()} relationships</span>
                    <strong>{(row.samples || []).slice(0, 2).map((item) => item.label || `${largeLabelForRoute(item.source)} to ${largeLabelForRoute(item.target)}`).join(' · ')}</strong>
                  </button>
                {:else}
                  <p class="muted">Relationship summaries are not available for this bundle yet.</p>
                {/each}
              </section>
              {#if analysisTopConnected().length}
                <section class="type-view compact-type-view">
                  <article>
                    <h2>Top connected groups</h2>
                    {#each analysisTopConnected().slice(0, 16) as node}
                      <button type="button" onclick={() => openOverviewEntry(node.id)}>
                        {node.label}<span>{node.count.toLocaleString()}</span>
                      </button>
                    {/each}
                  </article>
                </section>
              {/if}
            {:else}
              <div class="view-heading">
                <h2>Links</h2>
                <span>{largeRelationships.length ? 'full relationship chunks loaded' : 'current graph relationships'}</span>
              </div>
              <section class="links-view">
                {#each currentLinkEdges() as relationship}
                  <button type="button" onclick={() => inspectLargeEdge(relationship)}>
                    <strong>{largeLabelForRoute(relationship.source)}</strong>
                    <span>{relationship.label}</span>
                    <strong>{largeLabelForRoute(relationship.target)}</strong>
                  </button>
                {:else}
                  <p class="muted">Select a dataset, apply a filter, or load the full relationship index.</p>
                {/each}
                {#if !largeRelationships.length}
                  <button type="button" onclick={() => void ensureLargeRelationships()}>
                    <strong>Load full relationship index</strong>
                    <span>{source.manifest.counts.relationships?.toLocaleString() || 'all'} relationships</span>
                    <strong>Use only when exact corpus-wide relationship rows are needed.</strong>
                  </button>
                {/if}
              </section>
            {/if}
          {:else if activeView === 'timeline'}
            {#if largeHasAnalysisOverview('timeline')}
              <div class="view-heading">
                <h2>Timeline Distribution</h2>
                <span>{source.manifest.counts.datasets.toLocaleString()} {recordPlural()} in overview</span>
              </div>
              <section class="timeline-view timeline-axis">
                {#each analysisTimelineBuckets().slice(0, 90) as bucket, index}
                  <button style={`--row:${index}`} type="button" onclick={() => applyAnalysisTimelineBucket(bucket)}>
                    <time>{bucket.label}</time>
                    <div>
                      <strong>{bucket.count.toLocaleString()} {recordPlural()}</strong>
                      <span>{(bucket.samples || []).slice(0, 2).map((item) => item.title).join(' · ')}</span>
                    </div>
                  </button>
                {:else}
                  <p class="muted">Timeline distribution is not available for this bundle yet.</p>
                {/each}
              </section>
            {:else}
              <div class="view-heading">
                <h2>Timeline</h2>
                <span>{largeVisibleDatasets.length.toLocaleString()} {recordPlural()} in current reduction</span>
              </div>
              <section class="timeline-view timeline-axis">
                {#each largeVisibleDatasets.filter((dataset) => dataset.timestamp || dataset.metadata_modified).slice(0, 180) as dataset, index}
                  <button style={`--row:${index}`} type="button" onclick={() => inspectLargeRoute(datasetRoute(dataset))} ondblclick={() => recenterLargeRoute(datasetRoute(dataset))}>
                    <time>{String(dataset.timestamp || dataset.metadata_modified).slice(0, 10)}</time>
                    <div><strong>{dataset.title}</strong><span>{dataset.publisher_title || dataset.publisher || `Unknown ${publisherSingular()}`}</span></div>
                  </button>
                {/each}
              </section>
            {/if}
          {:else if activeView === 'type'}
            <div class="view-heading">
              <h2>Facets And Dimensions</h2>
              <span>{largeHasAnalysisOverview('type') ? 'ordered by generated facet quality' : 'filter chips affect every display'}</span>
            </div>
            <section class="type-view">
              {#if largeHasAnalysisOverview('type')}
                {#each analysisFacetRows() as facet}
                  <article class:muted-card={facet.recommendation === 'suppressed'}>
                    <h2>{facet.label}</h2>
                    <p class="muted">
                      {facet.recommendation} · {facet.recommended_control} · coverage {formatPercent(facet.coverage)} · cardinality {facet.cardinality.toLocaleString()} · expected reduction {formatPercent(facet.expected_reduction)}
                    </p>
                    {#each (facet.values || []).slice(0, 12) as row}
                      <button type="button" onclick={() => applyAnalysisFacet(facet.key, row.value)}>
                        {row.value}<span>{row.count.toLocaleString()}</span>
                      </button>
                    {/each}
                  </article>
                {/each}
                {#each (largeAnalysis()?.hierarchies || []) as hierarchy}
                  <article>
                    <h2>{hierarchy.label}</h2>
                    <p class="muted">{hierarchy.levels.join(' → ')}</p>
                    {#each hierarchy.values.slice(0, 10) as group}
                      <button type="button" onclick={() => openHierarchyValue(hierarchy.facet, group.route || group.id, group.label)}>
                        {group.label}<span>{group.count.toLocaleString()}</span>
                      </button>
                      {#each (group.children || []).slice(0, 5) as child}
                        <button class="child" type="button" onclick={() => openHierarchyValue(hierarchy.facet, child.route || child.id, child.label)}>
                          {child.label}<span>{child.count.toLocaleString()}</span>
                        </button>
                      {/each}
                    {/each}
                  </article>
                {/each}
                {#if largeAnalysis()?.ontology_candidates?.length}
                  <article>
                    <h2>Ontology Candidates</h2>
                    {#each largeAnalysis()?.ontology_candidates || [] as candidate}
                      <p class="muted">{candidate.label} · confidence {formatPercent(candidate.confidence)} · coverage {formatPercent(candidate.coverage)}</p>
                      <div class="chips">
                        {#each (candidate.classes || []).slice(0, 8) as className}<span class="chip">{className}</span>{/each}
                      </div>
                    {/each}
                  </article>
                {/if}
              {:else}
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
              {/if}
            </section>
          {:else if activeView === 'resources'}
            {#if largeHasAnalysisOverview('resources')}
              <div class="view-heading">
                <h2>{capitalise(resourceSingular())} Landscape</h2>
                <span>{(largeAnalysis()?.resource_overview?.total_resources || source.manifest.counts.resources || 0).toLocaleString()} {resourcePlural()} in overview</span>
              </div>
              <div class="overview-grid">
                <section>
                  <h3>High-volume stacks</h3>
                  {#each analysisResourceStacks().slice(0, 16) as stack}
                    <button type="button" onclick={() => openOverviewEntry(stack.route)}>
                      {stack.label}<span>{stack.count.toLocaleString()} {resourcePlural()} · {stack.publisher || `unknown ${publisherSingular()}`}</span>
                    </button>
                  {:else}
                    <p class="muted">Resource-stack summaries are not available for this bundle yet.</p>
                  {/each}
                </section>
                <section>
                  <h3>Resource dimensions</h3>
                  {#each analysisResourceDistributionRows() as row}
                    <button type="button" onclick={() => applyAnalysisFacet(row.key, row.value)}>
                      {row.value}<span>{row.key} · {row.count.toLocaleString()}</span>
                    </button>
                  {/each}
                </section>
              </div>
            {:else}
              <div class="view-heading">
                <h2>{resourceStackLabel()}</h2>
                <span>{largeVisibleResources.length.toLocaleString()} {resourcePlural()} shown from current reduction</span>
              </div>
              <section class="resource-stack-view">
                {#each largeVisibleDatasets.filter((dataset) => (largeIndex?.resourcesByDataset.get(dataset.name) || []).length).slice(0, 80) as dataset}
                  {@const resources = largeIndex?.resourcesByDataset.get(dataset.name) || []}
                  <article>
                    <button class="stack-heading" type="button" onclick={() => inspectLargeRoute(datasetRoute(dataset))} ondblclick={() => recenterLargeRoute(datasetRoute(dataset))}>
                      <strong>{dataset.title}</strong>
                      <span>{resources.length} {resourcePlural()} · {dataset.publisher_title || dataset.publisher}</span>
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
          {:else if activeView === 'narrative'}
            {@const analysis = largeAnalysis()}
            <div class="view-heading">
              <h2>{currentLargeContextLabel()}</h2>
              <span>narrative context</span>
            </div>
            <section class="narrative-view">
              <article>
                <h3>{analysis?.narrative?.title || analysis?.summary?.title || source.descriptor.title}</h3>
                <p>
                  {#if largeIsOverviewContext() && analysis?.narrative?.body}
                    {analysis.narrative.body}
                  {:else if largeIndex}
                    The active context contains {largeVisibleDatasets.length.toLocaleString()} {recordPlural()} and {largeVisibleResources.length.toLocaleString()} visible {resourcePlural()} after the current search and facet reduction. Use the graph, links, timeline, and resources views to inspect the same reduced context from different angles.
                  {:else}
                    {analysis?.summary?.description || source.descriptor.description || 'This OKF Explorer view is using the lightweight overview payload until a search, filter, or deep link requires full-record hydration.'}
                  {/if}
                </p>
                {#if selectedLargeFilterLabels().length}
                  <div class="chips">
                    {#each selectedLargeFilterLabels() as filter}
                      <span class="chip">{filter.label}</span>
                    {/each}
                  </div>
                {/if}
              </article>
              <div class="metrics">
                {#each largeContextMetrics() as metric}
                  <article><strong>{metric.value.toLocaleString()}</strong><span>{metric.label}</span></article>
                {/each}
              </div>
              <div class="overview-grid">
                <section>
                  <h3>Evidence views</h3>
                  <button type="button" onclick={() => void selectView('graph')}>Graph<span>relationships and aggregate structure</span></button>
                  <button type="button" onclick={() => void selectView('timeline')}>Timeline<span>temporal distribution and dated records</span></button>
                  <button type="button" onclick={() => void selectView('links')}>Links<span>relationship types and selectable edges</span></button>
                  <button type="button" onclick={() => void selectView('resources')}>{capitalise(resourcePlural())}<span>{resourceStackLabel().toLowerCase()} and {formatPlural()}/host landscape</span></button>
                </section>
                <section>
                  <h3>Strong dimensions</h3>
                  {#each analysisFacetRows().filter((facet) => facet.recommendation !== 'suppressed').slice(0, 8) as facet}
                    <button type="button" onclick={() => { activeFacetKey = facet.key; void selectView('type'); }}>
                      {facet.label}<span>{facet.recommendation} · {facet.recommended_control}</span>
                    </button>
                  {/each}
                </section>
                <section>
                  <h3>Representative values</h3>
                  {#each topContextFacetValues('publisher', 4) as row}
                    <button type="button" onclick={() => applyAnalysisFacet('publisher', row.value)}>{row.value}<span>{row.count.toLocaleString()} {recordPlural()}</span></button>
                  {/each}
                  {#each topContextFacetValues('format', 4) as row}
                    <button type="button" onclick={() => applyAnalysisFacet('format', row.value)}>{row.value}<span>{row.count.toLocaleString()} {recordPlural()}</span></button>
                  {/each}
                </section>
              </div>
              {#if analysis?.ontology_candidates?.length}
                <section class="ontology-panel">
                  <h3>Ontology candidates</h3>
                  {#each analysis.ontology_candidates as candidate}
                    <article>
                      <strong>{candidate.label}</strong>
                      <span>confidence {formatPercent(candidate.confidence)} · coverage {formatPercent(candidate.coverage)}</span>
                      <p>{(candidate.classes || []).join(', ')}</p>
                    </article>
                  {/each}
                </section>
              {/if}
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
          <div class="graph-shell">
            <div class="graph-controls">
              <div class="graph-buttons" aria-label="Graph controls">
                <button type="button" aria-label="Zoom out" title="Zoom out" onclick={() => setGraphZoom(graphZoom / 1.2)}>−</button>
                <button type="button" aria-label="Reset graph zoom" title="Reset graph zoom" onclick={resetGraphView}>{Math.round(graphZoom * 100)}%</button>
                <button type="button" aria-label="Zoom in" title="Zoom in" onclick={() => setGraphZoom(graphZoom * 1.2)}>+</button>
              </div>
              <div class="graph-summary">
                <strong>{model.nodes.length}</strong> nodes · <strong>{model.relationships.length}</strong> relationships
              </div>
              <div class="legend" aria-label="Node type key">
                {#each typeList.slice(0, 8) as type}
                  <span><i style={`background:${colorForType(type)}`}></i>{type}</span>
                {/each}
              </div>
            </div>
            <svg
              class="graph"
              class:dragging={Boolean(graphDrag)}
              viewBox={graphViewBox()}
              role="img"
              aria-label="OKF graph"
              onpointerdown={beginGraphPan}
              onpointermove={moveGraphPan}
              onpointerup={endGraphPan}
              onpointercancel={endGraphPan}
              onwheel={(event) => { event.preventDefault(); setGraphZoom(graphZoom * (event.deltaY < 0 ? 1.12 : 0.89)); }}
            >
              <defs>
                <marker id="small-graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="#9aaaba"></path>
                </marker>
                <marker id="small-graph-arrow-highlight" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="#1d70b8"></path>
                </marker>
              </defs>
              {#each model.relationships as relationship}
                {@const sourcePos = positions.get(relationship.source)}
                {@const targetPos = positions.get(relationship.target)}
                {#if sourcePos && targetPos}
                  {@const edgeHighlighted = smallInspectedRelationship === relationship}
                  {@const edgeHit = trimmedEdgePoints(sourcePos, targetPos)}
                  <line
                    class:highlight={edgeHighlighted}
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    marker-end={edgeHighlighted ? 'url(#small-graph-arrow-highlight)' : 'url(#small-graph-arrow)'}
                  />
                  <line
                    class="edge-hit"
                    data-edge={`${relationship.source}>${relationship.target}:${smallRelationshipKind(relationship)}`}
                    role="button"
                    tabindex="0"
                    aria-label={smallRelationshipTitle(relationship)}
                    x1={edgeHit.x1}
                    y1={edgeHit.y1}
                    x2={edgeHit.x2}
                    y2={edgeHit.y2}
                    onclick={() => inspectSmallRelationship(relationship)}
                    onkeydown={(event) => keyboardActivate(event, () => inspectSmallRelationship(relationship))}
                  >
                    <title>{smallRelationshipTitle(relationship)}</title>
                  </line>
                {/if}
              {/each}
              {#each model.nodes as node}
                {@const pos = positions.get(node.id) || { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 }}
                <g
                  class:active={node.id === selectedId || node.id === inspectedId}
                  data-route={node.id}
                  role="button"
                  tabindex="0"
                  onclick={() => inspectNode(node.id)}
                  ondblclick={() => selectNode(node.id)}
                  onkeydown={(event) => keyboardActivate(event, () => inspectNode(node.id))}
                >
                  <circle cx={pos.x} cy={pos.y} r={node.id === selectedId ? 15 : 10}></circle>
                  <text x={pos.x + 16} y={pos.y + 5}>{shortLabel(node.title, 52)}</text>
                </g>
              {/each}
            </svg>
            <div class="edge-panel">
              <strong>Relationships ({model.relationships.length})</strong>
              <div>
                {#each model.relationships.slice(0, 42) as relationship}
                  <button
                    class:active={smallInspectedRelationship === relationship}
                    type="button"
                    onclick={() => inspectSmallRelationship(relationship)}
                  >
                    {smallRelationshipTitle(relationship)}
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {:else if activeView === 'links'}
          <section class="links-view">
            {#each scopedRelationships as relationship}
              <button type="button" onclick={() => inspectSmallRelationship(relationship)} ondblclick={() => selectNode(relationship.target)}>
                <strong>{smallCorpus.nodes[relationship.source]?.title || relationship.source}</strong>
                <span>{smallRelationshipKind(relationship)}</span>
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
        {:else if activeView === 'resources'}
          <section class="resource-stack-view">
            {#each visibleNodes.filter((node) => String(node.type || '').toLowerCase().includes('resource') || node.source).slice(0, 120) as node}
              <article>
                <button class="stack-heading" type="button" onclick={() => inspectNode(node.id)} ondblclick={() => selectNode(node.id)}>
                  <strong>{node.title}</strong>
                  <span>{node.type || 'Node'} · {node.source || node.id}</span>
                </button>
              </article>
            {:else}
              <p class="muted">No resource-like nodes are visible in the current small-bundle reduction.</p>
            {/each}
          </section>
        {:else if activeView === 'narrative'}
          <section class="narrative-view">
            <article>
              <h2>{smallCorpus.title}</h2>
              <p>{smallCorpus.description || 'This OKF bundle is shown as a reduced set of nodes and relationships. Search and node-type filters in the left panel change the context used by every view.'}</p>
            </article>
            <div class="metrics">
              <article><strong>{visibleNodes.length.toLocaleString()}</strong><span>visible nodes</span></article>
              <article><strong>{scopedRelationships.length.toLocaleString()}</strong><span>visible relationships</span></article>
              <article><strong>{typeList.length.toLocaleString()}</strong><span>node types</span></article>
              <article><strong>{pins.length.toLocaleString()}</strong><span>pins</span></article>
            </div>
            <div class="overview-grid">
              <section>
                <h3>Visible node types</h3>
                {#each typeList as type}
                  <button type="button" onclick={() => { visibleTypes = new Set([type]); }}>
                    {type}<span>{visibleNodes.filter((node) => (node.type || 'Node') === type).length.toLocaleString()} visible</span>
                  </button>
                {/each}
              </section>
              <section>
                <h3>Evidence views</h3>
                <button type="button" onclick={() => void selectView('graph')}>Graph<span>direct relationship structure</span></button>
                <button type="button" onclick={() => void selectView('links')}>Links<span>typed relationships</span></button>
                <button type="button" onclick={() => void selectView('timeline')}>Timeline<span>dated nodes</span></button>
              </section>
            </div>
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
      <div class="pins-bar">
        <div class="pin-actions">
          <button type="button" onclick={() => (spreadPins = !spreadPins)}>{spreadPins ? 'Compact pins' : 'Spread pins'}</button>
          <button type="button" onclick={exportPins}>Export pins</button>
        </div>
        {#if pinnedLabels.length}
          <div class="pin-list" class:spread={spreadPins}>
            {#each pinnedLabels as pin}
              <button type="button" onclick={() => source?.kind === 'large' ? selectLargeRoute(pin.route) : (selectedId = pin.route)}>{pin.label}</button>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <button class="splitter" aria-label="Resize details" type="button" onpointerdown={(event) => beginResize('right', event)}></button>

    <aside class="right-panel">
      <div class="panel-bar">
        <button aria-label="Toggle details" type="button" onclick={() => (rightCollapsed = !rightCollapsed)}>{rightCollapsed ? '‹' : '›'}</button>
      </div>
      <div class="detail">
        {#if source?.kind === 'large'}
          {#if largeInspectedEdge}
            <span class="badge">Relationship</span>
            <h2>
              {#if largeInspectedEdge.source && largeInspectedEdge.target}
                {largeLabelForRoute(largeInspectedEdge.source)} → {largeLabelForRoute(largeInspectedEdge.target)}
              {:else}
                {largeInspectedEdge.label}
              {/if}
            </h2>
            <p>{largeInspectedEdge.count ? `${largeInspectedEdge.count.toLocaleString()} relationships` : largeInspectedEdge.label}</p>
            <div class="detail-actions">
              {#if largeInspectedEdge.source}<button type="button" onclick={() => inspectLargeRoute(largeInspectedEdge?.source || '')}>Inspect source</button>{/if}
              {#if largeInspectedEdge.target}<button type="button" onclick={() => inspectLargeRoute(largeInspectedEdge?.target || '')}>Inspect target</button>{/if}
              <button type="button" onclick={clearInspection}>Clear relationship</button>
            </div>
            <dl>
              {#if largeInspectedEdge.source && largeInspectedEdge.target}<dt>Direction</dt><dd>Source → target</dd>{/if}
              {#if largeInspectedEdge.source}<dt>Source</dt><dd><button type="button" onclick={() => inspectLargeRoute(largeInspectedEdge?.source || '')}>{largeLabelForRoute(largeInspectedEdge.source)}</button></dd>{/if}
              <dt>Type</dt><dd>{largeInspectedEdge.label}</dd>
              {#if largeInspectedEdge.count}<dt>Count</dt><dd>{largeInspectedEdge.count.toLocaleString()}</dd>{/if}
              {#if largeInspectedEdge.target}<dt>Target</dt><dd><button type="button" onclick={() => inspectLargeRoute(largeInspectedEdge?.target || '')}>{largeLabelForRoute(largeInspectedEdge.target)}</button></dd>{/if}
              {#if largeInspectedEdge.source}<dt>Source route</dt><dd>{largeInspectedEdge.source}</dd>{/if}
              {#if largeInspectedEdge.target}<dt>Target route</dt><dd>{largeInspectedEdge.target}</dd>{/if}
            </dl>
            <details class="json-panel">
              <summary>Relationship JSON</summary>
              <pre>{jsonText({ source: largeInspectedEdge.source || undefined, target: largeInspectedEdge.target || undefined, kind: largeInspectedEdge.label, count: largeInspectedEdge.count })}</pre>
            </details>
          {:else if largeDetail}
            {#if largeDetail.kind === 'dataset'}
              <span class="badge">{capitalise(recordSingular())}</span>
              <h2>{largeDetail.dataset.title}</h2>
              {#if apiContextNote(largeDetail.dataset)}
                <p class="context-note">{apiContextNote(largeDetail.dataset)}</p>
              {/if}
              <p>{stripHtml(largeDetail.dataset.notes || '')}</p>
              <div class="detail-actions">
                <button type="button" onclick={() => void selectView('graph')}>Graph</button>
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
                <button type="button" onclick={() => copyRoute(largeDetail.route)}>Copy route</button>
                {#if isUrl(largeDetail.dataset.source_api_url)}
                  <a class="button" href={largeDetail.dataset.source_api_url} target="_blank" rel="noopener">Open API</a>
                  <button type="button" onclick={() => void loadLargeApiJson(largeDetail.route, largeDetail.dataset.source_api_url)}>
                    {largeApiRoute === largeDetail.route && largeApiLoading ? 'Loading API JSON' : 'Show API JSON'}
                  </button>
                {/if}
                {#if largeInspectedRoute}<button type="button" onclick={clearInspection}>{largeSelectedRoute ? 'Back to selected card' : 'Clear inspection'}</button>{/if}
              </div>
              <dl>
                <dt>{capitalise(publisherSingular())}</dt><dd><button type="button" onclick={() => largeDetail?.kind === 'dataset' && largeDetail.dataset.publisher && inspectLargeRoute(publisherRoute(largeDetail.dataset.publisher))}>{largeDetail.dataset.publisher_title || largeDetail.dataset.publisher || 'Unknown'}</button></dd>
                <dt>{capitalise(resourcePlural())}</dt><dd>{(largeDetail.dataset.resource_count || largeDetail.resources.length).toLocaleString()}</dd>
                <dt>Record type</dt><dd>{displayValue(largeDetail.dataset.record_type || largeDetail.dataset.type)}</dd>
                <dt>Source</dt><dd>{displayValue(largeDetail.dataset.source_adapter)}</dd>
                <dt>Source tier</dt><dd>{displayValue(largeDetail.dataset.source_tier)}</dd>
                <dt>Confidence</dt><dd>{displayValue(largeDetail.dataset.confidence)}</dd>
                <dt>Licence</dt><dd>{largeDetail.dataset.license_title || largeDetail.dataset.license_id || 'Unknown'}</dd>
                <dt>Concept ID</dt><dd>{displayValue(largeDetail.dataset.concept_id)}</dd>
                <dt>Quality</dt><dd>{formatPercent(largeDetail.dataset.quality?.overall)}</dd>
                <dt>Access model</dt><dd>{displayValue(largeDetail.dataset.access_model)}</dd>
                <dt>Visibility</dt><dd>{displayValue(largeDetail.dataset.visibility)}</dd>
                <dt>Contract status</dt><dd>{displayValue(largeDetail.dataset.contract_status)}</dd>
                <dt>Lifecycle</dt><dd>{displayValue(largeDetail.dataset.lifecycle_status || largeDetail.dataset.state)}</dd>
                <dt>Area served</dt><dd>{displayValue(largeDetail.dataset.area_served || largeDetail.dataset.areaServed)}</dd>
                <dt>{primaryUrlLabel()}</dt><dd>{#if isUrl(largeDetail.dataset.url)}<a href={largeDetail.dataset.url} target="_blank" rel="noopener">{largeDetail.dataset.url}</a>{:else}{displayValue(largeDetail.dataset.url)}{/if}</dd>
                <dt>Documentation</dt><dd>{#if isUrl(largeDetail.dataset.documentation)}<a href={largeDetail.dataset.documentation} target="_blank" rel="noopener">{largeDetail.dataset.documentation}</a>{:else}{displayValue(largeDetail.dataset.documentation)}{/if}</dd>
                {#if largeDetail.dataset.source_api_url}<dt>Source API</dt><dd>{#if isUrl(largeDetail.dataset.source_api_url)}<a href={largeDetail.dataset.source_api_url} target="_blank" rel="noopener">{largeDetail.dataset.source_api_url}</a>{:else}{displayValue(largeDetail.dataset.source_api_url)}{/if}</dd>{/if}
              </dl>
              {#if acronymExpansions(largeDetail.dataset).length || contextLinks(largeDetail.dataset).length}
                <section class="metadata-section">
                  <h3>Context</h3>
                  <dl>
                    {#each acronymExpansions(largeDetail.dataset) as expansion}
                      <dt>{expansion.acronym}</dt>
                      <dd>
                        {#if isUrl(expansion.source_url)}
                          <a href={expansion.source_url} target="_blank" rel="noopener">{expansion.expanded}</a>
                        {:else}
                          {expansion.expanded}
                        {/if}
                      </dd>
                    {/each}
                    {#each contextLinks(largeDetail.dataset) as link}
                      <dt>{link.label}</dt><dd>{#if isUrl(link.url)}<a href={link.url} target="_blank" rel="noopener">{link.description || link.url}</a>{:else}{displayValue(link.description || link.url)}{/if}</dd>
                    {/each}
                  </dl>
                </section>
              {/if}
              <div class="chips">
                {#each (largeDetail.dataset.topics || []).slice(0, 10) as topic}<span class="chip topic-chip">{topic}</span>{/each}
                {#each (largeDetail.dataset.formats || []).slice(0, 16) as format}<span class="chip">{format}</span>{/each}
                {#each (largeDetail.dataset.tags || []).slice(0, 16) as tag}<span class="chip">{tag}</span>{/each}
              </div>
              <section class="metadata-section">
                <h3>{capitalise(recordSingular())} metadata</h3>
                <dl>
                  <dt>Record name</dt><dd>{largeDetail.dataset.name}</dd>
                  <dt>Record ID</dt><dd>{displayValue(largeDetail.dataset.id)}</dd>
                  <dt>State</dt><dd>{displayValue(largeDetail.dataset.state)}</dd>
                  <dt>Type</dt><dd>{displayValue(largeDetail.dataset.type)}</dd>
                  <dt>Protocol</dt><dd>{displayValue(largeDetail.dataset.protocol)}</dd>
                  <dt>Open data</dt><dd>{displayValue(largeDetail.dataset.isopen)}</dd>
                  <dt>Private</dt><dd>{displayValue(largeDetail.dataset.private)}</dd>
                  <dt>Created</dt><dd>{displayValue(largeDetail.dataset.metadata_created)}</dd>
                  <dt>Modified</dt><dd>{displayValue(largeDetail.dataset.metadata_modified)}</dd>
                  <dt>Timeline date</dt><dd>{displayValue(largeDetail.dataset.timestamp)}</dd>
                  <dt>{capitalise(formatPlural())}</dt><dd>{displayValue(largeDetail.dataset.formats)}</dd>
                  <dt>Topics</dt><dd>{displayValue(largeDetail.dataset.topics)}</dd>
                  <dt>Source licence</dt><dd>{displayValue([largeDetail.dataset.license_source_id, largeDetail.dataset.license_source_title].filter(Boolean))}</dd>
                  <dt>Licence confidence</dt><dd>{formatPercent(largeDetail.dataset.license_confidence)}</dd>
                  <dt>{capitalise(publisherSingular())} concept</dt><dd>{displayValue(largeDetail.dataset.publisher_concept_id)}</dd>
                  <dt>Groups</dt><dd>{displayValue(largeDetail.dataset.groups)}</dd>
                  <dt>{capitalise(resourceSingular())} hosts</dt><dd>{displayValue(largeDetail.dataset.resource_hosts)}</dd>
                </dl>
              </section>
              {#if largeDetail.dataset.quality}
                <section class="metadata-section">
                  <h3>Quality signals</h3>
                  <dl>
                    <dt>Overall</dt><dd>{formatPercent(largeDetail.dataset.quality.overall)}</dd>
                    {#each Object.entries(largeDetail.dataset.quality.metrics || {}) as [key, value]}
                      <dt>{key.replaceAll('_', ' ')}</dt><dd>{typeof value === 'number' ? formatPercent(value) : displayValue(value)}</dd>
                    {/each}
                  </dl>
                </section>
              {/if}
              {#if largeDetail.dataset.provenance}
                <section class="metadata-section">
                  <h3>Provenance</h3>
                  <dl>
                    {#each Object.entries(largeDetail.dataset.provenance).slice(0, 14) as [key, value]}
                      <dt>{key.replaceAll('_', ' ')}</dt><dd>{displayValue(value)}</dd>
                    {/each}
                  </dl>
                </section>
              {/if}
              {#if largeDetail.dataset.extras && Object.keys(largeDetail.dataset.extras).length}
                <section class="metadata-section">
                  <h3>Additional metadata</h3>
                  <dl>
                    {#each Object.entries(largeDetail.dataset.extras).slice(0, 40) as [key, value]}
                      <dt>{key}</dt><dd>{displayValue(value)}</dd>
                    {/each}
                  </dl>
                </section>
              {/if}
              <h3>{capitalise(resourcePlural())}</h3>
              {#each largeDetail.resources.slice(0, 30) as resource}
                <button type="button" onclick={() => { largeHighlightedRoute = resourceRoute(resource); inspectLargeRoute(resourceRoute(resource)); }} ondblclick={() => recenterLargeRoute(resourceRoute(resource))}>
                  <strong>{resource.name || resource.id}</strong>
                  <span>{resource.format || 'unknown'} · {resource.host || 'unknown host'}</span>
                </button>
              {/each}
              {#if largeDetail.relationships.length}
                <h3>Relationships</h3>
                {#each largeDetail.relationships.slice(0, 24) as relationship}
                  <button type="button" onclick={() => inspectLargeRelationship(relationship)}>
                    {largeLabelForRoute(relationship.source)} → {relationship.kind} → {largeLabelForRoute(relationship.target)}
                  </button>
                {/each}
              {/if}
              <details class="json-panel">
                <summary>Local normalized {recordSingular()} JSON</summary>
                <pre>{jsonText(largeDetail.dataset)}</pre>
              </details>
              {#if largeApiRoute === largeDetail.route}
                {#if largeApiError}
                  <p class="error">API JSON could not be loaded: {largeApiError}</p>
                {:else if largeApiJson}
                  <details class="json-panel" open>
                    <summary>Source API JSON</summary>
                    <pre>{jsonText(largeApiJson)}</pre>
                  </details>
                {/if}
              {/if}
            {:else if largeDetail.kind === 'resource'}
              <span class="badge">{capitalise(resourceSingular())}</span>
              <h2>{largeDetail.resource.name || largeDetail.resource.id}</h2>
              <p>{stripHtml(largeDetail.resource.description || '') || largeDetail.resource.url}</p>
              <div class="detail-actions">
                <button type="button" onclick={() => largeDetail?.kind === 'resource' && selectLargeRoute(datasetRoute(largeDetail.dataset || { name: largeDetail.resource.dataset, title: largeDetail.resource.dataset }))}>{capitalise(recordSingular())}</button>
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
                <button type="button" onclick={() => copyRoute(largeDetail.route)}>Copy route</button>
                {#if largeInspectedRoute}<button type="button" onclick={clearInspection}>Clear inspection</button>{/if}
              </div>
              <dl>
                <dt>{capitalise(recordSingular())}</dt><dd>{largeDetail.dataset?.title || largeDetail.resource.dataset}</dd>
                <dt>Format</dt><dd>{largeDetail.resource.format || 'unknown'}</dd>
                <dt>Source format</dt><dd>{displayValue(largeDetail.resource.source_format)}</dd>
                <dt>Format confidence</dt><dd>{formatPercent(largeDetail.resource.format_confidence)}</dd>
                <dt>Concept ID</dt><dd>{displayValue(largeDetail.resource.concept_id)}</dd>
                <dt>Host</dt><dd>{largeDetail.resource.host || 'unknown'}</dd>
                <dt>Type</dt><dd>{largeDetail.resource.resource_type || 'unknown'}</dd>
                <dt>URL</dt><dd>{#if isUrl(largeDetail.resource.url)}<a href={largeDetail.resource.url} target="_blank" rel="noopener">{largeDetail.resource.url}</a>{:else}{displayValue(largeDetail.resource.url)}{/if}</dd>
                <dt>GOV.UK path</dt><dd>{displayValue(largeDetail.resource.govuk_content_path)}</dd>
              </dl>
              <section class="metadata-section">
                <h3>Resource metadata</h3>
                <dl>
                  <dt>{capitalise(resourceSingular())} ID</dt><dd>{largeDetail.resource.id}</dd>
                  <dt>State</dt><dd>{displayValue(largeDetail.resource.state)}</dd>
                  <dt>Position</dt><dd>{displayValue(largeDetail.resource.position)}</dd>
                  <dt>Created</dt><dd>{displayValue(largeDetail.resource.created)}</dd>
                  <dt>Last modified</dt><dd>{displayValue(largeDetail.resource.last_modified)}</dd>
                  <dt>Metadata modified</dt><dd>{displayValue(largeDetail.resource.metadata_modified)}</dd>
                  <dt>Size</dt><dd>{displayValue(largeDetail.resource.size)}</dd>
                  <dt>Hash</dt><dd>{displayValue(largeDetail.resource.hash)}</dd>
                  <dt>Schema URL</dt><dd>{#if isUrl(largeDetail.resource.schema_url)}<a href={largeDetail.resource.schema_url} target="_blank" rel="noopener">{largeDetail.resource.schema_url}</a>{:else}{displayValue(largeDetail.resource.schema_url)}{/if}</dd>
                  <dt>Schema type</dt><dd>{displayValue(largeDetail.resource.schema_type)}</dd>
                </dl>
              </section>
              {#if largeDetail.resource.provenance}
                <section class="metadata-section">
                  <h3>Provenance</h3>
                  <dl>
                    {#each Object.entries(largeDetail.resource.provenance).slice(0, 14) as [key, value]}
                      <dt>{key.replaceAll('_', ' ')}</dt><dd>{displayValue(value)}</dd>
                    {/each}
                  </dl>
                </section>
              {/if}
              <details class="json-panel">
                <summary>Local normalized {resourceSingular()} JSON</summary>
                <pre>{jsonText(largeDetail.resource)}</pre>
              </details>
            {:else if largeDetail.kind === 'publisher'}
              <span class="badge">{capitalise(publisherSingular())}</span>
              <h2>{largeDetail.publisher.title}</h2>
              <p>{stripHtml(largeDetail.publisher.description || '')}</p>
              <div class="detail-actions">
                <button type="button" onclick={() => void selectView('graph')}>Graph</button>
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
                <button type="button" onclick={() => copyRoute(largeDetail.route)}>Copy route</button>
              </div>
              <dl>
                <dt>Name</dt><dd>{largeDetail.publisher.name}</dd>
                <dt>Concept ID</dt><dd>{displayValue(largeDetail.publisher.concept_id)}</dd>
                <dt>{capitalise(recordPlural())}</dt><dd>{(largeDetail.publisher.dataset_count || largeDetail.datasets.length).toLocaleString()}</dd>
                <dt>{capitalise(resourcePlural())}</dt><dd>{(largeDetail.publisher.resource_count || 0).toLocaleString()}</dd>
                <dt>State</dt><dd>{largeDetail.publisher.state || 'unknown'}</dd>
                <dt>{capitalise(publisherSingular())} ID</dt><dd>{displayValue(largeDetail.publisher.id)}</dd>
                <dt>Type</dt><dd>{displayValue(largeDetail.publisher.type)}</dd>
                <dt>Approval status</dt><dd>{displayValue(largeDetail.publisher.approval_status)}</dd>
              </dl>
              {#if largeDetail.publisher.provenance}
                <section class="metadata-section">
                  <h3>Provenance</h3>
                  <dl>
                    {#each Object.entries(largeDetail.publisher.provenance).slice(0, 12) as [key, value]}
                      <dt>{key.replaceAll('_', ' ')}</dt><dd>{displayValue(value)}</dd>
                    {/each}
                  </dl>
                </section>
              {/if}
              <h3>{capitalise(recordPlural())}</h3>
              {#each largeDetail.datasets.slice(0, 40) as dataset}
                <button type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>{dataset.title}</button>
              {/each}
              <details class="json-panel">
                <summary>Local normalized publisher JSON</summary>
                <pre>{jsonText(largeDetail.publisher)}</pre>
              </details>
            {:else if largeDetail.kind === 'search'}
              <span class="badge">{capitalise(recordSingular())}</span>
              <h2>{largeDetail.result.title}</h2>
              {#if apiContextNote(largeDetail.result)}
                <p class="context-note">{apiContextNote(largeDetail.result)}</p>
              {/if}
              <p>{stripHtml(largeDetail.result.notes || '')}</p>
              <dl>
                <dt>{capitalise(publisherSingular())}</dt><dd>{largeDetail.result.publisher_title}</dd>
                <dt>{capitalise(resourcePlural())}</dt><dd>{largeDetail.result.resource_count.toLocaleString()}</dd>
                <dt>Record type</dt><dd>{displayValue(largeDetail.result.record_type)}</dd>
                <dt>Source</dt><dd>{displayValue(largeDetail.result.source_adapter)}</dd>
                <dt>Confidence</dt><dd>{displayValue(largeDetail.result.confidence)}</dd>
                <dt>Protocol</dt><dd>{displayValue(largeDetail.result.protocol)}</dd>
                <dt>Topics</dt><dd>{displayValue(largeDetail.result.topics)}</dd>
                <dt>Endpoint host</dt><dd>{displayValue(largeDetail.result.endpoint_host)}</dd>
                <dt>Documentation host</dt><dd>{displayValue(largeDetail.result.documentation_host)}</dd>
                <dt>Access model</dt><dd>{displayValue(largeDetail.result.access_model)}</dd>
                <dt>Contract status</dt><dd>{displayValue(largeDetail.result.contract_status)}</dd>
                <dt>{primaryUrlLabel()}</dt><dd>{#if isUrl(largeDetail.result.url)}<a href={largeDetail.result.url} target="_blank" rel="noopener">{largeDetail.result.url}</a>{:else}{displayValue(largeDetail.result.url)}{/if}</dd>
                <dt>Documentation</dt><dd>{#if isUrl(largeDetail.result.documentation)}<a href={largeDetail.result.documentation} target="_blank" rel="noopener">{largeDetail.result.documentation}</a>{:else}{displayValue(largeDetail.result.documentation)}{/if}</dd>
                <dt>Quality</dt><dd>{formatPercent(largeDetail.result.quality_score)}</dd>
                <dt>Route</dt><dd>{largeDetail.result.open}</dd>
                <dt>Timestamp</dt><dd>{largeDetail.result.timestamp || 'None'}</dd>
              </dl>
              <button type="button" onclick={() => void ensureLargeFullIndex()}>Load full record</button>
            {:else}
              {@const routeDatasets = datasetsForMetadataRoute(largeDetail.route, 40)}
              {@const routeResources = resourcesForMetadataRoute(largeDetail.route, 40)}
              {@const analysisNode = analysisNodeForRoute(largeDetail.route)}
              {@const analysisFacet = routeForAnalysisNode(largeDetail.route)}
              {@const facetMeta = analysisFacet ? analysisFacetForKey(analysisFacet.key) : null}
              {@const hierarchyValue = analysisHierarchyValueForRoute(largeDetail.route)}
              <span class="badge">{routeTypeLabel(largeDetail.route)}</span>
              <h2>{largeDetail.label}</h2>
              <div class="detail-actions">
                <button type="button" onclick={() => void selectView('graph')}>Graph</button>
                {#if analysisFacet}<button type="button" onclick={() => applyAnalysisFacet(analysisFacet.key, analysisFacet.value)}>Reduce context</button>{/if}
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
                <button type="button" onclick={() => copyRoute(largeDetail.route)}>Copy route</button>
                {#if !largeRelationships.length}<button type="button" onclick={() => void ensureLargeRelationships()}>Load full relationships</button>{/if}
              </div>
              <dl>
                <dt>Route</dt><dd>{largeDetail.route}</dd>
                <dt>Kind</dt><dd>{routeKind(largeDetail.route)}</dd>
                <dt>Relationship</dt><dd>{metadataRelationshipLabel(largeDetail.route)}</dd>
                {#if analysisNode}<dt>Analysis count</dt><dd>{(analysisNode.count || 0).toLocaleString()}</dd>{/if}
                {#if analysisFacet}<dt>Facet</dt><dd>{facetMeta?.label || facetLabel(analysisFacet.key)}</dd>{/if}
                {#if analysisFacet}<dt>Facet value</dt><dd>{analysisFacet.value}</dd>{/if}
                {#if facetMeta}<dt>Facet quality</dt><dd>{facetMeta.recommendation} · {facetMeta.recommended_control} · reduction {formatPercent(facetMeta.expected_reduction)}</dd>{/if}
                {#if hierarchyValue}<dt>Hierarchy</dt><dd>{hierarchyValue.hierarchy.label}{hierarchyValue.parent ? ` / ${hierarchyValue.parent.label}` : ''}</dd>{/if}
                <dt>{capitalise(recordPlural())}</dt><dd>{routeDatasets.length.toLocaleString()} in current reduction</dd>
                <dt>{capitalise(resourcePlural())}</dt><dd>{routeResources.length.toLocaleString()} in current reduction</dd>
                <dt>Full links</dt><dd>{largeRelationships.length ? largeDetail.relationships.length.toLocaleString() : 'Not loaded'}</dd>
              </dl>
              {#if largeFullLoading && !largeIndex}
                <p class="facet-loading">Loading {recordPlural()} for this value...</p>
              {/if}
              {#if routeDatasets.length}
                <h3>{capitalise(recordPlural())} in current reduction</h3>
                {#each routeDatasets.slice(0, 12) as dataset}
                  <button type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>
                    <strong>{dataset.title}</strong>
                    <span>{dataset.publisher_title || dataset.publisher || `Unknown ${publisherSingular()}`} · {dataset.resource_count || 0} {resourcePlural()}</span>
                    {#if apiContextNote(dataset)}<p class="context-note">{apiContextNote(dataset)}</p>{/if}
                    <p>{stripHtml(dataset.notes || '').slice(0, 180)}</p>
                    {#if apiRecordMeta(dataset)}<small class="result-meta">{apiRecordMeta(dataset)}</small>{/if}
                  </button>
                {/each}
              {/if}
              {#if routeResources.length}
                <h3>{capitalise(resourcePlural())} in current reduction</h3>
                {#each routeResources.slice(0, 12) as resource}
                  <button type="button" onclick={() => inspectLargeRoute(resourceRoute(resource))}>
                    <strong>{resource.name || resource.id}</strong>
                    <span>{resource.format || 'unknown'} · {resource.host || 'unknown host'}</span>
                  </button>
                {/each}
              {/if}
              {#if largeDetail.relationships.length}
                <h3>Loaded relationships</h3>
                {#each largeDetail.relationships.slice(0, 24) as relationship}
                  <button type="button" onclick={() => inspectLargeRelationship(relationship)}>
                    {largeLabelForRoute(relationship.source)} → {relationship.kind} → {largeLabelForRoute(relationship.target)}
                  </button>
                {/each}
              {/if}
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
        {:else if smallInspectedRelationship && smallCorpus}
          <span class="badge">Relationship</span>
          <h2>{smallCorpus.nodes[smallInspectedRelationship.source]?.title || smallInspectedRelationship.source} → {smallCorpus.nodes[smallInspectedRelationship.target]?.title || smallInspectedRelationship.target}</h2>
          <p>{smallRelationshipKind(smallInspectedRelationship)}</p>
          <div class="detail-actions">
            <button type="button" onclick={() => inspectNode(smallInspectedRelationship?.source || '')}>Inspect source</button>
            <button type="button" onclick={() => inspectNode(smallInspectedRelationship?.target || '')}>Inspect target</button>
            <button type="button" onclick={() => (smallInspectedRelationship = null)}>Clear relationship</button>
          </div>
          <dl>
            <dt>Direction</dt><dd>Source → target</dd>
            <dt>Source</dt><dd><button type="button" onclick={() => inspectNode(smallInspectedRelationship?.source || '')}>{smallCorpus.nodes[smallInspectedRelationship.source]?.title || smallInspectedRelationship.source}</button></dd>
            <dt>Type</dt><dd>{smallRelationshipKind(smallInspectedRelationship)}</dd>
            <dt>Target</dt><dd><button type="button" onclick={() => inspectNode(smallInspectedRelationship?.target || '')}>{smallCorpus.nodes[smallInspectedRelationship.target]?.title || smallInspectedRelationship.target}</button></dd>
            <dt>Source route</dt><dd>{smallInspectedRelationship.source}</dd>
            <dt>Target route</dt><dd>{smallInspectedRelationship.target}</dd>
          </dl>
          <details class="json-panel">
            <summary>Relationship JSON</summary>
            <pre>{jsonText(smallInspectedRelationship)}</pre>
          </details>
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
