import graphDocument from '../vendor/graph-evidence/graph.json' with { type: 'json' };
import release from '../vendor/graph-evidence/admission.json' with { type: 'json' };
import { resolveConcepts, validateContextIndex } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { createGraphEvidenceRuntime, graphEvidenceManifest, readGraphEvidence, graphBytes,
  type GraphPlan } from '../vendor/graph-evidence/graph_evidence_runtime.mjs';
import type { GraphInput, GraphReadInput } from './graphContracts.ts';

export const GRAPH_RELEASE = Object.freeze(release);
// The producer uses this exact UTF-8 JSON layout. Build admission checks the
// original file; runtime verification rejects a non-equivalent round trip.
const graphText = JSON.stringify(graphDocument, null, 2) + '\n';
let runtime: ReturnType<typeof createGraphEvidenceRuntime> | undefined;
const load = () => runtime ??= createGraphEvidenceRuntime({ graphText, graphSha256: release.graph_sha256,
  engineId: release.engine_id, resolveConcepts, validateContextIndex });
export const graphToolResult = (value: Record<string, any>) => ({ structuredContent: value,
  content: [{ type: 'text' as const, text: JSON.stringify(value) }] });
// The HTTP admission bounds string IDs to 128 characters. Reserve that full
// envelope here as well as both MCP copies; the limit is never just source text.
const envelopeBytes = (value: unknown) => graphBytes({ jsonrpc: '2.0', id: '\u0000'.repeat(128), result: graphToolResult(value as Record<string, any>) }) + 64;

async function replay(input: GraphInput): Promise<GraphPlan> {
  if (input.graph_sha256 && input.graph_sha256 !== release.graph_sha256) throw new Error('Graph identity differs');
  if (input.engine_id && input.engine_id !== release.engine_id) throw new Error('Graph engine differs');
  const plan = await (await load()).plan(input.question);
  if (input.plan_id && input.plan_id !== plan.plan_id) throw new Error('Plan identity differs');
  return plan;
}
export async function planGraphEvidence(input: GraphInput) {
  if ((input.offset ?? 0) > 0 && !input.plan_id) throw new Error('Plan continuation requires identity');
  const value = await graphEvidenceManifest(await replay(input), { offset: input.offset, maxBytes: input.delivery_bytes ?? 8192 }, envelopeBytes);
  return graphToolResult(value);
}
export async function readPlannedGraphEvidence(input: GraphReadInput) {
  const value = await readGraphEvidence(await replay(input), { plan_id: input.plan_id, section: input.section,
    record_id: input.record_id, offset: input.offset, maxBytes: input.delivery_bytes ?? 8192 }, envelopeBytes);
  return graphToolResult(value);
}
