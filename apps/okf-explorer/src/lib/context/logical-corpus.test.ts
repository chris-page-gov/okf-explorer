import { describe, expect, it } from 'vitest';
// @ts-ignore -- Node-only fixture.
import { gzipSync } from 'node:zlib';
// @ts-ignore -- Node-only fixture.
import { createHash } from 'node:crypto';
import { assembleCorpusContext, corpusBucket, corpusTokens, UNIT_REFERENCE_LIMITS, validateContextCorpusManifest, type ContextCorpusManifest } from './corpus';
import { studyClubContextFixture } from '../../test/contextFixture';
import { unitFixture } from '../../test/unitFixture';
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function fixture(count = 20, shardSize = 1) {
  const base = await studyClubContextFixture();
  const root = base.records.find(row => row.kind === 'concept')!;
  const unitId = (i: number) => `https://example.test/unit/${String(i).padStart(4, '0')}`;
  const records = await Promise.all(Array.from({ length: count }, (_, i) => unitFixture([i === count - 1 ? 'Only with a permit.' : 'Quartz mineral collection.'], unitId(i))));
  const edge = base.assertions[0];
  base.records = [root];
  base.assertions = [{ ...edge, source: root.id, target: records[0].id },
    { ...edge, id: edge.id + '-qualification', source: records[0].id, target: records.at(-1)!.id }];
  base.requirements = [{ ...base.requirements[0], required: [records[0].id, records.at(-1)!.id], required_paths: [
    { seed: root.id, records: [root.id, records[0].id, records.at(-1)!.id], assertions: base.assertions.map(row => row.id) }
  ] }];
  const files = new Map<string, Uint8Array>();
  const put = (path: string, value: unknown) => {
    const decoded = new TextEncoder().encode(JSON.stringify(value)); const bytes = gzipSync(decoded); files.set(path, bytes);
    return { path, bytes: bytes.length, sha256: sha(bytes), encoding: 'gzip' as const, decoded_bytes: decoded.length, decoded_sha256: sha(decoded) };
  };
  const buckets: Record<string, Record<string, number[]>> = {};
  for (let i = 0; i < 256; i++) buckets[i.toString(16).padStart(2, '0')] = {};
  records.forEach((record, ordinal) => corpusTokens(record.text).forEach(token => (buckets[corpusBucket(token)][token] ||= []).push(ordinal)));
  const manifest: ContextCorpusManifest = { schema: 'okf-context-corpus.v2', bundle: base.bundle, scope: base.scope, limitations: base.limitations,
    semantic_source_snapshot: base.bundle.snapshot, base_index: put('base.json.gz', base),
    counts: { documents: 1, pages: 1, nonempty_pages: 1, empty_pages: 0, tokenless_pages: 0 },
    records: { count, shards: [] }, search: { tokenisation: 'nfkd-lowercase-ascii-alphanumeric-min2-v1', bucket_algorithm: 'fnv1a32-high-byte-hex-v1',
      shards: Object.fromEntries(Object.entries(buckets).map(([bucket, postings]) => [bucket, put(`search/${bucket}.json.gz`, { schema: 'okf-context-postings.v1', postings })])) } };
  for (let first = 0; first < count; first += shardSize) {
    const group = records.slice(first, first + shardSize);
    manifest.records.shards.push({ ...put(`records/${first}.json.gz`, { schema: 'okf-context-records.v1', first_ordinal: first, records: group }),
      first_ordinal: first, count: group.length, first_id: group[0].id, last_id: group.at(-1)!.id });
  }
  const calls: string[] = [];
  const fetcher = (async (url: string | URL | Request) => { const name = new URL(String(url)).pathname.replace('/corpus/', ''); calls.push(name); return new Response(files.get(name) as BodyInit); }) as typeof fetch;
  const binding = { index_url: 'https://example.test/corpus/manifest.json', index_sha256: sha(new TextEncoder().encode(JSON.stringify(manifest))) };
  const updateBase = () => { manifest.base_index = put('base.json.gz', base); };
  return { base, root, records, manifest, files, calls, fetcher, binding, put, updateBase };
}

describe('logical-unit corpus v2', () => {
  it('separates physical pages from units and loads a declared qualification outside the lexical top 16', async () => {
    const f = await fixture(); const result = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle quartz', {}, f.fetcher);
    expect(result.retrieval!.corpus_pages).toBe(1); expect(result.retrieval!.corpus_records).toBe(20);
    expect(result.retrieval!.candidates).toHaveLength(16);
    expect(result.retrieval!.candidates.some(row => row.id === f.records[19].id)).toBe(false);
    expect(result.retrieval!.units!.referenced_records).toEqual([f.records[19].id]);
    const qualification = result.selected.find(row => row.record.id === f.records[19].id)!;
    expect(qualification.record.text).toBe('Only with a permit.');
    expect(qualification.paths.some(path => path.assertions.includes(f.base.assertions[1].id))).toBe(true);
    expect(result.requirements[0].missing).toEqual([]);
    expect(result.evidence_status).toBe('insufficient'); // Unresolved quartz and omitted lexical alternatives remain exposed.
  });
  it('retains exact corpus v1 census admission and does not add v2 counters to old packages', async () => {
    const f = await fixture(2); f.manifest.schema = 'okf-context-corpus.v1';
    expect(() => validateContextCorpusManifest(f.manifest)).toThrow('record inventory');
    f.manifest.counts.pages = 2; f.manifest.counts.nonempty_pages = 2;
    const result = await assembleCorpusContext(f.manifest, f.binding, 'quartz', {}, f.fetcher);
    expect(result.retrieval!.units).toBeUndefined();
    expect(f.calls).not.toContain('records/1.json.gz');
    expect(result.retrieval!.candidates[0].id).toBe(f.records[0].id);
  });
  it('loads supported directed references from a real concept even without any lexical match', async () => {
    const f = await fixture(2); const result = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle', {}, f.fetcher);
    expect(result.retrieval!.candidates).toEqual([]);
    expect(result.retrieval!.units!.referenced_records).toEqual(f.records.map(row => row.id));
    expect(result.requirements[0].missing).toEqual([]); expect(result.evidence_status).toBe('sufficient');
  });
  it('does not seed requirement endpoints or ambiguous aliases', async () => {
    const f = await fixture(2);
    f.base.records.push({ ...f.root, id: f.root.id + '-alternative', route: f.root.route + '-alternative' });
    const result = await (f.updateBase(), assembleCorpusContext(f.manifest, f.binding, 'Reading circle', {}, f.fetcher));
    expect(result.resolved_concepts).toEqual([]); expect(result.ambiguities).toHaveLength(1);
    expect(result.retrieval!.units!.referenced_records).toEqual([]);
    expect(f.calls.some(path => path.startsWith('records/'))).toBe(false);
    expect(result.evidence_status).toBe('insufficient');
  });
  it.each(['unsupported', 'reverse', 'restricted'])('does not load sources beyond a %s route', async variant => {
    const f = await fixture(2);
    if (variant === 'unsupported') f.base.assertions[0].predicate = 'https://example.test/unsupported';
    if (variant === 'reverse') [f.base.assertions[0].source, f.base.assertions[0].target] = [f.base.assertions[0].target, f.base.assertions[0].source];
    if (variant === 'restricted') f.root.access = 'restricted';
    f.base.requirements[0].required_paths = []; f.updateBase();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle', {}, f.fetcher);
    expect(result.retrieval!.units!.referenced_records).toEqual([]);
    expect(f.calls.some(path => path.startsWith('records/'))).toBe(false);
    expect(result.evidence_status).toBe('insufficient');
  });
  it('exposes missing destinations, depth limits and detached requirements separately', async () => {
    const f = await fixture(2); f.base.requirements[0].required.push('https://example.test/undeclared/record'); f.updateBase();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle', { max_depth: 1 }, f.fetcher);
    expect(result.retrieval!.units!.referenced_records).toEqual([f.records[0].id]);
    expect(result.retrieval!.omissions.some(row => row.code === 'referenced_depth_budget')).toBe(true);
    expect(result.requirements[0].missing).toContain('https://example.test/undeclared/record');
    f.base.assertions[0].target = 'https://example.test/unit/9999'; f.base.requirements[0].required_paths = []; f.updateBase();
    const absent = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle', {}, f.fetcher);
    expect(absent.retrieval!.omissions.some(row => row.code === 'referenced_record_missing' && row.ids[0].endsWith('/9999'))).toBe(true);
  });
  it.each(['range', 'order', 'metadata', 'unknown'])('rejects a rehashed invalid unit inventory: %s', async change => {
    const f = await fixture(2, 2);
    if (change === 'range') f.manifest.records.shards[0].last_id = 'https://example.test/unit/9999';
    if (change === 'order') f.records.reverse();
    if (change === 'metadata') delete f.records[1].evidence_unit;
    if (change === 'unknown') (f.records[1].evidence_unit as any).instructions = 'execute';
    const ref = f.manifest.records.shards[0]; Object.assign(ref, f.put(ref.path, { schema: 'okf-context-records.v1', first_ordinal: 0, records: f.records }));
    await expect(assembleCorpusContext(f.manifest, f.binding, 'quartz', {}, f.fetcher)).rejects.toThrow(/unit/);
  });
  it('rejects overlapping range declarations before any fetch', async () => {
    const f = await fixture(2); f.manifest.records.shards[1].first_id = f.records[0].id;
    await expect(assembleCorpusContext(f.manifest, f.binding, 'quartz', {}, f.fetcher)).rejects.toThrow('overlapping'); expect(f.calls).toEqual([]);
  });
  it('caps referenced-record loading independently of the lexical ranking and output budget', async () => {
    const f = await fixture(202, 20); const edge = f.base.assertions[0];
    f.base.assertions = f.records.map((row, i) => ({ ...edge, id: edge.id + '-' + String(i).padStart(4, '0'), target: row.id }));
    f.base.requirements[0].required_paths = []; f.updateBase();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle', { max_nodes: 200 }, f.fetcher);
    expect(result.retrieval!.units!.referenced_records).toHaveLength(UNIT_REFERENCE_LIMITS.referenced_records);
    expect(result.retrieval!.omissions.some(row => row.code === 'referenced_record_budget')).toBe(true);
    expect(result.budget.used_bytes).toBeLessThanOrEqual(result.budget.max_bytes);
    expect(result.evidence_status).toBe('insufficient');
  });
  it('caps examined relationships before they can generate unbounded follow-up reads', async () => {
    const f = await fixture(2); const edge = f.base.assertions[0];
    f.base.assertions = Array.from({ length: 2001 }, (_, i) => ({ ...edge, id: edge.id + '-' + String(i).padStart(4, '0') }));
    f.base.requirements[0].required_paths = []; f.updateBase();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle', {}, f.fetcher);
    expect(result.retrieval!.units!.examined_relationships).toBe(2000);
    expect(result.retrieval!.omissions.some(row => row.code === 'referenced_relationship_budget')).toBe(true);
    expect(result.retrieval!.units!.referenced_records).toHaveLength(1);
  });
  it('keeps request completion timing out of context identity', async () => {
    const f = await fixture(); const a = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle quartz', {}, f.fetcher);
    const delayed: typeof fetch = async (url, options) => { await new Promise(resolve => setTimeout(resolve, String(url).length % 3)); return f.fetcher(url, options); };
    expect(await assembleCorpusContext(f.manifest, f.binding, 'Reading circle quartz', {}, delayed)).toEqual(a);
  });
});
