<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { pushState, replaceState } from '$app/navigation';
  import type {
    BundleRegistryEntry,
    FederationAccessRoute,
    FederationChild,
    LargeDataset,
    LargeDatasetAlternative,
    LargeCorpusSource,
    LargeCorpusDescriptor,
    LargeExplorerDisplay,
    LargeExplorerPresentation,
    LargeExplorerPresentationFacet,
    LargeFacetRow,
    LargeFullIndex,
    LargeModelEnrichmentState,
    LargePublisher,
    LargeRelationship,
    LargeResourceReference,
    LargeResource,
    LargeSourceDisplayMode,
    LargeSearchResponse,
    LoadedSource,
    NormalizedCorpus,
    OkfNode,
    OkfRelationship,
    RelationshipAuthorityClass,
    SearchResultDoc,
    SearchSuggestion,
    ViewMode
  } from '$lib/types';
  import { LargeSearchClient } from '$lib/search/largeSearchClient';
  import { formatSearchResultSummary } from '$lib/search/searchPresentation';
  import {
    RETRIEVAL_STATE_SCHEMA,
    MISSING_FILTER_VALUE,
    defaultRetrievalSort,
    hasSerializedFilters,
    isRetrievalSort,
    normalizeRetrievalFilters,
    parseRetrievalState,
    writeRetrievalState,
    type RetrievalSort,
    type RetrievalStateV1
  } from '$lib/search/retrievalState';
  import LegislationDetail from '$lib/legislation/LegislationDetail.svelte';
  import { searchOfficialLegislation } from '$lib/legislation/search';
  import MapView from '$lib/geospatial/MapView.svelte';
  import {
    classifyLargeDataset,
    classifySmallNode,
    geospatialFilterLabel,
    geospatialFilterMatches,
    isGeospatialFilter,
    type GeospatialRecord
  } from '$lib/geospatial/geospatial';
  import SourceInspector from '$lib/viewer/SourceInspector.svelte';
  import ProviderDatapackStatus from '$lib/viewer/ProviderDatapackStatus.svelte';
  import GovernedTermsPanel from '$lib/viewer/GovernedTermsPanel.svelte';
  import HeritageDetail from '$lib/viewer/HeritageDetail.svelte';
  import {
    governedHelpText,
    governedTermIdsForRecord,
    semanticResources
  } from '$lib/viewer/governedTerms';
  import EffectsReconciliationPanel from '$lib/viewer/EffectsReconciliationPanel.svelte';
  import ModelEnrichmentStatus from '$lib/viewer/ModelEnrichmentStatus.svelte';
  import FederationOverviewPanel from '$lib/viewer/FederationOverviewPanel.svelte';
  import {
    endpointLabelEntryForInspection,
    endpointLabelForRoute,
    endpointTypeForRoute,
    decodeEndpointRouteSegment,
    encodeEndpointRouteSegment,
    isOpaqueEndpointIdentifier,
    largeRecordRoute,
    metadataEndpointRoute
  } from '$lib/viewer/endpointLabels';
  import { largeDatasetFacetValues as projectLargeDatasetFacetValues } from '$lib/viewer/largeFacetValues';
  import {
    canDisplaySourceInline,
    narrativeRouteGroups,
    recordNarrative,
    sourceAccesses,
    sourceOpenLabel,
    type ResolvedLargeSourceAccess
  } from '$lib/viewer/largeRecordContracts';
  import {
    renderSafeMarkdown,
    smallNodeLinks,
    smallNodeMetadataRows,
    smallNodeSearchText
  } from '$lib/viewer/smallNodePresentation';
  import { conversationPresentation } from '$lib/viewer/conversationPresentation';
  import {
    boxesOverlap,
    graphEdgeStateKey,
    graphRelationshipGroupSlot,
    groupGraphRelationships,
    orderGraphRelationshipGroups,
    planDirectedEdges,
    planGraphEdgeWeights,
    planGraphLabelLayers,
    planRelationshipGroupPositions,
    quadraticEdgeGeometry,
    shouldUseRelationshipLayout,
    type GraphBox,
    type GraphEdgeGeometry,
    type GraphLabelPlacement,
    type GraphPoint,
    type GraphRelationshipGroup,
    type GraphRelationshipSide,
    type GraphRelationshipSlot
  } from '$lib/viewer/graphPresentation';
  import {
    applyFacetPreferenceOrder,
    diverseFacetValueFamilies,
    facetPreferenceOverrides as getFacetPreferenceOverrides,
    facetDistributionSegments,
    facetExampleValues,
    mergeExplorerDisplay,
    moveFacetKeyToTargetWithinPinGroup,
    moveFacetKeyWithinPinGroup,
    normalizeExplorerPresentation,
    normalizeFacetPreferences,
    orderFacetRows,
    type FacetDistributionSegment,
    type FacetValueFamily,
    type FacetPreferences
  } from '$lib/viewer/facetPresentation';
  import { providerDatapacksForRecord } from '$lib/viewer/providerDatapack';
  import {
    fetchSourceResponse,
    fetchStructuredDocumentWithFallback,
    movedBundleTarget,
    parseStructuredDocumentText
  } from '$lib/sources/fetch';
  import { isLargeCorpusDescriptor } from '$lib/sources/descriptor';
  import ExploratoryBanner from '$lib/publication/ExploratoryBanner.svelte';
  import {
    buildExploratoryFeedbackUrl,
    parseExploratoryPublication,
    type ExploratoryPublicationResult
  } from '$lib/publication/exploratoryPublication';
  import { isFederationDescriptor, loadFederationOverview } from '$lib/sources/federation';
  import {
    loadLargeCorpus,
    MAX_RELATIONSHIP_ROWS,
    prefersTargetedRelationshipHydration
  } from '$lib/sources/largeCorpus';
  import { loadHistory, loadRegistry, rememberHistory } from '$lib/sources/registry';
  import { normalizeSmallBundle } from '$lib/sources/smallBundle';
  import {
    conceptGenerated,
    okfConceptPresentation,
    trustTierLabel
  } from '$lib/okfV02';
  import {
    relationshipPresentation,
    summarizeRelationships,
    type RelationshipEvidencePresentation
  } from '$lib/viewer/relationshipPresentation';
  import {
    analysisFacetForKey as findAnalysisFacetForKey,
    analysisFacetRows as getAnalysisFacetRows,
    analysisHierarchiesForFacet as findAnalysisHierarchiesForFacet,
    analysisHierarchyValueForRoute as findAnalysisHierarchyValueForRoute,
    analysisLabelForRoute,
    analysisNodeForRoute as findAnalysisNodeForRoute,
    colorForType,
    datasetDateContext,
    datasetDisplaySeries,
    datasetOperationalContext,
    datasetReleasePeriod,
    displayValue,
    facetLabel,
    facetSummary as getFacetSummary,
    facetValueLabel,
    formatPercent,
    isHttpUrl as isUrl,
    orderedFacetKeys,
    relatedDisplaySeriesDatasets,
    relationshipTitle as formatRelationshipTitle,
    routeForAnalysisNode,
    smallRelationshipKind as getSmallRelationshipKind,
    smallRelationshipTitle as getSmallRelationshipTitle,
    sourceDateLabel,
    timelineBucketFacetFilter
  } from '$lib/viewer/helpers';
  import './styles.css';

  const DEFAULT_BUNDLE = 'https://chris-page-gov.github.io/okf-ai-infrastructure/okf-bundle.json';
  const DEFAULT_REGISTRY = './okf-registry.json';
  const VIEW_MODES: Array<{ id: ViewMode; label: string }> = [
    { id: 'reader', label: 'Reader' },
    { id: 'graph', label: 'Graph' },
    { id: 'links', label: 'Links' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'type', label: 'Type' },
    { id: 'resources', label: 'Resources' },
    { id: 'map', label: 'Map' },
    { id: 'narrative', label: 'Narrative' }
  ];
  const FULL_INDEX_VIEWS = new Set<ViewMode>(['graph', 'links', 'timeline', 'type', 'resources', 'map', 'narrative']);
  const RELATIONSHIP_VIEWS = new Set<ViewMode>();
  const LARGE_FACET_KEYS = ['category', 'type_code', 'document_type', 'creation_year', 'jurisdiction', 'legal_status', 'publisher', 'topic', 'format', 'tag', 'license', 'host', 'resource_type', 'update_year', 'govuk_linked', 'publisher_family', 'publisher_state'];
  const DEFAULT_GRAPH_WIDTH = 900;
  const GRAPH_HEIGHT = 620;
  const FACET_PAGE_SIZE = 30;
  const MAX_SAFE_FULL_INDEX_RECORDS = 50_000;
  const MAX_SAFE_FULL_RELATIONSHIPS = 100_000;
  const FACET_PREFERENCES_STORAGE_KEY = 'okf-explorer:facet-preferences:v1';
  const DEFAULT_FACET_SEARCH_THRESHOLD = 48;
  const DEFAULT_FACET_DISTRIBUTION_SEGMENTS = 10;
  const GRAPH_STACK_THRESHOLD = 18;
  const GRAPH_EXPANDED_GROUP_LIMIT = 72;
  const GRAPH_SUBGROUP_MAX_COUNT = 12;
  const GRAPH_LAYOUT_PARAM = 'graph.layout';
  const GRAPH_CENTER_PARAM = 'graph.center';
  const GRAPH_EXPANDED_STACK_PARAM = 'graph.stack';
  const GRAPH_GROUP_PARAM = 'graph.group';
  const GRAPH_HIDDEN_GROUP_PARAM = 'graph.hide';
  const GRAPH_HIDDEN_EDGE_PARAM = 'graph.hideEdge';
  const GRAPH_HIDDEN_NODE_TYPE_PARAM = 'graph.hideType';
  const GRAPH_HIDDEN_AUTHORITY_PARAM = 'graph.hideAuthority';
  const GRAPH_KEY_MODE_PARAM = 'graph.key';
  const GRAPH_LABELS_PARAM = 'graph.labels';
  const GRAPH_HIGHLIGHT_RELATIONSHIP_PARAM = 'graph.relationship';
  const GRAPH_HIGHLIGHT_EDGE_PARAM = 'graph.edge';
  const SMALL_INSPECT_NODE_PARAM = 'inspect.node';
  const SMALL_INSPECT_RELATIONSHIP_PARAM = 'inspect.relationship';
  const RELATIONSHIP_AUTHORITY_CLASSES: RelationshipAuthorityClass[] = [
    'official',
    'derived',
    'model-assisted',
    'synthetic',
    'unclassified'
  ];
  const HELP_TEXT: Record<string, string> = {
    'api-evidence': 'Evidence resources linked to this record, such as endpoint, documentation, contract, or source metadata rows. Zero means no separate evidence resource was generated for this record.',
    'metadata-quality': 'A deterministic completeness score from catalogue metadata. It is not assurance, certification, uptime, security, or API quality.',
    'record-type': 'The normalised OKF concept type, including API records and legislation works. A legal work progressively resolves its official CLML subdivisions on demand.',
    source: 'The adapter that harvested this record, such as GOV.UK API Catalogue, data.gov.uk CKAN, Ordnance Survey, or ONS.',
    confidence: 'How strongly the public source supports the record: observed, declared, or assured.',
    licence: 'The licence attached to the record. When inferred, the basis and source URL are shown below.',
    'licence-confidence': 'Confidence in the licence metadata. Source-declared values are higher; provider-terms inference is useful but lower confidence.',
    'licence-basis': 'How the licence was assigned: source-declared, inherited from dataset/package metadata, inferred from provider terms, or still not specified.',
    'access-model': 'Observed access requirement from public metadata, such as anonymous access, API key, or approval required.',
    'contract-status': 'Whether the harvest found a machine-readable contract, capability document, service description, or only documentation.',
    'dcat-type': 'The closest DCAT/DCAT-AP class or property role for this OKF record. DCAT terms are shown in monospace, for example dcat:DataService.',
    'openapi-type': 'The closest OpenAPI object or fragment for this OKF record. This is an export hint, not proof that a complete OpenAPI document exists.',
    'standards-export-readiness': 'Whether the generated metadata is ready for a DCAT/OpenAPI export, or which required standard fields are still missing.',
    'openapi-security-scheme': 'The OpenAPI securitySchemes.type implied by the observed access model. Unknown means the source did not expose a machine-readable auth model.',
    'source-date': 'Date supplied by the source metadata. Missing dates are source gaps and do not mean the API or dataset is new or stale.',
    'quality-overall': 'Average of the individual metadata-quality signals. Use it for triage, not as a service rating.',
    'quality-access_clarity': 'Whether the source makes access requirements clear.',
    'quality-contract_signal': 'Strength of observed API contract evidence, such as OpenAPI, OGC capabilities, WSDL, or service descriptions.',
    'quality-discoverability': 'Completeness of basic discovery metadata: title, description, URL, and provider.',
    'quality-documentation': 'Whether a documentation URL or equivalent description is present.',
    'quality-interoperability_signal': 'Whether protocols, formats, or contract-like signals support machine use.',
    'quality-lifecycle_metadata': 'Completeness of created and modified date metadata.',
    'facet-quality': 'Facet recommendation and expected reduction from the generated analysis. It explains navigation usefulness, not data quality.'
  };

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
    id?: string;
    count?: number;
    predicate?: string;
    inverseLabel?: string;
    sourceIri?: string;
    targetIri?: string;
    assertionStatus?: string;
    assertionScope?: string;
    weightValue?: number;
    weightMetric?: string;
    authorityClass?: RelationshipAuthorityClass;
    authorityLabel?: string;
    authoritySource?: string;
    derivation?: string;
    derivationActivity?: string;
    rule?: string;
    supportingAssertions?: string[];
    confidence?: string;
    observedAt?: string;
    staleAfter?: string;
    freshness?: 'current' | 'stale' | 'unknown';
    evidenceUrls?: string[];
    evidenceItems?: RelationshipEvidencePresentation[];
    supportProfile?: '' | 'title-only' | 'notes-only' | 'multi-field';
    reviewStatus?: string;
    officialLegalClassification?: boolean;
    rights?: string;
    rightsSource?: string;
    rightsAssertion?: string;
  };

  type LargeGraphGrouping = {
    dimension: string;
    label: string;
    expandedLabel?: string;
  };

  type LargeGraphHierarchyChoice = {
    route: string;
    label: string;
    count: number;
  };

  type LargeGraphHierarchyLevel = {
    dimension: string;
    label: string;
    activeRoute?: string;
    choices: LargeGraphHierarchyChoice[];
  };

  type LargeGraphHierarchy = {
    rootRoute: string;
    rootLabel: string;
    rootCount: number;
    levels: LargeGraphHierarchyLevel[];
  };

  type LargeGraphModel = {
    center: string;
    nodes: LargeGraphNode[];
    relationships: LargeGraphEdge[];
    grouping?: LargeGraphGrouping;
    hierarchy?: LargeGraphHierarchy;
  };

  type GraphLabel = GraphLabelPlacement;
  type GraphEdgeLabelSpec = {
    id: string;
    text: string;
    source: GraphPoint;
    target: GraphPoint;
    geometry: GraphEdgeGeometry;
    showLabel: boolean;
    selected?: boolean;
  };
  type GraphViewport = { x: number; y: number; w: number; h: number; baseW: number; baseH: number };
  type GraphLayoutMode = 'auto' | 'relationships';
  type GraphKeyMode = 'nodes' | 'relationships';
  type RelationshipDetailTab = 'source' | 'relationship' | 'target';
  type TimelineResolution = 'latest' | 'year' | 'quarter' | 'month';
  type LeftPanelTab = 'facets' | 'browse' | 'results';
  type DetailPanelTab = 'overview' | 'evidence' | 'data';
  type TimelineBucket = {
    key: string;
    label: string;
    count: number;
    kind?: 'series' | 'period';
    catalogueFallbackCount?: number;
    facetKey?: string;
    facetValue?: string;
    samples: Array<{ title: string; route: string; date: string; periodLabel?: string; catalogueFallback?: boolean }>;
  };

  // Keep the editable draft separate from the URL of the source whose state
  // is currently presented. An asynchronous load must not overwrite text a
  // person has entered for their next load or leak that unsubmitted draft
  // into copied routes and feedback links.
  let bundleUrl = $state(DEFAULT_BUNDLE);
  let bundleInputUrl = $state(DEFAULT_BUNDLE);
  let source = $state<LoadedSource | null>(null);
  let exploratoryPublication = $state<ExploratoryPublicationResult>({
    state: 'not-exploratory',
    publication: null,
    warning: '',
    noindex: false
  });
  let error = $state('');
  let modelEnrichmentError = $state('');
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
  let largeSearchResponse = $state<LargeSearchResponse | null>(null);
  let largeSuggestions = $state<SearchSuggestion[]>([]);
  let largeSelectedRoute = $state('');
  let largeInspectedRoute = $state('');
  let largeHighlightedRoute = $state('');
  let largeGraphCenterRoute = $state('');
  let largeForwardRoute = $state('');
  let largeHighlightedEdge = $state('');
  let largeInspectedEdge = $state<LargeGraphEdge | null>(null);
  let largeExpandedStackRoute = $state('');
  let largeExpandedGraphGroups = $state<string[]>([]);
  let largeFacetIndex = $state<Record<string, LargeFacetRow[]>>({});
  let largeFacetIndexLoaded = $state(false);
  let largeFacetIndexLoading = $state(false);
  let largeBaselineFacetRows = $state<Record<string, LargeFacetRow[]>>({});
  let largeIndex = $state<LargeFullIndex | null>(null);
  let largeTargetedDatasets = $state<Map<string, LargeDataset>>(new Map());
  let largeTargetedLoadingRoute = $state('');
  let largeRelationships = $state<LargeRelationship[]>([]);
  let largeRelationshipsByRoute = $state<Map<string, LargeRelationship[]>>(new Map());
  let largeIncompleteRelationshipRoutes = $state<Record<string, string>>({});
  let largeRelationshipsTruncated = $state(false);
  let largeFacetFilters = $state<Record<string, string[]>>({});
  let largeFullLoading = $state(false);
  let largeRelationshipsLoading = $state(false);
  let largeSearchIndexLoading = $state(false);
  let largeSearching = $state(false);
  let largeSearchPendingQuery = $state('');
  let largeFacetHydratingKey = $state('');
  let largeFacetApplyingKey = $state('');
  let largeFacetApplyingValue = $state('');
  let largeFacetSearch = $state<Record<string, string>>({});
  let largeFacetBrowseAll = $state<Record<string, boolean>>({});
  let largeFacetVisibleLimits = $state<Record<string, number>>({});
  let facetPreferences = $state<FacetPreferences>({
    version: 1,
    order: [],
    pinned: [],
    shown: [],
    hidden: [],
    mode: 'suggested',
    density: 'compact'
  });
  let facetMenuKey = $state('');
  let facetPreviewLabels = $state<Record<string, string>>({});
  let largeFacetHighlights = $state<Record<string, string[]>>({});
  let largeFacetPreviewRoute = $state('');
  let draggingFacetKey = $state('');
  let facetDropTargetKey = $state('');
  let leftPanelTab = $state<LeftPanelTab>('facets');
  let detailPanelTab = $state<DetailPanelTab>('overview');
  let largePreserveSelectionUntilSearch = $state(false);
  let largeSearchClient = $state<LargeSearchClient | null>(null);
  let largeSearchRequest = 0;
  let largeSearchRecoveryAttempts = 0;
  let loadRequest = 0;
  let largeApiRoute = $state('');
  let largeApiUrl = $state('');
  let largeApiJson = $state<unknown>(null);
  let largeApiText = $state('');
  let largeApiDisplayMode = $state<Exclude<LargeSourceDisplayMode, 'link'>>('json');
  let largeApiSourceLabel = $state('');
  let largeApiLoading = $state(false);
  let largeApiError = $state('');
  let largeApiBytes = $state(0);
  let largeApiContentType = $state('');
  let largeApiRetrievedAt = $state('');
  let largeApiResponseUrl = $state('');
  let largeSourceInspectorOpen = $state(false);
  let largeApiRequest = 0;
  let activeFacetKey = $state('');
  let pins = $state<string[]>([]);
  let graphCanvasWidth = $state(DEFAULT_GRAPH_WIDTH);
  let graphZoom = $state(1);
  let graphViewport = $state<GraphViewport>({ x: 0, y: 0, w: DEFAULT_GRAPH_WIDTH, h: GRAPH_HEIGHT, baseW: DEFAULT_GRAPH_WIDTH, baseH: GRAPH_HEIGHT });
  let graphDrag = $state<{ x: number; y: number; box: GraphViewport; moved: boolean } | null>(null);
  let graphSuppressClick = $state(false);
  let graphLabelPhase = $state(0);
  let graphLabelsPaused = $state(false);
  let graphKeyMode = $state<GraphKeyMode>('nodes');
  let graphLayoutControlsOpen = $state(false);
  let graphLayoutMode = $state<GraphLayoutMode>('auto');
  let graphRelationshipOrder = $state<string[]>([]);
  let graphHiddenRelationshipGroups = $state<string[]>([]);
  let graphHiddenRelationshipEdges = $state<string[]>([]);
  let graphHiddenNodeTypes = $state<string[]>([]);
  let graphHiddenRelationshipAuthorities = $state<RelationshipAuthorityClass[]>([]);
  let graphHighlightedRelationshipGroup = $state('');
  let relationshipDetailTab = $state<RelationshipDetailTab>('relationship');
  let graphExpandedRelationshipGroups = $state<string[]>([]);
  let draggingGraphRelationshipGroup = $state('');
  let graphRelationshipDropTarget = $state('');
  let spreadPins = $state(false);
  let activeHelpKey = $state('');
  let largeSearchDebounce = $state<number | null>(null);
  let edgePanelHeight = $state(180);
  let edgePanelResizing = $state(false);
  let timelineResolution = $state<TimelineResolution>('latest');
  let retrievalSort = $state<RetrievalSort>('newest');
  let geospatialFilter = $state('');
  let edgePanelResizeCleanup: (() => void) | null = null;

  let activeIncompleteRelationshipRoute = $derived(
    [largeGraphCenterRoute, largeSelectedRoute, largeInspectedRoute]
      .find((route) => route && largeIncompleteRelationshipRoutes[route]) || ''
  );
  let activeIncompleteRelationshipMessage = $derived(
    activeIncompleteRelationshipRoute
      ? largeIncompleteRelationshipRoutes[activeIncompleteRelationshipRoute] || ''
      : ''
  );
  let appAlertMessages = $derived([
    ...new Set(
      [error, modelEnrichmentError, activeIncompleteRelationshipMessage].filter(Boolean)
    )
  ]);
  let smallCorpus = $derived(source?.kind === 'small' ? source.corpus : null);
  let federationOverview = $derived(source?.kind === 'small' ? source.federation : undefined);
  let nodeList = $derived(smallCorpus ? Object.values(smallCorpus.nodes) : []);
  let typeList = $derived([...new Set(nodeList.map((node) => node.type || 'Node'))].sort((a, b) => a.localeCompare(b)));
  let baseVisibleNodes = $derived(
    nodeList.filter((node) => {
      const query = smallQuery.trim().toLowerCase();
      const type = node.type || 'Node';
      if (visibleTypes.size && !visibleTypes.has(type)) return false;
      if (!query) return true;
      return smallNodeSearchText(node).toLowerCase().includes(query);
    }).sort(compareSmallNodes)
  );
  let smallGeospatialRecords: GeospatialRecord[] = $derived(
    baseVisibleNodes.map(classifySmallNode).filter((record): record is GeospatialRecord => Boolean(record))
  );
  let smallGeospatialRouteIds: Set<string> = $derived(
    new Set(smallGeospatialRecords.filter((record) => geospatialFilterMatches(record, geospatialFilter)).map((record) => record.route))
  );
  let visibleNodes = $derived(geospatialFilter ? baseVisibleNodes.filter((node) => smallGeospatialRouteIds.has(node.id)) : baseVisibleNodes);
  let selectedNode = $derived(smallCorpus && selectedId ? smallCorpus.nodes[selectedId] : null);
  let inspectedNode = $derived(smallCorpus && inspectedId ? smallCorpus.nodes[inspectedId] : null);
  let detailNode = $derived(inspectedNode || selectedNode);
  let selectedFederationChild: FederationChild | undefined = $derived(
    federationOverview?.descriptor.children.find((child) => child.id === detailNode?.id)
  );
  let visibleNodeIds = $derived(new Set(visibleNodes.map((node) => node.id)));
  let scopedRelationships = $derived(
    smallCorpus
      ? smallCorpus.relationships.filter((relationship) => visibleNodeIds.has(relationship.source) && visibleNodeIds.has(relationship.target))
      : []
  );
  let scopedRelationshipSummary = $derived(
    summarizeRelationships(scopedRelationships as Array<Record<string, unknown>>)
  );
  let detailRelationships = $derived(
    smallCorpus && detailNode
      ? smallCorpus.relationships.filter((relationship) => relationship.source === detailNode.id || relationship.target === detailNode.id)
      : []
  );
  let bundleSuggestions = $derived(
    [...history, ...registry]
      .filter((entry) => entry.url && (!bundleInputUrl || `${entry.title || entry.label || ''} ${entry.url}`.toLowerCase().includes(bundleInputUrl.toLowerCase())))
      .slice(0, 10)
  );
  let largeResultNames: Set<string> = $derived(new Set(largeResults.map((result) => result.name)));
  let largeResultOrder: Map<string, number> = $derived(new Map(largeResults.map((result, index) => [result.name, index])));
  let largeBaseVisibleDatasets: LargeDataset[] = $derived(largeIndex ? visibleLargeDatasets() : []);
  let largeGeospatialRecords: GeospatialRecord[] = $derived(
    largeIndex
      ? largeBaseVisibleDatasets
          .map((dataset): GeospatialRecord | null => {
            const record = classifyLargeDataset(
              dataset,
              largeIndex?.resourcesByDataset.get(dataset.name) || []
            );
            return record
              ? {
                  ...record,
                  title: endpointLabelForRoute(
                    source?.kind === 'large' ? source.endpointLabels : undefined,
                    record.route,
                    record.title
                  ),
                  ...(dataset.publisher
                    ? {
                        publisher: endpointLabelForRoute(
                          source?.kind === 'large' ? source.endpointLabels : undefined,
                          metadataEndpointRoute('publisher', dataset.publisher),
                          record.publisher || dataset.publisher
                        )
                      }
                    : record.publisher ? { publisher: record.publisher } : {})
                }
              : null;
          })
          .filter((record): record is GeospatialRecord => Boolean(record))
      : []
  );
  let largeGeospatialRouteIds: Set<string> = $derived(
    new Set(largeGeospatialRecords.filter((record) => geospatialFilterMatches(record, geospatialFilter)).map((record) => record.route))
  );
  let largeVisibleDatasets: LargeDataset[] = $derived(
    geospatialFilter
      ? largeBaseVisibleDatasets.filter((dataset) => largeGeospatialRouteIds.has(dataset.route || `dataset/${dataset.name}`))
      : largeBaseVisibleDatasets
  );
  let largeVisibleDatasetNames: Set<string> = $derived(new Set(largeVisibleDatasets.map((dataset) => dataset.name)));
  let largeVisibleResources: LargeResource[] = $derived(
    largeIndex ? largeVisibleDatasets.flatMap((dataset) => largeIndex?.resourcesByDataset.get(dataset.name) || []).slice(0, 600) : []
  );
  let largeDetail: LargeDetail | null = $derived(resolveVisibleLargeDetail(largeFacetPreviewRoute || largeInspectedRoute || largeSelectedRoute));
  let largeFacetKeys: string[] = $derived(source?.kind === 'large' ? declaredLargeFacetKeys(source) : []);
  let activeLargeFilterCount: number = $derived(Object.values(largeFacetFilters).reduce((total, values) => total + values.length, geospatialFilter ? 1 : 0));
  let pinnedLabels: Array<{ route: string; label: string }> = $derived(pins.map((route) => ({ route, label: largeLabelForRoute(route) })));

  function compareSmallNodes(left: OkfNode, right: OkfNode): number {
    if (retrievalSort === 'title') return left.title.localeCompare(right.title);
    if (retrievalSort === 'newest') {
      return conceptGenerated(right).at.localeCompare(conceptGenerated(left).at) || left.title.localeCompare(right.title);
    }
    if (retrievalSort === 'metadata-quality') {
      const leftQuality = typeof left.quality_score === 'number' ? left.quality_score : -1;
      const rightQuality = typeof right.quality_score === 'number' ? right.quality_score : -1;
      return rightQuality - leftQuality || left.title.localeCompare(right.title);
    }
    const query = smallQuery.trim().toLowerCase();
    if (!query) return left.title.localeCompare(right.title);
    return smallMatchScore(right, query) - smallMatchScore(left, query) || left.title.localeCompare(right.title);
  }

  function smallMatchScore(node: OkfNode, query: string): number {
    const title = node.title.toLowerCase();
    const id = node.id.toLowerCase();
    const aliases = (node.aliases || []).map((alias) => alias.toLowerCase());
    if (title === query || id === query || aliases.includes(query)) return 100;
    if (title.startsWith(query) || id.startsWith(query) || aliases.some((alias) => alias.startsWith(query))) return 60;
    if (title.includes(query) || id.includes(query) || aliases.some((alias) => alias.includes(query))) return 30;
    return 10;
  }

  onMount(() => {
    void initialize();
    window.addEventListener('popstate', applyBrowserRoute);
    window.addEventListener('pointerdown', closeBundleSuggestionsOnPointerDown);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) graphLabelsPaused = true;
    const labelTimer = window.setInterval(() => {
      if (activeView === 'graph' && !graphLabelsPaused) graphLabelPhase = (graphLabelPhase + 1) % 100000;
    }, 2000);
    return () => {
      loadRequest += 1;
      largeSearchRequest += 1;
      window.removeEventListener('popstate', applyBrowserRoute);
      window.removeEventListener('pointerdown', closeBundleSuggestionsOnPointerDown);
      window.clearInterval(labelTimer);
      if (largeSearchDebounce !== null) window.clearTimeout(largeSearchDebounce);
      largeSearchClient?.destroy();
      largeSearchClient = null;
      edgePanelResizeCleanup?.();
    };
  });

  async function initialize() {
    const initialUrl = initialBundleUrl();
    const loadRequestAtStart = loadRequest;
    bundleUrl = initialUrl;
    bundleInputUrl = initialUrl;
    history = loadHistory();
    registry = await loadRegistry(DEFAULT_REGISTRY);
    pins = loadPins();
    const initialView = initialViewMode();
    if (initialView) activeView = initialView;
    // A person can submit a URL while the optional registry is still loading.
    // Never let delayed start-up supersede that explicit request.
    if (loadRequest === loadRequestAtStart) await loadSource(initialUrl);
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
      const decoded = decodeURIComponent(raw);
      if (!decoded.startsWith('record:')) return decoded;
      const token = decoded.slice('record:'.length);
      if (!/^[A-Za-z0-9_-]+$/.test(token)) return decoded;
      const padded = token.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - token.length % 4) % 4);
      const bytes = Uint8Array.from(atob(padded), (value) => value.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch {
      // Malformed percent/base64 encoding in a shared link should not break routing.
      return raw;
    }
  }

  function toAbsoluteUrl(url: string): string {
    return new URL(url, location.href).toString();
  }

  function boundedGraphParams(params: URLSearchParams, key: string, limit: number): string[] {
    return [...new Set(
      params.getAll(key)
        .map((value) => value.trim())
        .filter((value) => value && value.length <= 512)
        .slice(0, limit)
    )];
  }

  function applyGraphState(params: URLSearchParams) {
    graphLayoutMode = params.get(GRAPH_LAYOUT_PARAM) === 'relationships' ? 'relationships' : 'auto';
    graphKeyMode = params.get(GRAPH_KEY_MODE_PARAM) === 'relationships' ? 'relationships' : 'nodes';
    graphLabelsPaused = params.get(GRAPH_LABELS_PARAM) === 'off';
    largeExpandedGraphGroups = boundedGraphParams(params, GRAPH_EXPANDED_STACK_PARAM, 12);
    graphRelationshipOrder = boundedGraphParams(params, GRAPH_GROUP_PARAM, 32);
    graphHiddenRelationshipGroups = boundedGraphParams(params, GRAPH_HIDDEN_GROUP_PARAM, 32);
    graphHiddenRelationshipEdges = boundedGraphParams(params, GRAPH_HIDDEN_EDGE_PARAM, 160);
    graphHiddenNodeTypes = boundedGraphParams(params, GRAPH_HIDDEN_NODE_TYPE_PARAM, 32);
    graphHiddenRelationshipAuthorities = boundedGraphParams(
      params,
      GRAPH_HIDDEN_AUTHORITY_PARAM,
      RELATIONSHIP_AUTHORITY_CLASSES.length
    ).filter((value): value is RelationshipAuthorityClass =>
      RELATIONSHIP_AUTHORITY_CLASSES.includes(value as RelationshipAuthorityClass)
    );
    graphHighlightedRelationshipGroup = params.get(GRAPH_HIGHLIGHT_RELATIONSHIP_PARAM)?.slice(0, 512) || '';
    largeHighlightedEdge = params.get(GRAPH_HIGHLIGHT_EDGE_PARAM)?.slice(0, 512) || '';
  }

  function writeGraphState(params: URLSearchParams, route = '') {
    for (const key of [
      GRAPH_LAYOUT_PARAM,
      GRAPH_CENTER_PARAM,
      GRAPH_EXPANDED_STACK_PARAM,
      GRAPH_GROUP_PARAM,
      GRAPH_HIDDEN_GROUP_PARAM,
      GRAPH_HIDDEN_EDGE_PARAM,
      GRAPH_HIDDEN_NODE_TYPE_PARAM,
      GRAPH_HIDDEN_AUTHORITY_PARAM,
      GRAPH_KEY_MODE_PARAM,
      GRAPH_LABELS_PARAM,
      GRAPH_HIGHLIGHT_RELATIONSHIP_PARAM,
      GRAPH_HIGHLIGHT_EDGE_PARAM
    ]) {
      params.delete(key);
    }
    if (graphLayoutMode === 'relationships') params.set(GRAPH_LAYOUT_PARAM, graphLayoutMode);
    if (
      source?.kind === 'large'
      && activeView === 'graph'
      && largeGraphCenterRoute
      && largeGraphCenterRoute !== route
    ) {
      params.set(GRAPH_CENTER_PARAM, largeGraphCenterRoute);
    }
    if (graphKeyMode === 'relationships') params.set(GRAPH_KEY_MODE_PARAM, graphKeyMode);
    if (graphLabelsPaused) params.set(GRAPH_LABELS_PARAM, 'off');
    largeExpandedGraphGroups.forEach((route) => params.append(GRAPH_EXPANDED_STACK_PARAM, route));
    graphRelationshipOrder.forEach((key) => params.append(GRAPH_GROUP_PARAM, key));
    graphHiddenRelationshipGroups.forEach((key) => params.append(GRAPH_HIDDEN_GROUP_PARAM, key));
    graphHiddenRelationshipEdges.forEach((key) => params.append(GRAPH_HIDDEN_EDGE_PARAM, key));
    graphHiddenNodeTypes.forEach((type) => params.append(GRAPH_HIDDEN_NODE_TYPE_PARAM, type));
    graphHiddenRelationshipAuthorities.forEach((authority) =>
      params.append(GRAPH_HIDDEN_AUTHORITY_PARAM, authority)
    );
    if (graphHighlightedRelationshipGroup) {
      params.set(GRAPH_HIGHLIGHT_RELATIONSHIP_PARAM, graphHighlightedRelationshipGroup);
    } else if (largeHighlightedEdge) {
      params.set(GRAPH_HIGHLIGHT_EDGE_PARAM, largeHighlightedEdge);
    }
  }

  function closeBundleSuggestionsOnPointerDown(event: PointerEvent) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.bundle-box')) suggestionsOpen = false;
    if (!target?.closest('.facet-actions')) facetMenuKey = '';
  }

  function buildExplorerUrl(route: string): string {
    const next = new URL(location.href);
    const absoluteDefault = toAbsoluteUrl(DEFAULT_BUNDLE);
    if (bundleUrl === absoluteDefault) next.searchParams.delete('bundle');
    else next.searchParams.set('bundle', bundleUrl);
    if (activeView === 'reader') next.searchParams.delete('view');
    else next.searchParams.set('view', activeView);
    writeRetrievalState(next.searchParams, currentRetrievalState());
    writeGraphState(next.searchParams, route);
    next.searchParams.delete(SMALL_INSPECT_NODE_PARAM);
    next.searchParams.delete(SMALL_INSPECT_RELATIONSHIP_PARAM);
    if (source?.kind === 'small') {
      if (inspectedId) next.searchParams.set(SMALL_INSPECT_NODE_PARAM, inspectedId);
      else if (smallInspectedRelationship) {
        next.searchParams.set(
          SMALL_INSPECT_RELATIONSHIP_PARAM,
          smallRelationshipShareKey(smallInspectedRelationship)
        );
      }
    }
    if (geospatialFilter) next.searchParams.set('geo', geospatialFilter);
    else next.searchParams.delete('geo');
    next.hash = route || (source?.kind === 'large' ? 'overview' : '');
    return next.toString();
  }

  function geospatialFilterFromParams(params: URLSearchParams): string {
    const value = params.get('geo') || '';
    return isGeospatialFilter(value) ? value : '';
  }

  function currentRetrievalState(): RetrievalStateV1 {
    if (source?.kind === 'large') {
      return {
        schema: RETRIEVAL_STATE_SCHEMA,
        query: largeQuery,
        filters: largeFacetFilters,
        sort: retrievalSort
      };
    }
    const allTypesSelected = visibleTypes.size === typeList.length && typeList.every((type) => visibleTypes.has(type));
    return {
      schema: RETRIEVAL_STATE_SCHEMA,
      query: smallQuery,
      filters: allTypesSelected ? {} : { type: [...visibleTypes] },
      sort: retrievalSort
    };
  }

  function largeSourceFacetKeys(
    large: Extract<LoadedSource, { kind: 'large' }>,
    manifest = largeSearchClient?.manifest
  ): string[] {
    const declared = declaredLargeFacetKeys(large, manifest);
    return declared.length ? declared : [...LARGE_FACET_KEYS];
  }

  function declaredLargeFacetKeys(
    large: Extract<LoadedSource, { kind: 'large' }>,
    manifest = largeSearchClient?.manifest
  ): string[] {
    return [...new Set([
      ...Object.keys(large?.overview?.facet_previews ?? {}),
      ...(large?.analysis?.facet_analysis ?? []).map((facet) => facet.key),
      ...Object.keys(manifest?.entrypoints?.filter_postings ?? {}),
      ...Object.keys(largeFacetIndex ?? {}),
      ...Object.keys(largeIndex?.facets ?? {})
    ])];
  }

  function knownLargeFacetValues(index: LargeFullIndex): Record<string, string[]> {
    return Object.fromEntries(
      Object.entries(index?.facets ?? {}).map(([key, rows]) => [
        key,
        [...new Set([...(rows ?? []).map((row) => row.value), MISSING_FILTER_VALUE])]
      ])
    );
  }

  function sanitizeLargeFiltersFromFullIndex(index: LargeFullIndex) {
    if (source?.kind !== 'large') return;
    const filters = normalizeRetrievalFilters(
      largeFacetFilters,
      largeSourceFacetKeys(source),
      knownLargeFacetValues(index)
    );
    if (JSON.stringify(filters) !== JSON.stringify(largeFacetFilters)) {
      largeFacetFilters = filters;
      syncExplorerUrl();
    }
  }

  function removeIgnoredLargeFilters(ignored: Record<string, string[]> | undefined) {
    if (!ignored || !Object.keys(ignored).length) return;
    const filters = Object.fromEntries(
      Object.entries(largeFacetFilters)
        .map(([key, values]) => [key, values.filter((value) => !(ignored[key] || []).includes(value))])
        .filter(([, values]) => values.length)
    );
    largeFacetFilters = filters;
  }

  function syncExplorerUrl(push = false) {
    const route = source?.kind === 'large' ? largeInspectedRoute || largeSelectedRoute : selectedId;
    const url = buildExplorerUrl(route);
    if (push && url !== location.href) pushState(url, {});
    else replaceState(url, {});
  }

  function syncBundleUrlParam(url: string) {
    bundleUrl = url;
    syncExplorerUrl();
  }

  function exploratoryFeedbackHref(): string {
    if (exploratoryPublication.state !== 'valid') return '';
    const route = source?.kind === 'large'
      ? largeInspectedRoute || largeSelectedRoute || 'overview'
      : inspectedId
        ? `node/${inspectedId}`
        : smallInspectedRelationship
          ? `relationship/${smallRelationshipShareKey(smallInspectedRelationship)}`
          : selectedId;
    const reviewRoute = source?.kind === 'large' ? route : selectedId;
    const retrieval = currentRetrievalState();
    return buildExploratoryFeedbackUrl(
      exploratoryPublication.publication.feedbackUrl,
      {
        reviewUrl: buildExplorerUrl(reviewRoute),
        bundleUrl,
        view: activeView,
        query: retrieval.query,
        filters: retrieval.filters,
        route
      }
    );
  }

  function smallBundleTitle(corpus: NormalizedCorpus): string {
    return corpus.title || 'OKF bundle';
  }

  function applyBrowserRoute() {
    const nextView = initialViewMode();
    if (nextView) void selectView(nextView, false);
    const hash = safeDecodeHash();
    const browserParams = new URLSearchParams(location.search);
    geospatialFilter = geospatialFilterFromParams(browserParams);
    if (source?.kind === 'large') {
      const params = browserParams;
      const state = parseRetrievalState(params, largeSourceFacetKeys(source));
      const previousFilters = JSON.stringify(largeFacetFilters);
      const previousSort = retrievalSort;
      largeQuery = state.query;
      retrievalSort = state.sort;
      largeFacetFilters = state.filters;
      const filtersChanged = previousFilters !== JSON.stringify(largeFacetFilters);
      applyLargeBrowserRoute(hash, hasSerializedFilters(params));
      applySerializedGraphCenter(params, hash);
      if ((largeSelectedRoute || largeInspectedRoute) && FULL_INDEX_VIEWS.has(activeView)) {
        void hydrateForView(activeView);
      }
      if (state.query !== largeAppliedQuery || filtersChanged || previousSort !== state.sort) {
        if (largeSearchClient) void runLargeSearch(state.query, { preserveSelection: true });
        else {
          largeSearchPendingQuery = state.query;
          if (!source.searchManifest) void ensureLargeFullIndex();
        }
      }
      reconcileLargeSelection();
    } else if (smallCorpus) {
      const state = parseRetrievalState(new URLSearchParams(location.search), ['type']);
      smallQuery = state.query;
      retrievalSort = state.sort;
      const selectedTypes = state.filters.type || [];
      visibleTypes = selectedTypes.length
        ? new Set(selectedTypes.filter((type) => typeList.includes(type)))
        : new Set(typeList);
      if (!visibleTypes.size) visibleTypes = new Set(typeList);
      if (hash && smallCorpus.nodes[hash]) {
        selectedId = hash;
        if (!nextView) activeView = conversationPresentation(smallCorpus.nodes[hash]) ? 'narrative' : 'reader';
      }
      applySmallInspectionState(browserParams);
    }
    applyGraphState(browserParams);
    if (graphHighlightedRelationshipGroup || largeHighlightedEdge) {
      void tick().then(restoreGraphRelationshipInspection);
    } else if (!largeHighlightedEdge) {
      largeInspectedEdge = null;
    }
  }

  function smallRelationshipShareKey(relationship: OkfRelationship): string {
    const identifier = typeof relationship.id === 'string' ? relationship.id.trim() : '';
    if (identifier) return `id:${identifier}`;
    const index = smallCorpus?.relationships.indexOf(relationship) ?? -1;
    return index >= 0 ? `index:${index}` : '';
  }

  function smallRelationshipForShareKey(key: string): OkfRelationship | null {
    if (!smallCorpus || !key || key.length > 512) return null;
    if (key.startsWith('id:')) {
      const identifier = key.slice(3);
      return smallCorpus.relationships.find((relationship) => relationship.id === identifier) || null;
    }
    if (key.startsWith('index:')) {
      const index = Number(key.slice(6));
      return Number.isSafeInteger(index) && index >= 0
        ? smallCorpus.relationships[index] || null
        : null;
    }
    return null;
  }

  function applySmallInspectionState(params: URLSearchParams) {
    inspectedId = '';
    smallInspectedRelationship = null;
    if (!smallCorpus) return;
    const inspectedNodeId = (params.get(SMALL_INSPECT_NODE_PARAM) || '').slice(0, 512);
    if (inspectedNodeId && smallCorpus.nodes[inspectedNodeId]) {
      inspectedId = inspectedNodeId;
      rightCollapsed = false;
      return;
    }
    const relationship = smallRelationshipForShareKey(
      params.get(SMALL_INSPECT_RELATIONSHIP_PARAM) || ''
    );
    if (relationship) {
      smallInspectedRelationship = relationship;
      rightCollapsed = false;
    }
  }

  function applyLargeBrowserRoute(hash: string, preserveSerializedFilters = false) {
    const route = hash && hash !== 'overview' ? hash : '';
    clearLargeFacetPreviewContext();
    largeSelectedRoute = '';
    largeInspectedRoute = '';
    largeHighlightedRoute = '';
    largeGraphCenterRoute = '';
    largeForwardRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    largeExpandedGraphGroups = [];
    clearLargeApiPanel();
    if (!route) {
      if (!preserveSerializedFilters) largeFacetFilters = {};
      return;
    }
    rightCollapsed = false;
    const facetRoute = routeForAnalysisNode(route);
    if (facetRoute) {
      activeFacetKey = facetRoute.key;
      if (!preserveSerializedFilters) largeFacetFilters = { [facetRoute.key]: [facetRoute.value] };
      largeInspectedRoute = route;
      largeHighlightedRoute = route;
      largeGraphCenterRoute = route;
      return;
    }
    largeSelectedRoute = route;
    largeHighlightedRoute = route;
    largeGraphCenterRoute = route;
  }

  function applySerializedGraphCenter(params: URLSearchParams, inspectedRoute: string) {
    const centerRoute = (params.get(GRAPH_CENTER_PARAM) || '').trim().slice(0, 512);
    if (activeView !== 'graph' || !centerRoute || !inspectedRoute || centerRoute === inspectedRoute) return;
    largeSelectedRoute = centerRoute;
    largeInspectedRoute = inspectedRoute;
    largeHighlightedRoute = inspectedRoute;
    largeGraphCenterRoute = centerRoute;
  }

  async function loadSource(
    url: string,
    declaredRoutes: FederationAccessRoute[] = [],
    declaredRawSubpath = ''
  ) {
    const requestId = ++loadRequest;
    const bundleInputAtStart = bundleInputUrl;
    largeSearchRequest += 1;
    const absoluteUrl = toAbsoluteUrl(url);
    loading = true;
    error = '';
    modelEnrichmentError = '';
    // Clear content and publication state together. A previous exploratory
    // source must never remain visible while its banner/noindex state is reset.
    source = null;
    exploratoryPublication = {
      state: 'not-exploratory',
      publication: null,
      warning: '',
      noindex: false
    };
    selectedId = '';
    inspectedId = '';
    smallQuery = '';
    retrievalSort = 'newest';
    geospatialFilter = geospatialFilterFromParams(new URLSearchParams(location.search));
    smallInspectedRelationship = null;
    largeSelectedRoute = '';
    largeInspectedRoute = '';
    largeHighlightedRoute = '';
    largeGraphCenterRoute = '';
    largeForwardRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    largeExpandedStackRoute = '';
    largeExpandedGraphGroups = [];
    clearLargeApiPanel();
    largeAppliedQuery = '';
    largeResults = [];
    largeSearchResponse = null;
    largeSuggestions = [];
    largeFacetIndex = {};
    largeFacetIndexLoaded = false;
    largeFacetIndexLoading = false;
    largeBaselineFacetRows = {};
    largeIndex = null;
    largeTargetedDatasets = new Map();
    largeTargetedLoadingRoute = '';
    largeRelationships = [];
    largeRelationshipsByRoute = new Map();
    largeIncompleteRelationshipRoutes = {};
    largeRelationshipsTruncated = false;
    largeFacetFilters = {};
    largeFullLoading = false;
    largeRelationshipsLoading = false;
    largeSearchIndexLoading = false;
    largeSearching = false;
    largeSearchPendingQuery = '';
    largeSearchRecoveryAttempts = 0;
    largeFacetHydratingKey = '';
    largeFacetApplyingKey = '';
    largeFacetApplyingValue = '';
    largeFacetSearch = {};
    largeFacetBrowseAll = {};
    largeFacetVisibleLimits = {};
    facetPreferences = { version: 1, order: [], pinned: [], shown: [], hidden: [], mode: 'suggested', density: 'compact' };
    facetMenuKey = '';
    facetPreviewLabels = {};
    largeFacetHighlights = {};
    largeFacetPreviewRoute = '';
    draggingFacetKey = '';
    facetDropTargetKey = '';
    leftPanelTab = 'facets';
    detailPanelTab = 'overview';
    edgePanelHeight = 180;
    timelineResolution = 'latest';
    graphLayoutMode = 'auto';
    graphKeyMode = 'nodes';
    graphLabelsPaused = false;
    graphLayoutControlsOpen = false;
    graphRelationshipOrder = [];
    graphHiddenRelationshipGroups = [];
    graphHiddenRelationshipEdges = [];
    graphHiddenNodeTypes = [];
    graphHiddenRelationshipAuthorities = [];
    graphHighlightedRelationshipGroup = '';
    graphExpandedRelationshipGroups = [];
    draggingGraphRelationshipGroup = '';
    graphRelationshipDropTarget = '';
    applyGraphState(new URLSearchParams(location.search));
    largePreserveSelectionUntilSearch = false;
    activeFacetKey = '';
    largeSearchClient?.destroy();
    largeSearchClient = null;
    try {
      const parsed = new URL(absoluteUrl);
      if (parsed.origin !== location.origin && parsed.protocol !== 'https:') {
        throw new Error('Only https:// bundle URLs (or same-origin paths) can be loaded.');
      }
      const fetched = await fetchStructuredDocumentWithFallback<Record<string, unknown>>(
        absoluteUrl,
        declaredRoutes
      );
      const raw = fetched.document;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error(`${fetched.responseUrl}: bundle descriptor must be an object`);
      }
      if (requestId !== loadRequest) return;
      const movedTo = movedBundleTarget(raw, fetched.responseUrl);
      if (movedTo) {
        if (bundleInputAtStart === url && bundleInputUrl === bundleInputAtStart) {
          bundleInputUrl = movedTo;
        }
        await loadSource(movedTo);
        return;
      }
      const nextExploratoryPublication = parseExploratoryPublication(raw);
      // Commit the fail-safe publication envelope before any subordinate
      // large-corpus resources are awaited. If hydration fails, the parsed
      // warning/noindex state remains in force and no stale source is shown.
      exploratoryPublication = nextExploratoryPublication;
      const resolvedUrl = fetched.responseUrl;
      if (isFederationDescriptor(raw)) {
        const federation = loadFederationOverview(
          raw,
          absoluteUrl,
          resolvedUrl,
          fetched.attemptedUrls
        );
        source = {
          kind: 'small',
          url: resolvedUrl,
          title: federation.corpus.title,
          corpus: federation.corpus,
          federation: federation.overview
        };
        leftCollapsed = true;
        rightCollapsed = true;
        const availableTypes = [...new Set(Object.values(federation.corpus.nodes).map((node) => node.type || 'Node'))];
        visibleTypes = new Set(availableTypes);
        history = rememberHistory({
          url: resolvedUrl,
          title: federation.corpus.title,
          description: federation.corpus.description,
          kind: 'federation',
          semantic_url: federation.overview.descriptor.discovery.semantic_descriptor,
          home_url: federation.overview.descriptor.discovery.documentation,
          profile: federation.overview.descriptor.profile,
          version: federation.overview.descriptor.version,
          status: federation.overview.descriptor.status,
          publisher: federation.overview.descriptor.publisher,
          license: federation.overview.descriptor.license,
          repository_url: federation.overview.descriptor.discovery.repository,
          documentation_url: federation.overview.descriptor.discovery.documentation,
          raw_subpath: federation.overview.descriptor.discovery.raw_subpath,
          release_archive_url: federation.overview.descriptor.discovery.release_archive,
          routes: federation.overview.descriptor.discovery.routes
        });
        commitLoadedBundleUrl(resolvedUrl, url, bundleInputAtStart);
        const hash = safeDecodeHash();
        selectedId = hash && hash !== 'overview' && federation.corpus.nodes[hash] ? hash : '';
      } else if (isLargeCorpusDescriptor(raw)) {
        const large = await loadLargeCorpus(resolvedUrl, raw as unknown as LargeCorpusDescriptor);
        if (requestId !== loadRequest) return;
        source = large;
        leftCollapsed = false;
        rightCollapsed = true;
        loadFacetPreferences();
        void ensureLargeFacetIndex();
        detailPanelTab = providerDefaultDetailTab();
        leftPanelTab = providerDefaultLeftTab();
        const searchManifest = large.searchManifest;
        history = rememberHistory({
          url: resolvedUrl,
          title: large.descriptor.title,
          description: large.descriptor.description,
          kind: 'large-corpus',
          semantic_url: large.descriptor.semantic_descriptor,
          profile: large.descriptor.profile,
          version: large.descriptor.version,
          status: large.descriptor.status,
          publisher: large.descriptor.publisher,
          license: large.descriptor.license
        });
        commitLoadedBundleUrl(resolvedUrl, url, bundleInputAtStart);
        const params = new URLSearchParams(location.search);
        // The v2 manifest may advertise additional corpus-specific filter keys. Keep
        // syntactically valid URL filters until that manifest is ready, then validate.
        const retrieval = parseRetrievalState(params, searchManifest ? undefined : largeSourceFacetKeys(large));
        const query = retrieval.query;
        largeQuery = retrieval.query;
        retrievalSort = retrieval.sort;
        largeFacetFilters = retrieval.filters;
        largeSearchPendingQuery = retrieval.query;
        const hash = safeDecodeHash();
        if (hash && hash !== 'overview') {
          applyLargeBrowserRoute(hash, hasSerializedFilters(params));
          applySerializedGraphCenter(params, hash);
          applyGraphState(params);
          rightCollapsed = false;
          if (largeHasRecordLocator()) {
            void ensureLargeDataset(hash);
          }
          if (largeSelectedRoute || largeInspectedRoute) void hydrateForView(activeView);
        } else if (Object.keys(largeFacetFilters).length && !searchManifest) {
          applyGraphState(params);
          void ensureLargeFullIndex();
        } else {
          applyGraphState(params);
        }
        if (FULL_INDEX_VIEWS.has(activeView) || RELATIONSHIP_VIEWS.has(activeView)) void hydrateForView(activeView);
        if (searchManifest) void initialiseLargeSearch(large, searchManifest, query, requestId);
      } else {
        const corpus = normalizeSmallBundle(raw);
        source = { kind: 'small', url: resolvedUrl, title: smallBundleTitle(corpus), corpus };
        const availableTypes = [...new Set(Object.values(corpus.nodes).map((node) => node.type || 'Node'))];
        const retrieval = parseRetrievalState(new URLSearchParams(location.search), ['type']);
        const requestedTypes = retrieval.filters.type || [];
        visibleTypes = requestedTypes.length
          ? new Set(requestedTypes.filter((type) => availableTypes.includes(type)))
          : new Set(availableTypes);
        if (!visibleTypes.size) visibleTypes = new Set(availableTypes);
        smallQuery = retrieval.query;
        retrievalSort = retrieval.sort;
        history = rememberHistory({ url: resolvedUrl, title: corpus.title, description: corpus.description, kind: 'bundle' });
        commitLoadedBundleUrl(resolvedUrl, url, bundleInputAtStart);
        const hash = safeDecodeHash();
        selectedId = hash && corpus.nodes[hash] ? hash : Object.keys(corpus.nodes)[0] || '';
        if (!initialViewMode() && conversationPresentation(corpus.nodes[selectedId])) activeView = 'narrative';
      }
      if (source?.kind === 'small') {
        applySmallInspectionState(new URLSearchParams(location.search));
      }
      if (source?.kind === 'large' && (largeSelectedRoute || largeInspectedRoute)) {
        rightCollapsed = false;
      }
      syncBundleUrlParam(bundleUrl);
      suggestionsOpen = false;
    } catch (err) {
      if (requestId !== loadRequest) return;
      source = null;
      const detail = err instanceof Error ? err.message : String(err);
      error = declaredRawSubpath
        ? `${detail} Declared repository subpath: ${declaredRawSubpath}.`
        : detail;
    } finally {
      if (requestId === loadRequest) loading = false;
    }
  }

  function commitLoadedBundleUrl(resolvedUrl: string, requestedUrl: string, inputAtStart: string) {
    bundleUrl = resolvedUrl;
    if (inputAtStart === requestedUrl && bundleInputUrl === inputAtStart) {
      bundleInputUrl = resolvedUrl;
    }
  }

  function loadFederationChild(child: FederationChild) {
    const primary = child.descriptor || child.discovery.routes.find((route) =>
      route.purpose === 'descriptor' ||
      (!route.purpose && ['published', 'raw'].includes(route.kind))
    )?.url;
    if (!primary) {
      error = `${child.title} is ${child.status}; no loadable descriptor is declared. Use its documentation or repository route.`;
      return;
    }
    // A control-plane child id is not a valid route in the child data plane.
    // Reset the URL and view before loading so `#uk-legislation` cannot be
    // mistaken for a record route and trigger eager full-index hydration.
    const next = new URL(location.href);
    next.search = '';
    next.searchParams.set('bundle', primary);
    next.hash = 'overview';
    activeView = 'reader';
    replaceState(next, {});
    bundleInputUrl = primary;
    void loadSource(primary, child.discovery.routes, child.discovery.raw_subpath);
  }

  async function initialiseLargeSearch(
    large: Extract<LoadedSource, { kind: 'large' }>,
    searchManifestReference: LargeResourceReference,
    initialQuery: string,
    requestId: number
  ) {
    const client = new LargeSearchClient();
    largeSearchIndexLoading = true;
    try {
      await client.init(
        large.baseUrl,
        searchManifestReference,
        large.releaseDataPlane,
        large.snapshot
      );
      if (requestId !== loadRequest || source?.kind !== 'large' || source.url !== large.url) {
        client.destroy();
        return;
      }
      largeSearchClient = client;
      // The worker manifest can introduce corpus-specific facet keys that were
      // unavailable when the descriptor first loaded. Reapply stored choices
      // against that authoritative key set instead of the generic fallback.
      loadFacetPreferences();
      await ensureLargeFacetIndex();
      if (requestId !== loadRequest || source?.kind !== 'large' || source.url !== large.url) return;
      const retrieval = parseRetrievalState(
        new URLSearchParams(location.search),
        largeSourceFacetKeys(large, client.manifest)
      );
      largeQuery = retrieval.query;
      retrievalSort = retrieval.sort;
      largeFacetFilters = retrieval.filters;
      syncExplorerUrl();
      const pendingQuery = largeSearchPendingQuery || initialQuery || largeQuery;
      largeSearchPendingQuery = '';
      if (pendingQuery.trim() || Object.keys(largeFacetFilters).length) {
        void runLargeSearch(pendingQuery, { preserveSelection: true });
      }
    } catch (searchError) {
      client.destroy();
      if (requestId !== loadRequest || source?.kind !== 'large' || source.url !== large.url) return;
      console.warn(`Search index unavailable for ${large.url}:`, searchError);
      const detail = searchError instanceof Error ? searchError.message : String(searchError);
      error = `Static search index unavailable: ${detail}. Full-record views and locally loaded filters remain available.`;
      if (!declaredLargeFacetKeys(large, null).length || Object.keys(largeFacetFilters).length) {
        void ensureLargeFullIndex();
      }
    } finally {
      if (requestId === loadRequest && source?.kind === 'large' && source.url === large.url) {
        largeSearchIndexLoading = false;
      }
    }
  }

  async function loadFile(file: File | null) {
    if (!file) return;
    const bundleInputAtStart = bundleInputUrl;
    loadRequest += 1;
    largeSearchRequest += 1;
    largeSearchClient?.destroy();
    largeSearchClient = null;
    largeFacetIndex = {};
    largeFacetIndexLoaded = false;
    largeFacetIndexLoading = false;
    largeBaselineFacetRows = {};
    largeIndex = null;
    largeTargetedDatasets = new Map();
    largeTargetedLoadingRoute = '';
    largeRelationships = [];
    largeRelationshipsByRoute = new Map();
    largeSearchResponse = null;
    largeResults = [];
    largeFullLoading = false;
    largeRelationshipsLoading = false;
    largeSearchIndexLoading = false;
    largeSearching = false;
    largeSearchRecoveryAttempts = 0;
    graphLayoutMode = 'auto';
    graphKeyMode = 'nodes';
    graphLabelsPaused = false;
    graphLayoutControlsOpen = false;
    graphRelationshipOrder = [];
    graphHiddenRelationshipGroups = [];
    graphHiddenRelationshipEdges = [];
    graphHiddenNodeTypes = [];
    graphHiddenRelationshipAuthorities = [];
    graphHighlightedRelationshipGroup = '';
    graphExpandedRelationshipGroups = [];
    draggingGraphRelationshipGroup = '';
    graphRelationshipDropTarget = '';
    loading = true;
    error = '';
    source = null;
    exploratoryPublication = {
      state: 'not-exploratory',
      publication: null,
      warning: '',
      noindex: false
    };
    try {
      const fileUrl = `file:///${encodeURIComponent(file.name)}`;
      const raw = parseStructuredDocumentText<Record<string, unknown>>(
        await file.text(),
        file.name,
        file.type
      );
      const nextExploratoryPublication = parseExploratoryPublication(raw);
      exploratoryPublication = nextExploratoryPublication;
      if (isLargeCorpusDescriptor(raw)) {
        throw new Error('Large-corpus descriptors need remote chunk URLs; publish the descriptor or load it by URL.');
      }
      const federation = isFederationDescriptor(raw)
        ? loadFederationOverview(raw, fileUrl)
        : null;
      const corpus = federation?.corpus || normalizeSmallBundle(raw);
      source = {
        kind: 'small',
        url: fileUrl,
        title: corpus.title,
        corpus,
        ...(federation ? { federation: federation.overview } : {})
      };
      bundleUrl = fileUrl;
      if (bundleInputUrl === bundleInputAtStart) bundleInputUrl = fileUrl;
      geospatialFilter = '';
      visibleTypes = new Set([...new Set(Object.values(corpus.nodes).map((node) => node.type || 'Node'))]);
      selectedId = Object.keys(corpus.nodes)[0] || '';
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function selectView(view: ViewMode, push = true) {
    activeView = view;
    if (view === 'graph') graphLabelPhase = 0;
    await hydrateForView(view);
    // A deep route can become available while an overview-first load is still
    // settling. In that case hydrateForView may have legitimately returned
    // against the earlier overview state. Before presenting a full-index view,
    // close that race for record routes which have no bounded locator instead
    // of leaving an isolated node on slower engines such as WebKit.
    const selectedRoute = largeSelectedRoute || largeInspectedRoute || largeGraphCenterRoute;
    if (
      source?.kind === 'large' &&
      largeRouteIsKnownRecord(selectedRoute) &&
      FULL_INDEX_VIEWS.has(view) &&
      !largeIndex &&
      !largeHasRecordLocator()
    ) {
      await ensureLargeFullIndex();
    }
    if (view === 'graph' && (graphHighlightedRelationshipGroup || largeHighlightedEdge)) {
      restoreGraphRelationshipInspection();
    }
    syncExplorerUrl(push);
  }

  function largeHasBoundedMetadataRouteContext(
    route = largeSelectedRoute || largeInspectedRoute
  ): boolean {
    const facet = route ? metadataFacetForRoute(route) : null;
    return Boolean(
      facet &&
      supportsWorkerFilter(facet.key) &&
      (largeFacetFilters[facet.key] || []).includes(facet.value)
    );
  }

  async function hydrateForView(view: ViewMode) {
    if (source?.kind !== 'large') return;
    if (largeHasAnalysisOverview(view)) return;
    const selectedRoute = largeSelectedRoute || largeInspectedRoute;
    const targetedRelationships = Boolean(
      selectedRoute && largeHasTargetedRelationships(selectedRoute) && view !== 'resources'
    );
    // Start the route-bounded semantic load before consulting the independent
    // record locator. Aggregate/topic routes need not be record-addressable,
    // and must never fall through to whole-plane relationship hydration.
    const targetedRelationshipPromise = targetedRelationships
      ? ensureLargeRouteRelationships(selectedRoute)
      : null;
    let selectedDataset: LargeDataset | null | undefined;
    if (selectedRoute && largeHasRecordLocator()) {
      selectedDataset = await ensureLargeDataset(selectedRoute);
      // A record locator hydrates only the selected dataset. The resource
      // stack is assembled from the corpus-wide resource index, so it must
      // load that index before rendering even when a targeted dataset is
      // already available.
      if (view === 'resources') {
        await ensureLargeFullIndex();
        return;
      }
    }
    if (targetedRelationshipPromise) {
      await targetedRelationshipPromise;
      return;
    }
    if (selectedRoute && largeHasRecordLocator()) {
      if (!selectedDataset) {
        if (FULL_INDEX_VIEWS.has(view) || RELATIONSHIP_VIEWS.has(view)) await ensureLargeFullIndex();
        if (RELATIONSHIP_VIEWS.has(view)) await ensureLargeRelationships();
      } else if (RELATIONSHIP_VIEWS.has(view)) {
        await ensureLargeRelationships();
      }
      return;
    }
    if (largeHasBoundedMetadataRouteContext(selectedRoute)) {
      // The static filter posting and bounded search result documents already
      // provide the current facet's record membership. Graph and Links can
      // project that context without hydrating the complete record plane.
      return;
    }
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
    const loadingSource = source;
    const advertisedRecords = Math.max(
      Number(loadingSource.descriptor.counts?.records || 0),
      Number(loadingSource.descriptor.counts?.datasets || 0),
      Number(loadingSource.descriptor.counts?.works || 0),
      Number(loadingSource.manifest.counts?.records || 0),
      Number(loadingSource.manifest.counts?.datasets || 0),
      Number(loadingSource.manifest.counts?.works || 0)
    );
    if (advertisedRecords > MAX_SAFE_FULL_INDEX_RECORDS) {
      error =
        `Full-corpus hydration is disabled for this ${advertisedRecords.toLocaleString()}-record bundle ` +
        `because it would exceed the browser memory safety limit. The overview, static search, facets, ` +
        `relationship summaries and targeted records remain available; reload the bundle to retry any failed indexed resource.`;
      return null;
    }
    const requestId = loadRequest;
    largeFullLoading = true;
    try {
      const index = await loadingSource.loadFullIndex();
      if (requestId !== loadRequest || source !== loadingSource) return null;
      largeIndex = index;
      largeFacetIndex = index.facets;
      largeFacetIndexLoaded = true;
      sanitizeLargeFiltersFromFullIndex(index);
      reconcileLargeSelection();
      if (activeView === 'graph' && (graphHighlightedRelationshipGroup || largeHighlightedEdge)) {
        await tick();
        restoreGraphRelationshipInspection();
      }
      return index;
    } catch (err) {
      if (requestId === loadRequest && source === loadingSource) {
        error = err instanceof Error ? err.message : String(err);
      }
      return null;
    } finally {
      if (requestId === loadRequest && source === loadingSource) largeFullLoading = false;
    }
  }

  function largeHasRecordLocator(): boolean {
    return Boolean(
      source?.kind === 'large' &&
      (source.descriptor.entrypoints.record_locator || source.manifest.indexes.record_locator)
    );
  }

  function largeHasTargetedRelationships(
    route = largeSelectedRoute || largeInspectedRoute
  ): boolean {
    return Boolean(
      source?.kind === 'large' && prefersTargetedRelationshipHydration(source, route)
    );
  }

  async function ensureLargeDataset(
    route: string,
    result?: Pick<SearchResultDoc, 'ordinal'>
  ): Promise<LargeDataset | null> {
    // Large-corpus profiles may publish source-native record routes such as
    // `asset/…` or `risk/…`. The locator, not a hard-coded `dataset/` prefix,
    // is the authority for whether a route hydrates a record.
    if (source?.kind !== 'large' || !route) return null;
    const existing = largeTargetedDatasets.get(route) || indexedDatasetForRoute(route);
    if (existing) return existing;
    if (!largeHasRecordLocator()) return null;
    const loadingSource = source;
    const requestId = loadRequest;
    largeTargetedLoadingRoute = route;
    try {
      const dataset = await loadingSource.loadDatasetForRoute(route, result?.ordinal);
      if (requestId !== loadRequest || source !== loadingSource) return null;
      if (!dataset) {
        if (result) {
          error = `No targeted record location is published for ${route}. Search and corpus-level exploration remain available.`;
        }
        return null;
      }
      largeTargetedDatasets = new Map(largeTargetedDatasets).set(route, dataset);
      error = '';
      return dataset;
    } catch (err) {
      if (requestId === loadRequest && source === loadingSource) {
        error =
          `The selected record could not be loaded without hydrating the whole corpus: ` +
          `${err instanceof Error ? err.message : String(err)}. Reload the bundle to retry.`;
      }
      return null;
    } finally {
      if (requestId === loadRequest && source === loadingSource && largeTargetedLoadingRoute === route) {
        largeTargetedLoadingRoute = '';
      }
    }
  }

  async function ensureLargeFacetIndex(): Promise<Record<string, LargeFacetRow[]>> {
    if (source?.kind !== 'large') return {};
    if (largeFacetIndexLoaded) return largeFacetIndex;
    const loadingSource = source;
    const requestId = loadRequest;
    largeFacetIndexLoading = true;
    try {
      const facets = await loadingSource.loadFacetIndex();
      if (requestId !== loadRequest || source !== loadingSource) return {};
      largeFacetIndex = facets;
      largeFacetIndexLoaded = true;
      loadFacetPreferences();
      return facets;
    } catch (facetError) {
      if (requestId === loadRequest && source === loadingSource) {
        console.warn(`Facet index unavailable for ${loadingSource.url}:`, facetError);
      }
      return {};
    } finally {
      if (requestId === loadRequest && source === loadingSource) largeFacetIndexLoading = false;
    }
  }

  async function hydrateLargeFacetValues(key: string) {
    const loadingSource = source;
    largeFacetHydratingKey = key;
    await ensureLargeFacetIndex();
    if (source !== loadingSource) return;
    if (Object.prototype.hasOwnProperty.call(largeFacetIndex, key)) {
      if (largeFacetHydratingKey === key) largeFacetHydratingKey = '';
      return;
    }
    if (supportsWorkerFilter(key)) {
      await runLargeSearch(largeQuery, { preserveSelection: true });
      if (largeFacetHydratingKey === key) largeFacetHydratingKey = '';
      return;
    }
    if (source?.kind === 'large' && source.searchManifest && largeSearchIndexLoading) {
      // The worker will serve this facet if its manifest declares postings.
      // Do not race worker initialisation by falling back to the complete
      // record plane.
      if (largeFacetHydratingKey === key) largeFacetHydratingKey = '';
      return;
    }
    if (!largeIndex) {
      await ensureLargeFullIndex();
      if (largeFacetHydratingKey === key) largeFacetHydratingKey = '';
    }
  }

  async function openLargeFacet(key: string) {
    if (facetIsOpen(key) && !facetIsPinned(key) && !largeFacetFilters[key]?.length) {
      activeFacetKey = '';
      return;
    }
    activeFacetKey = key;
    await hydrateLargeFacetValues(key);
  }

  function supportsWorkerFilter(key: string): boolean {
    return Boolean(largeSearchClient?.manifest?.entrypoints.filter_postings?.[key]);
  }

  function supportsCurrentWorkerFilters(): boolean {
    return Object.keys(largeFacetFilters).every((key) => supportsWorkerFilter(key));
  }

  function refreshLargeReduction() {
    if (
      supportsCurrentWorkerFilters() ||
      (source?.kind === 'large' && Boolean(source.searchManifest) && largeSearchIndexLoading)
    ) {
      void runLargeSearch(largeQuery, { preserveSelection: true });
      return;
    }
    void ensureLargeFullIndex();
  }

  function requestedDynamicFacetKeys(): string[] {
    return [...new Set([
      ...providerOrderedLargeFacetKeys().filter((key) => facetIsOpen(key)),
      activeFacetKey,
      ...Object.keys(largeFacetFilters)
    ])].filter((key) => key && supportsWorkerFilter(key));
  }

  function copyModelEnrichmentState(
    enrichment: LargeModelEnrichmentState | undefined
  ): LargeModelEnrichmentState | undefined {
    if (!enrichment) return undefined;
    return {
      ...enrichment,
      ...(enrichment.counts
        ? {
            counts: {
              ...enrichment.counts,
              ...(enrichment.counts.byKind
                ? { byKind: { ...enrichment.counts.byKind } }
                : {}),
              ...(enrichment.counts.bySupport
                ? { bySupport: { ...enrichment.counts.bySupport } }
                : {})
            }
          }
        : {})
    };
  }

  function syncModelEnrichmentState(
    loadingSource: LargeCorpusSource
  ): LargeModelEnrichmentState | undefined {
    const snapshot = copyModelEnrichmentState(
      loadingSource.modelEnrichmentSnapshot()
    );
    if (source === loadingSource) {
      loadingSource.modelEnrichment = snapshot;
    }
    return snapshot;
  }

  function isModelAssistedRelationship(
    relationship: LargeRelationship
  ): boolean {
    return relationshipPresentation(
      relationship as unknown as Record<string, unknown>
    ).authorityClass === 'model-assisted';
  }

  function markRelationshipRoutesIncomplete(
    routes: Iterable<string>,
    message: string
  ) {
    const next = { ...largeIncompleteRelationshipRoutes };
    for (const route of routes) {
      if (route) next[route] = message;
    }
    largeIncompleteRelationshipRoutes = next;
  }

  function clearIncompleteRelationshipRoute(route: string) {
    if (!largeIncompleteRelationshipRoutes[route]) return;
    const next = { ...largeIncompleteRelationshipRoutes };
    delete next[route];
    largeIncompleteRelationshipRoutes = next;
  }

  function purgeCachedModelAssistedRelationships(): Set<string> {
    const affectedRoutes = new Set<string>();
    const nextByRoute = new Map<string, LargeRelationship[]>();
    for (const [route, rows] of largeRelationshipsByRoute) {
      const retained = rows.filter(
        (relationship) => !isModelAssistedRelationship(relationship)
      );
      if (retained.length !== rows.length) affectedRoutes.add(route);
      nextByRoute.set(route, retained);
    }
    largeRelationshipsByRoute = nextByRoute;

    const retainedRelationships: LargeRelationship[] = [];
    for (const relationship of largeRelationships) {
      if (isModelAssistedRelationship(relationship)) {
        affectedRoutes.add(relationship.source);
        affectedRoutes.add(relationship.target);
      } else {
        retainedRelationships.push(relationship);
      }
    }
    largeRelationships = retainedRelationships;

    if (largeInspectedEdge?.authorityClass === 'model-assisted') {
      largeInspectedEdge = null;
      largeHighlightedEdge = '';
      graphHighlightedRelationshipGroup = '';
    }
    return affectedRoutes;
  }

  async function ensureLargeRelationships(): Promise<LargeRelationship[]> {
    if (source?.kind !== 'large') return [];
    const loadingSource = source;
    const advertisedRelationships = Math.max(
      Number(loadingSource.descriptor.counts?.relationships || 0),
      Number(loadingSource.manifest.counts?.relationships || 0)
    );
    if (advertisedRelationships > MAX_SAFE_FULL_RELATIONSHIPS) {
      error =
        `Full relationship hydration is disabled for this ${advertisedRelationships.toLocaleString()}-relationship bundle ` +
        `because it would exceed the browser memory safety limit. Relationship summaries and the selected record's ` +
        `bounded adjacency remain available.`;
      return [];
    }
    const requestId = loadRequest;
    largeRelationshipsLoading = true;
    try {
      if (!largeRelationships.length) {
        const result = await loadingSource.loadRelationships();
        if (requestId !== loadRequest || source !== loadingSource) return [];
        largeRelationships = result.relationships;
        largeRelationshipsTruncated = result.truncated;
        largeRelationshipsByRoute = indexLargeRelationships(largeRelationships);
      }
      if (activeView === 'graph' && (graphHighlightedRelationshipGroup || largeHighlightedEdge)) {
        await tick();
        restoreGraphRelationshipInspection();
      }
      return largeRelationships;
    } catch (err) {
      if (requestId === loadRequest && source === loadingSource) {
        error = err instanceof Error ? err.message : String(err);
      }
      return [];
    } finally {
      if (requestId === loadRequest && source === loadingSource) largeRelationshipsLoading = false;
    }
  }

  async function ensureLargeRouteRelationships(route: string): Promise<LargeRelationship[]> {
    if (source?.kind !== 'large' || !route) return [];
    const loaded = largeRelationshipsByRoute.get(route);
    if (loaded && !largeIncompleteRelationshipRoutes[route]) return loaded;
    const loadingSource = source;
    const requestId = loadRequest;
    largeRelationshipsLoading = true;
    try {
      const rows = await loadingSource.loadRelationshipsForRoute(route);
      if (requestId !== loadRequest || source !== loadingSource) return [];
      const enrichment = syncModelEnrichmentState(loadingSource);
      let retainedRows = rows;
      if (enrichment?.status === 'unavailable') {
        const affectedRoutes = purgeCachedModelAssistedRelationships();
        affectedRoutes.add(route);
        retainedRows = rows.filter(
          (relationship) => !isModelAssistedRelationship(relationship)
        );
        markRelationshipRoutesIncomplete(affectedRoutes, enrichment.message);
        modelEnrichmentError = enrichment.message;
      } else if (enrichment?.status === 'ready') {
        const previousModelError = modelEnrichmentError;
        modelEnrichmentError = '';
        if (previousModelError && error === previousModelError) error = '';
        clearIncompleteRelationshipRoute(route);
      }
      largeRelationshipsByRoute = new Map(largeRelationshipsByRoute).set(
        route,
        retainedRows
      );
      if (graphHighlightedRelationshipGroup || largeHighlightedEdge) {
        await tick();
        restoreGraphRelationshipInspection();
      }
      return retainedRows;
    } catch (err) {
      if (requestId === loadRequest && source === loadingSource) {
        const enrichment = syncModelEnrichmentState(loadingSource);
        if (enrichment?.status === 'unavailable') {
          const affectedRoutes = purgeCachedModelAssistedRelationships();
          affectedRoutes.add(route);
          markRelationshipRoutesIncomplete(affectedRoutes, enrichment.message);
          modelEnrichmentError = enrichment.message;
        }
        error = err instanceof Error ? err.message : String(err);
      }
      return [];
    } finally {
      if (requestId === loadRequest && source === loadingSource) largeRelationshipsLoading = false;
    }
  }

  function selectNode(id: string) {
    selectedId = id;
    inspectedId = '';
    smallInspectedRelationship = null;
    graphLabelPhase = 0;
    activeView = activeView || 'reader';
    syncExplorerUrl(true);
  }

  function inspectNode(id: string) {
    inspectedId = id;
    smallInspectedRelationship = null;
    rightCollapsed = false;
    syncExplorerUrl(true);
  }

  function selectLargeRoute(route: string) {
    if (!largeRouteInReduction(route)) return;
    clearLargeFacetPreviewContext();
    largeSelectedRoute = route;
    largeInspectedRoute = '';
    largeHighlightedRoute = route;
    largeGraphCenterRoute = route;
    largeForwardRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    largeExpandedGraphGroups = [];
    graphLabelPhase = 0;
    clearLargeApiPanel();
    rightCollapsed = false;
    if (largeHasRecordLocator()) void ensureLargeDataset(largeSelectedRoute);
    if (largeHasTargetedRelationships()) void ensureLargeRouteRelationships(route);
    if (FULL_INDEX_VIEWS.has(activeView)) void hydrateForView(activeView);
    syncExplorerUrl(true);
  }

  function inspectLargeRoute(route: string) {
    if (!largeRouteCanInteract(route)) return;
    clearLargeFacetPreviewContext();
    largeInspectedRoute = route;
    largeHighlightedRoute = route;
    largeForwardRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    clearLargeApiPanel();
    rightCollapsed = false;
    if (largeHasRecordLocator()) void ensureLargeDataset(route);
    if (largeHasTargetedRelationships()) void ensureLargeRouteRelationships(route);
    if (FULL_INDEX_VIEWS.has(activeView)) void hydrateForView(activeView);
    syncExplorerUrl(true);
  }

  function recenterLargeRoute(route: string) {
    clearLargeFacetPreviewContext();
    if (isGraphStackRoute(route)) {
      toggleLargeGraphStack(route);
      return;
    }
    const routeIsRecord = ['dataset', 'publisher', 'resource'].includes(routeKind(route));
    const facetRoute = routeIsRecord ? null : metadataFacetForRoute(route);
    if (facetRoute) {
      activeView = 'graph';
      graphLabelPhase = 0;
      resetGraphView();
      applyAnalysisFacet(facetRoute.key, facetRoute.value);
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
    largeGraphCenterRoute = route;
    largeForwardRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    largeExpandedGraphGroups = [];
    clearLargeApiPanel();
    activeView = 'graph';
    resetGraphView();
    void hydrateForView('graph');
    syncExplorerUrl(true);
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
      clearLargeFacetPreviewContext();
      if (largeInspectedRoute && largeInspectedRoute !== largeSelectedRoute) largeForwardRoute = largeInspectedRoute;
      largeInspectedRoute = '';
      largeHighlightedRoute = largeSelectedRoute;
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
      graphHighlightedRelationshipGroup = '';
      largeExpandedGraphGroups = [];
      clearLargeApiPanel();
    } else {
      inspectedId = '';
      smallInspectedRelationship = null;
    }
    syncExplorerUrl(true);
  }

  function clearLargeApiPanel() {
    largeApiRequest += 1;
    largeApiRoute = '';
    largeApiUrl = '';
    largeApiJson = null;
    largeApiText = '';
    largeApiDisplayMode = 'json';
    largeApiSourceLabel = '';
    largeApiError = '';
    largeApiBytes = 0;
    largeApiContentType = '';
    largeApiRetrievedAt = '';
    largeApiResponseUrl = '';
    largeApiLoading = false;
    largeSourceInspectorOpen = false;
  }

  function closeSourceInspector() {
    largeSourceInspectorOpen = false;
  }

  async function loadLargeSource(route: string, access: ResolvedLargeSourceAccess) {
    if (!route || !isUrl(access.url) || !canDisplaySourceInline(access)) return;
    const displayMode = access.display_mode as Exclude<LargeSourceDisplayMode, 'link'>;
    const url = access.url;
    const requestId = largeApiRequest + 1;
    largeApiRequest = requestId;
    largeApiRoute = route;
    largeApiUrl = url;
    largeApiJson = null;
    largeApiText = '';
    largeApiDisplayMode = displayMode;
    largeApiSourceLabel = access.label;
    largeApiError = '';
    largeApiBytes = 0;
    largeApiContentType = '';
    largeApiRetrievedAt = '';
    largeApiResponseUrl = '';
    largeApiLoading = true;
    largeSourceInspectorOpen = true;
    try {
      const response = await fetchSourceResponse(url, displayMode, access.media_type);
      if (requestId !== largeApiRequest || largeApiRoute !== route || largeApiUrl !== url) return;
      largeApiJson = response.data;
      largeApiText = response.text;
      largeApiBytes = response.bytes;
      largeApiContentType = response.contentType;
      largeApiRetrievedAt = response.retrievedAt;
      largeApiResponseUrl = response.responseUrl;
    } catch (err) {
      if (requestId !== largeApiRequest || largeApiRoute !== route || largeApiUrl !== url) return;
      largeApiError = err instanceof Error ? err.message : String(err);
    } finally {
      if (requestId === largeApiRequest && largeApiRoute === route && largeApiUrl === url) largeApiLoading = false;
    }
  }

  function navigateBack() {
    if (largeSourceInspectorOpen) {
      closeSourceInspector();
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
    syncExplorerUrl(true);
  }

  function resetTypes() {
    visibleTypes = new Set(typeList);
    syncExplorerUrl(true);
  }

  function setSmallQuery(query: string) {
    const previousDefault = defaultRetrievalSort(smallQuery);
    smallQuery = query;
    if (retrievalSort === previousDefault) retrievalSort = defaultRetrievalSort(query);
    syncExplorerUrl();
  }

  function setRetrievalSort(value: string) {
    if (!isRetrievalSort(value)) return;
    retrievalSort = value;
    syncExplorerUrl(true);
    if (source?.kind === 'large' && (largeQuery.trim() || Object.keys(largeFacetFilters).length)) {
      void runLargeSearch(largeQuery, { preserveSelection: true });
    }
  }

  function removeLargeFilter(key: string, value: string) {
    if (key === '__geo') {
      clearGeospatialFilter();
      return;
    }
    const remaining = (largeFacetFilters[key] || []).filter((item) => item !== value);
    const remainingHighlights = (largeFacetHighlights[key] || []).filter((item) => item !== value);
    const nextHighlights = { ...largeFacetHighlights };
    if (remainingHighlights.length) nextHighlights[key] = remainingHighlights;
    else delete nextHighlights[key];
    largeFacetHighlights = nextHighlights;
    if (remaining.length) largeFacetFilters = { ...largeFacetFilters, [key]: remaining };
    else {
      const { [key]: _removed, ...rest } = largeFacetFilters;
      largeFacetFilters = rest;
    }
    const route = facetValueRoute(key, value);
    if (largeInspectedRoute === route) {
      largeInspectedRoute = '';
      largeHighlightedRoute = largeSelectedRoute;
      largeGraphCenterRoute = largeSelectedRoute;
    }
    syncExplorerUrl(true);
    refreshLargeReduction();
  }

  function searchResultSummary(): string {
    return formatSearchResultSummary({
      response: largeSearchResponse,
      shown: largeResults.length,
      hydratedMatchingCount: largeIndex ? largeVisibleDatasets.length : undefined,
      queryActive: Boolean(largeAppliedQuery.trim())
    });
  }

  function searchMatchReason(result: SearchResultDoc): string {
    const fields = result.match?.matched_fields || [];
    const labels: Record<string, string> = {
      title: 'title',
      publisher: 'provider',
      context: 'context note',
      description: 'description',
      topics: 'domain',
      tags: 'tag',
      url: 'identifier or URL',
      record_type: 'record type',
      protocol: 'protocol',
      source: 'source metadata',
      standards: 'standards metadata'
    };
    const reasons = fields.slice(0, 3).map((field) => labels[field] || field.replaceAll('_', ' '));
    const entity = result.match?.recognized_entity;
    if (entity) {
      const otherReasons = reasons.filter((reason) => reason !== labels[entity.filter_key]);
      const suffix = otherReasons.length ? `; also matched ${[...new Set(otherReasons)].join(', ')}` : '';
      return `Recognised ${entity.kind} “${entity.label}”${entity.matched_alias ? ` from alias “${entity.matched_alias}”` : ''}${suffix}`;
    }
    const corrections = result.match?.corrected_tokens || [];
    for (const correction of corrections.slice().reverse()) {
      reasons.unshift(
        `one-edit correction “${correction.query_token}” → “${correction.matched_token}”`
      );
    }
    if ((result.match?.score_components.exact || 0) > 0) reasons.unshift('exact phrase or identifier');
    if (result.official_full_text_match) reasons.push('official full text');
    return reasons.length ? `Matched ${[...new Set(reasons)].join(', ')}` : 'Matched the static lexical index';
  }

  function searchResultForDataset(dataset: LargeDataset): SearchResultDoc | undefined {
    return largeResults.find((result) => result.name === dataset.name);
  }

  function datasetMatchReason(dataset: LargeDataset): string {
    const result = searchResultForDataset(dataset);
    return result ? searchMatchReason(result) : '';
  }

  function facetValueRoute(key: string, value: string): string {
    return `facet/${encodeEndpointRouteSegment(key)}/${encodeEndpointRouteSegment(value)}`;
  }

  function metadataFacetForRoute(route: string): { key: string; value: string } | null {
    const facetRoute = routeForAnalysisNode(route);
    if (facetRoute) return facetRoute;
    const kind = routeKind(route);
    const value = decodeEndpointRouteSegment(routeValue(route));
    if (!value) return null;
    if (['category', 'type_code', 'document_type', 'creation_year', 'jurisdiction', 'legal_status', 'publisher', 'format', 'topic', 'tag', 'license', 'host', 'resource_type'].includes(kind)) return { key: kind, value };
    return null;
  }

  function facetValueIsHighlighted(key: string, value: string): boolean {
    return Boolean(largeFacetHighlights[key]?.includes(value));
  }

  function previewLargeFacetValue(key: string, value: string, event?: MouseEvent) {
    const additive = Boolean(event?.ctrlKey || event?.metaKey || event?.shiftKey);
    if (additive) {
      const next = new Set(largeFacetHighlights[key] || []);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      const highlights = { ...largeFacetHighlights, [key]: [...next] };
      if (!next.size) delete highlights[key];
      largeFacetHighlights = highlights;
    } else {
      largeFacetHighlights = { [key]: [value] };
    }
    largeFacetPreviewRoute = facetValueRoute(key, value);
    largeHighlightedRoute = largeFacetPreviewRoute;
    rightCollapsed = false;
  }

  function clearFacetHighlights(key: string) {
    const { [key]: _removed, ...remaining } = largeFacetHighlights;
    largeFacetHighlights = remaining;
    if (routeForAnalysisNode(largeFacetPreviewRoute)?.key === key) {
      largeFacetPreviewRoute = '';
      largeHighlightedRoute = largeInspectedRoute || largeSelectedRoute;
    }
  }

  function clearLargeFacetPreviewContext() {
    largeFacetHighlights = {};
    largeFacetPreviewRoute = '';
  }

  async function applyLargeFacetReduction(
    filters: Record<string, string[]>,
    key: string,
    value: string,
    removing = false
  ) {
    if (largeFacetApplyingKey) return;
    largeFacetApplyingKey = key;
    largeFacetApplyingValue = value;
    await tick();
    const route = facetValueRoute(key, value);
    try {
      activeFacetKey = key;
      largeFacetFilters = filters;
      largeFacetHighlights = {};
      largeFacetPreviewRoute = '';
      largeSelectedRoute = '';
      if (removing) {
        if (largeInspectedRoute === route) {
          largeInspectedRoute = '';
          largeHighlightedRoute = '';
          largeGraphCenterRoute = '';
        }
      } else {
        largeInspectedRoute = route;
        largeHighlightedRoute = route;
        largeGraphCenterRoute = route;
        rightCollapsed = false;
      }
      largeForwardRoute = '';
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
      clearLargeApiPanel();
      reconcileLargeSelection();
      syncExplorerUrl(true);
      refreshLargeReduction();
    } finally {
      await tick();
      largeFacetApplyingKey = '';
      largeFacetApplyingValue = '';
    }
  }

  async function commitFacetHighlights(key: string, value: string, event?: MouseEvent) {
    const highlighted = largeFacetHighlights[key]?.length ? largeFacetHighlights[key] : [value];
    const current = largeFacetFilters[key] || [];
    const sameSelection = highlighted.length === current.length && highlighted.every((item) => current.includes(item));
    const additive = Boolean(event?.ctrlKey || event?.metaKey || event?.shiftKey);
    const filters = { ...largeFacetFilters };
    if (sameSelection && !additive) {
      delete filters[key];
    } else if (additive) {
      filters[key] = [...new Set([...current, ...highlighted])];
    } else {
      filters[key] = [...highlighted];
    }
    await applyLargeFacetReduction(filters, key, value, sameSelection && !additive);
  }

  function facetValueKeydown(key: string, value: string, event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void commitFacetHighlights(key, value);
  }

  function clearLargeFilters() {
    largeFacetFilters = {};
    largeFacetHighlights = {};
    largeFacetPreviewRoute = '';
    geospatialFilter = '';
    if (largeInspectedRoute && routeForAnalysisNode(largeInspectedRoute)) {
      largeInspectedRoute = '';
      largeHighlightedRoute = '';
      largeGraphCenterRoute = '';
      largeForwardRoute = '';
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
    }
    largeExpandedGraphGroups = [];
    reconcileLargeSelection();
    syncExplorerUrl(true);
    void runLargeSearch(largeQuery, { preserveSelection: true });
  }

  function clearFacetFilter(key: string) {
    if (!largeFacetFilters[key]?.length) return;
    const { [key]: _removed, ...rest } = largeFacetFilters;
    largeFacetFilters = rest;
    const { [key]: _highlighted, ...remainingHighlights } = largeFacetHighlights;
    largeFacetHighlights = remainingHighlights;
    if (routeForAnalysisNode(largeFacetPreviewRoute)?.key === key) largeFacetPreviewRoute = '';
    if (largeInspectedRoute && routeForAnalysisNode(largeInspectedRoute)?.key === key) {
      largeInspectedRoute = '';
      largeHighlightedRoute = '';
      largeGraphCenterRoute = '';
    }
    facetMenuKey = '';
    reconcileLargeSelection();
    syncExplorerUrl(true);
    refreshLargeReduction();
  }

  function setGeospatialFilter(value: string) {
    geospatialFilter = isGeospatialFilter(value) ? value : '';
    if (source?.kind === 'large') reconcileLargeSelection();
    else if (selectedId && !visibleNodes.some((node) => node.id === selectedId)) {
      selectedId = visibleNodes[0]?.id || '';
      inspectedId = '';
      smallInspectedRelationship = null;
    }
    syncExplorerUrl(true);
  }

  function clearGeospatialFilter() {
    setGeospatialFilter('');
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
    if (count <= 0) return { x: cx, y: cy };
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

  function smallRelationshipKind(relationship: OkfRelationship): string {
    return getSmallRelationshipKind(relationship);
  }

  function smallRelationshipTitle(relationship: OkfRelationship): string {
    return getSmallRelationshipTitle(relationship, smallCorpus?.nodes);
  }

  function smallGraphEdgeKey(relationship: OkfRelationship): string {
    return `${relationship.source}>${relationship.target}:${smallRelationshipKind(relationship)}`;
  }

  function smallGraphEdgePlans(relationships: OkfRelationship[]) {
    return planDirectedEdges(relationships.map((relationship) => ({
      id: smallGraphEdgeKey(relationship),
      source: relationship.source,
      target: relationship.target,
      label: smallRelationshipKind(relationship)
    })));
  }

  function smallGraphEdgeLabelSpecs(
    relationships: OkfRelationship[],
    positions: Map<string, GraphPoint>,
    edgePlans: ReturnType<typeof smallGraphEdgePlans>
  ): GraphEdgeLabelSpec[] {
    return relationships.flatMap((relationship) => {
      const source = positions.get(relationship.source);
      const target = positions.get(relationship.target);
      if (!source || !target) return [];
      const id = smallGraphEdgeKey(relationship);
      const edgePlan = edgePlans.get(id);
      return [{
        id,
        text: shortLabel(smallRelationshipKind(relationship), 32),
        source,
        target,
        geometry: quadraticEdgeGeometry(source, target, 28, 28, edgePlan?.bend || 0, edgePlan?.labelT || 0.5),
        showLabel: edgePlan?.showLabel ?? true,
        selected: smallInspectedRelationship === relationship
      }];
    });
  }

  function smallGraphLabelNodes(nodes: OkfNode[]): LargeGraphNode[] {
    return nodes.map((node) => ({
      id: node.id,
      label: node.title,
      type: String(node.type || 'node').toLowerCase()
    }));
  }

  function inspectSmallRelationship(relationship: OkfRelationship) {
    smallInspectedRelationship = relationship;
    inspectedId = '';
    rightCollapsed = false;
    syncExplorerUrl(true);
  }

  function inspectSmallGraphRelationship(relationship: OkfRelationship) {
    if (graphSuppressClick) {
      graphSuppressClick = false;
      return;
    }
    inspectSmallRelationship(relationship);
  }

  function smallGraphNodeClick(id: string) {
    if (graphSuppressClick) {
      graphSuppressClick = false;
      return;
    }
    inspectNode(id);
  }

  function graphPositions(model: ReturnType<typeof graphModel>) {
    if (selectedNode && model.nodes.some((node) => node.id === selectedNode.id)) {
      const related = model.nodes.filter((node) => node.id !== selectedNode.id);
      return new Map([
        [selectedNode.id, { x: graphCanvasWidth / 2, y: GRAPH_HEIGHT / 2 }],
        ...related.map((node, index) => [
          node.id,
          graphPosition(index, related.length, 240, graphCanvasWidth / 2, GRAPH_HEIGHT / 2)
        ] as [string, GraphPoint])
      ]);
    }
    return new Map(
      model.nodes.map((node, index) => [
        node.id,
        graphPosition(index, model.nodes.length, 250, graphCanvasWidth / 2, GRAPH_HEIGHT / 2)
      ])
    );
  }

  async function runLargeSearch(query: string, options: { preserveSelection?: boolean } = {}) {
    largeQuery = query;
    const trimmed = query.trim();
    const hasFilters = Object.keys(largeFacetFilters).length > 0;
    const hasFacetRequest = Boolean(activeFacetKey && supportsWorkerFilter(activeFacetKey));
    const requestId = ++largeSearchRequest;
    error = '';
    largeSearchResponse = null;
    if (!trimmed && !hasFilters && !hasFacetRequest) {
      largeAppliedQuery = '';
      largeResults = [];
      largeSearchResponse = null;
      largeSuggestions = [];
      if (!options.preserveSelection) {
        largeSelectedRoute = '';
        largeInspectedRoute = '';
        largeHighlightedRoute = '';
        largeGraphCenterRoute = '';
        largeForwardRoute = '';
        largeHighlightedEdge = '';
        largeInspectedEdge = null;
        largeExpandedGraphGroups = [];
        clearLargeApiPanel();
      }
      largeSearching = false;
      largePreserveSelectionUntilSearch = false;
      syncExplorerUrl();
      return;
    }
    if (!largeSearchClient) {
      largeSearchPendingQuery = query;
      largeResults = [];
      largeSuggestions = [];
      largeSearching = largeSearchIndexLoading;
      return;
    }
    const client = largeSearchClient;
    const searchingSource = source;
    const sourceRequestId = loadRequest;
    largeAppliedQuery = trimmed;
    largeResults = [];
    largeSuggestions = [];
    largePreserveSelectionUntilSearch = Boolean(options.preserveSelection);
    if (!options.preserveSelection) {
      largeSelectedRoute = '';
      largeInspectedRoute = '';
      largeHighlightedRoute = '';
      largeGraphCenterRoute = '';
      largeForwardRoute = '';
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
      largeExpandedGraphGroups = [];
      clearLargeApiPanel();
    }
    largeSearching = true;
    syncExplorerUrl();
    await new Promise((resolve) => setTimeout(resolve, 160));
    if (
      requestId !== largeSearchRequest ||
      sourceRequestId !== loadRequest ||
      source !== searchingSource ||
      largeSearchClient !== client
    ) return;
    try {
      const legislationExtension = source?.kind === 'large'
        ? source.descriptor.extensions?.['okf-legislation-corpus.v1']
        : undefined;
      const remoteTemplate = typeof legislationExtension?.remote_full_text_search === 'string'
        ? legislationExtension.remote_full_text_search
        : '';
      const [localResponse, suggestions, officialResults] = await Promise.all([
        client.query({
          query,
          filters: largeFacetFilters,
          sort: retrievalSort,
          ranking: 'weighted',
          facet_keys: requestedDynamicFacetKeys()
        }),
        trimmed ? client.suggest(query) : Promise.resolve([]),
        trimmed && (!hasFilters || !supportsCurrentWorkerFilters()) && remoteTemplate
          ? searchOfficialLegislation(remoteTemplate, query).catch(() => [])
          : Promise.resolve([])
      ]);
      if (
        requestId !== largeSearchRequest ||
        sourceRequestId !== loadRequest ||
        source !== searchingSource ||
        largeSearchClient !== client
      ) return;
      const merged = new Map<string, SearchResultDoc>();
      for (const result of localResponse.results) merged.set(result.legislation_id_uri || result.url || result.name, result);
      for (const result of officialResults) {
        const key = result.legislation_id_uri || result.url || result.name;
        const local = merged.get(key);
        merged.set(key, local ? { ...result, ...local, official_full_text_match: true } : result);
      }
      const mergedCount = merged.size;
      const results = [...merged.values()].slice(0, client.manifest?.result_limit || 200);
      const combinedTotal = Math.max(localResponse.total, mergedCount);
      const combinedTotalRelation: LargeSearchResponse['total_relation'] = localResponse.total_relation === 'unknown'
        ? 'unknown'
        : officialResults.length
          ? 'gte'
          : localResponse.total_relation;
      largeResults = results;
      largeSearchResponse = {
        ...localResponse,
        results,
        total: combinedTotal,
        total_relation: combinedTotalRelation
      };
      largeSuggestions = suggestions;
      removeIgnoredLargeFilters(localResponse.ignored_filters);
      error = '';
      if (Object.keys(largeFacetFilters).length && !localResponse.filters_applied) void ensureLargeFullIndex();
      if (!largeSelectedRoute && results[0]) largeHighlightedRoute = `dataset/${results[0].name}`;
      largePreserveSelectionUntilSearch = false;
      reconcileLargeSelection(Boolean(options.preserveSelection));
      syncExplorerUrl();
    } catch (err) {
      if (
        requestId === largeSearchRequest &&
        sourceRequestId === loadRequest &&
        source === searchingSource &&
        largeSearchClient === client
      ) {
        largePreserveSelectionUntilSearch = false;
        largeSearchResponse = null;
        const detail = err instanceof Error ? err.message : String(err);
        if (
          client.destroyed &&
          searchingSource?.kind === 'large' &&
          searchingSource.searchManifest &&
          largeSearchRecoveryAttempts < 1
        ) {
          largeSearchRecoveryAttempts += 1;
          largeSearchClient = null;
          largeSearching = false;
          largeSearchPendingQuery = query;
          error = `Static search stopped unexpectedly (${detail}). Restarting the local search worker…`;
          void initialiseLargeSearch(searchingSource, searchingSource.searchManifest, query, sourceRequestId);
        } else {
          error = client.destroyed
            ? `Static search stopped unexpectedly: ${detail}. Reload this bundle to retry search.`
            : detail;
        }
      }
    } finally {
      if (
        requestId === largeSearchRequest &&
        sourceRequestId === loadRequest &&
        source === searchingSource &&
        largeSearchClient === client
      ) largeSearching = false;
    }
  }

  function clearLargeRouteContext() {
    largeSelectedRoute = '';
    largeInspectedRoute = '';
    largeHighlightedRoute = '';
    largeGraphCenterRoute = '';
    largeForwardRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    largeFacetHighlights = {};
    largeFacetPreviewRoute = '';
    clearLargeApiPanel();
  }

  function clearLargeSearch() {
    if (largeSearchDebounce !== null) {
      window.clearTimeout(largeSearchDebounce);
      largeSearchDebounce = null;
    }
    const previousDefault = defaultRetrievalSort(largeQuery);
    if (retrievalSort === previousDefault) retrievalSort = defaultRetrievalSort('');
    void runLargeSearch('');
  }

  function scheduleLargeSearch(query: string) {
    const previousQuery = largeQuery.trim();
    const previousDefault = defaultRetrievalSort(previousQuery);
    largeQuery = query;
    error = '';
    largeSearchResponse = null;
    if (retrievalSort === previousDefault) retrievalSort = defaultRetrievalSort(query);
    largeSearchRequest += 1;
    if (largeSearchDebounce !== null) {
      window.clearTimeout(largeSearchDebounce);
      largeSearchDebounce = null;
    }
    if (!query.trim()) {
      void runLargeSearch(query);
      return;
    }
    if (query.trim() !== previousQuery) clearLargeRouteContext();
    largeSearching = true;
    largeSearchDebounce = window.setTimeout(() => {
      largeSearchDebounce = null;
      void runLargeSearch(query);
    }, 220);
  }

  function chooseLargeResult(result: SearchResultDoc) {
    clearLargeFacetPreviewContext();
    largeSelectedRoute = datasetRoute(result);
    largeInspectedRoute = largeSelectedRoute;
    largeHighlightedRoute = largeSelectedRoute;
    largeGraphCenterRoute = largeSelectedRoute;
    largeForwardRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    clearLargeApiPanel();
    rightCollapsed = false;
    if (largeHasRecordLocator()) void ensureLargeDataset(largeSelectedRoute, result);
    if (largeHasTargetedRelationships()) void ensureLargeRouteRelationships(largeSelectedRoute);
    if (FULL_INDEX_VIEWS.has(activeView)) void hydrateForView(activeView);
    syncExplorerUrl(true);
  }

  function largeRouteInReduction(route: string): boolean {
    if (!route) return true;
    if (isGraphStackRoute(route)) return true;
    const kind = routeKind(route);
    const value = routeValue(route);
    if (!largeIndex) {
      return kind !== 'dataset' || !largeAppliedQuery.trim() || largeResultNames.has(value);
    }
    const routedDataset = largeIndex.datasetByRoute.get(route);
    if (routedDataset) return largeVisibleDatasetNames.has(routedDataset.name);
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
    if (isGraphStackRoute(route)) return true;
    const kind = routeKind(route);
    const value = routeValue(route);
    if (
      largeIndex.datasetByRoute.has(route) ||
      largeResults.some((result) => datasetRoute(result) === route)
    ) {
      return true;
    }
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
    if (isGraphStackRoute(route)) return true;
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
      largeGraphCenterRoute = '';
      largeForwardRoute = '';
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
      clearLargeApiPanel();
      return;
    }
    if (largeSelectedRoute && !largeRouteInReduction(largeSelectedRoute)) largeSelectedRoute = '';
    if (largeInspectedRoute && !largeRouteInReduction(largeInspectedRoute)) largeInspectedRoute = '';
    if (largeHighlightedRoute && !largeRouteInReduction(largeHighlightedRoute)) largeHighlightedRoute = '';
    if (largeGraphCenterRoute && !largeRouteInReduction(largeGraphCenterRoute)) largeGraphCenterRoute = '';
    if (largeForwardRoute && !largeRouteInReduction(largeForwardRoute)) largeForwardRoute = '';
  }

  function visibleLargeDatasets(): LargeDataset[] {
    if (!largeIndex?.datasets) return [];
    const queryActive = Boolean(largeAppliedQuery.trim());
    const rows = largeIndex.datasets.filter((dataset) => {
      if (queryActive && !largeResultNames.has(dataset.name)) return false;
      return datasetMatchesLargeFilters(dataset);
    });
    if (retrievalSort === 'relevance' && queryActive) {
      rows.sort((left, right) => (largeResultOrder.get(left.name) ?? 999999) - (largeResultOrder.get(right.name) ?? 999999));
    } else if (retrievalSort === 'title') {
      rows.sort((left, right) => left.title.localeCompare(right.title));
    } else if (retrievalSort === 'metadata-quality') {
      rows.sort((left, right) => (right.quality?.overall ?? -1) - (left.quality?.overall ?? -1) || left.title.localeCompare(right.title));
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
    return projectLargeDatasetFacetValues(dataset, key, MISSING_FILTER_VALUE, {
      resources: largeIndex?.resourcesByDataset.get(dataset.name) || [],
      publisher: dataset.publisher ? largeIndex?.publisherByName.get(dataset.publisher) : undefined,
      publisherFamily
    });
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
    if (largeSearchResponse?.filters_applied && largeSearchResponse.facets[key]) {
      return largeSearchResponse.facets[key];
    }
    if (!largeIndex) {
      return largeBaselineFacetRows[key]
        || largeFacetIndex[key]
        || (source?.kind === 'large' ? source.overview.facet_previews?.[key] || [] : []);
    }
    const counts = new Map<string, number>();
    const queryActive = Boolean(largeAppliedQuery.trim());
    for (const dataset of (largeIndex?.datasets || [])) {
      if (queryActive && !largeResultNames.has(dataset.name)) continue;
      if (!datasetMatchesLargeFilters(dataset, key)) continue;
      for (const value of largeDatasetFacetValues(dataset, key)) counts.set(value, (counts.get(value) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
  }

  function largeFacetQuery(key: string): string {
    return largeFacetSearch[key] || '';
  }

  function facetControl(key: string): string {
    const configured = providerPresentationFacet(key)?.open_control;
    if (configured && configured !== 'auto') return configured;
    return analysisFacetForKey(key)?.recommended_control || 'auto';
  }

  function facetValueOrder(key: string): string {
    const configured = providerPresentationFacet(key)?.value_order || analysisFacetForKey(key)?.value_order;
    if (configured) return configured;
    const valueType = providerPresentationFacet(key)?.value_type || analysisFacetForKey(key)?.value_type;
    const control = facetControl(key).toLowerCase();
    return valueType === 'number' || valueType === 'date' || control.includes('histogram') || control.includes('range')
      ? 'value-asc'
      : 'count-desc';
  }

  function orderedLargeFacetRowsForDisplay(key: string) {
    return orderFacetRows(largeFacetRows(key), facetValueOrder(key), (value) => facetValueDisplay(key, value));
  }

  function dynamicFacetPreviewRows(key: string): LargeFacetRow[] | undefined {
    if (!largeSearchResponse || !Object.prototype.hasOwnProperty.call(largeSearchResponse.facets, key)) return undefined;
    return largeSearchResponse.facets[key] || [];
  }

  function facetPreviewRows(key: string) {
    const dynamic = dynamicFacetPreviewRows(key);
    if (dynamic) return orderFacetRows(dynamic, facetValueOrder(key), (value) => facetValueDisplay(key, value));
    if (largeBaselineFacetRows[key]) {
      return orderFacetRows(largeBaselineFacetRows[key], facetValueOrder(key), (value) => facetValueDisplay(key, value));
    }
    if (largeIndex) {
      return orderFacetRows(largeFacetRows(key), facetValueOrder(key), (value) => facetValueDisplay(key, value));
    }
    if (Object.prototype.hasOwnProperty.call(largeFacetIndex, key)) {
      return orderFacetRows(largeFacetIndex[key] || [], facetValueOrder(key), (value) => facetValueDisplay(key, value));
    }
    const analysed = analysisFacetForKey(key)?.values;
    if (analysed?.length) return orderFacetRows(analysed, facetValueOrder(key), (value) => facetValueDisplay(key, value));
    const overview = source?.kind === 'large' ? source.overview.facet_previews?.[key] : undefined;
    if (overview?.length) return orderFacetRows(overview, facetValueOrder(key), (value) => facetValueDisplay(key, value));
    return [];
  }

  function facetPreviewIsComplete(key: string): boolean {
    if (dynamicFacetPreviewRows(key)) return true;
    if (Object.prototype.hasOwnProperty.call(largeBaselineFacetRows, key)) return true;
    if (largeIndex) return true;
    if (Object.prototype.hasOwnProperty.call(largeFacetIndex, key)) return true;
    const analysed = analysisFacetForKey(key);
    return Boolean(analysed?.values && analysed.values.length >= analysed.cardinality);
  }

  function facetSearchThreshold(): number {
    const configured = Number(providerDisplay().facets?.high_cardinality_threshold);
    return Number.isFinite(configured) ? Math.max(12, Math.min(500, configured)) : DEFAULT_FACET_SEARCH_THRESHOLD;
  }

  function facetUsesSearch(key: string): boolean {
    const configured = providerPresentationFacet(key)?.open_control;
    if (configured && configured !== 'auto') return configured === 'search';
    const control = facetControl(key).toLowerCase();
    if (control === 'search' || control.includes('value-input')) return true;
    if (control.includes('search')) return facetAvailableValueCount(key) > facetSearchThreshold();
    return facetAvailableValueCount(key) > facetSearchThreshold();
  }

  function facetUsesHistogram(key: string): boolean {
    return facetControl(key).toLowerCase().includes('histogram');
  }

  function facetDistributionLimit(): number {
    const configured = Number(providerDisplay().facets?.distribution_segments);
    return Number.isFinite(configured) ? Math.max(3, Math.min(18, configured)) : DEFAULT_FACET_DISTRIBUTION_SEGMENTS;
  }

  function facetDistribution(key: string): FacetDistributionSegment[] {
    const rows = facetPreviewRows(key);
    // Histogram bars remain keyboard targets, so each segment keeps a 24px
    // hit area. Respect the provider's bounded segment limit here as well as
    // for categorical distributions; an unconditional 18-column histogram
    // overflows the normal navigation panel by more than 160px.
    if (facetUsesHistogram(key)) return facetDistributionSegments(rows, facetDistributionLimit());
    return facetDistributionSegments(rows, facetDistributionLimit());
  }

  function facetUsesDiverseSummary(key: string): boolean {
    return facetAvailableValueCount(key) > facetSearchThreshold();
  }

  function declaredFacetValueFamilies(key: string): FacetValueFamily[] {
    const rows = new Map(largeFacetRows(key).map((row) => [row.value, row]));
    return analysisHierarchiesForFacet(key).flatMap((hierarchy) => hierarchy.values.map((value) => {
      const candidates = [value, ...(value.children || [])];
      const matches = candidates
        .map((candidate) => rows.get(candidate.id) || rows.get(candidate.label) || rows.get(candidate.route?.split('/').at(-1) || ''))
        .filter((row): row is LargeFacetRow => Boolean(row));
      return {
        id: 'other' as const,
        label: value.label,
        count: matches.reduce((total, row) => total + row.count, 0) || value.count,
        rows: matches.slice(0, 5),
        valueCount: matches.length || (value.children?.length || 1)
      };
    }));
  }

  function facetValueFamilies(key: string): FacetValueFamily[] {
    const declared = declaredFacetValueFamilies(key);
    return declared.length
      ? declared
      : diverseFacetValueFamilies(largeFacetRows(key), (value) => facetValueDisplay(key, value));
  }

  function showAllFacetValues(key: string) {
    largeFacetBrowseAll = { ...largeFacetBrowseAll, [key]: true };
  }

  function facetExamples(key: string): string[] {
    const explicit = providerPresentationFacet(key)?.examples || analysisFacetForKey(key)?.examples;
    if (explicit?.length) return facetExampleValues([], explicit, (value) => facetValueDisplay(key, value));
    const usesSearch = facetUsesSearch(key);
    const analysed = analysisFacetForKey(key)?.values;
    const overview = source?.kind === 'large' ? source.overview.facet_previews?.[key] : undefined;
    const previewRows = usesSearch
      ? (analysed?.length ? analysed : largeFacetIndex[key] || overview || [])
      : facetPreviewRows(key);
    const rows = usesSearch
      ? orderFacetRows(previewRows, facetValueOrder(key), (value) => facetValueDisplay(key, value))
      : previewRows;
    if (!usesSearch && (facetValueOrder(key) === 'value-asc' || facetValueOrder(key) === 'value-desc') && rows.length > 1) {
      const mostCommon = [...rows].sort((left, right) => right.count - left.count)[0];
      return facetExampleValues(
        [rows[0], rows.at(-1)!, mostCommon],
        undefined,
        (value) => facetValueDisplay(key, value)
      );
    }
    return facetExampleValues(rows, undefined, (value) => facetValueDisplay(key, value));
  }

  function facetSearchPlaceholder(key: string): string {
    const examples = facetExamples(key);
    return examples.length ? `e.g. ${examples.join(' · ')}` : 'Type to filter values';
  }

  function facetIcon(key: string): string {
    const control = facetControl(key).toLowerCase();
    const valueType = providerPresentationFacet(key)?.value_type || analysisFacetForKey(key)?.value_type;
    if (analysisHierarchiesForFacet(key).length) return '▸';
    if (valueType === 'date' || control.includes('histogram') || control.includes('range')) return '▥';
    if (valueType === 'number') return '#';
    if (facetUsesSearch(key)) return '⌕';
    return '●';
  }

  function facetPaletteKind(key: string): 'categorical' | 'sequential' {
    const valueType = providerPresentationFacet(key)?.value_type || analysisFacetForKey(key)?.value_type;
    return valueType === 'number' || valueType === 'date' || facetUsesHistogram(key) ? 'sequential' : 'categorical';
  }

  function facetSegmentColour(key: string, index: number, count: number, otherValues?: number): string {
    if (otherValues) return '#aeb9c5';
    if (facetPaletteKind(key) === 'sequential') {
      const lightness = Math.round(30 + (index / Math.max(1, count - 1)) * 42);
      return `hsl(209 76% ${lightness}%)`;
    }
    const palette = [
      '#005ea5', '#e85d04', '#00703c', '#7b61a8', '#b10e73', '#00838f',
      '#d4351c', '#b58800', '#3d5a80', '#c44e00', '#2f6f3e', '#6f42c1'
    ];
    return palette[index % palette.length];
  }

  function setFacetPreviewLabel(key: string, value: string) {
    facetPreviewLabels = { ...facetPreviewLabels, [key]: value };
  }

  function clearFacetPreviewLabel(key: string) {
    const { [key]: _removed, ...rest } = facetPreviewLabels;
    facetPreviewLabels = rest;
  }

  function facetDistributionSegmentLabel(key: string, segment: FacetDistributionSegment): string {
    if (segment.otherValues) return `${segment.otherValues.toLocaleString()} other values · ${segment.count.toLocaleString()} combined assignments`;
    return `${facetValueDisplay(key, segment.value)} · ${segment.count.toLocaleString()} records`;
  }

  function facetDistributionScope(key: string): string {
    if (dynamicFacetPreviewRows(key) || largeIndex) {
      if (largeFacetFilters[key]?.length) return 'Available choices with other filters applied';
      return largeAppliedQuery.trim() || Object.keys(largeFacetFilters).length ? 'Current results' : 'Whole corpus';
    }
    return largeBaselineFacetRows[key] ? 'Whole corpus' : 'Whole corpus preview';
  }

  function facetDistributionCaption(key: string, segments: FacetDistributionSegment[]): string {
    const detail = facetPreviewLabels[key] || (segments[0] ? facetDistributionSegmentLabel(key, segments[0]) : 'No values in this context');
    return `${facetDistributionScope(key)} · ${detail}`;
  }

  function facetDistributionSummary(key: string, segments: FacetDistributionSegment[]): string {
    const totalValues = segments.reduce((total, segment) => total + (segment.otherValues || 1), 0);
    const labels = segments.map((segment) => facetDistributionSegmentLabel(key, segment)).join('; ');
    return `${facetDistributionScope(key)}. ${totalValues.toLocaleString()} values. ${labels}`;
  }

  function normaliseFacetSearchText(value: string): string {
    return value.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function setLargeFacetQuery(key: string, value: string) {
    largeFacetSearch = { ...largeFacetSearch, [key]: value };
    largeFacetVisibleLimits = { ...largeFacetVisibleLimits, [key]: FACET_PAGE_SIZE };
    if (value.trim()) largeFacetBrowseAll = { ...largeFacetBrowseAll, [key]: true };
  }

  function largeFacetDisplayLimit(key: string): number {
    return largeFacetVisibleLimits[key] || FACET_PAGE_SIZE;
  }

  function filteredLargeFacetRows(key: string) {
    const query = normaliseFacetSearchText(largeFacetQuery(key));
    const rows = orderedLargeFacetRowsForDisplay(key);
    if (!query) return rows;
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches = rows.filter((row) => {
      const haystack = normaliseFacetSearchText(`${facetValueDisplay(key, row.value)} ${row.value}`);
      return tokens.every((token) => haystack.includes(token));
    });
    const selected = new Set(facetSelectedValues(key));
    return [
      ...rows.filter((row) => selected.has(row.value)),
      ...matches.filter((row) => !selected.has(row.value))
    ];
  }

  function visibleLargeFacetRows(key: string, rows = filteredLargeFacetRows(key)) {
    return rows.slice(0, largeFacetDisplayLimit(key));
  }

  function showMoreLargeFacetRows(key: string) {
    largeFacetVisibleLimits = { ...largeFacetVisibleLimits, [key]: largeFacetDisplayLimit(key) + FACET_PAGE_SIZE };
  }

  function facetSelectionModeHint(key: string): string {
    const action = 'Click previews; double-click or press Enter filters. Ctrl-click or Cmd-click highlights several values.';
    return facetAvailableValueCount(key) <= FACET_PAGE_SIZE ? action : `Search within this facet first. ${action}`;
  }

  function largeAnalysis() {
    return source?.kind === 'large' ? source.analysis : undefined;
  }

  function embeddedPresentation(): LargeExplorerPresentation | undefined {
    if (source?.kind !== 'large') return undefined;
    const extension = source.descriptor.extensions?.['okf-explorer-presentation.v1'];
    if (!extension || typeof extension !== 'object' || Array.isArray(extension)) return undefined;
    const profile = extension.profile;
    const candidate = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : extension;
    return normalizeExplorerPresentation(candidate);
  }

  function largePresentation(): LargeExplorerPresentation | undefined {
    return source?.kind === 'large' ? source.presentation || embeddedPresentation() : undefined;
  }

  function providerPresentationFacet(key: string): LargeExplorerPresentationFacet | undefined {
    return largePresentation()?.facets?.find((facet) => facet?.key === key);
  }

  function providerDisplay(): LargeExplorerDisplay {
    return mergeExplorerDisplay(largeAnalysis()?.display, largePresentation());
  }

  function providerDefaultDetailTab(): DetailPanelTab {
    const value = providerDisplay().detail?.default_tab;
    const tabs = detailPanelTabs();
    return (value === 'overview' || value === 'evidence' || value === 'data') && tabs.includes(value)
      ? value
      : tabs[0] || 'overview';
  }

  function detailPanelTabs(): DetailPanelTab[] {
    const configured = providerDisplay().detail?.tabs || [];
    const tabs = configured.filter((tab): tab is DetailPanelTab => tab === 'overview' || tab === 'evidence' || tab === 'data');
    return tabs.length ? [...new Set(tabs)] : ['overview', 'evidence', 'data'];
  }

  function detailPanelTabLabel(tab: DetailPanelTab): string {
    if (tab === 'evidence') return 'Evidence';
    if (tab === 'data') return 'Data';
    return 'Overview';
  }

  function selectDetailPanelTab(tab: DetailPanelTab) {
    detailPanelTab = tab;
  }

  function detailPanelTabKeydown(event: KeyboardEvent, tab: DetailPanelTab) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = detailPanelTabs();
    const current = tabs.indexOf(tab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    event.preventDefault();
    detailPanelTab = next;
    void tick().then(() => document.getElementById(`detail-tab-${next}`)?.focus());
  }

  function availableLeftPanelTabs(): LeftPanelTab[] {
    const hasBrowse = Boolean(largeAnalysis()?.hierarchies?.length);
    const configured = largePresentation()?.panels?.left?.tabs;
    const candidates = Array.isArray(configured)
      ? configured.filter((tab): tab is LeftPanelTab => tab === 'facets' || tab === 'browse' || tab === 'results')
      : ['facets', 'browse', 'results'] as LeftPanelTab[];
    const available = candidates.filter((tab) => tab !== 'browse' || hasBrowse);
    if (!available.includes('facets')) available.unshift('facets');
    return [...new Set(available)];
  }

  function providerDefaultLeftTab(): LeftPanelTab {
    const configured = largePresentation()?.panels?.left?.default_tab;
    const available = availableLeftPanelTabs();
    return (configured === 'browse' || configured === 'results') && available.includes(configured) ? configured : 'facets';
  }

  function leftPanelTabLabel(tab: LeftPanelTab): string {
    if (tab === 'browse') return 'Browse';
    if (tab === 'results') return 'Results';
    return 'Facets';
  }

  function selectLeftPanelTab(tab: LeftPanelTab) {
    leftPanelTab = tab;
  }

  function leftPanelTabKeydown(event: KeyboardEvent, tab: LeftPanelTab) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = availableLeftPanelTabs();
    const current = tabs.indexOf(tab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    event.preventDefault();
    leftPanelTab = next;
    void tick().then(() => document.getElementById(`left-tab-${next}`)?.focus());
  }

  function applyAnalysisFacet(key: string, value: string, push = true) {
    const route = facetValueRoute(key, value);
    clearLargeFacetPreviewContext();
    activeFacetKey = key;
    largeFacetFilters = { ...largeFacetFilters, [key]: [value] };
    largeSelectedRoute = '';
    largeInspectedRoute = route;
    largeHighlightedRoute = route;
    largeGraphCenterRoute = route;
    largeForwardRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    clearLargeApiPanel();
    rightCollapsed = false;
    syncExplorerUrl(push);
    refreshLargeReduction();
  }

  function applyAnalysisTimelineBucket(bucket: ReturnType<typeof analysisTimelineBuckets>[number]) {
    const filter = timelineBucketFacetFilter(bucket);
    if (!filter) return;
    applyAnalysisFacet(filter.key, filter.value);
  }

  function datasetTimelineStamp(dataset: LargeDataset): string {
    return datasetReleasePeriod(dataset, largeIndex?.resourcesByDataset.get(dataset.name) || [])?.sortKey || '';
  }

  function quarterForStamp(stamp: string): string {
    if (!/^\d{4}-\d{2}/.test(stamp)) return '';
    const month = Number(stamp.slice(5, 7));
    if (!Number.isFinite(month) || month < 1 || month > 12) return '';
    return `${stamp.slice(0, 4)}-Q${Math.floor((month - 1) / 3) + 1}`;
  }

  function timelineRowsForCurrentContext(): LargeDataset[] {
    return largeVisibleDatasets
      .filter((dataset) => /^\d{4}/.test(datasetTimelineStamp(dataset)))
      .sort((left, right) => datasetTimelineStamp(right).localeCompare(datasetTimelineStamp(left)));
  }

  function latestTimelineBuckets(rows: LargeDataset[]): TimelineBucket[] {
    const groups = new Map<string, TimelineBucket>();
    for (const dataset of rows) {
      const period = datasetReleasePeriod(dataset, largeIndex?.resourcesByDataset.get(dataset.name) || []);
      if (!period) continue;
      const series = datasetDisplaySeries(dataset);
      const bucket = groups.get(series.key) || {
        key: series.key,
        label: series.label,
        count: 0,
        kind: 'series',
        catalogueFallbackCount: 0,
        samples: []
      };
      bucket.count += 1;
      if (period.catalogueFallback) bucket.catalogueFallbackCount = (bucket.catalogueFallbackCount || 0) + 1;
      bucket.samples.push({
        title: dataset.title,
        route: datasetRoute(dataset),
        date: period.sortKey,
        periodLabel: period.label,
        catalogueFallback: period.catalogueFallback
      });
      groups.set(series.key, bucket);
    }
    return [...groups.values()]
      .map((bucket) => ({ ...bucket, samples: bucket.samples.sort((left, right) => right.date.localeCompare(left.date)) }))
      .sort((left, right) => {
        const leftLatest = left.samples[0]?.date || '';
        const rightLatest = right.samples[0]?.date || '';
        return rightLatest.localeCompare(leftLatest) || left.label.localeCompare(right.label);
      })
      .slice(0, 80);
  }

  function groupedTimelineBuckets(rows: LargeDataset[], resolution: Exclude<TimelineResolution, 'latest'>): TimelineBucket[] {
    const groups = new Map<string, TimelineBucket>();
    for (const dataset of rows) {
      const stamp = datasetTimelineStamp(dataset);
      const key =
        resolution === 'year'
          ? stamp.slice(0, 4)
          : resolution === 'quarter'
            ? quarterForStamp(stamp)
            : stamp.slice(0, 7);
      if (!key) continue;
      const bucket = groups.get(key) || {
        key,
        label: key,
        count: 0,
        kind: 'period',
        samples: []
      };
      bucket.count += 1;
      if (bucket.samples.length < 8) {
        const period = datasetReleasePeriod(dataset, largeIndex?.resourcesByDataset.get(dataset.name) || []);
        bucket.samples.push({
          title: dataset.title,
          route: datasetRoute(dataset),
          date: stamp,
          periodLabel: period?.label,
          catalogueFallback: period?.catalogueFallback
        });
      }
      groups.set(key, bucket);
    }
    return [...groups.values()].sort((left, right) => right.key.localeCompare(left.key));
  }

  function analysisTimelineBucketsSorted(): TimelineBucket[] {
    return analysisTimelineBuckets()
      .map((bucket) => ({
        key: bucket.label,
        label: bucket.label,
        count: bucket.count,
        facetKey: 'update_year',
        facetValue: bucket.label,
        samples: (bucket.samples || []).map((sample) => ({
          title: sample.title,
          route: datasetRoute(sample),
          date: bucket.label
        }))
      }))
      .sort((left, right) => right.key.localeCompare(left.key));
  }

  function currentTimelineBuckets(): TimelineBucket[] {
    if (!largeIndex) return analysisTimelineBucketsSorted();
    const rows = timelineRowsForCurrentContext();
    if (timelineResolution === 'latest') return latestTimelineBuckets(rows);
    return groupedTimelineBuckets(rows, timelineResolution);
  }

  function applyTimelineBucket(bucket: TimelineBucket) {
    if (bucket.facetKey && bucket.facetValue) {
      applyAnalysisFacet(bucket.facetKey, bucket.facetValue);
      return;
    }
    const firstRoute = bucket.samples[0]?.route;
    if (firstRoute) inspectLargeRoute(firstRoute);
  }

  function setTimelineResolution(value: string) {
    if (value === 'latest' || value === 'year' || value === 'quarter' || value === 'month') timelineResolution = value;
  }

  function timelineReleaseYearGroups(bucket: TimelineBucket) {
    const years = new Map<string, TimelineBucket['samples']>();
    for (const sample of bucket.samples) {
      const year = sample.date.slice(0, 4) || 'Undated';
      years.set(year, [...(years.get(year) || []), sample]);
    }
    return [...years.entries()]
      .map(([year, samples]) => ({ year, samples }))
      .sort((left, right) => right.year.localeCompare(left.year));
  }

  function timelineReleaseLinkLabel(sample: TimelineBucket['samples'][number]): string {
    if (!sample.periodLabel) return sample.date;
    const compact = sample.periodLabel.replace(/\s+(?:18|19|20|21)\d{2}$/, '');
    return compact === sample.periodLabel && /^\d{4}$/.test(sample.periodLabel) ? 'Open' : compact;
  }

  function followExplorerRoute(event: MouseEvent, route: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    inspectLargeRoute(route);
  }

  function analysisFacetRows() {
    return getAnalysisFacetRows(largeAnalysis(), source?.kind === 'large' ? source.overview.facet_previews || {} : {});
  }

  function orderedAnalysisFacetRowsForDisplay() {
    const order = applyFacetPreferenceOrder(providerOrderedLargeFacetKeys(), facetPreferences);
    const positions = new Map(order.map((key, index) => [key, index]));
    return [...analysisFacetRows()].sort(
      (left, right) => (positions.get(left.key) ?? Number.MAX_SAFE_INTEGER) - (positions.get(right.key) ?? Number.MAX_SAFE_INTEGER)
    );
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

  function providerOrderedLargeFacetKeys() {
    const fallbackKeys = largeFacetKeys.length || largeSearchIndexLoading || largeFullLoading ? [] : LARGE_FACET_KEYS;
    const keys = orderedFacetKeys(largeAnalysis(), largeFacetKeys, fallbackKeys, source?.kind === 'large' ? source.overview.facet_previews || {} : {});
    const deDuplicated = keys.includes('publisher') ? keys.filter((key) => key !== 'canonical_publisher') : keys;
    const configured = providerDisplay().facets?.order || [];
    return [...configured, ...deDuplicated].filter((key, index, all) => deDuplicated.includes(key) && all.indexOf(key) === index);
  }

  function providerFacetPreferences(): FacetPreferences {
    const keys = providerOrderedLargeFacetKeys();
    const display = providerDisplay().facets;
    const pinned = [
      ...(display?.pinned || []),
      ...analysisFacetRows()
        .filter((facet) => facet.default_pinned && !providerPresentationFacet(facet.key)?.default_state)
        .map((facet) => facet.key)
    ];
    const hidden = [
      ...(display?.hidden || []),
      ...analysisFacetRows()
        .filter((facet) => facet.default_hidden && !providerPresentationFacet(facet.key)?.default_state)
        .map((facet) => facet.key)
    ];
    return normalizeFacetPreferences(
      {},
      keys,
      {
        version: 1,
        order: keys,
        pinned,
        shown: [],
        hidden,
        mode: display?.default_mode === 'all' ? 'all' : 'suggested',
        density: 'compact'
      }
    );
  }

  function storedFacetPreferenceMap(): Record<string, unknown> {
    try {
      const parsed = JSON.parse(localStorage.getItem(FACET_PREFERENCES_STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }

  function loadFacetPreferences() {
    if (source?.kind !== 'large') return;
    const defaults = providerFacetPreferences();
    facetPreferences = normalizeFacetPreferences(
      storedFacetPreferenceMap()[source.url],
      defaults.order,
      defaults
    );
  }

  function facetPreferenceOverrides(): Record<string, unknown> {
    return getFacetPreferenceOverrides(facetPreferences, providerFacetPreferences());
  }

  function saveFacetPreferences() {
    if (source?.kind !== 'large') return;
    try {
      const stored = storedFacetPreferenceMap();
      const overrides = facetPreferenceOverrides();
      if (Object.keys(overrides).length) stored[source.url] = { version: 1, ...overrides };
      else delete stored[source.url];
      if (Object.keys(stored).length) localStorage.setItem(FACET_PREFERENCES_STORAGE_KEY, JSON.stringify(stored));
      else localStorage.removeItem(FACET_PREFERENCES_STORAGE_KEY);
    } catch {
      // Device-local display preferences are optional in private windows.
    }
  }

  function updateFacetPreferences(next: FacetPreferences) {
    facetPreferences = normalizeFacetPreferences(next, providerOrderedLargeFacetKeys(), providerFacetPreferences());
    saveFacetPreferences();
  }

  function resetFacetPreferences() {
    facetPreferences = providerFacetPreferences();
    if (source?.kind === 'large') {
      try {
        const stored = storedFacetPreferenceMap();
        delete stored[source.url];
        if (Object.keys(stored).length) localStorage.setItem(FACET_PREFERENCES_STORAGE_KEY, JSON.stringify(stored));
        else localStorage.removeItem(FACET_PREFERENCES_STORAGE_KEY);
      } catch {
        // Device-local display preferences are optional in private windows.
      }
    }
    facetMenuKey = '';
  }

  function facetIsPinned(key: string): boolean {
    return facetPreferences.pinned.includes(key);
  }

  function facetIsOpen(key: string): boolean {
    return facetIsPinned(key) || Boolean(largeFacetFilters[key]?.length) || activeFacetKey === key;
  }

  function facetIsHidden(key: string): boolean {
    return facetPreferences.hidden.includes(key);
  }

  function facetNeedsSuggestedOverride(key: string): boolean {
    if (providerPresentationFacet(key)?.default_state === 'shown') return false;
    const recommendation = analysisFacetForKey(key)?.recommendation;
    return recommendation === 'advanced' || recommendation === 'suppressed';
  }

  function facetIsLowPriority(key: string): boolean {
    return facetNeedsSuggestedOverride(key) && !facetPreferences.shown.includes(key);
  }

  function facetIsSingleValued(key: string): boolean {
    return facetPreviewIsComplete(key) && facetAvailableValueCount(key) === 1;
  }

  function presentedLargeFacetKeys() {
    const ordered = applyFacetPreferenceOrder(providerOrderedLargeFacetKeys(), facetPreferences);
    if (facetPreferences.mode === 'all') return ordered;
    const activeKeys = new Set(Object.keys(largeFacetFilters));
    return ordered.filter(
      (key) => (
        facetIsPinned(key)
        || activeKeys.has(key)
        || (
          !facetIsHidden(key)
          && !facetIsLowPriority(key)
          && (!facetIsSingleValued(key) || facetPreferences.shown.includes(key))
        )
      )
    );
  }

  function setFacetMode(mode: 'suggested' | 'all') {
    updateFacetPreferences({ ...facetPreferences, mode });
  }

  function toggleFacetExplanations() {
    updateFacetPreferences({
      ...facetPreferences,
      density: facetPreferences.density === 'compact' ? 'explained' : 'compact'
    });
  }

  function toggleFacetPin(key: string, restoreMenuFocus = true) {
    const pinned = new Set(facetPreferences.pinned);
    const hidden = new Set(facetPreferences.hidden);
    if (pinned.has(key)) pinned.delete(key);
    else {
      pinned.add(key);
      hidden.delete(key);
      activeFacetKey = key;
      void hydrateLargeFacetValues(key);
    }
    updateFacetPreferences({ ...facetPreferences, pinned: [...pinned], hidden: [...hidden] });
    if (restoreMenuFocus) closeFacetMenu(key);
    else facetMenuKey = '';
  }

  function toggleFacetHidden(key: string) {
    const hidden = new Set(facetPreferences.hidden);
    const pinned = new Set(facetPreferences.pinned);
    const shown = new Set(facetPreferences.shown);
    if (hidden.has(key)) {
      hidden.delete(key);
      if (facetNeedsSuggestedOverride(key)) shown.add(key);
    } else if (facetIsLowPriority(key) && !pinned.has(key)) {
      shown.add(key);
    } else {
      hidden.add(key);
      pinned.delete(key);
      shown.delete(key);
      if (activeFacetKey === key) activeFacetKey = '';
    }
    updateFacetPreferences({ ...facetPreferences, pinned: [...pinned], shown: [...shown], hidden: [...hidden] });
    closeFacetMenu(key);
  }

  function canMoveFacetPreference(key: string, direction: -1 | 1): boolean {
    const pinned = facetIsPinned(key);
    const group = facetPreferences.order.filter((candidate) => facetIsPinned(candidate) === pinned);
    const current = group.indexOf(key);
    return current >= 0 && current + direction >= 0 && current + direction < group.length;
  }

  function moveFacetPreference(key: string, direction: -1 | 1) {
    const nextOrder = moveFacetKeyWithinPinGroup(facetPreferences.order, facetPreferences.pinned, key, direction);
    if (nextOrder === facetPreferences.order) return;
    updateFacetPreferences({ ...facetPreferences, order: nextOrder });
    closeFacetMenu(key);
  }

  function startFacetDrag(key: string, event: DragEvent) {
    draggingFacetKey = key;
    facetDropTargetKey = '';
    event.dataTransfer?.setData('text/plain', key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  function dragFacetOver(key: string, event: DragEvent) {
    const sourceKey = draggingFacetKey || event.dataTransfer?.getData('text/plain') || '';
    if (!sourceKey || sourceKey === key || facetIsPinned(sourceKey) !== facetIsPinned(key)) return;
    event.preventDefault();
    facetDropTargetKey = key;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  function dropFacetBefore(key: string, event: DragEvent) {
    event.preventDefault();
    const sourceKey = draggingFacetKey || event.dataTransfer?.getData('text/plain') || '';
    const nextOrder = moveFacetKeyToTargetWithinPinGroup(
      facetPreferences.order,
      facetPreferences.pinned,
      sourceKey,
      key
    );
    if (nextOrder !== facetPreferences.order) {
      updateFacetPreferences({ ...facetPreferences, order: nextOrder });
    }
    draggingFacetKey = '';
    facetDropTargetKey = '';
  }

  function finishFacetDrag() {
    draggingFacetKey = '';
    facetDropTargetKey = '';
  }

  function closeFacetMenu(key: string, restoreFocus = true) {
    facetMenuKey = '';
    if (restoreFocus) {
      void tick().then(() => (
        document.getElementById(`facet-menu-trigger-${key}`) || document.getElementById('left-tab-facets')
      )?.focus());
    }
  }

  function openFacetMenu(key: string, event?: MouseEvent | KeyboardEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    const opening = facetMenuKey !== key;
    facetMenuKey = opening ? key : '';
    if (opening) {
      void tick().then(() => document.querySelector<HTMLButtonElement>(`#facet-menu-${CSS.escape(key)} button:not(:disabled)`)?.focus());
    }
  }

  function explainFacet(key: string) {
    if (facetPreferences.density !== 'explained') {
      updateFacetPreferences({ ...facetPreferences, density: 'explained' });
    }
    closeFacetMenu(key);
    if (!facetIsOpen(key)) void openLargeFacet(key);
  }

  function openBrowseTab() {
    leftPanelTab = 'browse';
    void tick().then(() => document.getElementById('left-tab-browse')?.focus());
  }

  function facetContextKeydown(key: string, event: KeyboardEvent) {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) openFacetMenu(key, event);
  }

  function facetMenuKeydown(key: string, event: KeyboardEvent) {
    const menu = document.getElementById(`facet-menu-${key}`);
    const items = [...(menu?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])];
    if (!items.length) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeFacetMenu(key);
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const current = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    event.preventDefault();
    items[nextIndex].focus();
  }

  function facetDisplayLabel(key: string): string {
    return providerPresentationFacet(key)?.label || analysisFacetForKey(key)?.label || key.replaceAll('_', ' ');
  }

  function facetSummary(key: string): string {
    return getFacetSummary(largeAnalysis(), key, source?.kind === 'large' ? source.overview.facet_previews || {} : {});
  }

  function facetDefinition(key: string): string {
    const providerDefinition = providerPresentationFacet(key)?.description || analysisFacetForKey(key)?.description;
    if (providerDefinition) return providerDefinition;
    const definitions: Record<string, string> = {
      publisher: 'Owning or publishing organisation in the harvested source metadata.',
      canonical_publisher: 'Normalised provider identity used to connect variant organisation names.',
      organisation_family: 'Broad public-sector grouping used to organise providers.',
      publisher_family: 'Broad public-sector grouping inferred from publisher metadata.',
      format: 'Protocol or file/API format advertised by the source.',
      protocol: 'API or data-access protocol detected from the endpoint or contract metadata.',
      contract_status: 'Whether a machine-readable contract, capability document or service description was observed.',
      record_type: 'The kind of catalogue item: API product, data endpoint, data product, operation, contract or schema.',
      quality_band: 'Bucketed metadata quality score for quick triage.',
      assurance_status: 'Observed, declared or assured confidence level for the public metadata.',
      source_adapter: 'Harvester or adapter that contributed the record.',
      source_tier: 'Source tier used by the UK Government API OKF specification.',
      confidence: 'How strongly the source supports the record.',
      access_model: 'Observed public access requirement, such as anonymous, API key or approval required.',
      dcat_type: 'Closest DCAT/DCAT-AP term. Rendered as a standards term, not as a repo-only label.',
      openapi_type: 'Closest OpenAPI object or fragment that could be emitted by an exporter.',
      dcat_export_status: 'DCAT export-readiness state for this generated metadata record.',
      openapi_export_status: 'OpenAPI export-readiness state for this generated metadata record.',
      openapi_security_scheme: 'OpenAPI securitySchemes.type implied by the observed access model.',
      license: 'Licence metadata from the source. Not specified means a metadata gap, not a licence.',
      data_classification: 'Public metadata classification inferred from visibility and access model.',
      environment: 'Observed environment such as production/public, sandbox/test or retired.',
      relationship_density: 'Bucket showing how connected records are in the generated graph.'
    };
    return definitions[key] || '';
  }

  function helpText(key: string): string {
    const governed = source?.kind === 'large'
      ? governedHelpText(source.termRegistry, key)
      : '';
    return governed || HELP_TEXT[key] || HELP_TEXT[key.split(':')[0]] || '';
  }

  function bundleResourceUrl(reference: string): string {
    if (source?.kind !== 'large') return reference;
    if (/^https?:\/\//i.test(reference)) return reference;
    const bundleRelative = reference.startsWith('/') ? reference.slice(1) : reference;
    return new URL(bundleRelative, source.baseUrl).href;
  }

  function resourceReferencePath(reference: LargeResourceReference | undefined): string {
    if (!reference) return '';
    return typeof reference === 'string' ? reference : reference.path;
  }

  function toggleHelp(key: string) {
    activeHelpKey = key;
  }

  function showHelp(key: string) {
    activeHelpKey = key;
  }

  function hideHelp(key: string) {
    if (activeHelpKey === key) activeHelpKey = '';
  }

  function metadataDisplayValue(value: unknown): string {
    return displayValue(value);
  }

  function licenceDisplayLabel(record: AnyLargeRecord | undefined): string {
    const identifier = recordString(record, 'license_id');
    if (identifier) return facetValueDisplay('license', identifier);
    return metadataDisplayValue(recordString(record, 'license_title'));
  }

  function groupDisplayValue(value: unknown): string {
    if (!Array.isArray(value) || !value.length) return 'Not specified (metadata gap)';
    const labels = value
      .map((item) => {
        if (item && typeof item === 'object') {
          const group = item as Record<string, unknown>;
          return String(group.title || group.name || group.id || '').trim();
        }
        return String(item || '').trim();
      })
      .filter(Boolean);
    return labels.length ? labels.join(', ') : metadataDisplayValue(value);
  }

  function licenceBasisLabel(record: AnyLargeRecord | undefined): string {
    const basis = recordString(record, 'license_basis') || recordString(record, 'licence_basis');
    if (basis === 'source-declared') return 'source-declared';
    if (basis === 'provider-terms-inferred') return 'inferred from provider terms';
    if (basis === 'not-specified') return 'not specified';
    return basis || 'not recorded';
  }

  function standardsAlignment(record: LargeDataset | undefined): LargeDataset['standards_alignment'] | undefined {
    const value = record?.standards_alignment;
    return value && typeof value === 'object' ? value : undefined;
  }

  function standardsList(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
  }

  function facetSelectedSummary(key: string, values: string[]): string {
    const labels = values.slice(0, 2).map((value) => facetValueDisplay(key, value));
    return `${labels.join(', ')}${values.length > 2 ? ` +${values.length - 2}` : ''}`;
  }

  function facetValueDisplay(key: string, value: string): string {
    if (value === MISSING_FILTER_VALUE) return 'Not specified (metadata gap)';
    const route = metadataEndpointRoute(
      key === 'canonical_publisher' ? 'publisher' : key,
      value
    );
    const indexedPublisher = (key === 'publisher' || key === 'canonical_publisher')
      ? largeIndex?.publisherByName.get(value)?.title
      : '';
    const endpointLabels = source?.kind === 'large' ? source.endpointLabels : undefined;
    const fallback = indexedPublisher || facetValueLabel(largeAnalysis(), key, value);
    // The endpoint-label denominator covers graph-reachable routes, not every
    // value in the much wider search-facet catalogue. An absent ordinary facet
    // therefore keeps its existing safe label; an indexed graph route uses its
    // governed presentation label.
    return endpointLabels?.byRoute.has(route) || (
      endpointLabels &&
      (
        isOpaqueEndpointIdentifier(value, endpointLabels.opaqueIdentifierPatterns) ||
        isOpaqueEndpointIdentifier(fallback, endpointLabels.opaqueIdentifierPatterns)
      )
    )
      ? endpointLabelForRoute(endpointLabels, route, fallback)
      : fallback;
  }

  function facetMetadataDisplayValue(key: string, value: unknown): string {
    const values = (Array.isArray(value) ? value : [value])
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    return values.length
      ? values.map((item) => facetValueDisplay(key, item)).join(', ')
      : metadataDisplayValue(value);
  }

  function facetSelectedValues(key: string): string[] {
    return largeFacetFilters[key] || [];
  }

  function facetAvailableValueCount(key: string): number {
    const meta = analysisFacetForKey(key);
    const dynamic = dynamicFacetPreviewRows(key);
    if (dynamic !== undefined) return dynamic.length;
    if (largeIndex) return largeFacetRows(key).length;
    if (Object.prototype.hasOwnProperty.call(largeBaselineFacetRows, key)) return largeBaselineFacetRows[key]?.length || 0;
    if (meta?.cardinality !== undefined) return meta.cardinality;
    if (Object.prototype.hasOwnProperty.call(largeFacetIndex, key)) return largeFacetIndex[key]?.length || 0;
    return source?.kind === 'large' ? source.overview.facet_previews?.[key]?.length || 0 : 0;
  }

  function facetSummaryBadge(key: string): string {
    const selected = facetSelectedValues(key).length;
    if (selected) return `${selected} selected`;
    if (largeFacetHydratingKey === key || (largeFullLoading && facetIsOpen(key) && !largeIndex)) return 'Loading';
    if (facetIsOpen(key) && largeIndex) {
      const available = facetAvailableValueCount(key);
      if (largeFacetQuery(key).trim()) return 'Search active';
      if (available) return `${available} values`;
    }
    const available = facetAvailableValueCount(key);
    return available || facetPreviewIsComplete(key) ? `${available} values` : 'Load';
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
    const note = recordString(record, 'context_note');
    return datasetAlternatives(record).length && /^Compare before selecting:/i.test(note) ? '' : note;
  }

  function datasetAlternatives(record: AnyLargeRecord | undefined): LargeDatasetAlternative[] {
    const value = (record as Record<string, unknown> | undefined)?.alternatives;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is LargeDatasetAlternative => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
  }

  function alternativeRoute(alternative: LargeDatasetAlternative): string {
    const supplied = typeof alternative.route === 'string'
      ? alternative.route
      : typeof alternative.record_id === 'string'
        ? alternative.record_id
        : '';
    if (!supplied) return '';
    if (supplied.includes('/')) return supplied;
    const indexed = largeIndex?.datasets.find((dataset) => (
      dataset.name === supplied
      || recordString(dataset, 'record_id') === supplied
      || datasetRoute(dataset) === supplied
    ));
    return indexed ? datasetRoute(indexed) : `dataset/${supplied}`;
  }

  function alternativeDataset(alternative: LargeDatasetAlternative): LargeDataset {
    const route = alternativeRoute(alternative);
    return largeIndex?.datasets.find((dataset) => datasetRoute(dataset) === route) || {
      name: route.replace(/^dataset\//, '') || String(alternative.record_id || alternative.title || 'alternative'),
      title: String(alternative.title || alternative.record_id || 'Alternative dataset'),
      source_surface: alternative.source_surface,
      record_type: alternative.record_type
    };
  }

  function alternativeDifferenceSummary(alternative: LargeDatasetAlternative): string[] {
    return (alternative.differences || []).slice(0, 4).map((difference) => {
      const field = String(difference.field || 'Difference').replaceAll('_', ' ');
      return `${capitalise(field)}: ${displayValue(difference.alternative)}`;
    });
  }

  function distinctDatasetAlternatives(dataset: LargeDataset): LargeDatasetAlternative[] {
    const currentSeries = datasetDisplaySeries(dataset).key;
    const seen = new Set<string>();
    return datasetAlternatives(dataset).filter((alternative) => {
      const candidate = alternativeDataset(alternative);
      const route = alternativeRoute(alternative);
      if (!route || seen.has(route) || datasetDisplaySeries(candidate).key === currentSeries) return false;
      seen.add(route);
      return true;
    });
  }

  function apiRecordMeta(record: AnyLargeRecord | undefined): string {
    const recordType = recordString(record, 'record_type') || recordString(record, 'type');
    const sourceAdapter = recordString(record, 'source_adapter');
    const confidence = recordString(record, 'confidence');
    const endpointHost = recordString(record, 'endpoint_host');
    const documentationHost = recordString(record, 'documentation_host');
    const accessModel = recordString(record, 'access_model');
    const contractStatus = recordString(record, 'contract_status');
    const protocols = Array.isArray(record?.protocol)
      ? record.protocol.map(String).slice(0, 2)
      : [];
    const formats = protocols.length
      ? protocols.map((value) => facetValueDisplay('protocol', value)).join(', ')
      : Array.isArray(record?.formats)
        ? record.formats.slice(0, 2).map((value) => facetValueDisplay('format', String(value))).join(', ')
        : '';
    return [
      recordType,
      sourceAdapter ? `source ${sourceAdapter}` : '',
      confidence ? `confidence ${confidence}` : '',
      endpointHost && endpointHost !== 'not-specified' ? `endpoint ${facetValueDisplay('host', endpointHost)}` : '',
      documentationHost && documentationHost !== 'not-specified' ? `docs ${facetValueDisplay('host', documentationHost)}` : '',
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
    const filters = Object.entries(largeFacetFilters).flatMap(([key, values]) => values.map((value) => `${facetDisplayLabel(key)}: ${facetValueDisplay(key, value)}`));
    if (geospatialFilter) filters.unshift(`Map: ${geospatialFilterLabel(geospatialFilter)}`);
    if (filters.length) return filters.join(', ');
    return largeAnalysis()?.narrative?.title || largeAnalysis()?.summary?.title || (source?.kind === 'large' ? source.descriptor.title : 'Overview');
  }

  function selectedLargeFilterLabels() {
    const labels = Object.entries(largeFacetFilters).flatMap(([key, values]) =>
      values.map((value) => ({ key, value, label: `${facetDisplayLabel(key)}: ${facetValueDisplay(key, value)}` }))
    );
    if (geospatialFilter) labels.unshift({ key: '__geo', value: geospatialFilter, label: `Map: ${geospatialFilterLabel(geospatialFilter)}` });
    return labels;
  }

  function largeContextMetrics() {
    const counts = source?.kind === 'large' ? source.manifest.counts : {};
    const hasApiCounts =
      counts.declared_api_products !== undefined || counts.provider_native_api_products !== undefined || counts.data_access_endpoints !== undefined || counts.data_products !== undefined;
    const responseIsReduction = Boolean(largeSearchResponse && (largeAppliedQuery.trim() || Object.keys(largeFacetFilters).length));
    const responseTotal = responseIsReduction ? largeSearchResponse?.total : undefined;
    const localCountMatchesResponse = responseTotal === undefined || largeVisibleDatasets.length === responseTotal;
    if (largeIndex) {
      if (!localCountMatchesResponse) {
        return [
          { label: `${recordPlural()} matching`, value: responseTotal || 0 },
          { label: `${recordPlural()} shown`, value: largeResults.length },
          { label: `${publisherPlural()} shown`, value: new Set(largeResults.map((result) => result.publisher).filter(Boolean)).size },
          { label: 'active filters', value: activeLargeFilterCount }
        ];
      }
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
        { label: recordPlural(), value: responseTotal ?? largeVisibleDatasets.length },
        { label: resourcePlural(), value: resourceCount },
        { label: publisherPlural(), value: publisherCount },
        { label: 'active filters', value: activeLargeFilterCount }
      ];
    }
    if (responseTotal !== undefined) {
      return [
        { label: `${recordPlural()} matching`, value: responseTotal },
        { label: `${recordPlural()} shown`, value: largeResults.length },
        { label: `${publisherPlural()} shown`, value: new Set(largeResults.map((result) => result.publisher).filter(Boolean)).size },
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
      { label: recordPlural(), value: summary?.record_count ?? counts.records ?? counts.datasets ?? 0 },
      { label: resourcePlural(), value: summary?.resource_count ?? counts.resources ?? 0 },
      { label: 'relationships', value: summary?.relationship_count ?? counts.relationships ?? 0 },
      { label: 'active filters', value: activeLargeFilterCount }
    ];
  }

  function topContextFacetValues(key: string, limit = 6) {
    return largeFacetRows(key).slice(0, limit);
  }

  function overviewEntryPoints() {
    const analysis = largeAnalysis();
    const publisherEntries = (source?.kind === 'large' ? source.overview.top_publishers || [] : []).slice(0, 6).map((item) => {
      const publisherValue = String(item.id || '').replace(/^publisher\//, '');
      const route = facetValueRoute('publisher', publisherValue);
      return ({
      label: largeLabelForRoute(metadataEndpointRoute('publisher', publisherValue)),
      meta: `${Number(item.dataset_count || 0).toLocaleString()} ${recordPlural()}`,
      route
    });
    });
    const recentEntries = (source?.kind === 'large' ? source.overview.recent_datasets || [] : []).slice(0, 6).map((item) => ({
      label: largeDatasetLabel(item),
      meta: `${largeRecordPublisherLabel(item)} · ${item.resource_count} ${resourcePlural()}`,
      route: datasetRoute(item)
    }));
    const analysisEntries =
      analysis?.graph_overview?.nodes
        .filter((node) => node.id.startsWith('facet/'))
        .slice(0, 6)
        .map((node) => ({
          label: largeLabelForRoute(node.id),
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

  async function openHierarchyValue(key: string, route: string | undefined, label: string) {
    if (largeFacetApplyingKey) return;
    const facetRoute = route ? routeForAnalysisNode(route) : null;
    largeFacetApplyingKey = facetRoute?.key || key;
    largeFacetApplyingValue = facetRoute?.value || label;
    await tick();
    try {
      if (facetRoute) applyAnalysisFacet(facetRoute.key, facetRoute.value);
      else applyAnalysisFacet(key, label);
    } finally {
      await tick();
      largeFacetApplyingKey = '';
      largeFacetApplyingValue = '';
    }
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
    return largeRecordRoute(dataset);
  }

  function indexedDatasetForRoute(route: string): LargeDataset | undefined {
    if (!largeIndex || !route) return undefined;
    return largeIndex.datasetByRoute.get(route)
      || (route.startsWith('dataset/') ? largeIndex.datasetByName.get(routeValue(route)) : undefined);
  }

  function availableDatasetForRoute(route: string): LargeDataset | SearchResultDoc | undefined {
    if (!route) return undefined;
    return indexedDatasetForRoute(route)
      || largeTargetedDatasets.get(route)
      || largeResults.find((dataset) => datasetRoute(dataset) === route)
      || (source?.kind === 'large'
        ? source.overview.recent_datasets?.find((dataset) => datasetRoute(dataset) === route)
        : undefined);
  }

  function largeRouteIsKnownRecord(route: string): boolean {
    return Boolean(availableDatasetForRoute(route) || route.startsWith('dataset/'));
  }

  function rankedResultCanonicalUrl(dataset: LargeDataset | SearchResultDoc): string {
    return isUrl(dataset.url) ? dataset.url : '';
  }

  function resourceRoute(resource: LargeResource): string {
    return `resource/${resource.id}`;
  }

  function publisherRoute(publisher: LargePublisher | string): string {
    return metadataEndpointRoute(
      'publisher',
      typeof publisher === 'string' ? publisher : publisher.name
    );
  }

  function largeDatasetLabel(dataset: LargeDataset | SearchResultDoc): string {
    return endpointLabelForRoute(
      source?.kind === 'large' ? source.endpointLabels : undefined,
      datasetRoute(dataset),
      dataset.title
    );
  }

  function governedDisplaySeriesLabel(
    dataset: LargeDataset,
    series: ReturnType<typeof datasetDisplaySeries>
  ): string {
    return series.inferred && series.label === dataset.title
      ? largeDatasetLabel(dataset)
      : series.label;
  }

  function largeResourceLabel(resource: LargeResource): string {
    return largeLabelForRoute(resourceRoute(resource));
  }

  function largePublisherLabel(
    publisher: string | undefined,
    fallback = ''
  ): string {
    if (publisher) return largeLabelForRoute(publisherRoute(publisher));
    return endpointLabelForRoute(
      source?.kind === 'large' ? source.endpointLabels : undefined,
      metadataEndpointRoute('publisher', 'unknown'),
      fallback || `Unknown ${publisherSingular()}`
    );
  }

  function largeRecordPublisherLabel(dataset: LargeDataset | SearchResultDoc): string {
    return largePublisherLabel(
      dataset.publisher,
      dataset.publisher_title || dataset.publisher || `Unknown ${publisherSingular()}`
    );
  }

  function routeKind(route: string): string {
    return route.split('/')[0] || 'route';
  }

  function routeValue(route: string): string {
    return route.split('/').slice(1).join('/');
  }

  function routeSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }

  function isGraphStackRoute(route: string): boolean {
    return isRecordTypeStackRoute(route) || route.startsWith('relationship-stack/') || route.startsWith('facet-stack/');
  }

  function isRecordTypeStackRoute(route: string): boolean {
    return route.startsWith('record-type-stack/');
  }

  function isGraphStackNodeType(type: string): boolean {
    return type === 'resource-stack' || type === 'relationship-stack' || type === 'record-type-stack' || type === 'facet-stack';
  }

  function decodedGraphStackPart(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function graphStackParentRoute(route: string): string {
    if (!route.startsWith('facet-stack/')) return '';
    return decodedGraphStackPart(route.split('/')[1] || '');
  }

  function toggleLargeGraphStack(route: string) {
    const openIndex = largeExpandedGraphGroups.indexOf(route);
    if (openIndex >= 0) {
      largeExpandedGraphGroups = largeExpandedGraphGroups.slice(0, openIndex);
    } else {
      const parent = graphStackParentRoute(route);
      const parentIndex = parent ? largeExpandedGraphGroups.indexOf(parent) : -1;
      largeExpandedGraphGroups = parentIndex >= 0
        ? [...largeExpandedGraphGroups.slice(0, parentIndex + 1), route]
        : [route];
    }
    largeHighlightedRoute = route;
    largeForwardRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    activeView = 'graph';
    graphLabelPhase = 0;
    syncExplorerUrl(true);
  }

  function largeLabelForRoute(route: string): string {
    if (!route) return 'Overview';
    const kind = routeKind(route);
    const encodedValue = routeValue(route);
    const value = [
      'publisher',
      'format',
      'topic',
      'tag',
      'license',
      'host',
      'resource_type',
      'category',
      'type_code',
      'document_type',
      'creation_year',
      'jurisdiction',
      'legal_status'
    ].includes(kind)
      ? decodeEndpointRouteSegment(encodedValue)
      : encodedValue;
    const endpointLabels = source?.kind === 'large' ? source.endpointLabels : undefined;
    const displayEndpointLabel = (fallback: string) => endpointLabelForRoute(
      endpointLabels,
      route,
      fallback
    );
    if (kind === 'record-type-stack') {
      return value.split('/').slice(1).join('/') || 'Record type group';
    }
    if (kind === 'facet-stack') {
      const parts = route.split('/');
      const dimension = decodedGraphStackPart(parts.at(-2) || 'group');
      const facetValue = decodedGraphStackPart(parts.at(-1) || 'group');
      return `${facetValueDisplay(dimension, facetValue)} group`;
    }
    if (endpointLabels?.byRoute.has(route)) return endpointLabelForRoute(endpointLabels, route);
    const analysisLabel = analysisLabelForRoute(largeAnalysis(), route);
    if (analysisLabel) return displayEndpointLabel(analysisLabel);
    const routedDataset = largeIndex?.datasetByRoute.get(route);
    if (routedDataset) return displayEndpointLabel(routedDataset.title);
    const routedResult = largeResults.find((result) => datasetRoute(result) === route);
    if (routedResult) return displayEndpointLabel(routedResult.title);
    if (kind === 'dataset') {
      return displayEndpointLabel(largeTargetedDatasets.get(route)?.title || largeIndex?.datasetByName.get(value)?.title || largeResults.find((result) => result.name === value)?.title || value);
    }
    if (kind === 'resource') return displayEndpointLabel(largeIndex?.resourceById.get(value)?.name || value);
    if (kind === 'publisher') return displayEndpointLabel(largeIndex?.publisherByName.get(value)?.title || value);
    if (kind === 'resource-stack') {
      const datasetName = value.replace(/^dataset\//, '');
      const dataset = largeIndex?.datasetByName.get(datasetName);
      return `${resourceStackLabel()}: ${dataset ? largeDatasetLabel(dataset) : datasetName}`;
    }
    return displayEndpointLabel(value || route);
  }

  function routeRelationships(route: string, limit = 120): LargeRelationship[] {
    if (!route) return [];
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

  function metadataMembershipLabel(route: string): string {
    const facet = metadataFacetForRoute(route);
    if (facet?.key === 'jurisdiction') return 'indexed with territorial publication context';
    return facet ? `matches ${facetLabel(facet.key).toLowerCase()}` : metadataRelationshipLabel(route);
  }

  function metadataMembershipDescription(route: string): string {
    const facet = metadataFacetForRoute(route);
    if (facet?.key === 'jurisdiction') {
      return 'Territorial publication context is inferred from the official type code. It is an index navigation fact, not provision-level territorial extent or legal applicability.';
    }
    if (facet) {
      return 'These links are derived from the snapshot-bound static facet index. Select a record to load that record’s governed semantic relationships.';
    }
    return 'This route is not a static facet value. Loaded governed semantic relationships are shown when the bundle publishes them for this route.';
  }

  function datasetMatchesMetadataRoute(dataset: LargeDataset, route: string): boolean {
    if (!largeIndex || !route) return false;
    const analysisFacet = routeForAnalysisNode(route);
    if (analysisFacet) return largeDatasetFacetValues(dataset, analysisFacet.key).includes(analysisFacet.value);
    const kind = routeKind(route);
    const value = decodeEndpointRouteSegment(routeValue(route));
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

  function searchResultsForMetadataRoute(route: string, limit = 80): SearchResultDoc[] {
    const facet = metadataFacetForRoute(route);
    if (!facet) return [];
    const selectedValues = largeFacetFilters[facet.key] || [];
    const rows = selectedValues.includes(facet.value)
      ? largeResults
      : largeResults.filter((result) =>
          largeDatasetFacetValues(result as LargeDataset, facet.key).includes(facet.value)
        );
    return rows.slice(0, limit);
  }

  function metadataRoutePreviewRecords(route: string, limit = 80): Array<LargeDataset | SearchResultDoc> {
    return largeIndex
      ? datasetsForMetadataRoute(route, limit)
      : searchResultsForMetadataRoute(route, limit);
  }

  function showMetadataRouteRecords(route: string) {
    const facet = metadataFacetForRoute(route);
    if (!facet) return;
    leftCollapsed = false;
    leftPanelTab = 'results';
    if (!(largeFacetFilters[facet.key] || []).includes(facet.value)) {
      applyAnalysisFacet(facet.key, facet.value);
    }
  }

  function openMetadataPreviewRecord(record: LargeDataset | SearchResultDoc) {
    if (typeof record.ordinal === 'number' && typeof record.open === 'string') {
      chooseLargeResult(record as SearchResultDoc);
    }
    else selectLargeRoute(datasetRoute(record));
  }

  function datasetCountForMetadataRoute(route: string): number {
    const facet = metadataFacetForRoute(route);
    if (facet) {
      const selected = largeFacetFilters[facet.key] || [];
      if (
        selected.length === 1 &&
        selected[0] === facet.value &&
        largeSearchResponse &&
        (largeAppliedQuery.trim() || Object.keys(largeFacetFilters).length)
      ) return largeSearchResponse.total;
      const dynamic = dynamicFacetPreviewRows(facet.key)?.find((row) => row.value === facet.value);
      if (dynamic) return dynamic.count;
    }
    if (largeIndex) return largeVisibleDatasets.filter((dataset) => datasetMatchesMetadataRoute(dataset, route)).length;
    if (facet) {
      const preview = facetPreviewRows(facet.key).find((row) => row.value === facet.value);
      if (preview) return preview.count;
    }
    const analysisNode = analysisNodeForRoute(route);
    return Number(analysisNode?.count || 0);
  }

  function datasetCountScopeForMetadataRoute(route: string): string {
    const facet = metadataFacetForRoute(route);
    if (!facet) return 'in current reduction';
    if ((largeFacetFilters[facet.key] || []).includes(facet.value)) return 'in current reduction';
    if (dynamicFacetPreviewRows(facet.key)) return 'available with other filters applied';
    return 'in whole corpus';
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
    const governedType = endpointTypeForRoute(
      source?.kind === 'large' ? source.endpointLabels : undefined,
      route
    );
    if (governedType) return governedType;
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
    if (kind === 'relationship-stack') return 'Relationship stack';
    if (kind === 'record-type-stack') return 'Grouped record type';
    return kind ? `${kind.slice(0, 1).toUpperCase()}${kind.slice(1).replace(/_/g, ' ')}` : 'Route';
  }

  function relationshipTitle(edge: LargeGraphEdge): string {
    return formatRelationshipTitle(edge, largeLabelForRoute);
  }

  function resolveLargeDetail(route: string): LargeDetail | null {
    if (!route) return null;
    const kind = routeKind(route);
    const value = routeValue(route);
    const routedDataset = largeIndex?.datasetByRoute.get(route);
    if (routedDataset) {
      return {
        kind: 'dataset',
        route,
        dataset: routedDataset,
        resources: largeIndex?.resourcesByDataset.get(routedDataset.name) || [],
        publisher: routedDataset.publisher
          ? largeIndex?.publisherByName.get(routedDataset.publisher)
          : undefined,
        relationships: routeRelationships(route)
      };
    }
    const targetedDataset = largeTargetedDatasets.get(route);
    if (targetedDataset) {
      return {
        kind: 'dataset',
        route,
        dataset: targetedDataset,
        resources: largeIndex?.resourcesByDataset.get(targetedDataset.name) || [],
        publisher: targetedDataset.publisher
          ? largeIndex?.publisherByName.get(targetedDataset.publisher)
          : undefined,
        relationships: routeRelationships(route)
      };
    }
    const routedOverviewResult = source?.kind === 'large'
      ? source.overview.recent_datasets?.find(
          (item: SearchResultDoc) => datasetRoute(item) === route
        )
      : undefined;
    const routedResult =
      largeResults.find((item) => datasetRoute(item) === route) || routedOverviewResult;
    if (routedResult) return { kind: 'search', route, result: routedResult };
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

  function graphRecordType(dataset: LargeDataset): string {
    return String(dataset.record_type || dataset.type || recordSingular()).trim() || recordSingular();
  }

  function graphEdgeSemanticMetadata(record: Record<string, unknown> | undefined) {
    if (!record) return {};
    const relationship = relationshipPresentation(record);
    const predicate = ['predicate', 'property', 'predicate_iri']
      .map((key) => String(record[key] || '').trim())
      .find(Boolean);
    const metrics: Array<[string, string]> = [
      ['strength', 'relationship strength'],
      ['weight', 'relationship weight'],
      ['evidence_count', 'evidence count']
    ];
    const metric = metrics
      .map(([key, label]) => ({ label, value: Number(record[key]) }))
      .find((candidate) => Number.isFinite(candidate.value) && candidate.value >= 0);
    return {
      ...(relationship.id ? { id: relationship.id } : {}),
      ...(predicate ? { predicate } : {}),
      ...(relationship.inverseLabel ? { inverseLabel: relationship.inverseLabel } : {}),
      ...(relationship.sourceIri ? { sourceIri: relationship.sourceIri } : {}),
      ...(relationship.targetIri ? { targetIri: relationship.targetIri } : {}),
      ...(relationship.assertionStatus !== 'unclassified'
        ? { assertionStatus: relationship.assertionStatus }
        : {}),
      ...(relationship.assertionScope !== 'unclassified'
        ? { assertionScope: relationship.assertionScope }
        : {}),
      ...(metric ? { weightValue: metric.value, weightMetric: metric.label } : {}),
      authorityClass: relationship.authorityClass,
      authorityLabel: relationship.authorityLabel,
      authoritySource: relationship.authoritySource,
      derivation: relationship.derivation,
      derivationActivity: relationship.derivationActivity,
      rule: relationship.rule,
      supportingAssertions: relationship.supportingAssertions,
      confidence: relationship.confidence,
      observedAt: relationship.observedAt,
      staleAfter: relationship.staleAfter,
      freshness: relationship.freshness,
      evidenceUrls: relationship.evidenceUrls,
      evidenceItems: relationship.evidenceItems,
      supportProfile: relationship.supportProfile,
      reviewStatus: relationship.reviewStatus,
      officialLegalClassification: relationship.officialLegalClassification,
      rights: relationship.rights,
      rightsSource: relationship.rightsSource,
      rightsAssertion: relationship.rightsAssertion
    };
  }

  function graphContextKey(center: string): string {
    if (center) return center;
    if (largeAppliedQuery.trim()) return `search/${largeAppliedQuery.trim()}`;
    const filters = Object.entries(largeFacetFilters)
      .flatMap(([key, values]) => values.map((value) => `${key}:${value}`))
      .sort();
    return filters.length ? `filters/${filters.join('|')}` : 'current-reduction';
  }

  function recordTypeStackRoute(context: string, recordType: string): string {
    return `record-type-stack/${routeSlug(context)}/${routeSlug(recordType)}`;
  }

  function largeGraphModel(): LargeGraphModel {
    const analysis = largeAnalysis();
    if (largeHasAnalysisOverview('graph') && analysis?.graph_overview?.nodes?.length) {
      return {
        center: '',
        nodes: analysis.graph_overview.nodes.map((node) => ({
          id: node.id,
          label: endpointLabelForRoute(
            source?.kind === 'large' ? source.endpointLabels : undefined,
            node.id,
            node.label
          ),
          type: node.type,
          count: node.count
        })),
        relationships: (analysis.graph_overview.edges || []).map((edge) => {
          const metadata = graphEdgeSemanticMetadata(edge as unknown as Record<string, unknown>);
          return {
            source: edge.source,
            target: edge.target,
            label: edge.label,
            count: edge.count,
            ...metadata
          };
        })
      };
    }

    const selectedCenter =
      [largeGraphCenterRoute, largeSelectedRoute].find((route) => route && !isGraphStackRoute(route) && largeRouteCanInteract(route)) || '';
    const center = selectedCenter;
    const contextKey = graphContextKey(center);
    const nodeMap = new Map<string, LargeGraphNode>();
    const edges: LargeGraphEdge[] = [];
    const edgeKeys = new Set<string>();
    let grouping: LargeGraphGrouping | undefined;
    let hierarchyRoot: Omit<LargeGraphHierarchy, 'levels'> | undefined;
    const hierarchyLevels: LargeGraphHierarchyLevel[] = [];

    const addNode = (id: string, type = routeKind(id), label = largeLabelForRoute(id), count?: number, stackFor?: string) => {
      if (!id) return;
      if (!nodeMap.has(id)) nodeMap.set(id, { id, label, type, count, stackFor });
    };
    const addEdge = (sourceId: string, targetId: string, label: string, record?: Record<string, unknown>) => {
      const key = `${sourceId}\u0000${targetId}\u0000${label}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      addNode(sourceId);
      addNode(targetId);
      edges.push({ source: sourceId, target: targetId, label, ...graphEdgeSemanticMetadata(record) });
    };
    const addCountedEdge = (
      sourceId: string,
      targetId: string,
      label: string,
      count?: number,
      record?: Record<string, unknown>
    ) => {
      const key = `${sourceId}\u0000${targetId}\u0000${label}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      addNode(sourceId);
      addNode(targetId);
      edges.push({ source: sourceId, target: targetId, label, count, ...graphEdgeSemanticMetadata(record) });
    };
    const addDatasetNode = (dataset: LargeDataset) => {
      addNode(datasetRoute(dataset), 'dataset');
    };
    const noteRecordTypeGrouping = (expandedLabel?: string) => {
      if (grouping && grouping.dimension !== 'record_type' && !expandedLabel) return;
      grouping = {
        dimension: 'record_type',
        label: 'Grouped by record type',
        expandedLabel: expandedLabel || grouping?.expandedLabel
      };
    };
    const groupedRows = (datasets: LargeDataset[]) => {
      const groups = new Map<string, LargeDataset[]>();
      for (const dataset of datasets) {
        const key = graphRecordType(dataset);
        const rows = groups.get(key) || [];
        rows.push(dataset);
        groups.set(key, rows);
      }
      return [...groups.entries()]
        .map(([recordType, rows]) => ({ recordType, rows }))
        .sort((left, right) => right.rows.length - left.rows.length || left.recordType.localeCompare(right.recordType));
    };
    const stackSubgroupCandidates = [...new Set([
      ...(largePresentation()?.facets || []).map((facet) => facet.key),
      'life_course_domain',
      'acquisition_wave',
      'delivery_scope',
      'jurisdiction_research',
      'implementation_status',
      'format',
      'topic',
      'license',
      'access_model',
      'contract_status',
      'source_adapter',
      'update_year'
    ])];
    const fallbackStackSubgroups = (rows: LargeDataset[]) => {
      const titleBands = new Map<string, LargeDataset[]>();
      const titleBand = (title: string) => {
        const initial = title.trim().slice(0, 1).toUpperCase();
        if (/^[A-D]$/.test(initial)) return 'A–D';
        if (/^[E-H]$/.test(initial)) return 'E–H';
        if (/^[I-L]$/.test(initial)) return 'I–L';
        if (/^[M-P]$/.test(initial)) return 'M–P';
        if (/^[Q-T]$/.test(initial)) return 'Q–T';
        if (/^[U-Z]$/.test(initial)) return 'U–Z';
        return 'Number or symbol';
      };
      for (const dataset of rows) {
        const value = titleBand(dataset.title || dataset.name || '');
        const group = titleBands.get(value) || [];
        group.push(dataset);
        titleBands.set(value, group);
      }
      if (titleBands.size >= 2) {
        return {
          dimension: 'title_band',
          rows: [...titleBands.entries()]
            .map(([value, groupRows]) => ({ value, rows: groupRows }))
            .sort((left, right) => left.value.localeCompare(right.value))
        };
      }
      const ordered = [...rows].sort((left, right) => left.title.localeCompare(right.title));
      const chunkSize = Math.max(1, Math.ceil(ordered.length / GRAPH_SUBGROUP_MAX_COUNT));
      return {
        dimension: 'title_range',
        rows: Array.from({ length: Math.ceil(ordered.length / chunkSize) }, (_unused, index) => {
          const start = index * chunkSize;
          const groupRows = ordered.slice(start, start + chunkSize);
          return {
            value: `${recordPlural()} ${start + 1}–${start + groupRows.length}`,
            rows: groupRows
          };
        })
      };
    };
    const bestStackSubgroups = (rows: LargeDataset[], excludedDimensions: string[] = []) => {
      const excluded = new Set(excludedDimensions);
      if (largeIndex) {
        for (const dimension of stackSubgroupCandidates) {
          if (excluded.has(dimension)) continue;
          const groups = new Map<string, LargeDataset[]>();
          for (const dataset of rows) {
            const values = largeDatasetFacetValues(dataset, dimension);
            const value = values[0] || 'not recorded';
            const group = groups.get(value) || [];
            group.push(dataset);
            groups.set(value, group);
          }
          if (groups.size >= 2 && groups.size <= GRAPH_SUBGROUP_MAX_COUNT) {
            return {
              dimension,
              rows: [...groups.entries()]
                .map(([value, groupRows]) => ({ value, rows: groupRows }))
                .sort((left, right) => right.rows.length - left.rows.length || left.value.localeCompare(right.value))
            };
          }
        }
      }
      return fallbackStackSubgroups(rows);
    };
    const addOpenedStackSubgroups = (
      rows: LargeDataset[],
      stackId: string,
      target: string,
      label: string,
      direction: 'to-target' | 'from-target',
      relationshipMetadata?: Record<string, unknown>,
      excludedDimensions: string[] = [],
      expandedLabel = `${largeLabelForRoute(stackId)} opened`
    ) => {
      if (rows.length <= GRAPH_STACK_THRESHOLD) return false;
      const subgroup = bestStackSubgroups(rows, excludedDimensions);
      const choices = subgroup.rows.map((group) => ({
        route: `facet-stack/${encodeURIComponent(stackId)}/${encodeURIComponent(subgroup.dimension)}/${encodeURIComponent(group.value)}`,
        label: facetValueDisplay(subgroup.dimension, group.value),
        count: group.rows.length
      }));
      const activeRoute = choices.find((choice) => largeExpandedGraphGroups.includes(choice.route))?.route;
      hierarchyLevels.push({
        dimension: subgroup.dimension,
        label: facetLabel(subgroup.dimension),
        activeRoute,
        choices
      });
      grouping = {
        dimension: subgroup.dimension,
        label: `Grouped by ${facetLabel(subgroup.dimension).toLowerCase()}`,
        expandedLabel
      };
      for (const group of subgroup.rows) {
        const groupLabel = facetValueDisplay(subgroup.dimension, group.value);
        const subgroupId = `facet-stack/${encodeURIComponent(stackId)}/${encodeURIComponent(subgroup.dimension)}/${encodeURIComponent(group.value)}`;
        if (largeExpandedGraphGroups.includes(subgroupId)) {
          const openedNestedGroup = addOpenedStackSubgroups(
            group.rows,
            subgroupId,
            target,
            label,
            direction,
            relationshipMetadata,
            [...excludedDimensions, subgroup.dimension],
            `${groupLabel} opened`
          );
          if (!openedNestedGroup) {
            for (const dataset of group.rows.slice(0, GRAPH_EXPANDED_GROUP_LIMIT)) {
              addDatasetNode(dataset);
              if (direction === 'to-target') addEdge(datasetRoute(dataset), target, label, relationshipMetadata);
              else addEdge(target, datasetRoute(dataset), label, relationshipMetadata);
            }
          }
        } else if (!activeRoute) {
          addNode(subgroupId, 'facet-stack', `${groupLabel} (${group.rows.length})`, group.rows.length, stackId);
          if (direction === 'to-target') addCountedEdge(subgroupId, target, label, group.rows.length, relationshipMetadata);
          else addCountedEdge(target, subgroupId, label, group.rows.length, relationshipMetadata);
        }
      }
      return true;
    };
    const addGroupedDatasetEdges = (
      datasets: LargeDataset[],
      target: string,
      label: string,
      direction: 'to-target' | 'from-target' = 'to-target',
      relationshipMetadata?: Record<string, unknown>
    ) => {
      const rows = datasets;
      if (rows.length <= GRAPH_STACK_THRESHOLD) {
        for (const dataset of rows) {
          addDatasetNode(dataset);
          if (direction === 'to-target') addEdge(datasetRoute(dataset), target, label, relationshipMetadata);
          else addEdge(target, datasetRoute(dataset), label, relationshipMetadata);
        }
        return;
      }
      const recordGroups = groupedRows(rows);
      for (const group of recordGroups) {
        const stackId = recordTypeStackRoute(contextKey, group.recordType);
        const expanded = largeExpandedGraphGroups.includes(stackId);
        noteRecordTypeGrouping(
          expanded && group.rows.length > GRAPH_EXPANDED_GROUP_LIMIT
            ? `${group.recordType} (first ${GRAPH_EXPANDED_GROUP_LIMIT.toLocaleString()} of ${group.rows.length.toLocaleString()})`
            : expanded
              ? group.recordType
              : undefined
        );
        if (expanded) {
          const totalMatches = metadataFacetForRoute(target)
            ? datasetCountForMetadataRoute(target)
            : rows.length;
          hierarchyRoot ||= {
            rootRoute: stackId,
            rootLabel: recordGroups.length === 1 && group.rows.length === rows.length
              ? totalMatches > rows.length
                ? `All loaded matches (${rows.length} of ${totalMatches} ${recordPlural()})`
                : `All matching ${recordPlural()} (${group.rows.length})`
              : `${facetValueDisplay('record_type', group.recordType)} (${group.rows.length})`,
            rootCount: group.rows.length
          };
          if (!addOpenedStackSubgroups(group.rows, stackId, target, label, direction, relationshipMetadata)) {
            for (const dataset of group.rows.slice(0, GRAPH_EXPANDED_GROUP_LIMIT)) {
              addDatasetNode(dataset);
              if (direction === 'to-target') addEdge(datasetRoute(dataset), target, label, relationshipMetadata);
              else addEdge(target, datasetRoute(dataset), label, relationshipMetadata);
            }
          }
        } else {
          const totalMatches = metadataFacetForRoute(target)
            ? datasetCountForMetadataRoute(target)
            : rows.length;
          const stackLabel = recordGroups.length === 1 && group.rows.length === rows.length
            ? totalMatches > rows.length
              ? `All loaded matches (${rows.length} of ${totalMatches} ${recordPlural()})`
              : `All matching ${recordPlural()} (${group.rows.length})`
            : `${facetValueDisplay('record_type', group.recordType)} (${group.rows.length})`;
          addNode(stackId, 'record-type-stack', stackLabel, group.rows.length, center || contextKey);
          if (direction === 'to-target') addCountedEdge(stackId, target, label, group.rows.length, relationshipMetadata);
          else addCountedEdge(target, stackId, label, group.rows.length, relationshipMetadata);
        }
      }
    };
    const addGroupedPublisherEdges = (datasets: LargeDataset[]) => {
      const rows = datasets;
      if (rows.length <= GRAPH_STACK_THRESHOLD) {
        for (const dataset of rows) {
          const datasetId = datasetRoute(dataset);
          addDatasetNode(dataset);
          if (dataset.publisher) addEdge(datasetId, publisherRoute(dataset.publisher), 'published by');
        }
        return;
      }
      const recordGroups = groupedRows(rows);
      for (const group of recordGroups) {
        const stackId = recordTypeStackRoute(contextKey, group.recordType);
        const expanded = largeExpandedGraphGroups.includes(stackId);
        noteRecordTypeGrouping(
          expanded && group.rows.length > GRAPH_EXPANDED_GROUP_LIMIT
            ? `${group.recordType} (first ${GRAPH_EXPANDED_GROUP_LIMIT.toLocaleString()} of ${group.rows.length.toLocaleString()})`
            : expanded
              ? group.recordType
              : undefined
        );
        if (expanded) {
          for (const dataset of group.rows.slice(0, GRAPH_EXPANDED_GROUP_LIMIT)) {
            const datasetId = datasetRoute(dataset);
            addDatasetNode(dataset);
            if (dataset.publisher) addEdge(datasetId, publisherRoute(dataset.publisher), 'published by');
          }
        } else {
          const stackLabel = recordGroups.length === 1 && group.rows.length === rows.length
            ? `All matching ${recordPlural()} (${group.rows.length})`
            : `${facetValueDisplay('record_type', group.recordType)} (${group.rows.length})`;
          addNode(stackId, 'record-type-stack', stackLabel, group.rows.length, contextKey);
          const publishers = new Map<string, number>();
          for (const dataset of group.rows) {
            if (dataset.publisher) publishers.set(dataset.publisher, (publishers.get(dataset.publisher) || 0) + 1);
          }
          for (const [publisher, count] of [...publishers.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 8)) {
            addCountedEdge(stackId, publisherRoute(publisher), 'published by', count);
          }
        }
      }
    };
    const addLoadedRelationshipsForCenter = () => {
      const rows = routeRelationships(center, 120);
      if (rows.length <= 36) {
        for (const relationship of rows) addEdge(
          relationship.source,
          relationship.target,
          relationship.kind,
          relationship
        );
        return;
      }
      const groups = new Map<string, { kind: string; otherKind: string; direction: 'out' | 'in'; rows: LargeRelationship[] }>();
      for (const relationship of rows) {
        const otherRoute = relationship.source === center ? relationship.target : relationship.source;
        const direction = relationship.source === center ? 'out' : 'in';
        const otherKind = routeKind(otherRoute);
        const key = `${relationship.kind}\u0000${otherKind}\u0000${direction}`;
        const group = groups.get(key) || { kind: relationship.kind, otherKind, direction, rows: [] };
        group.rows.push(relationship);
        groups.set(key, group);
      }
      let individualCount = 0;
      for (const group of [...groups.values()].sort((left, right) => right.rows.length - left.rows.length || left.kind.localeCompare(right.kind))) {
        if (group.rows.length > 4 || individualCount + group.rows.length > 28) {
          const stackId = `relationship-stack/${routeSlug(center)}/${routeSlug(group.kind)}/${routeSlug(group.otherKind)}-${group.direction}`;
          const pluralKind = group.otherKind.replaceAll('_', ' ');
          addNode(stackId, 'relationship-stack', `${group.kind} (${group.rows.length} ${pluralKind}${group.rows.length === 1 ? '' : 's'})`, group.rows.length, center);
          if (group.direction === 'out') edges.push({ source: center, target: stackId, label: `${group.kind} x${group.rows.length}` });
          else edges.push({ source: stackId, target: center, label: `${group.kind} x${group.rows.length}` });
        } else {
          for (const relationship of group.rows) addEdge(
            relationship.source,
            relationship.target,
            relationship.kind,
            relationship
          );
          individualCount += group.rows.length;
        }
      }
    };

    if (center) addNode(center);
    if (center && (largeRelationships.length || largeRelationshipsByRoute.has(center))) {
      addLoadedRelationshipsForCenter();
    }

    if (!largeIndex && availableDatasetForRoute(center)) {
      const result = availableDatasetForRoute(center);
      if (result) {
        if (result.publisher) addEdge(center, publisherRoute(result.publisher), 'published by');
        for (const format of (result.formats || []).slice(0, 8)) addEdge(center, metadataEndpointRoute('format', format), 'has format');
        for (const topic of (result.topics || []).slice(0, 8)) addEdge(center, metadataEndpointRoute('topic', topic), 'classified as');
        for (const tag of (result.tags || []).slice(0, 8)) addEdge(center, metadataEndpointRoute('tag', tag), 'tagged');
        const resourceCount = result.resource_count || 0;
        if (resourceCount > 0) {
          const stackId = `resource-stack/${center}`;
          addNode(stackId, 'resource-stack', `${capitalise(resourcePlural())} (${resourceCount})`, resourceCount, center);
          edges.push({ source: center, target: stackId, label: `has ${resourcePlural()}` });
        }
      }
    } else if (largeIndex && indexedDatasetForRoute(center)) {
      const dataset = indexedDatasetForRoute(center);
      if (dataset) {
        if (dataset.publisher) addEdge(center, publisherRoute(dataset.publisher), 'published by');
        for (const format of (dataset.formats || []).slice(0, 8)) addEdge(center, metadataEndpointRoute('format', format), 'has format');
        for (const topic of (dataset.topics || []).slice(0, 8)) addEdge(center, metadataEndpointRoute('topic', topic), 'classified as');
        for (const tag of (dataset.tags || []).slice(0, 8)) addEdge(center, metadataEndpointRoute('tag', tag), 'tagged');
        if (dataset.license_id) addEdge(center, metadataEndpointRoute('license', dataset.license_id), 'licensed as');
        const resources = largeIndex.resourcesByDataset.get(dataset.name) || [];
        if (resources.length > 8 && largeExpandedStackRoute !== center) {
          const stackId = `resource-stack/${center}`;
          addNode(stackId, 'resource-stack', `${capitalise(resourcePlural())} (${resources.length})`, resources.length, center);
          edges.push({ source: center, target: stackId, label: `has ${resourcePlural()}` });
        } else {
          for (const resource of resources.slice(0, 80)) addEdge(center, resourceRoute(resource), `has ${resourceSingular()}`);
        }
      }
    } else if (center) {
      const relationshipLabel = metadataMembershipLabel(center);
      const membershipMetadata = {
        authority: {
          class: 'derived',
          label: 'Derived from the static facet index',
          source: 'Snapshot-bound filter posting'
        },
        derivation: 'static-facet-membership',
        confidence: 'snapshot-exact'
      };
      const matchedRecords = metadataRoutePreviewRecords(center, Number.MAX_SAFE_INTEGER);
      addGroupedDatasetEdges(
        matchedRecords as LargeDataset[],
        center,
        relationshipLabel,
        'to-target',
        membershipMetadata
      );
    } else if (!center && largeIndex) {
      addGroupedPublisherEdges(largeVisibleDatasets);
    } else if (!center && !largeIndex) {
      for (const result of largeResults.slice(0, 42)) {
        const datasetId = datasetRoute(result);
        addNode(datasetId, 'dataset');
        if (result.publisher) addEdge(datasetId, publisherRoute(result.publisher), 'published by');
      }
    }

    if (!edges.length && largeIndex) {
      addGroupedPublisherEdges(largeVisibleDatasets);
    }

    return {
      center,
      nodes: [...nodeMap.values()].slice(0, 110),
      relationships: edges.slice(0, 120),
      grouping,
      hierarchy: hierarchyRoot
        ? { ...hierarchyRoot, levels: hierarchyLevels }
        : undefined
    };
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
    positions.set(root.id, { x: graphCanvasWidth * 0.49, y: GRAPH_HEIGHT * 0.53 });

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

    placeGrid(positions, groups.format.slice(0, 10), graphCanvasWidth * 0.17, GRAPH_HEIGHT * 0.12, 5, 102, 52);
    placeGrid(positions, groups.topic.slice(0, 10), graphCanvasWidth * 0.07, GRAPH_HEIGHT * 0.16, 1, 96, 44);
    placeGrid(positions, groups.tag.slice(0, 6), graphCanvasWidth * 0.08, GRAPH_HEIGHT * 0.58, 1, 88, 44);
    placeGrid(positions, groups.update_year.slice(0, 8), graphCanvasWidth * 0.27, GRAPH_HEIGHT * 0.35, 2, 86, 54);
    placeGrid(positions, groups.license.slice(0, 6), graphCanvasWidth * 0.35, GRAPH_HEIGHT * 0.79, 6, 76, 48);
    placeGrid(positions, groups.host.slice(0, 8), graphCanvasWidth * 0.76, GRAPH_HEIGHT * 0.12, 1, 92, 48);
    placeGrid(positions, groups.publisher_family.slice(0, 6), graphCanvasWidth * 0.76, GRAPH_HEIGHT * 0.53, 1, 92, 50);
    placeGrid(positions, groups.other, graphCanvasWidth * 0.55, GRAPH_HEIGHT * 0.25, 2, 94, 54);
    return positions;
  }

  function largeGraphPositions(
    model: ReturnType<typeof largeGraphModel>,
    relationshipGroups: GraphRelationshipGroup[] = []
  ) {
    if (graphRelationshipLayoutActive(model, relationshipGroups)) {
      return planRelationshipGroupPositions(
        model.center,
        relationshipGroups,
        graphCanvasWidth,
        GRAPH_HEIGHT
      ).positions;
    }
    if (!model.center && model.nodes.some((node) => node.id === 'corpus/overview')) return largeOverviewGraphPositions(model);
    const center = model.center && model.nodes.some((node) => node.id === model.center) ? model.center : model.nodes[0]?.id;
    const positions = new Map<string, GraphPoint>();
    if (model.center && center) {
      const centerType = routeKind(center);
      const cx = graphCanvasWidth * 0.5;
      const cy = GRAPH_HEIGHT * 0.54;
      positions.set(center, { x: cx, y: cy });
      const groups: Record<string, LargeGraphNode[]> = {
        publisher: [],
        dataset: [],
        resource: [],
        'resource-stack': [],
        'relationship-stack': [],
        'record-type-stack': [],
        'facet-stack': [],
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
        placeGrid(positions, groups['facet-stack'], graphCanvasWidth * 0.11, GRAPH_HEIGHT * 0.16, 2, 116, 70);
        placeGrid(positions, [...groups['record-type-stack'], ...groups.dataset, ...groups.resource, ...groups['relationship-stack']], graphCanvasWidth * 0.34, GRAPH_HEIGHT * 0.16, 6, 78, 58);
        placeArc(positions, [...groups.format, ...groups.license, ...groups.topic, ...groups.tag], cx, cy, GRAPH_HEIGHT * 0.32, -2.3, -1.1);
      } else {
        placeArc(positions, groups.publisher, cx, cy, GRAPH_HEIGHT * 0.31, -0.22, 0.25);
        placeGrid(positions, [...groups.resource, ...groups['resource-stack']], graphCanvasWidth * 0.1, GRAPH_HEIGHT * 0.16, 4, 86, 66);
        placeGrid(positions, groups['relationship-stack'], graphCanvasWidth * 0.69, GRAPH_HEIGHT * 0.15, 2, 98, 68);
        placeGrid(positions, groups['record-type-stack'], graphCanvasWidth * 0.61, GRAPH_HEIGHT * 0.13, 2, 112, 72);
        placeGrid(positions, groups['facet-stack'], graphCanvasWidth * 0.1, GRAPH_HEIGHT * 0.18, 2, 116, 70);
        placeArc(positions, [...groups.format, ...groups.license], cx, cy, GRAPH_HEIGHT * 0.31, -2.4, -1.32);
        placeArc(positions, groups.topic, cx, cy, GRAPH_HEIGHT * 0.34, 2.05, 2.75);
        placeArc(positions, groups.tag, cx, cy, GRAPH_HEIGHT * 0.37, 2.85, 3.82);
        placeArc(positions, [...groups.host, ...groups.resource_type, ...groups.dataset, ...groups.route], cx, cy, GRAPH_HEIGHT * 0.28, -1.08, -0.55);
      }
      return positions;
    }
    if (center) positions.set(center, { x: graphCanvasWidth / 2, y: GRAPH_HEIGHT / 2 });
    const others = model.nodes.filter((node) => node.id !== center);
    const publishers = model.nodes.filter((node) => node.type === 'publisher').sort((left, right) => left.label.localeCompare(right.label));
    const recordTypeStacks = model.nodes.filter((node) => node.type === 'record-type-stack').sort((left, right) => (right.count || 0) - (left.count || 0) || left.label.localeCompare(right.label));
    const datasets = model.nodes.filter((node) => node.type === 'dataset').sort((left, right) => left.label.localeCompare(right.label));
    const other = others.filter((node) => node.type !== 'publisher' && node.type !== 'dataset' && node.type !== 'record-type-stack');
    const columns = Math.max(1, Math.ceil(Math.sqrt(datasets.length + recordTypeStacks.length)));
    const cellW = Math.min(92, (graphCanvasWidth * 0.58) / columns);
    const cellH = 58;
    const rows = Math.ceil((datasets.length + recordTypeStacks.length) / columns);
    placeGrid(positions, [...recordTypeStacks, ...datasets], graphCanvasWidth * 0.18, GRAPH_HEIGHT * 0.5 - ((rows - 1) * cellH) / 2, columns, cellW, cellH);
    placeArc(positions, publishers, graphCanvasWidth * 0.78, GRAPH_HEIGHT * 0.5, GRAPH_HEIGHT * 0.28, -1.0, 1.0);
    placeArc(positions, other, graphCanvasWidth * 0.5, GRAPH_HEIGHT * 0.5, GRAPH_HEIGHT * 0.36, 1.35, 4.92);
    return positions;
  }

  function largeTypeColor(type: string) {
    if (type === 'dataset') return '#0b6bcb';
    if (type === 'resource') return '#5694ca';
    if (type === 'resource-stack') return '#1d70b8';
    if (type === 'relationship-stack') return '#1d70b8';
    if (type === 'record-type-stack') return '#12436d';
    if (type === 'facet-stack') return '#2b8cbe';
    if (type === 'publisher') return '#00703c';
    if (type === 'format') return '#4c2c92';
    if (type === 'topic') return '#007a7a';
    if (type === 'tag') return '#d4351c';
    if (type === 'license') return '#b58800';
    if (type === 'host' || type === 'resource_type') return '#5d6b78';
    return '#607080';
  }

  function graphLegendItems(nodes: LargeGraphNode[]) {
    const presentTypes = new Set(nodes.map((node) => node.type));
    const items = [
      ['dataset', recordSingular()],
      ['publisher', publisherSingular()],
      ['resource', resourceSingular()],
      ['relationship-stack', 'link stack'],
      ['record-type-stack', 'record type stack'],
      ['facet-stack', 'opened stack group'],
      ['format', formatPlural()],
      ['topic', 'topic'],
      ['license', 'licence'],
      ['tag', 'tag'],
      ['host', 'host/other']
    ] as Array<[string, string]>;
    const knownTypes = new Set(items.map(([type]) => type));
    const unknown = [...presentTypes]
      .filter((type) => !knownTypes.has(type) && type !== 'resource_type')
      .sort()
      .map((type) => [type, type.replaceAll('_', ' ')] as [string, string]);
    return [
      ...items.filter(([type]) => (
        presentTypes.has(type)
        || (type === 'host' && (presentTypes.has('host') || presentTypes.has('resource_type')))
      )),
      ...unknown
    ];
  }

  function graphLegendTypeMatches(nodeType: string, legendType: string): boolean {
    return legendType === 'host'
      ? nodeType === 'host' || nodeType === 'resource_type'
      : nodeType === legendType;
  }

  function graphNodeTypeEnabled(type: string): boolean {
    return !graphHiddenNodeTypes.includes(type);
  }

  function graphNodeKeyNodes(fullModel: LargeGraphModel, model: LargeGraphModel): LargeGraphNode[] {
    const visibleIds = new Set(model.nodes.map((node) => node.id));
    return fullModel.nodes.filter((node) => (
      visibleIds.has(node.id)
      || graphHiddenNodeTypes.some((type) => graphLegendTypeMatches(node.type, type))
    ));
  }

  function graphFocusNodeType(model: LargeGraphModel): string {
    return model.nodes.find((node) => node.id === model.center)?.type || '';
  }

  function graphNodeTypeCanHide(type: string, model: LargeGraphModel): boolean {
    const focusType = graphFocusNodeType(model);
    return !focusType || !graphLegendTypeMatches(focusType, type);
  }

  function toggleGraphNodeType(type: string, model: LargeGraphModel) {
    if (!graphNodeTypeCanHide(type, model)) {
      graphHiddenNodeTypes = graphHiddenNodeTypes.filter((candidate) => candidate !== type);
      syncExplorerUrl(true);
      return;
    }
    graphHiddenNodeTypes = graphNodeTypeEnabled(type)
      ? [...graphHiddenNodeTypes, type]
      : graphHiddenNodeTypes.filter((candidate) => candidate !== type);
    graphLabelPhase = 0;
    syncExplorerUrl(true);
  }

  function setGraphKeyMode(mode: GraphKeyMode) {
    graphKeyMode = mode;
    syncExplorerUrl(true);
  }

  function toggleGraphLabels() {
    graphLabelsPaused = !graphLabelsPaused;
    syncExplorerUrl(true);
  }

  function graphRelationshipGroups(model: LargeGraphModel): GraphRelationshipGroup[] {
    const groups = groupGraphRelationships(
      model.relationships.map((edge) => ({
        id: graphEdgeKey(edge),
        source: edge.source,
        target: edge.target,
        label: edge.label,
        predicate: edge.predicate,
        assertionStatus: edge.assertionStatus,
        assertionScope: edge.assertionScope,
        authorityClass: edge.authorityClass
      })),
      model.center
    );
    const labelById = new Map(model.nodes.map((node) => [node.id, node.label]));
    const sorted = groups.map((group) => ({
      ...group,
      nodeIds: [...group.nodeIds].sort((left, right) => (
        (labelById.get(left) || left).localeCompare(labelById.get(right) || right)
      ))
    }));
    return orderGraphRelationshipGroups(sorted, graphRelationshipOrder);
  }

  function graphRelationshipLayoutActive(
    model: LargeGraphModel,
    groups: GraphRelationshipGroup[]
  ): boolean {
    return shouldUseRelationshipLayout(
      model.center,
      groups.length,
      model.relationships.length,
      graphLayoutMode === 'relationships'
    );
  }

  function graphDocumentAnchoredPlan(
    plan: ReturnType<typeof planRelationshipGroupPositions>,
    model: LargeGraphModel
  ): ReturnType<typeof planRelationshipGroupPositions> {
    const positions = new Map(plan.positions);
    const nodeSlots = new Map(plan.nodeSlots);
    const anchors = [
      { type: 'publisher', x: graphCanvasWidth * 0.27 },
      { type: 'license', x: graphCanvasWidth * 0.73 }
    ];
    for (const anchor of anchors) {
      const nodes = model.nodes.filter((node) => node.type === anchor.type && node.id !== model.center);
      nodes.forEach((node, index) => {
        positions.set(node.id, {
          x: anchor.x + (index - (nodes.length - 1) / 2) * Math.min(92, graphCanvasWidth * 0.09),
          y: GRAPH_HEIGHT * 0.91
        });
        nodeSlots.set(node.id, { side: 'bottom', lane: 0 });
      });
    }
    return { ...plan, positions, nodeSlots };
  }

  function graphFocusTitleLines(label: string, maxLineLength = 72): string[] {
    const words = stripHtml(label).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (!words.length) return [];
    const lines: string[] = [];
    for (const word of words) {
      const current = lines[lines.length - 1] || '';
      if (!current || `${current} ${word}`.length > maxLineLength) lines.push(word);
      else lines[lines.length - 1] = `${current} ${word}`;
    }
    return lines.length <= 2 ? lines : [lines[0], `${lines.slice(1).join(' ').slice(0, maxLineLength - 1)}…`];
  }

  function relationshipFilteredLargeGraphModel(
    model: LargeGraphModel,
    groups: GraphRelationshipGroup[]
  ): LargeGraphModel {
    if (!model.center) return model;
    const groupByEdge = new Map(
      groups.flatMap((group) => group.edgeIds.map((edgeId) => [edgeId, group.key] as const))
    );
    const hiddenGroups = new Set(graphHiddenRelationshipGroups);
    const hiddenEdges = new Set(graphHiddenRelationshipEdges);
    const hiddenAuthorities = new Set(graphHiddenRelationshipAuthorities);
    const relationships = model.relationships.filter((edge) => {
      const id = graphEdgeKey(edge);
      return (
        !hiddenEdges.has(id)
        && !hiddenGroups.has(groupByEdge.get(id) || '')
        && !hiddenAuthorities.has(edge.authorityClass || 'unclassified')
      );
    });
    const visibleNodeIds = new Set([
      model.center,
      ...relationships.flatMap((edge) => [edge.source, edge.target])
    ]);
    return {
      ...model,
      nodes: model.nodes.filter((node) => visibleNodeIds.has(node.id)),
      relationships
    };
  }

  function nodeTypeFilteredLargeGraphModel(model: LargeGraphModel): LargeGraphModel {
    if (!model.center || !graphHiddenNodeTypes.length) return model;
    const hiddenNodeIds = new Set(model.nodes
      .filter((node) => (
        node.id !== model.center
        && graphHiddenNodeTypes.some((type) => graphLegendTypeMatches(node.type, type))
      ))
      .map((node) => node.id));
    return {
      ...model,
      nodes: model.nodes.filter((node) => !hiddenNodeIds.has(node.id)),
      relationships: model.relationships.filter((edge) => (
        !hiddenNodeIds.has(edge.source) && !hiddenNodeIds.has(edge.target)
      ))
    };
  }

  function graphGroupDirectionLabel(direction: GraphRelationshipGroup['direction']): string {
    if (direction === 'outgoing') return 'from focus';
    if (direction === 'incoming') return 'to focus';
    return 'between context nodes';
  }

  function graphGroupControlLabel(group: GraphRelationshipGroup): string {
    return `${group.label}, ${graphGroupDirectionLabel(group.direction)}`;
  }

  function graphRelationshipSlotLabel(slot: GraphRelationshipSlot): string {
    const side = slot.side === 'top' || slot.side === 'bottom'
      ? `${capitalise(slot.side)} steps`
      : `${capitalise(slot.side)} list`;
    return slot.lane ? `${side} ${slot.lane + 1}` : side;
  }

  function graphGroupEnabled(key: string): boolean {
    return !graphHiddenRelationshipGroups.includes(key);
  }

  function graphEdgeEnabled(id: string): boolean {
    return !graphHiddenRelationshipEdges.includes(id);
  }

  function graphRelationshipAuthorityLabel(authority: RelationshipAuthorityClass): string {
    return {
      official: 'Official',
      derived: 'Derived',
      'model-assisted': 'Model-assisted',
      synthetic: 'Synthetic fixture',
      unclassified: 'Unclassified'
    }[authority];
  }

  function graphRelationshipAuthorityEnabled(authority: RelationshipAuthorityClass): boolean {
    return !graphHiddenRelationshipAuthorities.includes(authority);
  }

  function graphRelationshipAuthorities(model: LargeGraphModel): RelationshipAuthorityClass[] {
    const present = new Set(
      model.relationships.map((relationship) => relationship.authorityClass || 'unclassified')
    );
    return RELATIONSHIP_AUTHORITY_CLASSES.filter((authority) => present.has(authority));
  }

  function graphRelationshipAuthorityCount(
    model: LargeGraphModel,
    authority: RelationshipAuthorityClass
  ): number {
    return model.relationships.filter(
      (relationship) => (relationship.authorityClass || 'unclassified') === authority
    ).length;
  }

  function toggleGraphRelationshipAuthority(authority: RelationshipAuthorityClass) {
    graphHiddenRelationshipAuthorities = graphRelationshipAuthorityEnabled(authority)
      ? [...graphHiddenRelationshipAuthorities, authority]
      : graphHiddenRelationshipAuthorities.filter((candidate) => candidate !== authority);
    graphLabelPhase = 0;
    syncExplorerUrl(true);
  }

  function setGraphLayoutMode(mode: GraphLayoutMode) {
    graphLayoutMode = mode;
    resetGraphView();
    syncExplorerUrl(true);
  }

  function toggleGraphRelationshipGroup(key: string) {
    graphHiddenRelationshipGroups = graphGroupEnabled(key)
      ? [...graphHiddenRelationshipGroups, key]
      : graphHiddenRelationshipGroups.filter((candidate) => candidate !== key);
    graphLabelPhase = 0;
    syncExplorerUrl();
  }

  function toggleGraphRelationshipEdge(id: string) {
    graphHiddenRelationshipEdges = graphEdgeEnabled(id)
      ? [...graphHiddenRelationshipEdges, id]
      : graphHiddenRelationshipEdges.filter((candidate) => candidate !== id);
    graphLabelPhase = 0;
    syncExplorerUrl();
  }

  function toggleGraphRelationshipMembers(key: string) {
    graphExpandedRelationshipGroups = graphExpandedRelationshipGroups.includes(key)
      ? graphExpandedRelationshipGroups.filter((candidate) => candidate !== key)
      : [...graphExpandedRelationshipGroups, key];
  }

  function resetGraphRelationshipControls() {
    graphLayoutMode = 'auto';
    graphRelationshipOrder = [];
    graphHiddenRelationshipGroups = [];
    graphHiddenRelationshipEdges = [];
    graphHiddenRelationshipAuthorities = [];
    graphExpandedRelationshipGroups = [];
    draggingGraphRelationshipGroup = '';
    graphRelationshipDropTarget = '';
    graphLabelPhase = 0;
    resetGraphView();
    syncExplorerUrl();
  }

  function orderedGraphGroupKeys(groups: GraphRelationshipGroup[]): string[] {
    return orderGraphRelationshipGroups(groups, graphRelationshipOrder).map((group) => group.key);
  }

  function moveGraphRelationshipGroup(
    groups: GraphRelationshipGroup[],
    key: string,
    offset: -1 | 1
  ) {
    const keys = orderedGraphGroupKeys(groups);
    const index = keys.indexOf(key);
    const target = Math.max(0, Math.min(keys.length - 1, index + offset));
    if (index < 0 || target === index) return;
    keys.splice(index, 1);
    keys.splice(target, 0, key);
    graphRelationshipOrder = keys;
    graphLabelPhase = 0;
    syncExplorerUrl();
  }

  function startGraphRelationshipDrag(key: string, event: DragEvent) {
    draggingGraphRelationshipGroup = key;
    graphRelationshipDropTarget = '';
    event.dataTransfer?.setData('text/plain', key);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  function dragGraphRelationshipOver(key: string, event: DragEvent) {
    if (!draggingGraphRelationshipGroup || draggingGraphRelationshipGroup === key) return;
    event.preventDefault();
    graphRelationshipDropTarget = key;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  function dropGraphRelationshipBefore(
    groups: GraphRelationshipGroup[],
    targetKey: string,
    event: DragEvent
  ) {
    event.preventDefault();
    const sourceKey = draggingGraphRelationshipGroup || event.dataTransfer?.getData('text/plain') || '';
    const keys = orderedGraphGroupKeys(groups).filter((key) => key !== sourceKey);
    const targetIndex = keys.indexOf(targetKey);
    if (sourceKey && targetIndex >= 0) {
      keys.splice(targetIndex, 0, sourceKey);
      graphRelationshipOrder = keys;
      graphLabelPhase = 0;
      syncExplorerUrl();
    }
    draggingGraphRelationshipGroup = '';
    graphRelationshipDropTarget = '';
  }

  function finishGraphRelationshipDrag() {
    draggingGraphRelationshipGroup = '';
    graphRelationshipDropTarget = '';
  }

  function graphGroupEdges(group: GraphRelationshipGroup, model: LargeGraphModel): LargeGraphEdge[] {
    const ids = new Set(group.edgeIds);
    return model.relationships
      .filter((edge) => ids.has(graphEdgeKey(edge)))
      .sort((left, right) => (
        graphGroupMemberLabel(left, model.center).localeCompare(graphGroupMemberLabel(right, model.center))
      ));
  }

  function graphVisibleGroupSlot(
    groups: GraphRelationshipGroup[],
    model: LargeGraphModel,
    key: string
  ): GraphRelationshipSlot | null {
    const visible = groups.filter((group) => (
      graphGroupEnabled(group.key)
      && graphGroupEdges(group, model).some((edge) => graphEdgeEnabled(graphEdgeKey(edge)))
    ));
    const index = visible.findIndex((group) => group.key === key);
    return index >= 0 ? graphRelationshipGroupSlot(index) : null;
  }

  function graphGroupMemberLabel(edge: LargeGraphEdge, center: string): string {
    if (edge.source === center) return largeLabelForRoute(edge.target);
    if (edge.target === center) return largeLabelForRoute(edge.source);
    return `${largeLabelForRoute(edge.source)} → ${largeLabelForRoute(edge.target)}`;
  }

  function largeGraphEdgeWeightPlan(edges: LargeGraphEdge[]) {
    return planGraphEdgeWeights(edges.map((edge) => ({
      id: graphEdgeKey(edge),
      metrics: {
        'relationship count': edge.count && edge.count > 0 ? edge.count : undefined,
        ...(edge.weightMetric && edge.weightValue !== undefined
          ? { [edge.weightMetric]: edge.weightValue }
          : {})
      }
    })));
  }

  function graphEdgeStrokeWidth(
    edge: LargeGraphEdge,
    plan: ReturnType<typeof largeGraphEdgeWeightPlan>,
    highlighted: boolean
  ): number {
    const base = plan.widths.get(graphEdgeKey(edge)) || 1.2;
    if (largeHighlightedEdge === graphEdgeKey(edge)) return Math.max(5, base + 2);
    if (highlighted) return Math.max(3, base + 1.2);
    return base;
  }

  function graphWeightValue(value: number): string {
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function shortLabel(value = '', max = 42): string {
    const text = stripHtml(String(value)).replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
  }

  function graphNodeBox(node: LargeGraphNode, point?: GraphPoint): GraphBox | null {
    if (!point) return null;
    if (isGraphStackNodeType(node.type)) return { x: point.x - 34, y: point.y - 26, w: 68, h: 52 };
    if (node.type === 'resource') return { x: point.x - 30, y: point.y - 24, w: 60, h: 48 };
    if (node.type === 'dataset') return { x: point.x - 31, y: point.y - 25, w: 62, h: 50 };
    return { x: point.x - 24, y: point.y - 24, w: 48, h: 48 };
  }

  function graphNodeEdgePad(node: LargeGraphNode | undefined): number {
    if (!node) return 28;
    if (isGraphStackNodeType(node.type)) return 38;
    if (node.type === 'dataset') return 34;
    if (node.type === 'resource') return 32;
    return 24;
  }

  function graphLabelBox(text: string, x: number, y: number, anchor: GraphLabel['anchor']): GraphBox {
    // SVG text metrics vary by browser and zoom. Deliberately overestimate the
    // collision box so a layer that is non-overlapping in the planner remains
    // non-overlapping when rendered.
    const w = Math.min(260, text.length * 7.4 + 20);
    const h = 22;
    const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
    return { x: left, y: y - 17, w, h };
  }

  function graphLabelInsideBounds(label: GraphLabel): boolean {
    return label.box.x >= 6 && label.box.y >= 6 && label.box.x + label.box.w <= graphCanvasWidth - 6 && label.box.y + label.box.h <= GRAPH_HEIGHT - 6;
  }

  function graphLabelCandidates(
    node: LargeGraphNode,
    point: GraphPoint,
    relationshipSide: GraphRelationshipSide | null = null
  ): GraphLabel[] {
    const text = shortLabel(node.label, node.type === 'publisher' ? 44 : 40);
    const gap = node.type === 'resource' || node.type === 'dataset' || isGraphStackNodeType(node.type) ? 36 : 30;
    const right = { x: point.x + gap, y: point.y + 5, anchor: 'start' as const };
    const left = { x: point.x - gap, y: point.y + 5, anchor: 'end' as const };
    const lateral = point.x > graphCanvasWidth * 0.5 ? [right, left] : [left, right];
    const above = { x: point.x, y: point.y - gap, anchor: 'middle' as const };
    const below = { x: point.x, y: point.y + gap + 12, anchor: 'middle' as const };
    const aboveLeft = { x: point.x - gap, y: point.y - gap, anchor: 'end' as const };
    const aboveRight = { x: point.x + gap, y: point.y - gap, anchor: 'start' as const };
    const belowLeft = { x: point.x - gap, y: point.y + gap + 12, anchor: 'end' as const };
    const belowRight = { x: point.x + gap, y: point.y + gap + 12, anchor: 'start' as const };
    const candidates = relationshipSide === 'left'
      ? [left, aboveLeft, belowLeft, right]
      : relationshipSide === 'right'
        ? [right, aboveRight, belowRight, left]
        : relationshipSide === 'top'
          ? [...lateral, above, aboveLeft, aboveRight]
          : relationshipSide === 'bottom'
            ? [...lateral, below, belowLeft, belowRight]
            : [...lateral, above, below];
    const labels = candidates.map((candidate) => ({
      ...candidate,
      text,
      box: graphLabelBox(text, candidate.x, candidate.y, candidate.anchor)
    }));
    const bounded = labels.filter(graphLabelInsideBounds);
    return bounded.length ? bounded : labels;
  }

  function graphLabelPriority(
    node: LargeGraphNode,
    alwaysId: string,
    relationshipSide: GraphRelationshipSide | null = null
  ): number {
    if (node.id === alwaysId) return 0;
    if (relationshipSide === 'left') return 0.5;
    if (node.type === 'publisher') return 1;
    if (isGraphStackNodeType(node.type)) return 2;
    if (node.type === 'dataset') return 3;
    if (['format', 'topic', 'license', 'tag', 'host', 'resource_type'].includes(node.type)) return 3;
    return 4;
  }

  function graphNodeLabelKey(id: string): string {
    return `node:${id}`;
  }

  function graphEdgeLabelKey(id: string): string {
    return `edge:${id}`;
  }

  function graphEdgeLabelCandidates(spec: GraphEdgeLabelSpec): GraphLabel[] {
    const dx = spec.target.x - spec.source.x;
    const dy = spec.target.y - spec.source.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const labels = [0, 18, -18, 36, -36, 54, -54, 72, -72].map((offset) => {
      const x = spec.geometry.labelX + nx * offset;
      const y = spec.geometry.labelY + ny * offset;
      return {
        x,
        y,
        anchor: 'middle' as const,
        text: spec.text,
        box: graphLabelBox(spec.text, x, y, 'middle')
      };
    });
    const bounded = labels.filter(graphLabelInsideBounds);
    return bounded.length ? bounded : labels;
  }

  function graphPresentationLayers(
    nodes: LargeGraphNode[],
    positions: Map<string, GraphPoint>,
    edgeLabels: GraphEdgeLabelSpec[],
    alwaysNodeId: string,
    relationshipSlots: Map<string, GraphRelationshipSlot> = new Map(),
    persistentLayout = false
  ) {
    const obstacles = nodes.flatMap((node) => {
      const box = graphNodeBox(node, positions.get(node.id));
      return box ? [{ id: graphNodeLabelKey(node.id), box }] : [];
    });
    const preferredSideLabels = new Map(nodes.flatMap((node) => {
      const point = positions.get(node.id);
      const side = relationshipSlots.get(node.id)?.side;
      if (!point || (side !== 'left' && side !== 'right')) return [];
      const preferred = graphLabelCandidates(node, point, side).find((candidate) => (
        candidate.anchor === (side === 'left' ? 'end' : 'start')
        && Math.abs(candidate.y - (point.y + 5)) <= 1
      ));
      return preferred ? [[graphNodeLabelKey(node.id), preferred] as const] : [];
    }));
    const preferredSideEntries = [...preferredSideLabels.entries()];
    const sideColumnsFit = preferredSideEntries.length <= 24
      && preferredSideEntries.every(([id, label], index) => (
        !obstacles.some((obstacle) => obstacle.id !== id && boxesOverlap(label.box, obstacle.box))
        && !preferredSideEntries.slice(index + 1).some(([, other]) => boxesOverlap(label.box, other.box))
      ));
    const persistentSideIds = sideColumnsFit
      ? new Set(preferredSideLabels.keys())
      : new Set<string>();
    const nodeItems = nodes.flatMap((node) => {
      const point = positions.get(node.id);
      const relationshipSide = relationshipSlots.get(node.id)?.side || null;
      const id = graphNodeLabelKey(node.id);
      const preferredSideLabel = persistentSideIds.has(id) ? preferredSideLabels.get(id) : null;
      const alwaysVisible = persistentLayout || node.id === alwaysNodeId || Boolean(preferredSideLabel);
      return point
        ? [{
            id,
            priority: graphLabelPriority(node, alwaysNodeId, relationshipSide),
            always: alwaysVisible,
            choices: preferredSideLabel
              ? [preferredSideLabel]
              : graphLabelCandidates(node, point, relationshipSide)
          }]
        : [];
    });
    const eligibleEdgeLabels = edgeLabels.length <= 36
      ? edgeLabels.filter((edge) => edge.showLabel || edge.selected)
      : edgeLabels.filter((edge) => edge.selected);
    const edgeItems = eligibleEdgeLabels.map((edge) => ({
      id: graphEdgeLabelKey(edge.id),
      priority: edge.selected ? 1 : 5,
      // Controlled layouts reserve stable space for every node label. Edge
      // labels may still cycle when no collision-free shared layer exists.
      always: Boolean(edge.selected),
      choices: graphEdgeLabelCandidates(edge)
    }));
    return planGraphLabelLayers([...nodeItems, ...edgeItems], obstacles, graphLabelPhase);
  }

  function graphEdgeKey(edge: LargeGraphEdge): string {
    return graphEdgeStateKey(edge);
  }

  function largeGraphEdgePlans(edges: LargeGraphEdge[]) {
    return planDirectedEdges(edges.map((edge) => ({
      id: graphEdgeKey(edge),
      source: edge.source,
      target: edge.target,
      label: edge.label
    })));
  }

  function largeGraphEdgeLabelSpecs(
    model: LargeGraphModel,
    positions: Map<string, GraphPoint>,
    edgePlans: ReturnType<typeof largeGraphEdgePlans>,
    relationshipGroups: GraphRelationshipGroup[] = []
  ): GraphEdgeLabelSpec[] {
    const nodeMap = new Map(model.nodes.map((node) => [node.id, node]));
    const representativeEdgeIds = new Set(relationshipGroups.flatMap((group) => {
      const middle = group.edgeIds[Math.floor(group.edgeIds.length / 2)];
      return middle ? [middle] : [];
    }));
    return model.relationships.flatMap((relationship) => {
      const source = positions.get(relationship.source);
      const target = positions.get(relationship.target);
      if (!source || !target) return [];
      const id = graphEdgeKey(relationship);
      const edgePlan = edgePlans.get(id);
      return [{
        id,
        text: shortLabel(`${relationship.label}${(relationship.count || 1) > 1 ? ` x${relationship.count}` : ''}`, 32),
        source,
        target,
        geometry: quadraticEdgeGeometry(
          source,
          target,
          graphNodeEdgePad(nodeMap.get(relationship.source)),
          graphNodeEdgePad(nodeMap.get(relationship.target)),
          edgePlan?.bend || 0,
          edgePlan?.labelT || 0.5
        ),
        showLabel: relationshipGroups.length
          ? representativeEdgeIds.has(id)
          : (edgePlan?.showLabel ?? true),
        selected: largeHighlightedEdge === id
      }];
    });
  }

  function highlightedGraphRelationshipGroup(model: LargeGraphModel): GraphRelationshipGroup | null {
    if (!graphHighlightedRelationshipGroup) return null;
    return graphRelationshipGroups(model)
      .find((group) => group.key === graphHighlightedRelationshipGroup) || null;
  }

  function highlightedGraphRelationshipEdges(model: LargeGraphModel): LargeGraphEdge[] {
    const group = highlightedGraphRelationshipGroup(model);
    if (group) return graphGroupEdges(group, model);
    if (largeHighlightedEdge) {
      const selected = model.relationships.find((edge) => graphEdgeKey(edge) === largeHighlightedEdge);
      return selected ? [selected] : [];
    }
    return [];
  }

  function graphRelationshipNodeRole(nodeId: string, model: LargeGraphModel): 'source' | 'target' | 'both' | '' {
    let sourceNode = false;
    let targetNode = false;
    for (const edge of highlightedGraphRelationshipEdges(model)) {
      if (edge.source === nodeId) sourceNode = true;
      if (edge.target === nodeId) targetNode = true;
    }
    if (sourceNode && targetNode) return 'both';
    if (sourceNode) return 'source';
    if (targetNode) return 'target';
    return '';
  }

  function shouldHighlightGraphEdge(edge: LargeGraphEdge, model: ReturnType<typeof largeGraphModel>): boolean {
    if (largeHighlightedEdge) return graphEdgeKey(edge) === largeHighlightedEdge;
    const highlightedGroup = highlightedGraphRelationshipGroup(model);
    if (highlightedGroup) return highlightedGroup.edgeIds.includes(graphEdgeKey(edge));
    if (!largeHighlightedRoute) return false;
    const touchesHighlighted = edge.source === largeHighlightedRoute || edge.target === largeHighlightedRoute;
    if (!touchesHighlighted) return false;
    if (model.center) return edge.source === model.center || edge.target === model.center;
    const highlightedFanOut = model.relationships.filter((item) => item.source === largeHighlightedRoute || item.target === largeHighlightedRoute).length;
    return highlightedFanOut <= 12;
  }

  function inspectLargeEdge(edge: LargeGraphEdge) {
    graphHighlightedRelationshipGroup = '';
    largeInspectedEdge = edge;
    largeInspectedRoute = '';
    largeHighlightedRoute = '';
    largeHighlightedEdge = graphEdgeKey(edge);
    clearLargeApiPanel();
    rightCollapsed = false;
    syncExplorerUrl(true);
  }

  function clearGraphRelationshipHighlight(push = true) {
    graphHighlightedRelationshipGroup = '';
    largeInspectedEdge = null;
    largeHighlightedEdge = '';
    relationshipDetailTab = 'relationship';
    if (push) syncExplorerUrl(true);
  }

  function restoreGraphRelationshipInspection() {
    const model = largeGraphModel();
    const group = graphHighlightedRelationshipGroup
      ? graphRelationshipGroups(model).find((candidate) => candidate.key === graphHighlightedRelationshipGroup)
      : undefined;
    const first = group
      ? graphGroupEdges(group, model)[0]
      : largeHighlightedEdge
        ? model.relationships.find((edge) => graphEdgeKey(edge) === largeHighlightedEdge)
        : undefined;
    if (!first) return;
    largeInspectedEdge = first;
    largeInspectedRoute = '';
    largeHighlightedRoute = '';
    if (group) largeHighlightedEdge = '';
    relationshipDetailTab = 'relationship';
    rightCollapsed = false;
  }

  function inspectLargeRelationshipGroup(group: GraphRelationshipGroup, model: LargeGraphModel, event?: MouseEvent) {
    if (
      graphHighlightedRelationshipGroup === group.key
      || event?.ctrlKey
      || event?.metaKey
    ) {
      clearGraphRelationshipHighlight();
      return;
    }
    const edges = graphGroupEdges(group, model);
    const first = edges[0];
    if (!first) return;
    graphHighlightedRelationshipGroup = group.key;
    graphKeyMode = 'relationships';
    largeInspectedEdge = first;
    largeInspectedRoute = '';
    largeHighlightedRoute = '';
    largeHighlightedEdge = '';
    relationshipDetailTab = 'relationship';
    clearLargeApiPanel();
    rightCollapsed = false;
    syncExplorerUrl(true);
  }

  function selectInspectedRelationshipEdge(edge: LargeGraphEdge) {
    largeInspectedEdge = edge;
    relationshipDetailTab = 'relationship';
  }

  function inspectedRelationshipEdges(): LargeGraphEdge[] {
    const model = largeGraphModel();
    const grouped = highlightedGraphRelationshipEdges(model);
    return grouped.length ? grouped : (largeInspectedEdge ? [largeInspectedEdge] : []);
  }

  function relationshipEndpointDescription(route: string): string {
    const detail = resolveLargeDetail(route);
    if (!detail) return 'This endpoint is not available in the currently loaded bundle.';
    if (detail.kind === 'dataset') {
      return stripHtml(detail.dataset.notes || '') || `${largeDatasetLabel(detail.dataset)} is a ${recordSingular()} in the current OKF bundle.`;
    }
    if (detail.kind === 'publisher') {
      return `${largePublisherLabel(detail.publisher.name)} publishes ${detail.datasets.length.toLocaleString()} indexed ${recordPlural()}.`;
    }
    if (detail.kind === 'resource') {
      const format = detail.resource.format
        ? ` ${facetValueDisplay('format', detail.resource.format)}`
        : '';
      const datasetLabel = detail.dataset
        ? largeDatasetLabel(detail.dataset)
        : detail.resource.dataset
          ? largeLabelForRoute(`dataset/${detail.resource.dataset}`)
          : 'the selected record';
      return `A${format} source or access resource for ${datasetLabel}.`;
    }
    if (detail.kind === 'search') {
      return stripHtml(detail.result.notes || '') || `${largeDatasetLabel(detail.result)} is an indexed search result.`;
    }
    return `${routeTypeLabel(route)} node in the current OKF graph.`;
  }

  function inspectLargeGraphEdge(edge: LargeGraphEdge, event?: MouseEvent) {
    if (graphSuppressClick) {
      graphSuppressClick = false;
      return;
    }
    if (largeHighlightedEdge === graphEdgeKey(edge) || event?.ctrlKey || event?.metaKey) {
      largeHighlightedEdge = '';
      largeInspectedEdge = null;
      syncExplorerUrl(true);
      return;
    }
    inspectLargeEdge(edge);
  }

  function inspectLargeRelationship(relationship: LargeRelationship) {
    inspectLargeEdge({
      source: relationship.source,
      target: relationship.target,
      label: relationship.kind,
      ...graphEdgeSemanticMetadata(relationship)
    });
  }

  function clearSmallRelationship() {
    smallInspectedRelationship = null;
    syncExplorerUrl(true);
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
    if (largeRelationships.length || (largeSelectedRoute && largeRelationshipsByRoute.has(largeSelectedRoute))) {
      const relationships =
        largeSelectedRoute && largeRouteInReduction(largeSelectedRoute)
          ? routeRelationships(largeSelectedRoute, limit)
          : largeRelationships
              .filter((relationship) => relationship.source.startsWith('dataset/') && largeVisibleDatasetNames.has(routeValue(relationship.source)))
              .slice(0, limit);
      return relationships.map((relationship) => ({
        source: relationship.source,
        target: relationship.target,
        label: relationship.kind,
        ...graphEdgeSemanticMetadata(relationship)
      }));
    }
    return largeGraphModel().relationships.slice(0, limit);
  }

  function graphViewBox(): string {
    return `${graphViewport.x} ${graphViewport.y} ${graphViewport.w} ${graphViewport.h}`;
  }

  function resetGraphView() {
    graphZoom = 1;
    graphViewport = { x: 0, y: 0, w: graphCanvasWidth, h: GRAPH_HEIGHT, baseW: graphCanvasWidth, baseH: GRAPH_HEIGHT };
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

  function zoomGraphFromWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const delta = Math.max(-120, Math.min(120, event.deltaY));
    const factor = Math.exp(-delta * 0.0014);
    setGraphZoom(graphZoom * factor);
  }

  function measureGraphViewport(node: SVGSVGElement) {
    const update = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (!width || !height) return;
      const nextBaseWidth = Math.round(Math.max(720, Math.min(1680, GRAPH_HEIGHT * (width / height))));
      if (Math.abs(nextBaseWidth - graphCanvasWidth) < 3) return;
      const normalizedCenter = (
        graphViewport.x + graphViewport.w / 2
      ) / (graphViewport.baseW || graphCanvasWidth);
      const nextViewportWidth = nextBaseWidth / graphZoom;
      graphCanvasWidth = nextBaseWidth;
      graphViewport = {
        ...graphViewport,
        x: normalizedCenter * nextBaseWidth - nextViewportWidth / 2,
        w: nextViewportWidth,
        baseW: nextBaseWidth
      };
    };
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return {
      destroy() {
        observer.disconnect();
      }
    };
  }

  function beginGraphPan(event: PointerEvent) {
    if (event.button !== undefined && event.button !== 0) return;
    graphSuppressClick = false;
    graphDrag = { x: event.clientX, y: event.clientY, box: { ...graphViewport }, moved: false };
  }

  function moveGraphPan(event: PointerEvent) {
    if (!graphDrag) return;
    const svg = event.currentTarget as SVGSVGElement;
    const dx = event.clientX - graphDrag.x;
    const dy = event.clientY - graphDrag.y;
    if (Math.hypot(dx, dy) <= 8 && !graphDrag.moved) return;
    event.preventDefault();
    if (!graphDrag.moved) svg.setPointerCapture?.(event.pointerId);
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
    const svg = event.currentTarget as SVGSVGElement;
    if (svg.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture?.(event.pointerId);
    if (moved) window.setTimeout(() => (graphSuppressClick = false), 80);
  }

  function clearGraphNodeHighlight(route: string) {
    largeHighlightedRoute = '';
    if (largeInspectedRoute === route && route !== largeSelectedRoute) largeInspectedRoute = '';
    largeHighlightedEdge = '';
    largeInspectedEdge = null;
    syncExplorerUrl(true);
  }

  function graphNodeClick(route: string, event?: MouseEvent) {
    if (graphSuppressClick) {
      graphSuppressClick = false;
      return;
    }
    if (event?.ctrlKey || event?.metaKey) {
      clearGraphNodeHighlight(route);
      return;
    }
    if (isGraphStackRoute(route)) {
      toggleLargeGraphStack(route);
      return;
    }
    if (largeHighlightedRoute === route) {
      clearGraphNodeHighlight(route);
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

  function beginEdgePanelResize(event: PointerEvent) {
    if (event.button !== undefined && event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.drawer-grip')) return;
    event.preventDefault();
    event.stopPropagation();
    edgePanelResizeCleanup?.();
    const startY = event.clientY;
    const startHeight = edgePanelHeight;
    const grip = event.currentTarget as HTMLElement;
    edgePanelResizing = true;
    grip.setPointerCapture?.(event.pointerId);
    const move = (next: PointerEvent) => {
      next.preventDefault();
      edgePanelHeight = Math.max(80, Math.min(420, startHeight - (next.clientY - startY)));
    };
    const finish = (next?: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (next && grip.hasPointerCapture?.(next.pointerId)) grip.releasePointerCapture?.(next.pointerId);
      edgePanelResizing = false;
      edgePanelResizeCleanup = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    edgePanelResizeCleanup = () => finish();
  }

  function suppressEdgePanelToggleFromGrip(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.drawer-grip')) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function resizeEdgePanelWithKeyboard(event: KeyboardEvent) {
    const nextHeight =
      event.key === 'ArrowUp'
        ? edgePanelHeight + 20
        : event.key === 'ArrowDown'
          ? edgePanelHeight - 20
          : event.key === 'Home'
            ? 80
            : event.key === 'End'
              ? 420
              : null;
    if (nextHeight === null) return;
    event.preventDefault();
    event.stopPropagation();
    edgePanelHeight = Math.max(80, Math.min(420, nextHeight));
  }
</script>

<svelte:head>
  <title>OKF Explorer</title>
  {#if exploratoryPublication.noindex}
    <meta name="robots" content="noindex, nofollow" />
  {/if}
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
    <form class="bundle-form" onsubmit={(event) => { event.preventDefault(); void loadSource(bundleInputUrl); }}>
      <div class="bundle-box">
        <input bind:value={bundleInputUrl} onfocus={() => (suggestionsOpen = true)} oninput={() => (suggestionsOpen = true)} placeholder="Bundle or descriptor URL" />
        {#if suggestionsOpen && bundleSuggestions.length}
          <div class="bundle-suggestions">
            {#each bundleSuggestions as suggestion}
              <button type="button" onclick={() => {
                bundleInputUrl = suggestion.url;
                void loadSource(suggestion.url, suggestion.routes || [], suggestion.raw_subpath || '');
              }}>
                <strong>{suggestion.title || suggestion.label || suggestion.url}</strong>
                <span>{suggestion.url}</span>
                {#if suggestion.version || suggestion.status}<small>{suggestion.version ? `v${suggestion.version}` : ''}{suggestion.version && suggestion.status ? ' · ' : ''}{suggestion.status || ''}</small>{/if}
                {#if suggestion.description}<small>{suggestion.description}</small>{/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <button type="submit">Load</button>
      <label class="file-button">
        <input type="file" accept="application/json,application/ld+json,application/ld+yaml,application/yaml,.json,.jsonld,.yamlld,.yaml,.yml" onchange={(event) => void loadFile(event.currentTarget.files?.[0] || null)} />
        File
      </label>
    </form>
  </header>

  <div class="app-notices">
    <ExploratoryBanner
      result={exploratoryPublication}
      feedbackUrl={exploratoryFeedbackHref()}
    />
    {#if appAlertMessages.length}
      <div
        class="error"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-incomplete-route={activeIncompleteRelationshipRoute || undefined}
      >
        {#each appAlertMessages as message}
          <p>{message}</p>
        {/each}
      </div>
    {/if}
    {#if loading || largeFullLoading || largeRelationshipsLoading || largeTargetedLoadingRoute}
      <div class="status" role="status" aria-live="polite" aria-atomic="true">
        {#if loading}Loading descriptor and overview...{/if}
        {#if largeFullLoading} Loading record index...{/if}
        {#if largeTargetedLoadingRoute} Loading selected record...{/if}
        {#if largeRelationshipsLoading} Loading relationship index...{/if}
      </div>
    {/if}
  </div>

  <main class="workspace">
    <aside class="left-panel">
      <div class="panel-bar">
        <button aria-label="Toggle navigation" type="button" onclick={() => (leftCollapsed = !leftCollapsed)}>{leftCollapsed ? '›' : '‹'}</button>
        {#if leftCollapsed}
          <span class="panel-rail-label" title={source?.kind === 'large' ? largeLabelForRoute(largeSelectedRoute || largeInspectedRoute) : detailNode?.title || smallCorpus?.title || 'Browse'}>
            {source?.kind === 'large' ? largeLabelForRoute(largeSelectedRoute || largeInspectedRoute) || 'Browse' : detailNode?.title || smallCorpus?.title || 'Browse'}
          </span>
        {/if}
      </div>
      <div class="left-content">
        {#if source?.kind === 'large'}
          <section class="retrieval-control">
            <h2>Search</h2>
            <div class="search-control">
              <input class="search-input" value={largeQuery} placeholder={searchPlaceholder()} oninput={(event) => scheduleLargeSearch(event.currentTarget.value)} />
              {#if largeQuery}
                <button class="search-clear" type="button" aria-label="Clear search" title="Clear search" onclick={clearLargeSearch}>x</button>
              {/if}
            </div>
            {#if largeSearchIndexLoading}
              <p class="search-status" aria-live="polite">Preparing static search index...</p>
            {:else if largeSearching}
              <p class="search-status" aria-live="polite">Searching static index...</p>
            {/if}
            {#if largeSuggestions.length}
              <div class="suggestions">
                {#each largeSuggestions as suggestion}
                  <button type="button" onclick={() => void runLargeSearch(suggestion.query || suggestion.token)}>
                    <strong>{suggestion.label || suggestion.token}</strong>
                    <small>
                      {suggestion.kind === 'entity' ? `${capitalise(suggestion.entity_kind || 'entity')} · ` : 'Indexed term · '}
                      {suggestion.df.toLocaleString()} {suggestion.df === 1 ? 'record' : 'records'}
                    </small>
                  </button>
                {/each}
              </div>
            {/if}
            {#if largeSearchResponse?.interpreted_entity}
              <p class="search-interpretation" aria-live="polite">
                <strong>Recognised {largeSearchResponse.interpreted_entity.kind}</strong>
                <span>{largeSearchResponse.interpreted_entity.label}</span>
                {#if largeSearchResponse.interpreted_entity.matched_alias}
                  <small>Matched alias “{largeSearchResponse.interpreted_entity.matched_alias}”</small>
                {/if}
              </p>
            {/if}
            {#if largeSearchResponse?.query_corrections?.length}
              <p class="search-interpretation" aria-live="polite">
                <strong>Spelling tolerance applied</strong>
                <span>
                  {largeSearchResponse.query_corrections
                    .map((correction) => `“${correction.query_token}” → “${correction.matched_token}”`)
                    .join(', ')}
                </span>
                <small>Each change is exactly one verified edit and must agree with the other indexed terms.</small>
              </p>
            {/if}
            {#if largeSearchResponse?.unresolved_tokens?.length}
              <p class="search-interpretation" aria-live="polite">
                <strong>Unmatched {largeSearchResponse.unresolved_tokens.length === 1 ? 'term' : 'terms'}</strong>
                <span>{largeSearchResponse.unresolved_tokens.join(', ')}</span>
                <small>All meaningful terms are required, so unrelated partial matches are not shown.</small>
              </p>
            {/if}
          </section>

          {#if pins.length}
            <section class="pinned-list">
              <h2>Pins</h2>
              {#each pinnedLabels as pin}
                <button type="button" onclick={() => selectLargeRoute(pin.route)}>{pin.label}</button>
              {/each}
            </section>
          {/if}

          <div class="panel-tabs" role="tablist" aria-label="Left panel">
            {#each availableLeftPanelTabs() as tab}
              <button
                id={`left-tab-${tab}`}
                role="tab"
                type="button"
                aria-selected={leftPanelTab === tab}
                aria-controls={`left-panel-${tab}`}
                tabindex={leftPanelTab === tab ? 0 : -1}
                class:active={leftPanelTab === tab}
                onclick={() => selectLeftPanelTab(tab)}
                onkeydown={(event) => leftPanelTabKeydown(event, tab)}
              >{leftPanelTabLabel(tab)}</button>
            {/each}
          </div>

          {#each availableLeftPanelTabs().filter((tab) => tab !== leftPanelTab) as tab}
            <div id={`left-panel-${tab}`} role="tabpanel" aria-labelledby={`left-tab-${tab}`} hidden></div>
          {/each}

          {#if leftPanelTab === 'facets'}
            <div id="left-panel-facets" class="facet-preview panel-tab-content" role="tabpanel" aria-labelledby="left-tab-facets">
              <div class="filter-heading">
                <span>Filter results {activeLargeFilterCount ? `(${activeLargeFilterCount})` : ''}</span>
              </div>
              {#if activeLargeFilterCount}
                <div class="active-filter-chips" aria-label="Active filters">
                  {#each selectedLargeFilterLabels() as filter}
                    <button type="button" aria-label={`Remove ${filter.label}`} title={`Remove ${filter.label}`} onclick={() => removeLargeFilter(filter.key, filter.value)}>
                      <span>{filter.label}</span><span aria-hidden="true">×</span>
                    </button>
                  {/each}
                </div>
              {/if}
              <div class="facet-toolbar">
                <div class="facet-scope-switch" aria-label="Facet visibility">
                  <button class:active={facetPreferences.mode === 'suggested'} type="button" aria-pressed={facetPreferences.mode === 'suggested'} onclick={() => setFacetMode('suggested')}>Suggested</button>
                  <button class:active={facetPreferences.mode === 'all'} type="button" aria-pressed={facetPreferences.mode === 'all'} onclick={() => setFacetMode('all')}>All</button>
                </div>
                <span class="facet-inventory" aria-live="polite">
                  {presentedLargeFacetKeys().length.toLocaleString()} of {providerOrderedLargeFacetKeys().length.toLocaleString()} facets shown
                </span>
                <div class="facet-toolbar-actions">
                  <button type="button" aria-pressed={facetPreferences.density === 'explained'} onclick={toggleFacetExplanations}>Guidance</button>
                  <button
                    type="button"
                    title="Remove every active facet and map filter"
                    disabled={!activeLargeFilterCount}
                    onclick={clearLargeFilters}
                  >Clear filters</button>
                  <button
                    type="button"
                    title="Restore the provider's facet order, visibility and guidance defaults; active filters are unchanged"
                    onclick={resetFacetPreferences}
                  >Reset facet layout</button>
                </div>
              </div>
              {#if facetPreferences.density === 'explained'}
                <aside class="facet-guide">
                  <strong>What makes a useful facet?</strong>
                  <p>It covers most records, offers a manageable set of choices and divides the current results without one value dominating. Suggested facets use the pack’s coverage, cardinality and reduction analysis.</p>
                </aside>
              {/if}
              {#if largeFacetApplyingKey}
                <p class="facet-status" aria-live="polite">
                  Applying {facetDisplayLabel(largeFacetApplyingKey)}: {facetValueDisplay(largeFacetApplyingKey, largeFacetApplyingValue)}...
                </p>
              {/if}
              <div class="facet-sections" aria-label="Facet filters">
                {#each presentedLargeFacetKeys() as key}
                  {@const selectedFacetValues = facetSelectedValues(key)}
                  {@const selectedFacetCount = selectedFacetValues.length}
                  {@const facetHint = facetSummary(key)}
                  {@const facetTerm = facetDefinition(key)}
                  {@const facetHierarchies = analysisHierarchiesForFacet(key)}
                  <section
                    class="facet-section"
                    class:open={facetIsOpen(key)}
                    class:pinned={facetIsPinned(key)}
                    class:dragging={draggingFacetKey === key}
                    class:drag-over={facetDropTargetKey === key}
                    role="group"
                    aria-label={`${facetDisplayLabel(key)} facet`}
                    data-facet-key={key}
                    ondragover={(event) => dragFacetOver(key, event)}
                    ondrop={(event) => dropFacetBefore(key, event)}
                  >
                    <div class="facet-section-header">
                      <button
                        class="facet-drag-handle"
                        type="button"
                        draggable="true"
                        aria-label={`Reorder ${facetDisplayLabel(key)}`}
                        title="Drag to reorder this facet"
                        ondragstart={(event) => startFacetDrag(key, event)}
                        ondragend={finishFacetDrag}
                      >⋮⋮</button>
                      <button
                        class="facet-toggle"
                        type="button"
                        aria-expanded={facetIsOpen(key)}
                        aria-controls={`facet-panel-${key}`}
                        onclick={() => void openLargeFacet(key)}
                        onkeydown={(event) => facetContextKeydown(key, event)}
                        oncontextmenu={(event) => openFacetMenu(key, event)}
                      >
                        <span class="facet-title">
                          <span class="facet-type-icon" aria-hidden="true">{facetIcon(key)}</span>
                          <span>{facetDisplayLabel(key)}</span>
                          {#if facetIsPinned(key)}<span class="facet-pin" aria-label="Pinned facet">★</span>{/if}
                        </span>
                        <small>{facetSummaryBadge(key)}</small>
                        {#if selectedFacetCount && !facetIsOpen(key)}
                          <em>{facetSelectedSummary(key, selectedFacetValues)}</em>
                        {/if}
                      </button>
                      <div class="facet-actions">
                        <button
                          class="facet-pin-trigger"
                          type="button"
                          aria-label={`${facetIsPinned(key) ? 'Unpin' : 'Pin'} ${facetDisplayLabel(key)}`}
                          aria-pressed={facetIsPinned(key)}
                          title={facetIsPinned(key) ? 'Unpin facet' : 'Pin facet open'}
                          onclick={() => toggleFacetPin(key, false)}
                        >{facetIsPinned(key) ? '★' : '☆'}</button>
                        <button
                          id={`facet-menu-trigger-${key}`}
                          class="facet-menu-trigger"
                          type="button"
                          aria-label={`Actions for ${facetDisplayLabel(key)}`}
                          aria-haspopup="menu"
                          aria-expanded={facetMenuKey === key}
                          onclick={(event) => openFacetMenu(key, event)}
                        >•••</button>
                        {#if facetMenuKey === key}
                          <div id={`facet-menu-${key}`} class="facet-menu" role="menu" tabindex="-1" aria-label={`${facetDisplayLabel(key)} actions`} onkeydown={(event) => facetMenuKeydown(key, event)}>
                            <button role="menuitem" type="button" onclick={() => toggleFacetPin(key)}>{facetIsPinned(key) ? 'Unpin facet' : 'Pin facet'}</button>
                            <button role="menuitem" type="button" disabled={!canMoveFacetPreference(key, -1)} onclick={() => moveFacetPreference(key, -1)}>Move earlier</button>
                            <button role="menuitem" type="button" disabled={!canMoveFacetPreference(key, 1)} onclick={() => moveFacetPreference(key, 1)}>Move later</button>
                            <button role="menuitem" type="button" onclick={() => toggleFacetHidden(key)}>{facetIsHidden(key) || (facetIsLowPriority(key) && !facetIsPinned(key)) ? 'Show in Suggested' : 'Hide from Suggested'}</button>
                            <button role="menuitem" type="button" disabled={!selectedFacetCount} onclick={() => { clearFacetFilter(key); closeFacetMenu(key); }}>Clear this facet</button>
                            <button role="menuitem" type="button" onclick={() => explainFacet(key)}>About this facet</button>
                          </div>
                        {/if}
                      </div>
                    </div>

                    {#if !facetUsesSearch(key) && facetPreviewIsComplete(key)}
                      {@const distribution = facetDistribution(key)}
                      {#if distribution.length}
                        <div class="facet-distribution">
                          <div
                            class="facet-distribution-bar"
                            class:histogram={facetUsesHistogram(key)}
                            role="group"
                            aria-label={`${facetDisplayLabel(key)} distribution`}
                            title={facetDistributionSummary(key, distribution)}
                            data-palette={facetPaletteKind(key)}
                          >
                            {#each distribution as segment, index}
                              {@const segmentLabel = facetDistributionSegmentLabel(key, segment)}
                              <button
                                class="facet-distribution-segment"
                                class:aggregate={Boolean(segment.otherValues)}
                                class:active={!segment.otherValues && selectedFacetValues.includes(segment.value)}
                                class:highlighted={!segment.otherValues && facetValueIsHighlighted(key, segment.value)}
                                type="button"
                                aria-label={segment.otherValues ? `Open ${facetDisplayLabel(key)} to find ${segment.otherValues.toLocaleString()} other values` : `${segmentLabel}. Click to preview; double-click or press Enter to filter.`}
                                aria-pressed={segment.otherValues ? undefined : selectedFacetValues.includes(segment.value)}
                                data-facet-value={segment.value}
                                data-tone={index % 2 === 0 ? 'strong' : 'contrast'}
                                style={`--facet-weight:${segment.count};--facet-height:${Math.min(1, segment.count / Math.max(...distribution.map((row) => row.count)))};--facet-colour:${facetSegmentColour(key, index, distribution.length, segment.otherValues)}`}
                                title={segmentLabel}
                                onmouseenter={() => setFacetPreviewLabel(key, segmentLabel)}
                                onmouseleave={() => clearFacetPreviewLabel(key)}
                                onfocus={() => setFacetPreviewLabel(key, segmentLabel)}
                                onblur={() => clearFacetPreviewLabel(key)}
                                oncontextmenu={(event) => event.preventDefault()}
                                onclick={(event) => segment.otherValues ? void openLargeFacet(key) : previewLargeFacetValue(key, segment.value, event)}
                                ondblclick={(event) => segment.otherValues ? void openLargeFacet(key) : void commitFacetHighlights(key, segment.value, event)}
                                onkeydown={(event) => segment.otherValues ? undefined : facetValueKeydown(key, segment.value, event)}
                              ></button>
                            {/each}
                          </div>
                          <p>{facetDistributionCaption(key, distribution)}</p>
                        </div>
                      {:else if !facetIsOpen(key)}
                        <div class="facet-search-ghost">
                          <span aria-hidden="true">⌕</span>{facetSearchPlaceholder(key)}
                        </div>
                      {/if}
                    {:else if !facetIsOpen(key)}
                      <div class="facet-search-ghost">
                        <span aria-hidden="true">⌕</span>{facetUsesSearch(key)
                          ? `Search values · ${facetSearchPlaceholder(key)}`
                          : largeFacetIndexLoading || largeSearchIndexLoading
                            ? 'Loading distribution...'
                            : `Open to load distribution · ${facetSearchPlaceholder(key)}`}
                      </div>
                    {/if}

                    {#if facetIsOpen(key)}
                      {@const diverseFamilies = facetUsesDiverseSummary(key) ? facetValueFamilies(key) : []}
                      <div id={`facet-panel-${key}`} class="facet-panel">
                        {#if facetPreferences.density === 'explained' && facetTerm}
                          <p class="facet-definition">{facetTerm}</p>
                        {/if}
                        {#if facetPreferences.density === 'explained' && facetHint}
                          <p class="facet-hint">{facetHint} · coverage {formatPercent(analysisFacetForKey(key)?.coverage)} · {facetAvailableValueCount(key).toLocaleString()} values</p>
                        {/if}
                        {#if facetHierarchies.length}
                          <button class="facet-browse-link" type="button" onclick={openBrowseTab}>
                            Browse {facetHierarchies[0].label} →
                          </button>
                        {/if}
                        {#if diverseFamilies.length}
                          <section class="facet-family-summary" aria-label={`${facetDisplayLabel(key)} value families`}>
                            <div class="facet-family-bar" aria-hidden="true">
                              {#each diverseFamilies as family, index}
                                <i
                                  style={`--facet-weight:${family.count};--facet-colour:${facetSegmentColour(key, index, diverseFamilies.length, family.id === 'other' ? family.valueCount : undefined)}`}
                                ></i>
                              {/each}
                            </div>
                            <p class="facet-family-key">
                              {#each diverseFamilies as family, index}
                                <span style={`--facet-colour:${facetSegmentColour(key, index, diverseFamilies.length, family.id === 'other' ? family.valueCount : undefined)}`}>
                                  {family.label}
                                </span>
                              {/each}
                            </p>
                            <div class="facet-family-groups">
                              {#each diverseFamilies as family}
                                <div>
                                  <strong>{family.label}:</strong>
                                  <span>
                                    {#each family.rows.slice(0, 3) as row, index}
                                      {#if index}<b aria-hidden="true">|</b>{/if}
                                      <button
                                        class:active={selectedFacetValues.includes(row.value)}
                                        class:highlighted={facetValueIsHighlighted(key, row.value)}
                                        type="button"
                                        aria-pressed={selectedFacetValues.includes(row.value)}
                                        title={`${row.count.toLocaleString()} records. Click to preview; double-click or press Enter to filter.`}
                                        disabled={Boolean(largeFacetApplyingKey)}
                                        onclick={(event) => previewLargeFacetValue(key, row.value, event)}
                                        ondblclick={(event) => void commitFacetHighlights(key, row.value, event)}
                                        onkeydown={(event) => facetValueKeydown(key, row.value, event)}
                                      >{facetValueDisplay(key, row.value)}</button>
                                    {/each}
                                    {#if family.valueCount > Math.min(3, family.rows.length)}
                                      <em>+{(family.valueCount - Math.min(3, family.rows.length)).toLocaleString()}</em>
                                    {/if}
                                  </span>
                                </div>
                              {/each}
                            </div>
                          </section>
                        {/if}
                        <div class="facet-values">
                          {#if !largeIndex && largeFacetHydratingKey === key}
                            <p class="facet-loading">Loading facet values...</p>
                          {:else}
                            {@const filteredFacetRows = filteredLargeFacetRows(key)}
                            {@const visibleFacetRows = visibleLargeFacetRows(key, filteredFacetRows)}
                            {#if facetUsesSearch(key)}
                              <label class="facet-search">
                                <span>Search {facetDisplayLabel(key)}</span>
                                <input
                                  value={largeFacetQuery(key)}
                                  placeholder={facetSearchPlaceholder(key)}
                                  oninput={(event) => setLargeFacetQuery(key, event.currentTarget.value)}
                                />
                              </label>
                            {/if}
                            {#if facetPreferences.density === 'explained'}
                              <p class="facet-mode-hint">{facetSelectionModeHint(key)}</p>
                            {/if}
                            {#if largeFacetHighlights[key]?.length}
                              <div class="facet-highlight-actions" aria-live="polite">
                                <span>{largeFacetHighlights[key].length.toLocaleString()} highlighted</span>
                                <button type="button" onclick={() => void commitFacetHighlights(key, largeFacetHighlights[key][0])}>Filter to highlighted</button>
                                <button type="button" onclick={() => clearFacetHighlights(key)}>Clear preview</button>
                              </div>
                            {/if}
                            {#if !diverseFamilies.length || largeFacetBrowseAll[key] || largeFacetQuery(key).trim()}
                              {#each visibleFacetRows as value}
                                <button
                                  class:active={selectedFacetValues.includes(value.value)}
                                  class:highlighted={facetValueIsHighlighted(key, value.value)}
                                  type="button"
                                  aria-pressed={selectedFacetValues.includes(value.value)}
                                  data-facet-value={value.value}
                                  title="Click to preview; double-click or press Enter to filter"
                                  disabled={Boolean(largeFacetApplyingKey)}
                                  onclick={(event) => previewLargeFacetValue(key, value.value, event)}
                                  ondblclick={(event) => void commitFacetHighlights(key, value.value, event)}
                                  onkeydown={(event) => facetValueKeydown(key, value.value, event)}
                                >
                                  <span>{facetValueDisplay(key, value.value)}</span><small>{value.count.toLocaleString()}</small>
                                </button>
                              {/each}
                              {#if visibleFacetRows.length < filteredFacetRows.length}
                                <button class="facet-more" type="button" onclick={() => showMoreLargeFacetRows(key)}>
                                  <span>Show more</span><small>{(filteredFacetRows.length - visibleFacetRows.length).toLocaleString()} more</small>
                                </button>
                              {/if}
                            {:else}
                              <button class="facet-more" type="button" onclick={() => showAllFacetValues(key)}>
                                <span>Browse all values</span><small>{filteredFacetRows.length.toLocaleString()}</small>
                              </button>
                            {/if}
                            {#if !filteredFacetRows.length}
                              <p class="facet-loading">No values match this facet search.</p>
                            {/if}
                          {/if}
                        </div>
                      </div>
                    {/if}
                  </section>
                {/each}
              </div>
            </div>
          {:else if leftPanelTab === 'browse'}
            <div id="left-panel-browse" class="hierarchy-browser panel-tab-content" role="tabpanel" aria-labelledby="left-tab-browse">
              <header>
                <h2>Browse hierarchies</h2>
                <p>Fold provider-defined groups to move through the corpus without flattening every level into a facet list.</p>
              </header>
              {#each largeAnalysis()?.hierarchies || [] as hierarchy}
                <article class="hierarchy-section">
                  <h3><span aria-hidden="true">▾</span>{hierarchy.label}</h3>
                  {#each hierarchy.values as group}
                    {#if group.children?.length}
                      <details class="hierarchy-node">
                        <summary><span aria-hidden="true">▸</span><strong>{largeLabelForRoute(group.route || group.id)}</strong><small>{group.count.toLocaleString()}</small></summary>
                        <div class="hierarchy-children">
                          {#if group.route}
                            <button type="button" disabled={Boolean(largeFacetApplyingKey)} onclick={() => void openHierarchyValue(hierarchy.facet, group.route, group.label)}>
                              <span>All {largeLabelForRoute(group.route)}</span><small>{group.count.toLocaleString()}</small>
                            </button>
                          {/if}
                          {#each group.children as child}
                            <button type="button" disabled={Boolean(largeFacetApplyingKey)} onclick={() => void openHierarchyValue(hierarchy.facet, child.route || child.id, child.label)}>
                              <span>{largeLabelForRoute(child.route || child.id)}</span><small>{child.count.toLocaleString()}</small>
                            </button>
                          {/each}
                        </div>
                      </details>
                    {:else}
                      <button class="hierarchy-leaf" type="button" disabled={Boolean(largeFacetApplyingKey)} onclick={() => void openHierarchyValue(hierarchy.facet, group.route || group.id, group.label)}>
                        <span>{largeLabelForRoute(group.route || group.id)}</span><small>{group.count.toLocaleString()}</small>
                      </button>
                    {/if}
                  {/each}
                </article>
              {/each}
            </div>
          {:else}
            <div id="left-panel-results" class="panel-tab-content" role="tabpanel" aria-labelledby="left-tab-results">
              <section class="sort-control">
                <label>
                  <span>Sort</span>
                  <select value={retrievalSort} onchange={(event) => setRetrievalSort(event.currentTarget.value)}>
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="title">Title</option>
                    <option value="metadata-quality">Metadata quality</option>
                  </select>
                </label>
              </section>
              {#if largeIndex && !(largeAppliedQuery.trim() && largeSearchResponse?.filters_applied)}
                <section class="left-results">
                  <h2>{recordPlural()} in current reduction</h2>
                  <p>{largeVisibleDatasets.length.toLocaleString()} records match the active search and filters.</p>
                  <div class="node-list" data-okf-ranked-results="navigation">
                    {#each largeVisibleDatasets.slice(0, 80) as dataset}
                      <button data-okf-ranked-result data-result-canonical-url={rankedResultCanonicalUrl(dataset)} class:active={datasetRoute(dataset) === largeSelectedRoute} type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>
                        <strong>{largeDatasetLabel(dataset)}</strong>
                        <span>{largeRecordPublisherLabel(dataset)} · {dataset.resource_count || 0} {resourcePlural()}</span>
                      </button>
                    {/each}
                  </div>
                </section>
              {:else if largeResults.length}
                <section class="left-results">
                  <h2>Search matches</h2>
                  <p>{largeResults.length.toLocaleString()} retrieved records.</p>
                  <div class="node-list" data-okf-ranked-results="navigation">
                    {#each largeResults.slice(0, 80) as result}
                      <button data-okf-ranked-result data-result-canonical-url={rankedResultCanonicalUrl(result)} class:active={datasetRoute(result) === largeSelectedRoute} type="button" onclick={() => chooseLargeResult(result)}>
                        <strong>{largeDatasetLabel(result)}</strong>
                        <span>{largeRecordPublisherLabel(result)} · {result.resource_count || 0} {resourcePlural()}</span>
                      </button>
                    {/each}
                  </div>
                </section>
              {:else}
                <p class="empty-panel-copy">Search or open a facet to load matching {recordPlural()}.</p>
              {/if}
            </div>
          {/if}
        {:else if smallCorpus}
          <section class="retrieval-control">
            <h2>Search</h2>
            <input class="search-input" value={smallQuery} oninput={(event) => setSmallQuery(event.currentTarget.value)} placeholder="Search nodes" />
          </section>
          {#if geospatialFilter}
            <section class="pinned-list">
              <h2>Map reduction</h2>
              <button type="button" onclick={clearGeospatialFilter}>{geospatialFilterLabel(geospatialFilter)} ×</button>
            </section>
          {/if}
          <div class="type-filters">
            <div class="filter-heading">
              <span>Filter results</span>
              <button type="button" onclick={resetTypes}>All</button>
            </div>
            {#each typeList as type}
              <button class:active={visibleTypes.has(type)} type="button" onclick={() => toggleType(type)}>
                <span class="type-dot"></span>{type}
              </button>
            {/each}
          </div>
          <section class="sort-control">
            <label>
              <span>Sort</span>
              <select value={retrievalSort} onchange={(event) => setRetrievalSort(event.currentTarget.value)}>
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
                <option value="title">Title</option>
                <option value="metadata-quality">Metadata quality</option>
              </select>
            </label>
          </section>
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
          <button type="button" title="Forward" aria-label="Forward" disabled={source?.kind === 'large' && !largeForwardRoute} onclick={navigateForward}>→</button>
        </div>
        <div class="crumbs">
          {source?.kind === 'large' ? 'Large corpus' : smallCorpus?.title || 'OKF'} / {largeSourceInspectorOpen ? 'source data' : activeView}
          {#if source?.kind === 'large' && (largeSelectedRoute || largeInspectedRoute)} / {largeLabelForRoute(largeInspectedRoute || largeSelectedRoute)}{/if}
          {#if detailNode} / {detailNode.title}{/if}
        </div>
        <div class="stage-actions">
          {#if largeSourceInspectorOpen}
            <button type="button" onclick={closeSourceInspector}>Back to record</button>
          {:else}
            <button type="button" onclick={copyRoute}>Copy route</button>
            <button type="button" onclick={() => pinRoute()}>Pin</button>
            <button type="button" onclick={() => (rightCollapsed = false)}>Inspect</button>
          {/if}
        </div>
      </div>

      {#if source?.kind === 'large' && largeSourceInspectorOpen}
        <SourceInspector
          data={largeApiJson}
          text={largeApiText}
          displayMode={largeApiDisplayMode}
          url={largeApiResponseUrl || largeApiUrl}
          loading={largeApiLoading}
          error={largeApiError}
          bytes={largeApiBytes}
          contentType={largeApiContentType}
          retrievedAt={largeApiRetrievedAt}
          recordLabel={largeLabelForRoute(largeApiRoute || largeSelectedRoute || largeInspectedRoute)}
          sourceLabel={largeApiSourceLabel}
          onclose={closeSourceInspector}
        />
      {:else if source?.kind === 'large'}
        <section class="large-view">
          {#if source.descriptor.assertion_scope === 'synthetic-fixture'}
            <aside class="semantic-scope-notice" data-relationship-scope="synthetic-fixture" aria-label="Synthetic fixture boundary">
              <strong>Synthetic assurance fixture</strong>
              <span>Invented test assertions are isolated from faithful counts and search and load only when this corpus is opened explicitly.</span>
            </aside>
          {/if}
          {#if activeView === 'reader'}
            <div class="metrics">
              {#each largeContextMetrics() as metric}
                <article data-metric={metric.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}><strong>{metric.value.toLocaleString()}</strong><span>{metric.label}</span></article>
              {/each}
            </div>
            {#if !largeQuery && !activeLargeFilterCount && (source.effectsReconciliation || source.effectsReconciliationError)}
              <EffectsReconciliationPanel
                reconciliation={source.effectsReconciliation}
                error={source.effectsReconciliationError}
              />
            {/if}
            {#if !largeQuery && !activeLargeFilterCount && source.modelEnrichment}
              <ModelEnrichmentStatus enrichment={source.modelEnrichment} />
            {/if}
          {/if}

          {#if activeView === 'reader'}
            {#if largeQuery || activeLargeFilterCount}
              <div class="view-heading">
                <h2>{largeQuery ? 'Search Results' : 'Filtered Results'}</h2>
                <span>{largeSearching ? 'Searching static index...' : searchResultSummary()}</span>
              </div>
              <div
                class="result-list"
                data-okf-ranked-results="primary"
                data-okf-query={largeAppliedQuery}
                data-okf-search-state={largeSearching ? 'searching' : 'settled'}
              >
                {#if largeIndex && largeSearchResponse && !largeSearchResponse.filters_applied}
                  {#each largeVisibleDatasets.slice(0, 160) as dataset}
                    <button data-okf-ranked-result data-result-canonical-url={rankedResultCanonicalUrl(dataset)} class:active={datasetRoute(dataset) === largeSelectedRoute} type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>
                      <strong>{largeDatasetLabel(dataset)}</strong>
                      <span>{largeRecordPublisherLabel(dataset)} · {dataset.resource_count || 0} {resourcePlural()}</span>
                      {#if datasetMatchReason(dataset)}<small class="result-match">Why this matched: {datasetMatchReason(dataset)}</small>{/if}
                      {#if apiContextNote(dataset)}<p class="context-note">{apiContextNote(dataset)}</p>{/if}
                      <p>{stripHtml(dataset.notes || '').slice(0, 220)}</p>
                      {#if apiRecordMeta(dataset)}<small class="result-meta">{apiRecordMeta(dataset)}</small>{/if}
                    </button>
                  {:else}
                    <p class="muted">No static-search matches in the current reduction.</p>
                  {/each}
                {:else}
                  {#each largeResults as result}
                    <button data-okf-ranked-result data-result-canonical-url={rankedResultCanonicalUrl(result)} class:active={datasetRoute(result) === largeSelectedRoute} type="button" onclick={() => chooseLargeResult(result)}>
                      <strong>{largeDatasetLabel(result)}</strong>
                      <span>{largeRecordPublisherLabel(result)} · {result.resource_count || 0} {resourcePlural()}</span>
                      <small class="result-match">Why this matched: {searchMatchReason(result)}</small>
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
              {#each source.providerDatapacks?.packs || [] as providerDatapack}
                <ProviderDatapackStatus pack={providerDatapack} scope="bundle" />
              {/each}
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
                      {facetValueDisplay('format', format.value)}<span>{format.count.toLocaleString()} {recordPlural()}</span>
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
                    <strong>{largeDatasetLabel(dataset)}</strong>
                    <span>{largeRecordPublisherLabel(dataset)} · {dataset.resource_count || 0} {resourcePlural()}</span>
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
                    <button type="button" onclick={() => chooseLargeResult(dataset)}>{largeDatasetLabel(dataset)}<span>{largeRecordPublisherLabel(dataset)}</span></button>
                  {/each}
                </section>
                <section>
                  <h3>{capitalise(formatPlural())}</h3>
                  {#each (source.overview.format_counts || []).slice(0, 14) as format}
                    <span class="chip">{facetValueDisplay('format', format.value)} {format.count.toLocaleString()}</span>
                  {/each}
                </section>
              </div>
            {/if}
          {:else if activeView === 'graph'}
            {@const fullModel = largeGraphModel()}
            {@const relationshipGroups = graphRelationshipGroups(fullModel)}
            {@const relationshipModel = relationshipFilteredLargeGraphModel(fullModel, relationshipGroups)}
            {@const model = nodeTypeFilteredLargeGraphModel(relationshipModel)}
            {@const layoutGroups = graphRelationshipGroups(relationshipModel)}
            {@const relationshipLayoutActive = graphRelationshipLayoutActive(relationshipModel, layoutGroups)}
            {@const baseRelationshipPlan = relationshipLayoutActive
              ? planRelationshipGroupPositions(relationshipModel.center, layoutGroups, graphCanvasWidth, GRAPH_HEIGHT)
              : null}
            {@const relationshipPlan = baseRelationshipPlan
              ? graphDocumentAnchoredPlan(baseRelationshipPlan, relationshipModel)
              : null}
            {@const positions = relationshipPlan?.positions || largeGraphPositions(relationshipModel, layoutGroups)}
            {@const edgePlans = largeGraphEdgePlans(model.relationships)}
            {@const edgeWeightPlan = largeGraphEdgeWeightPlan(model.relationships)}
            {@const edgeLabelSpecs = largeGraphEdgeLabelSpecs(
              model,
              positions,
              edgePlans,
              relationshipPlan ? layoutGroups : []
            )}
            {@const labelPlan = graphPresentationLayers(
              model.nodes,
              positions,
              edgeLabelSpecs,
              model.center,
              relationshipPlan?.nodeSlots,
              Boolean(relationshipPlan)
            )}
            {@const labels = labelPlan.visible}
            {@const nodeKeyNodes = graphNodeKeyNodes(relationshipModel, model)}
            {@const focusTitleLines = model.center ? graphFocusTitleLines(largeLabelForRoute(model.center)) : []}
            <div class="graph-shell">
              <div class="graph-toolbar">
                <div class="graph-control-row">
                  <div class="graph-buttons" aria-label="Graph controls">
                    <button type="button" aria-label="Zoom out" title="Zoom out" onclick={() => setGraphZoom(graphZoom / 1.2)}>−</button>
                    <button type="button" aria-label="Reset graph zoom" title="Reset graph zoom" onclick={resetGraphView}>{Math.round(graphZoom * 100)}%</button>
                    <button type="button" aria-label="Zoom in" title="Zoom in" onclick={() => setGraphZoom(graphZoom * 1.2)}>+</button>
                  </div>
                  <div class="graph-mode-buttons" aria-label="Graph display controls">
                    <button
                      class:active={!graphLabelsPaused}
                      type="button"
                      aria-pressed={!graphLabelsPaused}
                      aria-label={`${graphLabelsPaused ? 'Resume' : 'Pause'} cycling graph labels, set ${labelPlan.activeLayer + 1} of ${labelPlan.layerCount}`}
                      onclick={toggleGraphLabels}
                    >Labels ({labelPlan.activeLayer + 1}/{labelPlan.layerCount})</button>
                    <button
                      class:active={graphKeyMode === 'nodes'}
                      type="button"
                      aria-pressed={graphKeyMode === 'nodes'}
                      onclick={() => setGraphKeyMode('nodes')}
                    >Nodes ({model.nodes.length})</button>
                    <button
                      class:active={graphKeyMode === 'relationships'}
                      type="button"
                      aria-pressed={graphKeyMode === 'relationships'}
                      onclick={() => setGraphKeyMode('relationships')}
                    >Relationships ({model.relationships.length})</button>
                    {#if fullModel.center && relationshipGroups.length}
                      <button
                        class:active={graphLayoutControlsOpen}
                        type="button"
                        aria-pressed={graphLayoutControlsOpen}
                        title="Show relationship-region layout controls"
                        onclick={() => { graphLayoutControlsOpen = !graphLayoutControlsOpen; }}
                      >Layout</button>
                    {/if}
                  </div>
                  <div class="graph-summary">
                    <strong>{model.nodes.length}</strong> nodes · <strong>{model.relationships.length}</strong> relationships
                    {#if edgeWeightPlan.active}
                      · line weight <strong>{edgeWeightPlan.metric}</strong> {graphWeightValue(edgeWeightPlan.min)}–{graphWeightValue(edgeWeightPlan.max)}
                    {/if}
                  </div>
                </div>
                <div class="graph-context-rail">
                  <div class="graph-key-strip" aria-label={graphKeyMode === 'nodes' ? 'Node type key' : 'Relationship type key'}>
                    {#if graphKeyMode === 'nodes'}
                      {#each graphLegendItems(nodeKeyNodes) as [type, label]}
                        {@const typeCount = nodeKeyNodes.filter((node) => graphLegendTypeMatches(node.type, type)).length}
                        {@const canHideType = graphNodeTypeCanHide(type, fullModel)}
                        <button
                          type="button"
                          class:active={!canHideType || graphNodeTypeEnabled(type)}
                          class:locked={!canHideType}
                          aria-pressed={!canHideType || graphNodeTypeEnabled(type)}
                          aria-disabled={!canHideType}
                          title={!canHideType ? 'The focus node type remains visible' : `Show or hide ${label}`}
                          onclick={() => toggleGraphNodeType(type, fullModel)}
                        >
                          <i class={`legend-shape legend-${type}`} style={`background:${largeTypeColor(type)}`}></i>
                          {label} <small>{typeCount}{!canHideType ? ' · focus' : ''}</small>
                        </button>
                      {/each}
                    {:else}
                      {#each relationshipGroups as group}
                        <button
                          type="button"
                          class:active={graphHighlightedRelationshipGroup === group.key}
                          aria-pressed={graphHighlightedRelationshipGroup === group.key}
                          onclick={(event) => inspectLargeRelationshipGroup(group, fullModel, event)}
                        >
                          {group.label} <small>{graphGroupDirectionLabel(group.direction)} · {group.edgeIds.length}</small>
                        </button>
                      {/each}
                    {/if}
                  </div>
                  {#if graphRelationshipAuthorities(fullModel).length}
                    <div class="graph-authority-filters" aria-label="Relationship authority filters">
                      <span>Authority</span>
                      {#each graphRelationshipAuthorities(fullModel) as authority}
                        <button
                          type="button"
                          class:active={graphRelationshipAuthorityEnabled(authority)}
                          data-relationship-authority-filter={authority}
                          data-authority={authority}
                          aria-pressed={graphRelationshipAuthorityEnabled(authority)}
                          aria-label={`${graphRelationshipAuthorityLabel(authority)} relationships`}
                          onclick={() => toggleGraphRelationshipAuthority(authority)}
                        >
                          <i aria-hidden="true"></i>
                          {graphRelationshipAuthorityLabel(authority)}
                          <small>{graphRelationshipAuthorityCount(fullModel, authority)}</small>
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
                {#if fullModel.center && relationshipGroups.length && graphLayoutControlsOpen}
                  <section class="relationship-layout-controls" aria-label="Relationship layout">
                    <header>
                      <div class="segmented graph-layout-mode" aria-label="Graph layout mode">
                        <button
                          class:active={graphLayoutMode === 'auto'}
                          type="button"
                          aria-pressed={graphLayoutMode === 'auto'}
                          onclick={() => setGraphLayoutMode('auto')}
                        >Auto</button>
                        <button
                          class:active={graphLayoutMode === 'relationships'}
                          type="button"
                          aria-pressed={graphLayoutMode === 'relationships'}
                          onclick={() => setGraphLayoutMode('relationships')}
                        >By relationship</button>
                      </div>
                      <strong>{relationshipLayoutActive ? 'Relationship regions' : 'Compact auto layout'}</strong>
                      <button type="button" onclick={resetGraphRelationshipControls}>Reset</button>
                    </header>
                    <div class="relationship-group-strip">
                      {#each relationshipGroups as group, groupIndex}
                        {@const groupEdges = graphGroupEdges(group, fullModel)}
                        {@const activeMembers = groupEdges.filter((edge) => graphEdgeEnabled(graphEdgeKey(edge))).length}
                        {@const slot = graphVisibleGroupSlot(relationshipGroups, fullModel, group.key)}
                        <article
                          class:disabled={!graphGroupEnabled(group.key)}
                          class:drop-target={graphRelationshipDropTarget === group.key}
                          data-relationship-group={group.key}
                          ondragover={(event) => dragGraphRelationshipOver(group.key, event)}
                          ondrop={(event) => dropGraphRelationshipBefore(relationshipGroups, group.key, event)}
                        >
                          <div class="relationship-group-main">
                            <button
                              class="relationship-group-drag"
                              type="button"
                              draggable={true}
                              aria-label={`Reorder ${graphGroupControlLabel(group)}`}
                              title="Drag to reorder"
                              ondragstart={(event) => startGraphRelationshipDrag(group.key, event)}
                              ondragend={finishGraphRelationshipDrag}
                            >⋮⋮</button>
                            <label>
                              <input
                                type="checkbox"
                                checked={graphGroupEnabled(group.key)}
                                onchange={() => toggleGraphRelationshipGroup(group.key)}
                              />
                              <span>
                                <strong title={group.label}>{group.label}</strong>
                                <small>{graphGroupDirectionLabel(group.direction)} · {activeMembers}/{groupEdges.length}</small>
                              </span>
                            </label>
                            <span class="relationship-region">
                              {#if !graphGroupEnabled(group.key)}
                                Hidden
                              {:else if relationshipLayoutActive && slot}
                                {graphRelationshipSlotLabel(slot)}
                              {:else}
                                Auto
                              {/if}
                            </span>
                            <div class="relationship-group-actions">
                              <button
                                type="button"
                                aria-label={`Move ${graphGroupControlLabel(group)} earlier`}
                                title="Move earlier"
                                disabled={groupIndex === 0}
                                onclick={() => moveGraphRelationshipGroup(relationshipGroups, group.key, -1)}
                              >←</button>
                              <button
                                type="button"
                                aria-label={`Move ${graphGroupControlLabel(group)} later`}
                                title="Move later"
                                disabled={groupIndex === relationshipGroups.length - 1}
                                onclick={() => moveGraphRelationshipGroup(relationshipGroups, group.key, 1)}
                              >→</button>
                              {#if groupEdges.length > 1}
                                <button
                                  type="button"
                                  aria-label={`${graphExpandedRelationshipGroups.includes(group.key) ? 'Hide' : 'Choose'} ${group.label} members, ${graphGroupDirectionLabel(group.direction)}`}
                                  aria-expanded={graphExpandedRelationshipGroups.includes(group.key)}
                                  onclick={() => toggleGraphRelationshipMembers(group.key)}
                                >Members</button>
                              {/if}
                            </div>
                          </div>
                          {#if graphExpandedRelationshipGroups.includes(group.key)}
                            <div class="relationship-member-toggles" aria-label={`${group.label} members`}>
                              {#each groupEdges as edge}
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={graphEdgeEnabled(graphEdgeKey(edge))}
                                    disabled={!graphGroupEnabled(group.key)}
                                    onchange={() => toggleGraphRelationshipEdge(graphEdgeKey(edge))}
                                  />
                                  <span>{graphGroupMemberLabel(edge, fullModel.center)}</span>
                                </label>
                              {/each}
                            </div>
                          {/if}
                        </article>
                      {/each}
                    </div>
                  </section>
                {/if}
              </div>
              <div class="graph-hierarchy-slot">
                {#if model.hierarchy}
                  {@const hierarchy = model.hierarchy}
                  <nav class="graph-hierarchy" aria-label="Open graph hierarchy">
                  <div class="graph-hierarchy-root">
                    <span>Hierarchy</span>
                    <button
                      type="button"
                      aria-expanded="true"
                      aria-label={`Close ${hierarchy.rootLabel}`}
                      data-stack-route={hierarchy.rootRoute}
                      onclick={() => toggleLargeGraphStack(hierarchy.rootRoute)}
                    >
                      <strong>{hierarchy.rootLabel}</strong>
                      <small>Open</small>
                    </button>
                  </div>
                  {#each hierarchy.levels as level, levelIndex}
                    <div
                      class="graph-hierarchy-level"
                      class:open={Boolean(level.activeRoute)}
                      class:current={!level.activeRoute}
                      data-hierarchy-dimension={level.dimension}
                    >
                      <span class="graph-hierarchy-level-label">
                        <small>L{levelIndex + 1}</small>
                        <strong>{level.label}</strong>
                      </span>
                      {#if level.activeRoute}
                        <div class="graph-hierarchy-choices" aria-label={`${level.label} choices`}>
                          {#each level.choices as choice}
                            <button
                              type="button"
                              class:active={level.activeRoute === choice.route}
                              aria-current={level.activeRoute === choice.route ? 'step' : undefined}
                              aria-expanded={level.activeRoute === choice.route}
                              data-stack-route={choice.route}
                              onclick={() => toggleLargeGraphStack(choice.route)}
                            >
                              <span>{choice.label}</span>
                              <small>{choice.count.toLocaleString()}</small>
                              {#if level.activeRoute === choice.route}
                                <em>Open below ↓</em>
                              {/if}
                            </button>
                          {/each}
                        </div>
                      {:else}
                        <span class="graph-hierarchy-current">Shown in the graph below ↓</span>
                      {/if}
                    </div>
                  {/each}
                  </nav>
                {/if}
              </div>
              <svg
                class="graph"
                class:dragging={Boolean(graphDrag)}
                use:measureGraphViewport
                viewBox={graphViewBox()}
                role="group"
                aria-label="Large corpus graph"
                onpointerdown={beginGraphPan}
                onpointermove={moveGraphPan}
                onpointerup={endGraphPan}
                onpointercancel={endGraphPan}
                ondragstart={(event) => event.preventDefault()}
                onwheel={zoomGraphFromWheel}
              >
                <defs>
                  <marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#9aaaba"></path>
                  </marker>
                  <marker id="graph-arrow-highlight" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#1d70b8"></path>
                  </marker>
                </defs>
                {#if focusTitleLines.length}
                  <text class="graph-focus-title" x={graphCanvasWidth / 2} y="27" text-anchor="middle" aria-hidden="true">
                    {#each focusTitleLines as line, index}
                      <tspan x={graphCanvasWidth / 2} dy={index === 0 ? 0 : 19}>{line}</tspan>
                    {/each}
                  </text>
                {/if}
                {#each model.relationships as relationship}
                  {@const sourcePos = positions.get(relationship.source)}
                  {@const targetPos = positions.get(relationship.target)}
                  {#if sourcePos && targetPos}
                    {@const edgeHighlighted = shouldHighlightGraphEdge(relationship, model)}
                    {@const sourceNode = model.nodes.find((node) => node.id === relationship.source)}
                    {@const targetNode = model.nodes.find((node) => node.id === relationship.target)}
                    {@const edgePlan = edgePlans.get(graphEdgeKey(relationship))}
                    {@const edgeGeometry = quadraticEdgeGeometry(sourcePos, targetPos, graphNodeEdgePad(sourceNode), graphNodeEdgePad(targetNode), edgePlan?.bend || 0, edgePlan?.labelT || 0.5)}
                    <path
                      class="graph-edge"
                      class:highlight={edgeHighlighted}
                      class:selected={largeHighlightedEdge === graphEdgeKey(relationship)}
                      data-relationship-authority={relationship.authorityClass || 'unclassified'}
                      data-relationship-status={relationship.assertionStatus || 'unclassified'}
                      data-relationship-scope={relationship.assertionScope || 'unclassified'}
                      data-edge-width={graphEdgeStrokeWidth(relationship, edgeWeightPlan, edgeHighlighted)}
                      d={edgeGeometry.d}
                      marker-end={edgeHighlighted ? 'url(#graph-arrow-highlight)' : 'url(#graph-arrow)'}
                      style={`stroke-width:${graphEdgeStrokeWidth(relationship, edgeWeightPlan, edgeHighlighted)}px`}
                    ></path>
                    <path
                      class="edge-hit"
                      data-edge={graphEdgeKey(relationship)}
                      role="button"
                      tabindex="0"
                      aria-label={relationshipTitle(relationship)}
                      d={edgeGeometry.d}
                      onclick={(event) => inspectLargeGraphEdge(relationship, event)}
                      onkeydown={(event) => keyboardActivate(event, () => inspectLargeGraphEdge(relationship))}
                    >
                      <title>{relationshipTitle(relationship)}</title>
                    </path>
                  {/if}
                {/each}
                {#each model.nodes as node}
                  {@const pos = positions.get(node.id) || { x: graphCanvasWidth / 2, y: GRAPH_HEIGHT / 2 }}
                  {@const label = labels.get(graphNodeLabelKey(node.id))}
                  {@const relationshipRole = graphRelationshipNodeRole(node.id, model)}
                  <g
                    class="graph-node"
                    class:active={node.id === largeSelectedRoute || node.id === largeInspectedRoute || node.id === largeHighlightedRoute}
                    class:spotlight={node.id === largeHighlightedRoute}
                    class:relationship-source={relationshipRole === 'source' || relationshipRole === 'both'}
                    class:relationship-target={relationshipRole === 'target' || relationshipRole === 'both'}
                    data-type={node.type}
                    data-route={node.id}
                    data-relationship-side={relationshipPlan?.nodeSlots.get(node.id)?.side}
                    role="button"
                    aria-label={node.label || node.id}
                    tabindex="0"
                    onclick={(event) => graphNodeClick(node.id, event)}
                    ondblclick={() => recenterLargeRoute(node.id)}
                    onkeydown={(event) => keyboardActivate(event, () => graphNodeClick(node.id))}
                  >
                    <title>{node.label}</title>
                    {#if isGraphStackNodeType(node.type)}
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
                    {:else if node.type === 'publisher'}
                      <circle class="node-hit" cx={pos.x} cy={pos.y} r="22"></circle>
                      <rect class="node-symbol" x={pos.x - 15} y={pos.y - 11} width="30" height="23" rx="2" fill={largeTypeColor(node.type)}></rect>
                      <rect class="icon-cutout" x={pos.x - 10} y={pos.y - 5} width="4" height="11" rx="1"></rect>
                      <rect class="icon-cutout" x={pos.x - 2} y={pos.y - 5} width="4" height="11" rx="1"></rect>
                      <rect class="icon-cutout" x={pos.x + 6} y={pos.y - 5} width="4" height="11" rx="1"></rect>
                      <line class="icon-line" x1={pos.x - 17} y1={pos.y + 14} x2={pos.x + 17} y2={pos.y + 14}></line>
                    {:else if node.type === 'format'}
                      <circle class="node-hit" cx={pos.x} cy={pos.y} r="22"></circle>
                      <polygon class="node-symbol" points={`${pos.x - 15},${pos.y - 12} ${pos.x + 15},${pos.y - 12} ${pos.x + 21},${pos.y} ${pos.x + 15},${pos.y + 12} ${pos.x - 15},${pos.y + 12} ${pos.x - 21},${pos.y}`} fill={largeTypeColor(node.type)}></polygon>
                    {:else if node.type === 'topic'}
                      <circle class="node-hit" cx={pos.x} cy={pos.y} r="22"></circle>
                      <polygon class="node-symbol" points={`${pos.x},${pos.y - 18} ${pos.x + 18},${pos.y} ${pos.x},${pos.y + 18} ${pos.x - 18},${pos.y}`} fill={largeTypeColor(node.type)}></polygon>
                    {:else if node.type === 'license'}
                      <circle class="node-hit" cx={pos.x} cy={pos.y} r="22"></circle>
                      <path class="node-symbol" d={`M ${pos.x - 14} ${pos.y - 16} H ${pos.x + 14} V ${pos.y + 5} L ${pos.x} ${pos.y + 18} L ${pos.x - 14} ${pos.y + 5} Z`} fill={largeTypeColor(node.type)}></path>
                      <circle class="icon-cutout" cx={pos.x} cy={pos.y - 4} r="5"></circle>
                    {:else if node.type === 'tag'}
                      <circle class="node-hit" cx={pos.x} cy={pos.y} r="22"></circle>
                      <path class="node-symbol" d={`M ${pos.x - 17} ${pos.y - 7} L ${pos.x - 5} ${pos.y - 17} H ${pos.x + 16} V ${pos.y + 5} L ${pos.x + 5} ${pos.y + 16} Z`} fill={largeTypeColor(node.type)}></path>
                      <circle class="icon-cutout" cx={pos.x - 3} cy={pos.y - 8} r="3"></circle>
                    {:else if node.type === 'host' || node.type === 'resource_type'}
                      <circle class="node-hit" cx={pos.x} cy={pos.y} r="22"></circle>
                      <rect class="node-symbol" x={pos.x - 17} y={pos.y - 13} width="34" height="10" rx="3" fill={largeTypeColor(node.type)}></rect>
                      <rect class="node-symbol" x={pos.x - 17} y={pos.y + 2} width="34" height="10" rx="3" fill={largeTypeColor(node.type)}></rect>
                      <circle class="icon-cutout" cx={pos.x + 10} cy={pos.y - 8} r="2"></circle>
                      <circle class="icon-cutout" cx={pos.x + 10} cy={pos.y + 7} r="2"></circle>
                    {:else}
                      <circle class="node-hit" cx={pos.x} cy={pos.y} r="20"></circle>
                      <circle class="node-symbol" cx={pos.x} cy={pos.y} r={node.id === largeSelectedRoute ? 12 : 9} fill={largeTypeColor(node.type)}></circle>
                    {/if}
                  </g>
                {/each}
                <g class="graph-edge-label-layer">
                  {#each edgeLabelSpecs as edgeLabelSpec}
                    {@const edgeLabel = labels.get(graphEdgeLabelKey(edgeLabelSpec.id))}
                    {#if edgeLabel}
                      <text
                        class="edge-label"
                        class:rotating={!edgeLabel.stable}
                        data-label-key={edgeLabelSpec.id}
                        x={edgeLabel.x}
                        y={edgeLabel.y}
                        text-anchor={edgeLabel.anchor}
                      >{edgeLabel.text}</text>
                    {/if}
                  {/each}
                </g>
                <g class="graph-node-label-layer">
                  {#each model.nodes as node}
                    {@const label = labels.get(graphNodeLabelKey(node.id))}
                    {#if label}
                      <g
                        class="graph-node-label"
                        data-label-route={node.id}
                        data-relationship-side={relationshipPlan?.nodeSlots.get(node.id)?.side}
                        aria-hidden="true"
                        onclick={() => graphNodeClick(node.id)}
                        ondblclick={() => recenterLargeRoute(node.id)}
                      >
                        <rect class="label-hit" x={label.box.x} y={label.box.y} width={label.box.w} height={label.box.h} rx="4"></rect>
                        <text class:rotating={!label.stable} x={label.x} y={label.y} text-anchor={label.anchor}>{label.text}</text>
                      </g>
                    {/if}
                  {/each}
                </g>
              </svg>
              <details class="edge-panel edge-drawer" class:resizing={edgePanelResizing} style={`--edge-panel-height:${edgePanelHeight}px`} open>
                <summary
                  aria-label={`Relationships panel, ${model.relationships.length} relationships, ${edgePanelHeight} pixels high; use up and down arrows to resize`}
                  onpointerdown={beginEdgePanelResize}
                  onkeydown={resizeEdgePanelWithKeyboard}
                  onclick={suppressEdgePanelToggleFromGrip}
                >
                  <span
                    class="drawer-grip"
                    aria-hidden="true"
                    title="Drag to resize relationships"
                  ></span>
                  <strong>Relationships ({model.relationships.length})</strong>
                  <span>open for rows</span>
                </summary>
                <div class="relationship-rows">
                  {#each model.relationships.slice(0, 42) as relationship}
                    <button
                      class:active={largeHighlightedEdge === graphEdgeKey(relationship)}
                      data-relationship-authority={relationship.authorityClass || 'unclassified'}
                      data-relationship-status={relationship.assertionStatus || 'unclassified'}
                      data-relationship-scope={relationship.assertionScope || 'unclassified'}
                      type="button"
                      aria-pressed={largeHighlightedEdge === graphEdgeKey(relationship)}
                      onclick={() => inspectLargeEdge(relationship)}
                    >
                      {largeLabelForRoute(relationship.source)} → {relationship.label} → {largeLabelForRoute(relationship.target)}
                      <small>{relationship.authorityLabel || 'Authority not declared'}{relationship.assertionStatus ? ` · ${relationship.assertionStatus}` : ''}{relationship.assertionScope ? ` · ${relationship.assertionScope}` : ''} · {relationship.freshness || 'unknown'}</small>
                    </button>
                  {/each}
                </div>
              </details>
              <p class="graph-caption">
                {#if model.center && metadataFacetForRoute(model.center)}
                  Showing a bounded membership graph for {metadataRoutePreviewRecords(model.center, Number.MAX_SAFE_INTEGER).length.toLocaleString()} loaded of {datasetCountForMetadataRoute(model.center).toLocaleString()} exact index matches.
                {:else if model.center}
                  Showing {model.nodes.length} nodes directly related to {largeLabelForRoute(model.center)}.
                {:else}
                  Showing {model.nodes.length} nodes from the current left-panel reduction.
                {/if}
                {#if relationshipLayoutActive}
                  Relationship groups use the ordered regions shown above; hidden groups and members are excluded.
                {/if}
                {#if model.grouping}
                  {model.grouping.label} because this view has more than {GRAPH_STACK_THRESHOLD} related records{model.grouping.expandedLabel ? `; expanded ${model.grouping.expandedLabel}.` : '; click a record type stack to expand one group at a time.'}
                {/if}
                Drag to pan, use +/- or Ctrl/Command+wheel to zoom, click a stack to expand it, single-click real nodes to inspect, and double-click metadata nodes to reduce context.
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
                        {largeLabelForRoute(node.id)}<span>{node.count.toLocaleString()}</span>
                      </button>
                    {/each}
                  </article>
                </section>
              {/if}
            {:else}
              {@const boundedMetadataContext = largeHasBoundedMetadataRouteContext()}
              <div class="view-heading">
                <h2>Links</h2>
                <span>{largeRelationships.length ? 'full relationship chunks loaded' : boundedMetadataContext ? 'bounded current-facet links' : 'current graph relationships'}</span>
              </div>
              <section class="links-view">
                {#each currentLinkEdges() as relationship}
                  <button
                    data-relationship-authority={relationship.authorityClass || 'unclassified'}
                    data-relationship-status={relationship.assertionStatus || 'unclassified'}
                    data-relationship-scope={relationship.assertionScope || 'unclassified'}
                    type="button"
                    onclick={() => inspectLargeEdge(relationship)}
                  >
                    <strong>{largeLabelForRoute(relationship.source)}</strong>
                    <span>{relationship.label} · {relationship.authorityLabel || 'Authority not declared'}{relationship.assertionStatus ? ` · ${relationship.assertionStatus}` : ''}{relationship.assertionScope ? ` · ${relationship.assertionScope}` : ''}</span>
                    <strong>{largeLabelForRoute(relationship.target)}</strong>
                  </button>
                {:else}
                  <p class="muted">Select a record or apply a supported facet to load bounded links.</p>
                {/each}
                {#if !largeRelationships.length && !boundedMetadataContext}
                  <button type="button" onclick={() => void ensureLargeRelationships()}>
                    <strong>Load full relationship index</strong>
                    <span>{source.manifest.counts.relationships?.toLocaleString() || 'all'} relationships</span>
                    <strong>Use only when exact corpus-wide relationship rows are needed.</strong>
                  </button>
                {/if}
                {#if largeRelationshipsTruncated}
                  <p class="muted">Relationship index truncated to the first {MAX_RELATIONSHIP_ROWS.toLocaleString()} rows.</p>
                {/if}
              </section>
            {/if}
          {:else if activeView === 'timeline'}
            <div class="view-heading">
              <h2>Timeline</h2>
              <span>{largeIndex ? `${largeVisibleDatasets.length.toLocaleString()} ${recordPlural()} in current reduction` : `${(source.manifest.counts?.records ?? source.manifest.counts?.datasets ?? 0).toLocaleString()} ${recordPlural()} in overview`}</span>
            </div>
            <div class="timeline-toolbar" aria-label="Timeline resolution">
              {#each ['latest', 'year', 'quarter', 'month'] as resolution}
                <button class:active={timelineResolution === resolution} type="button" onclick={() => setTimelineResolution(resolution)}>
                  {resolution === 'latest' ? 'Releases' : capitalise(resolution)}
                </button>
              {/each}
              <span>{timelineResolution === 'latest' ? 'Series with release or coverage periods, newest first' : `Release coverage grouped by ${timelineResolution}, newest first`}</span>
            </div>
            {#if timelineResolution === 'latest' && largeIndex}
              <section class="timeline-view release-series-list" aria-label="Dataset release series">
                {#each currentTimelineBuckets().slice(0, 120) as bucket}
                  <article class="release-series">
                    <header>
                      <strong>{bucket.label}</strong>
                      <span>{bucket.count.toLocaleString()} {bucket.count === 1 ? 'release' : 'releases'}</span>
                    </header>
                    <div class="release-year-list" aria-label={`${bucket.label} releases`}>
                      {#each timelineReleaseYearGroups(bucket) as yearGroup}
                        <div class="release-year-row">
                          <strong>{yearGroup.year}</strong>
                          <div class="release-period-links">
                            {#each yearGroup.samples as item}
                              <a
                                class:catalogue-fallback={item.catalogueFallback}
                                href={buildExplorerUrl(item.route)}
                                title={item.catalogueFallback ? `${largeLabelForRoute(item.route)}; catalogue timestamp fallback` : largeLabelForRoute(item.route)}
                                onclick={(event) => followExplorerRoute(event, item.route)}
                              >{timelineReleaseLinkLabel(item)}</a>
                            {/each}
                          </div>
                        </div>
                      {/each}
                    </div>
                    {#if bucket.catalogueFallbackCount}
                      <small>{bucket.catalogueFallbackCount.toLocaleString()} period {bucket.catalogueFallbackCount === 1 ? 'uses' : 'use'} a catalogue timestamp fallback because coverage was not supplied.</small>
                    {/if}
                  </article>
                {:else}
                  <p class="muted">Release or coverage periods are not available for this bundle yet.</p>
                {/each}
              </section>
            {:else}
              <section class="timeline-view timeline-axis">
                {#each currentTimelineBuckets().slice(0, 120) as bucket, index}
                  <button style={`--row:${index}`} type="button" onclick={() => applyTimelineBucket(bucket)}>
                    <time>{bucket.label}</time>
                    <div>
                      <strong>{bucket.count.toLocaleString()} {bucket.count === 1 ? recordSingular() : recordPlural()}</strong>
                      <span>{bucket.samples.slice(0, 3).map((item) => largeLabelForRoute(item.route)).join(' · ')}</span>
                    </div>
                  </button>
                {:else}
                  <p class="muted">Timeline distribution is not available for this bundle yet.</p>
                {/each}
              </section>
            {/if}
            {#if timelineResolution !== 'latest'}
              <div class="timeline-note">
                These groups use declared coverage or release periods first, then title and resource evidence. Catalogue timestamps are only a labelled fallback.
              </div>
            {/if}
          {:else if activeView === 'type'}
            <div class="view-heading">
              <h2>Facets And Dimensions</h2>
              <span>{largeHasAnalysisOverview('type') ? 'provider order with local pin and reorder preferences' : 'filter chips affect every display'}</span>
            </div>
            <section class="type-view">
              {#if largeHasAnalysisOverview('type')}
                {#each orderedAnalysisFacetRowsForDisplay() as facet}
                  <article class:muted-card={facet.recommendation === 'suppressed'}>
                    <h2>{facetDisplayLabel(facet.key)}</h2>
                    <p class="muted">
                      {facet.recommendation} · {facet.recommended_control} · coverage {formatPercent(facet.coverage)} · cardinality {facet.cardinality.toLocaleString()} · expected reduction {formatPercent(facet.expected_reduction)}
                    </p>
                    {#each orderFacetRows(facet.values || [], facetValueOrder(facet.key), (value) => facetValueDisplay(facet.key, value)).slice(0, 12) as row}
                      <button type="button" onclick={() => applyAnalysisFacet(facet.key, row.value)}>
                        {facetValueDisplay(facet.key, row.value)}<span>{row.count.toLocaleString()}</span>
                      </button>
                    {/each}
                  </article>
                {/each}
                {#each (largeAnalysis()?.hierarchies || []) as hierarchy}
                  <article>
                    <h2>{hierarchy.label}</h2>
                    <p class="muted">{hierarchy.levels.join(' → ')}</p>
                    {#each hierarchy.values.slice(0, 10) as group}
                      <button type="button" onclick={() => void openHierarchyValue(hierarchy.facet, group.route || group.id, group.label)}>
                        {largeLabelForRoute(group.route || group.id)}<span>{group.count.toLocaleString()}</span>
                      </button>
                      {#each (group.children || []).slice(0, 5) as child}
                        <button class="child" type="button" onclick={() => void openHierarchyValue(hierarchy.facet, child.route || child.id, child.label)}>
                          {largeLabelForRoute(child.route || child.id)}<span>{child.count.toLocaleString()}</span>
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
                {#each providerOrderedLargeFacetKeys() as key}
                  <article>
                    <h2>{key.replaceAll('_', ' ')}</h2>
                    {#each largeFacetRows(key).slice(0, 12) as row}
                      <button
                        class:active={(largeFacetFilters[key] || []).includes(row.value)}
                        class:highlighted={facetValueIsHighlighted(key, row.value)}
                        type="button"
                        onclick={(event) => previewLargeFacetValue(key, row.value, event)}
                        ondblclick={(event) => void commitFacetHighlights(key, row.value, event)}
                        onkeydown={(event) => facetValueKeydown(key, row.value, event)}
                      >
                        {facetValueDisplay(key, row.value)}<span>{row.count.toLocaleString()}</span>
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
                      {largeLabelForRoute(stack.route)}<span>{stack.count.toLocaleString()} {resourcePlural()} · {stack.publisher ? largePublisherLabel(stack.publisher) : `unknown ${publisherSingular()}`}</span>
                    </button>
                  {:else}
                    <p class="muted">Resource-stack summaries are not available for this bundle yet.</p>
                  {/each}
                </section>
                <section>
                  <h3>Resource dimensions</h3>
                  {#each analysisResourceDistributionRows() as row}
                    <button type="button" onclick={() => applyAnalysisFacet(row.key, row.value)}>
                      {facetValueDisplay(row.key, row.value)}<span>{row.key} · {row.count.toLocaleString()}</span>
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
                      <strong>{largeLabelForRoute(datasetRoute(dataset))}</strong>
                      <span>{resources.length} {resourcePlural()} · {dataset.publisher ? largeLabelForRoute(publisherRoute(dataset.publisher)) : `unknown ${publisherSingular()}`}</span>
                    </button>
                    <div class="resource-stack">
                      {#each resources.slice(0, 12) as resource}
                        <button
                          class:highlight={largeHighlightedRoute === resourceRoute(resource)}
                          type="button"
                          onclick={() => { largeHighlightedRoute = resourceRoute(resource); inspectLargeRoute(resourceRoute(resource)); }}
                          ondblclick={() => recenterLargeRoute(resourceRoute(resource))}
                        >
                          <strong>{largeLabelForRoute(resourceRoute(resource))}</strong>
                          <span>{resource.format ? facetValueDisplay('format', resource.format) : 'unknown'} · {resource.host ? facetValueDisplay('host', resource.host) : 'unknown host'}</span>
                        </button>
                      {/each}
                      {#if resources.length > 12}<span class="chip">+{resources.length - 12} more</span>{/if}
                    </div>
                  </article>
                {/each}
              </section>
            {/if}
          {:else if activeView === 'map'}
            <MapView
              records={largeGeospatialRecords}
              filter={geospatialFilter}
              selectedRoute={largeInspectedRoute || largeSelectedRoute}
              loading={largeFullLoading}
              onselect={selectLargeRoute}
              onfilter={setGeospatialFilter}
            />
          {:else if activeView === 'narrative'}
            {@const analysis = largeAnalysis()}
            {@const selectedNarrative = largeDetail?.kind === 'dataset' ? recordNarrative(largeDetail.dataset) : null}
            <div class="view-heading">
              <h2>{currentLargeContextLabel()}</h2>
              <span>narrative context</span>
            </div>
            <section class="narrative-view">
              <article>
                <h3>{selectedNarrative?.title || analysis?.narrative?.title || analysis?.summary?.title || source.descriptor.title}</h3>
                {#if selectedNarrative}
                  <div class="markdown-body record-narrative-body">{@html renderSafeMarkdown(selectedNarrative.body, source.url)}</div>
                  <nav class="record-narrative-routes" aria-label="Enclosing process and related routes">
                    {#if selectedNarrative.process}
                      <section>
                        <strong>Enclosing process</strong>
                        <a href={buildExplorerUrl(selectedNarrative.process.route)} onclick={(event) => followExplorerRoute(event, selectedNarrative.process?.route || '')}>
                          {endpointLabelForRoute(source.endpointLabels, selectedNarrative.process.route, selectedNarrative.process.label || largeLabelForRoute(selectedNarrative.process.route))}
                        </a>
                        {#if selectedNarrative.process.description}<small>{selectedNarrative.process.description}</small>{/if}
                      </section>
                    {/if}
                    {#each narrativeRouteGroups(selectedNarrative) as group}
                      <section>
                        <strong>{group.label}</strong>
                        <div class="chips">
                          {#each group.links as link}
                            <a class="chip" href={buildExplorerUrl(link.route)} title={link.description || link.label || link.route} onclick={(event) => followExplorerRoute(event, link.route)}>
                              {endpointLabelForRoute(source.endpointLabels, link.route, link.label || largeLabelForRoute(link.route))}
                            </a>
                          {/each}
                        </div>
                      </section>
                    {/each}
                  </nav>
                {:else}
                  <p>
                    {#if largeIsOverviewContext() && analysis?.narrative?.body}
                    {analysis.narrative.body}
                    {:else if largeIndex}
                      The active context contains {largeVisibleDatasets.length.toLocaleString()} {recordPlural()} and {largeVisibleResources.length.toLocaleString()} visible {resourcePlural()} after the current search and facet reduction. Use the graph, links, timeline, resources, and map views to inspect the same reduced context from different angles.
                    {:else}
                      {analysis?.summary?.description || source.descriptor.description || 'This OKF Explorer view is using the lightweight overview payload until a search, filter, or deep link requires full-record hydration.'}
                    {/if}
                  </p>
                {/if}
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
                  <button type="button" onclick={() => void selectView('map')}>Map<span>spatial evidence, coverage and external data</span></button>
                </section>
                <section>
                  <h3>Strong dimensions</h3>
                  {#each orderedAnalysisFacetRowsForDisplay().filter((facet) => facet.recommendation !== 'suppressed').slice(0, 8) as facet}
                    <button type="button" onclick={() => { activeFacetKey = facet.key; void selectView('type'); }}>
                      {facetDisplayLabel(facet.key)}<span>{facet.recommendation} · {facet.recommended_control}</span>
                    </button>
                  {/each}
                </section>
                <section>
                  <h3>Representative values</h3>
                  {#each topContextFacetValues('publisher', 4) as row}
                    <button type="button" onclick={() => applyAnalysisFacet('publisher', row.value)}>{facetValueDisplay('publisher', row.value)}<span>{row.count.toLocaleString()} {recordPlural()}</span></button>
                  {/each}
                  {#each topContextFacetValues('format', 4) as row}
                    <button type="button" onclick={() => applyAnalysisFacet('format', row.value)}>{facetValueDisplay('format', row.value)}<span>{row.count.toLocaleString()} {recordPlural()}</span></button>
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
        {#if smallCorpus.assertionScope === 'synthetic-fixture'}
          <aside class="semantic-scope-notice" data-relationship-scope="synthetic-fixture" aria-label="Synthetic fixture boundary">
            <strong>Synthetic assurance fixture</strong>
            <span>Invented test assertions are isolated from faithful counts and search and load only when this corpus is opened explicitly.</span>
          </aside>
        {/if}
        {#if activeView === 'reader'}
          {#if federationOverview}
            <FederationOverviewPanel
              overview={federationOverview}
              oninspect={inspectNode}
              onloadchild={loadFederationChild}
            />
          {:else}
            <section class="reader-view">
              {#each visibleNodes as node}
                <button class="node-card" class:active={node.id === selectedId} type="button" onclick={() => inspectNode(node.id)} ondblclick={() => selectNode(node.id)}>
                  <span>{node.type || 'Node'}</span>
                  <h2>{node.title}</h2>
                  <p>{node.description || node.summary || node.source || node.id}</p>
                </button>
              {/each}
            </section>
          {/if}
        {:else if activeView === 'graph'}
          {@const model = graphModel()}
          {@const positions = graphPositions(model)}
          {@const edgePlans = smallGraphEdgePlans(model.relationships)}
          {@const edgeLabelSpecs = smallGraphEdgeLabelSpecs(model.relationships, positions, edgePlans)}
          {@const labelPlan = graphPresentationLayers(smallGraphLabelNodes(model.nodes), positions, edgeLabelSpecs, selectedId)}
          {@const labels = labelPlan.visible}
          <div class="graph-shell">
            <div class="graph-controls">
              <div class="graph-buttons" aria-label="Graph controls">
                <button type="button" aria-label="Zoom out" title="Zoom out" onclick={() => setGraphZoom(graphZoom / 1.2)}>−</button>
                <button type="button" aria-label="Reset graph zoom" title="Reset graph zoom" onclick={resetGraphView}>{Math.round(graphZoom * 100)}%</button>
                <button type="button" aria-label="Zoom in" title="Zoom in" onclick={() => setGraphZoom(graphZoom * 1.2)}>+</button>
                {#if labelPlan.layerCount > 1}
                  <button
                    type="button"
                    aria-label={graphLabelsPaused ? 'Resume cycling graph labels' : 'Pause cycling graph labels'}
                    aria-pressed={graphLabelsPaused}
                    title={graphLabelsPaused ? 'Resume cycling graph labels' : 'Pause cycling graph labels'}
                    onclick={() => (graphLabelsPaused = !graphLabelsPaused)}
                  >{graphLabelsPaused ? 'Cycle labels' : 'Pause labels'}</button>
                {/if}
              </div>
              <div class="graph-summary">
                <strong>{model.nodes.length}</strong> nodes · <strong>{model.relationships.length}</strong> relationships
                {#if labelPlan.layerCount > 1}
                  · label set <strong>{labelPlan.activeLayer + 1}/{labelPlan.layerCount}</strong>
                {/if}
              </div>
              <div class="legend" aria-label="Node type key">
                {#each typeList.slice(0, 8) as type}
                  <span><i class={`legend-shape legend-${type}`} style={`background:${colorForType(type)}`}></i>{type}</span>
                {/each}
              </div>
            </div>
            <svg
              class="graph"
              class:dragging={Boolean(graphDrag)}
              use:measureGraphViewport
              viewBox={graphViewBox()}
              role="group"
              aria-label="OKF graph"
              onpointerdown={beginGraphPan}
              onpointermove={moveGraphPan}
              onpointerup={endGraphPan}
              onpointercancel={endGraphPan}
              ondragstart={(event) => event.preventDefault()}
              onwheel={zoomGraphFromWheel}
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
                  {@const edgePlan = edgePlans.get(smallGraphEdgeKey(relationship))}
                  {@const edgeGeometry = quadraticEdgeGeometry(sourcePos, targetPos, 28, 28, edgePlan?.bend || 0, edgePlan?.labelT || 0.5)}
                  {@const edgeLabel = labels.get(graphEdgeLabelKey(smallGraphEdgeKey(relationship)))}
                  <path
                    class="graph-edge"
                    class:highlight={edgeHighlighted}
                    data-relationship-authority={relationshipPresentation(relationship).authorityClass}
                    data-relationship-status={relationshipPresentation(relationship).assertionStatus}
                    data-relationship-scope={relationshipPresentation(relationship).assertionScope}
                    d={edgeGeometry.d}
                    marker-end={edgeHighlighted ? 'url(#small-graph-arrow-highlight)' : 'url(#small-graph-arrow)'}
                  />
                  <path
                    class="edge-hit"
                    data-edge={smallGraphEdgeKey(relationship)}
                    role="button"
                    tabindex="0"
                    aria-label={smallRelationshipTitle(relationship)}
                    d={edgeGeometry.d}
                    onclick={() => inspectSmallGraphRelationship(relationship)}
                    onkeydown={(event) => keyboardActivate(event, () => inspectSmallGraphRelationship(relationship))}
                  >
                    <title>{smallRelationshipTitle(relationship)}</title>
                  </path>
                  {#if edgeLabel}
                    <text class="edge-label" class:rotating={!edgeLabel.stable} data-label-key={smallGraphEdgeKey(relationship)} x={edgeLabel.x} y={edgeLabel.y} text-anchor={edgeLabel.anchor}>
                      {edgeLabel.text}
                    </text>
                  {/if}
                {/if}
              {/each}
              {#each model.nodes as node}
                {@const pos = positions.get(node.id) || { x: graphCanvasWidth / 2, y: GRAPH_HEIGHT / 2 }}
                {@const label = labels.get(graphNodeLabelKey(node.id))}
                <g
                  class:active={node.id === selectedId || node.id === inspectedId}
                  data-route={node.id}
                  role="button"
                  aria-label={String(node.label || node.id)}
                  tabindex="0"
                  onclick={() => smallGraphNodeClick(node.id)}
                  ondblclick={() => selectNode(node.id)}
                  onkeydown={(event) => keyboardActivate(event, () => smallGraphNodeClick(node.id))}
                >
                  <circle cx={pos.x} cy={pos.y} r={node.id === selectedId ? 15 : 10}></circle>
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
                  {@const presentation = relationshipPresentation(relationship)}
                  <button
                    class:active={smallInspectedRelationship === relationship}
                    data-relationship-authority={presentation.authorityClass}
                    data-relationship-status={presentation.assertionStatus}
                    data-relationship-scope={presentation.assertionScope}
                    type="button"
                    onclick={() => inspectSmallRelationship(relationship)}
                  >
                    {smallRelationshipTitle(relationship)}
                    <small>{presentation.authorityLabel}{presentation.assertionStatus !== 'unclassified' ? ` · ${presentation.assertionStatus}` : ''}{presentation.assertionScope !== 'unclassified' ? ` · ${presentation.assertionScope}` : ''} · {presentation.freshness}</small>
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {:else if activeView === 'links'}
          <div class="relationship-authority-strip" aria-label="Visible relationship authority summary">
            <span data-relationship-authority="official">Official <strong>{scopedRelationshipSummary.by_authority.official.toLocaleString()}</strong></span>
            <span data-relationship-authority="derived">Derived <strong>{scopedRelationshipSummary.by_authority.derived.toLocaleString()}</strong></span>
            <span data-relationship-authority="model-assisted">Model-assisted <strong>{scopedRelationshipSummary.by_authority['model-assisted'].toLocaleString()}</strong></span>
            {#if scopedRelationshipSummary.by_authority.synthetic}
              <span data-relationship-authority="synthetic">Synthetic fixture <strong>{scopedRelationshipSummary.by_authority.synthetic.toLocaleString()}</strong></span>
            {/if}
            {#if scopedRelationshipSummary.by_authority.unclassified}
              <span data-relationship-authority="unclassified">Unclassified <strong>{scopedRelationshipSummary.by_authority.unclassified.toLocaleString()}</strong></span>
            {/if}
          </div>
          <section class="links-view">
            {#each scopedRelationships as relationship}
              {@const presentation = relationshipPresentation(relationship)}
              <button
                data-relationship-authority={presentation.authorityClass}
                data-relationship-status={presentation.assertionStatus}
                data-relationship-scope={presentation.assertionScope}
                type="button"
                onclick={() => inspectSmallRelationship(relationship)}
                ondblclick={() => selectNode(relationship.target)}
              >
                <strong>{smallCorpus.nodes[relationship.source]?.title || relationship.source}</strong>
                <span>{smallRelationshipKind(relationship)} · {presentation.authorityLabel}{presentation.assertionStatus !== 'unclassified' ? ` · ${presentation.assertionStatus}` : ''}{presentation.assertionScope !== 'unclassified' ? ` · ${presentation.assertionScope}` : ''}</span>
                <strong>{smallCorpus.nodes[relationship.target]?.title || relationship.target}</strong>
              </button>
            {/each}
          </section>
        {:else if activeView === 'timeline'}
          {@const conversation = conversationPresentation(detailNode)}
          {#if conversation}
            <section class="conversation-timeline" aria-label={`Conversation timeline for ${detailNode?.title || 'selected exchange'}`}>
              <header>
                <h2>{detailNode?.title}</h2>
                <p>Prompt and responses in recorded order.</p>
              </header>
              <article class="conversation-event prompt-event">
                <div><strong>User prompt</strong><time>{String(detailNode?.timestamp || '')}</time></div>
                <section class="markdown-body">{@html renderSafeMarkdown(conversation.prompt, source?.kind === 'small' ? source.url : '')}</section>
              </article>
              {#each conversation.responses as response}
                <article class:final-event={response.kind === 'final_answer'} class="conversation-event">
                  <div><strong>Response {response.number} ({response.kind})</strong><time>{response.timestamp}</time></div>
                  <section class="markdown-body">{@html renderSafeMarkdown(response.text, source?.kind === 'small' ? source.url : '')}</section>
                </article>
              {/each}
            </section>
          {:else}
            <section class="timeline-view">
              {#each visibleNodes.filter((node) => conceptGenerated(node).at).sort((a, b) => conceptGenerated(b).at.localeCompare(conceptGenerated(a).at)).slice(0, 120) as node}
                <button type="button" onclick={() => inspectNode(node.id)}>
                  <time>{conceptGenerated(node).at.slice(0, 10)}</time>
                  <div><strong>{node.title}</strong><span>{node.type || 'Node'}</span></div>
                </button>
              {/each}
            </section>
          {/if}
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
        {:else if activeView === 'map'}
          <MapView
            records={smallGeospatialRecords}
            filter={geospatialFilter}
            selectedRoute={inspectedId || selectedId}
            onselect={selectNode}
            onfilter={setGeospatialFilter}
          />
        {:else if activeView === 'narrative'}
          {@const conversation = conversationPresentation(detailNode)}
          {#if conversation}
            <section class="conversation-narrative" aria-label={`Conversation narrative for ${detailNode?.title || 'selected exchange'}`}>
              <header>
                <h2>{detailNode?.title}</h2>
                <p>The question and final answer are foregrounded; commentary remains below in recorded order.</p>
              </header>
              <div class="conversation-pair">
                <article class="conversation-card prompt-card">
                  <h3>User prompt</h3>
                  <div class="markdown-body">{@html renderSafeMarkdown(conversation.prompt, source?.kind === 'small' ? source.url : '')}</div>
                </article>
                <article class="conversation-card final-card">
                  <h3>{conversation.final?.kind === 'final_answer' ? 'Final answer' : 'Latest response'}</h3>
                  {#if conversation.final?.timestamp}<time>{conversation.final.timestamp}</time>{/if}
                  <div class="markdown-body">{@html renderSafeMarkdown(conversation.final?.text || '_No response captured._', source?.kind === 'small' ? source.url : '')}</div>
                </article>
              </div>
              <section class="conversation-commentary">
                <h3>Commentary timeline</h3>
                {#each conversation.commentary as response}
                  <article class="conversation-card commentary-card">
                    <div><strong>Response {response.number}</strong><time>{response.timestamp}</time></div>
                    <div class="markdown-body">{@html renderSafeMarkdown(response.text, source?.kind === 'small' ? source.url : '')}</div>
                  </article>
                {:else}
                  <p class="muted">No commentary responses were captured.</p>
                {/each}
              </section>
            </section>
          {:else}
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
                  <button type="button" onclick={() => void selectView('map')}>Map<span>spatial evidence and coverage</span></button>
                </section>
              </div>
            </section>
          {/if}
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
        {#if rightCollapsed}
          <span class="panel-rail-label" title={source?.kind === 'large' ? largeLabelForRoute(largeInspectedRoute || largeSelectedRoute) : detailNode?.title || 'Details'}>
            {source?.kind === 'large' ? largeLabelForRoute(largeInspectedRoute || largeSelectedRoute) || 'Details' : detailNode?.title || 'Details'}
          </span>
        {/if}
      </div>
      <div class="detail">
        {#if source?.kind === 'large'}
          {#if largeInspectedEdge}
            {@const relationshipEdges = inspectedRelationshipEdges()}
            {@const selectedRelationship = largeInspectedEdge}
            {@const selectedRelationshipPresentation = relationshipPresentation(selectedRelationship)}
            <span class="badge">Relationship</span>
            <span class="badge" data-relationship-authority={selectedRelationshipPresentation.authorityClass}>{selectedRelationshipPresentation.authorityLabel}</span>
            {#if selectedRelationshipPresentation.assertionStatus !== 'unclassified'}
              <span class="badge" data-relationship-status={selectedRelationshipPresentation.assertionStatus}>{selectedRelationshipPresentation.assertionStatus}</span>
            {/if}
            {#if selectedRelationshipPresentation.assertionScope !== 'unclassified'}
              <span class="badge" data-relationship-scope={selectedRelationshipPresentation.assertionScope}>{selectedRelationshipPresentation.assertionScope}</span>
            {/if}
            <span class="badge" data-relationship-freshness={selectedRelationshipPresentation.freshness}>{selectedRelationshipPresentation.freshness}</span>
            <h2>{selectedRelationship.label}</h2>
            <p>
              {graphHighlightedRelationshipGroup
                ? `${relationshipEdges.length.toLocaleString()} highlighted ${relationshipEdges.length === 1 ? 'relationship' : 'relationships'}`
                : relationshipTitle(selectedRelationship)}
            </p>
            <div class="detail-actions">
              <button type="button" onclick={clearInspection}>Clear relationship</button>
            </div>
            <div class="detail-tabs relationship-detail-tabs" role="tablist" aria-label="Relationship data card">
              {#each ['source', 'relationship', 'target'] as tab}
                <button
                  role="tab"
                  type="button"
                  aria-selected={relationshipDetailTab === tab}
                  class:active={relationshipDetailTab === tab}
                  onclick={() => (relationshipDetailTab = tab as RelationshipDetailTab)}
                >{capitalise(tab)}</button>
              {/each}
            </div>
            <div class="relationship-detail-content" role="tabpanel" tabindex="0">
              {#if relationshipDetailTab === 'source'}
                {@const sourceEndpointLabel = endpointLabelEntryForInspection(source.endpointLabels, selectedRelationship.source)}
                <span class="badge">{routeTypeLabel(selectedRelationship.source)}</span>
                <h3>{largeLabelForRoute(selectedRelationship.source)}</h3>
                <p>{relationshipEndpointDescription(selectedRelationship.source)}</p>
                <dl>
                  <dt>Role</dt><dd>Source of the selected relationship</dd>
                  <dt>Route</dt><dd>{selectedRelationship.source}</dd>
                  {#if sourceEndpointLabel?.iri}<dt>IRI</dt><dd>{sourceEndpointLabel.iri}</dd>{/if}
                  {#if sourceEndpointLabel}<dt>Label authority</dt><dd>{sourceEndpointLabel.label_authority.class} · {sourceEndpointLabel.label_authority.source}</dd>{/if}
                </dl>
                <button type="button" onclick={() => inspectLargeRoute(selectedRelationship.source)}>Inspect source card</button>
              {:else if relationshipDetailTab === 'target'}
                {@const targetEndpointLabel = endpointLabelEntryForInspection(source.endpointLabels, selectedRelationship.target)}
                <span class="badge">{routeTypeLabel(selectedRelationship.target)}</span>
                <h3>{largeLabelForRoute(selectedRelationship.target)}</h3>
                <p>{relationshipEndpointDescription(selectedRelationship.target)}</p>
                <dl>
                  <dt>Role</dt><dd>Target of the selected relationship</dd>
                  <dt>Route</dt><dd>{selectedRelationship.target}</dd>
                  {#if targetEndpointLabel?.iri}<dt>IRI</dt><dd>{targetEndpointLabel.iri}</dd>{/if}
                  {#if targetEndpointLabel}<dt>Label authority</dt><dd>{targetEndpointLabel.label_authority.class} · {targetEndpointLabel.label_authority.source}</dd>{/if}
                </dl>
                <button type="button" onclick={() => inspectLargeRoute(selectedRelationship.target)}>Inspect target card</button>
              {:else}
                <dl>
                  <dt>Direction</dt><dd>Source → relationship → target</dd>
                  <dt>Type</dt><dd>{selectedRelationship.label}</dd>
                  {#if selectedRelationshipPresentation.id}<dt>Assertion ID</dt><dd>{selectedRelationshipPresentation.id}</dd>{/if}
                  {#if selectedRelationship.predicate}<dt>Predicate</dt><dd>{selectedRelationship.predicate}</dd>{/if}
                  {#if selectedRelationshipPresentation.inverseLabel}<dt>Inverse label</dt><dd>{selectedRelationshipPresentation.inverseLabel}</dd>{/if}
                  {#if selectedRelationshipPresentation.sourceIri}<dt>Source IRI</dt><dd>{#if isUrl(selectedRelationshipPresentation.sourceIri)}<a href={selectedRelationshipPresentation.sourceIri} target="_blank" rel="noopener noreferrer">{selectedRelationshipPresentation.sourceIri}</a>{:else}{selectedRelationshipPresentation.sourceIri}{/if}</dd>{/if}
                  {#if selectedRelationshipPresentation.targetIri}<dt>Target IRI</dt><dd>{#if isUrl(selectedRelationshipPresentation.targetIri)}<a href={selectedRelationshipPresentation.targetIri} target="_blank" rel="noopener noreferrer">{selectedRelationshipPresentation.targetIri}</a>{:else}{selectedRelationshipPresentation.targetIri}{/if}</dd>{/if}
                  {#if selectedRelationshipPresentation.assertionStatus !== 'unclassified'}<dt>Assertion status</dt><dd>{selectedRelationshipPresentation.assertionStatus}</dd>{/if}
                  {#if selectedRelationshipPresentation.assertionScope !== 'unclassified'}<dt>Assertion scope</dt><dd>{selectedRelationshipPresentation.assertionScope}</dd>{/if}
                  {#if selectedRelationship.count}<dt>Count</dt><dd>{selectedRelationship.count.toLocaleString()}</dd>{/if}
                  {#if selectedRelationship.weightValue !== undefined}
                    <dt>{selectedRelationship.weightMetric || 'Strength'}</dt><dd>{graphWeightValue(selectedRelationship.weightValue)}</dd>
                  {/if}
                  <dt>Authority</dt><dd>{selectedRelationshipPresentation.authorityLabel}</dd>
                  {#if selectedRelationshipPresentation.authoritySource}<dt>Authority source</dt><dd>{#if isUrl(selectedRelationshipPresentation.authoritySource)}<a href={selectedRelationshipPresentation.authoritySource} target="_blank" rel="noopener noreferrer">{selectedRelationshipPresentation.authoritySource}</a>{:else}{selectedRelationshipPresentation.authoritySource}{/if}</dd>{/if}
                  {#if selectedRelationshipPresentation.derivation}<dt>Derivation</dt><dd>{#if isUrl(selectedRelationshipPresentation.derivation)}<a href={selectedRelationshipPresentation.derivation} target="_blank" rel="noopener noreferrer">{selectedRelationshipPresentation.derivation}</a>{:else}{selectedRelationshipPresentation.derivation}{/if}</dd>{/if}
                  {#if selectedRelationshipPresentation.derivationActivity}<dt>Derivation activity</dt><dd>{#if isUrl(selectedRelationshipPresentation.derivationActivity)}<a href={selectedRelationshipPresentation.derivationActivity} target="_blank" rel="noopener noreferrer">{selectedRelationshipPresentation.derivationActivity}</a>{:else}{selectedRelationshipPresentation.derivationActivity}{/if}</dd>{/if}
                  {#if selectedRelationshipPresentation.rule}<dt>Rule</dt><dd>{#if isUrl(selectedRelationshipPresentation.rule)}<a href={selectedRelationshipPresentation.rule} target="_blank" rel="noopener noreferrer">{selectedRelationshipPresentation.rule}</a>{:else}{selectedRelationshipPresentation.rule}{/if}</dd>{/if}
                  {#if selectedRelationshipPresentation.supportingAssertions.length}<dt>Supporting assertions</dt><dd>{selectedRelationshipPresentation.supportingAssertions.join(', ')}</dd>{/if}
                  {#if selectedRelationshipPresentation.confidence}<dt>Confidence</dt><dd>{selectedRelationshipPresentation.confidence}</dd>{/if}
                  {#if selectedRelationshipPresentation.observedAt}<dt>Observed</dt><dd>{selectedRelationshipPresentation.observedAt}</dd>{/if}
                  {#if selectedRelationshipPresentation.staleAfter}<dt>Stale after</dt><dd>{selectedRelationshipPresentation.staleAfter}</dd>{/if}
                  <dt>Freshness</dt><dd>{selectedRelationshipPresentation.freshness}</dd>
                  {#if selectedRelationshipPresentation.rightsSource}<dt>Rights source</dt><dd>{#if isUrl(selectedRelationshipPresentation.rightsSource)}<a href={selectedRelationshipPresentation.rightsSource} target="_blank" rel="noopener noreferrer">{selectedRelationshipPresentation.rightsSource}</a>{:else}{selectedRelationshipPresentation.rightsSource}{/if}</dd>{/if}
                  {#if selectedRelationshipPresentation.rightsAssertion}<dt>Rights assertion</dt><dd>{selectedRelationshipPresentation.rightsAssertion}</dd>{/if}
                </dl>
                {#if selectedRelationshipPresentation.authorityClass === 'model-assisted' && selectedRelationshipPresentation.evidenceItems.length}
                  <section
                    class="model-assisted-provenance"
                    aria-label="Model-assisted relationship provenance"
                    data-support-profile={selectedRelationshipPresentation.supportProfile || 'unspecified'}
                  >
                    <h3>Model-assisted provenance</h3>
                    <p>
                      Governed discovery metadata, not an official legal effect or legal
                      classification. Official effects are presented separately.
                    </p>
                    <dl>
                      {#if selectedRelationshipPresentation.supportProfile}
                        <dt>Support profile</dt>
                        <dd>{selectedRelationshipPresentation.supportProfile}</dd>
                      {/if}
                      {#if selectedRelationshipPresentation.reviewStatus}
                        <dt>Review status</dt>
                        <dd>{selectedRelationshipPresentation.reviewStatus}</dd>
                      {/if}
                      <dt>Official legal classification</dt>
                      <dd>{selectedRelationshipPresentation.officialLegalClassification === false ? 'No' : 'Not declared'}</dd>
                    </dl>
                    <div class="model-evidence-list">
                      {#each selectedRelationshipPresentation.evidenceItems as evidence, evidenceIndex}
                        <article
                          data-evidence-index={evidenceIndex}
                          data-evidence-source-field={evidence.sourceField || 'unspecified'}
                        >
                          <strong>{evidence.sourceField ? `${capitalise(evidence.sourceField)} evidence` : `Evidence ${evidenceIndex + 1}`}</strong>
                          {#if evidence.value}<span>Matched literal: “{evidence.value}”</span>{/if}
                          {#if evidence.sourceValue}
                            <p>{evidence.sourceValue.slice(0, 600)}{evidence.sourceValue.length > 600 ? '…' : ''}</p>
                          {/if}
                          {#if evidence.fieldProvenance}<small>{evidence.fieldProvenance}</small>{/if}
                          {#if evidence.sourceArtifact}<small>Artefact {evidence.sourceArtifact}</small>{/if}
                          {#if evidence.sourceSha256}<small>Artefact SHA-256 <code>{evidence.sourceSha256}</code></small>{/if}
                          {#if evidence.locator}<small>Locator <code>{evidence.locator}</code></small>{/if}
                          {#if evidence.retrievedAt}<small>Retrieved {evidence.retrievedAt}</small>{/if}
                          {#if evidence.normalization}<small>{evidence.normalization}</small>{/if}
                          {#if evidence.ruleId || evidence.rationale}
                            <small>{[evidence.ruleId, evidence.rationale].filter(Boolean).join(' · ')}</small>
                          {/if}
                          {#if evidence.url}
                            <a href={evidence.url} target="_blank" rel="noopener noreferrer">Official source record</a>
                          {/if}
                        </article>
                      {/each}
                    </div>
                  </section>
                {:else if selectedRelationshipPresentation.evidenceItems.length}
                  <h3>Relationship evidence and provenance</h3>
                  <div class="model-evidence-list">
                    {#each selectedRelationshipPresentation.evidenceItems as evidence, evidenceIndex}
                      <article data-evidence-index={evidenceIndex} data-evidence-source-field={evidence.sourceField || 'unspecified'}>
                        <strong>{evidence.sourceField || `Evidence ${evidenceIndex + 1}`}</strong>
                        {#if evidence.sourceArtifact}<small>Artefact {evidence.sourceArtifact}</small>{/if}
                        {#if evidence.sourceSha256}<small>Artefact SHA-256 <code>{evidence.sourceSha256}</code></small>{/if}
                        {#if evidence.locator}<small>Locator <code>{evidence.locator}</code></small>{/if}
                        {#if evidence.retrievedAt}<small>Retrieved {evidence.retrievedAt}</small>{/if}
                        {#if evidence.fieldProvenance}<small>{evidence.fieldProvenance}</small>{/if}
                        {#if evidence.url}<a href={evidence.url} target="_blank" rel="noopener noreferrer">Source evidence</a>{/if}
                      </article>
                    {/each}
                  </div>
                {/if}
                {#if relationshipEdges.length > 1}
                  <div class="relationship-instance-list" aria-label="Highlighted relationship instances">
                    {#each relationshipEdges as edge}
                      <button
                        type="button"
                        class:active={graphEdgeKey(edge) === graphEdgeKey(selectedRelationship)}
                        onclick={() => selectInspectedRelationshipEdge(edge)}
                      >
                        <span>{largeLabelForRoute(edge.source)}</span>
                        <small>{edge.label} → {largeLabelForRoute(edge.target)}</small>
                      </button>
                    {/each}
                  </div>
                {/if}
                <details class="json-panel">
                  <summary>Relationship JSON</summary>
                  <pre>{jsonText({
                    source: selectedRelationship.source,
                    target: selectedRelationship.target,
                    id: selectedRelationshipPresentation.id,
                    source_iri: selectedRelationshipPresentation.sourceIri,
                    target_iri: selectedRelationshipPresentation.targetIri,
                    kind: selectedRelationship.label,
                    predicate: selectedRelationship.predicate,
                    inverse_label: selectedRelationshipPresentation.inverseLabel,
                    assertion_status: selectedRelationshipPresentation.assertionStatus,
                    assertion_scope: selectedRelationshipPresentation.assertionScope,
                    count: selectedRelationship.count,
                    weight: selectedRelationship.weightValue,
                    authority: selectedRelationshipPresentation.authorityClass,
                    authority_source: selectedRelationshipPresentation.authoritySource,
                    derivation: selectedRelationshipPresentation.derivation,
                    derivation_activity: selectedRelationshipPresentation.derivationActivity,
                    rule: selectedRelationshipPresentation.rule,
                    supporting_assertions: selectedRelationshipPresentation.supportingAssertions,
                    confidence: selectedRelationshipPresentation.confidence,
                    observed_at: selectedRelationshipPresentation.observedAt,
                    stale_after: selectedRelationshipPresentation.staleAfter,
                    freshness: selectedRelationshipPresentation.freshness,
                    support_profile: selectedRelationshipPresentation.supportProfile,
                    review_status: selectedRelationshipPresentation.reviewStatus,
                    official_legal_classification: selectedRelationshipPresentation.officialLegalClassification,
                    evidence: selectedRelationshipPresentation.evidenceItems,
                    rights:
                      selectedRelationshipPresentation.rightsSource ||
                      selectedRelationshipPresentation.rightsAssertion
                        ? {
                            source: selectedRelationshipPresentation.rightsSource,
                            assertion: selectedRelationshipPresentation.rightsAssertion
                          }
                        : selectedRelationshipPresentation.rights
                  })}</pre>
                </details>
              {/if}
            </div>
          {:else if largeDetail}
            {#if largeDetail.kind === 'dataset'}
              {@const dateContext = datasetDateContext(largeDetail.dataset, largeDetail.resources)}
              {@const operationalContext = datasetOperationalContext(largeDetail.dataset, largeDetail.resources)}
              {@const releasePeriod = datasetReleasePeriod(largeDetail.dataset, largeDetail.resources)}
              {@const displaySeries = datasetDisplaySeries(largeDetail.dataset)}
              {@const displaySeriesLabel = governedDisplaySeriesLabel(largeDetail.dataset, displaySeries)}
              {@const seriesPeers = relatedDisplaySeriesDatasets(largeDetail.dataset, largeIndex?.datasets || [])}
              {@const distinctAlternatives = distinctDatasetAlternatives(largeDetail.dataset)}
              {@const sourceAccessRows = sourceAccesses(largeDetail.dataset, largeDetail.resources)}
              <span class="badge">{capitalise(recordSingular())}</span>
              <h2>{largeLabelForRoute(largeDetail.route)}</h2>
              {#if datasetMatchReason(largeDetail.dataset)}
                <p class="match-explanation"><strong>Why this matched</strong> {datasetMatchReason(largeDetail.dataset)}</p>
              {/if}
              {#if apiContextNote(largeDetail.dataset)}
                <p class="context-note">{apiContextNote(largeDetail.dataset)}</p>
              {/if}
              {#if seriesPeers.length || distinctAlternatives.length}
                <section class="dataset-comparison" aria-label="Release and dataset comparison">
                  <header>
                    <div>
                      <strong>{displaySeriesLabel}</strong>
                      <span>{displaySeries.inferred ? 'Presentation grouping from release-labelled titles' : 'Declared dataset series'}</span>
                    </div>
                    {#if releasePeriod}<span class="selected-release">{releasePeriod.label} selected</span>{/if}
                  </header>
                  {#if seriesPeers.length}
                    <div class="comparison-group">
                      <h3>Other releases</h3>
                      <nav class="release-period-links" aria-label={`Other ${displaySeriesLabel} releases`}>
                        {#each seriesPeers.slice(0, 24) as peer}
                          {@const peerPeriod = datasetReleasePeriod(peer, largeIndex?.resourcesByDataset.get(peer.name) || [])}
                          <a
                            href={buildExplorerUrl(datasetRoute(peer))}
                            title={largeDatasetLabel(peer)}
                            onclick={(event) => followExplorerRoute(event, datasetRoute(peer))}
                          >{peerPeriod?.label || largeDatasetLabel(peer)}</a>
                        {/each}
                      </nav>
                    </div>
                  {/if}
                  {#if distinctAlternatives.length}
                    <div class="comparison-group">
                      <h3>Alternative datasets</h3>
                      <div class="comparison-alternatives">
                        {#each distinctAlternatives.slice(0, 6) as alternative}
                          {@const candidate = alternativeDataset(alternative)}
                          {@const route = alternativeRoute(alternative)}
                          <article>
                            <a href={buildExplorerUrl(route)} onclick={(event) => followExplorerRoute(event, route)}>{largeDatasetLabel(candidate)}</a>
                            <span>{alternative.relationship_type === 'cross-source-alternative' ? 'Different source' : 'Suggested alternative'}</span>
                            {#if alternativeDifferenceSummary(alternative).length}
                              <small>{alternativeDifferenceSummary(alternative).join(' · ')}</small>
                            {/if}
                          </article>
                        {/each}
                      </div>
                    </div>
                  {/if}
                  {#if displaySeries.inferred}
                    <small class="comparison-caveat">This release grouping is a display aid, not an asserted semantic identity. Bundles should declare stable series identifiers or SKOS hierarchy relationships when known.</small>
                  {/if}
                </section>
              {/if}
              {#if dateContext.updated || dateContext.years.length}
                <p class="record-date-summary">
                  {#if dateContext.updated}
                    <span><strong>{dateContext.updatedLabel}</strong> <time datetime={dateContext.updated}>{sourceDateLabel(dateContext.updated)}</time></span>
                  {/if}
                  {#if dateContext.years.length}
                    <span><strong>{dateContext.years.length === 1 ? 'Resource year' : 'Resource years'}</strong> {dateContext.years.join(', ')}</span>
                  {/if}
                  {#if dateContext.catalogueMetadata}
                    <small>Catalogue date — not necessarily the dataset’s latest release or update frequency.</small>
                  {/if}
                </p>
              {/if}
              <p>{stripHtml(largeDetail.dataset.notes || '')}</p>
              {#each providerDatapacksForRecord(source.providerDatapacks, largeDetail.dataset) as providerDatapack}
                <ProviderDatapackStatus
                  pack={providerDatapack}
                  record={largeDetail.dataset}
                  scope="record"
                />
              {/each}
              <div class="detail-actions">
                <button type="button" onclick={() => recenterLargeRoute(largeDetail.route)}>Graph</button>
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
                <button type="button" onclick={() => copyRoute(largeDetail.route)}>Copy route</button>
                {#each sourceAccessRows as access}
                  {#if canDisplaySourceInline(access)}
                    <button class="primary-action" type="button" title={access.label} onclick={() => void loadLargeSource(largeDetail.route, access)}>
                      {largeApiRoute === largeDetail.route && largeApiUrl === access.url && largeApiLoading ? 'Loading source data…' : 'View source data'}
                    </button>
                  {/if}
                  <a class="button" href={access.url} target="_blank" rel="noopener noreferrer">{sourceOpenLabel(access)}</a>
                {/each}
                {#if largeInspectedRoute}<button type="button" onclick={clearInspection}>{largeSelectedRoute ? 'Back to selected card' : 'Clear inspection'}</button>{/if}
              </div>
              <div class="detail-tabs" role="tablist" aria-label="Data card sections">
                {#each detailPanelTabs() as tab}
                  <button
                    id={`detail-tab-${tab}`}
                    role="tab"
                    type="button"
                    aria-selected={detailPanelTab === tab}
                    aria-controls="detail-card-content"
                    tabindex={detailPanelTab === tab ? 0 : -1}
                    class:active={detailPanelTab === tab}
                    onclick={() => selectDetailPanelTab(tab)}
                    onkeydown={(event) => detailPanelTabKeydown(event, tab)}
                  >{detailPanelTabLabel(tab)}</button>
                {/each}
              </div>
              <div
                id="detail-card-content"
                role="tabpanel"
                tabindex="0"
                aria-labelledby={`detail-tab-${detailPanelTab}`}
              >
              {#if detailPanelTab === 'overview'}
                <HeritageDetail record={largeDetail.dataset} />
              {/if}
              {#if operationalContext.explicit || operationalContext.catalogueDerived}
                <details class="record-context operational-context disclosure-section" id="detail-panel-overview" hidden={detailPanelTab !== 'overview'} open>
                  <summary>Current source and maintenance</summary>
                  {#if operationalContext.explicit}
                    <p><strong>Evidence-backed operational metadata supplied by this bundle.</strong>{#if operationalContext.verifiedAt} Verified {sourceDateLabel(operationalContext.verifiedAt)}.{/if}</p>
                    <dl>
                      {#if operationalContext.authoritativeSource}<dt>Authoritative source</dt><dd>{#if isUrl(operationalContext.authoritativeSource.url)}<a href={operationalContext.authoritativeSource.url} target="_blank" rel="noopener noreferrer">{operationalContext.authoritativeSource.name} ↗</a>{:else}{operationalContext.authoritativeSource.name}{/if}</dd>{/if}
                      {#if operationalContext.canonicalSource}<dt>Canonical dataset page</dt><dd>{#if isUrl(operationalContext.canonicalSource.url)}<a href={operationalContext.canonicalSource.url} target="_blank" rel="noopener noreferrer">{operationalContext.canonicalSource.label} ↗</a>{:else}{operationalContext.canonicalSource.label}{/if}</dd>{/if}
                      {#if operationalContext.updateFrequency}<dt>Update frequency</dt><dd>{operationalContext.updateFrequency}</dd>{/if}
                      {#if operationalContext.latestRelease}<dt>Latest release</dt><dd>{operationalContext.latestRelease}</dd>{/if}
                      {#if operationalContext.maintenanceStatus}<dt>Maintenance status</dt><dd>{operationalContext.maintenanceStatus}</dd>{/if}
                      {#if operationalContext.api}<dt>API</dt><dd>{#if isUrl(operationalContext.api.url)}<a href={operationalContext.api.url} target="_blank" rel="noopener noreferrer">{operationalContext.api.label} ↗</a>{:else}{operationalContext.api.label}{/if}</dd>{/if}
                      {#if operationalContext.technicalSpecificationUrl}<dt>Technical specification</dt><dd>{#if isUrl(operationalContext.technicalSpecificationUrl)}<a href={operationalContext.technicalSpecificationUrl} target="_blank" rel="noopener noreferrer">Open specification ↗</a>{:else}{operationalContext.technicalSpecificationUrl}{/if}</dd>{/if}
                      {#if operationalContext.licenceUrl}<dt>Licence</dt><dd>{#if isUrl(operationalContext.licenceUrl)}<a href={operationalContext.licenceUrl} target="_blank" rel="noopener noreferrer">Open licence ↗</a>{:else}{operationalContext.licenceUrl}{/if}</dd>{/if}
                    </dl>
                    {#if operationalContext.distributions.length}
                      <h4>Declared distributions</h4>
                      <ul>
                        {#each operationalContext.distributions as distribution}
                          <li>{#if isUrl(distribution.url)}<a href={distribution.url} target="_blank" rel="noopener noreferrer">{distribution.label} ↗</a>{:else}{distribution.label}{/if}{#if distribution.kind} <span class="muted">({distribution.kind})</span>{/if}</li>
                        {/each}
                      </ul>
                    {/if}
                  {:else}
                    <p><strong>Operational metadata gap.</strong> This bundle contains a CKAN catalogue snapshot, but no separately verified current release, update frequency, maintenance state or API-access statement.</p>
                  {/if}
                  {#if operationalContext.catalogueFrequency || operationalContext.catalogueReferenceDates.length}
                    <h4>Catalogue declarations</h4>
                    <dl>
                      {#if operationalContext.catalogueReferenceDates.length}
                        <dt>Dataset reference date</dt><dd>{operationalContext.catalogueReferenceDates.map((row) => `${sourceDateLabel(row.date)}${row.kind ? ` · ${row.kind}` : ''}`).join(', ')}</dd>
                      {/if}
                      {#if operationalContext.catalogueFrequency}<dt>Update frequency</dt><dd>{operationalContext.catalogueFrequency}</dd>{/if}
                    </dl>
                    <p class="muted">These claims come from the catalogue metadata and are preserved as provenance. They are not treated as a current release date or reverified operating status.</p>
                  {/if}
                  {#if operationalContext.linkedSources.length}
                    <h4>Publisher or distribution links supplied by the catalogue</h4>
                    <ul>
                      {#each operationalContext.linkedSources.slice(0, 8) as linkedSource}
                        <li><a href={linkedSource.url} target="_blank" rel="noopener noreferrer">{linkedSource.label} ↗</a> <span class="muted">{facetValueDisplay('host', linkedSource.host)}</span></li>
                      {/each}
                    </ul>
                    <p class="muted">A linked host may contain newer operational information. Explorer does not call it authoritative until the bundle supplies canonical-source evidence and provenance.</p>
                  {/if}
                </details>
              {/if}
              {#if dateContext.years.length || displaySeries.label}
                <details class="record-context disclosure-section" hidden={detailPanelTab !== 'overview'} open={!(operationalContext.explicit || operationalContext.catalogueDerived)}>
                  <summary>Dates and related records</summary>
                  <div class="record-context-heading">
                    <span>Series and coverage context</span>
                    <button type="button" onclick={() => void selectView('timeline')}>Timeline</button>
                  </div>
                  {#if dateContext.years.length}
                    <p><strong>Years named by this record’s resources</strong></p>
                    <div class="year-chips" aria-label="Resource years">
                      {#each dateContext.years as year}<span>{year}</span>{/each}
                    </div>
                  {:else}
                    <p class="muted">No content or resource year is declared for this record.</p>
                  {/if}
                  {#if displaySeriesLabel}
                    <p><strong>{displaySeries.inferred ? 'Display series' : 'Series'}</strong> {displaySeriesLabel}</p>
                    {#if seriesPeers.length}
                      <h4>Other releases in this series</h4>
                      <div class="series-records">
                        {#each seriesPeers.slice(0, 12) as peer}
                          {@const peerPeriod = datasetReleasePeriod(peer, largeIndex?.resourcesByDataset.get(peer.name) || [])}
                          <a href={buildExplorerUrl(datasetRoute(peer))} onclick={(event) => followExplorerRoute(event, datasetRoute(peer))}>
                            <strong>{largeDatasetLabel(peer)}</strong>
                            <span>{peerPeriod ? `Release or coverage ${peerPeriod.label}` : 'No release period supplied'}</span>
                          </a>
                        {/each}
                      </div>
                    {:else}
                      <p class="muted">No other release in this series is present in this bundle.</p>
                    {/if}
                  {/if}
                </details>
              {/if}
              <details
                class="metadata-section disclosure-section"
                hidden={detailPanelTab !== 'overview'}
                open={
                  !(operationalContext.explicit || operationalContext.catalogueDerived) &&
                  !dateContext.years.length &&
                  !displaySeries.label
                }
              >
                <summary>Overview</summary>
                <dl>
                <dt>{capitalise(publisherSingular())}</dt><dd><button type="button" onclick={() => largeDetail?.kind === 'dataset' && largeDetail.dataset.publisher && inspectLargeRoute(publisherRoute(largeDetail.dataset.publisher))}>{largeRecordPublisherLabel(largeDetail.dataset)}</button></dd>
                <dt><span class="label-help">{capitalise(resourcePlural())}<button class="info-icon" type="button" aria-label="Explain evidence count" onclick={() => toggleHelp('api-evidence')} onmouseenter={() => showHelp('api-evidence')} onmouseleave={() => hideHelp('api-evidence')} onfocus={() => showHelp('api-evidence')} onblur={() => hideHelp('api-evidence')}>i</button>{#if activeHelpKey === 'api-evidence'}<span class="info-bubble" role="tooltip">{helpText('api-evidence')}</span>{/if}</span></dt><dd>{(largeDetail.dataset.resource_count || largeDetail.resources.length).toLocaleString()}</dd>
                <dt><span class="label-help">Record type<button class="info-icon" type="button" aria-label="Explain record type" onclick={() => toggleHelp('record-type')} onmouseenter={() => showHelp('record-type')} onmouseleave={() => hideHelp('record-type')} onfocus={() => showHelp('record-type')} onblur={() => hideHelp('record-type')}>i</button>{#if activeHelpKey === 'record-type'}<span class="info-bubble" role="tooltip">{helpText('record-type')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.dataset.record_type || largeDetail.dataset.type)}</dd>
                <dt><span class="label-help">Source<button class="info-icon" type="button" aria-label="Explain source" onclick={() => toggleHelp('source')} onmouseenter={() => showHelp('source')} onmouseleave={() => hideHelp('source')} onfocus={() => showHelp('source')} onblur={() => hideHelp('source')}>i</button>{#if activeHelpKey === 'source'}<span class="info-bubble" role="tooltip">{helpText('source')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.dataset.source_adapter)}</dd>
                <dt>Source tier</dt><dd>{displayValue(largeDetail.dataset.source_tier)}</dd>
                <dt><span class="label-help">Confidence<button class="info-icon" type="button" aria-label="Explain confidence" onclick={() => toggleHelp('confidence')} onmouseenter={() => showHelp('confidence')} onmouseleave={() => hideHelp('confidence')} onfocus={() => showHelp('confidence')} onblur={() => hideHelp('confidence')}>i</button>{#if activeHelpKey === 'confidence'}<span class="info-bubble" role="tooltip">{helpText('confidence')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.dataset.confidence)}</dd>
                <dt><span class="label-help">Licence<button class="info-icon" type="button" aria-label="Explain licence" onclick={() => toggleHelp('licence')} onmouseenter={() => showHelp('licence')} onmouseleave={() => hideHelp('licence')} onfocus={() => showHelp('licence')} onblur={() => hideHelp('licence')}>i</button>{#if activeHelpKey === 'licence'}<span class="info-bubble" role="tooltip">{helpText('licence')}</span>{/if}</span></dt><dd>{licenceDisplayLabel(largeDetail.dataset)}<small>{licenceBasisLabel(largeDetail.dataset)}</small></dd>
                <dt>Concept ID</dt><dd>{displayValue(largeDetail.dataset.concept_id)}</dd>
                <dt><span class="label-help">Metadata quality<button class="info-icon" type="button" aria-label="Explain metadata quality" onclick={() => toggleHelp('metadata-quality')} onmouseenter={() => showHelp('metadata-quality')} onmouseleave={() => hideHelp('metadata-quality')} onfocus={() => showHelp('metadata-quality')} onblur={() => hideHelp('metadata-quality')}>i</button>{#if activeHelpKey === 'metadata-quality'}<span class="info-bubble" role="tooltip">{helpText('metadata-quality')}</span>{/if}</span></dt><dd>{formatPercent(largeDetail.dataset.quality?.overall)}</dd>
                <dt><span class="label-help">Access model<button class="info-icon" type="button" aria-label="Explain access model" onclick={() => toggleHelp('access-model')} onmouseenter={() => showHelp('access-model')} onmouseleave={() => hideHelp('access-model')} onfocus={() => showHelp('access-model')} onblur={() => hideHelp('access-model')}>i</button>{#if activeHelpKey === 'access-model'}<span class="info-bubble" role="tooltip">{helpText('access-model')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.dataset.access_model)}</dd>
                <dt>Visibility</dt><dd>{displayValue(largeDetail.dataset.visibility)}</dd>
                <dt><span class="label-help">Contract status<button class="info-icon" type="button" aria-label="Explain contract status" onclick={() => toggleHelp('contract-status')} onmouseenter={() => showHelp('contract-status')} onmouseleave={() => hideHelp('contract-status')} onfocus={() => showHelp('contract-status')} onblur={() => hideHelp('contract-status')}>i</button>{#if activeHelpKey === 'contract-status'}<span class="info-bubble" role="tooltip">{helpText('contract-status')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.dataset.contract_status)}</dd>
                <dt><span class="label-help">DCAT term<button class="info-icon" type="button" aria-label="Explain DCAT term" onclick={() => toggleHelp('dcat-type')} onmouseenter={() => showHelp('dcat-type')} onmouseleave={() => hideHelp('dcat-type')} onfocus={() => showHelp('dcat-type')} onblur={() => hideHelp('dcat-type')}>i</button>{#if activeHelpKey === 'dcat-type'}<span class="info-bubble" role="tooltip">{helpText('dcat-type')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(largeDetail.dataset.dcat_type)}</code></dd>
                <dt><span class="label-help">Hydra term<button class="info-icon" type="button" aria-label="Explain Hydra term" onclick={() => toggleHelp('hydra-type')} onmouseenter={() => showHelp('hydra-type')} onmouseleave={() => hideHelp('hydra-type')} onfocus={() => showHelp('hydra-type')} onblur={() => hideHelp('hydra-type')}>i</button>{#if activeHelpKey === 'hydra-type'}<span class="info-bubble" role="tooltip">{helpText('hydra-type')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(largeDetail.dataset.hydra_type)}</code></dd>
                <dt><span class="label-help">OpenAPI term<button class="info-icon" type="button" aria-label="Explain OpenAPI term" onclick={() => toggleHelp('openapi-type')} onmouseenter={() => showHelp('openapi-type')} onmouseleave={() => hideHelp('openapi-type')} onfocus={() => showHelp('openapi-type')} onblur={() => hideHelp('openapi-type')}>i</button>{#if activeHelpKey === 'openapi-type'}<span class="info-bubble" role="tooltip">{helpText('openapi-type')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(largeDetail.dataset.openapi_type)}</code></dd>
                <dt>Lifecycle</dt><dd>{displayValue(largeDetail.dataset.lifecycle_status || largeDetail.dataset.state)}</dd>
                <dt>Area served</dt><dd>{displayValue(largeDetail.dataset.area_served || largeDetail.dataset.areaServed)}</dd>
                <dt>{primaryUrlLabel()}</dt><dd>{#if isUrl(largeDetail.dataset.url)}<a href={largeDetail.dataset.url} target="_blank" rel="noopener">{largeDetail.dataset.url}</a>{:else}{displayValue(largeDetail.dataset.url)}{/if}</dd>
                <dt>Documentation</dt><dd>{#if isUrl(largeDetail.dataset.documentation)}<a href={largeDetail.dataset.documentation} target="_blank" rel="noopener">{largeDetail.dataset.documentation}</a>{:else}{displayValue(largeDetail.dataset.documentation)}{/if}</dd>
                {#each sourceAccessRows as access}
                  <dt>{access.label}</dt>
                  <dd>
                    {#if canDisplaySourceInline(access)}<button type="button" onclick={() => void loadLargeSource(largeDetail.route, access)}>View source data</button>{/if}
                    <a href={access.url} target="_blank" rel="noopener noreferrer">{sourceOpenLabel(access)}</a>
                    <small>{access.media_type} · {access.display_mode}{access.legacy ? ' · legacy source_api_url' : ''}</small>
                  </dd>
                {/each}
                </dl>
              </details>
              {#if detailPanelTab === 'overview'}<LegislationDetail record={largeDetail.dataset} />{/if}
              {#if acronymExpansions(largeDetail.dataset).length || contextLinks(largeDetail.dataset).length}
                <details class="metadata-section disclosure-section" hidden={detailPanelTab !== 'overview'}>
                  <summary>Context</summary>
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
                </details>
              {/if}
              <div class="chips">
                {#each (largeDetail.dataset.topics || []).slice(0, 10) as topic}<button class="chip topic-chip" type="button" title={`Filter by topic: ${facetValueDisplay('topic', topic)}`} onclick={() => applyAnalysisFacet('topic', topic)}>{facetValueDisplay('topic', topic)}</button>{/each}
                {#each (largeDetail.dataset.formats || []).slice(0, 16) as format}<button class="chip" type="button" title={`Filter by format: ${facetValueDisplay('format', format)}`} onclick={() => applyAnalysisFacet('format', format)}>{facetValueDisplay('format', format)}</button>{/each}
                {#each (largeDetail.dataset.tags || []).slice(0, 16) as tag}<button class="chip" type="button" title={`Filter by tag: ${facetValueDisplay('tag', tag)}`} onclick={() => applyAnalysisFacet('tag', tag)}>{facetValueDisplay('tag', tag)}</button>{/each}
              </div>
              <details class="metadata-section disclosure-section" id="detail-panel-data" hidden={detailPanelTab !== 'data'}>
                <summary>Normalised record fields</summary>
                <dl>
                  <dt>Record name</dt><dd>{largeDetail.dataset.name}</dd>
                  <dt>Record ID</dt><dd>{displayValue(largeDetail.dataset.id)}</dd>
                  <dt>State</dt><dd>{displayValue(largeDetail.dataset.state)}</dd>
                  <dt>Type</dt><dd>{displayValue(largeDetail.dataset.type)}</dd>
                  <dt>Protocol</dt><dd>{displayValue(largeDetail.dataset.protocol)}</dd>
                  <dt>Open data</dt><dd>{displayValue(largeDetail.dataset.isopen)}</dd>
                  <dt>Private</dt><dd>{displayValue(largeDetail.dataset.private)}</dd>
                  <dt><span class="label-help">Catalogue metadata created<button class="info-icon" type="button" aria-label="Explain created date" onclick={() => toggleHelp('source-date:created')} onmouseenter={() => showHelp('source-date:created')} onmouseleave={() => hideHelp('source-date:created')} onfocus={() => showHelp('source-date:created')} onblur={() => hideHelp('source-date:created')}>i</button>{#if activeHelpKey === 'source-date:created'}<span class="info-bubble" role="tooltip">{helpText('source-date:created')}</span>{/if}</span></dt><dd>{metadataDisplayValue(largeDetail.dataset.metadata_created)}</dd>
                  <dt><span class="label-help">Catalogue metadata modified<button class="info-icon" type="button" aria-label="Explain modified date" onclick={() => toggleHelp('source-date:modified')} onmouseenter={() => showHelp('source-date:modified')} onmouseleave={() => hideHelp('source-date:modified')} onfocus={() => showHelp('source-date:modified')} onblur={() => hideHelp('source-date:modified')}>i</button>{#if activeHelpKey === 'source-date:modified'}<span class="info-bubble" role="tooltip">{helpText('source-date:modified')}</span>{/if}</span></dt><dd>{metadataDisplayValue(largeDetail.dataset.metadata_modified)}</dd>
                  <dt><span class="label-help">Timeline date<button class="info-icon" type="button" aria-label="Explain timeline date" onclick={() => toggleHelp('source-date:timeline')} onmouseenter={() => showHelp('source-date:timeline')} onmouseleave={() => hideHelp('source-date:timeline')} onfocus={() => showHelp('source-date:timeline')} onblur={() => hideHelp('source-date:timeline')}>i</button>{#if activeHelpKey === 'source-date:timeline'}<span class="info-bubble" role="tooltip">{helpText('source-date:timeline')}</span>{/if}</span></dt><dd>{metadataDisplayValue(largeDetail.dataset.timestamp)}</dd>
                  <dt>{capitalise(formatPlural())}</dt><dd>{displayValue(largeDetail.dataset.formats)}</dd>
                  <dt>Topics</dt><dd>{displayValue(largeDetail.dataset.topics)}</dd>
                  <dt>Source licence</dt><dd>{displayValue([largeDetail.dataset.license_source_id, largeDetail.dataset.license_source_title].filter(Boolean))}</dd>
                  <dt><span class="label-help">Licence basis<button class="info-icon" type="button" aria-label="Explain licence basis" onclick={() => toggleHelp('licence-basis')} onmouseenter={() => showHelp('licence-basis')} onmouseleave={() => hideHelp('licence-basis')} onfocus={() => showHelp('licence-basis')} onblur={() => hideHelp('licence-basis')}>i</button>{#if activeHelpKey === 'licence-basis'}<span class="info-bubble" role="tooltip">{helpText('licence-basis')}</span>{/if}</span></dt><dd>{licenceBasisLabel(largeDetail.dataset)}</dd>
                  <dt><span class="label-help">Licence confidence<button class="info-icon" type="button" aria-label="Explain licence confidence" onclick={() => toggleHelp('licence-confidence')} onmouseenter={() => showHelp('licence-confidence')} onmouseleave={() => hideHelp('licence-confidence')} onfocus={() => showHelp('licence-confidence')} onblur={() => hideHelp('licence-confidence')}>i</button>{#if activeHelpKey === 'licence-confidence'}<span class="info-bubble" role="tooltip">{helpText('licence-confidence')}</span>{/if}</span></dt><dd>{formatPercent(largeDetail.dataset.license_confidence)}</dd>
                  <dt>{capitalise(publisherSingular())} concept</dt><dd>{displayValue(largeDetail.dataset.publisher_concept_id)}</dd>
                  <dt>Groups</dt><dd>{groupDisplayValue(largeDetail.dataset.groups)}</dd>
                  <dt>{capitalise(resourceSingular())} hosts</dt><dd>{displayValue(largeDetail.dataset.resource_hosts)}</dd>
                </dl>
              </details>
              {#if largeDetail.dataset.dcat_type || largeDetail.dataset.hydra_type || largeDetail.dataset.openapi_type || standardsAlignment(largeDetail.dataset)}
                {@const alignment = standardsAlignment(largeDetail.dataset)}
                <details class="metadata-section disclosure-section" id="detail-panel-evidence" hidden={detailPanelTab !== 'evidence'}>
                  <summary>Standards alignment</summary>
                  <dl>
                    <dt><span class="label-help">DCAT / DCAT-AP<button class="info-icon" type="button" aria-label="Explain DCAT term" onclick={() => toggleHelp('dcat-type')} onmouseenter={() => showHelp('dcat-type')} onmouseleave={() => hideHelp('dcat-type')} onfocus={() => showHelp('dcat-type')} onblur={() => hideHelp('dcat-type')}>i</button>{#if activeHelpKey === 'dcat-type'}<span class="info-bubble" role="tooltip">{helpText('dcat-type')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(alignment?.dcat?.term || largeDetail.dataset.dcat_type)}</code></dd>
                    <dt>DCAT export status</dt><dd>{metadataDisplayValue(alignment?.dcat?.export_status || largeDetail.dataset.dcat_export_status)}</dd>
                    <dt>DCAT missing</dt><dd>{#each standardsList(alignment?.dcat?.required_missing) as item}<code class="standard-term inline-term">{item}</code>{:else}None recorded{/each}</dd>
                    <dt><span class="label-help">Hydra<button class="info-icon" type="button" aria-label="Explain Hydra term" onclick={() => toggleHelp('hydra-type')} onmouseenter={() => showHelp('hydra-type')} onmouseleave={() => hideHelp('hydra-type')} onfocus={() => showHelp('hydra-type')} onblur={() => hideHelp('hydra-type')}>i</button>{#if activeHelpKey === 'hydra-type'}<span class="info-bubble" role="tooltip">{helpText('hydra-type')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(alignment?.hydra?.term || largeDetail.dataset.hydra_type)}</code></dd>
                    <dt>Hydra projection status</dt><dd>{metadataDisplayValue(alignment?.hydra?.export_status)}</dd>
                    <dt>Hydra missing</dt><dd>{#each standardsList(alignment?.hydra?.required_missing) as item}<code class="standard-term inline-term">{item}</code>{:else}None recorded{/each}</dd>
                    <dt><span class="label-help">OpenAPI<button class="info-icon" type="button" aria-label="Explain OpenAPI term" onclick={() => toggleHelp('openapi-type')} onmouseenter={() => showHelp('openapi-type')} onmouseleave={() => hideHelp('openapi-type')} onfocus={() => showHelp('openapi-type')} onblur={() => hideHelp('openapi-type')}>i</button>{#if activeHelpKey === 'openapi-type'}<span class="info-bubble" role="tooltip">{helpText('openapi-type')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(alignment?.openapi?.term || largeDetail.dataset.openapi_type)}</code></dd>
                    <dt>OpenAPI export status</dt><dd>{metadataDisplayValue(alignment?.openapi?.export_status || largeDetail.dataset.openapi_export_status)}</dd>
                    <dt><span class="label-help">Security scheme<button class="info-icon" type="button" aria-label="Explain OpenAPI security scheme" onclick={() => toggleHelp('openapi-security-scheme')} onmouseenter={() => showHelp('openapi-security-scheme')} onmouseleave={() => hideHelp('openapi-security-scheme')} onfocus={() => showHelp('openapi-security-scheme')} onblur={() => hideHelp('openapi-security-scheme')}>i</button>{#if activeHelpKey === 'openapi-security-scheme'}<span class="info-bubble" role="tooltip">{helpText('openapi-security-scheme')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(alignment?.openapi?.security_scheme_type || largeDetail.dataset.openapi_security_scheme)}</code></dd>
                    <dt>OpenAPI missing</dt><dd>{#each standardsList(alignment?.openapi?.required_missing) as item}<code class="standard-term inline-term">{item}</code>{:else}None recorded{/each}</dd>
                  </dl>
                </details>
              {/if}
              {#if source.termRegistry && governedTermIdsForRecord(largeDetail.dataset).length}
                <div hidden={detailPanelTab !== 'evidence'}>
                  <GovernedTermsPanel
                    registry={source.termRegistry}
                    validation={source.termValidation}
                    baseUrl={source.baseUrl}
                    termIds={governedTermIdsForRecord(largeDetail.dataset)}
                    open={true}
                  />
                </div>
              {/if}
              {#if largeDetail.dataset.quality}
                <details class="metadata-section disclosure-section" hidden={detailPanelTab !== 'evidence'}>
                  <summary>Metadata quality signals</summary>
                  <dl>
                    <dt><span class="label-help">Overall<button class="info-icon" type="button" aria-label="Explain overall quality" onclick={() => toggleHelp('quality-overall')} onmouseenter={() => showHelp('quality-overall')} onmouseleave={() => hideHelp('quality-overall')} onfocus={() => showHelp('quality-overall')} onblur={() => hideHelp('quality-overall')}>i</button>{#if activeHelpKey === 'quality-overall'}<span class="info-bubble" role="tooltip">{helpText('quality-overall')}</span>{/if}</span></dt><dd>{formatPercent(largeDetail.dataset.quality.overall)}</dd>
                    {#each Object.entries(largeDetail?.dataset?.quality?.metrics ?? {}) as [key, value]}
                      {@const qualityHelpKey = `quality-${key}`}
                      <dt><span class="label-help">{key.replaceAll('_', ' ')}{#if helpText(qualityHelpKey)}<button class="info-icon" type="button" aria-label={`Explain ${key.replaceAll('_', ' ')}`} onclick={() => toggleHelp(qualityHelpKey)} onmouseenter={() => showHelp(qualityHelpKey)} onmouseleave={() => hideHelp(qualityHelpKey)} onfocus={() => showHelp(qualityHelpKey)} onblur={() => hideHelp(qualityHelpKey)}>i</button>{#if activeHelpKey === qualityHelpKey}<span class="info-bubble" role="tooltip">{helpText(qualityHelpKey)}</span>{/if}{/if}</span></dt><dd>{typeof value === 'number' ? formatPercent(value) : displayValue(value)}</dd>
                    {/each}
                  </dl>
                </details>
              {/if}
              {#if largeDetail?.dataset?.provenance}
                <details class="metadata-section disclosure-section" hidden={detailPanelTab !== 'evidence'}>
                  <summary>Provenance</summary>
                  <dl>
                    {#each Object.entries(largeDetail.dataset.provenance ?? {}).slice(0, 14) as [key, value]}
                      <dt>{key.replaceAll('_', ' ')}</dt><dd>{displayValue(value)}</dd>
                    {/each}
                  </dl>
                </details>
              {/if}
              {#if largeDetail?.dataset?.extras && Object.keys(largeDetail.dataset.extras ?? {}).length}
                <details class="metadata-section disclosure-section" hidden={detailPanelTab !== 'data'}>
                  <summary>Additional metadata</summary>
                  <dl>
                    {#each Object.entries(largeDetail.dataset.extras ?? {}).slice(0, 40) as [key, value]}
                      <dt>{key}</dt><dd>{displayValue(value)}</dd>
                    {/each}
                  </dl>
                </details>
              {/if}
              <details class="metadata-section disclosure-section" hidden={detailPanelTab !== 'evidence'}>
                <summary>{capitalise(resourcePlural())} ({largeDetail.resources.length.toLocaleString()})</summary>
                <div class="disclosure-list">
                  {#each largeDetail.resources.slice(0, 30) as resource}
                    <button type="button" onclick={() => { largeHighlightedRoute = resourceRoute(resource); inspectLargeRoute(resourceRoute(resource)); }} ondblclick={() => recenterLargeRoute(resourceRoute(resource))}>
                      <strong>{largeResourceLabel(resource)}</strong>
                      <span>{resource.format ? facetValueDisplay('format', resource.format) : 'unknown'} · {resource.host ? facetValueDisplay('host', resource.host) : 'unknown host'}</span>
                    </button>
                  {/each}
                </div>
              </details>
              {#if largeDetail.relationships.length}
                <details class="metadata-section disclosure-section" hidden={detailPanelTab !== 'evidence'}>
                  <summary>Relationships ({largeDetail.relationships.length.toLocaleString()})</summary>
                  <div class="disclosure-list">
                    {#each largeDetail.relationships.slice(0, 24) as relationship}
                      <button type="button" onclick={() => inspectLargeRelationship(relationship)}>
                        {largeLabelForRoute(relationship.source)} → {relationship.kind} → {largeLabelForRoute(relationship.target)}
                      </button>
                    {/each}
                  </div>
                </details>
              {/if}
              <details class="json-panel" hidden={detailPanelTab !== 'data'}>
                <summary>Local normalised {recordSingular()} JSON</summary>
                <pre>{jsonText(largeDetail.dataset)}</pre>
              </details>
              </div>
            {:else if largeDetail.kind === 'resource'}
              <span class="badge">{capitalise(resourceSingular())}</span>
              <h2>{largeResourceLabel(largeDetail.resource)}</h2>
              <p>{stripHtml(largeDetail.resource.description || '') || largeDetail.resource.url}</p>
              {#if largeDetail.dataset}
                {#each providerDatapacksForRecord(source.providerDatapacks, largeDetail.dataset) as providerDatapack}
                  <ProviderDatapackStatus
                    pack={providerDatapack}
                    record={largeDetail.dataset}
                    scope="resource"
                  />
                {/each}
              {/if}
              <div class="detail-actions">
                <button type="button" onclick={() => largeDetail?.kind === 'resource' && selectLargeRoute(datasetRoute(largeDetail.dataset || { name: largeDetail.resource.dataset, title: largeDetail.resource.dataset }))}>{capitalise(recordSingular())}</button>
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
                <button type="button" onclick={() => copyRoute(largeDetail.route)}>Copy route</button>
                {#if largeInspectedRoute}<button type="button" onclick={clearInspection}>Clear inspection</button>{/if}
              </div>
              <details class="metadata-section disclosure-section" open>
                <summary>Overview</summary>
                <dl>
                <dt>{capitalise(recordSingular())}</dt><dd>{largeDetail.dataset ? largeDatasetLabel(largeDetail.dataset) : largeLabelForRoute(`dataset/${largeDetail.resource.dataset}`)}</dd>
                <dt>Format</dt><dd>{largeDetail.resource.format ? facetValueDisplay('format', largeDetail.resource.format) : 'unknown'}</dd>
                <dt>Source format</dt><dd>{displayValue(largeDetail.resource.source_format)}</dd>
                <dt>Format confidence</dt><dd>{formatPercent(largeDetail.resource.format_confidence)}</dd>
                <dt>Concept ID</dt><dd>{displayValue(largeDetail.resource.concept_id)}</dd>
                <dt>Host</dt><dd>{largeDetail.resource.host ? facetValueDisplay('host', largeDetail.resource.host) : 'unknown'}</dd>
                <dt>Type</dt><dd>{largeDetail.resource.resource_type ? facetValueDisplay('resource_type', largeDetail.resource.resource_type) : 'unknown'}</dd>
                <dt>URL</dt><dd>{#if isUrl(largeDetail.resource.url)}<a href={largeDetail.resource.url} target="_blank" rel="noopener">{largeDetail.resource.url}</a>{:else}{displayValue(largeDetail.resource.url)}{/if}</dd>
                <dt>GOV.UK path</dt><dd>{displayValue(largeDetail.resource.govuk_content_path)}</dd>
                </dl>
              </details>
              <details class="metadata-section disclosure-section">
                <summary>Resource metadata</summary>
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
              </details>
              {#if largeDetail?.resource?.provenance}
                <details class="metadata-section disclosure-section">
                  <summary>Provenance</summary>
                  <dl>
                    {#each Object.entries(largeDetail.resource.provenance ?? {}).slice(0, 14) as [key, value]}
                      <dt>{key.replaceAll('_', ' ')}</dt><dd>{displayValue(value)}</dd>
                    {/each}
                  </dl>
                </details>
              {/if}
              <details class="json-panel">
                <summary>Local normalised {resourceSingular()} JSON</summary>
                <pre>{jsonText(largeDetail.resource)}</pre>
              </details>
            {:else if largeDetail.kind === 'publisher'}
              <span class="badge">{capitalise(publisherSingular())}</span>
              <h2>{largeLabelForRoute(largeDetail.route)}</h2>
              <p>{stripHtml(largeDetail.publisher.description || '')}</p>
              <div class="detail-actions">
                <button type="button" onclick={() => recenterLargeRoute(largeDetail.route)}>Graph</button>
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
                <button type="button" onclick={() => copyRoute(largeDetail.route)}>Copy route</button>
              </div>
              <details class="metadata-section disclosure-section" open>
                <summary>Overview</summary>
                <dl>
                <dt>Preferred label</dt><dd>{largeLabelForRoute(largeDetail.route)}</dd>
                <dt>Concept ID</dt><dd>{displayValue(largeDetail.publisher.concept_id)}</dd>
                <dt>{capitalise(recordPlural())}</dt><dd>{(largeDetail.publisher.dataset_count || largeDetail.datasets.length).toLocaleString()}</dd>
                <dt>{capitalise(resourcePlural())}</dt><dd>{(largeDetail.publisher.resource_count || 0).toLocaleString()}</dd>
                <dt>State</dt><dd>{largeDetail.publisher.state || 'unknown'}</dd>
                <dt>{capitalise(publisherSingular())} ID</dt><dd>{displayValue(largeDetail.publisher.id)}</dd>
                <dt>Type</dt><dd>{displayValue(largeDetail.publisher.type)}</dd>
                <dt>Approval status</dt><dd>{displayValue(largeDetail.publisher.approval_status)}</dd>
                </dl>
              </details>
              {#if largeDetail?.publisher?.provenance}
                <details class="metadata-section disclosure-section">
                  <summary>Provenance</summary>
                  <dl>
                    {#each Object.entries(largeDetail.publisher.provenance ?? {}).slice(0, 12) as [key, value]}
                      <dt>{key.replaceAll('_', ' ')}</dt><dd>{displayValue(value)}</dd>
                    {/each}
                  </dl>
                </details>
              {/if}
              <details class="metadata-section disclosure-section">
                <summary>{capitalise(recordPlural())} ({largeDetail.datasets.length.toLocaleString()})</summary>
                <div class="disclosure-list">
                  {#each largeDetail.datasets.slice(0, 40) as dataset}
                    <button type="button" onclick={() => selectLargeRoute(datasetRoute(dataset))}>{largeDatasetLabel(dataset)}</button>
                  {/each}
                </div>
              </details>
              <details class="json-panel">
                <summary>Local normalised publisher JSON</summary>
                <pre>{jsonText(largeDetail.publisher)}</pre>
              </details>
            {:else if largeDetail.kind === 'search'}
              <span class="badge">{capitalise(recordSingular())}</span>
              <h2>{largeDatasetLabel(largeDetail.result)}</h2>
              <div class="detail-actions primary-detail-actions">
                {#if largeHasRecordLocator()}
                  <button class="primary-action" type="button" onclick={() => void ensureLargeDataset(largeDetail.route, largeDetail.result)}>
                    {largeTargetedLoadingRoute === largeDetail.route ? 'Loading selected record...' : 'Load selected record'}
                  </button>
                {:else}
                  <button class="primary-action" type="button" onclick={() => void ensureLargeFullIndex()}>
                    {largeFullLoading ? 'Loading full record...' : 'Load full record'}
                  </button>
                {/if}
              </div>
              <p class="match-explanation"><strong>Why this matched</strong> {searchMatchReason(largeDetail.result)}</p>
              {#if apiContextNote(largeDetail.result)}
                <p class="context-note">{apiContextNote(largeDetail.result)}</p>
              {/if}
              {#if largeDetail.result.timestamp}
                <p class="record-date-summary">
                  <span><strong>Catalogue/index date</strong> <time datetime={largeDetail.result.timestamp}>{sourceDateLabel(largeDetail.result.timestamp)}</time></span>
                  <small>Catalogue date — not necessarily the dataset’s latest release or update frequency.</small>
                </p>
              {/if}
              <p>{stripHtml(largeDetail.result.notes || '')}</p>
              {#each providerDatapacksForRecord(source.providerDatapacks, largeDetail.result) as providerDatapack}
                <ProviderDatapackStatus
                  pack={providerDatapack}
                  record={largeDetail.result}
                  scope="record"
                />
              {/each}
              <details class="metadata-section disclosure-section" open>
                <summary>Overview</summary>
                <dl>
                <dt>{capitalise(publisherSingular())}</dt><dd>{largeRecordPublisherLabel(largeDetail.result)}</dd>
                <dt><span class="label-help">{capitalise(resourcePlural())}<button class="info-icon" type="button" aria-label="Explain evidence count" onclick={() => toggleHelp('api-evidence')} onmouseenter={() => showHelp('api-evidence')} onmouseleave={() => hideHelp('api-evidence')} onfocus={() => showHelp('api-evidence')} onblur={() => hideHelp('api-evidence')}>i</button>{#if activeHelpKey === 'api-evidence'}<span class="info-bubble" role="tooltip">{helpText('api-evidence')}</span>{/if}</span></dt><dd>{largeDetail.result.resource_count.toLocaleString()}</dd>
                <dt><span class="label-help">Record type<button class="info-icon" type="button" aria-label="Explain record type" onclick={() => toggleHelp('record-type')} onmouseenter={() => showHelp('record-type')} onmouseleave={() => hideHelp('record-type')} onfocus={() => showHelp('record-type')} onblur={() => hideHelp('record-type')}>i</button>{#if activeHelpKey === 'record-type'}<span class="info-bubble" role="tooltip">{helpText('record-type')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.result.record_type)}</dd>
                <dt><span class="label-help">Source<button class="info-icon" type="button" aria-label="Explain source" onclick={() => toggleHelp('source')} onmouseenter={() => showHelp('source')} onmouseleave={() => hideHelp('source')} onfocus={() => showHelp('source')} onblur={() => hideHelp('source')}>i</button>{#if activeHelpKey === 'source'}<span class="info-bubble" role="tooltip">{helpText('source')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.result.source_adapter)}</dd>
                <dt><span class="label-help">Confidence<button class="info-icon" type="button" aria-label="Explain confidence" onclick={() => toggleHelp('confidence')} onmouseenter={() => showHelp('confidence')} onmouseleave={() => hideHelp('confidence')} onfocus={() => showHelp('confidence')} onblur={() => hideHelp('confidence')}>i</button>{#if activeHelpKey === 'confidence'}<span class="info-bubble" role="tooltip">{helpText('confidence')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.result.confidence)}</dd>
                <dt><span class="label-help">Licence<button class="info-icon" type="button" aria-label="Explain licence" onclick={() => toggleHelp('licence')} onmouseenter={() => showHelp('licence')} onmouseleave={() => hideHelp('licence')} onfocus={() => showHelp('licence')} onblur={() => hideHelp('licence')}>i</button>{#if activeHelpKey === 'licence'}<span class="info-bubble" role="tooltip">{helpText('licence')}</span>{/if}</span></dt><dd>{licenceDisplayLabel(largeDetail.result)}<small>{licenceBasisLabel(largeDetail.result)}</small></dd>
                <dt>Protocol</dt><dd>{facetMetadataDisplayValue('protocol', largeDetail.result.protocol)}</dd>
                <dt>Topics</dt><dd>{facetMetadataDisplayValue('topic', largeDetail.result.topics)}</dd>
                <dt>Endpoint host</dt><dd>{facetMetadataDisplayValue('host', largeDetail.result.endpoint_host)}</dd>
                <dt>Documentation host</dt><dd>{facetMetadataDisplayValue('host', largeDetail.result.documentation_host)}</dd>
                <dt><span class="label-help">Access model<button class="info-icon" type="button" aria-label="Explain access model" onclick={() => toggleHelp('access-model')} onmouseenter={() => showHelp('access-model')} onmouseleave={() => hideHelp('access-model')} onfocus={() => showHelp('access-model')} onblur={() => hideHelp('access-model')}>i</button>{#if activeHelpKey === 'access-model'}<span class="info-bubble" role="tooltip">{helpText('access-model')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.result.access_model)}</dd>
                <dt><span class="label-help">Contract status<button class="info-icon" type="button" aria-label="Explain contract status" onclick={() => toggleHelp('contract-status')} onmouseenter={() => showHelp('contract-status')} onmouseleave={() => hideHelp('contract-status')} onfocus={() => showHelp('contract-status')} onblur={() => hideHelp('contract-status')}>i</button>{#if activeHelpKey === 'contract-status'}<span class="info-bubble" role="tooltip">{helpText('contract-status')}</span>{/if}</span></dt><dd>{displayValue(largeDetail.result.contract_status)}</dd>
                <dt><span class="label-help">DCAT term<button class="info-icon" type="button" aria-label="Explain DCAT term" onclick={() => toggleHelp('dcat-type')} onmouseenter={() => showHelp('dcat-type')} onmouseleave={() => hideHelp('dcat-type')} onfocus={() => showHelp('dcat-type')} onblur={() => hideHelp('dcat-type')}>i</button>{#if activeHelpKey === 'dcat-type'}<span class="info-bubble" role="tooltip">{helpText('dcat-type')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(largeDetail.result.dcat_type)}</code></dd>
                <dt><span class="label-help">Hydra term<button class="info-icon" type="button" aria-label="Explain Hydra term" onclick={() => toggleHelp('hydra-type')} onmouseenter={() => showHelp('hydra-type')} onmouseleave={() => hideHelp('hydra-type')} onfocus={() => showHelp('hydra-type')} onblur={() => hideHelp('hydra-type')}>i</button>{#if activeHelpKey === 'hydra-type'}<span class="info-bubble" role="tooltip">{helpText('hydra-type')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(largeDetail.result.hydra_type)}</code></dd>
                <dt><span class="label-help">OpenAPI term<button class="info-icon" type="button" aria-label="Explain OpenAPI term" onclick={() => toggleHelp('openapi-type')} onmouseenter={() => showHelp('openapi-type')} onmouseleave={() => hideHelp('openapi-type')} onfocus={() => showHelp('openapi-type')} onblur={() => hideHelp('openapi-type')}>i</button>{#if activeHelpKey === 'openapi-type'}<span class="info-bubble" role="tooltip">{helpText('openapi-type')}</span>{/if}</span></dt><dd><code class="standard-term">{metadataDisplayValue(largeDetail.result.openapi_type)}</code></dd>
                <dt>{primaryUrlLabel()}</dt><dd>{#if isUrl(largeDetail.result.url)}<a href={largeDetail.result.url} target="_blank" rel="noopener">{largeDetail.result.url}</a>{:else}{displayValue(largeDetail.result.url)}{/if}</dd>
                <dt>Documentation</dt><dd>{#if isUrl(largeDetail.result.documentation)}<a href={largeDetail.result.documentation} target="_blank" rel="noopener">{largeDetail.result.documentation}</a>{:else}{displayValue(largeDetail.result.documentation)}{/if}</dd>
                <dt><span class="label-help">Metadata quality<button class="info-icon" type="button" aria-label="Explain metadata quality" onclick={() => toggleHelp('metadata-quality')} onmouseenter={() => showHelp('metadata-quality')} onmouseleave={() => hideHelp('metadata-quality')} onfocus={() => showHelp('metadata-quality')} onblur={() => hideHelp('metadata-quality')}>i</button>{#if activeHelpKey === 'metadata-quality'}<span class="info-bubble" role="tooltip">{helpText('metadata-quality')}</span>{/if}</span></dt><dd>{formatPercent(largeDetail.result.quality_score)}</dd>
                <dt>Route</dt><dd>{largeDetail.result.open}</dd>
                <dt><span class="label-help">Timestamp<button class="info-icon" type="button" aria-label="Explain timestamp" onclick={() => toggleHelp('source-date:search-result')} onmouseenter={() => showHelp('source-date:search-result')} onmouseleave={() => hideHelp('source-date:search-result')} onfocus={() => showHelp('source-date:search-result')} onblur={() => hideHelp('source-date:search-result')}>i</button>{#if activeHelpKey === 'source-date:search-result'}<span class="info-bubble" role="tooltip">{helpText('source-date:search-result')}</span>{/if}</span></dt><dd>{metadataDisplayValue(largeDetail.result.timestamp)}</dd>
                </dl>
              </details>
              {#if source.termRegistry && governedTermIdsForRecord(largeDetail.result).length}
                <GovernedTermsPanel
                  registry={source.termRegistry}
                  validation={source.termValidation}
                  baseUrl={source.baseUrl}
                  termIds={governedTermIdsForRecord(largeDetail.result)}
                  open={true}
                />
              {/if}
              <LegislationDetail record={largeDetail.result} />
              <div class="chips">
                {#each (largeDetail.result.topics || []).slice(0, 10) as topic}<button class="chip topic-chip" type="button" title={`Filter by topic: ${facetValueDisplay('topic', topic)}`} onclick={() => applyAnalysisFacet('topic', topic)}>{facetValueDisplay('topic', topic)}</button>{/each}
                {#each (largeDetail.result.formats || []).slice(0, 16) as format}<button class="chip" type="button" title={`Filter by format: ${facetValueDisplay('format', format)}`} onclick={() => applyAnalysisFacet('format', format)}>{facetValueDisplay('format', format)}</button>{/each}
                {#each (largeDetail.result.tags || []).slice(0, 16) as tag}<button class="chip" type="button" title={`Filter by tag: ${facetValueDisplay('tag', tag)}`} onclick={() => applyAnalysisFacet('tag', tag)}>{facetValueDisplay('tag', tag)}</button>{/each}
              </div>
            {:else}
              {@const routeLoadedRecords = metadataRoutePreviewRecords(largeDetail.route, Number.MAX_SAFE_INTEGER)}
              {@const routePreviewRecords = routeLoadedRecords.slice(0, 12)}
              {@const routeResources = resourcesForMetadataRoute(largeDetail.route, 40)}
              {@const routeDatasetTotal = datasetCountForMetadataRoute(largeDetail.route)}
              {@const analysisNode = analysisNodeForRoute(largeDetail.route)}
              {@const analysisFacet = routeForAnalysisNode(largeDetail.route)}
              {@const metadataFacet = metadataFacetForRoute(largeDetail.route)}
              {@const facetMeta = analysisFacet ? analysisFacetForKey(analysisFacet.key) : null}
              {@const hierarchyValue = analysisHierarchyValueForRoute(largeDetail.route)}
              <span class="badge">{routeTypeLabel(largeDetail.route)}</span>
              <h2>{largeDetail.label}</h2>
              <div class="detail-actions">
                <button type="button" onclick={() => recenterLargeRoute(largeDetail.route)}>Graph related records</button>
                {#if metadataFacet}<button type="button" onclick={() => showMetadataRouteRecords(largeDetail.route)}>View related {recordPlural()}</button>{/if}
                <button type="button" onclick={() => pinRoute(largeDetail?.route)}>Pin</button>
                <button type="button" onclick={() => copyRoute(largeDetail.route)}>Copy route</button>
              </div>
              <p class="context-note">{metadataMembershipDescription(largeDetail.route)}</p>
              <dl>
                <dt>Route</dt><dd>{largeDetail.route}</dd>
                <dt>Kind</dt><dd>{routeKind(largeDetail.route)}</dd>
                <dt>{metadataFacet ? 'Indexed link' : 'Relationship'}</dt><dd>{metadataMembershipLabel(largeDetail.route)}</dd>
                {#if analysisNode}<dt>Analysis count</dt><dd>{(analysisNode.count || 0).toLocaleString()}</dd>{/if}
                {#if analysisFacet}<dt>Facet</dt><dd>{facetDisplayLabel(analysisFacet.key)}</dd>{/if}
                {#if analysisFacet}<dt>Facet value</dt><dd>{analysisFacet.value}</dd>{/if}
                {#if facetMeta}<dt><span class="label-help">Facet navigation signal<button class="info-icon" type="button" aria-label="Explain facet navigation signal" onclick={() => toggleHelp('facet-quality')} onmouseenter={() => showHelp('facet-quality')} onmouseleave={() => hideHelp('facet-quality')} onfocus={() => showHelp('facet-quality')} onblur={() => hideHelp('facet-quality')}>i</button>{#if activeHelpKey === 'facet-quality'}<span class="info-bubble" role="tooltip">{helpText('facet-quality')}</span>{/if}</span></dt><dd>{facetMeta.recommendation} · {facetMeta.recommended_control} · reduction {formatPercent(facetMeta.expected_reduction)}</dd>{/if}
                {#if hierarchyValue}<dt>Hierarchy</dt><dd>{hierarchyValue.hierarchy.label}{hierarchyValue.parent ? ` / ${hierarchyValue.parent.label}` : ''}</dd>{/if}
                {#if metadataFacet}<dt>Matched {recordPlural()}</dt><dd data-detail-field="matched-records">{routeDatasetTotal.toLocaleString()} {datasetCountScopeForMetadataRoute(largeDetail.route)}</dd>{/if}
                {#if metadataFacet}<dt>Bounded index context</dt><dd data-detail-field="record-preview">{routeLoadedRecords.length.toLocaleString()} loaded of {routeDatasetTotal.toLocaleString()}</dd>{/if}
                {#if largeIndex}<dt>{capitalise(resourcePlural())} preview</dt><dd data-detail-field="resource-preview">{routeResources.length.toLocaleString()} shown</dd>{/if}
                <dt>Direct semantic assertions</dt><dd>{largeDetail.relationships.length ? largeDetail.relationships.length.toLocaleString() : metadataFacet ? 'No facet-node assertions published' : 'None loaded for this route'}</dd>
              </dl>
              {#if largeFullLoading && !largeIndex}
                <p class="facet-loading">Loading {recordPlural()} for this value...</p>
              {/if}
              {#if metadataFacet && routePreviewRecords.length}
                <h3>Related {recordPlural()}</h3>
                {#if routeDatasetTotal > routePreviewRecords.length}
                  <p class="muted">Showing {routePreviewRecords.length.toLocaleString()} card previews from {routeLoadedRecords.length.toLocaleString()} loaded records and {routeDatasetTotal.toLocaleString()} exact index matches.</p>
                {/if}
                {#each routePreviewRecords as record}
                  <button type="button" onclick={() => openMetadataPreviewRecord(record)}>
                    <strong>{largeDatasetLabel(record)}</strong>
                    <span>{largeRecordPublisherLabel(record)} · {record.resource_count || 0} {resourcePlural()}</span>
                    {#if apiContextNote(record)}<p class="context-note">{apiContextNote(record)}</p>{/if}
                    <p>{stripHtml(record.notes || '').slice(0, 180)}</p>
                    {#if apiRecordMeta(record)}<small class="result-meta">{apiRecordMeta(record)}</small>{/if}
                  </button>
                {/each}
              {/if}
              {#if routeResources.length}
                <h3>{capitalise(resourcePlural())} preview</h3>
                {#each routeResources.slice(0, 12) as resource}
                  <button type="button" onclick={() => inspectLargeRoute(resourceRoute(resource))}>
                    <strong>{largeResourceLabel(resource)}</strong>
                    <span>{resource.format ? facetValueDisplay('format', resource.format) : 'unknown'} · {resource.host ? facetValueDisplay('host', resource.host) : 'unknown host'}</span>
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
            {#if activeView !== 'reader' || largeQuery || activeLargeFilterCount || !largeHasAnalysisOverview('reader')}
              {#each source.providerDatapacks?.packs || [] as providerDatapack}
                <ProviderDatapackStatus pack={providerDatapack} scope="bundle" />
              {/each}
            {/if}
            <dl>
              <dt>Schema</dt><dd>{source.descriptor.schema}</dd>
              {#if source.descriptor.okf_version}<dt>OKF core</dt><dd>Version {source.descriptor.okf_version}</dd>{/if}
              {#if source.descriptor.core_conformance}<dt>Core layer</dt><dd>{source.descriptor.core_conformance}</dd>{/if}
              {#if source.descriptor.version}<dt>Version</dt><dd>{source.descriptor.version}</dd>{/if}
              {#if source.descriptor.status}<dt>Status</dt><dd>{source.descriptor.status}</dd>{/if}
              {#if source.descriptor.profile}<dt>Profile</dt><dd><a href={source.descriptor.profile} target="_blank" rel="noreferrer">{source.descriptor.profile}</a></dd>{/if}
              {#if source.descriptor.entrypoints.markdown_index}<dt>OKF Markdown</dt><dd><a href={bundleResourceUrl(source.descriptor.entrypoints.markdown_index)} target="_blank" rel="noreferrer">normative concept index</a></dd>{/if}
              {#if resourceReferencePath(source.descriptor.entrypoints.conformance)}<dt>Conformance evidence</dt><dd><a href={bundleResourceUrl(resourceReferencePath(source.descriptor.entrypoints.conformance))} target="_blank" rel="noreferrer">validation report</a></dd>{/if}
              {#each semanticResources(source.descriptor) as semanticResource}
                <dt>{semanticResource.label}</dt><dd><a href={bundleResourceUrl(semanticResource.path)} target="_blank" rel="noreferrer">semantic descriptor</a></dd>
              {/each}
              {#if source.descriptor.discovery?.repository}<dt>Repository</dt><dd><a href={source.descriptor.discovery.repository} target="_blank" rel="noopener noreferrer">source repository</a></dd>{/if}
              {#if source.descriptor.discovery?.documentation}<dt>Documentation</dt><dd><a href={source.descriptor.discovery.documentation} target="_blank" rel="noopener noreferrer">documentation</a></dd>{/if}
              {#if source.descriptor.discovery?.raw_subpath}<dt>Repository subpath</dt><dd><code>{source.descriptor.discovery.raw_subpath}</code></dd>{/if}
              {#if source.descriptor.discovery?.release_archive}<dt>Release archive</dt><dd><a href={source.descriptor.discovery.release_archive} target="_blank" rel="noopener noreferrer">frozen releases</a></dd>{/if}
              {#if source.descriptor.publisher}<dt>Publisher</dt><dd><a href={source.descriptor.publisher} target="_blank" rel="noreferrer">{source.descriptor.publisher}</a></dd>{/if}
              {#if source.descriptor.license}<dt>Licence</dt><dd><a href={source.descriptor.license} target="_blank" rel="noreferrer">bundle licence</a></dd>{/if}
              {#if source.termRegistry}<dt>Governed terms</dt><dd>{source.termRegistry.terms.length.toLocaleString()} terms across {source.termRegistry.vocabularies.length.toLocaleString()} vocabularies</dd>{/if}
              {#if source.termValidation}<dt>Term validation</dt><dd>{source.termValidation.status}</dd>{/if}
              <dt>Generated</dt><dd>{source.descriptor.generated_at || source.manifest.generated_at}</dd>
              <dt>Search index</dt>
              <dd title="Unique normalised terms available to local browser search; no AI or paid token usage">
                {source.manifest.search?.tokens?.toLocaleString() || 'Unknown'} distinct indexed terms
              </dd>
              <dt>Hydration</dt><dd>{largeIndex ? 'records loaded' : 'overview only'}</dd>
            </dl>
            {#if source.termRegistry}
              <GovernedTermsPanel
                registry={source.termRegistry}
                validation={source.termValidation}
                baseUrl={source.baseUrl}
              />
            {/if}
          {/if}
        {:else if smallInspectedRelationship && smallCorpus}
          {@const selectedSmallRelationshipPresentation = relationshipPresentation(smallInspectedRelationship)}
          <span class="badge">Relationship</span>
          <span class="badge" data-relationship-authority={selectedSmallRelationshipPresentation.authorityClass}>{selectedSmallRelationshipPresentation.authorityLabel}</span>
          {#if selectedSmallRelationshipPresentation.assertionStatus !== 'unclassified'}
            <span class="badge" data-relationship-status={selectedSmallRelationshipPresentation.assertionStatus}>{selectedSmallRelationshipPresentation.assertionStatus}</span>
          {/if}
          {#if selectedSmallRelationshipPresentation.assertionScope !== 'unclassified'}
            <span class="badge" data-relationship-scope={selectedSmallRelationshipPresentation.assertionScope}>{selectedSmallRelationshipPresentation.assertionScope}</span>
          {/if}
          <span class="badge" data-relationship-freshness={selectedSmallRelationshipPresentation.freshness}>{selectedSmallRelationshipPresentation.freshness}</span>
          <h2>{smallCorpus.nodes[smallInspectedRelationship.source]?.title || smallInspectedRelationship.source} → {smallCorpus.nodes[smallInspectedRelationship.target]?.title || smallInspectedRelationship.target}</h2>
          <p>{smallRelationshipKind(smallInspectedRelationship)}</p>
          <div class="detail-actions">
            <button type="button" onclick={() => inspectNode(smallInspectedRelationship?.source || '')}>Inspect source</button>
            <button type="button" onclick={() => inspectNode(smallInspectedRelationship?.target || '')}>Inspect target</button>
            <button type="button" onclick={clearSmallRelationship}>Clear relationship</button>
          </div>
          <dl>
            <dt>Direction</dt><dd>Source → target</dd>
            <dt>Source</dt><dd><button type="button" onclick={() => inspectNode(smallInspectedRelationship?.source || '')}>{smallCorpus.nodes[smallInspectedRelationship.source]?.title || smallInspectedRelationship.source}</button></dd>
            <dt>Type</dt><dd>{smallRelationshipKind(smallInspectedRelationship)}</dd>
            <dt>Target</dt><dd><button type="button" onclick={() => inspectNode(smallInspectedRelationship?.target || '')}>{smallCorpus.nodes[smallInspectedRelationship.target]?.title || smallInspectedRelationship.target}</button></dd>
            <dt>Source route</dt><dd>{smallInspectedRelationship.source}</dd>
            <dt>Target route</dt><dd>{smallInspectedRelationship.target}</dd>
            {#if selectedSmallRelationshipPresentation.id}<dt>Assertion ID</dt><dd>{selectedSmallRelationshipPresentation.id}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.predicate}<dt>Predicate IRI</dt><dd>{selectedSmallRelationshipPresentation.predicate}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.inverseLabel}<dt>Inverse label</dt><dd>{selectedSmallRelationshipPresentation.inverseLabel}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.sourceIri}<dt>Source IRI</dt><dd>{#if isUrl(selectedSmallRelationshipPresentation.sourceIri)}<a href={selectedSmallRelationshipPresentation.sourceIri} target="_blank" rel="noopener noreferrer">{selectedSmallRelationshipPresentation.sourceIri}</a>{:else}{selectedSmallRelationshipPresentation.sourceIri}{/if}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.targetIri}<dt>Target IRI</dt><dd>{#if isUrl(selectedSmallRelationshipPresentation.targetIri)}<a href={selectedSmallRelationshipPresentation.targetIri} target="_blank" rel="noopener noreferrer">{selectedSmallRelationshipPresentation.targetIri}</a>{:else}{selectedSmallRelationshipPresentation.targetIri}{/if}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.assertionStatus !== 'unclassified'}<dt>Assertion status</dt><dd>{selectedSmallRelationshipPresentation.assertionStatus}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.assertionScope !== 'unclassified'}<dt>Assertion scope</dt><dd>{selectedSmallRelationshipPresentation.assertionScope}</dd>{/if}
            <dt>Authority</dt><dd>{selectedSmallRelationshipPresentation.authorityLabel}</dd>
            {#if selectedSmallRelationshipPresentation.authoritySource}<dt>Authority source</dt><dd>{#if isUrl(selectedSmallRelationshipPresentation.authoritySource)}<a href={selectedSmallRelationshipPresentation.authoritySource} target="_blank" rel="noopener noreferrer">{selectedSmallRelationshipPresentation.authoritySource}</a>{:else}{selectedSmallRelationshipPresentation.authoritySource}{/if}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.derivation}<dt>Derivation</dt><dd>{#if isUrl(selectedSmallRelationshipPresentation.derivation)}<a href={selectedSmallRelationshipPresentation.derivation} target="_blank" rel="noopener noreferrer">{selectedSmallRelationshipPresentation.derivation}</a>{:else}{selectedSmallRelationshipPresentation.derivation}{/if}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.derivationActivity}<dt>Derivation activity</dt><dd>{#if isUrl(selectedSmallRelationshipPresentation.derivationActivity)}<a href={selectedSmallRelationshipPresentation.derivationActivity} target="_blank" rel="noopener noreferrer">{selectedSmallRelationshipPresentation.derivationActivity}</a>{:else}{selectedSmallRelationshipPresentation.derivationActivity}{/if}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.rule}<dt>Rule</dt><dd>{#if isUrl(selectedSmallRelationshipPresentation.rule)}<a href={selectedSmallRelationshipPresentation.rule} target="_blank" rel="noopener noreferrer">{selectedSmallRelationshipPresentation.rule}</a>{:else}{selectedSmallRelationshipPresentation.rule}{/if}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.supportingAssertions.length}<dt>Supporting assertions</dt><dd>{selectedSmallRelationshipPresentation.supportingAssertions.join(', ')}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.confidence}<dt>Confidence</dt><dd>{selectedSmallRelationshipPresentation.confidence}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.observedAt}<dt>Observed</dt><dd>{selectedSmallRelationshipPresentation.observedAt}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.staleAfter}<dt>Stale after</dt><dd>{selectedSmallRelationshipPresentation.staleAfter}</dd>{/if}
            <dt>Freshness</dt><dd>{selectedSmallRelationshipPresentation.freshness}</dd>
            {#if selectedSmallRelationshipPresentation.rightsSource}<dt>Rights source</dt><dd>{#if isUrl(selectedSmallRelationshipPresentation.rightsSource)}<a href={selectedSmallRelationshipPresentation.rightsSource} target="_blank" rel="noopener noreferrer">{selectedSmallRelationshipPresentation.rightsSource}</a>{:else}{selectedSmallRelationshipPresentation.rightsSource}{/if}</dd>{/if}
            {#if selectedSmallRelationshipPresentation.rightsAssertion}<dt>Rights assertion</dt><dd>{selectedSmallRelationshipPresentation.rightsAssertion}</dd>{/if}
          </dl>
          {#if selectedSmallRelationshipPresentation.evidenceItems.length}
            <h3>Relationship evidence and provenance</h3>
            <div class="model-evidence-list">
              {#each selectedSmallRelationshipPresentation.evidenceItems as evidence, evidenceIndex}
                <article data-evidence-index={evidenceIndex} data-evidence-source-field={evidence.sourceField || 'unspecified'}>
                  <strong>{evidence.sourceField || `Evidence ${evidenceIndex + 1}`}</strong>
                  {#if evidence.sourceArtifact}<small>Artefact {evidence.sourceArtifact}</small>{/if}
                  {#if evidence.sourceSha256}<small>Artefact SHA-256 <code>{evidence.sourceSha256}</code></small>{/if}
                  {#if evidence.locator}<small>Locator <code>{evidence.locator}</code></small>{/if}
                  {#if evidence.retrievedAt}<small>Retrieved {evidence.retrievedAt}</small>{/if}
                  {#if evidence.fieldProvenance}<small>{evidence.fieldProvenance}</small>{/if}
                  {#if evidence.url}<a href={evidence.url} target="_blank" rel="noopener noreferrer">Source evidence</a>{/if}
                </article>
              {/each}
            </div>
          {/if}
          <details class="json-panel">
            <summary>Relationship JSON</summary>
            <pre>{jsonText(smallInspectedRelationship)}</pre>
          </details>
        {:else if detailNode}
          {@const okf = okfConceptPresentation(detailNode)}
          <span class="badge">{detailNode.type || 'Node'}</span>
          {#if smallCorpus?.okfVersion}<span class="badge">OKF {smallCorpus.okfVersion}</span>{/if}
          <span class="badge" data-trust-tier={okf.trustTier}>{trustTierLabel(okf.trustTier)}</span>
          <span class="badge" data-lifecycle-status={okf.status}>{okf.status}</span>
          {#if okf.stale}<span class="badge warning" data-stale="true">Stale</span>{/if}
          <h2>{detailNode.title}</h2>
          <p>{detailNode.description || detailNode.summary || detailNode.source || detailNode.id}</p>
          {#if selectedFederationChild && (selectedFederationChild.descriptor || selectedFederationChild.discovery.routes.some((route) => route.purpose === 'descriptor' || (!route.purpose && ['published', 'raw'].includes(route.kind))))}
            <div class="detail-actions">
              <button type="button" onclick={() => loadFederationChild(selectedFederationChild)}>Load child bundle</button>
            </div>
          {/if}
          <dl>
            <dt>Route</dt><dd>{detailNode.id}</dd>
            <dt>Section</dt><dd>{detailNode.section || 'root'}</dd>
            <dt>Source</dt><dd>{metadataDisplayValue(detailNode.source)}</dd>
            <dt>Links</dt><dd>{detailRelationships.length}</dd>
          </dl>
          <section class="okf-v02-summary" aria-label="OKF trust, lifecycle and provenance">
            <h3>Trust, lifecycle and provenance</h3>
            <p class="muted">OKF v0.2 signals are advisory context for deciding whether and how to use this concept.</p>
            <dl>
              <dt>Trust tier</dt><dd>{trustTierLabel(okf.trustTier)}</dd>
              <dt>Lifecycle</dt><dd>{okf.status}{detailNode.status ? '' : ' (default)'}</dd>
              <dt>Generated by</dt><dd>{okf.generated.by || 'Not declared'}</dd>
              <dt>Generated at</dt>
              <dd>
                {okf.generated.at || 'Not declared'}
                {#if okf.generated.basis === 'legacy-v0.1-timestamp'}<small>Legacy OKF v0.1 timestamp fallback</small>{/if}
              </dd>
              {#if okf.verified.length}
                <dt>Verified</dt>
                <dd>{okf.verified.map((event) => `${event.by || 'Unknown actor'}${event.at ? ` · ${event.at}` : ''}`).join('; ')}</dd>
              {/if}
              {#if okf.staleAfter}
                <dt>Stale after</dt><dd>{okf.staleAfter}{okf.stale ? ' · stale now' : ' · currently fresh'}</dd>
              {/if}
              {#if okf.usageWindow}
                <dt>Usage window</dt><dd>{okf.usageWindow.from || '…'} → {okf.usageWindow.to || '…'}</dd>
              {/if}
            </dl>
            {#if okf.sources.length}
              <h4>Provenance sources</h4>
              <div class="okf-source-list">
                {#each okf.sources as provenanceSource, index}
                  <article>
                    <strong>{provenanceSource.title || provenanceSource.id || `Source ${index + 1}`}</strong>
                    <code>{provenanceSource.resource}</code>
                    {#if provenanceSource.author}<span>Author {provenanceSource.author}</span>{/if}
                    {#if provenanceSource.last_modified}<span>Modified {provenanceSource.last_modified}</span>{/if}
                    {#if typeof provenanceSource.usage_count === 'number'}<span>Usage {provenanceSource.usage_count.toLocaleString()}</span>{/if}
                    {#if provenanceSource.legacy}<small>Legacy # Citations fallback</small>{/if}
                  </article>
                {/each}
              </div>
            {/if}
          </section>
          {#if okf.attestedComputation}
            <section class="attestation-contract" aria-label="Attested Computation contract">
              <h3>Attested Computation contract</h3>
              <p><strong>Declared contract only.</strong> Explorer does not execute the computation, executor or attester when a bundle is opened.</p>
              <dl>
                <dt>Runtime</dt><dd>{okf.attestedComputation.runtime || 'Not declared'}</dd>
                <dt>Computation</dt><dd>{okf.attestedComputation.computation || (okf.attestedComputation.inlineComputation ? 'Inline fenced computation' : 'Not declared')}</dd>
                <dt>Parameters</dt><dd>{okf.attestedComputation.parameters.length ? okf.attestedComputation.parameters.map((parameter) => `${parameter.name}: ${parameter.type}${parameter.required ? ' (required)' : ''}`).join('; ') : 'None declared'}</dd>
                <dt>Executor</dt><dd>{okf.attestedComputation.executorResource || 'Not declared'}</dd>
                <dt>Receipt</dt><dd>{okf.attestedComputation.receiptFields.join(', ') || 'Not declared'}</dd>
                <dt>Attester</dt><dd>{okf.attestedComputation.attesterResource || 'Not declared'}</dd>
              </dl>
              {#if okf.attestedComputation.contractWarnings.length}
                <p class="warning-text">{okf.attestedComputation.contractWarnings.join(' ')}</p>
              {/if}
            </section>
          {/if}
          {@const nodeLinks = smallNodeLinks(detailNode, source?.kind === 'small' ? source.url : '')}
          {#if nodeLinks.length}
            <section class="small-node-links" aria-label="Source and resource links">
              <h3>Source and resources</h3>
              {#each nodeLinks as link}
                <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>
              {/each}
            </section>
          {/if}
          {@const metadataRows = smallNodeMetadataRows(detailNode)}
          {#if metadataRows.length}
            <h3>Selected metadata</h3>
            <dl>
              {#each metadataRows as row}
                <dt>{row.label}</dt><dd>{metadataDisplayValue(row.value)}</dd>
              {/each}
            </dl>
          {/if}
          {#if detailNode.body}
            <section class="markdown-body" aria-label="Markdown body">
              {@html renderSafeMarkdown(detailNode.body, source?.kind === 'small' ? source.url : '')}
            </section>
          {/if}
          <h3>Relationships</h3>
          {#each detailRelationships.slice(0, 20) as relationship}
            <button type="button" onclick={() => inspectNode(relationship.source === detailNode?.id ? relationship.target : relationship.source)}>
              {relationship.kind || 'related'} · {smallCorpus?.nodes[relationship.source === detailNode.id ? relationship.target : relationship.source]?.title}
            </button>
          {/each}
          <details class="json-panel">
            <summary>Node JSON and provenance</summary>
            <pre>{jsonText(detailNode)}</pre>
          </details>
        {:else}
          <h2>No selection</h2>
          <p>Select a node or search result to inspect its data.</p>
        {/if}
      </div>
    </aside>
  </main>
</div>
