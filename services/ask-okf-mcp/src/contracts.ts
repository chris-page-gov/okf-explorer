import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/server/validators/cf-worker';
import { fromJsonSchema } from '@modelcontextprotocol/server';
import common from '../../../profiles/context-assembly/v1/common.schema.json' with { type: 'json' };
import packageSchema from '../../../profiles/context-assembly/v1/package.schema.json' with { type: 'json' };
import type { ContextBudget, ContextPackage } from '../../../apps/okf-explorer/src/lib/context/types.ts';
import { APPROVED_VERSIONS } from './registry.ts';

/** Compose existing local profile references without changing the contract. */
export function composePackageSchema() {
  const rewrite = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(rewrite);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      if (key === '$ref' && typeof item === 'string' && item.startsWith('common.schema.json#/$defs/')) {
        return [key, item.replace('common.schema.json#/$defs/', '#/$defs/')];
      }
      return [key, rewrite(item)];
    }));
  };
  return { ...rewrite(packageSchema) as Record<string, unknown>, $defs: structuredClone(common.$defs) };
}
export const OUTPUT_SCHEMA = composePackageSchema();
export const INPUT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['bundle', 'question'],
  properties: {
    bundle: { type: 'string', enum: ['okf-dwp'], description: 'Approved public bundle identifier; URLs are not accepted.' },
    version: { type: 'string', enum: [...APPROVED_VERSIONS], description: 'Immutable approved revision. Omit for the pinned full-source discovery corpus; the original custody profile remains available by its explicit revision.' },
    question: { type: 'string', minLength: 1, maxLength: 2000, pattern: '\\S', description: 'General knowledge task. Do not include claimant personal data.' },
    budget: { type: 'object', additionalProperties: false, properties: structuredClone(common.$defs.budget.properties) }
  }
} as const;
export type AskInput = { bundle: 'okf-dwp'; version?: string; question: string; budget?: Partial<ContextBudget> };
// This interpreter works in Workers without dynamic code generation.
export const validator = new CfWorkerJsonSchemaValidator();
export const inputContract = fromJsonSchema<AskInput>(INPUT_SCHEMA, validator);
export const outputContract = fromJsonSchema<ContextPackage>(OUTPUT_SCHEMA, validator);
