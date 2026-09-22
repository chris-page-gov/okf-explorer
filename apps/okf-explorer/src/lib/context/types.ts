/** Additive context contract. Source text and assertions are untrusted data. */
export type ContextBudget = {
  max_nodes: number;
  max_relationships: number;
  max_depth: number;
  max_bytes: number;
};

export type ContextProvenance = {
  url: string;
  source_sha256: string;
  locator: string;
  captured_at: string;
  source_date?: string;
  source_date_kind?: string;
  literal_sha256?: string;
};

/** Ordered source selections. Offsets are half-open UTF-8 byte offsets in the
 * decoded source text and in record.text, never offsets in JSON/PDF bytes. */
export type EvidenceUnit = {
  schema: 'okf-evidence-unit.v1';
  kind: 'section' | 'paragraph' | 'table' | 'definition' | 'exception' | 'cross-reference' | 'compound' | 'unresolved-fragment' | 'page-fallback';
  boundary_status: 'machine-detected' | 'author-declared';
  completeness: 'complete-within-declared-boundary' | 'unresolved' | 'fallback';
  offset_unit: 'utf-8-bytes';
  joiner: '' | '\n' | '\n\n';
  spans: Array<{
    source_url: string; source_sha256: string;
    extraction_url: string; extraction_sha256: string;
    locator: string; source_text_sha256: string; source_text_bytes: number;
    source_start: number; source_end: number; unit_start: number; unit_end: number;
    literal_sha256: string;
  }>;
};

export type ContextRecord = {
  id: string;
  route: string;
  label: string;
  kind: 'concept' | 'evidence' | 'scope';
  aliases?: Array<string | { label: string; case_sensitive: boolean }>;
  text: string;
  assertion_status: 'official' | 'normalized' | 'inferred' | 'model-derived';
  authority: { class: string; label: string; source: string };
  scope: string;
  provenance: ContextProvenance[];
  rights: string;
  access: 'public' | 'restricted';
  review_status?: string;
  conflicts_with?: string[];
  evidence_unit?: EvidenceUnit;
};

export type ContextAssertion = {
  id: string;
  source: string;
  target: string;
  predicate: string;
  label: string;
  assertion_status: ContextRecord['assertion_status'];
  authority: ContextRecord['authority'];
  scope: string;
  provenance: ContextProvenance[];
  /** Existing bundle assertion identity, when this is a projection. */
  original_assertion_id?: string;
};

/** Author-declared evidence needs, not an answer key or an engine rule. */
export type ContextRequirement = {
  id: string;
  label: string;
  when_all: string[];
  /** Resolved concepts whose evidence needs this scoped profile covers. */
  covers?: string[];
  required: string[];
  /** Directed evidence routes which must survive assembly. Valid paths may receive
   * priority after budget loss; their endpoints never become retrieval seeds. */
  required_paths?: ContextPath[];
  scope: string;
  limitations?: string[];
};

export type ContextIndex = {
  schema: 'okf-context-index.v1';
  bundle: { id: string; snapshot: string; source_url: string };
  scope: string;
  limitations: string[];
  records: ContextRecord[];
  assertions: ContextAssertion[];
  requirements: ContextRequirement[];
};

export type ContextBinding = { index_url: string; index_sha256: string };
export type BoundContextIndex = { index: ContextIndex; binding: ContextBinding };
export type BoundContextCorpus = { corpus: import('./corpus.ts').ContextCorpusManifest; binding: ContextBinding };
export type BoundContextSource = BoundContextIndex | BoundContextCorpus;

export type ContextResolution = {
  id: string;
  label: string;
  matched: string[];
  method: 'declared-phrase';
  confidence: 'exact-alias';
};
export type ContextIssue = {
  code: string;
  message: string;
  ids: string[];
};
export type ContextPath = { seed: string; assertions: string[]; records: string[] };
export type ContextSelection = {
  record: ContextRecord;
  reasons: string[];
  paths: ContextPath[];
};
/** Lexical discovery is evidence selection, never an entity-resolution claim. */
export type ContextRetrieval = {
  method: 'indexed-lexical-candidates.v1' | 'source-bound-discovery-bm25.v1';
  corpus_records: number;
  corpus_pages: number;
  empty_pages: number;
  query_tokens: string[];
  omitted_query_tokens: string[];
  candidate_count: number;
  candidates: Array<{ id: string; matched: string[]; score: number }>;
  fetched_files: number;
  fetched_bytes: number;
  decoded_bytes: number;
  limits: { query_tokens: number; candidates: number; files: number; fetched_bytes: number; decoded_bytes: number };
  truncated: boolean;
  omissions: ContextIssue[];
  /** Additive v2 counters; absent for unchanged v1 page-corpus packages. */
  units?: {
    corpus_schema: 'okf-context-corpus.v2' | 'okf-context-corpus.v3';
    referenced_records: string[];
    examined_relationships: number;
    limits: { referenced_records: number; examined_relationships: number };
  };
  /** Source-bound navigation summaries do not become evidence or concepts. */
  discovery?: {
    ranking: import('./corpusV3.ts').DiscoveryRanking;
    limits: { posting_rows: number; ranking_records: number };
    candidates: Array<{
      card: import('./corpusV3.ts').DiscoveryCard | import('./corpusV3.ts').DiscoveryCardReference;
      source_score: number; discovery_score: number;
      matched_source: string[]; matched_discovery: string[];
    }>;
    adjacency: Array<{ id: string; outgoing_ids: string[]; incoming_ids: string[] } | import('./corpusV3.ts').DiscoveryIncidentReference>;
    admission_order?: 'resolved-concept-paths-before-lexical-candidates.v1';
  };
};
export type ContextAssemblyOptions = {
  evidenceSeeds: Array<{ id: string; reason: string }>;
  retrieval: ContextRetrieval;
};
export type ContextRequirementResult = ContextRequirement & {
  status: 'supported-within-declared-scope' | 'insufficient';
  missing: string[];
};
export type ContextPackage = {
  schema: 'okf-governed-context.v1';
  context_id: string;
  engine: 'okf-context-assembly.v1';
  question: string;
  bundle: ContextIndex['bundle'];
  binding: ContextBinding;
  scope: string;
  evidence_status: 'sufficient' | 'insufficient' | 'conflicting';
  resolved_concepts: ContextResolution[];
  ambiguities: Array<{ phrase: string; candidates: string[] }>;
  unresolved_terms: string[];
  selected: ContextSelection[];
  relationships: ContextAssertion[];
  requirements: ContextRequirementResult[];
  missing_evidence: ContextIssue[];
  conflicts: ContextIssue[];
  limitations: string[];
  budget: ContextBudget & {
    used_nodes: number;
    used_relationships: number;
    used_bytes: number;
    reached_depth: number;
    truncated: boolean;
    omissions: ContextIssue[];
  };
  /** No model answer is generated by this engine. */
  ai_answer: null;
  retrieval?: ContextRetrieval;
};
