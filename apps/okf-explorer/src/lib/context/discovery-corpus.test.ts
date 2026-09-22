import { describe, expect, it } from 'vitest';
// @ts-ignore -- Node-only compression control; runtime uses bounded Web Streams.
import { gzipSync } from 'node:zlib';
import { assembleCorpusContext, corpusBucket, validateContextCorpusManifest } from './corpus';
import { bm25Contribution, discoveryTokens, readDiscoveryCard, readDiscoveryIncident, type DiscoveryCardReference, type DiscoveryIncidentReference } from './corpusV3';
import { canonicalJson, contextSha256 } from './index';
import { contextManifest, readContextEvidence } from './delivery';
import { discoveryFixture } from '../../test/discoveryFixture';
import retainedV2 from '../../test/fixtures/context-corpus-v2-ea485af6.json';

describe('source-bound discovery corpus v3', () => {
  it('replays every byte of the retained approved v2 context including spans and dependencies', async () => {
    const manifest = validateContextCorpusManifest(retainedV2.manifest);
    const fetcher: typeof fetch = async url => {
      const path = new URL(String(url)).pathname.slice('/corpus/'.length);
      const bytes = retainedV2.files[path as keyof typeof retainedV2.files];
      if (!bytes) throw new Error('Unexpected replay input: ' + path);
      return new Response(Uint8Array.from(bytes));
    };
    expect(await assembleCorpusContext(manifest, retainedV2.binding, retainedV2.question, {}, fetcher)).toEqual(retainedV2.expected);
  });
  it('retrieves exact cross-page evidence through a discovery alias without inventing a concept', async () => {
    const f = await discoveryFixture();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'Fruit gathering', {}, f.fetcher);
    expect(result.resolved_concepts).toEqual([]); expect(result.evidence_status).toBe('insufficient');
    expect(result.selected.map(x => x.record.id)).toEqual([f.records[0].id, f.records.at(-1)!.id]);
    expect(result.selected[0].record.evidence_unit!.spans).toHaveLength(2);
    expect(result.selected.some(x => x.record.id === f.cards[0].id)).toBe(false);
    expect(result.retrieval!.discovery!.candidates[0]).toMatchObject({ source_score: 0, matched_source: [], matched_discovery: ['fruit', 'gathering'] });
    const incident = result.retrieval!.discovery!.adjacency.find(x => x.id === f.records[0].id)! as DiscoveryIncidentReference;
    expect((await readDiscoveryIncident(f.manifest, f.binding, incident, f.fetcher)).incoming.map(e => e.id)).toEqual([f.assertions[0].id]);
    expect(result.relationships.map(x => x.id)).toEqual([f.assertions[1].id]);
    expect(result.missing_evidence.some(x => x.code === 'no_evidence_requirements')).toBe(true);
  });
  it('also respects an opt-in guard during v2 lazy loading without changing retained unguarded replay', async () => {
    const f = structuredClone(retainedV2);
    const basePath = f.manifest.base_index.path;
    const base = JSON.parse(new TextDecoder().decode(Uint8Array.from(f.files[basePath as keyof typeof f.files])));
    const concept = base.records[0]; concept.label = 'Fabricated topic'; concept.aliases = [];
    const approval = { ...concept, id: 'https://example.test/concept/approval', route: 'concept/approval', label: 'Approval' };
    base.records.push(approval); base.assertions[0].context_guard = { when_all: [concept.id, approval.id] };
    const text = canonicalJson(base), bytes = new TextEncoder().encode(text);
    (f.files as Record<string, number[]>)[basePath] = [...bytes];
    Object.assign(f.manifest.base_index, { bytes: bytes.length, sha256: await contextSha256(text) });
    // The retained replay stores only its original request's posting shards.
    // This separate guard fixture explicitly supplies the other empty buckets.
    const empty = canonicalJson({ schema: 'okf-context-postings.v1', postings: {} });
    for (const ref of Object.values(f.manifest.search.shards)) {
      if ((f.files as Record<string, number[]>)[ref.path]) continue;
      const encoded = new TextEncoder().encode(empty);
      (f.files as Record<string, number[]>)[ref.path] = [...encoded];
      Object.assign(ref, { bytes: encoded.length, sha256: await contextSha256(empty) });
    }
    const calls: string[] = [];
    const fetcher: typeof fetch = async url => {
      const path = new URL(String(url)).pathname.slice('/corpus/'.length); calls.push(path);
      return new Response(Uint8Array.from(f.files[path as keyof typeof f.files]));
    };
    const blocked = await assembleCorpusContext(validateContextCorpusManifest(f.manifest), f.binding, 'Fabricated topic', {}, fetcher);
    expect(calls.some(path => path.startsWith('records/'))).toBe(false);
    expect(blocked.routing_guards![0]).toMatchObject({ status: 'unmatched', missing_concepts: [approval.id] });
    const admitted = await assembleCorpusContext(validateContextCorpusManifest(f.manifest), f.binding, 'Fabricated topic approval', {}, fetcher);
    expect(admitted.routing_guards![0].status).toBe('matched');
    expect(admitted.selected.filter(row => row.record.kind === 'evidence')).toHaveLength(2);
  });
  it('resolves only actual concept aliases and loads complete declared paths without lexical evidence', async () => {
    const f = await discoveryFixture();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle', {}, f.fetcher);
    expect(result.resolved_concepts.map(x => x.id)).toEqual([f.concept.id]);
    expect(result.retrieval!.candidates).toEqual([]);
    expect(result.requirements[0].status).toBe('supported-within-declared-scope');
    expect(result.evidence_status).toBe('sufficient');
    expect(result.selected.at(-1)!.paths[0].assertions).toEqual(f.assertions.map(e => e.id));
  });
  it('reconstructs discovery diagnostics and complete source spans through bounded existing delivery', async () => {
    const f = await discoveryFixture(); const result = await assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher);
    const before = canonicalJson(result); const manifest = await contextManifest(result, { max_bytes: 8192 });
    expect(manifest.context_id).toBe(result.context_id);
    let offset = 0, text = '';
    do {
      const part = await readContextEvidence(result, { context_id: result.context_id, section: 'package', offset, max_bytes: 8192 });
      expect(new TextEncoder().encode(JSON.stringify(part)).length).toBeLessThanOrEqual(8192);
      text += part.data; offset = part.next_offset ?? 0;
    } while (offset);
    expect(JSON.parse(text)).toEqual(result); expect(canonicalJson(result)).toBe(before);
  });
  it('loads a required unit outside the lexical top 16 without reversing incoming edges', async () => {
    const f = await discoveryFixture(20, 20);
    const result = await assembleCorpusContext(f.manifest, f.binding, 'quartz', {}, f.fetcher);
    expect(result.retrieval!.candidates).toHaveLength(16);
    expect(result.retrieval!.units!.referenced_records).toContain(f.records[19].id);
    expect(result.selected.map(x => x.record.id)).not.toContain(f.concept.id);
    expect(result.retrieval!.truncated).toBe(true);
  });
  it('keeps source and authored discovery matches and scores separate and stable', async () => {
    const f = await discoveryFixture();
    const a = await assembleCorpusContext(f.manifest, f.binding, 'quartz orchard', {}, f.fetcher);
    const delayed: typeof fetch = async (url, options) => { await new Promise(resolve => setTimeout(resolve, String(url).length % 3)); return f.fetcher(url, options); };
    expect(await assembleCorpusContext(f.manifest, f.binding, 'quartz orchard', {}, delayed)).toEqual(a);
    expect(a.retrieval!.discovery!.candidates[0]).toMatchObject({ matched_source: ['quartz'], matched_discovery: ['orchard'] });
    expect(a.retrieval!.candidates[0].score).toBe(a.retrieval!.discovery!.candidates[0].source_score + a.retrieval!.discovery!.candidates[0].discovery_score);
    expect(discoveryTokens('Café café x ESA(IR)')).toEqual(['cafe', 'cafe', 'esa', 'ir']);
    expect(bm25Contribution(10, 2, 1, 20, 200)).toBe(1481605);
    expect(bm25Contribution(10, 2, 2, 20, 200)).toBeLessThan(2 * bm25Contribution(10, 2, 1, 20, 200));
    expect(bm25Contribution(10, 2, 1, 100, 200)).toBeLessThan(bm25Contribution(10, 2, 1, 20, 200));
  });
  it('uses the same conjunctive guard for lazy admission and assembly without hydrating an unmatched destination', async () => {
    const f = await discoveryFixture(3, 1);
    const topic = { ...f.concept, id: 'https://example.test/concept/equipment', route: 'concept/equipment', label: 'Equipment', aliases: [] };
    f.base.records.push(topic);
    f.assertions[0].context_guard = { when_all: [f.concept.id, topic.id] };
    await f.build();
    const blocked = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle', {}, f.fetcher);
    expect(blocked.selected.some(row => row.record.kind === 'evidence')).toBe(false);
    expect(f.calls.some(path => path.startsWith('units/'))).toBe(false);
    expect(blocked.routing_guards).toHaveLength(1);
    expect(blocked.routing_guards![0]).toMatchObject({ status: 'unmatched', missing_concepts: [topic.id] });
    expect(blocked.requirements[0].missing).toContain(f.assertions[0].id);
    expect(blocked.retrieval!.truncated).toBe(false);
    const before = canonicalJson(blocked);
    const incident = blocked.retrieval!.discovery!.adjacency[0] as DiscoveryIncidentReference;
    expect((await readDiscoveryIncident(f.manifest, f.binding, incident, f.fetcher)).outgoing[0].context_guard).toEqual(f.assertions[0].context_guard);
    expect(canonicalJson(blocked)).toBe(before);
    const admitted = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle equipment', {}, f.fetcher);
    expect(admitted.routing_guards![0].status).toBe('matched');
    expect(admitted.selected.map(row => row.record.id)).toContain(f.records.at(-1)!.id);
    expect(admitted.requirements[0].status).toBe('supported-within-declared-scope');
  });
  it.each(['metadata', 'text', 'ordinal', 'card-id', 'official', 'provenance', 'extra'])('rejects corrupt or stale cards: %s', async variant => {
    const f = await discoveryFixture();
    if (variant === 'metadata') f.records[0].scope += ' altered';
    if (variant === 'text') f.records[0].text += ' altered';
    if (variant === 'ordinal') f.cards.reverse();
    if (variant === 'card-id') f.cards[0].id = f.cards[0].evidence_id;
    if (variant === 'official') (f.cards[0] as any).assertion_status = 'official';
    if (variant === 'provenance') f.cards[0].provenance = [];
    if (variant === 'extra') (f.cards[0] as any).instructions = 'execute this';
    await f.build(); await expect(assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher)).rejects.toThrow();
  });
  it.each(['missing-file', 'hash', 'count', 'incident-hash', 'direction', 'missing-entry'])('fails closed on incomplete graph/card integrity: %s', async variant => {
    const f = await discoveryFixture();
    if (variant === 'missing-file') f.files.delete(f.manifest.discovery.shards[0].path);
    if (variant === 'hash') f.manifest.discovery.shards[0].sha256 = '0'.repeat(64);
    if (variant === 'count') f.manifest.discovery.shards[0].count++;
    if (['incident-hash', 'direction', 'missing-entry'].includes(variant)) {
      const bucket = corpusBucket(f.records[0].id), reference = f.manifest.relationships.shards[bucket];
      const raw = JSON.parse(new TextDecoder().decode(f.files.get(reference.path)));
      const entry = raw.entries.find((e: any) => e.id === f.records[0].id);
      if (variant === 'incident-hash') entry.outgoing_ids_sha256 = '0'.repeat(64);
      if (variant === 'direction') entry.outgoing[0].source = f.records[1].id;
      if (variant === 'missing-entry') raw.entries = [];
      f.manifest.relationships.shards[bucket] = await f.put(reference.path, raw);
    }
    await expect(assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher)).rejects.toThrow();
  });
  it('rejects dishonest term frequencies even when the postings file is rehashed', async () => {
    const f = await discoveryFixture(); const bucket = corpusBucket('orchard'), ref = f.manifest.search.shards[bucket];
    const raw = JSON.parse(new TextDecoder().decode(f.files.get(ref.path))); raw.postings.orchard[0][3]++;
    f.manifest.search.shards[bucket] = await f.put(ref.path, raw);
    await expect(assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher)).rejects.toThrow('postings differ');
  });
  it('verifies compressed cards and rejects expansion beyond the declared decoded bound', async () => {
    const f = await discoveryFixture(); const ref = f.manifest.discovery.shards[0];
    const decoded = f.files.get(ref.path)!; const compressed = gzipSync(decoded);
    const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', compressed)), n => n.toString(16).padStart(2, '0')).join('');
    Object.assign(ref, { bytes: compressed.length, sha256: sha, encoding: 'gzip', decoded_bytes: decoded.length, decoded_sha256: await contextSha256(new TextDecoder().decode(decoded)) });
    f.files.set(ref.path, compressed);
    const result = await assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher);
    expect(result.selected[0].record).toEqual(f.records[0]);
    const card = result.retrieval!.discovery!.candidates[0].card as DiscoveryCardReference;
    expect(await readDiscoveryCard(f.manifest, f.binding, card, f.fetcher)).toEqual(f.cards[0]);
    ref.decoded_bytes = 100;
    await expect(assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher)).rejects.toThrow('exceeds its binding');
  });
  it('keeps complete cards lazy so previews cannot crowd all exact evidence out of a small package', async () => {
    const f = await discoveryFixture(16, 16);
    for (const card of f.cards) { card.summary = 'Long navigation preview '.repeat(75); card.scope = 'Unreviewed navigation scope. '.repeat(75); }
    await f.build();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'quartz', { max_bytes: 32768 }, f.fetcher);
    expect(result.selected.some(s => s.record.kind === 'evidence')).toBe(true);
    expect(new TextEncoder().encode(canonicalJson(result)).length).toBeLessThanOrEqual(32768);
    const before = canonicalJson(result);
    for (const candidate of result.retrieval!.discovery!.candidates) {
      const reference = candidate.card as DiscoveryCardReference;
      expect(reference.schema).toBe('okf-discovery-card-reference.v1'); expect(reference).not.toHaveProperty('summary');
      const full = await readDiscoveryCard(f.manifest, f.binding, reference, f.fetcher);
      expect(full).toEqual(f.cards[reference.ordinal]);
    }
    expect(canonicalJson(result)).toBe(before);
  });
  it.each(['digest', 'ordinal', 'card-id', 'evidence-id'])('rejects stale lazy card references: %s', async variant => {
    const f = await discoveryFixture();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher);
    const reference = structuredClone(result.retrieval!.discovery!.candidates[0].card) as DiscoveryCardReference;
    if (variant === 'digest') reference.card_sha256 = '0'.repeat(64);
    if (variant === 'ordinal') reference.ordinal++;
    if (variant === 'card-id') reference.id += '-wrong';
    if (variant === 'evidence-id') reference.evidence_id += '-wrong';
    await expect(readDiscoveryCard(f.manifest, f.binding, reference, f.fetcher)).rejects.toThrow();
  });
  it('reconstructs every incident ID, scope and provenance from compact diagnostics without changing context', async () => {
    const f = await discoveryFixture(); const result = await assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher);
    const before = canonicalJson(result);
    for (const item of result.retrieval!.discovery!.adjacency) {
      const reference = item as DiscoveryIncidentReference;
      const full = await readDiscoveryIncident(f.manifest, f.binding, reference, f.fetcher);
      expect(full.outgoing).toEqual(f.assertions.filter(e => e.source === item.id));
      expect(full.incoming).toEqual(f.assertions.filter(e => e.target === item.id));
      await expect(readDiscoveryIncident(f.manifest, f.binding, { ...reference, incident_sha256: '0'.repeat(64) }, f.fetcher)).rejects.toThrow();
      await expect(readDiscoveryIncident(f.manifest, f.binding, { ...reference, outgoing_count: reference.outgoing_count + 1 }, f.fetcher)).rejects.toThrow();
    }
    expect(canonicalJson(result)).toBe(before);
  });
  it('admits declared concept paths before dispersed lexical candidates spend the same file limit', async () => {
    const f = await discoveryFixture(70, 1);
    f.assertions[0].target = f.records[68].id;
    f.assertions[1].source = f.records[68].id;
    f.base.requirements[0].required = [f.records[68].id, f.records[69].id];
    f.base.requirements[0].required_paths![0].records = [f.concept.id, f.records[68].id, f.records[69].id];
    await f.build();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle quartz', { max_bytes: 524288 }, f.fetcher);
    expect(result.requirements[0].status).toBe('supported-within-declared-scope');
    expect(result.retrieval!.fetched_files).toBeLessThanOrEqual(64);
    expect(result.retrieval!.discovery!.admission_order).toBe('resolved-concept-paths-before-lexical-candidates.v1');
    expect(f.calls.indexOf('units/68.json')).toBeLessThan(f.calls.indexOf('units/0.json'));
    expect(result.selected.find(s => s.record.id === f.records[69].id)!.paths[0].assertions).toEqual(f.assertions.map(e => e.id));
  });
  it('exposes missing destinations and required dependencies at requested depth', async () => {
    const f = await discoveryFixture();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'orchard', { max_depth: 0 }, f.fetcher);
    expect(result.retrieval!.omissions.some(x => x.code === 'referenced_depth_budget')).toBe(true);
    expect(result.missing_evidence.find(x => x.code === 'missing_dependency')!.ids).toEqual([f.records[0].id, f.records.at(-1)!.id]);
    f.assertions[1].target = 'https://example.test/unit/missing'; await f.build();
    const absent = await assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher);
    expect(absent.retrieval!.omissions.some(x => x.code === 'referenced_record_missing')).toBe(true);
    expect(absent.evidence_status).toBe('insufficient');
  });
  it('revisits a depth-limited concept destination when it is also a shallower lexical seed', async () => {
    const f = await discoveryFixture();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'Reading circle orchard', { max_depth: 1 }, f.fetcher);
    // The concept reaches A at depth 1. The later lexical A seed reaches B at
    // depth 1, without charging either A's edge or its diagnostics twice.
    expect(result.retrieval!.candidates.map(x => x.id)).toEqual([f.records[0].id]);
    expect(result.selected.map(x => x.record.id)).toContain(f.records.at(-1)!.id);
    expect(result.retrieval!.units!.referenced_records).toContain(f.records.at(-1)!.id);
    expect(result.retrieval!.units!.examined_relationships).toBe(2);
    const inspected = result.retrieval!.discovery!.adjacency.map(x => x.id);
    expect(new Set(inspected).size).toBe(inspected.length);
    expect(result.relationships.map(x => x.id).sort()).toEqual(f.assertions.map(x => x.id).sort());
  });
  it('does not expose a restricted card or its source text', async () => {
    const f = await discoveryFixture(); f.records[0].access = f.cards[0].access = 'restricted';
    f.cards[0].evidence_sha256 = await contextSha256(canonicalJson(f.records[0])); await f.build();
    const result = await assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher);
    expect(result.selected).toEqual([]); expect(result.retrieval!.discovery!.candidates).toEqual([]);
    expect(result.retrieval!.omissions.some(x => x.code === 'restricted_record')).toBe(true);
  });
  it('retains explicit unknown dependencies when separate shard loading hits the resource ceiling', async () => {
    const f = await discoveryFixture(40, 1); const edge = f.assertions[1];
    f.assertions.splice(1, 1, ...f.records.slice(1).map((row, i) => ({ ...edge, id: edge.id + '-' + String(i).padStart(4, '0'), target: row.id })));
    await f.build(); const result = await assembleCorpusContext(f.manifest, f.binding, 'orchard', { max_nodes: 100 }, f.fetcher);
    expect(result.retrieval!.fetched_files).toBeLessThanOrEqual(64);
    expect(result.retrieval!.omissions.some(x => x.code === 'retrieval_resource_budget')).toBe(true);
    expect(result.missing_evidence.some(x => x.code === 'missing_dependency')).toBe(true);
    expect(result.evidence_status).toBe('insufficient');
  });
  it('rejects one-sided incident inventories even if both commitments were rehashed', async () => {
    const f = await discoveryFixture(); const id = f.records.at(-1)!.id, bucket = corpusBucket(id), ref = f.manifest.relationships.shards[bucket];
    const value = JSON.parse(new TextDecoder().decode(f.files.get(ref.path)));
    const entry = value.entries.find((e: any) => e.id === id); entry.incoming = []; entry.incoming_count = 0; entry.incoming_ids_sha256 = await contextSha256('[]');
    f.manifest.relationships.shards[bucket] = await f.put(ref.path, value);
    await expect(assembleCorpusContext(f.manifest, f.binding, 'orchard', {}, f.fetcher)).rejects.toThrow('incoming adjacency omits');
  });
  it('fails closed within the output bound even when card diagnostics exceed a small budget', async () => {
    const f = await discoveryFixture(20, 20);
    for (const c of f.cards) c.summary = 'orchard '.repeat(240);
    await f.build(); const result = await assembleCorpusContext(f.manifest, f.binding, 'orchard', { max_bytes: 8192 }, f.fetcher);
    expect(result.budget.used_bytes).toBeLessThanOrEqual(8192); expect(result.selected).toEqual([]);
    expect(result.missing_evidence.some(x => x.code === 'metadata_budget')).toBe(true);
  });
  it.each(['parameters', 'path', 'duplicate-path', 'unbound-graph', 'inert-extra'])('rejects undeclared manifest contracts before fetching: %s', async variant => {
    const f = await discoveryFixture();
    if (variant === 'parameters') (f.manifest.search.ranking as any).k1 = 2;
    if (variant === 'path') f.manifest.discovery.shards[0].path = '../escape.json';
    if (variant === 'duplicate-path') f.manifest.discovery.shards[0].path = f.manifest.base_index.path;
    if (variant === 'unbound-graph') delete (f.manifest as any).relationships;
    if (variant === 'inert-extra') (f.manifest as any).commands = ['execute'];
    expect(() => validateContextCorpusManifest(f.manifest)).toThrow(); expect(f.calls).toEqual([]);
  });
});
