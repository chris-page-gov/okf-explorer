/** Separately versioned source-bound discovery. Cards are navigation, not evidence. */
// @ts-ignore -- Explicit extensions support independently pinned Node consumers.
import { assembleContext, canonicalJson, contextGuardDecision, contextSha256, CONTEXT_PREDICATES, governanceIssues, isQuestionScaffolding, MAX_CONTEXT_INDEX_BYTES, normaliseContextBudget, resolveConcepts, validateContextIndex } from './index.ts';
// @ts-ignore -- No top-level access to the legacy constants: this is a dispatch cycle only.
import { CORPUS_LIMITS, UNIT_REFERENCE_LIMITS, corpusBucket, validateContextCorpusManifest } from './corpus.ts';
import type { ContextRecordShard, LegacyContextCorpusManifest, Reference } from './corpus.ts';
import type { ContextAssertion, ContextBinding, ContextBudget, ContextGuardDecision, ContextIndex, ContextPackage, ContextPath, ContextRecord, ContextRetrieval } from './types.ts';

export type DiscoveryRanking = { schema: 'okf-bm25.v1'; k1: 1.2; b: 0.75; score_scale: 1000000; fields: readonly ['source', 'discovery'] }
  | { schema: 'okf-bm25-weighted.v2'; k1: 1.2; b: 0.75; score_scale: 1000000;
    fields: readonly ['source', 'discovery']; weights: { source: 1; discovery: 2 } };
export const DISCOVERY_RANKING: DiscoveryRanking = Object.freeze({ schema: 'okf-bm25.v1', k1: 1.2, b: 0.75, score_scale: 1000000, fields: Object.freeze(['source', 'discovery'] as const) });
/** Opt-in ranking: authored navigation wording can compete with incidental words in long source passages. */
export const DISCOVERY_RANKING_V2: DiscoveryRanking = Object.freeze({ schema: 'okf-bm25-weighted.v2', k1: 1.2, b: 0.75,
  score_scale: 1000000, fields: Object.freeze(['source', 'discovery'] as const), weights: Object.freeze({ source: 1, discovery: 2 }) });
export const DISCOVERY_LIMITS = Object.freeze({ posting_rows: 2_000_000, ranking_records: 200_000, path_prefixes: 2000 });
export type DiscoveryCard = Pick<ContextRecord, 'id' | 'label' | 'assertion_status' | 'authority' | 'scope' | 'provenance' | 'rights' | 'access'> & {
  evidence_id: string; evidence_sha256: string; heading_path: string[]; summary: string; search_aliases: string[];
};
/** Exact lazy metadata locator; context evidence and authority remain inline. */
export type DiscoveryCardReference = {
  schema: 'okf-discovery-card-reference.v1'; id: string; evidence_id: string;
  card_sha256: string; ordinal: number;
};
export type DiscoveryIncidentReference = {
  schema: 'okf-discovery-incident-reference.v1'; id: string; incident_sha256: string;
  outgoing_count: number; incoming_count: number;
};
export type DiscoveryCorpusManifest = Omit<LegacyContextCorpusManifest, 'schema' | 'search'> & {
  schema: 'okf-context-corpus.v3';
  discovery: { count: number; shards: Array<Reference & { first_ordinal: number; count: number }> };
  search: LegacyContextCorpusManifest['search'] & { ranking: DiscoveryRanking; total_tokens: { source: number; discovery: number } };
  relationships: { schema: 'okf-context-adjacency.v1'; bucket_algorithm: 'fnv1a32-high-byte-hex-v1'; shards: Record<string, Reference> };
  /** Producer-owned metadata, never followed or interpreted as instructions. */
  extensions?: Record<string, unknown>;
};
type IncidentEntry = { id: string; outgoing: ContextAssertion[]; incoming: ContextAssertion[];
  outgoing_count: number; incoming_count: number; outgoing_ids_sha256: string; incoming_ids_sha256: string };
type Posting = [number, number, number, number, number];
type Rank = { score: number; source_score: number; discovery_score: number; matched: string[];
  matched_source: string[]; matched_discovery: string[]; facts: Map<string, Posting> };
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-z][a-z0-9+.-]*:[\x21-\x7e]+$/;
const encoder = new TextEncoder();
const size = (v: unknown) => encoder.encode(JSON.stringify(v)).length;
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, max = 1_000_000): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
function check(v: unknown, message: string): asserts v { if (!v) throw new Error(`Invalid discovery corpus: ${message}`); }
function keys(v: Record<string, unknown>, names: string[], optional: string[] = []) {
  check(names.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => names.includes(k) || optional.includes(k)), 'unsupported or missing fields');
}
function ref(v: unknown, extra: string[] = []) {
  check(object(v), 'file reference'); keys(v, ['path', 'bytes', 'sha256'], ['encoding', 'decoded_bytes', 'decoded_sha256', ...extra]);
  check(typeof v.path === 'string' && v.path.length <= 240 && /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(v.path)
    && !v.path.split('/').some((part: string) => part === '.' || part === '..'), 'unsafe file path');
  check(integer(v.bytes, 4 * 1024 * 1024) && v.bytes > 0 && HASH.test(v.sha256), 'file binding');
  check(v.encoding === undefined || v.encoding === 'gzip', 'compression');
  check(v.encoding ? integer(v.decoded_bytes, 4 * 1024 * 1024) && v.decoded_bytes > 0 && HASH.test(v.decoded_sha256)
    : v.decoded_bytes === undefined && v.decoded_sha256 === undefined, 'decoded binding');
}
export function discoveryTokens(text: string): string[] {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z0-9]{2,}/g) || [];
}
export function discoveryText(card: DiscoveryCard): string { return [card.label, ...card.heading_path, card.summary, ...card.search_aliases].join('\n'); }
/** Fixed parameters, separately quantised channels and ordinal ties are part of v1. */
export function bm25Contribution(documents: number, frequency: number, tf: number, length: number, totalTokens: number): number {
  if (!tf) return 0;
  const idf = Math.log(1 + (documents - frequency + 0.5) / (frequency + 0.5));
  const denominator = tf + 1.2 * (0.25 + 0.75 * length / (totalTokens / documents));
  return Math.round(1_000_000 * idf * tf * 2.2 / denominator);
}
export function validateDiscoveryCorpusManifest(raw: unknown): DiscoveryCorpusManifest {
  check(object(raw), 'manifest');
  keys(raw, ['schema', 'bundle', 'scope', 'limitations', 'semantic_source_snapshot', 'base_index', 'counts', 'records', 'search', 'discovery', 'relationships'], ['extensions']);
  check(raw.schema === 'okf-context-corpus.v3' && size(raw) <= 4 * 1024 * 1024, 'schema or manifest byte limit');
  check(object(raw.search), 'search'); keys(raw.search, ['tokenisation', 'bucket_algorithm', 'shards', 'ranking', 'total_tokens']);
  check([DISCOVERY_RANKING, DISCOVERY_RANKING_V2].some(r => canonicalJson(raw.search.ranking) === canonicalJson(r)), 'unsupported ranking parameters');
  check(object(raw.search.total_tokens), 'token totals'); keys(raw.search.total_tokens, ['source', 'discovery']);
  check(Object.values(raw.search.total_tokens).every(n => integer(n, 1_000_000_000_000)), 'invalid token totals');
  validateContextCorpusManifest({ ...raw, schema: 'okf-context-corpus.v2', search: { tokenisation: raw.search.tokenisation,
    bucket_algorithm: raw.search.bucket_algorithm, shards: raw.search.shards } });
  const paths = new Set([raw.base_index.path, ...raw.records.shards.map((s: Reference) => s.path), ...Object.values(raw.search.shards).map((s: any) => s.path)]);
  check(object(raw.discovery), 'discovery inventory'); keys(raw.discovery, ['count', 'shards']);
  check(raw.discovery.count === raw.records.count && Array.isArray(raw.discovery.shards) && raw.discovery.shards.length <= 16000, 'card count');
  let next = 0;
  for (const s of raw.discovery.shards) {
    ref(s, ['first_ordinal', 'count']); check(s.first_ordinal === next && integer(s.count, 10000) && s.count > 0, 'card ordinal inventory');
    check(!paths.has(s.path), 'duplicate file path'); paths.add(s.path); next += s.count;
  }
  check(next === raw.records.count, 'card inventory count');
  check(object(raw.relationships), 'relationship inventory'); keys(raw.relationships, ['schema', 'bucket_algorithm', 'shards']);
  check(raw.relationships.schema === 'okf-context-adjacency.v1' && raw.relationships.bucket_algorithm === 'fnv1a32-high-byte-hex-v1'
    && object(raw.relationships.shards) && Object.keys(raw.relationships.shards).length === 256, 'relationship buckets');
  for (let i = 0; i < 256; i++) {
    const r = raw.relationships.shards[i.toString(16).padStart(2, '0')]; ref(r);
    check(!paths.has(r.path), 'duplicate file path'); paths.add(r.path);
  }
  check(raw.extensions === undefined || object(raw.extensions), 'extensions must be an inert object');
  return raw as DiscoveryCorpusManifest;
}
function validateCard(raw: unknown): DiscoveryCard {
  check(object(raw), 'card');
  keys(raw, ['id', 'evidence_id', 'evidence_sha256', 'label', 'heading_path', 'summary', 'search_aliases', 'assertion_status', 'authority', 'scope', 'provenance', 'rights', 'access']);
  check(ID.test(raw.id) && raw.id.length <= 2000 && ID.test(raw.evidence_id) && raw.evidence_id.length <= 2000
    && raw.id !== raw.evidence_id && HASH.test(raw.evidence_sha256), 'card identity or evidence binding');
  check(Array.isArray(raw.heading_path) && raw.heading_path.length <= 20 && raw.heading_path.every((s: unknown) => typeof s === 'string' && s.length <= 500), 'heading path');
  check(typeof raw.summary === 'string' && raw.summary.length <= 2000, 'card summary');
  check(Array.isArray(raw.search_aliases) && raw.search_aliases.length <= 100
    && raw.search_aliases.every((s: unknown) => typeof s === 'string' && s.length <= 500), 'search aliases');
  const row: ContextRecord = { id: raw.id, route: 'discovery/card', label: raw.label, kind: 'scope', text: raw.summary,
    assertion_status: raw.assertion_status, authority: raw.authority, scope: raw.scope, provenance: raw.provenance, rights: raw.rights, access: raw.access };
  validateContextIndex({ schema: 'okf-context-index.v1', bundle: { id: 'urn:validation:card', snapshot: 'shape', source_url: 'https://example.invalid/' }, scope: 'Shape validation', limitations: [], records: [row], assertions: [], requirements: [] });
  check(raw.assertion_status !== 'official' && governanceIssues(row).length === 0, 'card governance: discovery is not official evidence');
  return raw as DiscoveryCard;
}
async function streamBytes(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array> {
  check(stream, 'missing body'); const reader = stream.getReader(); const pieces: Uint8Array[] = []; let count = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; count += value.length;
    if (count > limit) { await reader.cancel(); throw new Error('Discovery corpus body exceeds its binding'); } pieces.push(value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(count); let offset = 0; for (const piece of pieces) { bytes.set(piece, offset); offset += piece.length; } return bytes;
}
async function hashBytes(bytes: Uint8Array) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource)), n => n.toString(16).padStart(2, '0')).join(''); }

async function readDiscoveryFile(shard: Reference, binding: ContextBinding, fetcher: typeof fetch): Promise<unknown> {
  const root = new URL('.', binding.index_url), url = new URL(shard.path, root);
  check(['https:', 'http:'].includes(root.protocol) && !root.username && !root.password && HASH.test(binding.index_sha256)
    && url.origin === root.origin && url.pathname.startsWith(root.pathname), 'discovery reference root');
  const response = await fetcher(url.href, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15000) });
  check(response.ok && (!response.url || response.url === url.href), 'discovery reference unavailable or redirected');
  const transferred = await streamBytes(response.body, shard.bytes);
  check(transferred.length === shard.bytes && await hashBytes(transferred) === shard.sha256, 'discovery reference transfer integrity');
  const bytes = shard.encoding === 'gzip' ? await streamBytes(new Blob([transferred as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')), shard.decoded_bytes!) : transferred;
  check(bytes.length === (shard.decoded_bytes || shard.bytes) && await hashBytes(bytes) === (shard.decoded_sha256 || shard.sha256), 'discovery reference decoded integrity');
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

/** Load full navigation metadata on demand, never as a substitute for evidence. */
export async function readDiscoveryCard(raw: DiscoveryCorpusManifest, binding: ContextBinding,
  reference: DiscoveryCardReference, fetcher: typeof fetch = fetch): Promise<DiscoveryCard> {
  const manifest = validateDiscoveryCorpusManifest(raw);
  check(object(reference), 'card reference');
  keys(reference, ['schema', 'id', 'evidence_id', 'card_sha256', 'ordinal']);
  check(reference.schema === 'okf-discovery-card-reference.v1' && ID.test(reference.id) && ID.test(reference.evidence_id)
    && HASH.test(reference.card_sha256) && integer(reference.ordinal) && reference.ordinal < manifest.records.count, 'card reference identity');
  const declared = manifest.discovery.shards.find(s => reference.ordinal >= s.first_ordinal && reference.ordinal < s.first_ordinal + s.count)!;
  const { first_ordinal, count } = declared;
  const value = await readDiscoveryFile(declared, binding, fetcher);
  check(object(value), 'card reference shard'); keys(value, ['schema', 'first_ordinal', 'cards']);
  check(value.schema === 'okf-discovery-cards.v1' && value.first_ordinal === first_ordinal && Array.isArray(value.cards) && value.cards.length === count, 'card reference ordinal');
  const card = validateCard(value.cards[reference.ordinal - first_ordinal]);
  check(card.access === 'public' && card.id === reference.id && card.evidence_id === reference.evidence_id
    && await contextSha256(canonicalJson(card)) === reference.card_sha256, 'card reference content integrity or access');
  return card;
}

/** Inspect all committed incident rows without adding them to evidence or seeds. */
export async function readDiscoveryIncident(raw: DiscoveryCorpusManifest, binding: ContextBinding,
  reference: DiscoveryIncidentReference, fetcher: typeof fetch = fetch): Promise<IncidentEntry> {
  const manifest = validateDiscoveryCorpusManifest(raw);
  check(object(reference), 'incident reference');
  keys(reference, ['schema', 'id', 'incident_sha256', 'outgoing_count', 'incoming_count']);
  check(reference.schema === 'okf-discovery-incident-reference.v1' && ID.test(reference.id) && reference.id.length <= 2000
    && HASH.test(reference.incident_sha256) && integer(reference.outgoing_count, 30000) && integer(reference.incoming_count, 30000), 'incident reference identity');
  const value = await readDiscoveryFile(manifest.relationships.shards[corpusBucket(reference.id)], binding, fetcher);
  check(object(value), 'incident reference shard'); keys(value, ['schema', 'entries']);
  check(value.schema === 'okf-context-adjacency-bucket.v1' && Array.isArray(value.entries) && value.entries.length <= 10000, 'incident reference entries');
  const matches = value.entries.filter((e: any) => e.id === reference.id);
  check(matches.length === 1 && await contextSha256(canonicalJson(matches[0])) === reference.incident_sha256, 'incident reference content integrity');
  const entry = matches[0] as IncidentEntry;
  keys(entry, ['id', 'outgoing', 'incoming', 'outgoing_count', 'incoming_count', 'outgoing_ids_sha256', 'incoming_ids_sha256']);
  for (const direction of ['outgoing', 'incoming'] as const) {
    const rows = entry[direction];
    check(Array.isArray(rows) && rows.length === reference[direction + '_count' as 'outgoing_count' | 'incoming_count']
      && rows.length === entry[direction + '_count' as 'outgoing_count' | 'incoming_count'], 'incident reference count');
    validateContextIndex({ schema: 'okf-context-index.v1', bundle: manifest.bundle, scope: manifest.scope,
      limitations: [], records: [], assertions: rows, requirements: [] });
    let previous = '';
    for (const row of rows) { check(row.id > previous && row[direction === 'outgoing' ? 'source' : 'target'] === entry.id, 'incident reference direction'); previous = row.id; }
    check(await contextSha256(canonicalJson(rows.map(e => e.id))) === entry[direction + '_ids_sha256' as 'outgoing_ids_sha256' | 'incoming_ids_sha256'], 'incident reference commitment');
  }
  return entry;
}

export async function assembleDiscoveryCorpusContext(raw: DiscoveryCorpusManifest, binding: ContextBinding, question: string,
  requested: Partial<ContextBudget> = {}, fetcher: typeof fetch = fetch): Promise<ContextPackage> {
  const manifest = validateDiscoveryCorpusManifest(raw); const budget = normaliseContextBudget(requested);
  check(typeof question === 'string' && question.trim().length > 0 && question.length <= 4000, 'question length');
  const root = new URL('.', binding.index_url);
  check(['https:', 'http:'].includes(root.protocol) && !root.username && !root.password && HASH.test(binding.index_sha256), 'manifest binding');
  const retrieval: ContextRetrieval = { method: 'source-bound-discovery-bm25.v1', corpus_records: manifest.records.count,
    corpus_pages: manifest.counts.pages, empty_pages: manifest.counts.empty_pages, query_tokens: [], omitted_query_tokens: [],
    candidate_count: 0, candidates: [], fetched_files: 0, fetched_bytes: 0, decoded_bytes: 0, limits: { ...CORPUS_LIMITS }, truncated: false, omissions: [],
    units: { corpus_schema: 'okf-context-corpus.v3', referenced_records: [], examined_relationships: 0, limits: { ...UNIT_REFERENCE_LIMITS } },
    discovery: { ranking: manifest.search.ranking, candidates: [], adjacency: [], limits: { ...DISCOVERY_LIMITS },
      admission_order: manifest.search.ranking.schema === 'okf-bm25-weighted.v2'
        ? 'lexical-anchor-dependencies-before-concept-paths.v2' : 'lexical-anchor-then-declared-path-prefixes.v1' } };
  const omit = (code: string, message: string, ids: string[] = []) => { retrieval.truncated = true; retrieval.omissions.push({ code, message, ids }); };
  const cache = new Map<string, Promise<any | null>>();
  const load = (reference: Reference): Promise<any | null> => {
    if (cache.has(reference.path)) return cache.get(reference.path)!;
    const decoded = reference.decoded_bytes || reference.bytes;
    if (retrieval.fetched_files + 1 > CORPUS_LIMITS.files || retrieval.fetched_bytes + reference.bytes > CORPUS_LIMITS.fetched_bytes
      || retrieval.decoded_bytes + decoded > CORPUS_LIMITS.decoded_bytes) {
      omit('retrieval_resource_budget', 'A bound discovery, evidence or relationship file exceeded the retrieval resource limit.', [reference.path]);
      const absent = Promise.resolve(null); cache.set(reference.path, absent); return absent;
    }
    retrieval.fetched_files++; retrieval.fetched_bytes += reference.bytes; retrieval.decoded_bytes += decoded;
    const promise = (async () => {
      const url = new URL(reference.path, root); check(url.origin === root.origin && url.pathname.startsWith(root.pathname), 'file escaped corpus root');
      const response = await fetcher(url.href, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15000) });
      check(response.ok && (!response.url || response.url === url.href), `file unavailable or redirected: ${reference.path}`);
      const transferred = await streamBytes(response.body, reference.bytes);
      check(transferred.length === reference.bytes && await hashBytes(transferred) === reference.sha256, `transfer integrity failed: ${reference.path}`);
      const bytes = reference.encoding === 'gzip'
        ? await streamBytes(new Blob([transferred as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')), decoded) : transferred;
      check(bytes.length === decoded && await hashBytes(bytes) === (reference.decoded_sha256 || reference.sha256), `decoded integrity failed: ${reference.path}`);
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    })(); cache.set(reference.path, promise); return promise;
  };
  const loadMany = async (refs: Reference[]) => {
    const unique = [...new Map(refs.map(r => [r.path, r])).values()];
    for (let i = 0; i < unique.length; i += 4) {
      const settled = await Promise.allSettled(unique.slice(i, i + 4).map(load));
      for (const result of settled) if (result.status === 'rejected') throw result.reason;
    }
  };
  const base = validateContextIndex(await load(manifest.base_index), manifest.semantic_source_snapshot);
  check(base.assertions.length === 0, 'v3 assertions belong to the complete sharded adjacency inventory');
  check(base.records.every(row => row.kind === 'concept' || row.kind === 'scope'), 'v3 base records are concepts or scopes; evidence requires a bound card and unit shard');
  const index: ContextIndex = { ...base, bundle: manifest.bundle, scope: manifest.scope, limitations: [...manifest.limitations,
    'Discovery cards are source-bound navigation summaries, not source evidence, resolved concepts or applicability assertions.',
    manifest.search.ranking.schema === 'okf-bm25.v1'
      ? 'BM25 source and discovery channels are independently scored with fixed parameters and canonical ordinal ties. Incoming references are not reversed into traversal.'
      : 'BM25 source and discovery channels are independently scored with declared fixed weights and canonical ordinal ties. Incoming references are not reversed into traversal.'], records: [...base.records], assertions: [] };
  const byId = new Map(index.records.map(r => [r.id, r]));
  const recordCache = new Map<string, ContextRecord[]>(), cardCache = new Map<string, DiscoveryCard[]>();
  const cardIds = new Map<string, string>();
  const readRecords = async (reference: ContextRecordShard): Promise<ContextRecord[] | null> => {
    if (recordCache.has(reference.path)) return recordCache.get(reference.path)!;
    const shard = await load(reference); if (!shard) return null;
    check(object(shard), 'record shard'); keys(shard, ['schema', 'first_ordinal', 'records']);
    check(shard.schema === 'okf-context-records.v1' && shard.first_ordinal === reference.first_ordinal && Array.isArray(shard.records) && shard.records.length === reference.count, 'record shard identity');
    validateContextIndex({ ...index, records: shard.records, assertions: [], requirements: [] });
    let previous = '';
    for (const row of shard.records) { check(row.kind === 'evidence' && row.evidence_unit && ID.test(row.id) && row.id.length <= 2000 && row.id > previous, 'ordered evidence units required'); previous = row.id; }
    check(shard.records[0].id === reference.first_id && shard.records.at(-1).id === reference.last_id, 'record range differs');
    recordCache.set(reference.path, shard.records); return shard.records;
  };
  const readUnit = async (ordinal: number): Promise<{ record: ContextRecord; card: DiscoveryCard } | null> => {
    const r = manifest.records.shards.find(s => ordinal >= s.first_ordinal && ordinal < s.first_ordinal + s.count)!;
    const c = manifest.discovery.shards.find(s => ordinal >= s.first_ordinal && ordinal < s.first_ordinal + s.count)!;
    await loadMany([r, c]); const records = await readRecords(r); const cardsRaw = await load(c); if (!records || !cardsRaw) return null;
    if (!cardCache.has(c.path)) {
      check(object(cardsRaw), 'card shard'); keys(cardsRaw, ['schema', 'first_ordinal', 'cards']);
      check(cardsRaw.schema === 'okf-discovery-cards.v1' && cardsRaw.first_ordinal === c.first_ordinal && Array.isArray(cardsRaw.cards) && cardsRaw.cards.length === c.count, 'card shard identity');
      const cards = cardsRaw.cards.map(validateCard); let previous = '';
      for (const card of cards) { check(card.evidence_id > previous, 'card evidence order'); previous = card.evidence_id;
        check(!byId.has(card.id), 'card identity collides with a concept, scope or evidence record');
        check(!cardIds.has(card.id) || cardIds.get(card.id) === card.evidence_id, 'card identity collision'); cardIds.set(card.id, card.evidence_id); }
      cardCache.set(c.path, cards);
    }
    const record = records[ordinal - r.first_ordinal], card = cardCache.get(c.path)![ordinal - c.first_ordinal];
    check(!cardIds.has(record.id), 'evidence identity collides with a discovery card');
    check(card.evidence_id === record.id && card.access === record.access && await contextSha256(canonicalJson(record)) === card.evidence_sha256, 'stale or mismatched card evidence binding');
    return { record, card };
  };
  const include = (record: ContextRecord): boolean => {
    const old = byId.get(record.id); check(!old || canonicalJson(old) === canonicalJson(record), 'conflicting duplicate record');
    if (old) return true;
    index.records.push(record);
    if (index.records.length > 10000 || size(index) > MAX_CONTEXT_INDEX_BYTES) { index.records.pop(); omit('retrieval_index_budget', 'A whole source unit exceeded the bounded working index.', [record.id]); return false; }
    byId.set(record.id, record); return true;
  };
  const evidenceSeeds: Array<{ id: string; reason: string }> = [];
  const adjacencyCache = new Map<string, IncidentEntry[]>(); const assertionSeen = new Map<string, string>();
  const knownEntries = new Map<string, IncidentEntry>(), assertionRows = new Map<string, ContextAssertion>();
  const incident = async (id: string): Promise<IncidentEntry | null> => {
    const bucket = corpusBucket(id), reference = manifest.relationships.shards[bucket];
    if (!adjacencyCache.has(bucket)) {
      const shard = await load(reference); if (!shard) return null;
      check(object(shard), 'adjacency shard'); keys(shard, ['schema', 'entries']);
      check(shard.schema === 'okf-context-adjacency-bucket.v1' && Array.isArray(shard.entries) && shard.entries.length <= 10000, 'adjacency schema');
      let previous = '';
      for (const entry of shard.entries) {
        check(object(entry), 'adjacency entry'); keys(entry, ['id', 'outgoing', 'incoming', 'outgoing_count', 'incoming_count', 'outgoing_ids_sha256', 'incoming_ids_sha256']);
        check(typeof entry.id === 'string' && ID.test(entry.id) && entry.id.length <= 2000 && entry.id > previous && corpusBucket(entry.id) === bucket, 'adjacency record ordering or bucket'); previous = entry.id;
        for (const direction of ['outgoing', 'incoming'] as const) {
          const edges = entry[direction]; check(Array.isArray(edges) && edges.length <= 30000 && entry[direction + '_count'] === edges.length, 'incident count');
          validateContextIndex({ ...index, records: [], assertions: edges, requirements: [] });
          let last = '';
          for (const edge of edges) {
            check(edge.id > last && (direction === 'outgoing' ? edge.source : edge.target) === entry.id, 'incident direction or duplicate assertion'); last = edge.id;
            const canonical = canonicalJson(edge); check(!assertionSeen.has(edge.id) || assertionSeen.get(edge.id) === canonical, 'conflicting incident assertion'); assertionSeen.set(edge.id, canonical); assertionRows.set(edge.id, edge);
          }
          check(HASH.test(entry[direction + '_ids_sha256']) && await contextSha256(canonicalJson(edges.map((e: ContextAssertion) => e.id))) === entry[direction + '_ids_sha256'], 'incident assertion commitment');
        }
      }
      for (const entry of shard.entries) knownEntries.set(entry.id, entry);
      // Each loaded endpoint commits to all incident rows. A one-sided edge
      // cannot disappear when the other endpoint's bucket is subsequently read.
      for (const edge of assertionRows.values()) {
        const source = knownEntries.get(edge.source), target = knownEntries.get(edge.target);
        check(!source || source.outgoing.some(e => e.id === edge.id), 'outgoing adjacency omits a known incident assertion');
        check(!target || target.incoming.some(e => e.id === edge.id), 'incoming adjacency omits a known incident assertion');
      }
      adjacencyCache.set(bucket, shard.entries);
    }
    const entry = adjacencyCache.get(bucket)!.find(e => e.id === id);
    check(entry, `missing committed adjacency entry: ${id}`); return entry;
  };
  const visited = new Map<string, number>(), attempted = new Set<string>(), includedEdges = new Set<string>(), inspected = new Set<string>();
  const resolvedIds = new Set(resolveConcepts(base, question).resolved.map(r => r.id));
  const guardDecisions = new Map<string, ContextGuardDecision>();
  // Requirements may order an already observed route, never supply a record,
  // assertion or seed. Every hop must still occur in the reached incident set.
  const priorityPaths = new Map<string, ContextPath[]>();
  const priorityPathKeys = new Set<string>();
  for (const requirement of [...base.requirements].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!requirement.when_all.every(id => resolvedIds.has(id))) continue;
    for (const path of requirement.required_paths || []) {
      if (!resolvedIds.has(path.seed) || path.assertions.length > budget.max_depth
        || new Set(path.records).size !== path.records.length) continue;
      const key = canonicalJson(path); if (priorityPathKeys.has(key)) continue; priorityPathKeys.add(key);
      const paths = priorityPaths.get(path.seed) || [];
      paths.push(path);
      priorityPaths.set(path.seed, paths);
    }
  }
  const processedPrefixes = new Set<string>();
  let priorityLimitReported = false;
  const expand = async (seeds: string[]) => {
  type Pending = { id: string; depth: number; prefixes: ContextPath[] };
  const queue: Pending[] = [], priority: Pending[] = [];
  const enqueue = (item: Pending) => (item.prefixes.length ? priority : queue).push(item);
  seeds.forEach(id => enqueue({ id, depth: 0, prefixes: priorityPaths.get(id) || [] }));
  let i = 0, p = 0;
  while (p < priority.length || i < queue.length) {
    const item = p < priority.length ? priority[p++] : queue[i++];
    const { id, depth } = item;
    const prefixes = item.prefixes.filter(path => {
      const key = canonicalJson([path, depth]);
      if (processedPrefixes.has(key)) return false;
      if (processedPrefixes.size >= DISCOVERY_LIMITS.path_prefixes) {
        if (!priorityLimitReported) {
          omit('retrieval_path_priority_budget', 'Declared-path prioritisation reached its fixed prefix work bound; remaining routes have ordinary traversal priority.');
          priorityLimitReported = true;
        }
        return false;
      }
      processedPrefixes.add(key); return true;
    });
    if ((visited.get(id) ?? Infinity) <= depth && !prefixes.length) continue;
    visited.set(id, Math.min(visited.get(id) ?? Infinity, depth));
    if (!byId.has(id)) {
      if (attempted.size >= UNIT_REFERENCE_LIMITS.referenced_records) { omit('referenced_record_budget', 'The declared-destination loading limit was reached.', [id]); continue; }
      attempted.add(id); const range = manifest.records.shards.find(s => s.first_id! <= id && id <= s.last_id!);
      if (!range) { omit('referenced_record_missing', 'A declared destination is absent from the bound evidence inventory.', [id]); continue; }
      const records = await readRecords(range); if (!records) continue; const n = records.findIndex(r => r.id === id);
      if (n < 0) { omit('referenced_record_missing', 'A declared destination is absent from its declared ID range.', [id]); continue; }
      const unit = await readUnit(range.first_ordinal + n); if (!unit || !include(unit.record)) continue;
      retrieval.units!.referenced_records.push(id);
    }
    if (byId.get(id)!.access !== 'public') continue;
    const entry = await incident(id); if (!entry) continue;
    if (!inspected.has(id)) {
      retrieval.discovery!.adjacency.push({ schema: 'okf-discovery-incident-reference.v1', id,
        incident_sha256: await contextSha256(canonicalJson(entry)), outgoing_count: entry.outgoing_count, incoming_count: entry.incoming_count });
      inspected.add(id);
    }
    for (const edge of entry.outgoing) {
      if (!includedEdges.has(edge.id)) {
        if (retrieval.units!.examined_relationships >= UNIT_REFERENCE_LIMITS.examined_relationships) { omit('referenced_relationship_budget', 'The declared relationship loading limit was reached.', [id, edge.id, edge.target]); continue; }
        retrieval.units!.examined_relationships++; index.assertions.push(edge);
        if (size(index) > MAX_CONTEXT_INDEX_BYTES) { index.assertions.pop(); omit('retrieval_index_budget', 'A declared relationship exceeded the bounded working index.', [edge.id]); continue; }
        includedEdges.add(edge.id);
      }
      if (!CONTEXT_PREDICATES.has(edge.predicate)) continue;
      const guard = contextGuardDecision(edge, byId, resolvedIds);
      if (guard) {
        guardDecisions.set(edge.id, guard);
        if (guard.status === 'unmatched') continue;
      }
      if (depth >= budget.max_depth) { if (!byId.has(edge.target)) omit('referenced_depth_budget', 'A declared destination exceeds the requested traversal depth.', [edge.id, edge.target]); continue; }
      const nextPrefixes = prefixes.filter(path => path.assertions[depth] === edge.id
        && path.records[depth] === edge.source && path.records[depth + 1] === edge.target);
      if (nextPrefixes.length || (visited.get(edge.target) ?? Infinity) > depth + 1)
        enqueue({ id: edge.target, depth: depth + 1, prefixes: nextPrefixes });
    }
  }
  };
  // Bound query discovery before graph fan-out can spend every resource slot.
  // One highest-ranked whole unit gets an independent lexical seed; the rest
  // wait behind real concept paths. No requirement supplies a retrieval seed.
  const wanted = [...new Set(discoveryTokens(question))].filter(t => !isQuestionScaffolding(t));
  retrieval.query_tokens = wanted.filter(t => t.length <= 64).slice(0, CORPUS_LIMITS.query_tokens);
  retrieval.omitted_query_tokens = wanted.filter(t => !retrieval.query_tokens.includes(t));
  if (retrieval.omitted_query_tokens.length) omit('retrieval_query_budget', 'Some query terms exceeded the fixed lexical query limit.');
  await loadMany(retrieval.query_tokens.map(t => manifest.search.shards[corpusBucket(t)]));
  const ranks = new Map<number, Rank>(); let postingRows = 0;
  const lengths = new Map<number, string>();
  for (const token of retrieval.query_tokens) {
    const shard = await load(manifest.search.shards[corpusBucket(token)]); if (!shard) continue;
    check(object(shard), 'postings shard'); keys(shard, ['schema', 'postings']);
    check(shard.schema === 'okf-context-postings.v2' && object(shard.postings), 'postings schema');
    const rows = Object.hasOwn(shard.postings, token) ? shard.postings[token] : [];
    check(Array.isArray(rows) && rows.length <= manifest.records.count, 'posting list');
    let previous = -1;
    for (const p of rows) {
      check(Array.isArray(p) && p.length === 5 && p.every(n => integer(n)) && p[0] < manifest.records.count && p[0] > previous,
        'invalid or repeated posting'); previous = p[0];
      check((p[1] || p[3]) && p[1] <= p[2] && p[3] <= p[4]
        && p[2] <= manifest.search.total_tokens.source && p[4] <= manifest.search.total_tokens.discovery, 'posting frequency or length');
    }
    const sourceDf = rows.filter(p => p[1] > 0).length, discoveryDf = rows.filter(p => p[3] > 0).length;
    for (const p of rows as Posting[]) {
      if (++postingRows > DISCOVERY_LIMITS.posting_rows || (!ranks.has(p[0]) && ranks.size >= DISCOVERY_LIMITS.ranking_records)) {
        omit('retrieval_ranking_budget', 'BM25 ranking reached its explicit posting or candidate work bound.'); break;
      }
      const length = `${p[2]}:${p[4]}`; check(!lengths.has(p[0]) || lengths.get(p[0]) === length, 'inconsistent document lengths'); lengths.set(p[0], length);
      const rank: Rank = ranks.get(p[0]) || { score: 0, source_score: 0, discovery_score: 0, matched: [], matched_source: [], matched_discovery: [], facts: new Map() };
      rank.source_score += bm25Contribution(manifest.records.count, sourceDf, p[1], p[2], manifest.search.total_tokens.source);
      rank.discovery_score += bm25Contribution(manifest.records.count, discoveryDf, p[3], p[4], manifest.search.total_tokens.discovery);
      rank.score = rank.source_score + rank.discovery_score * (manifest.search.ranking.schema === 'okf-bm25-weighted.v2'
        ? manifest.search.ranking.weights.discovery : 1);
      rank.matched.push(token); rank.facts.set(token, p);
      if (p[1]) rank.matched_source.push(token); if (p[3]) rank.matched_discovery.push(token); ranks.set(p[0], rank);
    }
  }
  retrieval.candidate_count = ranks.size;
  const ranked = [...ranks].sort((a, b) => b[1].score - a[1].score || a[0] - b[0]).slice(0, CORPUS_LIMITS.candidates);
  if (ranks.size > ranked.length) omit('retrieval_candidate_budget', 'Only the highest-ranked source-bound units fit the fixed lexical candidate limit.');
  const admitRanked = async ([ordinal, rank]: [number, Rank]) => {
    const unit = await readUnit(ordinal); if (!unit) return;
    const source = discoveryTokens(unit.record.text), discovery = discoveryTokens(discoveryText(unit.card));
    for (const [token, p] of rank.facts) check(p[1] === source.filter(t => t === token).length && p[2] === source.length
      && p[3] === discovery.filter(t => t === token).length && p[4] === discovery.length, 'postings differ from bound source or discovery text');
    if (unit.record.access !== 'public') { omit('restricted_record', 'A ranked unit is not public.', [unit.record.id]); return; }
    if (!include(unit.record)) return;
    retrieval.candidates.push({ id: unit.record.id, score: rank.score, matched: rank.matched });
    const card: DiscoveryCardReference = { schema: 'okf-discovery-card-reference.v1', id: unit.card.id,
      evidence_id: unit.record.id, card_sha256: await contextSha256(canonicalJson(unit.card)), ordinal };
    retrieval.discovery!.candidates.push({ card, source_score: rank.source_score, discovery_score: rank.discovery_score,
      matched_source: rank.matched_source, matched_discovery: rank.matched_discovery });
    evidenceSeeds.push({ id: unit.record.id, reason: `Source-bound discovery card ${unit.card.id}; BM25 source score ${rank.source_score} (${rank.matched_source.join(', ')}), discovery score ${rank.discovery_score} (${rank.matched_discovery.join(', ')})${manifest.search.ranking.schema === 'okf-bm25.v1' ? '' : ', declared ranking ' + manifest.search.ranking.schema}. The card is not evidence or a concept-resolution claim.` });
  };
  if (ranked.length) await admitRanked(ranked[0]);
  // With opt-in weighted discovery, follow the best whole source unit's
  // declared dependencies before broad concept routes or secondary candidates
  // spend the fixed file budget. Legacy v1 keeps its exact admission order.
  if (manifest.search.ranking.schema === 'okf-bm25-weighted.v2' && evidenceSeeds.length)
    await expand([evidenceSeeds[0].id]);
  await expand([...resolvedIds].sort());
  for (const candidate of ranked.slice(1)) await admitRanked(candidate);
  await expand([...new Set(evidenceSeeds.map(r => r.id))].sort());
  return assembleContext(index, question, requested, binding, { evidenceSeeds, retrieval,
    ...(guardDecisions.size ? { guardDecisions: [...guardDecisions.values()] } : {}) });
}
