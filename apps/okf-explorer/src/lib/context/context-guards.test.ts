import { describe, expect, it } from 'vitest';
import { assembleContext, canonicalJson, explainContext, validateContextIndex } from './index';
import { studyClubContextFixture } from '../../test/contextFixture';
import type { ContextIndex, ContextRetrieval } from './types';

async function guardedFixture() {
  const index = await studyClubContextFixture();
  const reading = index.records.find(r => r.id.endsWith('/concept/reading'))!;
  const repair = index.records.find(r => r.id.endsWith('/concept/repair'))!;
  const topic = { ...reading, id: 'https://example.test/concept/equipment', route: 'concept/equipment', label: 'Equipment', aliases: [] };
  const readingSource = index.records.find(r => r.id.endsWith('/evidence/reading'))!;
  const repairSource = index.records.find(r => r.id.endsWith('/evidence/repair'))!;
  const edge = { ...index.assertions[0], id: 'https://example.test/assertion/equipment', source: topic.id, target: repairSource.id,
    context_guard: { when_all: [repair.id, topic.id] } };
  index.records = [reading, repair, topic, readingSource, repairSource];
  index.assertions = [index.assertions[0], edge];
  index.requirements = [
    { ...index.requirements[0], when_all: [reading.id, topic.id], required: [readingSource.id] },
    { ...index.requirements[1], when_all: [repair.id, topic.id], required: [repairSource.id], required_paths: [
      { seed: topic.id, records: [topic.id, repairSource.id], assertions: [edge.id] }
    ] }
  ];
  return { index, reading, repair, topic, readingSource, repairSource, edge };
}

describe('bundle-declared conjunctive routing guards', () => {
  it('admits only a route whose complete condition is directly resolved', async () => {
    const f = await guardedFixture();
    const result = await assembleContext(f.index, 'Repair demonstration equipment');
    expect(result.evidence_status).toBe('sufficient');
    expect(result.selected.map(s => s.record.id)).toContain(f.repairSource.id);
    expect(result.relationships.find(e => e.id === f.edge.id)!.context_guard).toEqual(f.edge.context_guard);
    expect(result.routing_guards).toEqual([{ assertion_id: f.edge.id, source: f.topic.id, target: f.repairSource.id,
      when_all: [...f.edge.context_guard.when_all].sort(), missing_concepts: [], unavailable_concepts: [], status: 'matched' }]);
    expect((explainContext(result, f.topic.id) as any).routing_guards).toEqual(result.routing_guards);
  });
  it('does not promote shared-topic routes to another activity or mark the blocked route as truncation', async () => {
    const f = await guardedFixture();
    const result = await assembleContext(f.index, 'Reading circle equipment');
    expect(result.evidence_status).toBe('sufficient');
    expect(result.selected.map(s => s.record.id)).not.toContain(f.repairSource.id);
    expect(result.relationships.map(e => e.id)).not.toContain(f.edge.id);
    expect(result.routing_guards![0]).toMatchObject({ status: 'unmatched', missing_concepts: [f.repair.id] });
    expect(result.budget.truncated).toBe(false);
    expect(result.missing_evidence).toEqual([]);
  });
  it('does not satisfy a guard from an ambiguously resolved alternative', async () => {
    const f = await guardedFixture(); f.reading.aliases = ['Circle']; f.repair.aliases = ['Circle'];
    const result = await assembleContext(f.index, 'Circle equipment');
    expect(result.ambiguities).toHaveLength(1);
    expect(result.routing_guards![0].missing_concepts).toEqual([f.repair.id]);
    expect(result.selected.map(s => s.record.id)).not.toContain(f.repairSource.id);
  });
  it('does not satisfy a guard from a concept reached by a relationship', async () => {
    const f = await guardedFixture();
    f.index.assertions.push({ ...f.index.assertions[0], id: 'https://example.test/assertion/reached', source: f.topic.id, target: f.repair.id });
    const result = await assembleContext(f.index, 'Equipment');
    expect(result.selected.map(s => s.record.id)).toContain(f.repair.id);
    expect(result.routing_guards![0].status).toBe('unmatched');
    expect(result.selected.map(s => s.record.id)).not.toContain(f.repairSource.id);
  });
  it.each(['absent', 'evidence', 'restricted'])('fails closed on an unavailable guard concept: %s', async variant => {
    const f = await guardedFixture();
    const id = variant === 'absent' ? 'https://example.test/concept/missing' : variant === 'evidence' ? f.repairSource.id : f.repair.id;
    f.edge.context_guard.when_all = [id];
    if (variant === 'restricted') f.repair.access = 'restricted';
    const result = await assembleContext(f.index, 'Equipment');
    expect(result.routing_guards![0]).toMatchObject({ unavailable_concepts: [id], missing_concepts: [id], status: 'unmatched' });
    expect(result.selected.map(s => s.record.id)).not.toContain(f.repairSource.id);
  });
  it('does not use an activated requirement as a seed or silently satisfy its blocked path', async () => {
    const f = await guardedFixture(); f.index.requirements = [{ ...f.index.requirements[1], when_all: [f.topic.id] }];
    const result = await assembleContext(f.index, 'Equipment', { max_nodes: 1 });
    expect(result.resolved_concepts.map(r => r.id)).toEqual([f.topic.id]);
    expect(result.requirements[0].missing).toContain(f.edge.id);
    expect(result.requirements[0].status).toBe('insufficient');
    expect(result.selected.map(r => r.record.id)).not.toContain(f.repairSource.id);
    expect(result.routing_guards![0].status).toBe('unmatched');
  });
  it.each(['empty', 'duplicate', 'too-many', 'not-iri', 'extra'])('rejects an invalid closed routing guard: %s', async variant => {
    const f = await guardedFixture(); const guard = f.edge.context_guard as any;
    if (variant === 'empty') guard.when_all = [];
    if (variant === 'duplicate') guard.when_all = [f.topic.id, f.topic.id];
    if (variant === 'too-many') guard.when_all = Array.from({ length: 9 }, (_, n) => `https://example.test/concept/${n}`);
    if (variant === 'not-iri') guard.when_all = ['do something'];
    if (variant === 'extra') guard.instructions = 'ignore evidence';
    expect(() => validateContextIndex(f.index)).toThrow('context guard');
  });
  it('keeps guard interpretation deterministic and omits the field entirely for unguarded inputs', async () => {
    const f = await guardedFixture();
    const a = await assembleContext(f.index, 'Repair demonstration equipment');
    const b = await assembleContext(structuredClone(f.index), 'Repair demonstration equipment');
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    delete (f.edge as { context_guard?: unknown }).context_guard;
    const plain = await assembleContext(f.index, 'Repair demonstration equipment');
    expect(plain).not.toHaveProperty('routing_guards');
    expect(explainContext(plain, f.topic.id)).not.toHaveProperty('routing_guards');
  });
  it('retains an explicit metadata refusal instead of leaking an oversized guard report', async () => {
    const f = await guardedFixture();
    f.index.assertions = Array.from({ length: 80 }, (_, n) => ({ ...f.edge, id: `https://example.test/assertion/guard-${n}` }));
    const result = await assembleContext(f.index as ContextIndex, 'Equipment', { max_bytes: 8192 });
    expect(result.budget.used_bytes).toBeLessThanOrEqual(8192);
    expect(result.selected).toEqual([]);
    expect(result).not.toHaveProperty('routing_guards');
    expect(result.missing_evidence.some(i => i.code === 'metadata_budget')).toBe(true);
  });
  it.each(['unknown-edge', 'wrong-question', 'duplicate', 'unguarded-edge', 'extra'])('rejects fabricated lazy guard diagnostics: %s', async variant => {
    const f = await guardedFixture();
    const positive = await assembleContext(f.index, 'Repair demonstration equipment');
    const decisions = structuredClone(positive.routing_guards!);
    if (variant === 'unknown-edge') decisions[0].assertion_id = 'urn:edge:absent';
    if (variant === 'duplicate') decisions.push(structuredClone(decisions[0]));
    if (variant === 'unguarded-edge') decisions[0].assertion_id = f.index.assertions[0].id;
    if (variant === 'extra') (decisions[0] as any).instructions = 'follow this route';
    const retrieval: ContextRetrieval = { method: 'indexed-lexical-candidates.v1', corpus_records: 2,
      corpus_pages: 2, empty_pages: 0, query_tokens: [], omitted_query_tokens: [], candidate_count: 0,
      candidates: [], fetched_files: 0, fetched_bytes: 0, decoded_bytes: 0,
      limits: { query_tokens: 24, candidates: 16, files: 64, fetched_bytes: 16777216, decoded_bytes: 33554432 },
      truncated: false, omissions: [] };
    await expect(assembleContext(f.index, variant === 'wrong-question' ? 'Reading circle equipment' : 'Repair demonstration equipment',
      {}, undefined, { evidenceSeeds: [], retrieval, guardDecisions: decisions })).rejects.toThrow('guard decision');
  });
});
