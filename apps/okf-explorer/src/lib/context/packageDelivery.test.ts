import { describe, expect, it } from 'vitest';
import { assembleContext, canonicalJson, contextSha256 } from './index';
import { packageContextForDelivery, reconstructContextPackage, validateCanonicalContextPackage } from './packageDelivery';
import { studyClubContextFixture } from '../../test/contextFixture';

async function largeContext() {
  const index = await studyClubContextFixture();
  const record = index.records.find(r => r.kind === 'evidence' && r.label === 'Reading circle')!;
  record.text = 'Exact synthetic source: 💷 é 漢字 "quotes" and \\ characters.\n'.repeat(700);
  const digest = await contextSha256(record.text);
  record.provenance = record.provenance.map(p => ({ ...p, literal_sha256: digest, source_sha256: digest }));
  return assembleContext(index, 'Explain Reading circle', { max_bytes: 524288 });
}

describe('complete packages through bounded response parts', () => {
  it('delivers a large package without changing its evidence, authority or gaps', async () => {
    const context = await largeContext();
    expect(context.budget.used_bytes).toBeGreaterThan(32768);
    const before = canonicalJson(context);
    const result = await packageContextForDelivery(context);
    expect(result.parts.length).toBeGreaterThan(1);
    expect(result.metrics.maximum_response_bytes).toBeLessThanOrEqual(32768);
    expect(result.metrics.total_response_bytes).toBeGreaterThan(result.metrics.canonical_package_bytes);
    expect(await reconstructContextPackage(result.parts, result.sha256)).toBe(before);
    expect(result.catalogues.flatMap(p => p.records.map(r => r.id))).toEqual(context.selected.map(s => s.record.id));
    expect(canonicalJson(context)).toBe(before);
  });

  it('rejects omission, reordering, mutation, wrong hashes and mixed streams', async () => {
    const result = await packageContextForDelivery(await largeContext());
    await expect(reconstructContextPackage([], result.sha256)).rejects.toThrow();
    await expect(reconstructContextPackage(result.parts.slice(1), result.sha256)).rejects.toThrow();
    await expect(reconstructContextPackage([...result.parts].reverse(), result.sha256)).rejects.toThrow();
    await expect(reconstructContextPackage(result.parts, 'f'.repeat(64))).rejects.toThrow();
    const mutated = structuredClone(result.parts); mutated[0].data = 'x' + mutated[0].data.slice(1);
    await expect(reconstructContextPackage(mutated, result.sha256)).rejects.toThrow();
    const mixed = structuredClone(result.parts); mixed[1].context_id = 'urn:sha256:' + 'a'.repeat(64);
    await expect(reconstructContextPackage(mixed, result.sha256)).rejects.toThrow();
  });

  it('preserves an insufficient empty result rather than manufacturing evidence', async () => {
    const context = await assembleContext(await studyClubContextFixture(), 'unrecognised jargon');
    expect(context.evidence_status).toBe('insufficient');
    expect(context.selected).toHaveLength(0);
    const result = await packageContextForDelivery(context);
    const reconstructed = JSON.parse(await reconstructContextPackage(result.parts, result.sha256));
    expect(reconstructed.selected).toEqual([]);
    expect(reconstructed.missing_evidence).toEqual(context.missing_evidence);
  });

  it('rejects a forged context digest even when the stream is internally consistent', async () => {
    const context = await largeContext(); context.context_id = 'urn:sha256:' + 'a'.repeat(64);
    await expect(packageContextForDelivery(context)).rejects.toThrow('context digest differs');
  });

  it('applies the same identity and size gate to a single retained package', async () => {
    const context = await largeContext(), text = canonicalJson(context);
    expect(await validateCanonicalContextPackage(text, await contextSha256(text))).toEqual(context);
    const pretty = JSON.stringify(context, null, 2);
    await expect(validateCanonicalContextPackage(pretty, await contextSha256(pretty))).rejects.toThrow();
    const answered = canonicalJson({ ...context, ai_answer: 'unsupported generated answer' });
    await expect(validateCanonicalContextPackage(answered, await contextSha256(answered))).rejects.toThrow();
    const oversized = ' '.repeat(524289);
    await expect(validateCanonicalContextPackage(oversized, await contextSha256(oversized))).rejects.toThrow();
    const falseCount = canonicalJson({ ...context, budget: { ...context.budget, used_bytes: 1 } });
    await expect(validateCanonicalContextPackage(falseCount, await contextSha256(falseCount))).rejects.toThrow('byte budget');
  });
});
