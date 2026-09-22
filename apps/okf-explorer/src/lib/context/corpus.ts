/** Hash-bound full-source lexical discovery. No source text is executed or treated as a completeness rule. */
// @ts-ignore -- Explicit extension also supports the pinned Node type-stripping consumer.
import { assembleContext, canonicalJson, CONTEXT_PREDICATES, isQuestionScaffolding, MAX_CONTEXT_INDEX_BYTES, normaliseContextBudget, resolveConcepts, validateContextIndex } from './index.ts';
import type { ContextBinding, ContextBudget, ContextIndex, ContextPackage, ContextRecord, ContextRetrieval } from './types.ts';
// @ts-ignore -- Pinned Node consumers use explicit TypeScript extensions.
import { assembleDiscoveryCorpusContext, validateDiscoveryCorpusManifest, type DiscoveryCorpusManifest } from './corpusV3.ts';

export type Reference = { path: string; bytes: number; sha256: string; encoding?: 'gzip'; decoded_bytes?: number; decoded_sha256?: string };
export type ContextRecordShard = Reference & { first_ordinal: number; count: number; first_id?: string; last_id?: string };
export type LegacyContextCorpusManifest = {
  schema: 'okf-context-corpus.v1' | 'okf-context-corpus.v2'; bundle: ContextIndex['bundle']; scope: string; limitations: string[];
  semantic_source_snapshot: string; base_index: Reference;
  counts: { documents: number; pages: number; nonempty_pages: number; empty_pages: number; tokenless_pages: number };
  records: { count: number; shards: ContextRecordShard[] };
  search: { tokenisation: 'nfkd-lowercase-ascii-alphanumeric-min2-v1'; bucket_algorithm: 'fnv1a32-high-byte-hex-v1'; shards: Record<string, Reference> };
};
export type ContextCorpusManifest = LegacyContextCorpusManifest | DiscoveryCorpusManifest;
export const CORPUS_LIMITS = Object.freeze({ query_tokens: 24, candidates: 16, files: 64,
  fetched_bytes: 16 * 1024 * 1024, decoded_bytes: 32 * 1024 * 1024 });
export const UNIT_REFERENCE_LIMITS = Object.freeze({ referenced_records: 200, examined_relationships: 2000 });
const FILE_LIMIT = 4 * 1024 * 1024;
const FETCH_CONCURRENCY = 4;
const HASH = /^[a-f0-9]{64}$/;
// Percent-encoded ASCII IRIs make range ordering identical in producer languages.
const UNIT_ID = /^[a-z][a-z0-9+.-]*:[\x21-\x7e]+$/;
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(`Invalid context corpus: ${message}`); }
function object(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function integer(value: unknown, max = 1_000_000): value is number { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max; }
function size(value: unknown): number { return new TextEncoder().encode(JSON.stringify(value)).length; }
function reference(value: unknown, limit = FILE_LIMIT): void {
  check(object(value), 'file reference required');
  check(typeof value.path === 'string' && value.path.length <= 240 && /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(value.path)
    && !value.path.split('/').some((s: string) => s === '.' || s === '..'), 'unsafe relative file path');
  check(integer(value.bytes, limit) && value.bytes > 0 && HASH.test(value.sha256), 'file byte/hash binding required');
  check(value.encoding === undefined || value.encoding === 'gzip', 'unsupported compression');
  if (value.encoding) check(integer(value.decoded_bytes, limit) && value.decoded_bytes > 0 && HASH.test(value.decoded_sha256), 'decoded byte/hash binding required');
}
export function validateContextCorpusManifest(raw: unknown): ContextCorpusManifest {
  if (object(raw) && raw.schema === 'okf-context-corpus.v3') return validateDiscoveryCorpusManifest(raw);
  check(object(raw) && ['okf-context-corpus.v1', 'okf-context-corpus.v2'].includes(raw.schema) && size(raw) <= FILE_LIMIT, 'unsupported or oversized manifest');
  check(object(raw.bundle) && typeof raw.bundle.id === 'string' && typeof raw.bundle.snapshot === 'string', 'bundle identity');
  check(typeof raw.semantic_source_snapshot === 'string', 'semantic snapshot required');
  // Reuse the existing governance contract for identity, scope and limitations.
  validateContextIndex({ schema: 'okf-context-index.v1', bundle: raw.bundle, scope: raw.scope,
    limitations: raw.limitations, records: [], assertions: [], requirements: [] });
  reference(raw.base_index, MAX_CONTEXT_INDEX_BYTES);
  check(object(raw.counts) && ['documents', 'pages', 'nonempty_pages', 'empty_pages', 'tokenless_pages'].every(k => integer(raw.counts[k])), 'invalid source counts');
  check(raw.counts.nonempty_pages + raw.counts.empty_pages === raw.counts.pages && raw.counts.tokenless_pages <= raw.counts.nonempty_pages, 'inconsistent page counts');
  check(object(raw.records) && integer(raw.records.count) && (raw.schema === 'okf-context-corpus.v2' || raw.records.count === raw.counts.nonempty_pages)
    && Array.isArray(raw.records.shards) && raw.records.shards.length <= 16000, 'record inventory');
  let next = 0;
  const paths = new Set([raw.base_index.path]);
  let previousId = '';
  for (const shard of raw.records.shards) {
    reference(shard); check(integer(shard.first_ordinal) && shard.first_ordinal === next && integer(shard.count, 10000) && shard.count > 0, 'non-contiguous record shards');
    if (raw.schema === 'okf-context-corpus.v2') {
      check(typeof shard.first_id === 'string' && typeof shard.last_id === 'string'
        && shard.first_id.length <= 2000 && shard.last_id.length <= 2000
        && UNIT_ID.test(shard.first_id) && UNIT_ID.test(shard.last_id)
        && shard.first_id > previousId && shard.last_id >= shard.first_id, 'invalid or overlapping unit ID ranges');
      previousId = shard.last_id;
    }
    check(!paths.has(shard.path), 'duplicate shard path'); paths.add(shard.path); next += shard.count;
  }
  check(next === raw.records.count, 'record count mismatch');
  check(object(raw.search) && raw.search.tokenisation === 'nfkd-lowercase-ascii-alphanumeric-min2-v1'
    && raw.search.bucket_algorithm === 'fnv1a32-high-byte-hex-v1' && object(raw.search.shards)
    && Object.keys(raw.search.shards).length === 256, 'search inventory');
  for (let i = 0; i < 256; i++) {
    const ref = raw.search.shards[i.toString(16).padStart(2, '0')]; reference(ref);
    check(!paths.has(ref.path), 'duplicate shard path'); paths.add(ref.path);
  }
  return raw as ContextCorpusManifest;
}
export function corpusTokens(text: string): string[] {
  return [...new Set(text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z0-9]{2,}/g) || [])];
}
export function corpusBucket(token: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) hash = Math.imul(hash ^ token.charCodeAt(i), 0x01000193) >>> 0;
  return (hash >>> 24).toString(16).padStart(2, '0');
}
async function digest(bytes: Uint8Array): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource)), v => v.toString(16).padStart(2, '0')).join('');
}
async function readLimited(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array> {
  check(stream, 'missing body'); const reader = stream.getReader(); const parts: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength; if (length > limit) { await reader.cancel(); throw new Error('Context corpus file exceeds its byte binding'); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  return bytes;
}

/** Fetch only confined, hash-bound files; each call has deterministic resource accounting even with an external cache. */
export async function assembleCorpusContext(raw: ContextCorpusManifest, binding: ContextBinding, question: string,
  budget: Partial<ContextBudget> = {}, fetcher: typeof fetch = fetch): Promise<ContextPackage> {
  const manifest = validateContextCorpusManifest(raw);
  if (manifest.schema === 'okf-context-corpus.v3') return assembleDiscoveryCorpusContext(manifest, binding, question, budget, fetcher);
  const logical = manifest.schema === 'okf-context-corpus.v2';
  const unitBudget = logical ? normaliseContextBudget(budget) : undefined;
  check(typeof question === 'string' && question.trim().length > 0 && question.length <= 4000, 'question must contain 1–4000 characters');
  const root = new URL('.', binding.index_url);
  check(['https:', 'http:'].includes(root.protocol) && !root.username && !root.password && HASH.test(binding.index_sha256), 'manifest binding');
  const retrieval: ContextRetrieval = { method: 'indexed-lexical-candidates.v1', corpus_records: manifest.records.count,
    corpus_pages: manifest.counts.pages, empty_pages: manifest.counts.empty_pages, query_tokens: [], omitted_query_tokens: [],
    candidate_count: 0, candidates: [], fetched_files: 0, fetched_bytes: 0, decoded_bytes: 0,
    limits: { ...CORPUS_LIMITS }, truncated: false, omissions: [] };
  if (logical) retrieval.units = { corpus_schema: 'okf-context-corpus.v2', referenced_records: [],
    examined_relationships: 0, limits: { ...UNIT_REFERENCE_LIMITS } };
  const omit = (code: string, message: string, ids: string[] = []) => {
    retrieval.truncated = true; retrieval.omissions.push({ code, message, ids });
  };
  const fetched = new Map<string, unknown>();
  const load = async (ref: Reference): Promise<any | null> => {
    if (fetched.has(ref.path)) return fetched.get(ref.path);
    const decodedLength = ref.decoded_bytes || ref.bytes;
    if (retrieval.fetched_files + 1 > CORPUS_LIMITS.files || retrieval.fetched_bytes + ref.bytes > CORPUS_LIMITS.fetched_bytes
      || retrieval.decoded_bytes + decodedLength > CORPUS_LIMITS.decoded_bytes) {
      fetched.set(ref.path, null);
      omit('retrieval_resource_budget', 'A hash-bound corpus file was omitted at the fixed retrieval resource limit.', [ref.path]); return null;
    }
    // Reserve in deterministic request order before any await. Parallel reads
    // cannot oversubscribe the existing transfer or decoded resource ceilings.
    retrieval.fetched_files++; retrieval.fetched_bytes += ref.bytes; retrieval.decoded_bytes += decodedLength;
    const url = new URL(ref.path, root); check(url.origin === root.origin && url.pathname.startsWith(root.pathname), 'file escaped corpus root');
    const response = await fetcher(url.href, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15000) });
    check(response.ok && (!response.url || response.url === url.href), `file unavailable or redirected: ${ref.path}`);
    const transferred = await readLimited(response.body, ref.bytes);
    check(transferred.length === ref.bytes && await digest(transferred) === ref.sha256, `transfer integrity failed: ${ref.path}`);
    let decoded = transferred;
    if (ref.encoding === 'gzip') decoded = await readLimited(new Blob([transferred as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')), decodedLength);
    check(decoded.length === decodedLength && await digest(decoded) === (ref.decoded_sha256 || ref.sha256), `decoded integrity failed: ${ref.path}`);
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded)); fetched.set(ref.path, value); return value;
  };
  const loadMany = async (references: Reference[]) => {
    const unique = [...new Map(references.map(ref => [ref.path, ref])).values()];
    for (let start = 0; start < unique.length; start += FETCH_CONCURRENCY) {
      const batch = await Promise.allSettled(unique.slice(start, start + FETCH_CONCURRENCY).map(load));
      // Await all admitted reads before failing; do not leave requests running
      // after an integrity error or start another batch after a failed batch.
      for (const result of batch) if (result.status === 'rejected') throw result.reason;
    }
  };
  const base = validateContextIndex(await load(manifest.base_index), manifest.semantic_source_snapshot);
  const wanted = corpusTokens(question).filter(t => !isQuestionScaffolding(t));
  retrieval.query_tokens = wanted.filter(t => t.length <= 64).slice(0, CORPUS_LIMITS.query_tokens);
  retrieval.omitted_query_tokens = wanted.filter(t => !retrieval.query_tokens.includes(t));
  if (retrieval.omitted_query_tokens.length) omit('retrieval_query_budget', 'Some query terms exceeded the fixed lexical query limit.');
  const ranking = new Map<number, { score: number; matched: string[] }>();
  await loadMany(retrieval.query_tokens.map(token => manifest.search.shards[corpusBucket(token)]));
  for (const token of retrieval.query_tokens) {
    const bucket = corpusBucket(token); const shard = await load(manifest.search.shards[bucket]); if (!shard) continue;
    check(shard.schema === 'okf-context-postings.v1' && object(shard.postings), 'invalid postings shard');
    const postings: unknown = Object.hasOwn(shard.postings, token) ? shard.postings[token] : [];
    check(Array.isArray(postings) && postings.length <= manifest.records.count, 'invalid posting list');
    const increment = 1 + Math.floor(1000 * Math.log2(1 + manifest.records.count / Math.max(1, postings.length)));
    let previous = -1;
    for (const ordinal of postings) {
      check(integer(ordinal) && ordinal < manifest.records.count && ordinal > previous, 'invalid or repeated posting ordinal'); previous = ordinal;
      const item = ranking.get(ordinal) || { score: 0, matched: [] };
      // Integer inverse document frequency, reproducible in every runtime. No learned ranking or hidden answer key.
      item.score += increment;
      item.matched.push(token); ranking.set(ordinal, item);
    }
  }
  retrieval.candidate_count = ranking.size;
  const ranked = [...ranking].sort((a, b) => b[1].score - a[1].score || a[0] - b[0]).slice(0, CORPUS_LIMITS.candidates);
  if (ranking.size > ranked.length) omit('retrieval_candidate_budget', logical
    ? 'Only the highest-ranked whole units fit the fixed lexical candidate limit; other matches remain outside this context.'
    : 'Only the highest-ranked whole pages fit the fixed lexical candidate limit; other matching pages remain outside this context.');
  const index: ContextIndex = { ...base, bundle: manifest.bundle, scope: manifest.scope,
    limitations: [...manifest.limitations, 'Lexical ranking uses question terms only; declared concept resolution remains separate. Ranking is integer inverse-document-frequency; ties use canonical record order.'], records: [...base.records] };
  const byId = new Map(index.records.map(r => [r.id, r]));
  const evidenceSeeds: Array<{ id: string; reason: string }> = [];
  const checkedShards = new Set<string>();
  const readRecords = async (ref: ContextRecordShard): Promise<ContextRecord[] | null> => {
    const shard = await load(ref); if (!shard) return null;
    check(shard.schema === 'okf-context-records.v1' && shard.first_ordinal === ref.first_ordinal
      && Array.isArray(shard.records) && shard.records.length === ref.count, 'invalid record shard');
    if (logical && !checkedShards.has(ref.path)) {
      validateContextIndex({ ...index, records: shard.records, assertions: [], requirements: [] });
      let previous = '';
      for (const record of shard.records as ContextRecord[]) {
        check(record.kind === 'evidence' && !!record.evidence_unit && UNIT_ID.test(record.id)
          && record.id > previous, 'unit shard records must be ordered, unique evidence units');
        previous = record.id;
      }
      check(shard.records[0].id === ref.first_id && shard.records.at(-1).id === ref.last_id, 'unit shard ID range differs');
      checkedShards.add(ref.path);
    }
    return shard.records;
  };
  const includeRecord = (record: ContextRecord): boolean => {
    const existing = byId.get(record.id);
    check(!existing || canonicalJson(existing) === canonicalJson(record), 'conflicting duplicate evidence');
    if (!existing) {
      index.records.push(record);
      if (size(index) > MAX_CONTEXT_INDEX_BYTES || (logical && index.records.length > 10000)) {
        index.records.pop(); omit('retrieval_index_budget', logical
          ? 'A whole unit was omitted to keep the working evidence index within its fixed record and 8 MiB limits.'
          : 'A whole candidate page was omitted to keep the working evidence index within 8 MiB.', [record.id]); return false;
      }
      byId.set(record.id, record);
    }
    return true;
  };
  await loadMany(ranked.map(([ordinal]) => manifest.records.shards.find(s => ordinal >= s.first_ordinal && ordinal < s.first_ordinal + s.count)!));
  for (const [ordinal, rank] of ranked) {
    const ref = manifest.records.shards.find(s => ordinal >= s.first_ordinal && ordinal < s.first_ordinal + s.count)!;
    const records = await readRecords(ref); if (!records) continue;
    const record = records[ordinal - ref.first_ordinal];
    validateContextIndex({ ...index, records: [record], assertions: [], requirements: [] });
    check(record.kind === 'evidence', 'lexical candidate must be evidence');
    if (!includeRecord(record)) continue;
    check(!evidenceSeeds.some(s => s.id === record.id), 'duplicate candidate record');
    retrieval.candidates.push({ id: record.id, ...rank });
    evidenceSeeds.push({ id: record.id, reason: `${logical ? 'Whole-unit' : 'Whole-page'} lexical candidate: ${rank.matched.join(', ')}; score ${rank.score}. This is not an applicability or completeness assertion.` });
  }
  if (logical) {
    // Load destinations only along actual directed paths from resolved concepts
    // or lexical candidates. Requirement endpoints never become new seeds.
    const outgoing = new Map<string, typeof index.assertions>();
    for (const edge of [...index.assertions].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
      const rows = outgoing.get(edge.source) || []; rows.push(edge); outgoing.set(edge.source, rows);
    }
    const seeds = [...new Set([...resolveConcepts(base, question).resolved.map(row => row.id), ...evidenceSeeds.map(row => row.id)])].sort();
    const queue = seeds.map(id => ({ id, depth: 0 })); const visited = new Set<string>(); const attempted = new Set<string>();
    let inspected = 0;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const { id, depth } = queue[cursor];
      if (visited.has(id)) continue; visited.add(id);
      if (!byId.has(id)) {
        if (attempted.size >= UNIT_REFERENCE_LIMITS.referenced_records) {
          omit('referenced_record_budget', 'The bounded declared-destination loading limit was reached.', [id]); continue;
        }
        attempted.add(id);
        const ref = manifest.records.shards.find(row => row.first_id! <= id && id <= row.last_id!);
        if (!ref) { omit('referenced_record_missing', 'A declared destination is absent from the unit inventory.', [id]); continue; }
        const records = await readRecords(ref);
        const record = records?.find(row => row.id === id);
        if (!record) { omit('referenced_record_missing', 'A declared destination could not be loaded from its bound unit shard.', [id]); continue; }
        if (!includeRecord(record)) continue;
        retrieval.units!.referenced_records.push(id);
      }
      if (byId.get(id)!.access !== 'public') continue;
      for (const edge of outgoing.get(id) || []) {
        if (!CONTEXT_PREDICATES.has(edge.predicate)) continue;
        if (inspected >= UNIT_REFERENCE_LIMITS.examined_relationships) {
          omit('referenced_relationship_budget', 'The bounded declared-relationship loading limit was reached.', [id]); break;
        }
        inspected++;
        if (depth >= unitBudget!.max_depth) {
          if (!byId.has(edge.target)) omit('referenced_depth_budget', 'A declared destination exceeds the requested traversal depth.', [edge.id, edge.target]);
          continue;
        }
        if (!visited.has(edge.target)) queue.push({ id: edge.target, depth: depth + 1 });
      }
    }
    retrieval.units!.examined_relationships = inspected;
  }
  return assembleContext(index, question, budget, binding, { evidenceSeeds, retrieval });
}
