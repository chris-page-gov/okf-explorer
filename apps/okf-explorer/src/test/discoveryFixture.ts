import { canonicalJson, contextSha256 } from '../lib/context/index';
import { corpusBucket } from '../lib/context/corpus';
import { DISCOVERY_RANKING, discoveryText, discoveryTokens, type DiscoveryCard, type DiscoveryCorpusManifest } from '../lib/context/corpusV3';
import type { ContextAssertion } from '../lib/context/types';
import { studyClubContextFixture } from './contextFixture';
import { unitFixture } from './unitFixture';

/** Uncompressed synthetic resources keep integrity tests portable across zlib versions. */
export async function discoveryFixture(count = 3, shardSize = 10) {
  const base = await studyClubContextFixture(); const concept = base.records.find(r => r.kind === 'concept')!;
  const records = await Promise.all(Array.from({ length: count }, (_, n) => unitFixture(
    n === count - 1 ? ['Only with written permission.'] : ['Quartz collection.', 'The specimen must remain labelled.'], `https://example.test/unit/${String(n).padStart(4, '0')}`)));
  const cards: DiscoveryCard[] = await Promise.all(records.map(async (record, i) => ({
    id: `https://example.test/discovery/${String(i).padStart(4, '0')}`, evidence_id: record.id,
    evidence_sha256: await contextSha256(canonicalJson(record)), label: i === 0 ? 'Orchard collection' : 'Mineral observation',
    heading_path: ['Fictional teaching manual', 'Collecting specimens'], summary: i === 0 ? 'A source-linked discovery summary for harvesting.' : '',
    search_aliases: i === 0 ? ['Fruit gathering'] : [], assertion_status: 'model-derived', authority: record.authority,
    scope: 'Synthetic source-linked discovery; not evidence or an official classification.',
    provenance: record.provenance.map(({ literal_sha256: _, ...p }) => p), rights: record.rights, access: record.access
  })));
  const edge = base.assertions[0];
  const assertions: ContextAssertion[] = [{ ...edge, source: concept.id, target: records[0].id },
    { ...edge, id: edge.id + '-qualification', source: records[0].id, target: records.at(-1)!.id }];
  base.records = [concept]; base.assertions = [];
  base.requirements = [{ ...base.requirements[0], required: [records[0].id, records.at(-1)!.id], required_paths: [
    { seed: concept.id, assertions: assertions.map(e => e.id), records: [concept.id, records[0].id, records.at(-1)!.id] }
  ] }];
  const files = new Map<string, Uint8Array>();
  const put = async (path: string, value: unknown) => { const text = canonicalJson(value); const bytes = new TextEncoder().encode(text); files.set(path, bytes); return { path, bytes: bytes.length, sha256: await contextSha256(text) }; };
  const manifest: DiscoveryCorpusManifest = { schema: 'okf-context-corpus.v3', bundle: base.bundle, scope: base.scope, limitations: base.limitations,
    semantic_source_snapshot: base.bundle.snapshot, base_index: await put('base.json', base), counts: { documents: 1, pages: 2, nonempty_pages: 2, empty_pages: 0, tokenless_pages: 0 },
    records: { count, shards: [] }, discovery: { count, shards: [] },
    search: { tokenisation: 'nfkd-lowercase-ascii-alphanumeric-min2-v1', bucket_algorithm: 'fnv1a32-high-byte-hex-v1', ranking: structuredClone(DISCOVERY_RANKING), total_tokens: { source: 0, discovery: 0 }, shards: {} },
    relationships: { schema: 'okf-context-adjacency.v1', bucket_algorithm: 'fnv1a32-high-byte-hex-v1', shards: {} } };
  const build = async () => {
    files.clear(); manifest.base_index = await put('base.json', base); manifest.records.shards = []; manifest.discovery.shards = [];
    for (let start = 0; start < count; start += shardSize) {
      const rows = records.slice(start, start + shardSize), selected = cards.slice(start, start + shardSize);
      manifest.records.shards.push({ ...await put(`units/${start}.json`, { schema: 'okf-context-records.v1', first_ordinal: start, records: rows }), first_ordinal: start, count: rows.length, first_id: rows[0].id, last_id: rows.at(-1)!.id });
      manifest.discovery.shards.push({ ...await put(`cards/${start}.json`, { schema: 'okf-discovery-cards.v1', first_ordinal: start, cards: selected }), first_ordinal: start, count: selected.length });
    }
    const postings: Record<string, Record<string, number[][]>> = {}, adjacency: Record<string, any[]> = {};
    for (let i = 0; i < 256; i++) { const bucket = i.toString(16).padStart(2, '0'); postings[bucket] = {}; adjacency[bucket] = []; }
    manifest.search.total_tokens = { source: 0, discovery: 0 };
    records.forEach((record, ordinal) => {
      const source = discoveryTokens(record.text), discovery = discoveryTokens(discoveryText(cards[ordinal]));
      manifest.search.total_tokens.source += source.length; manifest.search.total_tokens.discovery += discovery.length;
      for (const token of new Set([...source, ...discovery])) (postings[corpusBucket(token)][token] ||= []).push([
        ordinal, source.filter(t => t === token).length, source.length, discovery.filter(t => t === token).length, discovery.length
      ]);
    });
    for (const record of [...base.records, ...records].sort((a, b) => a.id < b.id ? -1 : 1)) {
      const outgoing = assertions.filter(e => e.source === record.id).sort((a, b) => a.id < b.id ? -1 : 1);
      const incoming = assertions.filter(e => e.target === record.id).sort((a, b) => a.id < b.id ? -1 : 1);
      adjacency[corpusBucket(record.id)].push({ id: record.id, outgoing, incoming, outgoing_count: outgoing.length, incoming_count: incoming.length,
        outgoing_ids_sha256: await contextSha256(canonicalJson(outgoing.map(e => e.id))), incoming_ids_sha256: await contextSha256(canonicalJson(incoming.map(e => e.id))) });
    }
    for (const bucket of Object.keys(postings)) {
      manifest.search.shards[bucket] = await put(`search/${bucket}.json`, { schema: 'okf-context-postings.v2', postings: postings[bucket] });
      manifest.relationships.shards[bucket] = await put(`adjacency/${bucket}.json`, { schema: 'okf-context-adjacency-bucket.v1', entries: adjacency[bucket] });
    }
  };
  await build(); const calls: string[] = [];
  const binding = { index_url: 'https://example.test/corpus/manifest.json', index_sha256: 'a'.repeat(64) };
  const fetcher: typeof fetch = async (url, options) => {
    if (options?.redirect !== 'error' || options?.credentials !== 'omit') throw new Error('Unsafe fetch options');
    const path = new URL(String(url)).pathname.slice('/corpus/'.length); calls.push(path);
    return new Response(files.get(path) as BodyInit | undefined, { status: files.has(path) ? 200 : 404 });
  };
  return { base, concept, records, cards, assertions, manifest, files, calls, binding, fetcher, put, build };
}
