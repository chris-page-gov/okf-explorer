import { fromJsonSchema } from '@modelcontextprotocol/server';
import { INPUT_SCHEMA, validator, type AskInput } from './contracts.ts';
import { EVIDENCE_SECTIONS, type ContextManifest, type EvidenceRead, type EvidenceSection } from '../../../apps/okf-explorer/src/lib/context/delivery.ts';
import type { ContextBudget } from '../../../apps/okf-explorer/src/lib/context/types.ts';

const text = { type: 'string' };
const integer = { type: 'integer', minimum: 0 };
const nullableInteger = { anyOf: [integer, { type: 'null' }] };
const bool = { type: 'boolean' };
const object = <T extends Record<string, any>>(properties: T, required = Object.keys(properties)) => ({ type: 'object' as const, additionalProperties: false, properties, required });
const identity = { type: 'string', pattern: '^urn:sha256:[a-f0-9]{64}$' };
const hash = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const statuses = { type: 'string', enum: ['sufficient', 'insufficient', 'conflicting'] };
const offset = { type: 'integer', minimum: 0, maximum: 2_000_000 };
const maxBytes = { type: 'integer', minimum: 8192, maximum: 65536 };
export type ManifestInput = AskInput & { context_id?: string; offset?: number; delivery_bytes?: number };
export type EvidenceInput = AskInput & { context_id: string; section: EvidenceSection; record_id?: string; offset?: number; delivery_bytes?: number };
export type ReplayRecipe = AskInput & { version: string; budget: ContextBudget; context_id: string };
export type ManifestResult = ContextManifest & {
  replay: { bundle: string; version: string; budget: ContextBudget }; review_url: string;
  response_bytes: number; response_limit: number;
};
export const MANIFEST_INPUT_SCHEMA = {
  ...INPUT_SCHEMA,
  properties: { ...INPUT_SCHEMA.properties,
    context_id: { ...identity, description: 'On later catalogue pages require the context_id returned by the first call.' },
    offset: { ...offset, description: 'Record offset, initially zero. Use delivery.next_offset to continue.' },
    delivery_bytes: { type: 'integer', minimum: 16384, maximum: 65536, description: 'Limit on this compact JSON response, independent of the context selection budget. Default 16384.' }
  }
};
export const EVIDENCE_INPUT_SCHEMA = {
  ...INPUT_SCHEMA, required: [...INPUT_SCHEMA.required, 'context_id', 'section'],
  properties: { ...INPUT_SCHEMA.properties, context_id: identity,
    section: { type: 'string', enum: [...EVIDENCE_SECTIONS] },
    record_id: { type: 'string', minLength: 1, maxLength: 2000, description: 'Exact selected ID from the context manifest; required only for record_text or record_metadata.' },
    offset: { ...offset, description: 'UTF-16 character offset, initially zero. Follow next_offset until null.' },
    delivery_bytes: { ...maxBytes, description: 'Bound the returned JSON including escaping. Default 16384; an MCP envelope may carry both text and structured copies.' }
  }
};
const record = object({ id: text, label: text, kind: { type: 'string', enum: ['concept', 'evidence', 'scope'] },
  assertion_status: { type: 'string', enum: ['official', 'normalized', 'inferred', 'model-derived'] },
  text_characters: integer, text_sha256: hash, source_url: text, source_locator: text,
  authority_class: text, review_status: text, reasons: integer, paths: integer });
export const MANIFEST_OUTPUT_SCHEMA = object({
  schema: { const: 'okf-context-manifest.v1' }, context_id: identity, question: text,
  bundle: object({ id: text, snapshot: text, source_url: text }), binding: object({ index_url: text, index_sha256: hash }),
  evidence_status: statuses,
  summary: object({ selected_records: integer, relationships: integer, full_package_bytes: integer,
    context_truncated: bool, retrieval_truncated: bool, resolved_concepts: integer, ambiguities: integer,
    unresolved_terms: integer, missing_evidence: integer, conflicts: integer, requirements: integer,
    missing_evidence_codes: { type: 'array', items: text }, ai_answer: { type: 'null' } }),
  records: { type: 'array', maxItems: 200, items: record },
  delivery: object({ offset: integer, returned: integer, total: integer, next_offset: nullableInteger, max_bytes: integer, used_bytes: integer }),
  instructions: text,
  replay: object({ bundle: INPUT_SCHEMA.properties.bundle, version: INPUT_SCHEMA.properties.version, budget: INPUT_SCHEMA.properties.budget }),
  review_url: text, response_bytes: integer, response_limit: integer
});
export const EVIDENCE_OUTPUT_SCHEMA = object({
  schema: { const: 'okf-context-read.v1' }, context_id: identity, evidence_status: statuses,
  section: { type: 'string', enum: [...EVIDENCE_SECTIONS] }, record_id: { anyOf: [text, { type: 'null' }] },
  media_type: { type: 'string', enum: ['text/plain', 'application/json'] }, content_sha256: hash,
  total_characters: integer, character_unit: { const: 'utf-16-code-units' }, offset: integer, end_offset: integer,
  next_offset: nullableInteger, data: text,
  delivery: object({ max_bytes: integer, used_bytes: integer, partial: bool }),
  context_truncated: bool, retrieval_truncated: bool, ai_answer: { type: 'null' }
});
export const manifestInputContract = fromJsonSchema<ManifestInput>(MANIFEST_INPUT_SCHEMA, validator);
export const manifestOutputContract = fromJsonSchema<ManifestResult>(MANIFEST_OUTPUT_SCHEMA, validator);
export const evidenceInputContract = fromJsonSchema<EvidenceInput>(EVIDENCE_INPUT_SCHEMA, validator);
export const evidenceOutputContract = fromJsonSchema<EvidenceRead>(EVIDENCE_OUTPUT_SCHEMA, validator);

/** Fragment stays in the browser; it is not sent with GET /review or in referrers. */
export function reviewLink(origin: string, recipe: ReplayRecipe): string {
  const raw = new TextEncoder().encode(JSON.stringify(recipe));
  const encoded = btoa(String.fromCharCode(...raw)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return `${origin}/review/#${encoded}`;
}
