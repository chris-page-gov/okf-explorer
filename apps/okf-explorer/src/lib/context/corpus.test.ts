import { describe, expect, it } from 'vitest';
// @ts-ignore -- Node-only test fixture; application dependencies stay browser-only.
import { gzipSync } from 'node:zlib';
// @ts-ignore -- Node-only test fixture.
import { createHash } from 'node:crypto';
import { assembleCorpusContext, corpusBucket, corpusTokens, validateContextCorpusManifest, type ContextCorpusManifest } from './corpus';
import { studyClubContextFixture } from '../../test/contextFixture';
const sha = (v: Uint8Array) => createHash('sha256').update(v).digest('hex');
async function fixture(count = 2) {
  const base = await studyClubContextFixture(); const template = base.records[0];
  base.records = []; base.assertions = []; base.requirements = [];
  const files = new Map<string, Uint8Array>();
  const put = (path: string, value: unknown, gzip = false) => {
    const decoded = new TextEncoder().encode(JSON.stringify(value)); const bytes = gzip ? gzipSync(decoded) : decoded; files.set(path, bytes);
    return { path, bytes: bytes.length, sha256: sha(bytes), ...(gzip ? { encoding: 'gzip' as const, decoded_bytes: decoded.length, decoded_sha256: sha(decoded) } : {}) };
  };
  const records = Array.from({ length: count }, (_, i) => {
    const text = i === 0 ? 'Orchards and apples.' : 'Orchards and pears.';
    return { ...template, id: `https://example.test/evidence/${i}`, route: `evidence/${i}`, text,
      provenance: template.provenance.map(p => ({ ...p, literal_sha256: sha(new TextEncoder().encode(text)) })) };
  });
  const buckets: Record<string, Record<string, number[]>> = {};
  for (let n = 0; n < 256; n++) buckets[n.toString(16).padStart(2, '0')] = {};
  records.forEach((r, i) => corpusTokens(r.text).forEach(t => (buckets[corpusBucket(t)][t] ||= []).push(i)));
  const manifest: ContextCorpusManifest = { schema: 'okf-context-corpus.v1', bundle: base.bundle,
    semantic_source_snapshot: base.bundle.snapshot, scope: base.scope, limitations: base.limitations,
    counts: { documents: 1, pages: count + 1, nonempty_pages: count, empty_pages: 1, tokenless_pages: 0 },
    base_index: put('base-index.json', base), records: { count, shards: [{ ...put('records/0000.json.gz', { schema: 'okf-context-records.v1', first_ordinal: 0, records }, true), first_ordinal: 0, count }] },
    search: { tokenisation: 'nfkd-lowercase-ascii-alphanumeric-min2-v1', bucket_algorithm: 'fnv1a32-high-byte-hex-v1', shards: Object.fromEntries(Object.entries(buckets).map(([k, postings]) => [k, put(`search/${k}.json.gz`, { schema: 'okf-context-postings.v1', postings }, true)])) } };
  const calls: string[] = [];
  const fetcher = (async (url: string | URL | Request) => { const path = new URL(String(url)).pathname.replace('/corpus/', ''); calls.push(path); return new Response(files.get(path) as BodyInit); }) as typeof fetch;
  const binding = { index_url: 'https://example.test/corpus/manifest.json', index_sha256: sha(new TextEncoder().encode(JSON.stringify(manifest))) };
  return { manifest, files, calls, fetcher, binding, put, base };
}
describe('full-source governed corpus discovery', () => {
  it('retrieves whole evidence outside the base graph reproducibly without asserting completeness', async () => {
    const f = await fixture(); const one = await assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher);
    expect(one).toEqual(await assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher));
    expect(one.selected.map(r => r.record.text)).toEqual(['Orchards and apples.']);
    expect(one.resolved_concepts).toEqual([]); expect(one.evidence_status).toBe('insufficient'); expect(one.ai_answer).toBeNull();
    expect(one.retrieval?.empty_pages).toBe(1); expect(one.retrieval?.fetched_files).toBe(3);
    expect(one.selected[0].reasons[0]).toContain('lexical candidate');
  });
  it('normalises accents and selects a stable FNV bucket', () => {
    expect(corpusTokens('Café CAFÉ x 1 APpLes')).toEqual(['cafe', 'apples']); expect(corpusBucket('hello')).toBe('4f');
  });
  it.each(['../outside', 'https://evil.test/data', '/outside', 'records/%2e%2e/x', 'records/../x', 'records\\x'])('rejects unsafe reference %s before fetching', async path => {
    const f = await fixture(); f.manifest.base_index.path = path;
    await expect(assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher)).rejects.toThrow('unsafe relative'); expect(f.calls).toEqual([]);
  });
  it('rejects tampered compressed bytes', async () => {
    const f = await fixture(); const path = f.manifest.search.shards[corpusBucket('apples')].path;
    const bytes = f.files.get(path)!.slice(); bytes[12] ^= 1; f.files.set(path, bytes);
    await expect(assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher)).rejects.toThrow('integrity');
  });
  it('rejects decompression past the declared length', async () => {
    const f = await fixture(); f.manifest.records.shards[0].decoded_bytes = 1;
    await expect(assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher)).rejects.toThrow('byte binding');
  });
  it('rejects invalid ordinals even if transfer hashes match', async () => {
    const f = await fixture(); const k = corpusBucket('apples');
    f.manifest.search.shards[k] = f.put(`search/${k}.json.gz`, { schema: 'okf-context-postings.v1', postings: { apples: [999] } }, true);
    await expect(assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher)).rejects.toThrow('ordinal');
  });
  it('rejects conflicting duplicate canonical evidence', async () => {
    const f = await fixture(); f.base.records = [{ ...(await studyClubContextFixture()).records[0], id: 'https://example.test/evidence/0' }];
    f.manifest.base_index = f.put('base-index.json', f.base);
    await expect(assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher)).rejects.toThrow('conflicting duplicate');
  });
  it('reports bounded selection, deterministic ties and a small output budget', async () => {
    const f = await fixture(40); const r = await assembleCorpusContext(f.manifest, f.binding, 'orchards', { max_bytes: 8192 }, f.fetcher);
    expect(r.retrieval?.candidate_count).toBe(40); expect(r.retrieval?.truncated).toBe(true);
    expect(r.budget.used_bytes).toBeLessThanOrEqual(8192); expect(r.budget.truncated).toBe(true); expect(r.evidence_status).toBe('insufficient');
  });
  it('does not expand page ranking with broad concept labels', async () => {
    const f = await fixture(); f.base.records = [{ ...(await studyClubContextFixture()).records[0], kind: 'concept', aliases: ['apples'], label: 'Unrelated pears' }];
    f.manifest.base_index = f.put('base-index.json', f.base);
    const r = await assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher);
    expect(r.retrieval?.query_tokens).toEqual(['apples']); expect(r.retrieval?.candidate_count).toBe(1);
  });
  it('rejects record inventory gaps', async () => {
    const f = await fixture(); f.manifest.records.shards[0].first_ordinal = 1;
    expect(() => validateContextCorpusManifest(f.manifest)).toThrow('non-contiguous');
  });
});
