export type ViewMode = 'reader' | 'graph' | 'links' | 'timeline' | 'type' | 'resources' | 'map' | 'narrative';

export type OkfNode = {
  id: string;
  title: string;
  type?: string;
  section?: string;
  source?: string;
  description?: string;
  summary?: string;
  timestamp?: string;
  aliases?: string[];
  tags?: string[];
  body?: string;
  [key: string]: unknown;
};

export type OkfRelationship = {
  source: string;
  target: string;
  kind?: string;
  type?: string;
  label?: string;
  [key: string]: unknown;
};

export type NormalizedCorpus = {
  id: string;
  title: string;
  description?: string;
  nodes: Record<string, OkfNode>;
  relationships: OkfRelationship[];
  meta?: Record<string, unknown>;
};

export type OkfBundle = {
  okf_version?: string;
  version?: string;
  title?: string;
  meta?: {
    title?: string;
    description?: string;
    generated_at?: string;
    [key: string]: unknown;
  };
  corpora?: Record<string, Partial<NormalizedCorpus> & { edges?: OkfRelationship[] }>;
  nodes?: Record<string, OkfNode>;
  relationships?: OkfRelationship[];
  edges?: OkfRelationship[];
};

export type LargeResourceReference =
  | string
  | {
      path: string;
      sha256?: string;
      compression?: 'identity' | 'gzip' | string;
    };

export type LargeShardMetadata = {
  path: string;
  sha256: string;
  compressed_bytes?: number;
  compression?: 'identity' | 'gzip' | string;
  [key: string]: unknown;
};

export type LargeReleasePack = {
  id: string;
  asset_name: string;
  bytes: number;
  sha256: string;
  path: string;
  release_url: string;
};

export type LargeReleaseDataPlaneEntry = {
  path: string;
  bytes: number;
  sha256: string;
  compression: 'identity' | 'gzip' | string;
  pack: string;
  offset: number;
  packed_bytes: number;
  packed_sha256: string;
  transport_compression: 'identity' | 'gzip' | string;
};

export type LargeReleaseDataPlaneIndex = {
  schema: 'govuk-okf-github-release-pack-index.v1' | string;
  schema_version: string;
  algorithm: 'concatenated-byte-ranges-v1' | string;
  repository: string;
  tag: string;
  snapshot: string;
  max_pack_bytes: number;
  packs: LargeReleasePack[];
  entries: LargeReleaseDataPlaneEntry[];
  counts: {
    packs: number;
    virtual_shards: number;
    packed_bytes: number;
    source_bytes: number;
  };
  index_root_sha256: string;
};

export type LargeCorpusDescriptor = {
  '@context'?: string | Record<string, unknown> | Array<string | Record<string, unknown>>;
  '@id'?: string;
  schema: 'okf-explorer-large-corpus.v1' | string;
  kind: 'okf-large-corpus' | string;
  title: string;
  description?: string;
  version?: string;
  status?: string;
  profile?: string;
  publisher?: string;
  license?: string;
  semantic_descriptor?: string;
  generated_at?: string;
  snapshot?: string;
  snapshot_id?: string;
  data_plane_manifest_root_sha256?: string;
  entrypoints: {
    viewer?: string;
    data_manifest: string;
    overview_index?: string;
    analysis_overview?: string;
    presentation?: LargeResourceReference;
    search_manifest?: string;
    notes?: string;
    performance?: string;
    relationship_adjacency?: string;
    operational_metadata?: string;
    provider_datapacks?: LargeResourceReference;
    release_data_plane?: LargeResourceReference;
  };
  entrypoint_integrity?: Record<string, Exclude<LargeResourceReference, string>>;
  distribution?: {
    control_plane?: string;
    data_plane?: string;
    release_mirror?: string;
    browser_release_asset_fetch?: boolean;
    immutable_release_required?: boolean;
    [key: string]: unknown;
  };
  counts: Record<string, number>;
  performance?: Record<string, unknown>;
  source?: Record<string, unknown>;
  extensions?: Record<string, Record<string, unknown>>;
  vocabulary?: {
    record_singular?: string;
    record_plural?: string;
    resource_singular?: string;
    resource_plural?: string;
    publisher_singular?: string;
    publisher_plural?: string;
    format_plural?: string;
    resource_stack_label?: string;
    search_placeholder?: string;
    [key: string]: string | undefined;
  };
};

export type LargeDataManifest = {
  title: string;
  generated_at: string;
  snapshot?: string;
  counts: Record<string, number>;
  indexes: {
    overview: string;
    analysis?: string;
    presentation?: string;
    search?: string;
    facets?: string;
    graph?: string;
    govuk_content?: string;
    relationship_adjacency?: string;
    operational_metadata?: string;
    provider_datapacks?: LargeResourceReference;
  };
  chunks: Record<string, LargeResourceReference[]>;
  shards?: Record<string, LargeShardMetadata[]>;
  integrity?: {
    manifest_root_sha256?: string;
    [key: string]: unknown;
  };
  performance?: Record<string, unknown>;
  search?: {
    schema: string;
    documents: number;
    tokens: number;
    result_limit: number;
  };
};

export type LargeSearchManifest = {
  schema: 'okf-static-search.v1' | 'okf-static-search.v2' | 'gov-ckan-static-search.v1' | string;
  token_min_length: number;
  prefix_min_length: number;
  lexicon_shard_length: number;
  result_limit: number;
  result_doc_chunk_size: number;
  weights: Record<string, number>;
  field_masks: Record<string, number>;
  counts: Record<string, number>;
  snapshot?: string;
  snapshot_id?: string;
  shard_metadata?: string;
  shard_manifest_sha256?: string;
  postings_partitioning?: Record<string, unknown>;
  doc_map_partitioning?: Record<string, unknown>;
  entrypoints: {
    lexicon: Record<string, string>;
    prefixes: Record<string, string>;
    postings: string[];
    result_docs: string[];
    facets: string;
    doc_map: string | string[];
    filter_postings?: Record<string, string>;
    sort_values?: string;
    entities?: string;
  };
};

export type SearchRankingStrategy = 'weighted' | 'idf' | 'idf-exact';

export type LargeSearchRequest = {
  query: string;
  filters: Record<string, string[]>;
  sort: 'relevance' | 'newest' | 'title' | 'metadata-quality';
  ranking?: SearchRankingStrategy;
  facet_keys?: string[];
  /** Skip result-document hydration when only exact facet distributions are required. */
  include_results?: boolean;
};

export type SearchMatchExplanation = {
  query_tokens: string[];
  matched_fields: string[];
  recognized_entity?: SearchEntityMatch;
  score_components: {
    weighted: number;
    idf: number;
    exact: number;
    entity?: number;
    total: number;
  };
};

export type SearchEntity = {
  id: string;
  label: string;
  kind: string;
  aliases?: string[];
  filter_key: string;
  filter_value: string;
  count?: number;
  route?: string;
};

export type SearchEntityMatch = {
  id: string;
  label: string;
  kind: string;
  filter_key: string;
  filter_value: string;
  matched_alias?: string;
};

export type LargeSearchTruncation = {
  reason: 'result-limit' | 'capped-postings' | 'result-chunk-budget';
  loaded_result_chunks?: number;
  result_chunk_budget?: number;
};

export type LargeSearchResponse = {
  results: SearchResultDoc[];
  total: number;
  /** Whether total is exact, a lower bound, or only the size of an approximate candidate set. */
  total_relation: 'eq' | 'gte' | 'unknown';
  truncated: boolean;
  /** All simultaneous limits that affected this response. */
  truncations: LargeSearchTruncation[];
  /** The first/most actionable truncation, retained for older consumers. */
  truncation?: LargeSearchTruncation;
  filters_applied: boolean;
  /** Values proven absent from an available filter-postings index. */
  ignored_filters: Record<string, string[]>;
  facets: Record<string, LargeFacetRow[]>;
  ranking: SearchRankingStrategy;
  elapsed_ms: number;
  interpreted_entity?: SearchEntityMatch;
};

export type LargeFilterPostings = {
  schema: 'okf-static-filter-postings.v1' | string;
  key: string;
  values: Record<string, number[]>;
};

export type LargeSortValue = [timestamp: string, title: string, qualityScore: number | null];

export type LargeOverview = {
  schema: string;
  title: string;
  generated_at: string;
  counts: Record<string, number>;
  top_publishers?: Array<Record<string, unknown>>;
  recent_datasets?: SearchResultDoc[];
  format_counts?: Array<{ value: string; count: number }>;
  facet_previews?: Record<string, Array<{ value: string; count: number }>>;
  notices?: string[];
};

export type LargeFacetValueType = 'nominal' | 'ordinal' | 'number' | 'date' | string;

export type LargeFacetValueOrder =
  | 'count-desc'
  | 'label-asc'
  | 'label-desc'
  | 'value-asc'
  | 'value-desc'
  | string;

export type LargeFacetAnalysis = {
  key: string;
  label: string;
  description?: string;
  coverage: number;
  cardinality: number;
  top_share: number;
  entropy: number;
  expected_reduction: number;
  recommended_control: string;
  recommendation: 'primary' | 'secondary' | 'advanced' | 'suppressed' | string;
  hierarchy_available?: boolean;
  display_priority?: number;
  default_pinned?: boolean;
  default_hidden?: boolean;
  value_type?: LargeFacetValueType;
  value_order?: LargeFacetValueOrder;
  examples?: string[];
  values?: Array<{ value: string; count: number }>;
};

export type LargeExplorerDisplay = {
  facets?: {
    order?: string[];
    pinned?: string[];
    hidden?: string[];
    default_mode?: 'suggested' | 'all';
    high_cardinality_threshold?: number;
    distribution_segments?: number;
  };
  detail?: {
    tabs?: Array<'overview' | 'evidence' | 'data' | string>;
    default_tab?: 'overview' | 'evidence' | 'data' | string;
  };
};

export type LargeExplorerPresentationFacet = {
  key: string;
  label?: string;
  description?: string;
  value_type?: 'nominal' | 'ordinal' | 'number' | 'date';
  order?: number;
  default_state?: 'pinned' | 'shown' | 'hidden';
  open_control?: 'auto' | 'distribution' | 'histogram' | 'search' | 'list';
  value_order?: 'count-desc' | 'label-asc' | 'label-desc' | 'value-asc' | 'value-desc';
  examples?: string[];
};

export type LargeExplorerPresentation = {
  schema: 'okf-explorer-presentation.v1';
  status?: 'experimental' | 'stable' | 'deprecated';
  snapshot?: string;
  defaults?: {
    facet_mode?: 'suggested' | 'all';
    search_threshold?: number;
    distribution_segment_limit?: number;
  };
  facets?: LargeExplorerPresentationFacet[];
  panels?: {
    left?: { tabs?: Array<'facets' | 'browse' | 'results'>; default_tab?: 'facets' | 'browse' | 'results' };
    right?: { tabs?: Array<'overview' | 'evidence' | 'data'>; default_tab?: 'overview' | 'evidence' | 'data' };
  };
};

export type LargeProviderDatapackSelector = {
  field: string;
  operator: 'equals';
  value: string;
};

export type LargeProviderDatapackRecord = {
  recordId: string;
  title: string;
  timeCoverageEnd?: string;
  metadataModified?: string;
  dataModified?: string;
};

export type LargeProviderDatapackAction = {
  id: string;
  label: string;
  kind: 'external-link';
  urlTemplate: string;
  network: 'external';
};

export type LargeProviderDatapackComparisonStatus =
  | 'known-drift'
  | 'aligned'
  | 'unknown';

export type LargeProviderDatapack = {
  schema: 'okf-explorer-provider-datapack.v1';
  snapshot: string;
  id: string;
  provider: {
    id: string;
    title: string;
    liveServiceUrl: string;
    repositoryUrl: string;
  };
  selector: LargeProviderDatapackSelector;
  governedSnapshot: {
    status: 'governed-pinned-snapshot';
    label: string;
    snapshotId: string;
    recordCount: number;
    sourceCommit: string;
    sourceCommitShort: string;
    sourceAsOf: string;
    sourceAsOfBasis: string;
    metadataOnly: true;
    observationsIncluded: false;
    records: LargeProviderDatapackRecord[];
  };
  reviewedLiveReference: {
    status: 'reviewed-reference-not-live-validated';
    label: string;
    lastChecked: string;
    network: 'external';
    liveServiceUrl: string;
    repositoryUrl: string;
    sourceCommit: string;
    sourceCommitShort: string;
    sourceCommitAsOf: string;
    metadataInputSha256: string;
    records: LargeProviderDatapackRecord[];
  };
  comparison: {
    status: LargeProviderDatapackComparisonStatus;
    comparisonAsOf: string;
    summary: string;
    evidenceScope: 'reviewed-record-examples';
    exhaustive: false;
    executionRequiresLiveValidation: true;
    differences: Array<{
      recordId: string;
      title: string;
      fields: Array<{
        field: string;
        snapshot: string;
        reviewedLiveReference: string;
      }>;
    }>;
  };
  presentation: {
    snapshotLabel: string;
    liveLabel: string;
    lastCheckedWording: string;
    notice: string;
    actions: LargeProviderDatapackAction[];
  };
};

export type LargeProviderDatapackManifestEntry = {
  id: string;
  selector: LargeProviderDatapackSelector;
  path: string;
  sha256: string;
  status: LargeProviderDatapackComparisonStatus;
  lastChecked: string;
};

export type LargeProviderDatapackManifest = {
  schema: 'okf-explorer-provider-datapack-manifest.v1';
  snapshot: string;
  packCount: number;
  packs: LargeProviderDatapackManifestEntry[];
};

export type LargeProviderDatapackCollection = {
  manifest: LargeProviderDatapackManifest;
  packs: LargeProviderDatapack[];
};

export type LargeAnalysisOverview = {
  schema: 'okf-explorer-analysis.v1' | string;
  generated_at: string;
  source_bundle?: string;
  display?: LargeExplorerDisplay;
  summary?: {
    title?: string;
    description?: string;
    record_count?: number;
    resource_count?: number;
    relationship_count?: number;
    notices?: string[];
  };
  graph_overview?: {
    nodes: Array<{ id: string; label: string; type: string; count?: number; route?: string; context?: Record<string, unknown> }>;
    edges: Array<{ source: string; target: string; label: string; count?: number; context?: Record<string, unknown> }>;
  };
  timeline_overview?: {
    buckets: Array<{ id: string; label: string; count: number; route?: string; samples?: SearchResultDoc[] }>;
  };
  relationship_overview?: {
    types: Array<{ kind: string; count: number; samples?: Array<{ source: string; target: string; label?: string }> }>;
    top_connected?: Array<{ id: string; label: string; type: string; count: number }>;
  };
  resource_overview?: {
    total_resources?: number;
    high_resource_datasets?: Array<{ route: string; label: string; count: number; publisher?: string; samples?: Array<{ id: string; label: string; format?: string; host?: string }> }>;
    distributions?: Record<string, Array<{ value: string; count: number }>>;
  };
  facet_analysis?: LargeFacetAnalysis[];
  hierarchies?: Array<{
    id: string;
    label: string;
    facet: string;
    levels: string[];
    values: Array<{ id: string; label: string; count: number; route?: string; children?: Array<{ id: string; label: string; count: number; route?: string }> }>;
  }>;
  ontology_candidates?: Array<{
    id: string;
    label: string;
    confidence: number;
    coverage: number;
    classes?: string[];
    properties?: string[];
    notes?: string[];
  }>;
  narrative?: {
    title?: string;
    body?: string;
  };
};

export type SearchResultDoc = {
  ordinal: number;
  name: string;
  title: string;
  publisher: string;
  publisher_title: string;
  resource_count: number;
  formats: string[];
  tags: string[];
  topics?: string[];
  quality_score?: number;
  timestamp?: string;
  notes?: string;
  context_note?: string;
  endpoint_host?: string;
  documentation_host?: string;
  access_model?: string;
  contract_status?: string;
  license_id?: string;
  license_title?: string;
  license_source_id?: string;
  license_source_title?: string;
  license_confidence?: number;
  license_basis?: string;
  record_type?: string;
  source_tier?: string;
  source_adapter?: string;
  source_surface?: string;
  record_id?: string;
  native_id?: string;
  confidence?: string;
  dcat_type?: string;
  dcat_export_status?: string;
  openapi_type?: string;
  openapi_export_status?: string;
  openapi_security_scheme?: string;
  protocol?: string[];
  documentation?: string;
  url?: string;
  open: string;
  score?: number;
  match?: SearchMatchExplanation;
  legislation_id_uri?: string;
  document_uri?: string;
  structure_url?: string;
  table_of_contents_url?: string;
  document_type?: string;
  type_code?: string;
  category?: string;
  year?: string;
  number?: string;
  creation_date?: string;
  published_at?: string;
  updated_at?: string;
  series_id?: string;
  series?: string;
  series_title?: string;
  temporal_coverage?: string | string[] | { start?: string; end?: string; years?: string[]; [key: string]: unknown };
  coverage_years?: string[];
  jurisdiction?: string[];
  legal_status?: string;
  schema_org_type?: string;
  eli_class?: string;
  manifestations?: Record<string, string>;
  effects_made_url?: string;
  effects_received_url?: string;
  official_full_text_match?: boolean;
};

export type SearchSuggestion = {
  token: string;
  df: number;
  kind?: 'entity' | 'term';
  label?: string;
  query?: string;
  entity_kind?: string;
};

export type LargeFacetRow = {
  value: string;
  count: number;
};

export type LargeDatasetOperationalMetadata = {
  canonical_source?: {
    url: string;
    label?: string;
    host?: string;
  };
  authoritative_source?: {
    name: string;
    url?: string;
  };
  update_frequency?: string;
  latest_release?: {
    date?: string;
    label?: string;
    dynamic?: boolean;
  };
  maintenance_status?: string;
  distributions?: Array<{
    label: string;
    kind?: string;
    url?: string;
  }>;
  api?: {
    available?: boolean;
    access?: string;
    url?: string;
  };
  technical_specification_url?: string;
  licence_url?: string;
  verified_at?: string;
  provenance?: {
    source_url?: string;
    observed_at?: string;
    method?: string;
    [key: string]: unknown;
  };
};

export type LargeOperationalMetadataIndex = {
  schema: 'okf-operational-metadata.v1' | string;
  generated_at?: string;
  records: Record<string, LargeDatasetOperationalMetadata>;
};

export type LargeDataset = {
  id?: string;
  name: string;
  title: string;
  notes?: string;
  publisher?: string;
  publisher_title?: string;
  resource_count?: number;
  resource_ids?: string[];
  formats?: string[];
  tags?: string[];
  topics?: string[];
  timestamp?: string;
  metadata_created?: string;
  metadata_modified?: string;
  license_id?: string;
  license_title?: string;
  license_source_id?: string;
  license_source_title?: string;
  license_confidence?: number;
  license_basis?: string;
  host?: string;
  resource_hosts?: string[];
  govuk_content_paths?: string[];
  source_api_url?: string;
  concept_id?: string;
  route?: string;
  publisher_concept_id?: string;
  quality?: {
    overall?: number;
    metrics?: Record<string, number | null>;
    notes?: string[];
  };
  provenance?: Record<string, unknown>;
  url?: string;
  state?: string;
  type?: string;
  record_type?: string;
  source_tier?: string;
  source_adapter?: string;
  operational_metadata?: LargeDatasetOperationalMetadata;
  confidence?: string;
  dcat_type?: string;
  dcat_export_status?: string;
  openapi_type?: string;
  openapi_export_status?: string;
  openapi_security_scheme?: string;
  standards_alignment?: {
    claim?: string;
    profiles?: string[];
    dcat?: {
      term?: string;
      export_status?: string;
      required_missing?: string[];
      properties?: string[];
    };
    openapi?: {
      term?: string;
      export_status?: string;
      required_missing?: string[];
      security_scheme_type?: string;
      protocol_terms?: string[];
    };
    notes?: string[];
    [key: string]: unknown;
  };
  protocol?: string[];
  isopen?: boolean;
  private?: boolean;
  extras?: Record<string, unknown>;
  groups?: unknown[];
  legislation_id_uri?: string;
  document_uri?: string;
  structure_url?: string;
  table_of_contents_url?: string;
  document_type?: string;
  type_code?: string;
  category?: string;
  year?: string;
  number?: string;
  creation_date?: string;
  published_at?: string;
  updated_at?: string;
  jurisdiction?: string[];
  legal_status?: string;
  schema_org_type?: string;
  eli_class?: string;
  manifestations?: Record<string, string>;
  effects_made_url?: string;
  effects_received_url?: string;
  [key: string]: unknown;
};

export type LargeResource = {
  id: string;
  dataset: string;
  name?: string;
  description?: string;
  format?: string;
  source_format?: string;
  format_confidence?: number;
  concept_id?: string;
  route?: string;
  dataset_concept_id?: string;
  provenance?: Record<string, unknown>;
  host?: string;
  url?: string;
  resource_type?: string;
  position?: number;
  created?: string;
  metadata_modified?: string;
  last_modified?: string;
  govuk_content_path?: string;
  schema_type?: string;
  schema_url?: string;
  size?: number | null;
  state?: string;
  [key: string]: unknown;
};

export type LargePublisher = {
  id?: string;
  name: string;
  title: string;
  description?: string;
  dataset_count?: number;
  resource_count?: number;
  concept_id?: string;
  route?: string;
  provenance?: Record<string, unknown>;
  state?: string;
  approval_status?: string;
  type?: string;
  [key: string]: unknown;
};

export type LargeRelationship = {
  source: string;
  target: string;
  kind: string;
  [key: string]: unknown;
};

export type LargeRelationshipsResult = {
  relationships: LargeRelationship[];
  truncated: boolean;
};

export type LargeRelationshipAdjacencyManifest = {
  schema: 'okf-relationship-adjacency.v1' | string;
  algorithm: 'fnv1a32-prefix-2' | string;
  routes: number;
  relationships: number;
  snapshot?: string;
  buckets: Record<string, LargeResourceReference>;
  shards?: LargeShardMetadata[];
};

export type LargeGraphIndex = {
  edge_counts?: Array<{ kind: string; count: number }>;
  node_counts?: Record<string, number>;
  relationship_index?: string;
  top_publishers?: Array<{ id: string; label: string; dataset_count?: number; resource_count?: number }>;
  [key: string]: unknown;
};

export type LargeGovukContent = Record<
  string,
  {
    path?: string;
    base_path?: string;
    title?: string;
    description?: string;
    document_type?: string;
    schema_name?: string;
    public_updated_at?: string;
    web_url?: string;
    [key: string]: unknown;
  }
>;

export type LargeFullIndex = {
  datasets: LargeDataset[];
  resources: LargeResource[];
  publishers: LargePublisher[];
  facets: Record<string, LargeFacetRow[]>;
  graph: LargeGraphIndex;
  govukContent: LargeGovukContent;
  operationalMetadata: LargeOperationalMetadataIndex;
  datasetByName: Map<string, LargeDataset>;
  resourceById: Map<string, LargeResource>;
  publisherByName: Map<string, LargePublisher>;
  resourcesByDataset: Map<string, LargeResource[]>;
};

export type LargeCorpusSource = {
  kind: 'large';
  url: string;
  baseUrl: string;
  snapshot: string;
  descriptor: LargeCorpusDescriptor;
  manifest: LargeDataManifest;
  overview: LargeOverview;
  analysis?: LargeAnalysisOverview;
  presentation?: LargeExplorerPresentation;
  providerDatapacks?: LargeProviderDatapackCollection;
  releaseDataPlane?: LargeReleaseDataPlaneIndex;
  searchManifest?: LargeResourceReference;
  loadFacetIndex: () => Promise<Record<string, LargeFacetRow[]>>;
  loadFullIndex: () => Promise<LargeFullIndex>;
  loadRelationships: (maxRows?: number) => Promise<LargeRelationshipsResult>;
  loadRelationshipsForRoute: (route: string) => Promise<LargeRelationship[]>;
};

export type BundleRegistryEntry = {
  id?: string;
  label?: string;
  title?: string;
  url: string;
  description?: string;
  kind?: 'bundle' | 'large-corpus' | 'history' | string;
  semantic_url?: string;
  home_url?: string;
  profile?: string;
  version?: string;
  status?: string;
  publisher?: string;
  license?: string;
};

export type LoadedSource =
  | {
      kind: 'small';
      url: string;
      title: string;
      corpus: NormalizedCorpus;
    }
  | LargeCorpusSource;
