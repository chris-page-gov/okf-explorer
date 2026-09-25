/** Logical-unit integrity only. Source inclusion is checked by the producer;
 * boundary detection never establishes specialist or legal acceptance. */
import type { ContextRecord } from './types.ts';

export const EVIDENCE_UNIT_LIMITS = Object.freeze({ spans: 32, source_text_bytes: 16 * 1024 * 1024 });
const encoder = new TextEncoder();
const HASH = /^[a-f0-9]{64}$/;
const KINDS = ['section', 'paragraph', 'table', 'definition', 'exception', 'cross-reference', 'compound', 'unresolved-fragment', 'page-fallback'];
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(`Invalid evidence unit: ${message}`); }
function object(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function fields(row: Record<string, unknown>, names: string[]) {
  check(Object.keys(row).length === names.length && names.every(name => Object.hasOwn(row, name)), 'unexpected or missing fields');
}
function http(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 8000 || /[\s<>"'`\\^{}|]/.test(value) || /%(?![0-9a-f]{2})/i.test(value)) return false;
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password && u.port !== '0'; } catch { return false; }
}

/** Structural and byte-range admission without fetching original source text. */
export function validateEvidenceUnit(record: ContextRecord): void {
  if (record.evidence_unit === undefined) return;
  const unit: unknown = record.evidence_unit;
  check(record.kind === 'evidence' && object(unit), 'metadata requires an evidence record');
  fields(unit, ['schema', 'kind', 'boundary_status', 'completeness', 'offset_unit', 'joiner', 'spans']);
  check(unit.schema === 'okf-evidence-unit.v1' && KINDS.includes(unit.kind), 'unsupported schema or kind');
  check(['machine-detected', 'author-declared'].includes(unit.boundary_status), 'boundary status');
  check(['complete-within-declared-boundary', 'unresolved', 'fallback'].includes(unit.completeness), 'completeness');
  check(unit.kind !== 'unresolved-fragment' || unit.completeness === 'unresolved', 'unresolved fragment cannot claim completeness');
  check(unit.kind !== 'page-fallback' || unit.completeness === 'fallback', 'fallback cannot claim completeness');
  check(unit.offset_unit === 'utf-8-bytes' && ['', '\n', '\n\n'].includes(unit.joiner), 'offset convention or joiner');
  check(Array.isArray(unit.spans) && unit.spans.length > 0 && unit.spans.length <= EVIDENCE_UNIT_LIMITS.spans, 'span count');
  const text = encoder.encode(record.text);
  check(new TextDecoder('utf-8', { fatal: true }).decode(text) === record.text, 'text is not well-formed Unicode');
  let end = 0;
  const sources = new Map<string, { hash: string; bytes: number; end: number }>();
  for (const [ordinal, span] of unit.spans.entries()) {
    check(object(span), 'span object');
    fields(span, ['source_url', 'source_sha256', 'extraction_url', 'extraction_sha256', 'locator', 'source_text_sha256', 'source_text_bytes', 'source_start', 'source_end', 'unit_start', 'unit_end', 'literal_sha256']);
    check(http(span.source_url) && http(span.extraction_url), 'unsafe source or extraction URL');
    check(['source_sha256', 'extraction_sha256', 'source_text_sha256', 'literal_sha256'].every(key => typeof span[key] === 'string' && HASH.test(span[key])), 'span digest');
    check(typeof span.locator === 'string' && span.locator.length > 0 && span.locator.length <= 8000, 'source locator');
    check(['source_text_bytes', 'source_start', 'source_end', 'unit_start', 'unit_end'].every(key => Number.isSafeInteger(span[key]) && span[key] >= 0), 'span offsets');
    check(span.source_text_bytes <= EVIDENCE_UNIT_LIMITS.source_text_bytes && span.source_end <= span.source_text_bytes
      && span.source_start < span.source_end && span.unit_start < span.unit_end && span.unit_end <= text.length
      && span.source_end - span.source_start === span.unit_end - span.unit_start, 'span bounds or lengths');
    const joiner = ordinal ? encoder.encode(unit.joiner) : new Uint8Array();
    check(span.unit_start === end + joiner.length && joiner.every((byte, n) => text[end + n] === byte), 'gaps, overlap or unbound joining text');
    try { new TextDecoder('utf-8', { fatal: true }).decode(text.subarray(span.unit_start, span.unit_end)); }
    catch { throw new Error('Invalid evidence unit: span splits a UTF-8 character'); }
    const key = JSON.stringify([span.source_url, span.source_sha256, span.extraction_url, span.extraction_sha256, span.locator]);
    const previous = sources.get(key);
    check(!previous || (previous.hash === span.source_text_sha256 && previous.bytes === span.source_text_bytes), 'one source selector has conflicting text identities');
    check(span.source_start >= (previous?.end ?? 0), 'source spans overlap or reverse order');
    sources.set(key, { hash: span.source_text_sha256, bytes: span.source_text_bytes, end: span.source_end });
    check(record.provenance.some(p => p.url === span.source_url && p.source_sha256 === span.source_sha256), 'source span is not bound in record provenance');
    check(record.provenance.some(p => p.url === span.extraction_url && p.source_sha256 === span.extraction_sha256), 'extraction span is not bound in record provenance');
    end = span.unit_end;
  }
  check(end === text.length, 'unit text is not completely span-bound');
}

/** Each hash refers to that exact fragment, unlike provenance.literal_sha256,
 * whose established meaning remains the complete record text. */
export async function evidenceUnitIntegrity(record: ContextRecord): Promise<boolean> {
  if (!record.evidence_unit) return true;
  const text = encoder.encode(record.text);
  for (const span of record.evidence_unit.spans) {
    const value = text.slice(span.unit_start, span.unit_end);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', value)), n => n.toString(16).padStart(2, '0')).join('');
    if (digest !== span.literal_sha256) return false;
  }
  return true;
}
