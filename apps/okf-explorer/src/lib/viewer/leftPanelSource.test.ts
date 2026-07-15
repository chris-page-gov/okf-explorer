import { describe, expect, it } from 'vitest';
import pageSource from '../../routes/+page.svelte?raw';

describe('large-corpus left panel UX harness', () => {
  it('starts with all facets folded instead of opening the first provider list', () => {
    expect(pageSource).toContain("let activeFacetKey = $state('');");
    expect(pageSource).not.toContain("let activeFacetKey = $state('publisher')");
    expect(pageSource).not.toContain('activeFacetKey = Object.keys(largeIndex.facets)[0]');
  });

  it('toggles open facets closed and hydrates unopened facets with a loading state', () => {
    expect(pageSource).toContain('async function openLargeFacet(key: string)');
    expect(pageSource).toContain('if (activeFacetKey === key)');
    expect(pageSource).toContain("largeFacetHydratingKey = key;");
    expect(pageSource).toContain('Loading facet values...');
  });

  it('shows an immediate applying cue and disables competing facet clicks', () => {
    expect(pageSource).toContain('let largeFacetApplyingKey = $state');
    expect(pageSource).toContain('await tick();');
    expect(pageSource).toContain('aria-live="polite"');
    expect(pageSource).toContain('Applying {facetLabel(largeFacetApplyingKey)}');
    expect(pageSource).toContain('disabled={Boolean(largeFacetApplyingKey)}');
  });

  it('keeps hierarchy parent rows informational and sends child rows to the right facet route', () => {
    expect(pageSource).toContain('<div class="facet-hierarchy-group">');
    expect(pageSource).toContain('onclick={() => void openHierarchyValue(key, child.route || child.id, child.label)}');
  });

  it('uses real browser history for facet selections and deep links selected facet routes', () => {
    expect(pageSource).toContain('function syncExplorerUrl(push = false)');
    expect(pageSource).toContain('largeInspectedRoute || largeSelectedRoute');
    expect(pageSource).toContain("window.history.pushState({}, '', url)");
    expect(pageSource).toContain('applyLargeBrowserRoute(hash, hasSerializedFilters(params))');
  });

  it('round-trips search, filters and sort state for large and small bundles', () => {
    expect(pageSource).toContain('writeRetrievalState(next.searchParams, currentRetrievalState())');
    expect(pageSource).toContain('parseRetrievalState(params, largeSourceFacetKeys(source))');
    expect(pageSource).toContain("parseRetrievalState(new URLSearchParams(location.search), ['type'])");
    expect(pageSource).toContain('largeFacetFilters = state.filters');
    expect(pageSource).toContain('retrievalSort = state.sort');
    expect(pageSource).toContain('...rows.map((row) => row.value), MISSING_FILTER_VALUE');
    expect(pageSource).toContain('return values.length ? values : [MISSING_FILTER_VALUE]');
  });

  it('restarts one crashed or timed-out search worker without accepting stale results', () => {
    expect(pageSource).toContain('largeSearchRecoveryAttempts < 1');
    expect(pageSource).toContain('largeSearchClient = null');
    expect(pageSource).toContain('Restarting the local search worker');
    expect(pageSource).toContain('sourceRequestId !== loadRequest');
    expect(pageSource).toContain('largeSearchClient !== client');
  });

  it('separates retrieval controls and explains matches without exposing raw scores', () => {
    expect(pageSource).toContain('<h2>Search</h2>');
    expect(pageSource).toContain('<span>Filter results');
    expect(pageSource).toContain('<span>Sort</span>');
    expect(pageSource).toContain('class="active-filter-chips"');
    expect(pageSource).toContain('function removeLargeFilter');
    expect(pageSource).toContain('Why this matched: {searchMatchReason(result)}');
    expect(pageSource).toContain('Not specified (metadata gap)');
    expect(pageSource).not.toContain('score {result.score}');
  });

  it('labels reduced record cards in the left panel instead of leaving unexplained cards under facets', () => {
    expect(pageSource).toContain('class="left-results"');
    expect(pageSource).toContain('records match the active search and filters');
    expect(pageSource).toContain('Search matches');
  });

  it('debounces large-corpus search and exposes explicit search preparation state', () => {
    expect(pageSource).toContain('let largeSearchIndexLoading = $state(false);');
    expect(pageSource).toContain('function scheduleLargeSearch(query: string)');
    expect(pageSource).toContain('window.setTimeout');
    expect(pageSource).toContain('Preparing static search index...');
    expect(pageSource).toContain('Searching static index...');
  });

  it('offers an explicit search clear control and resets stale route context while typing', () => {
    expect(pageSource).toContain('function clearLargeSearch()');
    expect(pageSource).toContain('aria-label="Clear search"');
    expect(pageSource).toContain('class="search-clear"');
    expect(pageSource).toContain('function clearLargeRouteContext()');
    expect(pageSource).toContain('if (query.trim() !== previousQuery) clearLargeRouteContext();');
  });

  it('turns metadata chips into facet navigation controls', () => {
    expect(pageSource).toContain("onclick={() => applyAnalysisFacet('topic', topic)}");
    expect(pageSource).toContain("onclick={() => applyAnalysisFacet('format', format)}");
    expect(pageSource).toContain("onclick={() => applyAnalysisFacet('tag', tag)}");
  });

  it('explains quality, licence and evidence terms inside the detail panel', () => {
    expect(pageSource).toContain('Metadata quality');
    expect(pageSource).toContain('Licence basis');
    expect(pageSource).toContain('licenceBasisLabel');
    expect(pageSource).toContain('class="info-icon"');
    expect(pageSource).toContain('quality-contract_signal');
    expect(pageSource).toContain('largeDetail.result.license_title');
    expect(pageSource).toContain('metadataDisplayValue(largeDetail.result.timestamp)');
    expect(pageSource).toContain('metadataDisplayValue(largeDetail.result.license_title || largeDetail.result.license_id)');
    expect(pageSource).not.toContain("|| 'None'");
    expect(pageSource).toContain("source-date:created");
    expect(pageSource).toContain("source-date:modified");
    expect(pageSource).toContain("source-date:timeline");
  });

  it('stacks dense graph relationships and renders the relationship list as a drawer', () => {
    expect(pageSource).toContain("addNode(stackId, 'relationship-stack'");
    expect(pageSource).toContain('edge-panel edge-drawer');
    expect(pageSource).toContain('drawer-grip');
    expect(pageSource).toContain('class="relationship-rows"');
    expect(pageSource).toContain('class:resizing={edgePanelResizing}');
    expect(pageSource).toContain('setPointerCapture');
  });

  it('keeps an inspected relationship selected independently of route highlighting', () => {
    expect(pageSource).toContain('class:selected={largeHighlightedEdge === graphEdgeKey(relationship)}');
    expect(pageSource).toContain('aria-pressed={largeHighlightedEdge === graphEdgeKey(relationship)}');
    expect(pageSource).not.toContain("if (largeHighlightedEdge && !largeHighlightedRoute) largeHighlightedEdge = '';");
  });

  it('surfaces record dates and explicit series alternatives without guessing from similar titles', () => {
    expect(pageSource).toContain('class="record-date-summary"');
    expect(pageSource).toContain('{dateContext.updatedLabel}');
    expect(pageSource).toContain('Catalogue date — not necessarily the dataset’s latest release or update frequency.');
    expect(pageSource).toContain('Dates and related records');
    expect(pageSource).toContain('datasetDateContext(largeDetail.dataset, largeDetail.resources)');
    expect(pageSource).toContain('relatedSeriesDatasets(largeDetail.dataset, largeIndex?.datasets || [])');
    expect(pageSource).toContain('Explorer will not guess that similar titles are the same series');
  });

  it('separates CKAN discovery metadata from evidence-backed current operations', () => {
    expect(pageSource).toContain('datasetOperationalContext(largeDetail.dataset, largeDetail.resources)');
    expect(pageSource).toContain('Current source and maintenance');
    expect(pageSource).toContain('Operational metadata gap.');
    expect(pageSource).toContain('Catalogue declarations');
    expect(pageSource).toContain('These claims come from the catalogue metadata and are preserved as provenance.');
    expect(pageSource).toContain('Explorer does not call it authoritative until the bundle supplies canonical-source evidence and provenance.');
    expect(pageSource).toContain('Catalogue metadata modified');
  });

  it('puts full-record hydration first and folds secondary data-card sections', () => {
    const loadAction = pageSource.indexOf("largeFullLoading ? 'Loading full record...' : 'Load full record'");
    const searchOverview = pageSource.indexOf('<summary>Overview</summary>', loadAction);
    expect(loadAction).toBeGreaterThan(0);
    expect(searchOverview).toBeGreaterThan(loadAction);
    expect(pageSource.match(/<details class="metadata-section disclosure-section" open>/g)?.length).toBeGreaterThanOrEqual(3);
    expect(pageSource).toContain('<details class="metadata-section disclosure-section">\n                <summary>Normalized record fields</summary>');
    expect(pageSource).not.toContain('>Load full record</button>');
  });

  it('opens source API responses inside Explorer without replacing the current window', () => {
    expect(pageSource).toContain("import SourceInspector from '$lib/viewer/SourceInspector.svelte'");
    expect(pageSource).toContain('let largeSourceInspectorOpen = $state(false)');
    expect(pageSource).toContain("'View source data'");
    expect(pageSource).toContain('Open raw JSON ↗');
    expect(pageSource).toContain('target="_blank" rel="noopener noreferrer"');
    expect(pageSource).toContain('fetchSourceJson(url)');
    expect(pageSource).not.toContain('<summary>Source API JSON</summary>');
    expect(pageSource).not.toContain('>Open API</a>');
  });

  it('keeps synthetic graph stacks from becoming navigable graph centres', () => {
    expect(pageSource).toContain('const GRAPH_STACK_THRESHOLD = 18;');
    expect(pageSource).toContain('because this view has more than {GRAPH_STACK_THRESHOLD} related records');
    expect(pageSource).toContain('function isRecordTypeStackRoute(route: string)');
    expect(pageSource).toContain("route.startsWith('relationship-stack/')");
    expect(pageSource).toContain("route.startsWith('facet-stack/')");
    expect(pageSource).toContain('if (isRecordTypeStackRoute(route))');
    expect(pageSource).toContain('if (isGraphStackRoute(route))');
    expect(pageSource).toContain('onkeydown={(event) => keyboardActivate(event, () => graphNodeClick(node.id))}');
  });

  it('draws graph relationship arrows to trimmed icon boundaries', () => {
    expect(pageSource).toContain('function trimmedEdgePoints(source: GraphPoint, target: GraphPoint');
    expect(pageSource).toMatch(/<line\s+class:highlight=\{edgeHighlighted\}\s+x1=\{edgeHit\.x1\}\s+y1=\{edgeHit\.y1\}\s+x2=\{edgeHit\.x2\}\s+y2=\{edgeHit\.y2\}/);
  });
});
