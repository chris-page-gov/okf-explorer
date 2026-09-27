import { manifestUrl, packageUrl } from './workbench';
import { sha256Hex } from '$lib/sources/releaseDataPlane';

const HASH = /^[a-f0-9]{64}$/;
const MAX_CATALOGUE_BYTES = 1024 * 1024;
const MAX_INDEX_BYTES = 1024 * 1024;
const MAX_LEAF_BYTES = 256 * 1024;
const MAX_DECODED_LEAF_BYTES = 256 * 1024;
const MAX_EXTRACTION_BYTES = 8 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export type CorpusRef = { url: string; sha256: string; bytes: number; decoded_sha256?: string; decoded_bytes?: number };
export type CorpusDocument = CorpusRef & { family: string; document_id: string; status: string; counts: Record<string, number> };
export type Catalogue = { schema: 'okf-reading-help-catalogue.v1'; rules_sha256: string; status: string; limitations: string[]; counts: Record<string, number>; documents: CorpusDocument[] };
export type PassageRef = { unit_id: string; unit_sha256: string; role: string; status: string; label?: string; paragraph_labels?: string[]; abbreviations?: string[]; pages: number[]; segment_ordinal: number; segment_count: number; leaf_url: string; leaf_sha256: string; leaf_bytes: number };
export type DocumentIndex = { schema: 'okf-reading-help-document.v1'; family: string; document_id: string; rules_sha256: string; source: { url: string; sha256: string }; extraction: CorpusRef; review: { specialist_accepted: boolean; legal_answerability: string }; extraction_blocked_pages: number[]; leaves: Array<CorpusRef & { encoding: string }>; passages: PassageRef[]; abbreviation_definitions?: Array<{ term: string; expansion: string; passage_id: string; scope: string; status: string }>; repeated_phrase_proposals?: Array<{ literal: string; passage_count: number; meaning: null; scope: string; status: string }> };
export type CorpusSpan = { page: number; start_utf8: number; end_utf8: number; literal_sha256: string };
export type CorpusOccurrence = { id: string; passage_id: string; page: number; start_utf8: number; end_utf8: number; literal: string; literal_sha256: string; role: string; status: string };
export type CorpusCard = { id: string; occurrence_id: string; kind: string; status: string; target?: { manual?: string; target_kind?: string; target_label?: string }; scope?: { source_table_document_ids?: string[]; target_document_id?: string }; source_table_rows?: Array<{ document_id: string; page: number; literal: string; expansion?: string; status: string; start_utf8: number; end_utf8: number; literal_sha256: string }> };
export type CorpusSegment = { ordinal: number; start_utf8: number; end_utf8: number; text: string; sha256: string };
export type CorpusReferenceRow = { occurrence_id: string; passage_id: string; marker: string; page: number; start_utf8: number; end_utf8: number; literal: string; literal_sha256: string; status: string; body_occurrence_ids: string[]; target?: CrossTarget };
export type CorpusPassage = { id: string; unit_sha256: string; role: string; status: string; text_sha256: string; paragraph_labels: string[]; source_spans: CorpusSpan[]; segment: CorpusSegment; segment_count: number; passage_complete: boolean; occurrences: CorpusOccurrence[]; cards: CorpusCard[]; reference_list_segments: CorpusReferenceRow[] };
export type LoadedCatalogue = { catalogue: Catalogue; url: URL; sha256: string; bytes: number };
export type LoadedDocument = { index: DocumentIndex; document: CorpusDocument; catalogue: LoadedCatalogue; url: URL };
export type LoadedPassage = { document: LoadedDocument; id: string; text: string; segments: CorpusPassage[]; occurrences: CorpusOccurrence[]; cards: CorpusCard[]; sourcePages: Map<number, string>; leafCount: number; metrics: LoadMetrics };
export type LoadMetrics = { fetched_bytes: number; fetched_files: number; cache_hits: number };
export type CorpusPart = { text: string; occurrence?: CorpusOccurrence };
export type CrossTarget = { document_id: string; passage_id: string; occurrence_id: string; leaf_url: string; leaf_sha256: string };

function validCrossTarget(value: unknown, catalogueUrl: URL): value is CrossTarget {
  if (!object(value) || !string(value.document_id, 160) || !string(value.passage_id, 1000) || !string(value.occurrence_id, 160) || !string(value.leaf_url, 1000) || !digest(value.leaf_sha256)) return false;
  try { corpusUrl(value.leaf_url, catalogueUrl); return true; } catch { return false; }
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown, max = 2000): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const natural = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const digest = (value: unknown): value is string => typeof value === 'string' && HASH.test(value);
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const verifiedCache = new Map<string, Uint8Array>();
let verifiedCacheBytes = 0;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 64;

function corpusUrl(path: string, catalogueUrl: URL, extraction = false): URL {
  assert(path.startsWith('reading-help-corpus/') || (extraction && path.startsWith('source/')), 'Reading-help reference is outside the declared source area.');
  return packageUrl(path, new URL('../', catalogueUrl));
}

function safeSourcePdf(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && /\.pdf$/i.test(url.pathname);
  } catch { return false; }
}

async function limited(stream: ReadableStream<Uint8Array> | null, max: number): Promise<Uint8Array> {
  assert(stream, 'Reading-help response has no body.');
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > max) throw new Error('Reading-help response exceeds its byte limit.');
      chunks.push(part.value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function fetchBound(url: URL, max: number, signal?: AbortSignal): Promise<Uint8Array> {
  const active = signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000);
  const response = await fetch(url, { signal: active, cache: 'no-store', credentials: 'omit', redirect: 'error' });
  if (!response.ok || response.url !== url.href) { await response.body?.cancel(); throw new Error('Reading-help source failed or redirected.'); }
  if (Number(response.headers.get('content-length') || 0) > max) { await response.body?.cancel(); throw new Error('Reading-help source exceeds its byte limit.'); }
  return limited(response.body, max);
}

async function verified(ref: CorpusRef, url: URL, max: number, signal?: AbortSignal, metrics?: LoadMetrics): Promise<Uint8Array> {
  assert(digest(ref.sha256) && natural(ref.bytes) && ref.bytes > 0 && ref.bytes <= max, 'Invalid reading-help byte reference.');
  const key = `${url.href}|${ref.bytes}|${ref.sha256}`;
  const cached = verifiedCache.get(key);
  if (cached) { metrics && metrics.cache_hits++; return cached; }
  const bytes = await fetchBound(url, max, signal);
  assert(bytes.byteLength === ref.bytes && await sha256Hex(bytes) === ref.sha256, 'Reading-help source bytes differ from the bound SHA-256.');
  if (metrics) { metrics.fetched_bytes += bytes.byteLength; metrics.fetched_files++; }
  if (bytes.byteLength <= MAX_CACHE_BYTES) {
    while (verifiedCache.size >= MAX_CACHE_ENTRIES || verifiedCacheBytes + bytes.byteLength > MAX_CACHE_BYTES) {
      const oldest = verifiedCache.keys().next().value;
      if (!oldest) break;
      verifiedCacheBytes -= verifiedCache.get(oldest)!.byteLength;
      verifiedCache.delete(oldest);
    }
    verifiedCache.set(key, bytes);
    verifiedCacheBytes += bytes.byteLength;
  }
  return bytes;
}

export function clearReadingHelpCorpusCache() { verifiedCache.clear(); verifiedCacheBytes = 0; }

export async function loadCatalogue(raw: string, base: string, signal?: AbortSignal): Promise<LoadedCatalogue> {
  const url = manifestUrl(raw, base);
  const bytes = await fetchBound(url, MAX_CATALOGUE_BYTES, signal);
  const value: unknown = JSON.parse(decoder.decode(bytes));
  assert(object(value) && value.schema === 'okf-reading-help-catalogue.v1' && digest(value.rules_sha256) && string(value.status, 100) && Array.isArray(value.limitations) && value.limitations.every(item => string(item, 1000)) && object(value.counts) && Object.values(value.counts).every(natural) && Array.isArray(value.documents) && value.documents.length > 0 && value.documents.length <= 1000, 'Unsupported reading-help catalogue.');
  const seen = new Set<string>();
  for (const item of value.documents) {
    assert(object(item) && string(item.family, 40) && string(item.document_id, 160) && string(item.url, 1000) && digest(item.sha256) && natural(item.bytes) && item.bytes > 0 && item.bytes <= MAX_INDEX_BYTES && string(item.status, 100) && object(item.counts) && Object.values(item.counts).every(natural), 'Invalid reading-help document reference.');
    const key = `${item.family}/${item.document_id}`;
    assert(!seen.has(key), 'Duplicate reading-help document.');
    seen.add(key); corpusUrl(item.url, url);
  }
  return { catalogue: value as Catalogue, url, sha256: await sha256Hex(bytes), bytes: bytes.byteLength };
}

export async function loadDocument(catalogue: LoadedCatalogue, family: string, documentId: string, signal?: AbortSignal): Promise<LoadedDocument> {
  const document = catalogue.catalogue.documents.find(item => item.family === family && item.document_id === documentId);
  assert(document, 'Reading-help document is not listed in the catalogue.');
  const url = corpusUrl(document.url, catalogue.url);
  const bytes = await verified(document, url, MAX_INDEX_BYTES, signal);
  const value: unknown = JSON.parse(decoder.decode(bytes));
  assert(object(value) && value.schema === 'okf-reading-help-document.v1' && value.family === family && value.document_id === documentId && value.rules_sha256 === catalogue.catalogue.rules_sha256 && object(value.source) && digest(value.source.sha256) && string(value.source.url, 1000) && safeSourcePdf(value.source.url) && object(value.extraction) && digest(value.extraction.sha256) && natural(value.extraction.bytes) && value.extraction.bytes <= MAX_EXTRACTION_BYTES && string(value.extraction.url, 1000) && object(value.review) && value.review.specialist_accepted === false && Array.isArray(value.extraction_blocked_pages) && value.extraction_blocked_pages.length <= 2000 && value.extraction_blocked_pages.every(page => natural(page) && page > 0) && Array.isArray(value.leaves) && value.leaves.length <= 100 && Array.isArray(value.passages) && value.passages.length <= 2000, 'Unsupported reading-help document index.');
  corpusUrl(value.extraction.url as string, catalogue.url, true);
  for (const leaf of value.leaves) {
    assert(object(leaf) && string(leaf.url, 1000) && digest(leaf.sha256) && natural(leaf.bytes) && leaf.bytes > 0 && leaf.bytes <= MAX_LEAF_BYTES && digest(leaf.decoded_sha256) && natural(leaf.decoded_bytes) && leaf.decoded_bytes > 0 && leaf.decoded_bytes <= MAX_DECODED_LEAF_BYTES && leaf.encoding === 'gzip', 'Invalid reading-help leaf reference.');
    corpusUrl(leaf.url, catalogue.url);
  }
  for (const passage of value.passages) {
    assert(object(passage) && string(passage.unit_id, 1000) && digest(passage.unit_sha256) && string(passage.role, 100) && string(passage.status, 100) && (passage.label === undefined || string(passage.label, 500)) && (passage.paragraph_labels === undefined || Array.isArray(passage.paragraph_labels) && passage.paragraph_labels.length <= 30 && passage.paragraph_labels.every(item => string(item, 100))) && (passage.abbreviations === undefined || Array.isArray(passage.abbreviations) && passage.abbreviations.length <= 512 && passage.abbreviations.every(item => string(item, 100))) && Array.isArray(passage.pages) && passage.pages.every(page => natural(page) && page > 0) && natural(passage.segment_ordinal) && natural(passage.segment_count) && passage.segment_count > 0 && passage.segment_count <= 2000 && passage.segment_ordinal < passage.segment_count && string(passage.leaf_url, 1000) && digest(passage.leaf_sha256) && natural(passage.leaf_bytes) && value.leaves.some((leaf: CorpusRef) => leaf.url === passage.leaf_url && leaf.sha256 === passage.leaf_sha256 && leaf.bytes === passage.leaf_bytes), 'Invalid reading-help passage reference.');
  }
  if (value.abbreviation_definitions !== undefined) {
    const passages = value.passages as PassageRef[];
    assert(Array.isArray(value.abbreviation_definitions) && value.abbreviation_definitions.length <= 1000 && value.abbreviation_definitions.every(row => object(row) && string(row.term, 100) && string(row.expansion, 500) && string(row.passage_id, 1000) && string(row.scope, 100) && string(row.status, 100) && passages.some(passage => passage.unit_id === row.passage_id)), 'Invalid proposed abbreviation definitions.');
  }
  if (value.repeated_phrase_proposals !== undefined) {
    assert(Array.isArray(value.repeated_phrase_proposals) && value.repeated_phrase_proposals.length <= 100 && value.repeated_phrase_proposals.every(row => object(row) && string(row.literal, 300) && natural(row.passage_count) && row.passage_count > 0 && row.meaning === null && string(row.scope, 100) && string(row.status, 100)), 'Invalid repeated phrase proposals.');
  }
  return { index: value as DocumentIndex, document, catalogue, url };
}

function sourceSlice(page: string, start: number, end: number): string {
  const bytes = encoder.encode(page);
  assert(natural(start) && natural(end) && end > start && end <= bytes.byteLength, 'Reading-help source span exceeds its page.');
  return decoder.decode(bytes.subarray(start, end));
}

export async function loadCorpusPassage(document: LoadedDocument, unitId: string, signal?: AbortSignal): Promise<LoadedPassage> {
  const refs = document.index.passages.filter(item => item.unit_id === unitId).sort((a, b) => a.segment_ordinal - b.segment_ordinal);
  assert(refs.length > 0, 'Reading-help passage is not listed in this document.');
  assert(refs.length <= 32, 'Selected reading-help passage exceeds the 32-segment working limit. Other passages remain available.');
  assert(refs.length === refs[0].segment_count && refs.every((row, ordinal) => row.segment_ordinal === ordinal && row.segment_count === refs.length && row.unit_sha256 === refs[0].unit_sha256), 'Reading-help passage has incomplete ordered segments.');
  const metrics: LoadMetrics = { fetched_bytes: 0, fetched_files: 0, cache_hits: 0 };
  const leaves = new Map<string, { passages: CorpusPassage[] }>();
  for (const ref of refs) {
    if (leaves.has(ref.leaf_url)) continue;
    const leafRef = document.index.leaves.find(item => item.url === ref.leaf_url && item.sha256 === ref.leaf_sha256);
    assert(leafRef, 'Reading-help leaf is not bound by the document index.');
    const compressed = await verified(leafRef, corpusUrl(leafRef.url, document.catalogue.url), MAX_LEAF_BYTES, signal, metrics);
    assert(typeof DecompressionStream !== 'undefined', 'This browser cannot open gzip reading-help leaves.');
    const decoded = await limited(new Blob([new Uint8Array(compressed)]).stream().pipeThrough(new DecompressionStream('gzip')), MAX_DECODED_LEAF_BYTES);
    assert(decoded.byteLength === leafRef.decoded_bytes && await sha256Hex(decoded) === leafRef.decoded_sha256, 'Decoded reading-help leaf differs from its bound SHA-256.');
    const value: unknown = JSON.parse(decoder.decode(decoded));
    assert(object(value) && value.schema === 'okf-reading-help.v2' && value.family === document.index.family && value.document_id === document.index.document_id && value.source_sha256 === document.index.source.sha256 && value.extraction_sha256 === document.index.extraction.sha256 && value.rules_sha256 === document.index.rules_sha256 && Array.isArray(value.passages), 'Reading-help leaf identity differs from its document.');
    leaves.set(ref.leaf_url, value as { passages: CorpusPassage[] });
  }
  const segments = refs.map(ref => {
    const rows = leaves.get(ref.leaf_url)?.passages.filter(row => row.id === unitId && row.segment?.ordinal === ref.segment_ordinal) ?? [];
    assert(rows.length === 1, 'Reading-help leaf lacks its exact passage segment.');
    const row = rows[0];
    assert(row.unit_sha256 === ref.unit_sha256 && row.segment_count === refs.length && row.role === ref.role && row.status === ref.status && object(row.segment) && natural(row.segment.start_utf8) && natural(row.segment.end_utf8) && typeof row.segment.text === 'string' && row.segment.text.length <= MAX_DECODED_LEAF_BYTES && digest(row.segment.sha256) && Array.isArray(row.source_spans) && Array.isArray(row.occurrences) && Array.isArray(row.cards) && Array.isArray(row.reference_list_segments), 'Reading-help passage segment differs from its index.');
    return row;
  });
  const extraction = document.index.extraction;
  const extractionBytes = await verified(extraction, corpusUrl(extraction.url, document.catalogue.url, true), MAX_EXTRACTION_BYTES, signal, metrics);
  const source: unknown = JSON.parse(decoder.decode(extractionBytes));
  assert(object(source) && source.document_id === document.index.document_id && source.source_sha256 === document.index.source.sha256 && Array.isArray(source.pages), 'Frozen page extraction identity differs from the document.');
  const pages = new Map<number, string>();
  for (const page of source.pages) if (object(page) && natural(page.page) && typeof page.text === 'string') pages.set(page.page, page.text);
  let text = '';
  const occurrences: CorpusOccurrence[] = [], cards: CorpusCard[] = [];
  const sourceSpans = segments[0].source_spans;
  assert(sourceSpans.length <= 1000 && segments.every(row => JSON.stringify(row.source_spans) === JSON.stringify(sourceSpans)) && (sourceSpans.length > 0 || segments.every(row => row.status === 'extraction_blocked' && !row.segment.text)), 'Reading-help continuation source spans disagree.');
  const sourcePieces: string[] = [];
  for (const span of sourceSpans) {
    assert(object(span) && natural(span.page) && digest(span.literal_sha256) && pages.has(span.page), 'Reading-help source span has no frozen page.');
    const part = sourceSlice(pages.get(span.page)!, span.start_utf8, span.end_utf8);
    assert(await sha256Hex(encoder.encode(part)) === span.literal_sha256, 'Reading-help source span differs from the frozen page.');
    sourcePieces.push(part);
  }
  for (const row of segments) {
    assert(row.segment.start_utf8 === encoder.encode(text).byteLength && row.segment.end_utf8 === row.segment.start_utf8 + encoder.encode(row.segment.text).byteLength && await sha256Hex(encoder.encode(row.segment.text)) === row.segment.sha256, 'Reading-help segment offset or hash differs.');
    for (const occurrence of row.occurrences) {
      assert(object(occurrence) && string(occurrence.id, 160) && occurrence.passage_id === unitId && pages.has(occurrence.page) && string(occurrence.literal, 300) && digest(occurrence.literal_sha256) && sourceSpans.some(span => span.page === occurrence.page && occurrence.start_utf8 >= span.start_utf8 && occurrence.end_utf8 <= span.end_utf8), 'Reading-help occurrence is outside the selected source segment.');
      assert(sourceSlice(pages.get(occurrence.page)!, occurrence.start_utf8, occurrence.end_utf8) === occurrence.literal && await sha256Hex(encoder.encode(occurrence.literal)) === occurrence.literal_sha256, 'Reading-help occurrence differs from its frozen page.');
      assert(!occurrences.some(item => item.id === occurrence.id), 'Duplicate reading-help occurrence.');
      occurrences.push(occurrence);
    }
    for (const card of row.cards) {
      assert(object(card) && string(card.id, 160) && occurrences.some(item => item.id === card.occurrence_id) && string(card.status, 100), 'Reading-help card has no exact selected occurrence.');
      cards.push(card);
    }
    for (const reference of row.reference_list_segments) {
      assert(object(reference) && string(reference.occurrence_id, 160) && reference.passage_id === unitId && string(reference.marker, 100) && natural(reference.page) && pages.has(reference.page) && string(reference.literal, 1000) && digest(reference.literal_sha256) && string(reference.status, 100) && Array.isArray(reference.body_occurrence_ids) && reference.body_occurrence_ids.length <= 100 && reference.body_occurrence_ids.every(id => string(id, 160)) && (reference.target === undefined || validCrossTarget(reference.target, document.catalogue.url)) && sourceSpans.some(span => span.page === reference.page && reference.start_utf8 >= span.start_utf8 && reference.end_utf8 <= span.end_utf8), 'Printed reference row is outside its selected source span or has an invalid target.');
      assert(sourceSlice(pages.get(reference.page)!, reference.start_utf8, reference.end_utf8) === reference.literal && await sha256Hex(encoder.encode(reference.literal)) === reference.literal_sha256, 'Printed reference row differs from the frozen page.');
    }
    text += row.segment.text;
  }
  assert(segments.every(row => row.text_sha256 === segments[0].text_sha256) && await sha256Hex(encoder.encode(text)) === segments[0].text_sha256, 'Joined reading-help passage differs from its bound SHA-256.');
  assert(sourcePieces.join('\n') === text, 'Joined reading-help passage differs from its exact frozen source spans.');
  const orderedOccurrences = [...occurrences].sort((a, b) => a.page - b.page || a.start_utf8 - b.start_utf8);
  assert(orderedOccurrences.every((row, index) => index === 0 || row.page !== orderedOccurrences[index - 1].page || row.start_utf8 >= orderedOccurrences[index - 1].end_utf8), 'Reading-help occurrences overlap.');
  return { document, id: unitId, text, segments, occurrences, cards, sourcePages: pages, leafCount: leaves.size, metrics };
}

export function corpusParts(loaded: LoadedPassage, span: CorpusSpan): CorpusPart[] {
  const page = loaded.sourcePages.get(span.page);
  assert(page !== undefined, 'Reading-help source page is missing.');
  const bytes = encoder.encode(page);
  const decode = (start: number, end: number) => decoder.decode(bytes.subarray(start, end));
  const rows = loaded.occurrences.filter(row => row.page === span.page && row.start_utf8 >= span.start_utf8 && row.end_utf8 <= span.end_utf8).sort((a, b) => a.start_utf8 - b.start_utf8);
  const parts: CorpusPart[] = [];
  let cursor = span.start_utf8;
  for (const row of rows) {
    assert(row.start_utf8 >= cursor, 'Reading-help occurrences overlap.');
    if (row.start_utf8 > cursor) parts.push({ text: decode(cursor, row.start_utf8) });
    parts.push({ text: row.literal, occurrence: row });
    cursor = row.end_utf8;
  }
  if (cursor < span.end_utf8) parts.push({ text: decode(cursor, span.end_utf8) });
  return parts;
}

export function crossTargets(passage: LoadedPassage): CrossTarget[] {
  const result: CrossTarget[] = [];
  for (const segment of passage.segments) for (const item of segment.reference_list_segments) {
    if (item.target) result.push(item.target);
  }
  return result;
}

export async function loadCrossTarget(catalogue: LoadedCatalogue, target: CrossTarget, signal?: AbortSignal): Promise<LoadedPassage> {
  assert(validCrossTarget(target, catalogue.url), 'Cross-document target is invalid or unsafe.');
  const documents = catalogue.catalogue.documents.filter(item => item.document_id === target.document_id);
  assert(documents.length === 1, 'Cross-document target is ambiguous or unavailable.');
  const document = await loadDocument(catalogue, documents[0].family, target.document_id, signal);
  assert(document.index.passages.some(row => row.unit_id === target.passage_id && row.leaf_url === target.leaf_url && row.leaf_sha256 === target.leaf_sha256), 'Cross-document target leaf does not match its index.');
  const passage = await loadCorpusPassage(document, target.passage_id, signal);
  assert(passage.occurrences.some(row => row.id === target.occurrence_id), 'Cross-document target occurrence is unavailable.');
  return passage;
}
