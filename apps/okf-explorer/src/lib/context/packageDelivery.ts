/** Lossless package delivery with independent assembly and response limits. */
// @ts-ignore -- Explicit extensions support pinned Node consumers.
import { canonicalJson, contextSha256, MAX_CONTEXT_BUDGET } from './index.ts';
// @ts-ignore -- Explicit extensions support pinned Node consumers.
import { contextManifest, readContextEvidence, type EvidenceRead, type ContextManifest } from './delivery.ts';
import type { ContextPackage } from './types';

export const PACKAGE_DELIVERY_LIMITS = Object.freeze({ response_bytes: 32768, parts: 128, transferred_bytes: 4 * 1024 * 1024 });
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
function requireValue(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`Invalid package delivery: ${message}`);
}

/** Offline export or browser transport; preserves selection, diagnostics and authority. */
export async function packageContextForDelivery(context: ContextPackage) {
  const canonical = canonicalJson(context);
  requireValue(new TextEncoder().encode(canonical).length <= MAX_CONTEXT_BUDGET.max_bytes, 'package exceeds assembly limit');
  const catalogues: ContextManifest[] = [], parts: EvidenceRead[] = [];
  let offset: number | null = 0;
  do {
    const page = await contextManifest(context, { offset, max_bytes: PACKAGE_DELIVERY_LIMITS.response_bytes });
    catalogues.push(page); offset = page.delivery.next_offset;
    requireValue(catalogues.length <= PACKAGE_DELIVERY_LIMITS.parts, 'too many catalogue parts');
  } while (offset !== null);
  offset = 0;
  do {
    const page = await readContextEvidence(context, { context_id: context.context_id, section: 'package',
      offset, max_bytes: PACKAGE_DELIVERY_LIMITS.response_bytes });
    parts.push(page); offset = page.next_offset;
    requireValue(parts.length <= PACKAGE_DELIVERY_LIMITS.parts, 'too many package parts');
  } while (offset !== null);
  const sha256 = await contextSha256(canonical);
  requireValue(await reconstructContextPackage(parts, sha256) === canonical, 'package reconstruction differs');
  const responseSizes = [...catalogues, ...parts].map(bytes);
  return { catalogues, parts, sha256, metrics: {
    canonical_package_bytes: new TextEncoder().encode(canonical).length,
    catalogue_response_bytes: catalogues.reduce((n, part) => n + bytes(part), 0),
    package_response_bytes: parts.reduce((n, part) => n + bytes(part), 0),
    total_response_bytes: responseSizes.reduce((a, b) => a + b, 0),
    response_count: responseSizes.length, maximum_response_bytes: Math.max(...responseSizes),
    exact_reconstruction: true, evidence_status: context.evidence_status,
    scope: 'Serialised response bodies, not observed HTTP transfers or answer quality.'
  } };
}

/** Verify all pieces before returning any package text for interpretation. */
export async function reconstructContextPackage(input: unknown[], expectedSha256: string): Promise<string> {
  requireValue(/^[a-f0-9]{64}$/.test(expectedSha256), 'invalid expected package hash');
  requireValue(Array.isArray(input) && input.length > 0 && input.length <= PACKAGE_DELIVERY_LIMITS.parts, 'empty or excessive parts');
  let content = '', end = 0, transferred = 0;
  let first: EvidenceRead | undefined;
  for (let i = 0; i < input.length; i++) {
    const raw = input[i];
    requireValue(raw && typeof raw === 'object' && !Array.isArray(raw), 'invalid part');
    const part = raw as EvidenceRead;
    const count = bytes(part); transferred += count;
    requireValue(count <= PACKAGE_DELIVERY_LIMITS.response_bytes && transferred <= PACKAGE_DELIVERY_LIMITS.transferred_bytes, 'response bounds exceeded');
    requireValue(part.schema === 'okf-context-read.v1' && part.section === 'package' && part.record_id === null
      && part.media_type === 'application/json' && part.ai_answer === null && part.character_unit === 'utf-16-code-units'
      && typeof part.context_id === 'string' && /^urn:sha256:[a-f0-9]{64}$/.test(part.context_id)
      && ['sufficient', 'insufficient', 'conflicting'].includes(part.evidence_status), 'part identity or section differs');
    requireValue(part.content_sha256 === expectedSha256 && Number.isSafeInteger(part.total_characters)
      && part.total_characters >= 0 && part.total_characters <= MAX_CONTEXT_BUDGET.max_bytes, 'content binding differs');
    requireValue(typeof part.data === 'string' && part.offset === end && part.end_offset === end + part.data.length
      && part.end_offset <= part.total_characters, 'non-contiguous offsets');
    requireValue(i === input.length - 1 ? part.next_offset === null : part.next_offset === part.end_offset
      && part.end_offset > part.offset, 'missing or repeated continuation');
    requireValue(part.delivery && part.delivery.used_bytes === count && part.delivery.max_bytes === PACKAGE_DELIVERY_LIMITS.response_bytes,
      'response byte count differs');
    first ??= part;
    requireValue(part.context_id === first.context_id && part.total_characters === first.total_characters
      && part.evidence_status === first.evidence_status && part.context_truncated === first.context_truncated
      && part.retrieval_truncated === first.retrieval_truncated, 'mixed package stream');
    content += part.data; end = part.end_offset;
    requireValue(new TextEncoder().encode(content).length <= MAX_CONTEXT_BUDGET.max_bytes, 'decoded package too large');
  }
  requireValue(end === first!.total_characters && await contextSha256(content) === expectedSha256, 'complete package hash differs');
  const context = await validateCanonicalContextPackage(content, expectedSha256);
  requireValue(context.context_id === first!.context_id
    && context.evidence_status === first!.evidence_status && context.ai_answer === null, 'decoded package identity differs');
  return content;
}

/** Shared identity gate for multipart delivery and a single retained JSON file. */
export async function validateCanonicalContextPackage(content: string, expectedSha256: string): Promise<ContextPackage> {
  requireValue(/^[a-f0-9]{64}$/.test(expectedSha256) && new TextEncoder().encode(content).length <= MAX_CONTEXT_BUDGET.max_bytes,
    'package hash or size limit differs');
  requireValue(await contextSha256(content) === expectedSha256, 'complete package hash differs');
  const context = JSON.parse(content) as ContextPackage;
  requireValue(context && context.schema === 'okf-governed-context.v1' && context.ai_answer === null
    && context.budget && canonicalJson(context) === content, 'decoded package identity differs');
  requireValue(context.budget.used_bytes === new TextEncoder().encode(content).length
    && Number.isSafeInteger(context.budget.max_bytes) && context.budget.max_bytes >= context.budget.used_bytes
    && context.budget.max_bytes <= MAX_CONTEXT_BUDGET.max_bytes, 'declared package byte budget differs');
  requireValue(context.context_id === `urn:sha256:${await contextSha256(canonicalJson({ ...context, context_id: undefined,
    budget: { ...context.budget, used_bytes: undefined } }))}`, 'context digest differs');
  return context;
}
