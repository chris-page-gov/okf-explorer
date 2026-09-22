import { describe, expect, it } from 'vitest';
// @ts-ignore -- Node-only test fixture; application dependencies stay browser-only.
import { gzipSync } from 'node:zlib';
// @ts-ignore -- Node-only test fixture.
import { createHash } from 'node:crypto';
import { assembleCorpusContext, CORPUS_LIMITS, corpusBucket, corpusTokens, validateContextCorpusManifest, type ContextCorpusManifest } from './corpus';
import { MAX_CONTEXT_INDEX_BYTES, resolveConcepts } from './index';
import { sizedStudyClubContextFixture, studyClubContextFixture } from '../../test/contextFixture';
import retainedV1 from '../../test/fixtures/context-corpus-v1-74e29.json';
import retainedV1Inputs from '../../test/fixtures/context-corpus-v1-74e29-inputs.json';
const sha = (v: Uint8Array) => createHash('sha256').update(v).digest('hex');
async function fixture(count = 2, texts?: string[]) {
  const base = await studyClubContextFixture(); const template = base.records[0];
  base.records = []; base.assertions = []; base.requirements = [];
  const files = new Map<string, Uint8Array>();
  const put = (path: string, value: unknown, gzip = false) => {
    const decoded = new TextEncoder().encode(JSON.stringify(value)); const bytes = gzip ? gzipSync(decoded) : decoded; files.set(path, bytes);
    return { path, bytes: bytes.length, sha256: sha(bytes), ...(gzip ? { encoding: 'gzip' as const, decoded_bytes: decoded.length, decoded_sha256: sha(decoded) } : {}) };
  };
  const records = Array.from({ length: count }, (_, i) => {
    const text = texts?.[i] ?? (i === 0 ? 'Orchards and apples.' : 'Orchards and pears.');
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
  it('replays the complete v1 package captured from immutable 74e29 without changing its identity', async () => {
    // Gzip is valid but not byte-identical across zlib implementations. Exact
    // replay therefore uses retained input bytes, including their manifest.
    const manifest = validateContextCorpusManifest(retainedV1Inputs.manifest);
    const binding = { index_url: retainedV1.binding.index_url,
      index_sha256: sha(new TextEncoder().encode(JSON.stringify(manifest))) };
    expect(binding).toEqual(retainedV1.binding);
    const calls: string[] = [];
    const fetcher = (async (url: string | URL | Request) => {
      const path = new URL(String(url)).pathname.replace('/corpus/', '');
      calls.push(path);
      const bytes = retainedV1Inputs.files[path as keyof typeof retainedV1Inputs.files];
      if (!bytes) throw new Error(`Unexpected replay resource: ${path}`);
      return new Response(Uint8Array.from(bytes));
    }) as typeof fetch;
    expect(await assembleCorpusContext(manifest, binding, 'apples', {}, fetcher)).toEqual(retainedV1);
    expect(calls.sort()).toEqual(Object.keys(retainedV1Inputs.files).sort());
  });
  it('rejects tampered compressed v1 replay bytes without changing the retained expectation', async () => {
    const manifest = validateContextCorpusManifest(retainedV1Inputs.manifest);
    const fetcher = (async (url: string | URL | Request) => {
      const path = new URL(String(url)).pathname.replace('/corpus/', '');
      const bytes = Uint8Array.from(retainedV1Inputs.files[path as keyof typeof retainedV1Inputs.files]);
      if (path.endsWith('.gz')) bytes[bytes.length - 1] ^= 1;
      return new Response(bytes);
    }) as typeof fetch;
    await expect(assembleCorpusContext(manifest, retainedV1.binding, 'apples', {}, fetcher)).rejects.toThrow(/transfer integrity/);
  });
  it('loads a base index above 4 MiB while keeping whole-page discovery and output bounds', async () => {
    const f = await fixture();
    const base = await sizedStudyClubContextFixture(4 * 1024 * 1024 + 1);
    f.manifest.base_index = f.put('base-index.json', base);
    const result = await assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher);
    expect(result.selected.some(row => row.record.text === 'Orchards and apples.')).toBe(true);
    expect(result.retrieval!.fetched_bytes).toBeGreaterThan(4 * 1024 * 1024);
    expect(result.retrieval!.limits).toEqual(CORPUS_LIMITS);
    expect(CORPUS_LIMITS.fetched_bytes).toBe(16 * 1024 * 1024);
    expect(CORPUS_LIMITS.decoded_bytes).toBe(32 * 1024 * 1024);
    expect(result.budget.used_bytes).toBeLessThanOrEqual(524288);
    expect(result.evidence_status).toBe('insufficient');
  });
  it.each(['base-transfer', 'base-decoded', 'record-transfer', 'record-decoded', 'posting-transfer', 'posting-decoded', 'manifest'])('retains explicit per-kind resource caps: %s', async variant => {
    const f = await fixture();
    f.manifest.base_index.bytes = MAX_CONTEXT_INDEX_BYTES;
    expect(validateContextCorpusManifest(f.manifest)).toBe(f.manifest);
    if (variant === 'manifest') f.manifest.scope = 'x'.repeat(4 * 1024 * 1024);
    else {
      const ref = variant.startsWith('base') ? f.manifest.base_index : variant.startsWith('record')
        ? f.manifest.records.shards[0] : f.manifest.search.shards['00'];
      const limit = variant.startsWith('base') ? MAX_CONTEXT_INDEX_BYTES : 4 * 1024 * 1024;
      if (variant.endsWith('decoded')) {
        ref.encoding = 'gzip'; ref.decoded_bytes = limit + 1; ref.decoded_sha256 = 'a'.repeat(64);
      } else ref.bytes = limit + 1;
    }
    await expect(assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher)).rejects.toThrow(/byte\/hash|oversized/);
    expect(f.calls).toEqual([]);
  });
  it('omits a whole candidate when the expanded working index would exceed 8 MiB', async () => {
    const f = await fixture(1, ['apples ' + 'x'.repeat(8000)]);
    const base = await sizedStudyClubContextFixture(MAX_CONTEXT_INDEX_BYTES - 4000);
    f.manifest.base_index = f.put('base-index.json', base);
    const result = await assembleCorpusContext(f.manifest, f.binding, 'apples', {}, f.fetcher);
    expect(result.retrieval!.omissions.some(row => row.code === 'retrieval_index_budget')).toBe(true);
    expect(result.selected.some(row => row.record.id === 'https://example.test/evidence/0')).toBe(false);
    expect(result.evidence_status).toBe('insufficient');
    expect(result.budget.truncated).toBe(true);
  });
  const distinctTerms = () => {
    const seen = new Set<string>(); const terms: string[] = [];
    for (let i = 0; terms.length < 12; i++) {
      const word = `fruit${i}`; const bucket = corpusBucket(word);
      if (!seen.has(bucket)) { seen.add(bucket); terms.push(word); }
    }
    return terms;
  };
  it('loads at most four unique files concurrently without changing evidence or accounting', async () => {
    const words = distinctTerms();
    const f = await fixture(2, [words.join(' '), 'A different orchard.']);
    const query = words.join(' ');
    const expected = await assembleCorpusContext(f.manifest, f.binding, query, {}, f.fetcher);
    f.calls.length = 0;
    let active = 0, peak = 0;
    const delayed: typeof fetch = async (url, options) => {
      active++; peak = Math.max(peak, active);
      try {
        // Different completion order must not alter ranking or package identity.
        await new Promise(resolve => setTimeout(resolve, String(url).length % 3 + 2));
        return await f.fetcher(url, options);
      } finally { active--; }
    };
    expect(await assembleCorpusContext(f.manifest, f.binding, query, {}, delayed)).toEqual(expected);
    expect(peak).toBe(4); expect(active).toBe(0);
    expect(new Set(f.calls).size).toBe(f.calls.length);
    expect(expected.retrieval!.fetched_files).toBe(f.calls.length);
    expect(expected.retrieval!.fetched_bytes).toBe(f.calls.reduce((sum, name) => sum + f.files.get(name)!.length, 0));
  });
  it.each([false, true])('reserves transfer and decoded bytes before parallel requests (gzip=%s)', async gzip => {
    const words = distinctTerms(); const f = await fixture();
    for (const word of words) {
      const bucket = corpusBucket(word);
      f.manifest.search.shards[bucket] = f.put(`search/${bucket}.json${gzip ? '.gz' : ''}`,
        { schema: 'okf-context-postings.v1', postings: { [word]: [0] }, padding: 'x'.repeat(3 * 1024 * 1024) }, gzip);
    }
    const result = await assembleCorpusContext(f.manifest, f.binding, words.join(' '), {}, f.fetcher);
    expect(result.retrieval!.fetched_bytes).toBeLessThanOrEqual(CORPUS_LIMITS.fetched_bytes);
    expect(result.retrieval!.decoded_bytes).toBeLessThanOrEqual(CORPUS_LIMITS.decoded_bytes);
    expect(result.retrieval!.fetched_files).toBe(f.calls.length);
    expect(new Set(f.calls).size).toBe(f.calls.length);
    const omitted = result.retrieval!.omissions.filter(issue => issue.code === 'retrieval_resource_budget');
    expect(omitted.length).toBeGreaterThan(0);
    expect(new Set(omitted.map(issue => issue.ids[0])).size).toBe(omitted.length);
    expect(result.evidence_status).toBe('insufficient'); expect(result.budget.truncated).toBe(true);
  });
  it('settles admitted reads and stops before another batch after an integrity failure', async () => {
    const words = distinctTerms(); const f = await fixture();
    const failPath = f.manifest.search.shards[corpusBucket(words[0])].path;
    let active = 0; const started: string[] = [];
    const failing: typeof fetch = async (url, options) => {
      const name = new URL(String(url)).pathname.replace('/corpus/', ''); started.push(name);
      active++;
      try {
        if (name === failPath) return new Response('corrupt');
        await new Promise(resolve => setTimeout(resolve, 2));
        return await f.fetcher(url, options);
      } finally { active--; }
    };
    await expect(assembleCorpusContext(f.manifest, f.binding, words.join(' '), {}, failing)).rejects.toThrow('integrity');
    expect(active).toBe(0);
    expect(started).toHaveLength(5); // Base index plus one four-file batch.
  });
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
  it.each([
    'What happens to your tickets if you go abroad?',
    'What happens to her tickets if she is going abroad?',
    'What tickets do they get abroad?',
    'What tickets is he getting abroad?'
  ])('does not let conversational pronouns or broad verbs outrank the subject: %s', async question => {
    const f = await fixture(2, [
      'Your go her she going they get he getting. Stationery instructions.',
      'Library tickets abroad require a return plan.'
    ]);
    const result = await assembleCorpusContext(f.manifest, f.binding, question, {}, f.fetcher);
    expect(result.retrieval?.query_tokens).toEqual(['tickets', 'abroad']);
    expect(result.retrieval?.candidate_count).toBe(1);
    expect(result.selected.map(item => item.record.text)).toEqual(['Library tickets abroad require a return plan.']);
    expect(result.retrieval?.candidates[0].matched).toEqual(['tickets', 'abroad']);
    expect(result.unresolved_terms).toEqual(['abroad', 'tickets']);
    expect(result.unresolved_terms).toEqual(resolveConcepts(f.base, question).unresolved);
    expect(result.evidence_status).toBe('insufficient');
  });
  it('retains substantive receiving and payment terms when filtering question scaffolding', async () => {
    const f = await fixture();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'What payment is she receiving?', {}, f.fetcher);
    expect(result.retrieval?.query_tokens).toEqual(['payment', 'receiving']);
    expect(result.unresolved_terms).toEqual(['payment', 'receiving']);
  });
  it('uses the same scaffolding classification for travel discovery and missing-concept diagnostics', async () => {
    const f = await fixture(2, ['Your go during. Stationery instructions.', 'Library tickets during travel require a return plan.']);
    const question = 'What happens to your tickets during travel?';
    const result = await assembleCorpusContext(f.manifest, f.binding, question, {}, f.fetcher);
    expect(result.retrieval?.query_tokens).toEqual(['tickets', 'travel']);
    expect(result.unresolved_terms).toEqual(['tickets', 'travel']);
    expect(result.unresolved_terms).toEqual(resolveConcepts(f.base, question).unresolved);
    expect(result.selected.map(item => item.record.text)).toEqual(['Library tickets during travel require a return plan.']);
    expect(result.resolved_concepts).toEqual([]);
    expect(result.evidence_status).toBe('insufficient');
    expect(await assembleCorpusContext(f.manifest, f.binding, question, {}, f.fetcher)).toEqual(result);
  });
  it('preserves qualification and identifier tokens in both discovery and diagnostics', async () => {
    const f = await fixture();
    const terms = ['loss', 'lost', 'not', 'without', 'unless', 'except', 'only', 'before', 'after', 'until', '2026', 'alpha42'];
    const result = await assembleCorpusContext(f.manifest, f.binding, `Explain ${terms.join(' ')}`, {}, f.fetcher);
    expect(result.retrieval?.query_tokens).toEqual(terms);
    expect(result.unresolved_terms).toEqual([...terms].sort());
    expect(result.evidence_status).toBe('insufficient');
  });
  it('still resolves a declared Go alias when lexical scaffolding supplies no candidates', async () => {
    const f = await fixture();
    const base = await studyClubContextFixture();
    const concept = base.records.find(record => record.kind === 'concept')!;
    concept.aliases = [{ label: 'Go', case_sensitive: true }];
    f.manifest.base_index = f.put('base-index.json', base);
    const result = await assembleCorpusContext(f.manifest, f.binding, 'Explain Go', {}, f.fetcher);
    expect(result.retrieval?.query_tokens).toEqual([]);
    expect(result.retrieval?.candidate_count).toBe(0);
    expect(result.resolved_concepts.map(record => record.id)).toEqual([concept.id]);
    expect(result.unresolved_terms).toEqual([]);
    expect(result.evidence_status).toBe('sufficient');
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
