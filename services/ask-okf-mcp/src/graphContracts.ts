import { fromJsonSchema } from '@modelcontextprotocol/server';
import { validator } from './contracts.ts';

const object = <T extends Record<string, any>>(properties: T, required = Object.keys(properties)) => ({ type: 'object' as const, additionalProperties: false, properties, required });
const text = { type: 'string' }, integer = { type: 'integer', minimum: 0 };
const hash = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const planId = { type: 'string', pattern: '^urn:sha256:[a-f0-9]{64}$' };
const engineId = { type: 'string', pattern: '^urn:okf:graph-engine:sha256:[a-f0-9]{64}$' };
const nullableOffset = { anyOf: [integer, { type: 'null' }] };
const properties = {
  bundle: { type: 'string', const: 'okf-dwp' },
  question: { type: 'string', minLength: 1, maxLength: 2000, pattern: '^[\\s\\S]*\\S[\\s\\S]*$', description: 'General public research question. Do not submit claimant personal data.' },
  graph_sha256: { ...hash, description: 'Preserve the admitted graph digest on every continuation.' },
  engine_id: engineId, plan_id: planId,
  offset: { type: 'integer', minimum: 0, maximum: 16777216 },
  delivery_bytes: { type: 'integer', minimum: 2048, maximum: 16384, description: 'Maximum complete MCP/JSON-RPC response, including duplicate content. Default 8192 bytes.' },
};
export type GraphInput = { bundle: 'okf-dwp'; question: string; graph_sha256?: string; engine_id?: string;
  plan_id?: string; offset?: number; delivery_bytes?: number };
export type GraphReadInput = GraphInput & { plan_id: string; section: string; record_id?: string };
export const GRAPH_MANIFEST_INPUT_SCHEMA = object(properties, ['bundle', 'question']);
export const GRAPH_READ_INPUT_SCHEMA = object({ ...properties,
  section: { type: 'string', enum: ['record_text', 'record_metadata', 'diagnostics', 'relationships', 'package'] },
  record_id: { type: 'string', minLength: 1, maxLength: 2000 } }, ['bundle', 'question', 'plan_id', 'section']);
const base = { plan_id: planId, graph_sha256: hash, engine_id: engineId,
  evidence_status: { const: 'insufficient' }, ai_answer: { type: 'null' } };
const delivery = { max_bytes: integer, used_bytes: integer };
export const GRAPH_MANIFEST_OUTPUT_SCHEMA = object({ ...base,
  schema: { const: 'okf-graph-evidence-manifest.v1' }, retrieval_complete: { type: 'boolean' }, assembly_truncated: { const: false },
  package_sha256: hash,
  counts: object({ records: integer, source_records: integer, relationships: integer, requirements: integer, diagnostics: integer }),
  records: { type: 'array', maxItems: 5000, items: object({ id: text, label: text,
    kind: { type: 'string', enum: ['concept', 'evidence', 'scope'] }, text_sha256: hash, text_characters: integer }) },
  delivery: object({ ...delivery, offset: integer, next_offset: nullableOffset, total: integer }),
});
export const GRAPH_READ_OUTPUT_SCHEMA = object({ ...base, schema: { const: 'okf-graph-evidence-read.v1' },
  section: { type: 'string', enum: ['record_text', 'record_metadata', 'diagnostics', 'relationships', 'package'] },
  record_id: { anyOf: [text, { type: 'null' }] }, character_unit: { const: 'utf-16-code-units' },
  total_characters: integer, content_sha256: hash, offset: integer, end_offset: integer,
  next_offset: nullableOffset, data: text, delivery: object(delivery) });
export const graphManifestInputContract = fromJsonSchema<GraphInput>(GRAPH_MANIFEST_INPUT_SCHEMA, validator);
export const graphReadInputContract = fromJsonSchema<GraphReadInput>(GRAPH_READ_INPUT_SCHEMA, validator);
export const graphManifestOutputContract = fromJsonSchema<Record<string, any>>(GRAPH_MANIFEST_OUTPUT_SCHEMA, validator);
export const graphReadOutputContract = fromJsonSchema<Record<string, any>>(GRAPH_READ_OUTPUT_SCHEMA, validator);
