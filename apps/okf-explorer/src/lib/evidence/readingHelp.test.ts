import { afterEach, describe, expect, test, vi } from 'vitest';
import { loadReadingHelp, parseManifest, parts, type Manifest } from './readingHelp';

const digests: Record<string, string> = {
  pdf: 'c35b21d6ca39aa7cc3b79a705d989f1a6e88b99ab43988d74048799e3db926a3',
  'GB6 and FTE5': 'e23d2a58e25e1c7eab70b88778c1786887312fae1385fe636c4e92950ede9473',
  GB: 'b4043b0b8297e379bc559ab33b6ae9c7a9b4ef6519d3baee53270f0c0dd3d960',
  '6': 'e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683',
  pageJson: 'bf08c7f6309857117610c694da9cd04f93a4087a35d6c7b15164ff78c8b9b94c'
};
const sha = (value: string) => digests[value] ?? digests.pageJson;
const pdf = 'https://example.test/source.pdf';
const sourceText = 'GB6 and FTE5';
const pageJson = JSON.stringify({ document_id: 'source', source_url: pdf, source_sha256: sha('pdf'), pages: [{ page: 3, url: `${pdf}#page=3`, text: sourceText }] });
const span = (start: number, end: number) => ({ page: 3, page_start_utf8: start, page_end_utf8: end, literal_sha256: sha(sourceText.slice(start, end)) });
const manifestUrl = 'https://example.test/reading-help.json';
function fixture(): Manifest {
  return {
    schema: 'okf-reading-help.v1', scope: 'Bounded source', status: 'unreviewed', review_overlay: [], proposal_inputs: {}, limitations: ['Review needed'],
    sources: [{ id: 'source', pages_url: 'src.json', pages_sha256: digests.pageJson, pdf_url: pdf, pdf_sha256: sha('pdf') }],
    passages: [{ id: 'p1', label: 'Paragraph 1', source_id: 'source', spans: [{ ...span(0, sourceText.length), literal: sourceText }] }],
    occurrences: [
      { id: 'gb', passage_id: 'p1', source_id: 'source', ...span(0, 2), literal: 'GB', role: 'abbreviation' },
      { id: 'marker-6', passage_id: 'p1', source_id: 'source', ...span(2, 3), literal: '6', role: 'source_marker' }
    ],
    cards: [
      { id: 'gb-card', kind: 'expansion', title: 'GB', body: 'Great Britain.', authority: 'source-backed-expansion-with-project-authored-context', review_status: 'unreviewed', source_support: [{ source_id: 'source', ...span(0, 2), quote: 'GB' }], target: { status: 'unresolved', label: 'Definition absent' }, proposal_ids: [], occurrence_ids: ['gb'] },
      { id: 'marker-card', kind: 'citation_navigation', title: 'Source reference 6', body: 'A separate reference.', authority: 'source-pointer-with-project-authored-explanation', review_status: 'unreviewed', source_support: [{ source_id: 'source', ...span(2, 3), quote: '6' }], target: { status: 'resolved', id: 'p1', label: 'Paragraph 1' }, proposal_ids: [], occurrence_ids: ['marker-6'] }
    ]
  };
}
function mockFiles(manifest: Manifest, source = pageJson) {
  vi.stubGlobal('fetch', async (input: URL) => {
    const data = input.href === manifestUrl ? JSON.stringify(manifest) : source;
    const response = new Response(data); Object.defineProperty(response, 'url', { value: input.href }); return response;
  });
}
afterEach(() => vi.unstubAllGlobals());

describe('occurrence-scoped reading help', () => {
  test('retains exact source text and separates abbreviation from adjoining source marker', async () => {
    mockFiles(fixture());
    const loaded = await loadReadingHelp(manifestUrl, manifestUrl);
    const result = parts(loaded, loaded.manifest.passages[0], loaded.manifest.passages[0].spans[0]);
    expect(result.map(row => row.text).join('')).toBe(sourceText);
    expect(result.slice(0, 2).map(row => row.occurrence?.id)).toEqual(['gb', 'marker-6']);
  });
  test('rejects changed source bytes and changed support quotation', async () => {
    const manifest = fixture(); mockFiles(manifest, pageJson.replace('GB6', 'GB7'));
    await expect(loadReadingHelp(manifestUrl, manifestUrl)).rejects.toThrow(/SHA-256/);
    vi.unstubAllGlobals(); manifest.cards[0].source_support[0].quote = 'Not source'; mockFiles(manifest);
    await expect(loadReadingHelp(manifestUrl, manifestUrl)).rejects.toThrow(/frozen source bytes/);
  });
  test('rejects wrong passage scope, overlapping occurrences and an unknown resolved target', () => {
    const manifest = fixture(); manifest.occurrences[0].page_start_utf8 = 4;
    expect(() => parseManifest(manifest, new URL(manifestUrl))).toThrow(/outside its passage|Invalid reading-help/);
    const overlap = fixture(); Object.assign(overlap.occurrences[1], { ...span(0, 2), literal: 'GB' }); overlap.cards[1].source_support[0] = { source_id: 'source', ...span(0, 2), quote: 'GB' };
    mockFiles(overlap);
    return expect(loadReadingHelp(manifestUrl, manifestUrl)).rejects.toThrow(/overlap/);
  });
  test('rejects unknown resolved target and unsafe source or target URLs', () => {
    const missing = fixture(); missing.cards[1].target.id = 'p2';
    expect(() => parseManifest(missing, new URL(manifestUrl))).toThrow(/target is unavailable/);
    const unsafe = fixture(); unsafe.sources[0].pages_url = '../private.json';
    expect(() => parseManifest(unsafe, new URL(manifestUrl))).toThrow(/traverse|directory/);
    const script = fixture(); script.cards[1].target.url = 'javascript:alert(1)';
    expect(() => parseManifest(script, new URL(manifestUrl))).toThrow(/card/);
    const mixed = fixture(); mixed.cards[1].target.url = 'https://example.test/other';
    expect(() => parseManifest(mixed, new URL(manifestUrl))).toThrow(/target is unavailable/);
    const unsupported = fixture(); unsupported.cards[0].source_support[0] = { source_id: 'source', ...span(4, 7), quote: 'and' };
    expect(() => parseManifest(unsupported, new URL(manifestUrl))).toThrow(/support does not contain/);
  });
  test('rejects duplicate or disordered passage spans and duplicate occurrence IDs', () => {
    const duplicate = fixture(); duplicate.passages[0].spans.push({ ...duplicate.passages[0].spans[0] });
    expect(() => parseManifest(duplicate, new URL(manifestUrl))).toThrow(/overlap or are out of order/);
    const repeated = fixture(); repeated.occurrences.push({ ...repeated.occurrences[0] });
    expect(() => parseManifest(repeated, new URL(manifestUrl))).toThrow(/Invalid reading-help occurrence/);
  });
  test('rejects redirects and oversized responses before parsing', async () => {
    const manifest = fixture();
    vi.stubGlobal('fetch', async () => { const response = new Response(JSON.stringify(manifest)); Object.defineProperty(response, 'url', { value: 'https://example.test/redirected.json' }); return response; });
    await expect(loadReadingHelp(manifestUrl, manifestUrl)).rejects.toThrow(/redirected/);
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', async (input: URL) => { const response = new Response(JSON.stringify(manifest), { headers: { 'content-length': String(256 * 1024 + 1) } }); Object.defineProperty(response, 'url', { value: input.href }); return response; });
    await expect(loadReadingHelp(manifestUrl, manifestUrl)).rejects.toThrow(/byte limit/);
  });
});
