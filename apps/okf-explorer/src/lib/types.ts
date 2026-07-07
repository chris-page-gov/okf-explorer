export type ViewMode = 'reader' | 'graph' | 'links' | 'timeline' | 'type' | 'resources' | 'narrative';

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
  corpora?: Record<string, Partial<NormalizedCorpus>>;
  nodes?: Record<string, OkfNode>;
  relationships?: OkfRelationship[];
};

export type LargeCorpusDescriptor = {
  schema: 'okf-explorer-large-corpus.v1' | string;
  kind: 'okf-large-corpus' | string;
  title: string;
  description?: string;
  generated_at?: string;
  entrypoints: {
    viewer?: string;
    data_manifest: string;
    overview_index?: string;
    analysis_overview?: string;
    search_manifest?: string;
    notes?: string;
    performance?: string;
  };
  counts: Record<string, number>;
  performance?: Record<string, unknown>;
  source?: Record<string, unknown>;
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
  counts: Record<string, number>;
  indexes: {
    overview: string;
    analysis?: string;
    search?: string;
    facets?: string;
    graph?: string;
    govuk_content?: string;
  };
  chunks: Record<string, string[]>;
  performance?: Record<string, unknown>;
  search?: {
    schema: string;
    documents: number;
    tokens: number;
    result_limit: number;
  };
};

export type LargeSearchManifest = {
  schema: 'gov-ckan-static-search.v1' | string;
  token_min_length: number;
  prefix_min_length: number;
  lexicon_shard_length: number;
  result_limit: number;
  result_doc_chunk_size: number;
  weights: Record<string, number>;
  field_masks: Record<string, number>;
  counts: Record<string, number>;
  entrypoints: {
    lexicon: Record<string, string>;
    prefixes: Record<string, string>;
    postings: string[];
    result_docs: string[];
    facets: string;
    doc_map: string;
  };
};

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

export type LargeAnalysisOverview = {
  schema: 'okf-explorer-analysis.v1' | string;
  generated_at: string;
  source_bundle?: string;
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
  facet_analysis?: Array<{
    key: string;
    label: string;
    coverage: number;
    cardinality: number;
    top_share: number;
    entropy: number;
    expected_reduction: number;
    recommended_control: string;
    recommendation: 'primary' | 'secondary' | 'advanced' | 'suppressed' | string;
    hierarchy_available?: boolean;
    values?: Array<{ value: string; count: number }>;
  }>;
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
  record_type?: string;
  source_tier?: string;
  source_adapter?: string;
  confidence?: string;
  protocol?: string[];
  documentation?: string;
  url?: string;
  open: string;
  score?: number;
};

export type SearchSuggestion = {
  token: string;
  df: number;
};

export type LargeFacetRow = {
  value: string;
  count: number;
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
  confidence?: string;
  protocol?: string[];
  isopen?: boolean;
  private?: boolean;
  extras?: Record<string, unknown>;
  groups?: unknown[];
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
  datasetByName: Map<string, LargeDataset>;
  resourceById: Map<string, LargeResource>;
  publisherByName: Map<string, LargePublisher>;
  resourcesByDataset: Map<string, LargeResource[]>;
};

export type LargeCorpusSource = {
  kind: 'large';
  url: string;
  baseUrl: string;
  descriptor: LargeCorpusDescriptor;
  manifest: LargeDataManifest;
  overview: LargeOverview;
  analysis?: LargeAnalysisOverview;
  loadFullIndex: () => Promise<LargeFullIndex>;
  loadRelationships: () => Promise<LargeRelationship[]>;
};

export type BundleRegistryEntry = {
  id?: string;
  label?: string;
  title?: string;
  url: string;
  description?: string;
  kind?: 'bundle' | 'large-corpus' | 'history' | string;
};

export type LoadedSource =
  | {
      kind: 'small';
      url: string;
      title: string;
      corpus: NormalizedCorpus;
    }
  | LargeCorpusSource;
