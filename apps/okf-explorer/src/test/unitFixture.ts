import { contextSha256 } from '../lib/context/index';
import type { ContextRecord } from '../lib/context/types';
import { studyClubContextFixture } from './contextFixture';

/** Exact synthetic spans; source inclusion is deliberately independently reproducible. */
export async function unitFixture(texts = ['Café reading.', 'Only with a booking.'], id = 'https://example.test/unit/0000'): Promise<ContextRecord> {
  const record = (await studyClubContextFixture()).records[0];
  const text = texts.join('\n'); const literal = await contextSha256(text); let offset = 0;
  const spans = await Promise.all(texts.map(async (fragment, i) => {
    const sourceText = `Heading\n${fragment}\nFooter`; const bytes = new TextEncoder().encode(fragment).length;
    const row = { source_url: `https://example.test/source/${i}.pdf`, source_sha256: await contextSha256(`synthetic-pdf-${i}`),
      extraction_url: `https://example.test/source/${i}.json`, extraction_sha256: await contextSha256(JSON.stringify({ text: sourceText })),
      locator: `Synthetic page ${i + 1}`, source_text_sha256: await contextSha256(sourceText), source_text_bytes: new TextEncoder().encode(sourceText).length,
      source_start: 8, source_end: 8 + bytes, unit_start: offset, unit_end: offset + bytes, literal_sha256: await contextSha256(fragment) };
    offset += bytes + 1; return row;
  }));
  // Promise completion cannot assign ordering: all offsets are computed below.
  offset = 0;
  for (const span of spans) { const length = span.source_end - span.source_start; span.unit_start = offset; span.unit_end = offset + length; offset = span.unit_end + 1; }
  return { ...record, id, route: `unit/${id.split('/').at(-1)}`, label: 'Synthetic logical passage', text,
    provenance: spans.flatMap(span => [
      { ...record.provenance[0], url: span.source_url, source_sha256: span.source_sha256, locator: span.locator, literal_sha256: literal },
      { ...record.provenance[0], url: span.extraction_url, source_sha256: span.extraction_sha256, locator: span.locator, literal_sha256: literal }
    ]), evidence_unit: { schema: 'okf-evidence-unit.v1', kind: 'compound', boundary_status: 'author-declared',
      completeness: 'complete-within-declared-boundary', offset_unit: 'utf-8-bytes', joiner: '\n', spans } };
}
