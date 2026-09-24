import type { CalculationModel, InteractionProposal } from './toolTypes';

function obj(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid modelling object.');
}
function text(value: unknown, max = 1600): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid modelling text.');
}
function list(value: unknown, max: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('Invalid modelling list.');
}
function texts(value: unknown, max = 20) { list(value, max); value.forEach(item => text(item)); }
function exact(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new Error('Unsupported modelling field.');
}
function refs(value: unknown, caseIds: Set<string>) {
  list(value, 12);
  if (!value.length) throw new Error('A modelling stage or interaction needs source references.');
  for (const item of value) {
    obj(item); exact(item, ['case_id', 'record_id']); text(item.case_id, 100); text(item.record_id, 500);
    if (!caseIds.has(item.case_id)) throw new Error('Modelling evidence refers to an unknown question.');
  }
}
function unique(items: unknown[], allowed: string[]) {
  const ids = new Set<string>();
  for (const item of items) {
    obj(item); exact(item, allowed); text(item.id, 80);
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(item.id) || ids.has(item.id)) throw new Error('Invalid or duplicate modelling ID.');
    ids.add(item.id);
  }
}
function nullableDate(value: unknown) {
  if (value !== null && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error('Invalid model date.');
}

/** These fields admit research proposals only, never executable rules or render code. */
export function validateWorkbenchModels(value: Record<string, unknown>, caseIds: Set<string>): void {
  if (value.calculation_models !== undefined) {
    list(value.calculation_models, 10);
    unique(value.calculation_models, ['id', 'title', 'status', 'authority', 'case_ids', 'components', 'jurisdiction', 'effective_period', 'inputs', 'stages', 'gaps']);
    for (const entry of value.calculation_models) {
      const model = entry as Record<string, unknown>;
      text(model.title, 300);
      if (model.status !== 'blocked' || model.authority !== 'authored-unreviewed-proposal') throw new Error('This profile admits blocked, unreviewed model inspection only.');
      texts(model.case_ids, 10);
      if (!(model.case_ids as string[]).length || (model.case_ids as string[]).some(id => !caseIds.has(id))) throw new Error('Invalid model question scope.');
      texts(model.components, 10); texts(model.gaps);
      if (!(model.gaps as unknown[]).length) throw new Error('A blocked model must explain its gaps.');
      if (model.jurisdiction !== null) text(model.jurisdiction, 200);
      obj(model.effective_period); exact(model.effective_period, ['from', 'to']);
      nullableDate(model.effective_period.from); nullableDate(model.effective_period.to);
      if (typeof model.effective_period.from === 'string' && typeof model.effective_period.to === 'string' && model.effective_period.from > model.effective_period.to) throw new Error('Model dates are reversed.');
      list(model.inputs, 40); unique(model.inputs, ['id', 'label', 'type', 'unit', 'reason', 'required', 'group']);
      for (const entry of model.inputs) {
        const input = entry as Record<string, unknown>;
        text(input.label, 300); text(input.reason); text(input.group, 200);
        if (!['money', 'date', 'boolean', 'enum', 'integer'].includes(String(input.type))) throw new Error('Unsupported model input type.');
        if (input.unit !== null) text(input.unit, 80);
        if (input.required !== null && typeof input.required !== 'boolean') throw new Error('Missing input applicability must stay unknown.');
      }
      list(model.stages, 20); unique(model.stages, ['id', 'label', 'description', 'evidence', 'gaps']);
      for (const entry of model.stages) {
        const stage = entry as Record<string, unknown>;
        text(stage.label, 300); text(stage.description); refs(stage.evidence, caseIds); texts(stage.gaps);
      }
    }
  }
  if (value.interaction_proposals !== undefined) {
    list(value.interaction_proposals, 40);
    unique(value.interaction_proposals, ['id', 'case_id', 'from', 'to', 'distinction', 'effect', 'qualification', 'evidence', 'authority']);
    for (const entry of value.interaction_proposals) {
      const row = entry as Record<string, unknown>;
      if (!caseIds.has(String(row.case_id)) || row.authority !== 'authored-unreviewed-proposal') throw new Error('Invalid interaction scope or authority.');
      for (const key of ['from', 'to', 'distinction', 'effect', 'qualification']) text(row[key]);
      refs(row.evidence, caseIds);
    }
  }
}

export type WorkbenchModelling = { calculation_models?: CalculationModel[]; interaction_proposals?: InteractionProposal[] };
