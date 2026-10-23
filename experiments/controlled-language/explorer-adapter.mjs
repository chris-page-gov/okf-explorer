/** Optional presentation request after Explorer assembly. No retrieval or model calls. */
import { canonical, sha256 } from '../../scripts/evaluate_context_package.mjs';

export const MAX_INPUT_BYTES = 600_000;
export const MAX_OUTPUT_BYTES = 32_768;
export const MAX_ITERATIONS = 2;

export function buildRenderingRequest(evidence, profiles, profile, iteration = 0, previous = null) {
  if (!Object.hasOwn(profiles.profiles, profile)) throw new Error('Unknown language profile');
  if (!Number.isInteger(iteration) || iteration < 0 || iteration > MAX_ITERATIONS) {
    throw new Error('Revision limit exceeded');
  }
  if (evidence.schema !== 'okf-governed-context.v1' && evidence.schema !== 'okf-controlled-language-evidence.v1') {
    throw new Error('Unsupported evidence envelope');
  }
  if (!['sufficient', 'insufficient', 'conflicting'].includes(evidence.evidence_status) || evidence.ai_answer !== null) {
    throw new Error('Evidence boundary missing');
  }
  const bytes = canonical(evidence);
  if (Buffer.byteLength(bytes) > MAX_INPUT_BYTES) throw new Error('Evidence exceeds input limit');
  if (evidence.schema === 'okf-governed-context.v1') {
    if (!evidence.budget || !Array.isArray(evidence.selected) || !Array.isArray(evidence.relationships)) {
      throw new Error('Incomplete Explorer context');
    }
    const identity = sha256(canonical({ ...evidence, context_id: undefined,
      budget: { ...evidence.budget, used_bytes: undefined } }));
    if (evidence.context_id !== `urn:sha256:${identity}`
      || evidence.budget.used_bytes !== Buffer.byteLength(JSON.stringify(evidence))) {
      throw new Error('Explorer context identity mismatch');
    }
  }
  if (previous && (typeof previous.text !== 'string' || Buffer.byteLength(previous.text) > MAX_OUTPUT_BYTES
    || Buffer.byteLength(JSON.stringify(previous.checker)) > 262144)) {
    throw new Error('Feedback exceeds input limit');
  }
  if (iteration > 0 && (!previous || previous.evidence_sha256 !== sha256(bytes))) {
    throw new Error('Revision must use the same evidence');
  }
  const request = {
    schema: 'okf-controlled-language-request.v1',
    evidence_sha256: sha256(bytes), profile,
    profile_sha256: sha256(canonical(profiles)),
    iteration, generation_status: 'request-only; no model called',
    instructions: [profiles.common, profiles.profiles[profile], ...(iteration ? [profiles.revision] : [])],
    evidence: structuredClone(evidence),
    // Feedback contains measurements, never an assessor answer key.
    feedback: previous ? { text: previous.text, checker: previous.checker } : null,
    output_limit_bytes: MAX_OUTPUT_BYTES,
  };
  return { ...request, request_sha256: sha256(canonical(request)) };
}
