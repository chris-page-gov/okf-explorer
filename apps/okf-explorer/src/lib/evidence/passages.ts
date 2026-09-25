import { manifestUrl, packageUrl } from './workbench';
import { sha256Hex } from '$lib/sources/releaseDataPlane';

export const PASSAGE_SCHEMA = 'okf-passage-boundary-review.v1';
export const MAX_PASSAGE_MANIFEST_BYTES = 512 * 1024;
export const MAX_CORRECTION_BYTES = 512 * 1024;
export const MAX_EXTRACTION_BYTES = 4 * 1024 * 1024;
export const MAX_PDF_BYTES = 16 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[a-z0-9][a-z0-9._:-]*$/;

export type Span = { page: number; start_utf8: number; end_utf8: number; literal_sha256?: string };
export type PassageUnit = { id: string; role: string; paragraph_labels: string[]; spans: Span[]; joiner: string; text_sha256: string; text?: string; text_bytes?: number; boundary_status?: string; completeness?: string };
export type PassageCase = {
  id: string; label: string;
  document: {
    id: string; version: string;
    pdf: { url: string; sha256: string; repository_path?: string; delivery_url?: string };
    extraction: { url: string; sha256: string; source_path?: string; source_sha256?: string };
    baseline_sha256: string;
    parser: { version: string; ruleset_version: string; settings_sha256: string; settings_text?: string; applied_rules: string[]; implementation_bindings?: Record<string, string> };
    family?: string; source_role?: string;
  };
  pages: Array<{ number: number; start_utf8: number; end_utf8: number }>;
  before: PassageUnit[]; after: PassageUnit[]; successor_after?: PassageUnit[];
  observation: { method: string; classification: string; rationale: string; uncertainty: string; finding_status?: string; source_links: Array<{ page: number; start_utf8: number; end_utf8: number; literal: string; literal_sha256: string; pdf_url: string }> };
  review: { status: string; specialist_review?: string; legal_answerability?: string };
  technical_outcome?: { status: 'corrected' | 'partial' | 'unresolved'; target_boundary: 'corrected' | 'partial' | 'unresolved'; rationale: string; residual_structural_findings: string[]; legal_answerability: string };
  coverage?: { candidate_bytes_outside_old_passage: number; covered_once_bytes: number; old_passage_bytes: number; scope: string };
  impact?: { document_unit_count_before?: number; document_unit_count_after?: number; corpus_unit_count_before?: number; corpus_unit_count_after?: number; dependencies?: string[]; discovery_records?: string[]; question_packages?: string[]; budget_omissions?: string[] };
};
export type CaseReference = { id: string; label: string; url: string; sha256: string; bytes: number; document_id: string; classification: string; review_status: string; technical_outcome?: 'corrected' | 'partial' | 'unresolved' };
export type PassageManifest = { schema: 'okf-passage-boundary-review-manifest.v1'; title: string; cases: CaseReference[]; baseline_commit: string; status: string; source: Record<string, string>; impact: Record<string, unknown>; limits: string[]; candidate_comparison?: Record<string, unknown>; successor_case_differences?: string[] };
export type LoadedCase = { source: Uint8Array; text: string; before: Array<{ unit: PassageUnit; text: string }>; after: Array<{ unit: PassageUnit; text: string }>; successorAfter?: Array<{ unit: PassageUnit; text: string }> };
export type Correction = { schema: 'okf-passage-correction.v1'; id: string; version: string; case_id: string; source_sha256: string; baseline_sha256: string; operation: 'split' | 'join' | 'role-change'; rationale: string; uncertainty: string; added_spans: Span[]; units: PassageUnit[] };
export type Preview = { accepted: boolean; checks: string[]; error?: string; before: PassageUnit[]; after: PassageUnit[]; migration: Array<{ from: string; to: string[]; status: 'mapped' | 'unresolved' }>; impact: Record<string, unknown> };

function obj(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function str(value: unknown, max = 2000): value is string { return typeof value === 'string' && !!value.trim() && value.length <= max; }
function list(value: unknown, max = 100): value is string[] { return Array.isArray(value) && value.length <= max && value.every(item => str(item, 1000)); }
function hash(value: unknown): value is string { return typeof value === 'string' && HASH.test(value); }
function offset(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0; }
function localSourcePath(value: unknown): value is string {
  return str(value, 1000) && !value.startsWith('/') && !value.includes('\\') && value.split('/').every(part => part && part !== '.' && part !== '..');
}
function roleCounts(value: unknown): boolean { return obj(value) && Object.keys(value).length <= 100 && Object.entries(value).every(([role, count]) => str(role, 100) && offset(count)); }
function keys(value: Record<string, unknown>, required: string[], optional: string[] = []): boolean {
  return required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}
function safePdf(value: unknown, base: URL): string {
  if (!str(value, 1000)) throw new Error('Invalid PDF URL.');
  const url = new URL(value, base);
  if (url.username || url.password || url.search || url.hash || !['https:', 'http:'].includes(url.protocol) ||
    (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) || !/\.pdf$/i.test(url.pathname)) throw new Error('PDF URL must be a credential-free PDF location.');
  return url.href;
}
function validUnit(value: unknown): value is PassageUnit {
  return obj(value) && keys(value, ['id', 'role', 'paragraph_labels', 'spans', 'joiner', 'text_sha256'], ['text', 'text_bytes', 'boundary_status', 'completeness']) && str(value.id, 500) &&
    str(value.role, 100) && list(value.paragraph_labels, 30) && Array.isArray(value.spans) && value.spans.length > 0 && value.spans.length <= 100 &&
    value.spans.every(span => obj(span) && keys(span, ['page', 'start_utf8', 'end_utf8'], ['literal_sha256']) && Number.isSafeInteger(span.page) && Number(span.page) > 0 && offset(span.start_utf8) && offset(span.end_utf8) && Number(span.end_utf8) > Number(span.start_utf8) && (span.literal_sha256 === undefined || hash(span.literal_sha256))) &&
    typeof value.joiner === 'string' && /^[\t\n\r ]{0,10}$/.test(value.joiner) && hash(value.text_sha256) && (value.text === undefined || typeof value.text === 'string' && value.text.length <= MAX_PASSAGE_MANIFEST_BYTES) && (value.text_bytes === undefined || offset(value.text_bytes)) &&
    (value.boundary_status === undefined || str(value.boundary_status, 100)) && (value.completeness === undefined || str(value.completeness, 100));
}
function validUnits(value: unknown): value is PassageUnit[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 && value.every(validUnit) && new Set(value.map(unit => unit.id)).size === value.length;
}
function validImpact(value: unknown): boolean {
  if (!obj(value) || !keys(value, [], ['added_ids', 'authored_units_exact', 'baseline_units', 'candidate_units', 'changed_documents', 'documents', 'historical_amendments_changed', 'identity_migration', 'identity_migration_status', 'original_source_bytes', 'removed_ids', 'substantive_chapters_changed'])) return false;
  if (['added_ids', 'authored_units_exact', 'baseline_units', 'candidate_units', 'changed_documents', 'documents', 'historical_amendments_changed', 'original_source_bytes', 'removed_ids'].some(key => value[key] !== undefined && !offset(value[key]))) return false;
  if (value.identity_migration !== undefined && (!obj(value.identity_migration) || !keys(value.identity_migration, ['url', 'sha256', 'bytes']) || !str(value.identity_migration.url, 1000) || !hash(value.identity_migration.sha256) || !offset(value.identity_migration.bytes))) return false;
  if (value.identity_migration_status !== undefined && !str(value.identity_migration_status, 100)) return false;
  return value.substantive_chapters_changed === undefined || Array.isArray(value.substantive_chapters_changed) && value.substantive_chapters_changed.length <= 100 && value.substantive_chapters_changed.every(row => obj(row) && keys(row, ['document_id', 'family', 'source_role', 'before_units', 'after_units', 'added_ids', 'removed_ids', 'unchanged_record_ids', 'before_roles', 'after_roles']) && str(row.document_id, 300) && str(row.family, 100) && str(row.source_role, 100) && ['before_units', 'after_units', 'added_ids', 'removed_ids', 'unchanged_record_ids'].every(key => offset(row[key])) && roleCounts(row.before_roles) && roleCounts(row.after_roles));
}
function validComparison(value: unknown): boolean {
  if (!obj(value) || !keys(value, [], ['status', 'parser_version', 'identity_version', 'ruleset_version', 'settings_sha256', 'settings_text', 'implementation_bindings_sha256', 'changed_documents', 'historical_amendments_changed', 'substantive_chapters_changed', 'candidate_units', 'case_outputs_sha256'])) return false;
  if (['changed_documents', 'historical_amendments_changed', 'substantive_chapters_changed', 'candidate_units'].some(key => value[key] !== undefined && !offset(value[key]))) return false;
  if (['status', 'parser_version', 'identity_version', 'ruleset_version'].some(key => value[key] !== undefined && !str(value[key], 200))) return false;
  return !['settings_sha256', 'implementation_bindings_sha256', 'case_outputs_sha256'].some(key => value[key] !== undefined && !hash(value[key])) && (value.settings_text === undefined || typeof value.settings_text === 'string' && new TextEncoder().encode(value.settings_text).byteLength <= 65536);
}
function validCaseImpact(value: unknown): boolean {
  if (!obj(value) || !keys(value, [], ['document_unit_count_before', 'document_unit_count_after', 'corpus_unit_count_before', 'corpus_unit_count_after', 'dependencies', 'discovery_records', 'question_packages', 'budget_omissions'])) return false;
  if (['document_unit_count_before', 'document_unit_count_after', 'corpus_unit_count_before', 'corpus_unit_count_after'].some(key => value[key] !== undefined && !offset(value[key]))) return false;
  return !['dependencies', 'discovery_records', 'question_packages', 'budget_omissions'].some(key => value[key] !== undefined && !list(value[key], 100));
}
export function parsePassageManifest(value: unknown, source: URL): PassageManifest {
  if (!obj(value) || !keys(value, ['schema', 'title', 'cases', 'baseline_commit', 'status', 'source', 'impact', 'limits'], ['candidate_comparison', 'successor_case_differences']) || value.schema !== 'okf-passage-boundary-review-manifest.v1' || !str(value.title, 300) ||
    !str(value.baseline_commit, 100) || !str(value.status, 100) || !obj(value.source) || Object.keys(value.source).length > 30 || Object.entries(value.source).some(([name, digest]) => !/^[a-z][a-z0-9_]*_sha256$/.test(name) || !hash(digest)) ||
    !validImpact(value.impact) || !Array.isArray(value.limits) || !list(value.limits, 30) ||
    (value.candidate_comparison !== undefined && !validComparison(value.candidate_comparison)) ||
    (value.successor_case_differences !== undefined && (!Array.isArray(value.successor_case_differences) || value.successor_case_differences.length > 100 || value.successor_case_differences.some(id => !str(id, 100) || !ID.test(id)))) ||
    !Array.isArray(value.cases) || value.cases.length < 1 || value.cases.length > 100) throw new Error('Unsupported passage review manifest.');
  const ids = new Set<string>();
  for (const item of value.cases) {
    if (!obj(item) || !keys(item, ['id', 'label', 'url', 'sha256', 'bytes', 'document_id', 'classification', 'review_status'], ['technical_outcome']) ||
      !str(item.id, 100) || !ID.test(item.id) || ids.has(item.id) || !str(item.label, 300) || !str(item.document_id, 300) || !str(item.classification, 100) || !str(item.review_status, 100) || !hash(item.sha256) || !offset(item.bytes) || item.bytes > MAX_PASSAGE_MANIFEST_BYTES) throw new Error('Invalid or duplicate passage case.');
    if (item.technical_outcome !== undefined && !['corrected', 'partial', 'unresolved'].includes(String(item.technical_outcome))) throw new Error('Invalid case technical outcome.');
    packageUrl(String(item.url), source); ids.add(item.id);
  }
  if (value.successor_case_differences && value.successor_case_differences.some(id => !ids.has(id))) throw new Error('Unknown successor case difference.');
  return value as PassageManifest;
}

export function parsePassageCase(value: unknown, source: URL): PassageCase {
    const item = value;
    if (!obj(item) || !keys(item, ['schema', 'id', 'label', 'document', 'pages', 'before', 'after', 'observation', 'review'], ['impact', 'coverage', 'successor_after', 'technical_outcome']) || item.schema !== PASSAGE_SCHEMA ||
      !str(item.id, 100) || !ID.test(item.id) || !str(item.label, 300) || !obj(item.document)) throw new Error('Invalid passage case.');
    const doc = item.document;
    if (!keys(doc, ['id', 'version', 'pdf', 'extraction', 'baseline_sha256', 'parser'], ['family', 'source_role']) || !str(doc.id, 300) || !str(doc.version, 100) || (doc.family !== undefined && !str(doc.family, 100)) || (doc.source_role !== undefined && !str(doc.source_role, 100)) ||
      !obj(doc.pdf) || !keys(doc.pdf, ['url', 'sha256'], ['repository_path', 'delivery_url']) || !hash(doc.pdf.sha256) || (doc.pdf.repository_path !== undefined && !localSourcePath(doc.pdf.repository_path)) ||
      !obj(doc.extraction) || !keys(doc.extraction, ['url', 'sha256'], ['source_path', 'source_sha256']) || !hash(doc.extraction.sha256) || (doc.extraction.source_path !== undefined && !localSourcePath(doc.extraction.source_path)) || (doc.extraction.source_sha256 !== undefined && !hash(doc.extraction.source_sha256)) ||
      !hash(doc.baseline_sha256) || !obj(doc.parser) || !keys(doc.parser, ['version', 'ruleset_version', 'settings_sha256', 'applied_rules'], ['implementation_bindings', 'settings_text']) ||
      !str(doc.parser.version, 100) || !str(doc.parser.ruleset_version, 100) || !hash(doc.parser.settings_sha256) || !list(doc.parser.applied_rules) ||
      (doc.parser.settings_text !== undefined && (typeof doc.parser.settings_text !== 'string' || new TextEncoder().encode(doc.parser.settings_text).byteLength > 65536)) ||
      (doc.parser.implementation_bindings !== undefined && (!obj(doc.parser.implementation_bindings) || Object.keys(doc.parser.implementation_bindings).length > 30 || Object.entries(doc.parser.implementation_bindings).some(([path, digest]) => !localSourcePath(path) || !hash(digest))))) throw new Error('Invalid passage source identity.');
    const pdf = safePdf(doc.pdf.url, source);
    if (doc.pdf.delivery_url !== undefined) safePdf(doc.pdf.delivery_url, source);
    packageUrl(String(doc.extraction.url), source);
    if (!Array.isArray(item.pages) || !item.pages.length || item.pages.length > 1000 || item.pages.some(page => !obj(page) || !keys(page, ['number', 'start_utf8', 'end_utf8']) || !Number.isSafeInteger(page.number) || Number(page.number) < 1 || !offset(page.start_utf8) || !offset(page.end_utf8) || Number(page.end_utf8) < Number(page.start_utf8))) throw new Error('Invalid page byte ranges.');
    if (!validUnits(item.before) || !validUnits(item.after) || (item.successor_after !== undefined && !validUnits(item.successor_after))) throw new Error('Invalid before, after or successor units.');
    if (!obj(item.observation) || !keys(item.observation, ['method', 'classification', 'rationale', 'uncertainty', 'source_links'], ['finding_status']) ||
      !str(item.observation.method, 200) || !str(item.observation.classification, 200) || !str(item.observation.rationale) ||
      typeof item.observation.uncertainty !== 'string' || item.observation.uncertainty.length > 2000 || (item.observation.finding_status !== undefined && !str(item.observation.finding_status, 100)) || !Array.isArray(item.observation.source_links) || item.observation.source_links.length > 100 || item.observation.source_links.some(link => !obj(link) || !keys(link, ['page', 'start_utf8', 'end_utf8', 'literal', 'literal_sha256', 'pdf_url']) || !Number.isSafeInteger(link.page) || !offset(link.start_utf8) || !offset(link.end_utf8) || !str(link.literal, 1000) || !hash(link.literal_sha256) || link.pdf_url !== `${pdf}#page=${link.page}`)) throw new Error('Invalid source observation.');
    if (!obj(item.review) || !keys(item.review, ['status'], ['specialist_review', 'legal_answerability']) || !str(item.review.status, 100) || (item.review.specialist_review !== undefined && !str(item.review.specialist_review, 100)) || (item.review.legal_answerability !== undefined && !str(item.review.legal_answerability, 100))) throw new Error('Invalid review status.');
    if (item.technical_outcome !== undefined && (!obj(item.technical_outcome) || !keys(item.technical_outcome, ['status', 'target_boundary', 'rationale', 'residual_structural_findings', 'legal_answerability']) || !['corrected', 'partial', 'unresolved'].includes(String(item.technical_outcome.status)) || item.technical_outcome.target_boundary !== item.technical_outcome.status || !str(item.technical_outcome.rationale, 2000) || !list(item.technical_outcome.residual_structural_findings, 100) || !str(item.technical_outcome.legal_answerability, 300))) throw new Error('Invalid technical outcome.');
    if (item.coverage !== undefined && (!obj(item.coverage) || !keys(item.coverage, ['candidate_bytes_outside_old_passage', 'covered_once_bytes', 'old_passage_bytes', 'scope']) || !offset(item.coverage.candidate_bytes_outside_old_passage) || !offset(item.coverage.covered_once_bytes) || !offset(item.coverage.old_passage_bytes) || !str(item.coverage.scope, 300))) throw new Error('Invalid byte coverage evidence.');
    if (item.impact !== undefined && !validCaseImpact(item.impact)) throw new Error('Invalid impact evidence.');
    return item as PassageCase;
}

async function boundedBytes(url: URL, max: number, signal?: AbortSignal): Promise<Uint8Array> {
  const boundedSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const response = await fetch(url, { signal: boundedSignal, cache: 'no-store', credentials: 'omit' });
  if (!response.ok || response.url !== url.href) { await response.body?.cancel(); throw new Error('Source request failed or redirected.'); }
  if (Number(response.headers.get('content-length') || 0) > max) { await response.body?.cancel(); throw new Error('Source exceeds byte limit.'); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Source response is empty.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > max) throw new Error('Source exceeds byte limit.');
      chunks.push(part.value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
  return bytes;
}
export async function loadPassageManifest(raw: string, base: string, signal?: AbortSignal) {
  const url = manifestUrl(raw, base);
  const bytes = await boundedBytes(url, MAX_PASSAGE_MANIFEST_BYTES, signal);
  const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const manifest = parsePassageManifest(value, url);
  if (typeof manifest.candidate_comparison?.settings_text === 'string' && await sha256Hex(new TextEncoder().encode(manifest.candidate_comparison.settings_text)) !== manifest.candidate_comparison.settings_sha256) throw new Error('Successor parser settings text SHA-256 does not match.');
  return { url, manifest, sha256: await sha256Hex(bytes) };
}
export async function loadPassageCaseReference(reference: CaseReference, manifest: URL, signal?: AbortSignal) {
  const url = packageUrl(reference.url, manifest);
  const bytes = await boundedBytes(url, MAX_PASSAGE_MANIFEST_BYTES, signal);
  if (bytes.length !== reference.bytes || await sha256Hex(bytes) !== reference.sha256) throw new Error('Passage case bytes or SHA-256 do not match the manifest.');
  const item = parsePassageCase(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), manifest);
  if (item.id !== reference.id || item.label !== reference.label || item.document.id !== reference.document_id || item.observation.classification !== reference.classification || item.review.status !== reference.review_status || (reference.technical_outcome !== undefined && item.technical_outcome?.status !== reference.technical_outcome)) throw new Error('Passage case does not match its manifest entry.');
  return { item, url };
}
function exactText(bytes: Uint8Array, unit: PassageUnit, pages: PassageCase['pages']): string {
  let previous = -1;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  return unit.spans.map(span => {
    const page = pages.find(item => item.number === span.page);
    if (!page || span.start_utf8 < page.start_utf8 || span.end_utf8 > page.end_utf8 || span.end_utf8 > bytes.length || span.start_utf8 < previous) throw new Error(`Invalid source byte span in ${unit.id}.`);
    previous = span.end_utf8;
    return decoder.decode(bytes.subarray(span.start_utf8, span.end_utf8));
  }).join(unit.joiner);
}
async function checkedUnits(bytes: Uint8Array, units: PassageUnit[], pages: PassageCase['pages']) {
  const result = [];
  for (const unit of units) {
    const text = exactText(bytes, unit, pages);
    for (const span of unit.spans) {
      if (span.literal_sha256 && await sha256Hex(bytes.subarray(span.start_utf8, span.end_utf8)) !== span.literal_sha256) throw new Error(`Source literal SHA-256 mismatch in ${unit.id}.`);
    }
    if (unit.text !== undefined && unit.text !== text) throw new Error(`Retained passage text differs from source spans in ${unit.id}.`);
    if (unit.text_bytes !== undefined && new TextEncoder().encode(text).length !== unit.text_bytes) throw new Error(`Retained passage byte count differs in ${unit.id}.`);
    if (await sha256Hex(new TextEncoder().encode(text)) !== unit.text_sha256) throw new Error(`Passage text SHA-256 mismatch in ${unit.id}.`);
    result.push({ unit, text });
  }
  return result;
}
export async function loadPassageCase(item: PassageCase, manifest: URL, signal?: AbortSignal): Promise<LoadedCase> {
  if (item.document.parser.settings_text !== undefined && await sha256Hex(new TextEncoder().encode(item.document.parser.settings_text)) !== item.document.parser.settings_sha256) throw new Error('Parser settings text SHA-256 does not match.');
  const bytes = await boundedBytes(packageUrl(item.document.extraction.url, manifest), MAX_EXTRACTION_BYTES, signal);
  if (await sha256Hex(bytes) !== item.document.extraction.sha256) throw new Error('Extracted source SHA-256 does not match.');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  let previousEnd = -1, previousPage = 0;
  for (const page of item.pages) {
    if (page.end_utf8 > bytes.length || page.start_utf8 < previousEnd || page.number <= previousPage) throw new Error('Invalid page order or byte range in extraction.');
    previousEnd = page.end_utf8; previousPage = page.number;
  }
  for (const link of item.observation.source_links) {
    const page = item.pages.find(row => row.number === link.page);
    if (!page || link.start_utf8 < page.start_utf8 || link.end_utf8 > page.end_utf8 || link.end_utf8 <= link.start_utf8 ||
      new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(link.start_utf8, link.end_utf8)).trim() !== link.literal ||
      await sha256Hex(new TextEncoder().encode(link.literal)) !== link.literal_sha256) throw new Error('Source observation literal does not match extraction.');
  }
  const before = await checkedUnits(bytes, item.before, item.pages), after = await checkedUnits(bytes, item.after, item.pages);
  if (item.coverage) {
    const old = ranges(item.before), proposed = ranges(item.after);
    const overlaps = (rows: Array<[number, number]>) => rows.some((row, index) => index > 0 && row[0] < rows[index - 1][1]);
    if (overlaps(old) || overlaps(proposed)) throw new Error('Overlapping source bytes in declared coverage.');
    let covered = 0, i = 0, j = 0;
    while (i < old.length && j < proposed.length) {
      covered += Math.max(0, Math.min(old[i][1], proposed[j][1]) - Math.max(old[i][0], proposed[j][0]));
      if (old[i][1] <= proposed[j][1]) i++; else j++;
    }
    const oldBytes = old.reduce((sum, [start, end]) => sum + end - start, 0);
    const proposedBytes = proposed.reduce((sum, [start, end]) => sum + end - start, 0);
    if (oldBytes !== item.coverage.old_passage_bytes || covered !== item.coverage.covered_once_bytes || proposedBytes - covered !== item.coverage.candidate_bytes_outside_old_passage) throw new Error('Declared source-byte coverage does not match the proposal.');
  }
  return { source: bytes, text, before, after, successorAfter: item.successor_after ? await checkedUnits(bytes, item.successor_after, item.pages) : undefined };
}
export function pdfPageUrl(item: PassageCase, manifest: URL, page: number): string {
  const url = new URL(safePdf(item.document.pdf.url, manifest));
  url.hash = `page=${page}`;
  return url.href;
}
export async function loadVerifiedPdf(item: PassageCase, manifest: URL, signal?: AbortSignal): Promise<Blob> {
  if (!item.document.pdf.delivery_url) throw new Error('No PDF delivery URL is declared for inline review.');
  const url = new URL(safePdf(item.document.pdf.delivery_url, manifest));
  const boundedSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
  const bytes = await boundedBytes(url, MAX_PDF_BYTES, boundedSignal);
  if (bytes.length < 8 || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new Error('PDF delivery is not a PDF file.');
  if (await sha256Hex(bytes) !== item.document.pdf.sha256) throw new Error('PDF delivery SHA-256 does not match frozen source evidence.');
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

function ranges(units: PassageUnit[]): Array<[number, number]> { return units.flatMap(unit => unit.spans.map(span => [span.start_utf8, span.end_utf8] as [number, number])).sort((a, b) => a[0] - b[0] || a[1] - b[1]); }
function compact(rows: Array<[number, number]>): Array<[number, number]> {
  return [...rows].sort((a, b) => a[0] - b[0] || a[1] - b[1]).reduce<Array<[number, number]>>((result, row) => {
    const last = result.at(-1);
    if (last && row[0] <= last[1]) last[1] = Math.max(last[1], row[1]); else result.push([...row]);
    return result;
  }, []);
}
function sameRanges(a: Array<[number, number]>, b: Array<[number, number]>): boolean {
  const ar = compact(a), br = compact(b);
  if (ar.length !== br.length) return false;
  return ar.every((row, index) => row[0] === br[index][0] && row[1] === br[index][1]);
}
function outside(after: PassageUnit[], before: PassageUnit[], pages: PassageCase['pages']): Span[] {
  const old = compact(ranges(before));
  const result: Span[] = [];
  for (const unit of after) for (const span of unit.spans) {
    let remaining: Array<[number, number]> = [[span.start_utf8, span.end_utf8]];
    for (const [start, end] of old) remaining = remaining.flatMap(([a, b]) => end <= a || start >= b ? [[a, b]] : [[a, Math.min(b, start)], [Math.max(a, end), b]].filter(([x, y]) => x < y) as Array<[number, number]>);
    for (const [start_utf8, end_utf8] of remaining) {
      const page = pages.find(row => row.number === span.page && start_utf8 >= row.start_utf8 && end_utf8 <= row.end_utf8);
      if (!page) throw new Error('Added source bytes cross an undeclared page range.');
      result.push({ page: span.page, start_utf8, end_utf8 });
    }
  }
  return result;
}
export function proposedAddedSpans(item: PassageCase): Span[] { return outside(item.after, item.before, item.pages); }
export async function previewCorrection(caseItem: PassageCase, loaded: LoadedCase, input: unknown, corpusEvidence?: Record<string, unknown>): Promise<Preview> {
  const failure = (error: string): Preview => ({ accepted: false, checks: [], error, before: caseItem.before, after: caseItem.after, migration: [], impact: { passage: 'unknown', document: 'unknown', corpus: 'unknown', downstream: 'unknown' } });
  if (!obj(input) || !keys(input, ['schema', 'id', 'version', 'case_id', 'source_sha256', 'baseline_sha256', 'operation', 'rationale', 'uncertainty', 'added_spans', 'units']) ||
    input.schema !== 'okf-passage-correction.v1' || !str(input.id, 100) || !ID.test(input.id) || !str(input.version, 100) ||
    input.case_id !== caseItem.id || !hash(input.source_sha256) || !hash(input.baseline_sha256) ||
    !['split', 'join', 'role-change'].includes(String(input.operation)) || !str(input.rationale) || typeof input.uncertainty !== 'string' || input.uncertainty.length > 2000 || !Array.isArray(input.added_spans) || input.added_spans.length > 100 || input.added_spans.some(span => !obj(span) || !keys(span, ['page', 'start_utf8', 'end_utf8']) || !Number.isSafeInteger(span.page) || !offset(span.start_utf8) || !offset(span.end_utf8) || Number(span.end_utf8) <= Number(span.start_utf8)) || !validUnits(input.units)) return failure('Invalid or out-of-scope correction.');
  const correction = input as Correction;
  if (correction.source_sha256 !== caseItem.document.extraction.sha256 || correction.baseline_sha256 !== caseItem.document.baseline_sha256) return failure('Stale source or baseline SHA-256.');
  try { await checkedUnits(loaded.source, correction.units, caseItem.pages); }
  catch (error) { return failure(error instanceof Error ? error.message : String(error)); }
  const old = caseItem.before;
  if (old.some(previous => correction.units.some(next => next.id === previous.id && (next.role !== previous.role || next.joiner !== previous.joiner || next.text_sha256 !== previous.text_sha256 || JSON.stringify(next.spans) !== JSON.stringify(previous.spans))))) return failure('An existing unit ID cannot be reused for changed content or role.');
  const oldRanges = ranges(old), newRanges = ranges(correction.units);
  if (oldRanges.some((row, i) => i > 0 && row[0] < oldRanges[i - 1][1]) || newRanges.some((row, i) => i > 0 && row[0] < newRanges[i - 1][1])) return failure('Overlapping source bytes.');
  const actualAdded = outside(correction.units, old, caseItem.pages);
  const declaredAdded = correction.added_spans;
  if (!sameRanges(actualAdded.map(span => [span.start_utf8, span.end_utf8]), declaredAdded.map(span => [span.start_utf8, span.end_utf8])) ||
    declaredAdded.some(span => !caseItem.pages.some(page => page.number === span.page && span.start_utf8 >= page.start_utf8 && span.end_utf8 <= page.end_utf8))) return failure('Undeclared added source bytes.');
  if (!sameRanges([...ranges(old), ...declaredAdded.map(span => [span.start_utf8, span.end_utf8] as [number, number])], newRanges)) return failure('Lost, duplicated or invented source bytes.');
  if (caseItem.coverage && ranges(old).reduce((sum, [a, b]) => sum + b - a, 0) !== caseItem.coverage.old_passage_bytes) return failure('Baseline differs from declared source-byte coverage.');
  if (correction.units.some(unit => unit.spans.length > 1 && ![...caseItem.before, ...caseItem.after].some(declared => declared.joiner === unit.joiner && declared.spans.length > 1))) return failure('Undeclared source joiner.');
  if (correction.operation === 'split' && correction.units.length <= old.length || correction.operation === 'join' && correction.units.length >= old.length || correction.operation === 'role-change' && (correction.units.length !== old.length || !correction.units.every((unit, i) => JSON.stringify(unit.spans) === JSON.stringify(old[i].spans)))) return failure('Operation does not match the proposed units.');
  const migration = old.map(unit => {
    const related = correction.units.filter(next => next.spans.some(span => unit.spans.some(previous => span.start_utf8 < previous.end_utf8 && span.end_utf8 > previous.start_utf8))).map(next => next.id);
    return { from: unit.id, to: related, status: related.length ? 'mapped' as const : 'unresolved' as const };
  });
  const affected = caseItem.impact;
  const localUnitDelta = correction.units.length - old.length;
  const mayOverlapUnreviewedUnits = actualAdded.length > 0;
  const countReason = (baseline: number | undefined) => mayOverlapUnreviewedUnits
    ? 'Added source spans may overlap units outside this reviewed passage; a full-document projection is required.'
    : baseline === undefined ? 'A baseline count was not supplied.'
    : 'Units and IDs outside this case were not validated; only the local unit delta is established.';
  return { accepted: true, checks: ['Source SHA-256 matched', 'Baseline SHA-256 matched', 'All proposed text hashes matched', 'Old source-byte coverage preserved', 'Added source bytes declared', 'No overlapping spans'], before: old, after: correction.units, migration,
    impact: { passage: { old_ids: old.map(unit => unit.id), new_ids: correction.units.map(unit => unit.id), old_roles: old.map(unit => unit.role), new_roles: correction.units.map(unit => unit.role), old_text_sha256: old.map(unit => unit.text_sha256), new_text_sha256: correction.units.map(unit => unit.text_sha256), old_spans: old.map(unit => unit.spans), new_spans: correction.units.map(unit => unit.spans), qualifiers_citations_and_completeness: 'requires source review' },
      document: { affected_units_before: old.length, affected_units_after: correction.units.length, affected_unit_delta: localUnitDelta, original_passage_source_bytes: ranges(old).reduce((sum, [a, b]) => sum + b - a, 0), explicitly_added_source_bytes: actualAdded.reduce((sum, span) => sum + span.end_utf8 - span.start_utf8, 0), full_units_before: affected?.document_unit_count_before ?? 'unknown', full_units_after: 'unknown', full_units_after_reason: countReason(affected?.document_unit_count_before) },
      corpus: { affected_unit_delta: localUnitDelta, isolated_projection_units_before: affected?.corpus_unit_count_before ?? 'unknown', isolated_projection_units_after: 'unknown', isolated_projection_units_after_reason: countReason(affected?.corpus_unit_count_before), supplied_producer_candidate_census: corpusEvidence ? { baseline_units: corpusEvidence.baseline_units ?? 'unknown', candidate_units: corpusEvidence.candidate_units ?? 'unknown', added_ids: corpusEvidence.added_ids ?? 'unknown', removed_ids: corpusEvidence.removed_ids ?? 'unknown', changed_documents: corpusEvidence.changed_documents ?? 'unknown', authored_units_exact: corpusEvidence.authored_units_exact ?? 'unknown', identity_migration_status: corpusEvidence.identity_migration_status ?? 'unknown' } : 'unknown' },
      downstream: { correction_effects: { dependencies: 'unknown', discovery_records: 'unknown', question_packages: 'unknown', budget_omissions: 'unknown' }, supplied_producer_case_evidence: { dependencies: affected?.dependencies ?? 'unknown', discovery_records: affected?.discovery_records ?? 'unknown', question_packages: affected?.question_packages ?? 'unknown', budget_omissions: affected?.budget_omissions ?? 'unknown' } } } };
}
