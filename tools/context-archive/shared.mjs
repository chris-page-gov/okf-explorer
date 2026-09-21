/** Pure archive checks shared by the offline exporter and static reader. */
export const LIMITS = Object.freeze({ package_bytes: 524288, catalogue_bytes: 16384,
  resource_bytes: 65536, descriptor_bytes: 65536, files: 1024, archive_bytes: 8388608,
  cases: 20, records: 200, relationships: 1000, requests: 1024, request_ms: 15000 });
export function requireValue(ok, message) { if (!ok) throw new Error(`Archive rejected: ${message}`); }
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const byteLength = value => new TextEncoder().encode(value).byteLength;
export async function sha256(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
}
export function strictJson(raw, requireCanonical = false) {
  let quoted = false, escaped = false, compact = '';
  for (const c of raw) {
    if (quoted || !/\s/.test(c)) compact += c;
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
  }
  const value = JSON.parse(raw);
  requireValue(JSON.stringify(value) === compact, 'duplicate keys or non-canonical JSON values');
  if (requireCanonical) requireValue(canonical(value) === raw, 'resource is not canonical JSON');
  return value;
}
export function checkedRef(ref, ceiling = LIMITS.resource_bytes) {
  requireValue(ref && Object.keys(ref).sort().join(',') === 'bytes,sha256', 'invalid resource reference');
  requireValue(/^[a-f0-9]{64}$/.test(ref.sha256) && Number.isSafeInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= ceiling, 'invalid resource bounds');
  return ref;
}
export function safeWebUrl(value) {
  try { const u = new URL(value); return /^(https?:)$/.test(u.protocol) && !u.username && !u.password && !/[\s<>"']/.test(value) ? u.href : null; } catch { return null; }
}
export async function joinEvidence(parts, expected) {
  requireValue(parts.length > 0 && parts.length <= LIMITS.files, 'empty or excessive evidence stream');
  let text = '', end = 0;
  for (const [i, part] of parts.entries()) {
    requireValue(part.schema === 'okf-context-read.v1' && part.context_id === expected.context_id
      && part.section === expected.section && part.record_id === (expected.record_id ?? null)
      && part.evidence_status === expected.evidence_status && part.ai_answer === null
      && part.character_unit === 'utf-16-code-units' && part.offset === end
      && typeof part.data === 'string' && part.end_offset === end + part.data.length,
    'evidence identity, section or contiguous offsets changed');
    requireValue(i === parts.length - 1 ? part.next_offset === null : part.next_offset === part.end_offset, 'missing or repeated evidence part');
    requireValue(part.content_sha256 === parts[0].content_sha256 && part.total_characters === parts[0].total_characters, 'stream identity changed');
    text += part.data; end = part.end_offset;
    requireValue(byteLength(text) <= LIMITS.package_bytes, 'decoded evidence exceeds package limit');
  }
  requireValue(end === parts[0].total_characters && await sha256(text) === parts[0].content_sha256, 'complete evidence hash differs');
  return text;
}
