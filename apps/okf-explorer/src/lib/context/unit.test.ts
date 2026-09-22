import { describe, expect, it } from 'vitest';
import { assembleContext, contextSha256, validateContextIndex } from './index';
import { evidenceUnitIntegrity, validateEvidenceUnit } from './unit';
import { readContextEvidence } from './delivery';
import { studyClubContextFixture } from '../../test/contextFixture';
import { unitFixture } from '../../test/unitFixture';

async function fixture() {
  const index = await studyClubContextFixture(); const record = await unitFixture();
  const old = index.records[0].id; record.id = old; index.records[0] = record;
  return { index, record };
}
describe('exact whole logical evidence units', () => {
  it('preserves Unicode, ordered spans and source provenance separately from whole-text hashes', async () => {
    const { index, record } = await fixture();
    expect(validateContextIndex(index)).toBe(index); expect(await evidenceUnitIntegrity(record)).toBe(true);
    expect(record.provenance.every(p => p.literal_sha256 !== record.evidence_unit!.spans[0].literal_sha256)).toBe(true);
    const result = await assembleContext(index, 'Explain Reading circle');
    expect(result.evidence_status).toBe('sufficient');
    expect(result.selected.find(row => row.record.id === record.id)?.record).toEqual(record);
  });
  it.each(['unresolved', 'fallback'] as const)('keeps %s boundaries insufficient without upgrading their authority', async completeness => {
    const { index, record } = await fixture(); record.evidence_unit!.completeness = completeness;
    record.evidence_unit!.boundary_status = 'machine-detected';
    const result = await assembleContext(index, 'Explain Reading circle');
    expect(result.missing_evidence.some(issue => issue.code === 'unresolved_unit_boundary' && issue.ids.includes(record.id))).toBe(true);
    expect(result.evidence_status).toBe('insufficient'); expect(record.assertion_status).toBe('normalized');
  });
  it.each(['gap', 'overlap', 'suffix', 'length', 'unicode', 'unknown', 'url', 'source', 'extraction', 'count', 'fallback'])(
    'rejects malformed span metadata: %s', async change => {
      const { index, record } = await fixture(); const unit = record.evidence_unit!; const span = unit.spans[0];
      if (change === 'gap') unit.spans[1].unit_start++;
      if (change === 'overlap') unit.spans[1].unit_start--;
      if (change === 'suffix') record.text += 'hidden qualification';
      if (change === 'length') span.source_end++;
      if (change === 'unicode') { span.unit_end = 4; span.source_end = span.source_start + 4; }
      if (change === 'unknown') (span as any).interpretation = 'unsupported';
      if (change === 'url') span.source_url = 'https://user:password@example.test/source';
      if (change === 'source') span.source_sha256 = 'a'.repeat(64);
      if (change === 'extraction') span.extraction_sha256 = 'a'.repeat(64);
      if (change === 'count') unit.spans = Array(33).fill(span);
      if (change === 'fallback') unit.kind = 'page-fallback';
      expect(() => validateContextIndex(index)).toThrow(/evidence unit/);
    });
  it('refuses rehashed metadata with a false fragment digest as sufficient evidence', async () => {
    const { index, record } = await fixture(); record.evidence_unit!.spans[0].literal_sha256 = 'a'.repeat(64);
    validateEvidenceUnit(record);
    expect(await evidenceUnitIntegrity(record)).toBe(false);
    const result = await assembleContext(index, 'Explain Reading circle');
    expect(result.evidence_status).toBe('insufficient');
    expect(result.missing_evidence.some(issue => issue.code === 'unit_fragment_integrity')).toBe(true);
  });
  it('binds one source selector to one text identity and monotonic non-overlapping spans', async () => {
    const record = await unitFixture(['aa', 'bb']);
    const page = 'Heading\naa\nbb\nFooter';
    const pageHash = await contextSha256(page), extractionHash = await contextSha256(JSON.stringify({ text: page }));
    const first = record.evidence_unit!.spans[0];
    record.provenance = record.provenance.slice(0, 2);
    record.provenance[1].source_sha256 = extractionHash;
    for (const [i, span] of record.evidence_unit!.spans.entries()) Object.assign(span, {
      source_url: first.source_url, source_sha256: first.source_sha256, extraction_url: first.extraction_url,
      extraction_sha256: extractionHash, locator: first.locator, source_text_sha256: pageHash,
      source_text_bytes: new TextEncoder().encode(page).length, source_start: 8 + i * 3, source_end: 10 + i * 3
    });
    validateEvidenceUnit(record); expect(await evidenceUnitIntegrity(record)).toBe(true);
    for (const change of ['hash', 'size', 'overlap']) {
      const broken = structuredClone(record), span = broken.evidence_unit!.spans[1];
      if (change === 'hash') span.source_text_sha256 = 'a'.repeat(64);
      if (change === 'size') span.source_text_bytes++;
      if (change === 'overlap') { span.source_start = 8; span.source_end = 10; }
      expect(() => validateEvidenceUnit(broken)).toThrow(/conflicting text identities|overlap/);
    }
  });
  it('retains the established whole-text provenance hash contract', async () => {
    const { index, record } = await fixture(); record.provenance[0].literal_sha256 = record.evidence_unit!.spans[0].literal_sha256;
    const result = await assembleContext(index, 'Explain Reading circle');
    expect(result.evidence_status).toBe('insufficient');
    expect(result.missing_evidence.some(issue => issue.code === 'evidence_digest_mismatch')).toBe(true);
  });
  it('omits an entire large unit rather than cutting off its qualification', async () => {
    const { index, record } = await fixture(); const large = await unitFixture(['Reading circle ' + 'x'.repeat(14000), 'Only with a booking.'], record.id);
    index.records[0] = large;
    const result = await assembleContext(index, 'Explain Reading circle', { max_bytes: 8192 });
    expect(result.selected.find(row => row.record.id === record.id)).toBeUndefined();
    expect(result.budget.truncated).toBe(true); expect(result.evidence_status).toBe('insufficient');
    expect(large.text.endsWith('Only with a booking.')).toBe(true);
  });
  it('delivers complete source-span metadata through bounded read-only slices', async () => {
    const { index, record } = await fixture(); const context = await assembleContext(index, 'Explain Reading circle');
    let offset: number | null = 0; const parts: string[] = []; let digest = '';
    do {
      const part = await readContextEvidence(context, { context_id: context.context_id, section: 'record_metadata', record_id: record.id, offset, max_bytes: 8192 });
      parts.push(part.data); offset = part.next_offset; digest = part.content_sha256;
    } while (offset !== null);
    expect(await contextSha256(parts.join(''))).toBe(digest);
    const metadata = JSON.parse(parts.join(''));
    expect(metadata.record.evidence_unit).toEqual(record.evidence_unit);
    expect(metadata.record.provenance).toEqual(record.provenance);
    expect(metadata.record.text_reference.sha256).toBe(await contextSha256(record.text));
  });
});
