/** Hash-bound full-source lexical discovery. No source text is executed or treated as a completeness rule. */
// @ts-ignore -- Explicit extension also supports the pinned Node type-stripping consumer.
import { assembleContext, canonicalJson, validateContextIndex } from './index.ts';
import type { ContextBinding, ContextBudget, ContextIndex, ContextPackage, ContextRecord, ContextRetrieval } from './types.ts';

type Reference = { path: string; bytes: number; sha256: string; encoding?: 'gzip'; decoded_bytes?: number; decoded_sha256?: string };
export type ContextCorpusManifest = {
  schema: 'okf-context-corpus.v1'; bundle: ContextIndex['bundle']; scope: string; limitations: string[];
  semantic_source_snapshot: string; base_index: Reference;
  counts: { documents: number; pages: number; nonempty_pages: number; empty_pages: number; tokenless_pages: number };
  records: { count: number; shards: Array<Reference & { first_ordinal: number; count: number }> };
  search: { tokenisation: 'nfkd-lowercase-ascii-alphanumeric-min2-v1'; bucket_algorithm: 'fnv1a32-high-byte-hex-v1'; shards: Record<string, Reference> };
};
export const CORPUS_LIMITS = Object.freeze({ query_tokens: 24, candidates: 16, files: 64,
  fetched_bytes: 16 * 1024 * 1024, decoded_bytes: 32 * 1024 * 1024 });
const FILE_LIMIT = 4 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
// English question scaffolding: pronouns and broad request/action verbs are
// poor evidence discriminators even when rare in a formal source corpus.
// Domain terms (including receiving/payment), identifiers and rules stay intact.
const STOP = new Set(('a an the and or but to of for from on in into at with without by as is are was were be been being ' +
  'has have had do does did will would can could should may might i we you they it its their this that these those ' +
  'what which who how why when where whether explain show describe compare find give tell please happens happen ' +
  'effect effects affect affects distinguish distinguishing difference differences between each all any some both ' +
  'trace conclusion conclusions relevant given following about against over under than then also need needed ' +
  'information evidence source sources question answer me my us our such so if not must meaning means mean ' +
  'regarding relates concerning details detail ' +
  'your yours yourself yourselves mine myself he him his himself she her hers herself ' +
  'ours ourselves them theirs themselves itself go going get getting').split(' '));
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(`Invalid context corpus: ${message}`); }
function object(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function integer(value: unknown, max = 1_000_000): value is number { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max; }
function size(value: unknown): number { return new TextEncoder().encode(JSON.stringify(value)).length; }
function reference(value: unknown): void {
  check(object(value), 'file reference required');
  check(typeof value.path === 'string' && value.path.length <= 240 && /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(value.path)
    && !value.path.split('/').some((s: string) => s === '.' || s === '..'), 'unsafe relative file path');
  check(integer(value.bytes, FILE_LIMIT) && value.bytes > 0 && HASH.test(value.sha256), 'file byte/hash binding required');
  check(value.encoding === undefined || value.encoding === 'gzip', 'unsupported compression');
  if (value.encoding) check(integer(value.decoded_bytes, FILE_LIMIT) && value.decoded_bytes > 0 && HASH.test(value.decoded_sha256), 'decoded byte/hash binding required');
}
export function validateContextCorpusManifest(raw: unknown): ContextCorpusManifest {
  check(object(raw) && raw.schema === 'okf-context-corpus.v1' && size(raw) <= FILE_LIMIT, 'unsupported or oversized manifest');
  check(object(raw.bundle) && typeof raw.bundle.id === 'string' && typeof raw.bundle.snapshot === 'string', 'bundle identity');
  check(typeof raw.semantic_source_snapshot === 'string', 'semantic snapshot required');
  // Reuse the existing governance contract for identity, scope and limitations.
  validateContextIndex({ schema: 'okf-context-index.v1', bundle: raw.bundle, scope: raw.scope,
    limitations: raw.limitations, records: [], assertions: [], requirements: [] });
  reference(raw.base_index);
  check(object(raw.counts) && ['documents', 'pages', 'nonempty_pages', 'empty_pages', 'tokenless_pages'].every(k => integer(raw.counts[k])), 'invalid source counts');
  check(raw.counts.nonempty_pages + raw.counts.empty_pages === raw.counts.pages && raw.counts.tokenless_pages <= raw.counts.nonempty_pages, 'inconsistent page counts');
  check(object(raw.records) && integer(raw.records.count) && raw.records.count === raw.counts.nonempty_pages
    && Array.isArray(raw.records.shards) && raw.records.shards.length <= 16000, 'record inventory');
  let next = 0;
  const paths = new Set([raw.base_index.path]);
  for (const shard of raw.records.shards) {
    reference(shard); check(integer(shard.first_ordinal) && shard.first_ordinal === next && integer(shard.count, 10000) && shard.count > 0, 'non-contiguous record shards');
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
  check(typeof question === 'string' && question.trim().length > 0 && question.length <= 4000, 'question must contain 1–4000 characters');
  const root = new URL('.', binding.index_url);
  check(['https:', 'http:'].includes(root.protocol) && !root.username && !root.password && HASH.test(binding.index_sha256), 'manifest binding');
  const retrieval: ContextRetrieval = { method: 'indexed-lexical-candidates.v1', corpus_records: manifest.records.count,
    corpus_pages: manifest.counts.pages, empty_pages: manifest.counts.empty_pages, query_tokens: [], omitted_query_tokens: [],
    candidate_count: 0, candidates: [], fetched_files: 0, fetched_bytes: 0, decoded_bytes: 0,
    limits: { ...CORPUS_LIMITS }, truncated: false, omissions: [] };
  const omit = (code: string, message: string, ids: string[] = []) => {
    retrieval.truncated = true; retrieval.omissions.push({ code, message, ids });
  };
  const fetched = new Map<string, unknown>();
  const load = async (ref: Reference): Promise<any | null> => {
    if (fetched.has(ref.path)) return fetched.get(ref.path);
    const decodedLength = ref.decoded_bytes || ref.bytes;
    if (retrieval.fetched_files + 1 > CORPUS_LIMITS.files || retrieval.fetched_bytes + ref.bytes > CORPUS_LIMITS.fetched_bytes
      || retrieval.decoded_bytes + decodedLength > CORPUS_LIMITS.decoded_bytes) {
      omit('retrieval_resource_budget', 'A hash-bound corpus file was omitted at the fixed retrieval resource limit.', [ref.path]); return null;
    }
    const url = new URL(ref.path, root); check(url.origin === root.origin && url.pathname.startsWith(root.pathname), 'file escaped corpus root');
    const response = await fetcher(url.href, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(15000) });
    check(response.ok && (!response.url || response.url === url.href), `file unavailable or redirected: ${ref.path}`);
    const transferred = await readLimited(response.body, ref.bytes);
    check(transferred.length === ref.bytes && await digest(transferred) === ref.sha256, `transfer integrity failed: ${ref.path}`);
    let decoded = transferred;
    if (ref.encoding === 'gzip') decoded = await readLimited(new Blob([transferred as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip')), decodedLength);
    check(decoded.length === decodedLength && await digest(decoded) === (ref.decoded_sha256 || ref.sha256), `decoded integrity failed: ${ref.path}`);
    retrieval.fetched_files++; retrieval.fetched_bytes += transferred.length; retrieval.decoded_bytes += decoded.length;
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded)); fetched.set(ref.path, value); return value;
  };
  const base = validateContextIndex(await load(manifest.base_index), manifest.semantic_source_snapshot);
  const wanted = corpusTokens(question).filter(t => !STOP.has(t));
  retrieval.query_tokens = wanted.filter(t => t.length <= 64).slice(0, CORPUS_LIMITS.query_tokens);
  retrieval.omitted_query_tokens = wanted.filter(t => !retrieval.query_tokens.includes(t));
  if (retrieval.omitted_query_tokens.length) omit('retrieval_query_budget', 'Some query terms exceeded the fixed lexical query limit.');
  const ranking = new Map<number, { score: number; matched: string[] }>();
  for (const token of retrieval.query_tokens) {
    const bucket = corpusBucket(token); const shard = await load(manifest.search.shards[bucket]); if (!shard) continue;
    check(shard.schema === 'okf-context-postings.v1' && object(shard.postings), 'invalid postings shard');
    const postings: unknown = Object.hasOwn(shard.postings, token) ? shard.postings[token] : [];
    check(Array.isArray(postings) && postings.length <= manifest.records.count, 'invalid posting list');
    let previous = -1;
    for (const ordinal of postings) {
      check(integer(ordinal) && ordinal < manifest.records.count && ordinal > previous, 'invalid or repeated posting ordinal'); previous = ordinal;
      const item = ranking.get(ordinal) || { score: 0, matched: [] };
      // Integer inverse document frequency, reproducible in every runtime. No learned ranking or hidden answer key.
      item.score += 1 + Math.floor(1000 * Math.log2(1 + manifest.records.count / Math.max(1, postings.length)));
      item.matched.push(token); ranking.set(ordinal, item);
    }
  }
  retrieval.candidate_count = ranking.size;
  const ranked = [...ranking].sort((a, b) => b[1].score - a[1].score || a[0] - b[0]).slice(0, CORPUS_LIMITS.candidates);
  if (ranking.size > ranked.length) omit('retrieval_candidate_budget', 'Only the highest-ranked whole pages fit the fixed lexical candidate limit; other matching pages remain outside this context.');
  const index: ContextIndex = { ...base, bundle: manifest.bundle, scope: manifest.scope,
    limitations: [...manifest.limitations, 'Lexical ranking uses question terms only; declared concept resolution remains separate. Ranking is integer inverse-document-frequency; ties use canonical record order.'], records: [...base.records] };
  const byId = new Map(index.records.map(r => [r.id, r]));
  const evidenceSeeds: Array<{ id: string; reason: string }> = [];
  for (const [ordinal, rank] of ranked) {
    const ref = manifest.records.shards.find(s => ordinal >= s.first_ordinal && ordinal < s.first_ordinal + s.count)!;
    const shard = await load(ref); if (!shard) continue;
    check(shard.schema === 'okf-context-records.v1' && shard.first_ordinal === ref.first_ordinal
      && Array.isArray(shard.records) && shard.records.length === ref.count, 'invalid record shard');
    const record: ContextRecord = shard.records[ordinal - ref.first_ordinal];
    validateContextIndex({ ...index, records: [record], assertions: [], requirements: [] });
    check(record.kind === 'evidence', 'lexical candidate must be evidence');
    const existing = byId.get(record.id);
    check(!existing || canonicalJson(existing) === canonicalJson(record), 'conflicting duplicate evidence');
    if (!existing) {
      index.records.push(record);
      if (size(index) > FILE_LIMIT) { index.records.pop(); omit('retrieval_index_budget', 'A whole candidate page was omitted to keep the working evidence index within 4 MiB.', [record.id]); continue; }
      byId.set(record.id, record);
    }
    check(!evidenceSeeds.some(s => s.id === record.id), 'duplicate candidate record');
    retrieval.candidates.push({ id: record.id, ...rank });
    evidenceSeeds.push({ id: record.id, reason: `Whole-page lexical candidate: ${rank.matched.join(', ')}; score ${rank.score}. This is not an applicability or completeness assertion.` });
  }
  return assembleContext(index, question, budget, binding, { evidenceSeeds, retrieval });
}
