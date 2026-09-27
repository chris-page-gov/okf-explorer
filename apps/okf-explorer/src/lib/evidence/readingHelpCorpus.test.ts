import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-ignore -- Node-only test fixture; the browser application has no Node type dependency.
import { createHash } from 'node:crypto';
// @ts-ignore -- Node-only test fixture.
import { gzipSync } from 'node:zlib';
import { clearReadingHelpCorpusCache, corpusParts, loadCatalogue, loadCorpusPassage, loadCrossTarget, loadDocument } from './readingHelpCorpus';

const origin = 'https://example.test/project/';
const root = `${origin}reading-help-corpus/`;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const reference = (path: string, bytes: Uint8Array) => ({ url: `reading-help-corpus/${path}`, bytes: bytes.byteLength, sha256: hash(bytes) });

async function fixture() {
  const page = { page: 1, text: 'First note. Second note.', url: 'https://example.test/source.pdf#page=1' };
  const sourceHash = hash(json('source PDF'));
  const rulesHash = hash(json('rules'));
  const extraction = json({ document_id: 'doc-1', source_sha256: sourceHash, pages: [page] });
  const extractionRef = reference('source/pages.json', extraction);
  const unitId = 'https://example.test/id/unit/doc-1/p1';
  const first = 'First note. ';
  const second = 'Second note.';
  const fullHash = hash(new TextEncoder().encode(first + second));
  const makePassage = (ordinal: number, text: string, start: number) => ({
    id: unitId, unit_sha256: hash(json('unit')), role: 'paragraph', status: 'processed', text_sha256: fullHash,
    paragraph_labels: ['1'], source_spans: [{ page: 1, start_utf8: 0, end_utf8: first.length + second.length, literal_sha256: fullHash }],
    segment: { ordinal, start_utf8: start, end_utf8: start + text.length, text, sha256: hash(new TextEncoder().encode(text)) }, segment_count: 2, passage_complete: false,
    occurrences: ordinal === 0 ? [{ id: 'occ-1', passage_id: unitId, page: 1, start_utf8: 0, end_utf8: 5, literal: 'First', literal_sha256: hash(new TextEncoder().encode('First')), role: 'word', status: 'source_verified' }] : [],
    cards: ordinal === 0 ? [{ id: 'card-1', occurrence_id: 'occ-1', kind: 'explanation', status: 'proposed' }] : [], reference_list_segments: []
  });
  const leaf0Decoded = json({ schema: 'okf-reading-help.v2', family: 'dmg', document_id: 'doc-1', source_sha256: sourceHash, extraction_sha256: hash(extraction), rules_sha256: rulesHash, passages: [makePassage(0, first, 0)] });
  const leaf1Decoded = json({ schema: 'okf-reading-help.v2', family: 'dmg', document_id: 'doc-1', source_sha256: sourceHash, extraction_sha256: hash(extraction), rules_sha256: rulesHash, passages: [makePassage(1, second, first.length)] });
  const leaf0 = gzipSync(leaf0Decoded), leaf1 = gzipSync(leaf1Decoded);
  const leafRef0 = { ...reference('documents/dmg/doc-1/leaves/0000.json.gz', leaf0), decoded_bytes: leaf0Decoded.byteLength, decoded_sha256: hash(leaf0Decoded), encoding: 'gzip' };
  const leafRef1 = { ...reference('documents/dmg/doc-1/leaves/0001.json.gz', leaf1), decoded_bytes: leaf1Decoded.byteLength, decoded_sha256: hash(leaf1Decoded), encoding: 'gzip' };
  const index = {
    schema: 'okf-reading-help-document.v1', family: 'dmg', document_id: 'doc-1', rules_sha256: rulesHash,
    source: { url: 'https://example.test/source.pdf', sha256: sourceHash }, extraction: extractionRef,
    review: { specialist_accepted: false, legal_answerability: 'not-established' }, extraction_blocked_pages: [], leaves: [leafRef0, leafRef1],
    passages: [leafRef0, leafRef1].map((leaf, ordinal) => ({ unit_id: unitId, unit_sha256: hash(json('unit')), role: 'paragraph', status: 'processed', pages: [1], segment_ordinal: ordinal, segment_count: 2, leaf_url: leaf.url, leaf_sha256: leaf.sha256, leaf_bytes: leaf.bytes }))
  };
  const indexBytes = json(index);
  const catalogue = {
    schema: 'okf-reading-help-catalogue.v1', rules_sha256: rulesHash, status: 'machine-proposed-unreviewed', limitations: ['Unreviewed'], counts: { documents: 1, extraction_blocked_pages: 0 },
    documents: [{ ...reference('documents/dmg/doc-1/index.json', indexBytes), family: 'dmg', document_id: 'doc-1', status: 'processed', counts: { passages: 1 } }]
  };
  const files = new Map([
    [`${root}manifest.json`, json(catalogue)],
    [`${origin}${catalogue.documents[0].url}`, indexBytes],
    [`${origin}${extractionRef.url}`, extraction],
    [`${origin}${leafRef0.url}`, leaf0],
    [`${origin}${leafRef1.url}`, leaf1]
  ]);
  vi.stubGlobal('fetch', async (url: URL) => {
    const bytes = files.get(url.href);
    const response = new Response(bytes ?? 'missing', { status: bytes ? 200 : 404 });
    Object.defineProperty(response, 'url', { value: url.href });
    return response;
  });
  return { files, index, catalogue, unitId, extractionRef, leafRef0, leafRef1 };
}

afterEach(() => { vi.unstubAllGlobals(); clearReadingHelpCorpusCache(); });

describe('reading-help corpus consumer', () => {
  it('loads only a selected document and ordered leaves, verifying exact source spans', async () => {
    const source = await fixture();
    const catalogue = await loadCatalogue(`${root}manifest.json`, root);
    const document = await loadDocument(catalogue, 'dmg', 'doc-1');
    const passage = await loadCorpusPassage(document, source.unitId);
    expect(passage.text).toBe('First note. Second note.');
    expect(passage.leafCount).toBe(2);
    expect(passage.metrics.fetched_files).toBe(3);
    const warm = await loadCorpusPassage(document, source.unitId);
    expect(warm.metrics).toEqual({ fetched_bytes: 0, fetched_files: 0, cache_hits: 3 });
    expect(passage.occurrences.map(row => row.id)).toEqual(['occ-1']);
    expect(corpusParts(passage, passage.segments[0].source_spans[0]).map(row => row.text).join('')).toBe('First note. Second note.');
  });

  it('rejects altered compressed or decoded leaf bindings and incomplete continuation', async () => {
    const source = await fixture();
    const catalogue = await loadCatalogue(`${root}manifest.json`, root);
    const document = await loadDocument(catalogue, 'dmg', 'doc-1');
    source.files.set(`${origin}${source.leafRef0.url}`, gzipSync(json({ altered: true })));
    await expect(loadCorpusPassage(document, source.unitId)).rejects.toThrow(/bound SHA-256/);
    vi.unstubAllGlobals();
    clearReadingHelpCorpusCache();
    const second = await fixture();
    const loaded = await loadCatalogue(`${root}manifest.json`, root);
    const indexed = await loadDocument(loaded, 'dmg', 'doc-1');
    indexed.index.leaves[0].decoded_sha256 = hash(json('wrong decoded bytes'));
    await expect(loadCorpusPassage(indexed, second.unitId)).rejects.toThrow(/Decoded reading-help leaf/);
    indexed.index.passages.pop();
    await expect(loadCorpusPassage(indexed, second.unitId)).rejects.toThrow(/incomplete ordered segments/);
  });

  it('keeps a document browseable when another passage exceeds its working limit', async () => {
    const source = await fixture();
    const catalogue = await loadCatalogue(`${root}manifest.json`, root);
    const document = await loadDocument(catalogue, 'dmg', 'doc-1');
    const oversized = 'https://example.test/id/unit/doc-1/oversized';
    const sample = document.index.passages[0];
    document.index.passages.push(...Array.from({ length: 33 }, (_, ordinal) => ({ ...sample, unit_id: oversized, segment_ordinal: ordinal, segment_count: 33 })));
    await expect(loadCorpusPassage(document, oversized)).rejects.toThrow(/32-segment working limit/);
    await expect(loadCorpusPassage(document, source.unitId)).resolves.toMatchObject({ text: 'First note. Second note.' });
  });

  it('accepts printed abbreviation tables and rejects a reference above the bounded cap', async () => {
    const source = await fixture();
    const indexUrl = `${origin}${source.catalogue.documents[0].url}`;
    const passage = source.index.passages[0];
    Object.assign(passage, { abbreviations: Array.from({ length: 166 }, (_, n) => `AB${n}`) });
    let indexBytes = json(source.index);
    source.catalogue.documents[0].sha256 = hash(indexBytes);
    source.catalogue.documents[0].bytes = indexBytes.byteLength;
    source.files.set(indexUrl, indexBytes);
    source.files.set(`${root}manifest.json`, json(source.catalogue));
    let catalogue = await loadCatalogue(`${root}manifest.json`, root);
    await expect(loadDocument(catalogue, 'dmg', 'doc-1')).resolves.toBeDefined();

    clearReadingHelpCorpusCache();
    Object.assign(passage, { abbreviations: Array.from({ length: 513 }, (_, n) => `AB${n}`) });
    indexBytes = json(source.index);
    source.catalogue.documents[0].sha256 = hash(indexBytes);
    source.catalogue.documents[0].bytes = indexBytes.byteLength;
    source.files.set(indexUrl, indexBytes);
    source.files.set(`${root}manifest.json`, json(source.catalogue));
    catalogue = await loadCatalogue(`${root}manifest.json`, root);
    await expect(loadDocument(catalogue, 'dmg', 'doc-1')).rejects.toThrow(/Invalid reading-help passage reference/);
  });

  it('rejects unsafe document paths and missing exact cross-target leaves', async () => {
    const source = await fixture();
    source.catalogue.documents[0].url = '../outside/index.json';
    source.files.set(`${root}manifest.json`, json(source.catalogue));
    await expect(loadCatalogue(`${root}manifest.json`, root)).rejects.toThrow(/outside the declared source area/);
    source.catalogue.documents[0].url = 'reading-help-corpus/documents/dmg/doc-1/index.json';
    source.files.set(`${root}manifest.json`, json(source.catalogue));
    const catalogue = await loadCatalogue(`${root}manifest.json`, root);
    await expect(loadCrossTarget(catalogue, { document_id: 'doc-1', passage_id: source.unitId, occurrence_id: 'occ-1', leaf_url: source.leafRef0.url, leaf_sha256: '0'.repeat(64) })).rejects.toThrow(/target leaf does not match/);
  });

  it('rejects altered frozen source pages', async () => {
    const source = await fixture();
    const catalogue = await loadCatalogue(`${root}manifest.json`, root);
    const document = await loadDocument(catalogue, 'dmg', 'doc-1');
    source.files.set(`${origin}${source.extractionRef.url}`, json({ document_id: 'doc-1', source_sha256: document.index.source.sha256, pages: [{ page: 1, text: 'Changed source.' }] }));
    await expect(loadCorpusPassage(document, source.unitId)).rejects.toThrow(/bound SHA-256/);
  });
});
