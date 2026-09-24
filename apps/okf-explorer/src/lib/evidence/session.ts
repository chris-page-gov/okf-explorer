import type { ContextPackage, ContextRecord, ContextAssertion } from '../context/types';
import { sha256Hex } from '../sources/releaseDataPlane';
import { loadPackage, sourcePageUrl, type WorkbenchCase } from './workbench';
import { validateToolInput, TOOL_NAMES, type WorkbenchToolName } from './toolContracts';
import { DATA_VIEWS, WORKBENCH_VIEWS, type WorkbenchPort, type WorkbenchResult, type ViewPayload, type DataView, type Presentation, type CalculationModel } from './toolTypes';

export const SESSION_LIMITS = { default_bytes: 4096, max_bytes: 32768, calls: 128, journey_bytes: 1048576,
  references: 512, retained: 32, contexts: 3, expiry_ms: 600000, graph_nodes: 20, graph_edges: 40 } as const;
const encoder = new TextEncoder();
const short = (text: string, max = 160) => text.length > max ? text.slice(0, max - 1) + '…' : text;
const navigation = 'Navigation and delivery do not establish evidence sufficiency. Read the source and its qualifications.';
const unknownTime = { assessment_date: null, effective_from: null, effective_to: null };

class ToolFailure extends Error {
  constructor(readonly code: string, message: string, readonly recovery = 'Call okf_get_state and use its current snapshot and references.') { super(message); }
}
type Ref = { caseId: string; recordId: string; expires: number };
type Page = { tool: string; signature: string; rows?: unknown[]; text?: string; offset: number; data: Record<string, unknown>; expires: number; caseId?: string };
type Result = { caseId: string; view: DataView; payload: ViewPayload; expires: number };

/** Shared application service. Browser tools and human controls use the same admitted packages. */
export class WorkbenchSession {
  private snapshot: string | null = null;
  private refs = new Map<string, Ref>();
  private cursors = new Map<string, Page>();
  private results = new Map<string, Result>();
  private contexts = new Map<string, ContextPackage>();
  private activeRequests = new Set<AbortController>();
  private reservations = new Map<AbortController, number>();
  private disposed = false;
  readonly metrics = { calls: 0, bytes: 0, estimated_tokens: 0, elapsed_ms: 0 };

  constructor(private port: WorkbenchPort, private now = () => Date.now()) {}
  dispose() { this.disposed = true; this.cancelPending(); this.clear(); }
  /** Explicit human reload, including the same manifest, starts a new bounded journey. */
  reset() { this.cancelPending(); this.clear(); this.snapshot = null; Object.assign(this.metrics, { calls: 0, bytes: 0, estimated_tokens: 0, elapsed_ms: 0 }); }
  private cancelPending() { for (const request of this.activeRequests) request.abort(); this.reservations.clear(); }
  private clear() { this.refs.clear(); this.cursors.clear(); this.results.clear(); this.contexts.clear(); }
  private fresh(signal: AbortSignal, snapshot?: string | null) {
    if (signal.aborted || this.disposed) throw new DOMException('The workbench request was cancelled.', 'AbortError');
    const current = this.port.state().manifestDigest;
    if (snapshot !== undefined && snapshot !== (current ? `sha256:${current}` : null)) throw new ToolFailure('stale_snapshot', 'The admitted manifest changed during this request.');
  }
  private sync() {
    const digest = this.port.state().manifestDigest;
    const next = digest ? `sha256:${digest}` : null;
    if (next !== this.snapshot) {
      this.cancelPending();
      this.clear(); this.snapshot = next;
      Object.assign(this.metrics, { calls: 0, bytes: 0, estimated_tokens: 0, elapsed_ms: 0 });
    }
    for (const map of [this.refs, this.cursors, this.results]) for (const [key, value] of map) if (value.expires < this.now()) map.delete(key);
  }
  private admitted(expected?: unknown) {
    const state = this.port.state();
    if (!this.snapshot || !state.manifest || !state.manifestUrl) throw new ToolFailure('not_ready', 'Load and admit a workbench manifest first.');
    if (expected !== undefined && expected !== this.snapshot) throw new ToolFailure('stale_snapshot', 'The requested snapshot is no longer loaded.');
    return state.manifest;
  }
  private token(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
  private retain<T>(map: Map<string, T>, id: string, value: T, max: number = SESSION_LIMITS.retained) {
    if (map.size >= max) map.delete(map.keys().next().value!);
    map.set(id, value); return id;
  }
  private ref(caseId: string, recordId: string) {
    for (const [id, value] of this.refs) if (value.caseId === caseId && value.recordId === recordId) return id;
    return this.retain(this.refs, this.token('e'), { caseId, recordId, expires: this.now() + SESSION_LIMITS.expiry_ms }, SESSION_LIMITS.references);
  }
  private modelRef(caseId: string, recordId: string, context?: ContextPackage) {
    const state = this.port.state();
    const known = context ?? (state.caseId === caseId ? state.context : this.contexts.get(caseId));
    if (known && !known.selected.some(row => row.record.id === recordId)) throw new ToolFailure('missing_model_evidence', 'A model cites evidence absent from its retained question package.', 'Review the model citation against its admitted package. No clickable source reference was returned.');
    return this.ref(caseId, recordId);
  }
  resolveReference(id: string): { case_id: string; record_id: string } {
    this.sync(); const value = this.refs.get(id);
    if (!value) throw new ToolFailure('unknown_ref', 'This evidence reference expired or belongs to another session.');
    return { case_id: value.caseId, record_id: value.recordId };
  }
  private entry(caseId?: unknown): WorkbenchCase {
    const manifest = this.admitted();
    const id = caseId ?? this.port.state().caseId;
    const entry = manifest.questions.find(row => row.id === id);
    if (!entry) throw new ToolFailure('unknown_case', 'Choose a case from the admitted question catalogue.');
    return entry;
  }
  private async context(caseId: string, signal: AbortSignal) {
    const snapshot = this.snapshot, state = this.port.state(), entry = this.entry(caseId);
    let result = state.caseId === caseId && state.context?.question === entry.question ? state.context : this.contexts.get(caseId);
    if (!result) result = await loadPackage(entry, new URL(state.manifestUrl!), signal);
    this.fresh(signal, snapshot);
    if (result.selected.some(item => item.record.access !== 'public')) throw new ToolFailure('restricted_evidence', 'This package contains evidence outside the public workbench scope.');
    this.retain(this.contexts, caseId, result, SESSION_LIMITS.contexts);
    return result;
  }
  private async record(ref: string, signal: AbortSignal) {
    const pointer = this.resolveReference(ref), context = await this.context(pointer.case_id, signal);
    const selection = context.selected.find(row => row.record.id === pointer.record_id);
    if (!selection) throw new ToolFailure('missing_evidence', 'The referenced record is absent from its admitted package.');
    return { ...pointer, context, selection };
  }
  private status(caseId?: string) {
    const state = this.port.state();
    return (caseId ? (state.caseId === caseId ? state.context : this.contexts.get(caseId)) : state.context)?.evidence_status ?? 'insufficient';
  }
  private envelope(data: Record<string, unknown> | ViewPayload | undefined, complete: boolean, cursor: string | null, caseId?: string): WorkbenchResult {
    return { schema: 'okf-workbench-result.v1', snapshot_id: this.snapshot, state_revision: this.port.state().revision,
      evidence_status: this.snapshot ? this.status(caseId) : 'not-loaded', data,
      delivery: { complete, next_cursor: cursor, bytes: 0, characters: 0, estimated_tokens: 0 }, limitations: [navigation] };
  }
  private measure(result: WorkbenchResult): WorkbenchResult {
    // Metrics include their own encoded size; iterate to the fixed point.
    for (let i = 0; i < 8; i++) {
      const text = JSON.stringify(result), next = { bytes: encoder.encode(text).length, characters: text.length, estimated_tokens: Math.ceil(text.length / 4) };
      if (result.delivery.bytes === next.bytes && result.delivery.characters === next.characters && result.delivery.estimated_tokens === next.estimated_tokens) break;
      Object.assign(result.delivery, next);
    }
    return result;
  }
  private bounded(result: WorkbenchResult, cap: number) {
    this.measure(result);
    if (result.delivery.bytes > cap) throw new ToolFailure('response_budget', 'This complete item does not fit the requested delivery budget.', 'Request max_bytes up to 32768 or inspect a narrower section. No source text was silently shortened.');
    return result;
  }
  private signature(values: Record<string, unknown>) { return JSON.stringify(Object.fromEntries(Object.entries(values).filter(([key]) => !['cursor', 'max_bytes', 'limit'].includes(key)).sort(([a], [b]) => a.localeCompare(b)))); }
  private page(tool: string, input: Record<string, unknown>, page: Omit<Page, 'offset' | 'expires' | 'signature' | 'tool'>, cap: number): WorkbenchResult {
    let value: Page;
    if (input.cursor) {
      const existing = this.cursors.get(String(input.cursor));
      if (!existing || existing.tool !== tool || existing.signature !== this.signature(input)) throw new ToolFailure('stale_cursor', 'The cursor expired, was evicted, or does not match this request.', 'Repeat the initial request against the current snapshot; do not combine pages across snapshots.');
      value = existing;
    } else value = { ...page, tool, signature: this.signature(input), offset: 0, expires: this.now() + SESSION_LIMITS.expiry_ms };
    const nextCursor = this.token('c');
    let end = value.offset, data: Record<string, unknown> = { ...value.data };
    if (value.text !== undefined) {
      const text = value.text;
      // Keep an entire remaining passage when possible; otherwise prefer paragraph boundaries.
      end = text.length;
      const make = (stop: number) => ({ ...value.data, text: text.slice(value.offset, stop), range: { start: value.offset, end: stop, total: text.length, unit: 'UTF-16 code units' }, whole_passage_delivered: value.offset === 0 && stop === text.length });
      while (end > value.offset && this.measure(this.envelope(make(end), end === text.length, end === text.length ? null : nextCursor, value.caseId)).delivery.bytes > cap) {
        end -= Math.max(1, Math.ceil((end - value.offset) / 8));
      }
      if (end < text.length) {
        const paragraph = text.lastIndexOf('\n\n', end);
        if (paragraph > value.offset + (end - value.offset) / 2) end = paragraph + 2;
        const code = text.charCodeAt(end - 1);
        if (code >= 0xd800 && code <= 0xdbff) end--;
      }
      if (end === value.offset && text.length > value.offset) throw new ToolFailure('response_budget', 'The passage metadata does not fit this budget.');
      data = make(end);
    } else {
      const rows = value.rows ?? [], selected: unknown[] = [], limit = Number(input.limit ?? 3);
      const metadata = (items: unknown[]) => {
        if (value.data.schema !== 'okf-workbench-view.v1' || !Array.isArray(value.data.provenance)) return value.data;
        const refs = new Set(items.flatMap(item => {
          const row = item as Record<string, unknown>;
          return Array.isArray(row.references) ? row.references : [row.ref, row.target_ref];
        }));
        return { ...value.data, provenance: value.data.provenance.filter(source => refs.has((source as { ref: string }).ref)) };
      };
      while (end < rows.length && selected.length < limit) {
        const trial = [...selected, rows[end]], more = end + 1 < rows.length;
        if (this.measure(this.envelope({ ...metadata(trial), items: trial, offset: value.offset, total: rows.length }, !more, more ? nextCursor : null, value.caseId)).delivery.bytes > cap) break;
        selected.push(rows[end++]);
      }
      if (end === value.offset && rows.length > end) throw new ToolFailure('response_budget', 'The next whole item does not fit this delivery budget.');
      data = { ...metadata(selected), items: selected, offset: value.offset, total: rows.length };
    }
    const total = value.text?.length ?? value.rows?.length ?? 0, complete = end === total;
    const result = this.bounded(this.envelope(data, complete, complete ? null : nextCursor, value.caseId), cap);
    if (!complete) this.retain(this.cursors, nextCursor, { ...value, offset: end });
    // Previous cursors remain replayable until expiry; retries do not skip a row.
    return result;
  }
  private metadata(caseId: string, record: ContextRecord) {
    return { ref: this.ref(caseId, record.id), title: short(record.label), kind: record.kind, assertion_status: record.assertion_status,
      review_status: record.review_status ?? 'not supplied', locator: short(record.provenance[0]?.locator ?? 'Not supplied', 160) };
  }
  private model(modelId?: unknown, caseId?: unknown): CalculationModel | undefined {
    const models = this.admitted().calculation_models ?? [];
    if (modelId !== undefined) {
      const selected = models.find(row => row.id === modelId);
      if (!selected) throw new ToolFailure('unknown_model', 'This model is not declared by the admitted manifest.');
      if (caseId !== undefined && !selected.case_ids.includes(String(caseId))) throw new ToolFailure('model_scope_mismatch', 'The model is not declared for this case.');
      return selected;
    }
    const found = models.filter(row => row.case_ids.includes(String(caseId ?? this.port.state().caseId)));
    return found.length === 1 ? found[0] : undefined;
  }

  async invoke(name: string, input: unknown, options: { signal?: AbortSignal } = {}): Promise<WorkbenchResult> {
    const started = performance.now();
    this.sync(); const snapshot = this.snapshot;
    const active = new AbortController(), cancel = () => active.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) active.abort();
    this.activeRequests.add(active);
    const signal = active.signal;
    let cap: number = SESSION_LIMITS.default_bytes;
    try {
      this.fresh(signal);
      if (!TOOL_NAMES.includes(name as WorkbenchToolName)) throw new ToolFailure('unknown_tool', 'Unsupported workbench operation.');
      const values = validateToolInput(name as WorkbenchToolName, input) as Record<string, unknown>;
      cap = Number(values.max_bytes ?? SESSION_LIMITS.default_bytes);
      const reserved = [...this.reservations.values()].reduce((sum, value) => sum + value, 0);
      if (this.metrics.calls >= SESSION_LIMITS.calls || this.metrics.bytes + reserved + cap > SESSION_LIMITS.journey_bytes) throw new ToolFailure('journey_budget', 'This session reached its cumulative tool budget.', 'Finish pending requests, continue with the manual interface or explicitly reload the manifest for a new bounded session.');
      // Reserve before the first await: concurrent reads share the same journey ceiling.
      this.reservations.set(active, cap);
      this.metrics.calls++;
      if (name !== 'okf_get_state') this.admitted(values.snapshot_id);
      const result = await this.run(name, values, cap, signal);
      this.fresh(signal, snapshot);
      this.bounded(result, cap);
      this.metrics.bytes += result.delivery.bytes; this.metrics.estimated_tokens += result.delivery.estimated_tokens;
      return result;
    } catch (error) {
      if (signal.aborted || error instanceof DOMException && error.name === 'AbortError') throw error;
      const issue = error instanceof ToolFailure ? error : new ToolFailure('invalid_request', short(error instanceof Error ? error.message : String(error), 240));
      const result = this.envelope(undefined, false, null);
      result.error = { code: issue.code, message: issue.message, recovery: issue.recovery };
      return this.bounded(result, cap);
    } finally {
      options.signal?.removeEventListener('abort', cancel); this.activeRequests.delete(active);
      this.reservations.delete(active);
      if (!signal.aborted) this.metrics.elapsed_ms += performance.now() - started;
    }
  }

  private async run(name: string, values: Record<string, unknown>, cap: number, signal: AbortSignal): Promise<WorkbenchResult> {
    const state = this.port.state();
    if (name === 'okf_get_state') return this.envelope({ ready: !!this.snapshot && !state.loading, loading: state.loading,
      case_id: state.caseId, record_id: state.recordId, view: state.view, questions: state.manifest?.questions.length ?? 0,
      features: { retained_evidence: !!this.snapshot, page_presentation: true, view_data: true, calculation_inspection: !!state.manifest?.calculation_models?.length, simulation: false, remote_mcp: 'separate service', assistant_panel: 'host capability untested' },
      references: { scope: 'this admitted page session', expires_after_ms: SESSION_LIMITS.expiry_ms },
      usage: { ...this.metrics, estimated_tokens_method: 'ceil(JSON UTF-16 characters / 4); not a tokenizer measurement' } }, true, null);
    if (name === 'okf_search_evidence') {
      const tokens = String(values.query).toLocaleLowerCase('en-GB').match(/[\p{L}\p{N}]+/gu)?.filter(word => !['a', 'an', 'the', 'what', 'how', 'is', 'are', 'to', 'of', 'and', 'for', 'can', 'do', 'does', 'it', 'i', 'my'].includes(word)) ?? [];
      let rows: Array<Record<string, unknown> & { score: number }>, caseId: string | undefined;
      if ((values.scope ?? 'questions') === 'questions') {
        rows = this.admitted().questions.map(item => {
          const haystack = `${item.label} ${item.question} ${item.required_evidence?.join(' ') ?? ''}`.toLocaleLowerCase('en-GB');
          return { case_id: item.id, title: short(item.label), question: short(item.question, 260), score: tokens.filter(word => haystack.includes(word)).length };
        });
      } else {
        caseId = this.entry(values.case_id).id; const context = await this.context(caseId, signal);
        rows = context.selected.map(({ record }) => {
          const haystack = `${record.label} ${record.text}`.toLocaleLowerCase('en-GB');
          return { ...this.metadata(caseId!, record), sort_id: record.id, score: tokens.filter(word => haystack.includes(word)).length };
        });
      }
      rows = rows.filter(row => row.score > 0).sort((a, b) => b.score - a.score || String(a.case_id ?? a.sort_id).localeCompare(String(b.case_id ?? b.sort_id)));
      rows.forEach(row => delete row.sort_id);
      return this.page(name, values, { rows, data: { scope: values.scope ?? 'questions', method: 'retained-text-lexical.v1', follow_up: caseId ? 'okf_get_evidence' : 'okf_show_view', searched_full_corpus: false }, caseId }, cap);
    }
    if (name === 'okf_get_evidence') {
      const { case_id, context, selection } = await this.record(String(values.ref), signal), record = selection.record;
      const data = { ...this.metadata(case_id, record), canonical_id: record.id, case_id, context_id: context.context_id, source_url: sourcePageUrl(record),
        completeness: record.evidence_unit?.completeness ?? 'not supplied', scope: record.scope, follow_up: 'okf_get_relationships' };
      if (values.section === 'passage') {
        const digest = await sha256Hex(record.text); this.fresh(signal);
        return this.page(name, values, { text: record.text, data: { ...data, text_sha256: digest, segmentation: 'Ordered exact text parts; a fragment is never a complete passage. Reassemble all ranges and check the hash.' }, caseId: case_id }, cap);
      }
      const rows = values.section === 'provenance' ? record.provenance : values.section === 'structure' ? (record.evidence_unit?.spans ?? [])
        : [...selection.reasons.map(reason => ({ kind: 'selection_reason', reason })), ...selection.paths.map(path => ({ kind: 'path', path })),
          ...context.missing_evidence.map(issue => ({ kind: 'missing_evidence', ...issue })), ...context.conflicts.map(issue => ({ kind: 'conflict', ...issue })),
          ...context.budget.omissions.map(issue => ({ kind: 'budget_omission', ...issue }))];
      return this.page(name, values, { rows, data: { ...data, section: values.section }, caseId: case_id }, cap);
    }
    if (name === 'okf_get_relationships') {
      const pointer = values.ref ? this.resolveReference(String(values.ref)) : undefined;
      if (pointer && values.case_id && values.case_id !== pointer.case_id) throw new ToolFailure('reference_mismatch', 'This reference belongs to another case.');
      const caseId = this.entry(pointer?.case_id ?? values.case_id).id, context = await this.context(caseId, signal);
      const graph = this.graph(context, caseId, pointer?.record_id, Number(values.depth ?? 1));
      return this.page(name, values, { rows: graph.edges.map((edge, i) => ({ ...edge, canonical_id: graph.assertions[i].id,
        predicate: graph.assertions[i].predicate, scope: graph.assertions[i].scope, authority: graph.assertions[i].authority, provenance: graph.assertions[i].provenance,
        from: graph.nodes.find(n => n.ref === edge.source)?.label ?? 'Missing endpoint', to: graph.nodes.find(n => n.ref === edge.target)?.label ?? 'Missing endpoint' })),
        data: { case_id: caseId, directed: true, omitted_edges: graph.omitted, relationship_scope: 'Selected assertions only; no inferred edges.' }, caseId }, cap);
    }
    if (name === 'okf_get_calculation') {
      const model = this.model(values.model_id, values.case_id);
      if (!model) return this.envelope({ status: 'blocked', execution_allowed: false, models: (this.admitted().calculation_models ?? []).map(row => ({ id: row.id, title: row.title })), gaps: ['No single model is declared for this case. No calculation has been performed.'] }, true, null);
      const data = { model_id: model.id, title: model.title, status: model.status, execution_allowed: false, authority: model.authority,
        assessment_date: values.assessment_date ?? null, effective_period: model.effective_period, jurisdiction: model.jurisdiction,
        components: model.components, gaps: model.gaps };
      const stage = values.stage_id ? model.stages.find(row => row.id === values.stage_id) : undefined;
      if (values.stage_id && !stage) throw new ToolFailure('unknown_stage', 'This stage is not declared by the chosen model.');
      const stages = (stage ? [stage] : model.stages).map(row => ({ ...row, evidence: row.evidence.map(ref => ({ ref: this.modelRef(ref.case_id, ref.record_id), case_id: ref.case_id })) }));
      const rows = stage || values.section === 'stages' ? stages : values.section === 'inputs' ? model.inputs : model.stages.map(row => ({ id: row.id, label: row.label, gaps: row.gaps }));
      return this.page(name, values, { rows, data: { ...data, section: values.section ?? 'overview', follow_up: 'okf_get_evidence' } }, cap);
    }
    if (name === 'okf_get_view_data') {
      if (values.ref && values.view !== 'graph') throw new ToolFailure('invalid_request', 'An evidence anchor is supported only for the graph view.');
      const caseId = this.entry(values.case_id).id, context = await this.context(caseId, signal);
      const payload = this.view(String(values.view) as DataView, caseId, context, values);
      // Retain only the bounded view delivered to this client. No hidden whole-corpus renderer input.
      const resultId = this.token('v');
      if (payload.kind === 'graph') {
        if (values.cursor) throw new ToolFailure('stale_cursor', 'Graphs are delivered as one bounded value, without a continuation.');
        payload.coverage = { offset: 0, total_rows: payload.rows.length, delivered_rows: payload.rows.length, complete: true, next_cursor: null };
        const result = this.envelope(payload, true, null, caseId); result.result_id = resultId;
        this.bounded(result, cap);
        this.retain(this.results, resultId, { caseId, view: payload.kind, payload, expires: this.now() + SESSION_LIMITS.expiry_ms });
        return result;
      }
      // Reserve room for the result reference and explicit row-coverage fields.
      const result = this.page(name, values, { rows: payload.rows, data: { ...payload, rows: undefined }, caseId }, cap - 400);
      const delivered = { ...payload, provenance: (result.data as Record<string, unknown>).provenance as ViewPayload['provenance'], rows: (result.data as Record<string, unknown>).items as ViewPayload['rows'] };
      delivered.coverage = { offset: Number((result.data as Record<string, unknown>).offset), total_rows: payload.rows.length,
        delivered_rows: delivered.rows.length, complete: result.delivery.complete, next_cursor: result.delivery.next_cursor };
      delete (result.data as Record<string, unknown>).items;
      result.data = delivered;
      result.result_id = resultId;
      this.bounded(result, cap);
      this.retain(this.results, resultId, { caseId, view: payload.kind, payload: delivered, expires: this.now() + SESSION_LIMITS.expiry_ms });
      return result;
    }
    if (name === 'okf_show_view') {
      if (values.expected_revision !== state.revision) throw new ToolFailure('stale_revision', 'A person or another tool changed the page.');
      const retained = values.result_id ? this.results.get(String(values.result_id)) : undefined;
      if (values.result_id && !retained) throw new ToolFailure('unknown_result', 'This result expired or belongs to another page session.');
      const pointer = values.ref ? this.resolveReference(String(values.ref)) : undefined;
      const caseId = this.entry(retained?.caseId ?? pointer?.case_id ?? values.case_id).id;
      if (values.case_id && values.case_id !== caseId) throw new ToolFailure('reference_mismatch', 'The evidence reference belongs to a different case.');
      if (pointer && pointer.case_id !== caseId) throw new ToolFailure('reference_mismatch', 'The evidence reference and retained view belong to different cases.');
      const context = await this.context(caseId, signal);
      if (pointer && !context.selected.some(row => row.record.id === pointer.record_id)) throw new ToolFailure('missing_evidence', 'The requested record is absent.');
      const view = String(values.view ?? retained?.view ?? 'source') as Presentation['view'];
      if (!WORKBENCH_VIEWS.includes(view)) throw new ToolFailure('unknown_view', 'This view is unavailable.');
      if (retained && view !== retained.view) throw new ToolFailure('reference_mismatch', 'The retained result was produced for a different view.');
      const selection = { case_id: caseId, ...(pointer ? { record_id: pointer.record_id } : {}), view,
        ...(retained ? { result_id: String(values.result_id) } : {}) };
      // Avoid an irreversible display effect followed by an oversized result error.
      this.bounded(this.envelope({ ...selection, record_id: pointer?.record_id ?? context.selected[0]?.record.id ?? null,
        rendered_revision: state.revision + 1, deep_link: this.port.deepLink(selection) }, true, null, caseId), cap - 150);
      this.fresh(signal, this.snapshot);
      await this.port.present(selection, Number(values.expected_revision), signal);
      this.fresh(signal, this.snapshot);
      const actual = this.port.state();
      if (actual.revision !== Number(values.expected_revision) + 1 || actual.caseId !== caseId || actual.view !== view || pointer && actual.recordId !== pointer.record_id) throw new ToolFailure('presentation_changed', 'The page changed before the requested view finished rendering.');
      return this.envelope({ ...selection, record_id: actual.recordId, rendered_revision: actual.revision, deep_link: this.port.deepLink(selection), result_id: values.result_id ?? null }, true, null, caseId);
    }
    throw new ToolFailure('unknown_tool', 'Unsupported workbench operation.');
  }

  getRetainedView(id: string): ViewPayload | null { this.sync(); return this.results.get(id)?.payload ?? null; }

  private graph(context: ContextPackage, caseId: string, anchor?: string, depth = 1) {
    const known = new Map(context.selected.map(row => [row.record.id, row.record]));
    const ids = new Set<string>(anchor ? [anchor] : context.selected.slice(0, SESSION_LIMITS.graph_nodes).map(row => row.record.id));
    const chosen: ContextAssertion[] = [];
    for (let level = 0; level < depth; level++) {
      const frontier = new Set(ids);
      for (const edge of context.relationships) {
        if (chosen.includes(edge) || !frontier.has(edge.source) && !frontier.has(edge.target)) continue;
        if (chosen.length >= SESSION_LIMITS.graph_edges) break;
        const extra = [edge.source, edge.target].filter(id => !ids.has(id));
        if (ids.size + new Set(extra).size > SESSION_LIMITS.graph_nodes) continue;
        extra.forEach(id => ids.add(id)); chosen.push(edge);
      }
    }
    const nodes = [...ids].map(id => ({ ref: this.ref(caseId, id), label: short(known.get(id)?.label ?? id), status: known.get(id)?.assertion_status ?? 'endpoint-not-selected' }));
    const edges = chosen.map((edge, index) => ({ ref: `assertion-${index}`, source: this.ref(caseId, edge.source), target: this.ref(caseId, edge.target), label: short(edge.label), status: edge.assertion_status }));
    return { nodes, edges, assertions: chosen, omitted: context.relationships.length - chosen.length };
  }

  private view(kind: DataView, caseId: string, context: ContextPackage, values: Record<string, unknown>): ViewPayload {
    if (!DATA_VIEWS.includes(kind)) throw new ToolFailure('unknown_view', 'Unsupported visualisation.');
    const result: ViewPayload = { schema: 'okf-workbench-view.v1', kind, title: '', fields: [], rows: [], time_basis: { ...unknownTime, assessment_date: typeof values.assessment_date === 'string' ? values.assessment_date : null },
      provenance: [], limitations: [navigation, `Retained context status: ${context.evidence_status}. Retrieval and assembly omissions remain in the evidence package.`], authority: 'retained-evidence-projection' };
    const field = (key: string, label: string) => ({ key, label, type: 'string' as const });
    const cite = (id: string, linkedCase = caseId) => {
      const ref = this.modelRef(linkedCase, id, linkedCase === caseId ? context : undefined), record = linkedCase === caseId ? context.selected.find(row => row.record.id === id)?.record : undefined;
      if (record && !result.provenance.some(p => p.ref === ref)) {
        const source = record.provenance[0];
        if (source && sourcePageUrl(record)) result.provenance.push({ ref, url: sourcePageUrl(record)!, locator: source.locator, source_date: source.source_date ?? null });
      }
      if (!record && !result.limitations.includes('Some source references belong to another admitted question package. Open each reference to load and verify its passage and provenance.')) result.limitations.push('Some source references belong to another admitted question package. Open each reference to load and verify its passage and provenance.');
      return ref;
    };
    if (kind === 'graph') {
      const pointer = values.ref ? this.resolveReference(String(values.ref)) : undefined;
      if (pointer && pointer.case_id !== caseId) throw new ToolFailure('reference_mismatch', 'The graph anchor belongs to another case.');
      const graph = this.graph(context, caseId, pointer?.record_id);
      result.title = 'Directed retained relationships'; result.nodes = graph.nodes; result.edges = graph.edges;
      result.fields = [field('source', 'From'), field('predicate', 'Relationship'), field('target', 'To'), field('status', 'Assertion status')];
      result.rows = graph.edges.map(edge => ({ source: graph.nodes.find(n => n.ref === edge.source)!.label, predicate: edge.label, target: graph.nodes.find(n => n.ref === edge.target)!.label, status: edge.status, ref: edge.source, target_ref: edge.target }));
      result.limitations.push(`${graph.omitted} selected assertions are outside this bounded graph. Direction is source to target, not proof of causation.`);
    } else if (kind === 'requirements') {
      result.title = 'Declared evidence requirements'; result.fields = [field('requirement', 'Requirement'), field('status', 'Status'), field('missing', 'Missing evidence'), field('qualification', 'Scope and limitations')];
      result.rows = context.requirements.map(row => ({ requirement: row.label, status: row.status, missing: row.missing.join('; '), qualification: [row.scope, ...row.limitations ?? []].join(' ') }));
      if (!result.rows.length) result.limitations.push('No requirements were declared for this result; completeness cannot be established.');
    } else if (kind === 'interactions') {
      result.title = 'Directional interaction proposals'; result.authority = 'authored-unreviewed-proposal';
      result.fields = [field('from', 'Whose benefit or circumstance'), field('to', 'Whose benefit is affected'), field('effect', 'Source-supported observation'), field('distinction', 'Entitlement or payment'), field('qualification', 'Qualifications and gaps')];
      result.rows = (this.admitted().interaction_proposals ?? []).filter(row => row.case_id === caseId).map(row => ({ from: row.from, to: row.to, effect: row.effect, distinction: row.distinction, qualification: row.qualification,
        references: row.evidence.map(source => cite(source.record_id, source.case_id)) }));
      if (!result.rows.length) result.limitations.push('No directional interaction model was supplied. Text mentions are not converted to causal effects.');
    } else if (kind === 'rates') {
      result.title = 'Rates and applicable periods'; result.fields = [field('rate', 'Rate'), field('value', 'Value'), field('period', 'Effective period')];
      result.limitations.push('No reviewed typed rates contract is admitted. Rates, thresholds and effective dates are unknown; numbers are not extracted from prose as current law.');
    } else {
      result.title = 'Calculation model readiness'; result.authority = 'authored-unreviewed-proposal';
      result.fields = [field('stage', 'Input or stage'), field('description', 'What must be established'), field('status', 'Execution status'), field('gaps', 'Unresolved work'), field('group', 'Group'), field('type', 'Input type'), field('unit', 'Unit'), { key: 'required', label: 'Required', type: 'boolean' }];
      const model = this.model(values.model_id, caseId);
      if (model) {
        result.time_basis.effective_from = model.effective_period.from; result.time_basis.effective_to = model.effective_period.to;
        result.rows = [
          ...model.stages.map(row => ({ stage: row.label, description: row.description, status: 'blocked', gaps: row.gaps.join(' '), references: row.evidence.map(source => cite(source.record_id, source.case_id)) })),
          ...model.inputs.map(row => ({ stage: row.label, description: row.reason, status: 'input requirement proposal', gaps: 'Value not collected; applicability awaits review.', group: row.group, type: row.type, unit: row.unit, required: row.required }))
        ];
        result.limitations.push(...model.gaps, 'No calculation is performed; unknown inputs never become zero or false.');
      } else result.limitations.push('No single calculation model was supplied for this case. No award or arithmetic has been produced.');
    }
    return result;
  }
}
