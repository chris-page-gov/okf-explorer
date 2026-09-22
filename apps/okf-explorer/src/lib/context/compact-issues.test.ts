import { describe, expect, it } from 'vitest';
import { assembleContext, canonicalJson } from './index';
import { studyClubContextFixture } from '../../test/contextFixture';
import { unitFixture } from '../../test/unitFixture';
import type { ContextAssemblyOptions, ContextIssue } from './types';

function discovery(units: boolean): ContextAssemblyOptions {
  return { evidenceSeeds: [], retrieval: {
    method: 'indexed-lexical-candidates.v1', corpus_records: 20, corpus_pages: 40, empty_pages: 0,
    query_tokens: ['reading'], omitted_query_tokens: [], candidate_count: 0, candidates: [],
    fetched_files: 1, fetched_bytes: 100, decoded_bytes: 100,
    limits: { query_tokens: 32, candidates: 16, files: 64, fetched_bytes: 16777216, decoded_bytes: 33554432 },
    truncated: false, omissions: [], ...(units ? { units: {
      corpus_schema: 'okf-context-corpus.v2' as const, referenced_records: [], examined_relationships: 0,
      limits: { referenced_records: 200, examined_relationships: 2000 }
    } } : {})
  } };
}
const expanded = (rows: ContextIssue[]) => rows.flatMap(row => row.ids.map(id => `${row.code}\n${row.message}\n${id}`)).sort();
async function fixture() {
  const index = await studyClubContextFixture(), root = index.records.find(r => r.id.endsWith('concept/reading'))!;
  for (let i = 0; i < 16; i++) {
    const row = await unitFixture(['Whole source passage.', 'Qualification retained.'], `https://example.test/unit/${i}`);
    row.evidence_unit!.completeness = 'unresolved';
    row.evidence_unit!.boundary_status = 'machine-detected';
    index.records.push(row);
    index.assertions.push({ ...index.assertions[0], id: `https://example.test/edge/${i}`, source: root.id, target: row.id });
  }
  return index;
}

describe('lossless item-local diagnostics for logical corpora only', () => {
  it('retains every affected identity, message, scope and selected record deterministically', async () => {
    const index = await fixture();
    const ordinary = await assembleContext(index, 'Reading circle', {}, undefined, discovery(false));
    const grouped = await assembleContext(index, 'Reading circle', {}, undefined, discovery(true));
    expect(expanded(grouped.missing_evidence)).toEqual(expanded(ordinary.missing_evidence));
    expect(grouped.missing_evidence.filter(r => r.code === 'unresolved_unit_boundary')).toHaveLength(1);
    expect(grouped.missing_evidence.find(r => r.code === 'unresolved_unit_boundary')!.ids).toHaveLength(16);
    expect(grouped.selected).toEqual(ordinary.selected);
    expect(grouped.relationships).toEqual(ordinary.relationships);
    expect(grouped.requirements).toEqual(ordinary.requirements);
    expect(grouped.scope).toBe(ordinary.scope);
    expect(grouped.evidence_status).toBe('insufficient');
    expect(await assembleContext(index, 'Reading circle', {}, undefined, discovery(true))).toEqual(grouped);
    expect(grouped.budget.used_bytes).toBeLessThan(ordinary.budget.used_bytes);
  });
  it('preserves paired missing dependencies and all integrity failures', async () => {
    const index = await fixture();
    const units = index.records.filter(r => r.evidence_unit);
    for (const record of units.slice(0, 2)) {
      record.evidence_unit!.spans[0].literal_sha256 = '0'.repeat(64);
      record.provenance[0].literal_sha256 = '1'.repeat(64);
      index.assertions.push({ ...index.assertions[0], id: `${record.id}/requires`, source: record.id, target: `${record.id}/absent` });
    }
    const ordinary = await assembleContext(index, 'Reading circle', {}, undefined, discovery(false));
    const grouped = await assembleContext(index, 'Reading circle', {}, undefined, discovery(true));
    expect(expanded(grouped.missing_evidence)).toEqual(expanded(ordinary.missing_evidence));
    expect(grouped.missing_evidence.filter(r => r.code === 'missing_dependency')).toEqual(
      ordinary.missing_evidence.filter(r => r.code === 'missing_dependency'));
    for (const code of ['unit_fragment_integrity', 'evidence_digest_mismatch']) {
      expect(grouped.missing_evidence.find(r => r.code === code)!.ids).toEqual(units.slice(0, 2).map(r => r.id));
    }
    expect(grouped.evidence_status).toBe('insufficient');
  });
  it('groups omitted whole item identities without clipping retained evidence', async () => {
    const index = await fixture();
    const result = await assembleContext(index, 'Reading circle', { max_bytes: 32768 }, undefined, discovery(true));
    const omitted = result.budget.omissions.filter(r => r.code === 'byte_budget');
    expect(omitted).toHaveLength(1);
    expect(omitted[0].ids.length).toBeGreaterThan(1);
    for (const selected of result.selected) expect(selected.record).toEqual(index.records.find(r => r.id === selected.record.id));
    expect(result.budget.used_bytes).toBe(new TextEncoder().encode(canonicalJson(result)).length);
    expect(result.budget.used_bytes).toBeLessThanOrEqual(32768);
    expect(result.evidence_status).toBe('insufficient');
    expect(result.missing_evidence.find(r => r.code === 'unresolved_unit_boundary')!.ids).toHaveLength(16);
  });
});
