import type { ContextPackage, ContextRecord } from '$lib/context/types';
import { isHttpUrl } from '$lib/viewer/helpers';
import { sha256Hex } from '$lib/sources/releaseDataPlane';
import { PACKAGE_DELIVERY_LIMITS, reconstructContextPackage } from '$lib/context/packageDelivery';

export const MAX_MANIFEST_BYTES = 256 * 1024;
export const MAX_PACKAGE_BYTES = 4 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const CASE_ID = /^[a-z0-9][a-z0-9._-]*$/;

export type WorkbenchCase = {
  id: string;
  label: string;
  question: string;
  package: { url: string; sha256: string; parts?: Array<{ url: string; sha256: string; bytes: number }> };
};
export type WorkbenchManifest = {
  schema: 'okf-evidence-workbench.v1';
  title: string;
  publication: { label: string; source_date?: string; captured_at?: string };
  questions: WorkbenchCase[];
};

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function nonempty(value: unknown, limit = 2000): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}

export function manifestUrl(input: string, base: string): URL {
  const url = new URL(input, base);
  if (!isHttpUrl(url.href) || (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('Use a credential-free HTTPS manifest URL, or local HTTP for development.');
  }
  if (url.hash) throw new Error('Manifest URLs cannot contain a fragment.');
  return url;
}

export function packageUrl(path: string, manifest: URL): URL {
  if (!nonempty(path, 1000) || path.startsWith('/') || path.includes('\\') || /%(?![0-9a-f]{2})/i.test(path) || path.includes('?') || path.includes('#')) {
    throw new Error('Package path must be a relative file path without a query or fragment.');
  }
  const segments = path.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..' || /%2e|%2f|%5c/i.test(segment))) {
    throw new Error('Package path cannot traverse directories.');
  }
  const url = new URL(path, manifest);
  const directory = manifest.pathname.slice(0, manifest.pathname.lastIndexOf('/') + 1);
  if (url.origin !== manifest.origin || !url.pathname.startsWith(directory) || !isHttpUrl(url.href)) {
    throw new Error('Package must remain in the manifest directory and origin.');
  }
  return url;
}

export function parseManifest(value: unknown, source: URL): WorkbenchManifest {
  if (!object(value) || value.schema !== 'okf-evidence-workbench.v1' || !nonempty(value.title, 300) || !object(value.publication) || !nonempty(value.publication.label, 300) || !Array.isArray(value.questions) || value.questions.length < 1 || value.questions.length > 100) {
    throw new Error('This is not a supported evidence workbench manifest.');
  }
  for (const key of ['source_date', 'captured_at']) {
    const field = value.publication[key];
    if (field !== undefined && (!nonempty(field, 80) || !/^\d{4}-\d\d-\d\d/.test(field))) throw new Error(`Invalid publication ${key}.`);
  }
  const ids = new Set<string>();
  for (const item of value.questions) {
    if (!object(item) || !nonempty(item.id, 100) || !CASE_ID.test(item.id) || ids.has(item.id) || !nonempty(item.label, 300) || !nonempty(item.question) || !object(item.package) || !SHA256.test(String(item.package.sha256))) {
      throw new Error('Manifest has an invalid or duplicate question entry.');
    }
    packageUrl(String(item.package.url), source);
    if (item.package.parts !== undefined) {
      if (!Array.isArray(item.package.parts) || !item.package.parts.length || item.package.parts.length > PACKAGE_DELIVERY_LIMITS.parts) throw new Error('Manifest has an invalid package part list.');
      let total = 0;
      for (const part of item.package.parts) {
        if (!object(part) || !SHA256.test(String(part.sha256)) || !Number.isSafeInteger(part.bytes) || Number(part.bytes) < 1 || Number(part.bytes) > PACKAGE_DELIVERY_LIMITS.response_bytes) throw new Error('Manifest has an invalid package part.');
        packageUrl(String(part.url), source);
        total += Number(part.bytes);
      }
      if (total > PACKAGE_DELIVERY_LIMITS.transferred_bytes) throw new Error('Manifest package parts exceed the transfer limit.');
    }
    ids.add(item.id);
  }
  return value as WorkbenchManifest;
}

async function boundedJson(url: URL, maxBytes: number, signal?: AbortSignal): Promise<{ value: unknown; bytes: Uint8Array }> {
  const response = await fetch(url, { signal, cache: 'no-store', redirect: 'follow', credentials: 'omit' });
  if (!response.ok) throw new Error(`Could not load ${url.pathname}: HTTP ${response.status}.`);
  if (response.url !== url.href) throw new Error('Redirected evidence files are not accepted.');
  const claimed = Number(response.headers.get('content-length') || 0);
  if (claimed > maxBytes) throw new Error(`Evidence file exceeds the ${maxBytes.toLocaleString('en-GB')} byte limit.`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Could not read the evidence file.');
  const chunks: Uint8Array[] = [];
  let count = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      count += next.value.byteLength;
      if (count > maxBytes) throw new Error(`Evidence file exceeds the ${maxBytes.toLocaleString('en-GB')} byte limit.`);
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(count);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return { value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), bytes }; }
  catch { throw new Error('Evidence file is not valid UTF-8 JSON.'); }
}

export async function loadManifest(url: URL, signal?: AbortSignal): Promise<WorkbenchManifest> {
  const { value } = await boundedJson(url, MAX_MANIFEST_BYTES, signal);
  return parseManifest(value, url);
}

export function parsePackage(value: unknown, expected: WorkbenchCase): ContextPackage {
  if (!object(value) || value.schema !== 'okf-governed-context.v1' || value.question !== expected.question || !nonempty(value.context_id, 300) || !nonempty(value.scope) || !object(value.bundle) || !nonempty(value.bundle.snapshot) || !object(value.binding) || !nonempty(value.binding.index_sha256) || !Array.isArray(value.selected) || !Array.isArray(value.relationships) || !Array.isArray(value.requirements) || !Array.isArray(value.missing_evidence) || !Array.isArray(value.conflicts) || !Array.isArray(value.resolved_concepts) || !Array.isArray(value.ambiguities) || !Array.isArray(value.unresolved_terms) || !Array.isArray(value.limitations) || !object(value.budget) || !Array.isArray(value.budget.omissions) || !['sufficient', 'insufficient', 'conflicting'].includes(String(value.evidence_status))) {
    throw new Error('The selected question has an invalid or mismatched context package.');
  }
  if (value.selected.length > 1000 || value.relationships.length > 3000) throw new Error('Context package exceeds display limits.');
  for (const item of value.selected) {
    if (!object(item) || !object(item.record) || !nonempty(item.record.id, 500) || !nonempty(item.record.label, 500) || typeof item.record.text !== 'string' || !Array.isArray(item.record.provenance) || !Array.isArray(item.reasons) || !Array.isArray(item.paths) || item.record.provenance.some((row: unknown) => !object(row) || typeof row.url !== 'string' || typeof row.locator !== 'string')) throw new Error('Context package contains an invalid selected record.');
    if (item.record.evidence_unit !== undefined && (!object(item.record.evidence_unit) || !Array.isArray(item.record.evidence_unit.spans) || item.record.evidence_unit.spans.some((span: unknown) => !object(span) || typeof span.locator !== 'string' || !Number.isSafeInteger(span.unit_start) || !Number.isSafeInteger(span.unit_end)))) throw new Error('Context package contains an invalid passage unit.');
  }
  for (const row of value.relationships) if (!object(row) || typeof row.source !== 'string' || typeof row.target !== 'string' || typeof row.label !== 'string') throw new Error('Context package contains an invalid relationship.');
  for (const row of value.requirements) if (!object(row) || !nonempty(row.label) || !Array.isArray(row.missing)) throw new Error('Context package contains an invalid requirement.');
  for (const row of [...value.missing_evidence, ...value.conflicts, ...value.budget.omissions]) if (!object(row) || typeof row.code !== 'string' || typeof row.message !== 'string' || !Array.isArray(row.ids)) throw new Error('Context package contains an invalid diagnostic.');
  if (value.retrieval !== undefined && (!object(value.retrieval) || !Array.isArray(value.retrieval.candidates) || !Array.isArray(value.retrieval.query_tokens) || !Array.isArray(value.retrieval.omissions))) throw new Error('Context package contains an invalid retrieval trace.');
  return value as ContextPackage;
}

export async function loadPackage(item: WorkbenchCase, manifest: URL, signal?: AbortSignal): Promise<ContextPackage> {
  if (item.package.parts?.length) {
    const parts: unknown[] = [];
    for (const part of item.package.parts) {
      const { value, bytes } = await boundedJson(packageUrl(part.url, manifest), PACKAGE_DELIVERY_LIMITS.response_bytes, signal);
      if (bytes.byteLength !== part.bytes || await sha256Hex(bytes) !== part.sha256) throw new Error('Context package part bytes or SHA-256 do not match the manifest.');
      parts.push(value);
    }
    return parsePackage(JSON.parse(await reconstructContextPackage(parts, item.package.sha256)), item);
  }
  const url = packageUrl(item.package.url, manifest);
  const { value, bytes } = await boundedJson(url, MAX_PACKAGE_BYTES, signal);
  if (await sha256Hex(bytes) !== item.package.sha256) throw new Error('Context package SHA-256 does not match the manifest.');
  return parsePackage(value, item);
}

export function sourcePageUrl(record: ContextRecord): string | null {
  const source = record.provenance.find(item => isHttpUrl(item?.url) && new URL(item.url).protocol === 'https:');
  if (!source) return null;
  const url = new URL(source.url);
  const page = /(?:^|\b)(?:page|p)[-/ :]*(\d{1,5})(?:\b|$)/i.exec(source.locator || '')?.[1];
  if (page && /\.pdf$/i.test(url.pathname)) url.hash = `page=${page}`;
  return url.href;
}

/** Evidence-unit offsets refer to UTF-8 bytes in record.text, not PDF pixels. */
export function unitSpanText(record: ContextRecord, unitStart: number, unitEnd: number): string | null {
  const bytes = new TextEncoder().encode(record.text);
  if (!Number.isSafeInteger(unitStart) || !Number.isSafeInteger(unitEnd) || unitStart < 0 || unitEnd <= unitStart || unitEnd > bytes.length) return null;
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(unitStart, unitEnd)); }
  catch { return null; }
}

export function reviewDownload(packageValue: ContextPackage, questionId: string, recordId: string, comment: string, status: string): string {
  return JSON.stringify({ schema: 'okf-evidence-review-proposal.v1', question_id: questionId, context_id: packageValue.context_id, bundle_snapshot: packageValue.bundle.snapshot, context_binding_sha256: packageValue.binding.index_sha256, record_id: recordId, proposal: { status, comment }, authority: 'local-unreviewed-proposal' }, null, 2) + '\n';
}
