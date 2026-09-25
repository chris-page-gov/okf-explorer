import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/server/validators/cf-worker';
import { fromJsonSchema } from '@modelcontextprotocol/server';
import common from '../../../profiles/context-assembly/v1/common.schema.json' with { type: 'json' };
import packageSchema from '../../../profiles/context-assembly/v1/package.schema.json' with { type: 'json' };
import evidenceUnit from '../../../profiles/context-assembly/v1/evidence-unit.schema.json' with { type: 'json' };
import type { ContextBudget, ContextPackage } from '../../../apps/okf-explorer/src/lib/context/types.ts';
import { APPROVED_VERSIONS } from './registry.ts';
import { APPROVED_ENGINE_IDS } from './engines.ts';

/** Compose existing local profile references without changing the contract. */
export function composePackageSchema() {
  const rewrite = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(rewrite);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      if (key === '$ref' && item === evidenceUnit.$id) return [key, '#/$defs/evidence_unit'];
      if (key === '$ref' && typeof item === 'string' && item.startsWith('common.schema.json#/$defs/')) {
        return [key, item.replace('common.schema.json#/$defs/', '#/$defs/')];
      }
      return [key, rewrite(item)];
    }));
  };
  const { $id: _unitId, $schema: _unitDialect, ...unitDefinition } = evidenceUnit;
  return { ...rewrite(packageSchema) as Record<string, unknown>,
    $defs: rewrite({ ...common.$defs, evidence_unit: unitDefinition }) as typeof common.$defs & { evidence_unit: typeof unitDefinition } };
}
export const OUTPUT_SCHEMA = composePackageSchema();
export const INPUT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['bundle', 'question'],
  properties: {
    bundle: { type: 'string', enum: ['okf-dwp'], description: 'Approved public bundle identifier; URLs are not accepted.' },
    version: { type: 'string', enum: [...APPROVED_VERSIONS], description: 'Immutable approved revision. Omit for the pinned Evidence Connect DMG and ADM source corpus. Earlier combined, household, staff, discovery and custody profiles remain available by their explicit revisions.' },
    engine_id: { type: 'string', enum: [...APPROVED_ENGINE_IDS], description: 'Exact allowlisted assembler implementation. Preserve the returned engine_id on every replay and continuation. Omit only for a new current-engine task or historical compatibility with an expected context_id.' },
    context_id: { type: 'string', pattern: '^urn:sha256:[a-f0-9]{64}$', description: 'Expected context identity. A mismatch never creates replacement evidence. Without engine_id, at most two approved engines may be tried.' },
    question: { type: 'string', minLength: 1, maxLength: 2000, pattern: '^[\\s\\S]*\\S[\\s\\S]*$', description: 'General knowledge task. Do not include claimant personal data.' },
    budget: { type: 'object', additionalProperties: false, properties: structuredClone(common.$defs.budget.properties) }
  }
} as const;
export type AskInput = { bundle: 'okf-dwp'; version?: string; question: string; budget?: Partial<ContextBudget>; engine_id?: string; context_id?: string };
// This interpreter works in Workers without dynamic code generation.
export const validator = new CfWorkerJsonSchemaValidator();
export const inputContract = fromJsonSchema<AskInput>(INPUT_SCHEMA, validator);
export const outputContract = fromJsonSchema<ContextPackage>(OUTPUT_SCHEMA, validator);
