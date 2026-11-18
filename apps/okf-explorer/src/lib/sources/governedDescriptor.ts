import { isLargeCorpusDescriptor } from './descriptor';
import { baseUrlFor, fetchJsonResource, readResponseText } from './fetch';
import { safeRelativeResourcePath } from './releaseDataPlane';
import { citationUrl } from '$lib/viewer/okfPlusContext';

const maxResourceBytes = 2 * 1024 * 1024;
const maxDescriptorBytes = 128 * 1024;
const acceptedMediaTypes = ['application/json', 'application/ld+json'];

export const sha256Pattern = /^[0-9a-f]{64}$/;

export function objectRow(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a publication object');
  return value as Record<string, unknown>;
}

export function boundedText(value: unknown, limit: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error('Invalid publication text');
  }
  return value;
}

export function webIri(value: string): string | undefined {
  return citationUrl(value.replace(/^https?:/i, scheme => scheme.toLowerCase())) ?? undefined;
}

export function namedIri(value: unknown): string {
  const named = boundedText(value, 2048);
  if (/^urn:[^\s<>"\\]+$/i.test(named) || webIri(named)) return named;
  throw new Error('Invalid publication IRI');
}

export function descriptorUrl(value: unknown, pageOrigin: string): URL {
  const publicUrl = webIri(boundedText(value, 2048));
  if (!publicUrl) throw new Error('Use a public HTTPS descriptor URL or a full URL from this site');
  const url = new URL(publicUrl);
  if (url.hash || (url.protocol !== 'https:' && (url.protocol !== 'http:' || url.origin !== pageOrigin))) {
    throw new Error('Use a public HTTPS descriptor URL or a full URL from this site');
  }
  return url;
}

export function contentDigest(value: unknown): string {
  if (typeof value !== 'string' || !sha256Pattern.test(value)) throw new Error('Invalid publication digest');
  return value;
}

export async function readGovernedDescriptor(value: string, pageOrigin: string) {
  const url = descriptorUrl(value, pageOrigin);
  const response = await fetch(url, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(8000) });
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!response.ok || !acceptedMediaTypes.includes(contentType || '')) {
    throw new Error('Could not read the bundle descriptor as JSON');
  }
  const raw = objectRow(JSON.parse(await readResponseText(response, url.href, maxDescriptorBytes)));
  if (!isLargeCorpusDescriptor(raw)) throw new Error('This view requires a large-corpus descriptor');
  return { url: url.href, bundle: namedIri(raw['@id']), title: boundedText(raw.title, 256), entrypoints: objectRow(raw.entrypoints) };
}

export async function readBoundPublicationJson(value: unknown, descriptor: string) {
  const raw = objectRow(value);
  const path = safeRelativeResourcePath(boundedText(raw.path, 300), 'Publication resource path');
  if (!path.endsWith('.json')) throw new Error('Expected a relative JSON resource');
  const sha256 = contentDigest(raw.sha256);
  const bytes = raw.bytes;
  if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > maxResourceBytes) {
    throw new Error('Invalid publication resource length');
  }
  const base = baseUrlFor(descriptor);
  const document: unknown = await fetchJsonResource({ path, sha256, bytes }, base, {
    rejectRedirects: true, credentials: 'omit', attempts: 1, timeoutMs: 8000, acceptedMediaTypes
  });
  return { document, sha256, url: new URL(path, base).href };
}
