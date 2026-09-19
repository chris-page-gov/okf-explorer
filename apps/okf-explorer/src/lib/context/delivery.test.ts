import { describe, expect, it } from 'vitest';
import { assembleContext, canonicalJson, contextSha256 } from './index';
import { contextManifest, readContextEvidence, type EvidenceSection } from './delivery';
import { studyClubContextFixture } from '../../test/contextFixture';

const size = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
const fixture = async () => assembleContext(await studyClubContextFixture(), 'Explain Reading circle');

describe('bounded evidence delivery independent of the bundle domain', () => {
  it('does not alter the context or imply that the catalogue is source evidence', async () => {
    const context = await fixture();
    const before = canonicalJson(context);
    const result = await contextManifest(context);
    expect(result.context_id).toBe(context.context_id);
    expect(result.summary.full_package_bytes).toBe(size(context));
    expect(result.evidence_status).toBe(context.evidence_status);
    expect(result.instructions).toContain('not the source evidence');
    expect(result.summary.ai_answer).toBeNull();
    expect(result.delivery.used_bytes).toBe(size(result));
    expect(canonicalJson(context)).toBe(before);
  });

  it('paginates record summaries without omitting or duplicating selected IDs', async () => {
    const context = await fixture();
    const original = context.selected[0];
    context.selected = Array.from({ length: 100 }, (_, i) => ({ ...original, record: {
      ...original.record, id: `https://example.test/evidence/${i}`, label: 'Long source label '.repeat(30)
    } }));
    const found: string[] = [];
    let offset: number | null = 0;
    do {
      const page = await contextManifest(context, { offset, max_bytes: 8192 });
      expect(size(page)).toBeLessThanOrEqual(8192);
      expect(page.delivery.used_bytes).toBe(size(page));
      expect(page.records.length).toBeGreaterThan(0);
      found.push(...page.records.map(record => record.id));
      offset = page.delivery.next_offset;
    } while (offset !== null);
    expect(found).toEqual(context.selected.map(item => item.record.id));
  });

  it('reconstructs exact Unicode and escaped source text from bounded slices', async () => {
    const context = await fixture();
    const record = context.selected[0].record;
    record.text = ('💷\n"quoted"\\\t\u0000é漢字 qualification; ').repeat(3000);
    let offset: number | null = 0;
    const parts: string[] = [];
    do {
      const part = await readContextEvidence(context, { context_id: context.context_id,
        section: 'record_text', record_id: record.id, offset, max_bytes: 8192 });
      expect(size(part)).toBeLessThanOrEqual(8192);
      expect(part.delivery.used_bytes).toBe(size(part));
      expect(part.end_offset).toBeGreaterThan(offset);
      expect(part.content_sha256).toBe(await contextSha256(record.text));
      expect(part.data).toBe(record.text.slice(offset, part.end_offset));
      parts.push(part.data); offset = part.next_offset;
    } while (offset !== null);
    expect(parts.join('')).toBe(record.text);
    await expect(readContextEvidence(context, { context_id: context.context_id,
      section: 'record_text', record_id: record.id, offset: 1 })).rejects.toThrow('Unicode');
  });

  it.each(['package', 'diagnostics', 'relationships', 'record_metadata'] as EvidenceSection[])(
    'reconstructs the complete %s with provenance and no silent clipping', async section => {
      const context = await fixture();
      const record = context.selected[0].record;
      const parts: string[] = [];
      let offset: number | null = 0;
      let digest = '';
      do {
        const result = await readContextEvidence(context, { context_id: context.context_id,
          section, ...(section === 'record_metadata' ? { record_id: record.id } : {}), offset, max_bytes: 8192 });
        parts.push(result.data); offset = result.next_offset; digest = result.content_sha256;
        expect(result.evidence_status).toBe(context.evidence_status);
      } while (offset !== null);
      const full = parts.join('');
      expect(await contextSha256(full)).toBe(digest);
      const value = JSON.parse(full);
      if (section === 'package') expect(value).toEqual(context);
      if (section === 'relationships') expect(value).toEqual(context.relationships);
      if (section === 'diagnostics') {
        expect(value.missing_evidence).toEqual(context.missing_evidence);
        expect(value.selected).toBeUndefined();
      }
      if (section === 'record_metadata') {
        expect(value.record.provenance).toEqual(record.provenance);
        expect(value.record.text).toBeUndefined();
        expect(value.record.text_reference.sha256).toBe(await contextSha256(record.text));
        expect(value.paths).toEqual(context.selected[0].paths);
      }
    });

  it('rejects stale identities, unselected records, invalid sections, offsets and budgets', async () => {
    const context = await fixture();
    const base = { context_id: context.context_id, section: 'record_text' as const, record_id: context.selected[0].record.id };
    for (const change of [ { context_id: 'urn:sha256:stale' }, { record_id: 'https://evil.test/not-selected' },
      { section: 'unknown' }, { offset: -1 }, { offset: 1.5 }, { offset: 99999999 }, { max_bytes: 8191 },
      { max_bytes: 65537 }, { section: 'package', record_id: base.record_id }
    ]) await expect(readContextEvidence(context, { ...base, ...change } as typeof base)).rejects.toThrow('Invalid evidence delivery');
    await expect(contextManifest(context, { offset: 999 })).rejects.toThrow('offset');
  });

  it('keeps empty results and truncation distinct from successful delivery', async () => {
    const context = await assembleContext(await studyClubContextFixture(), 'teleportation');
    const result = await contextManifest(context);
    expect(result.records).toEqual([]);
    expect(result.delivery.next_offset).toBeNull();
    expect(result.evidence_status).toBe('insufficient');
    expect(result.summary.unresolved_terms).toBeGreaterThan(0);
    context.budget.truncated = true;
    expect((await readContextEvidence(context, { context_id: context.context_id, section: 'diagnostics' })).context_truncated).toBe(true);
  });
});
