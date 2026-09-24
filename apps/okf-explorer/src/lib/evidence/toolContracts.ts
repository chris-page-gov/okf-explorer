import { DATA_VIEWS, WORKBENCH_VIEWS } from './toolTypes';

export const TOOL_NAMES = [
  'okf_get_state', 'okf_search_evidence', 'okf_get_evidence', 'okf_get_relationships',
  'okf_show_view', 'okf_get_view_data', 'okf_get_calculation'
] as const;
export type WorkbenchToolName = typeof TOOL_NAMES[number];
type Property = { type: 'string' | 'integer'; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; enum?: readonly string[]; pattern?: string; description: string };
type InputSchema = { type: 'object'; additionalProperties: false; required?: readonly string[]; anyOf?: readonly { required: readonly string[] }[]; properties: Record<string, Property> };
export type ToolContract = {
  name: WorkbenchToolName; title: string; description: string; inputSchema: InputSchema;
  annotations: { readOnlyHint: boolean; untrustedContentHint: true; consequentialHint: false };
};
const short = (description: string, maxLength = 120): Property => ({ type: 'string', minLength: 1, maxLength, pattern: '\\S', description });
const ref = short('A reference returned by this snapshot.', 300);
const cursor = short('Opaque continuation cursor returned by the preceding call.', 512);
const snapshot = short('Snapshot identifier returned by the workbench state.', 128);
const bytes: Property = { type: 'integer', minimum: 2048, maximum: 32768, description: 'Maximum UTF-8 response bytes, from 2048 to 32768.' };
const date: Property = { type: 'string', minLength: 10, maxLength: 10, pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Assessment date in YYYY-MM-DD format.' };
const schema = (properties: Record<string, Property>, required: string[] = []): InputSchema => ({
  type: 'object', additionalProperties: false, ...(required.length ? { required } : {}), properties
});
const oneReference = (input: InputSchema, keys: string[]): InputSchema => ({ ...input, anyOf: keys.map(key => ({ required: [key] })) });
const annotations = (readOnlyHint: boolean) => ({ readOnlyHint, untrustedContentHint: true, consequentialHint: false }) as const;

/** Fixed, inspectable page-tool descriptors. Application response schema is separate. */
export const TOOL_CONTRACTS: readonly ToolContract[] = [
  { name: 'okf_get_state', title: 'Get workbench state', description: 'Read the current workbench snapshot, readiness, selected case and view, revision and available features. Use before a snapshot-bound evidence or display call.', inputSchema: schema({}), annotations: annotations(true) },
  { name: 'okf_search_evidence', title: 'Search workbench evidence', description: 'Find cases or evidence in the admitted snapshot. Returns short matches, evidence status and references for a detail call; it does not answer the question.', inputSchema: schema({ query: short('Question or search words to find in the loaded snapshot.', 500), scope: { type: 'string', enum: ['questions', 'evidence'], description: 'Search questions or evidence; defaults to questions.' }, case_id: short('Limit evidence search to this case ID.'), cursor, snapshot_id: snapshot, limit: { type: 'integer', minimum: 1, maximum: 10, description: 'Maximum number of matches, from 1 to 10.' }, max_bytes: bytes }, ['query']), annotations: annotations(true) },
  { name: 'okf_get_evidence', title: 'Read workbench evidence', description: 'Read one passage, provenance, structure or retrieval trace by a reference returned for this snapshot. Returns bounded source detail, gaps and a continuation cursor if needed.', inputSchema: schema({ ref, section: { type: 'string', enum: ['passage', 'provenance', 'structure', 'trace'], description: 'Part of the referenced evidence to read.' }, cursor, snapshot_id: snapshot, max_bytes: bytes }, ['ref', 'section']), annotations: annotations(true) },
  { name: 'okf_get_relationships', title: 'Read evidence relationships', description: 'Read bounded directed relationships for a case or evidence reference in the admitted snapshot. Returns assertion status, source references and unresolved qualifications.', inputSchema: oneReference(schema({ ref, case_id: short('Case ID whose relationships should be read.'), depth: { type: 'integer', minimum: 1, maximum: 2, description: 'Maximum relationship hops, from 1 to 2.' }, limit: { type: 'integer', minimum: 1, maximum: 10, description: 'Maximum relationships, from 1 to 10.' }, cursor, snapshot_id: snapshot, max_bytes: bytes }), ['ref', 'case_id']), annotations: annotations(true) },
  { name: 'okf_show_view', title: 'Show workbench view', description: 'Display a referenced case, evidence item or retained result in the live workbench. Requires the current snapshot and revision; returns the rendered selection, new revision and deep link.', inputSchema: oneReference(schema({ case_id: short('Case ID to display.'), ref, result_id: short('Retained result ID to display.', 128), view: { type: 'string', enum: WORKBENCH_VIEWS, description: 'Workbench view to display.' }, expected_revision: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER, description: 'Current non-negative page revision from get_state.' }, snapshot_id: snapshot }, ['expected_revision', 'snapshot_id']), ['case_id', 'ref', 'result_id']), annotations: annotations(false) },
  { name: 'okf_get_view_data', title: 'Read workbench view data', description: 'Read bounded table or graph data underlying a workbench view. Returns fields, units, time basis, provenance, limitations and continuation where needed.', inputSchema: schema({ view: { type: 'string', enum: DATA_VIEWS, description: 'Data view to read.' }, case_id: short('Case ID for this view.'), ref, model_id: short('Proposed calculation model ID.'), assessment_date: date, cursor, max_bytes: bytes, snapshot_id: snapshot }, ['view']), annotations: annotations(true) },
  { name: 'okf_get_calculation', title: 'Inspect calculation model', description: 'Inspect an authored benefit-calculation proposal and its blocked status, required inputs, stages, source references and unresolved gaps. Does not calculate an award.', inputSchema: schema({ model_id: short('Calculation model ID.'), stage_id: short('Stage ID within the model.'), case_id: short('Case ID associated with a model.'), section: { type: 'string', enum: ['overview', 'inputs', 'stages'], description: 'Model section to inspect; defaults to overview.' }, assessment_date: date, cursor, max_bytes: bytes, snapshot_id: snapshot }), annotations: annotations(true) }
];

const byName = new Map(TOOL_CONTRACTS.map(contract => [contract.name, contract]));
function object(input: unknown): input is Record<string, unknown> { return input !== null && typeof input === 'object' && !Array.isArray(input); }
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const dateValue = new Date(Date.UTC(year, month - 1, day));
  return dateValue.getUTCFullYear() === year && dateValue.getUTCMonth() + 1 === month && dateValue.getUTCDate() === day;
}

/** Validate again at execution: browser schema validation is not a trust boundary. */
export function validateToolInput(name: WorkbenchToolName, input: unknown): Record<string, unknown> {
  const contract = byName.get(name);
  if (!contract) throw new Error('Unknown workbench tool.');
  if (!object(input)) throw new Error('Tool input must be an object.');
  const fields = contract.inputSchema.properties;
  for (const key of Object.keys(input)) if (!Object.hasOwn(fields, key)) throw new Error(`Unsupported field: ${key}.`);
  for (const key of contract.inputSchema.required ?? []) if (input[key] === undefined) throw new Error(`Missing required field: ${key}.`);
  for (const [key, value] of Object.entries(input)) {
    const rule = fields[key];
    if (rule.type === 'integer') {
      if (!Number.isSafeInteger(value) || (rule.minimum !== undefined && Number(value) < rule.minimum) || (rule.maximum !== undefined && Number(value) > rule.maximum)) throw new Error(`Invalid ${key}.`);
    } else {
      if (typeof value !== 'string' || !value.trim() || (rule.minLength !== undefined && value.length < rule.minLength) || (rule.maxLength !== undefined && value.length > rule.maxLength) || (rule.enum && !rule.enum.includes(value)) || (rule.pattern && !new RegExp(rule.pattern).test(value))) throw new Error(`Invalid ${key}.`);
      if (key === 'assessment_date' && !validDate(value)) throw new Error('Invalid assessment_date.');
    }
  }
  if (name === 'okf_show_view' && !input.case_id && !input.ref && !input.result_id) throw new Error('Choose a case_id, ref or result_id to display.');
  if (name === 'okf_get_relationships' && !input.case_id && !input.ref) throw new Error('Provide a case_id or ref.');
  return input;
}
