import { manifestUrl, packageUrl } from './workbench';
import { sha256Hex } from '$lib/sources/releaseDataPlane';

const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-z0-9][a-z0-9._:-]*$/;
export type Span = { page: number; page_start_utf8: number; page_end_utf8: number; literal_sha256: string; literal?: string };
export type Source = { id: string; pages_url: string; pages_sha256: string; pdf_url: string; pdf_sha256: string };
export type Passage = { id: string; label: string; source_id: string; spans: Span[] };
export type Occurrence = Span & { id: string; passage_id: string; source_id: string; literal: string; role: string };
export type Support = Span & { source_id: string; quote: string };
export type Card = { id: string; kind: string; title: string; body: string; authority: string; review_status: string; source_support: Support[]; target: { status: 'resolved' | 'unresolved'; id?: string; label?: string; url?: string }; proposal_ids: string[]; occurrence_ids: string[] };
export type Manifest = { schema: 'okf-reading-help.v1'; sources: Source[]; passages: Passage[]; occurrences: Occurrence[]; cards: Card[]; limitations: string[]; scope: string; status: string; review_overlay: Array<{ correction: string; disposition: string; issue: string; proposal_id: string }>; proposal_inputs: Record<string, { path: string; sha256: string }> };
export type Page = { page: number; text: string; url: string };
export type Loaded = { manifest: Manifest; url: URL; sha256: string; pages: Map<string, Map<number, Page>> };
export type Part = { text: string; occurrence?: Occurrence };

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 2000): v is string => typeof v === 'string' && !!v.trim() && v.length <= max;
const id = (v: unknown): v is string => str(v, 160) && ID.test(v);
const hash = (v: unknown): v is string => typeof v === 'string' && HASH.test(v);
const nat = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const strings = (v: unknown, max = 100): v is string[] => Array.isArray(v) && v.length <= max && v.every(x => str(x, 1000));
const keys = (v: Record<string, unknown>, required: string[], optional: string[] = []) => required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k) || optional.includes(k));
const span = (v: unknown): boolean => obj(v) && nat(v.page) && v.page > 0 && nat(v.page_start_utf8) && nat(v.page_end_utf8) && v.page_end_utf8 > v.page_start_utf8 && hash(v.literal_sha256);
function pdf(raw: unknown): string {
  if (!str(raw, 1000)) throw new Error('Invalid source PDF URL.');
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !/\.pdf$/i.test(url.pathname)) throw new Error('Source PDF must be a credential-free HTTPS PDF URL.');
  return url.href;
}
function targetUrl(raw: unknown): boolean {
  if (!str(raw, 1000)) return false;
  try { const url = new URL(raw); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function parseManifest(v: unknown, url: URL): Manifest {
  if (!obj(v) || !keys(v, ['schema', 'sources', 'passages', 'occurrences', 'cards', 'limitations', 'scope', 'status', 'review_overlay', 'proposal_inputs']) || v.schema !== 'okf-reading-help.v1' || !Array.isArray(v.sources) || v.sources.length < 1 || v.sources.length > 8 || !Array.isArray(v.passages) || v.passages.length < 1 || v.passages.length > 12 || !Array.isArray(v.occurrences) || v.occurrences.length > 200 || !Array.isArray(v.cards) || v.cards.length > 100 || !strings(v.limitations, 30) || !str(v.scope, 300) || !str(v.status, 100) || !Array.isArray(v.review_overlay) || v.review_overlay.length > 30 || !v.review_overlay.every((r: unknown) => obj(r) && str(r.correction) && str(r.disposition, 100) && str(r.issue, 100) && str(r.proposal_id, 100)) || !obj(v.proposal_inputs) || Object.values(v.proposal_inputs).some(r => !obj(r) || !str(r.path, 1000) || !hash(r.sha256))) throw new Error('Unsupported reading-help manifest.');
  const sourceIds = new Set<string>(), passageIds = new Set<string>(), cardIds = new Set<string>(), occurrenceIds = new Set<string>();
  for (const row of v.sources) {
    if (!obj(row) || !keys(row, ['id', 'pages_url', 'pages_sha256', 'pdf_url', 'pdf_sha256']) || !id(row.id) || sourceIds.has(row.id) || !str(row.pages_url, 1000) || !hash(row.pages_sha256) || !hash(row.pdf_sha256)) throw new Error('Invalid reading-help source.');
    packageUrl(row.pages_url, url); pdf(row.pdf_url); sourceIds.add(row.id);
  }
  for (const row of v.passages) {
    if (!obj(row) || !keys(row, ['id', 'label', 'source_id', 'spans']) || !id(row.id) || passageIds.has(row.id) || !str(row.label, 300) || !sourceIds.has(String(row.source_id)) || !Array.isArray(row.spans) || row.spans.length < 1 || row.spans.length > 16 || !row.spans.every((s: unknown) => obj(s) && keys(s, ['page', 'page_start_utf8', 'page_end_utf8', 'literal_sha256', 'literal']) && span(s) && str(s.literal, 10000))) throw new Error('Invalid reading-help passage.');
    let previousPage = 0, previousEnd = 0;
    for (const s of row.spans as Span[]) { if (s.page < previousPage || (s.page === previousPage && s.page_start_utf8 < previousEnd)) throw new Error('Reading-help passage spans overlap or are out of order.'); previousPage = s.page; previousEnd = s.page_end_utf8; }
    passageIds.add(row.id);
  }
  for (const row of v.cards) {
    if (!obj(row) || !keys(row, ['id', 'kind', 'title', 'body', 'authority', 'review_status', 'source_support', 'target', 'proposal_ids', 'occurrence_ids']) || !id(row.id) || cardIds.has(row.id) || !['expansion', 'source_definition_pointer', 'model_explanation', 'citation_navigation', 'unresolved_reference'].includes(String(row.kind)) || !str(row.title, 300) || !str(row.body, 3000) || !['source-backed-expansion-with-project-authored-context', 'project-authored-reading-explanation', 'source-pointer-with-project-authored-explanation', 'source-defect-observation'].includes(String(row.authority)) || !['unreviewed', 'unresolved'].includes(String(row.review_status)) || !Array.isArray(row.source_support) || row.source_support.length < 1 || row.source_support.length > 16 || !row.source_support.every((s: unknown) => obj(s) && keys(s, ['source_id', 'page', 'page_start_utf8', 'page_end_utf8', 'quote', 'literal_sha256']) && span(s) && sourceIds.has(String(s.source_id)) && str(s.quote, 2000)) || !obj(row.target) || !keys(row.target, ['status', 'label'], ['id', 'url']) || !['resolved', 'unresolved'].includes(String(row.target.status)) || !str(row.target.label, 300) || (row.target.id !== undefined && (row.target.status !== 'resolved' || !id(row.target.id))) || (row.target.url !== undefined && (row.target.status !== 'resolved' || !targetUrl(row.target.url))) || !strings(row.proposal_ids, 30) || !strings(row.occurrence_ids, 30)) throw new Error('Invalid reading-help card.');
    cardIds.add(row.id);
  }
  for (const row of v.occurrences) {
    if (!obj(row) || !keys(row, ['id', 'literal', 'literal_sha256', 'page', 'page_start_utf8', 'page_end_utf8', 'passage_id', 'role', 'source_id']) || !span(row) || !id(row.id) || occurrenceIds.has(row.id) || !passageIds.has(String(row.passage_id)) || !sourceIds.has(String(row.source_id)) || !str(row.literal, 200) || !['abbreviation', 'source_marker', 'condition_number', 'word', 'manual_pointer', 'note_number', 'numbered_alternative', 'unresolved_reference_marker'].includes(String(row.role))) throw new Error('Invalid reading-help occurrence.');
    const passage = (v.passages as Passage[]).find(p => p.id === row.passage_id)!;
    const occurrence = row as unknown as Occurrence;
    if (passage.source_id !== occurrence.source_id || !passage.spans.some(s => s.page === occurrence.page && occurrence.page_start_utf8 >= s.page_start_utf8 && occurrence.page_end_utf8 <= s.page_end_utf8)) throw new Error('Reading-help occurrence is outside its passage.');
    occurrenceIds.add(row.id);
  }
  for (const card of v.cards as Card[]) {
    if (!card.occurrence_ids.length || new Set(card.occurrence_ids).size !== card.occurrence_ids.length || card.occurrence_ids.some(occurrenceId => !occurrenceIds.has(occurrenceId))) throw new Error('Reading-help card has an unknown or duplicate occurrence.');
    if (card.target.status === 'resolved' && ((!!card.target.id === !!card.target.url) || (card.target.id !== undefined && !passageIds.has(card.target.id)))) throw new Error('Resolved reading-help target is unavailable.');
    for (const occurrenceId of card.occurrence_ids) {
      const occurrence = (v.occurrences as Occurrence[]).find(row => row.id === occurrenceId)!;
      if (!card.source_support.some(row => row.source_id === occurrence.source_id && row.page === occurrence.page && row.page_start_utf8 <= occurrence.page_start_utf8 && row.page_end_utf8 >= occurrence.page_end_utf8)) throw new Error('Reading-help card support does not contain its selected occurrence.');
    }
  }
  return v as Manifest;
}
async function bytes(url: URL, max: number, signal?: AbortSignal): Promise<Uint8Array> {
  const active = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const response = await fetch(url, { signal: active, cache: 'no-store', credentials: 'omit' });
  if (!response.ok || response.url !== url.href) { await response.body?.cancel(); throw new Error('Reading-help source failed or redirected.'); }
  if (Number(response.headers.get('content-length') || 0) > max) { await response.body?.cancel(); throw new Error('Reading-help source exceeds the byte limit.'); }
  const reader = response.body?.getReader(); if (!reader) throw new Error('Reading-help source is empty.');
  const chunks: Uint8Array[] = []; let count = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; count += part.value.byteLength; if (count > max) throw new Error('Reading-help source exceeds the byte limit.'); chunks.push(part.value); } }
  catch (error) { await reader.cancel().catch(() => {}); throw error; } finally { reader.releaseLock(); }
  const result = new Uint8Array(count); let at = 0; for (const chunk of chunks) { result.set(chunk, at); at += chunk.byteLength; } return result;
}
function slice(page: Page, s: Span): string {
  const encoded = new TextEncoder().encode(page.text);
  if (s.page_end_utf8 > encoded.length) throw new Error('Reading-help span exceeds its source page.');
  return new TextDecoder('utf-8', { fatal: true }).decode(encoded.subarray(s.page_start_utf8, s.page_end_utf8));
}
async function check(page: Page, s: Span, literal?: string): Promise<string> {
  const text = slice(page, s);
  if ((literal !== undefined && text !== literal) || await sha256Hex(new TextEncoder().encode(text)) !== s.literal_sha256) throw new Error('Reading-help literal differs from frozen source bytes.');
  return text;
}
export async function loadReadingHelp(raw: string, base: string, signal?: AbortSignal): Promise<Loaded> {
  const url = manifestUrl(raw, base), manifestBytes = await bytes(url, 256 * 1024, signal);
  const manifest = parseManifest(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes)), url);
  const pages = new Map<string, Map<number, Page>>();
  for (const source of manifest.sources) {
    const data = await bytes(packageUrl(source.pages_url, url), 4 * 1024 * 1024, signal);
    if (await sha256Hex(data) !== source.pages_sha256) throw new Error(`Frozen page JSON SHA-256 differs for ${source.id}.`);
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
    if (!obj(value) || value.document_id !== source.id || value.source_url !== source.pdf_url || value.source_sha256 !== source.pdf_sha256 || !Array.isArray(value.pages) || value.pages.length > 1000) throw new Error(`Frozen source identity differs for ${source.id}.`);
    const entries = new Map<number, Page>();
    for (const page of value.pages) {
      if (!obj(page) || !nat(page.page) || page.page < 1 || entries.has(page.page) || typeof page.text !== 'string' || page.url !== `${source.pdf_url}#page=${page.page}`) throw new Error(`Invalid frozen page for ${source.id}.`);
      entries.set(page.page, page as Page);
    }
    pages.set(source.id, entries);
  }
  const page = (sourceId: string, n: number) => { const found = pages.get(sourceId)?.get(n); if (!found) throw new Error('Reading-help source page is missing.'); return found; };
  for (const p of manifest.passages) for (const s of p.spans) await check(page(p.source_id, s.page), s, s.literal);
  for (const o of manifest.occurrences) await check(page(o.source_id, o.page), o, o.literal);
  for (const c of manifest.cards) for (const s of c.source_support) await check(page(s.source_id, s.page), s, s.quote);
  for (const p of manifest.passages) for (const s of p.spans) {
    const rows = manifest.occurrences.filter(o => o.passage_id === p.id && o.page === s.page && o.page_start_utf8 >= s.page_start_utf8 && o.page_end_utf8 <= s.page_end_utf8).sort((a, b) => a.page_start_utf8 - b.page_start_utf8);
    if (rows.some((o, i) => i > 0 && o.page_start_utf8 < rows[i - 1].page_end_utf8)) throw new Error('Reading-help occurrences overlap.');
  }
  return { manifest, url, sha256: await sha256Hex(manifestBytes), pages };
}
export function parts(loaded: Loaded, passage: Passage, s: Span): Part[] {
  const page = loaded.pages.get(passage.source_id)?.get(s.page); if (!page) throw new Error('Reading-help source page is missing.');
  const encoded = new TextEncoder().encode(page.text), decode = (a: number, b: number) => new TextDecoder('utf-8', { fatal: true }).decode(encoded.subarray(a, b));
  const rows = loaded.manifest.occurrences.filter(o => o.passage_id === passage.id && o.page === s.page && o.page_start_utf8 >= s.page_start_utf8 && o.page_end_utf8 <= s.page_end_utf8).sort((a, b) => a.page_start_utf8 - b.page_start_utf8);
  const result: Part[] = []; let cursor = s.page_start_utf8;
  for (const row of rows) { if (row.page_start_utf8 > cursor) result.push({ text: decode(cursor, row.page_start_utf8) }); result.push({ text: decode(row.page_start_utf8, row.page_end_utf8), occurrence: row }); cursor = row.page_end_utf8; }
  if (cursor < s.page_end_utf8) result.push({ text: decode(cursor, s.page_end_utf8) }); return result;
}
