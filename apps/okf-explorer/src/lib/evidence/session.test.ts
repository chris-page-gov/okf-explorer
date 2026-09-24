import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchSession, SESSION_LIMITS } from './session';
import type { ContextPackage, ContextRecord, ContextAssertion } from '../context/types';
import type { WorkbenchManifest } from './workbench';
import type { WorkbenchPageState, WorkbenchPort, WorkbenchResult } from './toolTypes';

const digest = 'a'.repeat(64);
const snapshot = `sha256:${digest}`;
const caseId = 'club-01';
const question = 'Which rooms can the fictional study club use?';
const base = 'https://example.test/study-club/';
const authority = { class: 'synthetic', label: 'Fictional study-club fixture', source: base };
const longText = 'Study club reading £5 café 💡. '.repeat(340);
const encoder = new TextEncoder();
function record(id: string, label: string, text: string, access: 'public' | 'restricted' = 'public'): ContextRecord {
  return { id: `${base}${id}`, route: id, label, kind: 'evidence', text, assertion_status: 'model-derived', authority,
    scope: 'Synthetic teaching fixture; no real service.', rights: 'CC0 synthetic', access,
    provenance: [{ url: `${base}${id}.md`, source_sha256: digest, locator: 'Fictional source paragraph', captured_at: '2026-09-24T00:00:00Z', literal_sha256: digest }] };
}
const reading = record('reading', 'Reading circle', longText);
const library = record('library', 'Library room', 'The study club library room is step-free.');
const booking = record('booking', 'Booking note', 'The study club repair demonstration needs a booking.');
const records = [reading, library, booking];
const relationships: ContextAssertion[] = [
  { id: `${base}requires-library`, source: reading.id, target: library.id, predicate: 'requires', label: 'requires location evidence', assertion_status: 'model-derived', authority, scope: 'Synthetic relationship', provenance: [] },
  { id: `${base}requires-booking`, source: reading.id, target: booking.id, predicate: 'requires', label: 'requires booking evidence', assertion_status: 'model-derived', authority, scope: 'Synthetic relationship', provenance: [] }
];
function packageFixture(overrides: Partial<ContextPackage> = {}): ContextPackage {
  return { schema: 'okf-governed-context.v1', context_id: `urn:sha256:${digest}`, engine: 'okf-context-assembly.v1', question,
    bundle: { id: `${base}bundle`, snapshot: 'synthetic-study-club-v1', source_url: `${base}index.json` },
    binding: { index_url: `${base}index.json`, index_sha256: digest }, scope: 'Fictional study club', evidence_status: 'insufficient',
    resolved_concepts: [], ambiguities: [], unresolved_terms: [], selected: records.map(item => ({ record: item, reasons: ['synthetic selection'], paths: [] })),
    relationships, requirements: Array.from({ length: 12 }, (_, index) => ({ id: `${base}requirement/${index}`, label: `Requirement ${index}: ${'context '.repeat(20)}`, when_all: [], required: [reading.id], scope: 'Synthetic requirement', status: 'insufficient' as const, missing: [library.id], limitations: ['Not enough evidence.'] })),
    missing_evidence: [{ code: 'missing-source', message: 'A source remains unavailable.', ids: [library.id] }], conflicts: [], limitations: ['Synthetic and unreviewed.'],
    budget: { max_nodes: 64, max_relationships: 128, max_depth: 6, max_bytes: 524288, used_nodes: 3, used_relationships: 2, used_bytes: 1000, reached_depth: 1, truncated: false, omissions: [] }, ai_answer: null,
    ...overrides };
}
function manifestFixture(): WorkbenchManifest {
  return { schema: 'okf-evidence-workbench.v1', title: 'Fictional study club', publication: { label: 'Synthetic teaching fixture' },
    questions: Array.from({ length: 5 }, (_, index) => ({ id: index ? `club-0${index + 1}` : caseId, label: `Study club ${index + 1}`, question: index ? `Study club room ${index + 1}?` : question,
      package: { url: `packages/club-${index + 1}.json`, sha256: digest } })),
    calculation_models: [{ id: 'club-model', title: 'Fictional cost model', status: 'blocked', authority: 'authored-unreviewed-proposal', case_ids: [caseId], components: ['Room use'], jurisdiction: null,
      effective_period: { from: null, to: null }, inputs: [{ id: 'date', label: 'Meeting date', type: 'date', unit: null, reason: 'No reviewed date rule', required: null, group: 'Timing' }],
      stages: [{ id: 'choose-room', label: 'Choose room', description: 'Check room evidence', evidence: [{ case_id: caseId, record_id: reading.id }], gaps: ['Rule not reviewed'] }], gaps: ['No executable rules or reviewed rates'] }],
    interaction_proposals: [{ id: 'interaction-1', case_id: caseId, from: 'Reading circle', to: 'Library room', distinction: 'Use versus booking', effect: 'Room may be used', qualification: 'Synthetic only', evidence: [{ case_id: caseId, record_id: reading.id }], authority: 'authored-unreviewed-proposal' }] };
}
function harness(loaded = true, context = packageFixture()) {
  let clock = 1000;
  const state: WorkbenchPageState = { revision: 0, loading: false, manifest: loaded ? manifestFixture() : null,
    manifestUrl: loaded ? `${base}manifest.json` : null, manifestDigest: loaded ? digest : null,
    caseId: loaded ? caseId : null, recordId: null, view: 'source', context: loaded ? context : null };
  const present = vi.fn(async (selection: Parameters<WorkbenchPort['present']>[0], revision: number, signal: AbortSignal) => {
    if (signal.aborted) throw new DOMException('Cancelled.', 'AbortError');
    if (revision !== state.revision) throw Error('Stale revision.');
    Object.assign(state, { caseId: selection.case_id, recordId: selection.record_id ?? null, view: selection.view, revision: state.revision + 1 });
  });
  const port: WorkbenchPort = { state: () => state, present, deepLink: selection => `${base}?case=${selection.case_id}&view=${selection.view}` };
  return { state, present, session: new WorkbenchSession(port, () => clock), advance: (ms: number) => { clock += ms; } };
}
function data(result: WorkbenchResult): Record<string, unknown> { return result.data as Record<string, unknown>; }
function exactBytes(result: WorkbenchResult) { return encoder.encode(JSON.stringify(result)).length; }
beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new Error('Unexpected network request in the synthetic session test.'))); });
afterEach(() => vi.restoreAllMocks());

describe('synthetic workbench session', () => {
  it('requires an admitted snapshot and refuses restricted records before disclosure', async () => {
    const missing = harness(false);
    expect((await missing.session.invoke('okf_get_state', {})).evidence_status).toBe('not-loaded');
    expect((await missing.session.invoke('okf_search_evidence', { query: 'club' })).error?.code).toBe('not_ready');
    const restricted = harness(true, packageFixture({ selected: [{ record: record('private', 'Restricted note', 'Do not disclose', 'restricted'), reasons: [], paths: [] }] }));
    const result = await restricted.session.invoke('okf_search_evidence', { query: 'private', scope: 'evidence', case_id: caseId, snapshot_id: snapshot });
    expect(result.error?.code).toBe('restricted_evidence');
    expect(JSON.stringify(result)).not.toContain('Do not disclose');
  });

  it('binds references and cursors to the snapshot and expires them', async () => {
    const h = harness();
    const search = await h.session.invoke('okf_search_evidence', { query: 'club', scope: 'evidence', case_id: caseId, limit: 1, snapshot_id: snapshot });
    expect(search.delivery.complete).toBe(false);
    const ref = (data(search).items as Array<{ ref: string }>)[0].ref;
    const cursor = search.delivery.next_cursor!;
    expect(h.session.resolveReference(ref).case_id).toBe(caseId);
    expect(records.map(item => item.id)).toContain(h.session.resolveReference(ref).record_id);
    const next = await h.session.invoke('okf_search_evidence', { query: 'club', scope: 'evidence', case_id: caseId, limit: 1, cursor, snapshot_id: snapshot });
    expect(data(next).offset).toBe(1);
    expect((await h.session.invoke('okf_search_evidence', { query: 'Different', scope: 'evidence', case_id: caseId, cursor, snapshot_id: snapshot })).error?.code).toBe('stale_cursor');
    h.advance(SESSION_LIMITS.expiry_ms + 1);
    expect((await h.session.invoke('okf_get_evidence', { ref, section: 'passage', snapshot_id: snapshot })).error?.code).toBe('unknown_ref');
    expect((await h.session.invoke('okf_search_evidence', { query: 'club', scope: 'evidence', case_id: caseId, cursor, snapshot_id: snapshot })).error?.code).toBe('stale_cursor');
    h.state.manifestDigest = 'b'.repeat(64);
    expect((await h.session.invoke('okf_search_evidence', { query: 'club', snapshot_id: snapshot })).error?.code).toBe('stale_snapshot');
  });

  it('reconstructs a Unicode passage exactly through bounded ordered parts', async () => {
    const h = harness();
    const search = await h.session.invoke('okf_search_evidence', { query: 'Reading', scope: 'evidence', case_id: caseId, snapshot_id: snapshot });
    const ref = (data(search).items as Array<{ ref: string }>)[0].ref;
    let cursor: string | undefined, reconstructed = '', previous = 0, calls = 0;
    do {
      const part = await h.session.invoke('okf_get_evidence', { ref, section: 'passage', snapshot_id: snapshot, max_bytes: 2048, ...(cursor ? { cursor } : {}) });
      expect(part.error).toBeUndefined();
      expect(part.evidence_status).toBe('insufficient');
      expect(part.delivery.bytes).toBe(exactBytes(part));
      expect(part.delivery.bytes).toBeLessThanOrEqual(2048);
      const detail = data(part);
      const range = detail.range as { start: number; end: number; total: number };
      expect(range.start).toBe(previous);
      expect(range.end).toBeGreaterThan(range.start);
      if (!part.delivery.complete) expect(detail.whole_passage_delivered).toBe(false);
      reconstructed += detail.text as string;
      previous = range.end;
      cursor = part.delivery.next_cursor ?? undefined;
      calls++;
      expect(calls).toBeLessThan(30);
    } while (cursor);
    expect(reconstructed).toBe(longText);
    expect(previous).toBe(longText.length);
  });

  it('checks revision and cancellation before changing the visible page', async () => {
    const h = harness();
    const stale = await h.session.invoke('okf_show_view', { case_id: caseId, view: 'graph', expected_revision: 1, snapshot_id: snapshot });
    expect(stale.error?.code).toBe('stale_revision');
    expect(h.present).not.toHaveBeenCalled();
    const controller = new AbortController(); controller.abort();
    await expect(h.session.invoke('okf_show_view', { case_id: caseId, view: 'graph', expected_revision: 0, snapshot_id: snapshot }, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.present).not.toHaveBeenCalled();
    const shown = await h.session.invoke('okf_show_view', { case_id: caseId, view: 'graph', expected_revision: 0, snapshot_id: snapshot });
    expect(shown.error).toBeUndefined();
    expect(data(shown).rendered_revision).toBe(1);
    expect(h.state.view).toBe('graph');
    expect(h.present).toHaveBeenCalledTimes(1);
  });

  it('states partial table coverage and retains a whole bounded graph', async () => {
    const h = harness();
    const partial = await h.session.invoke('okf_get_view_data', { case_id: caseId, view: 'requirements', max_bytes: 2048, snapshot_id: snapshot });
    expect(partial.error).toBeUndefined();
    expect(partial.delivery.complete).toBe(false);
    const coverage = data(partial).coverage as { delivered_rows: number; total_rows: number; complete: boolean; next_cursor: string };
    expect(coverage.delivered_rows).toBeGreaterThan(0);
    expect(coverage.delivered_rows).toBeLessThan(coverage.total_rows);
    expect(coverage.complete).toBe(false);
    expect(coverage.next_cursor).toBe(partial.delivery.next_cursor);
    expect(h.session.getRetainedView(partial.result_id!)?.coverage).toEqual(coverage);
    expect((await h.session.invoke('okf_get_view_data', { case_id: caseId, view: 'requirements', ref: 'invented', snapshot_id: snapshot })).error?.code).toBe('invalid_request');
    const graph = await h.session.invoke('okf_get_view_data', { case_id: caseId, view: 'graph', max_bytes: 32768, snapshot_id: snapshot });
    expect(graph.error).toBeUndefined();
    expect(graph.delivery.complete).toBe(true);
    expect(data(graph).coverage).toMatchObject({ complete: true, delivered_rows: 2, total_rows: 2 });
    expect((data(graph).edges as unknown[]).length).toBe(2);
    expect((data(graph).nodes as unknown[]).length).toBe(3);
    const shown = await h.session.invoke('okf_show_view', { case_id: caseId, result_id: graph.result_id, expected_revision: 0, snapshot_id: snapshot });
    expect(shown.error).toBeUndefined();
    expect(h.present).toHaveBeenCalledWith(expect.objectContaining({ result_id: graph.result_id, view: 'graph' }), 0, expect.any(AbortSignal));
  });

  it('starts a new bounded journey only after explicit session reset', async () => {
    const h = harness();
    for (let index = 0; index < SESSION_LIMITS.calls; index++) {
      const state = await h.session.invoke('okf_get_state', {});
      expect(state.error).toBeUndefined();
    }
    expect((await h.session.invoke('okf_get_state', {})).error?.code).toBe('journey_budget');
    h.session.reset();
    const reopened = await h.session.invoke('okf_get_state', {});
    expect(reopened.error).toBeUndefined();
    expect(data(reopened).ready).toBe(true);
    expect(h.session.metrics.calls).toBe(1);
  });

  it('aborts an in-flight local package read when the same manifest is explicitly reloaded', async () => {
    const h = harness();
    h.state.context = null;
    let started!: () => void;
    const fetching = new Promise<void>(resolve => { started = resolve; });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => new Promise<Response>((_resolve, reject) => {
      started();
      const timeout = setTimeout(() => reject(new Error('Fetch was not cancelled after reset.')), 250);
      init?.signal?.addEventListener('abort', () => { clearTimeout(timeout); reject(new DOMException('Cancelled.', 'AbortError')); }, { once: true });
    }));
    const pending = h.session.invoke('okf_get_view_data', { case_id: caseId, view: 'rates', snapshot_id: snapshot });
    await fetching;
    h.session.reset(); // The user explicitly loads the same manifest digest again.
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    h.state.context = packageFixture();
    const reopened = await h.session.invoke('okf_get_view_data', { case_id: caseId, view: 'rates', snapshot_id: snapshot });
    expect(reopened.error).toBeUndefined();
    expect(reopened.evidence_status).toBe('insufficient');
  });

  it('exposes provenance only for rows delivered on a partial calculation page', async () => {
    const h = harness();
    const model = h.state.manifest!.calculation_models![0];
    model.stages = [reading, library, library, booking].map((item, index) => ({ id: `stage-${index}`, label: `Stage ${index}`, description: `Check ${item.label}.`,
      evidence: [{ case_id: caseId, record_id: item.id }], gaps: ['Review needed.'] }));
    model.inputs = [];
    const result = await h.session.invoke('okf_get_view_data', { case_id: caseId, view: 'calculation', model_id: model.id, max_bytes: 32768, snapshot_id: snapshot });
    expect(result.error).toBeUndefined();
    expect(result.delivery.complete).toBe(false);
    const rows = data(result).rows as Array<{ references: string[] }>;
    const provenance = data(result).provenance as Array<{ ref: string }>;
    const deliveredRefs = new Set(rows.flatMap(row => row.references ?? []));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(model.stages.length);
    expect(provenance.map(item => item.ref).sort()).toEqual([...deliveredRefs].sort());
    expect(result.delivery.bytes).toBe(exactBytes(result));
    expect(result.delivery.bytes).toBeLessThanOrEqual(32768);
    expect(h.session.getRetainedView(result.result_id!)?.provenance.map(item => item.ref).sort()).toEqual([...deliveredRefs].sort());
  });

  it('rejects an explicitly named model outside the selected case for inspection and view data', async () => {
    const h = harness();
    const otherCase = 'club-02';
    const inspection = await h.session.invoke('okf_get_calculation', { model_id: 'club-model', case_id: otherCase, snapshot_id: snapshot });
    expect(inspection.error?.code).toBe('model_scope_mismatch');
    h.state.caseId = otherCase;
    h.state.context = packageFixture({ question: h.state.manifest!.questions[1].question });
    const view = await h.session.invoke('okf_get_view_data', { view: 'calculation', model_id: 'club-model', case_id: otherCase, snapshot_id: snapshot });
    expect(view.error?.code).toBe('model_scope_mismatch');
  });

  it('inspects a blocked model without calculating a value', async () => {
    const h = harness();
    const result = await h.session.invoke('okf_get_calculation', { model_id: 'club-model', section: 'stages', snapshot_id: snapshot });
    expect(result.error).toBeUndefined();
    expect(result.evidence_status).toBe('insufficient');
    expect(data(result)).toMatchObject({ status: 'blocked', execution_allowed: false, authority: 'authored-unreviewed-proposal' });
    expect(JSON.stringify(result)).not.toContain('award_amount');
    expect((await h.session.invoke('okf_simulate_benefit', {})).error?.code).toBe('unknown_tool');
  });
});
