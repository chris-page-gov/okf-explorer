import { describe, expect, it, vi } from 'vitest';
import { assembleContext, contextSha256 } from './index';
import { assembleContext as baseline } from '../../../../../validation/context-allocation/2026-09-21/baseline/index';
import { studyClubContextFixture } from '../../test/contextFixture';
import type { ContextAssemblyOptions, ContextIndex, ContextPath } from './types';

const BASE = 'https://example.test/study-club/';
const allocationUsed = (p: Awaited<ReturnType<typeof assembleContext>>) => p.limitations.some(s => s.startsWith('One additional allocation pass'));
async function competingPaths(padding = 0): Promise<ContextIndex> {
  const fixture = await studyClubContextFixture();
  const root = fixture.records.find(r => r.id === `${BASE}concept/reading`)!;
  const first = fixture.records.find(r => r.id === `${BASE}evidence/reading`)!;
  const leaf = fixture.records.find(r => r.id === `${BASE}evidence/library`)!;
  const middle = { ...root, id: `${BASE}concept/qualification`, route: 'concept/qualification', label: 'Qualification navigation', aliases: [] };
  const distractions = Array.from({ length: 4 }, (_, i) => ({ ...first, id: `${BASE}evidence/optional-${i}`, route: `evidence/optional-${i}`, label: `Optional activity ${i}`, text: `Optional context ${i}. ` + 'x'.repeat(padding), provenance: first.provenance.map(p => ({ ...p })) }));
  for (const row of distractions) row.provenance[0].literal_sha256 = await contextSha256(row.text);
  const template = fixture.assertions[0];
  const edge = (id: string, source: string, target: string) => ({ ...template, id: `${BASE}assertion/${id}`, source, target, predicate: 'http://purl.org/dc/terms/references' });
  const route = [edge('90-required-0', root.id, first.id), edge('90-required-1', first.id, middle.id), edge('90-required-2', middle.id, leaf.id)];
  return { ...fixture, records: [root, first, middle, leaf, ...distractions], assertions: [...distractions.map((r, i) => edge(`00-optional-${i}`, root.id, r.id)), ...route],
    requirements: [{ ...fixture.requirements[0], required: [leaf.id], required_paths: [{ seed: root.id, records: [root.id, first.id, middle.id, leaf.id], assertions: route.map(r => r.id) }] }] };
}
function assertPath(p: Awaited<ReturnType<typeof assembleContext>>, path: ContextPath) {
  for (const id of path.records) expect(p.selected.map(r => r.record.id)).toContain(id);
  for (const id of path.assertions) expect(p.relationships.map(r => r.id)).toContain(id);
  for (const row of p.selected) for (const path of row.paths) {
    expect(path.records.every(id => p.selected.some(x => x.record.id === id))).toBe(true);
    expect(path.assertions.every(id => p.relationships.some(x => x.id === id))).toBe(true);
  }
}

describe('required-path allocation under actual pressure', () => {
  it('preserves exact baseline packages when no qualifying path was lost', async () => {
    for (const question of ['Reading circle', 'Repair demonstration', 'teleportation']) {
      const fixture = await studyClubContextFixture();
      expect(await assembleContext(fixture, question)).toEqual(await baseline(fixture, question));
    }
    const fixture = await competingPaths();
    expect(await assembleContext(fixture, 'Reading circle')).toEqual(await baseline(fixture, 'Reading circle'));
    const path = fixture.requirements[0].required_paths![0];
    fixture.requirements[0].required = [path.records[1]];
    fixture.requirements[0].required_paths = [{ ...path, records: path.records.slice(0, 2), assertions: path.assertions.slice(0, 1) }];
    expect(await assembleContext(fixture, 'Reading circle', { max_nodes: 6 })).toEqual(await baseline(fixture, 'Reading circle', { max_nodes: 6 }));
    fixture.requirements[0].required_paths = [];
    expect(await assembleContext(fixture, 'Reading circle', { max_nodes: 4 })).toEqual(await baseline(fixture, 'Reading circle', { max_nodes: 4 }));
  });
  it('uses the same lexical seeds but reserves the actual resolved-root path under pressure', async () => {
    const fixture = await competingPaths();
    const candidates = fixture.records.filter(r => r.id.includes('/optional-'));
    const discovery: ContextAssemblyOptions = { evidenceSeeds: candidates.map(r => ({ id: r.id, reason: 'Synthetic lexical candidate' })), retrieval: {
      method: 'indexed-lexical-candidates.v1', corpus_records: 8, corpus_pages: 6, empty_pages: 0,
      query_tokens: ['reading'], omitted_query_tokens: [], candidate_count: 4,
      candidates: candidates.map(r => ({ id: r.id, matched: ['reading'], score: 1 })),
      fetched_files: 1, fetched_bytes: 100, decoded_bytes: 100,
      limits: { query_tokens: 32, candidates: 16, files: 32, fetched_bytes: 1000, decoded_bytes: 1000 }, truncated: false, omissions: []
    } };
    const before = structuredClone(discovery);
    const result = await assembleContext(fixture, 'Reading circle', { max_nodes: 4 }, undefined, discovery);
    expect(allocationUsed(result)).toBe(true);
    assertPath(result, fixture.requirements[0].required_paths![0]);
    expect(result.retrieval).toEqual(discovery.retrieval);
    expect(discovery).toEqual(before);
    expect(result.selected.every(row => row.paths.every(path => path.seed === `${BASE}concept/reading`))).toBe(true);
  });
  it.each([{ max_nodes: 4 }, { max_relationships: 3 }])('preserves a valid three-hop path against competing fan-out: %j', async budget => {
    const fixture = await competingPaths();
    const old = await baseline(fixture, 'Reading circle', budget);
    expect(old.selected.some(r => r.record.id === `${BASE}evidence/library`)).toBe(false);
    const result = await assembleContext(fixture, 'Reading circle', budget);
    expect(allocationUsed(result)).toBe(true);
    assertPath(result, fixture.requirements[0].required_paths![0]);
    expect(result.selected.find(r => r.record.id.endsWith('evidence/library'))!.reasons.join(' ')).toContain('budget priority');
    expect(result.requirements[0].status).toBe('supported-within-declared-scope');
    expect(result.evidence_status).toBe('insufficient'); // other routes still exceed a budget
    expect(await assembleContext(fixture, 'Reading circle', budget)).toEqual(result);
    expect(fixture.records.some(r => r.text.includes('budget priority'))).toBe(false);
  });
  it('evicts whole optional branches before required evidence under byte pressure', async () => {
    const fixture = await competingPaths(5000);
    const old = await baseline(fixture, 'Reading circle', { max_bytes: 24000 });
    expect(old.selected.some(r => r.record.id === `${BASE}evidence/library`)).toBe(false);
    const result = await assembleContext(fixture, 'Reading circle', { max_bytes: 24000 });
    expect(allocationUsed(result)).toBe(true);
    assertPath(result, fixture.requirements[0].required_paths![0]);
    for (const item of result.selected) expect(item.record.text).toBe(fixture.records.find(r => r.id === item.record.id)!.text);
    expect(result.budget.used_bytes).toBeLessThanOrEqual(24000);
  });
  it.each(['missing-edge', 'reverse', 'wrong-root', 'restricted', 'digest', 'authority', 'scope', 'rights', 'predicate'])('never injects an endpoint of an ineligible path: %s', async variant => {
    const fixture = await competingPaths();
    const edge = fixture.assertions.at(-1)!;
    const leaf = fixture.records.find(r => r.id.endsWith('evidence/library'))!;
    if (variant === 'missing-edge') fixture.assertions.pop();
    if (variant === 'reverse') [edge.source, edge.target] = [edge.target, edge.source];
    if (variant === 'wrong-root') fixture.requirements[0].required_paths![0].seed = fixture.requirements[0].required_paths![0].records[0] = `${BASE}concept/qualification`;
    if (variant === 'restricted') { leaf.access = 'restricted'; leaf.text = 'PRIVATE UNKNOWN EVIDENCE'; }
    if (variant === 'digest') leaf.text += ' changed';
    if (variant === 'authority') leaf.authority = { class: 'unclassified', label: '', source: '' };
    if (variant === 'scope') leaf.scope = '';
    if (variant === 'rights') leaf.rights = '';
    if (variant === 'predicate') edge.predicate = 'https://evil.example/execute';
    const result = await assembleContext(fixture, 'Reading circle', { max_nodes: 4 });
    expect(allocationUsed(result)).toBe(false);
    expect(result.selected.some(r => r.record.id === leaf.id)).toBe(false);
    expect(result.evidence_status).toBe('insufficient');
    expect(JSON.stringify(result)).not.toContain('PRIVATE UNKNOWN EVIDENCE');
  });
  it('does not override depth or activate requirements through ambiguous alternatives', async () => {
    const fixture = await competingPaths();
    const depth = await assembleContext(fixture, 'Reading circle', { max_nodes: 4, max_depth: 2 });
    expect(allocationUsed(depth)).toBe(false);
    const root = fixture.records[0];
    fixture.records.push({ ...root, id: `${BASE}concept/other`, route: 'concept/other' });
    const ambiguous = await assembleContext(fixture, 'Reading circle', { max_nodes: 4 });
    expect(ambiguous.ambiguities).toHaveLength(1);
    expect(ambiguous.resolved_concepts).toEqual([]);
    expect(ambiguous.requirements).toEqual([]);
    expect(allocationUsed(ambiguous)).toBe(false);
  });
  it('fails closed when the required union cannot fit and never slices a passage', async () => {
    const fixture = await competingPaths();
    const leaf = fixture.records.find(r => r.id.endsWith('evidence/library'))!;
    leaf.text = 'Whole qualification. '.repeat(1800);
    leaf.provenance[0].literal_sha256 = await contextSha256(leaf.text);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No network'));
    try {
      const result = await assembleContext(fixture, 'Reading circle', { max_bytes: 15000 });
      expect(result.evidence_status).toBe('insufficient');
      expect(result.budget.used_bytes).toBeLessThanOrEqual(15000);
      expect(result.selected.some(r => r.record.id === leaf.id)).toBe(false);
      expect(result.requirements[0].missing).toContain(leaf.id);
      expect(result.budget.truncated).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
});

describe('declared dependency visibility independently of priority', () => {
  it('reports a dependency after its edge is trimmed, even without required_paths', async () => {
    const fixture = await studyClubContextFixture();
    const leaf = fixture.records.find(r => r.id.endsWith('evidence/library'))!;
    leaf.text = 'Whole room qualification. '.repeat(1500);
    leaf.provenance[0].literal_sha256 = await contextSha256(leaf.text);
    const result = await assembleContext(fixture, 'Reading circle', { max_bytes: 15000 });
    expect(allocationUsed(result)).toBe(false);
    expect(result.selected.some(r => r.record.id.endsWith('evidence/reading'))).toBe(true);
    expect(result.relationships.some(r => r.target === leaf.id)).toBe(false);
    expect(result.missing_evidence.filter(r => r.code === 'missing_dependency')).toEqual([
      { code: 'missing_dependency', message: 'An explicitly required context dependency was not included.', ids: [`${BASE}evidence/reading`, leaf.id] }
    ]);
    const old = await baseline(fixture, 'Reading circle', { max_bytes: 15000 });
    expect(old.missing_evidence.some(r => r.code === 'missing_dependency')).toBe(false);
    expect(result.context_id).not.toBe(old.context_id);
  });
  it('does not retain stale dependency issues after the source itself is trimmed', async () => {
    const fixture = await studyClubContextFixture();
    const first = fixture.records.find(r => r.id.endsWith('evidence/reading'))!;
    first.text = 'Large source. '.repeat(4000);
    first.provenance[0].literal_sha256 = await contextSha256(first.text);
    const result = await assembleContext(fixture, 'Reading circle', { max_bytes: 15000 });
    const issues = result.missing_evidence.filter(r => r.code === 'missing_dependency');
    expect(issues).toHaveLength(1);
    expect(issues[0].ids).toEqual([`${BASE}concept/reading`, first.id]);
    expect(result.selected.some(r => r.record.id === first.id)).toBe(false);
  });
});
