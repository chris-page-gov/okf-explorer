import { isMap, isScalar, isSeq, parseDocument } from 'yaml';
import type { FederationAccessRoute, LargeResourceReference, LargeSourceDisplayMode } from '$lib/types';
import {
  type PreparedReleaseDataPlane,
  releaseDataRequest,
  resourceHash,
  resourcePath,
  sha256Hex
} from './releaseDataPlane';

export const MAX_JSON_BYTES = 64 * 1024 * 1024;
export const MAX_SOURCE_JSON_BYTES = 10 * 1024 * 1024;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface SourceJsonResponse {
  json: unknown;
  bytes: number;
  contentType: string;
  retrievedAt: string;
  responseUrl: string;
}

export type InlineSourceDisplayMode = Exclude<LargeSourceDisplayMode, 'link'>;

export interface SourceResponse {
  data: unknown;
  text: string;
  displayMode: InlineSourceDisplayMode;
  bytes: number;
  contentType: string;
  retrievedAt: string;
  responseUrl: string;
}

export interface StructuredDocumentResponse<T> {
  document: T;
  bytes: number;
  contentType: string;
  retrievedAt: string;
  requestedUrl: string;
  responseUrl: string;
  attemptedUrls: string[];
}

export function resolveUrl(path: string, base: string): string {
  return new URL(path, base).toString();
}

export function movedBundleTarget(raw: Record<string, unknown>, sourceUrl: string): string | null {
  if (raw.kind !== 'okf-moved') return null;
  if (typeof raw.moved_to !== 'string' || !raw.moved_to.trim()) {
    throw new Error(`${sourceUrl}: moved bundle descriptor is missing moved_to`);
  }
  const target = resolveUrl(raw.moved_to, sourceUrl);
  if (target === sourceUrl) {
    throw new Error(`${sourceUrl}: moved bundle descriptor points to itself`);
  }
  return target;
}

export async function fetchJson<T>(url: string, timeoutMs = 30000, attempts = 3, retryDelayMs = 250): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(timeoutMs) : undefined;
    try {
      const response = await fetch(url, { cache: 'default', signal });
      if (!response.ok) {
        const error = new Error(`${url}: ${response.status} ${response.statusText}`);
        if (attempt < attempts - 1 && RETRYABLE_STATUS_CODES.has(response.status)) {
          lastError = error;
          await retryDelay(retryDelayMs, attempt);
          continue;
        }
        throw error;
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) > MAX_JSON_BYTES) {
        throw new Error(`${url}: response too large (${Number(contentLength)} bytes, limit ${MAX_JSON_BYTES})`);
      }
      return JSON.parse(await readResponseText(response, url, MAX_JSON_BYTES)) as T;
    } catch (error) {
      if (attempt < attempts - 1 && isRetryableFetchError(error)) {
        lastError = error;
        await retryDelay(retryDelayMs, attempt);
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${url}: fetch failed`);
}

function yamlDocumentUrl(url: string): boolean {
  try {
    return /\.(?:ya?ml|yamlld)$/i.test(new URL(url).pathname);
  } catch {
    return /\.(?:ya?ml|yamlld)(?:[?#]|$)/i.test(url);
  }
}

function yamlContentType(contentType: string): boolean {
  return /^(?:application|text)\/(?:ld\+yaml|yaml|x-yaml)(?:;|$)/i.test(contentType.trim());
}

function validateYamlRepresentation(value: unknown, path = '$'): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`${path}: non-finite numbers are not valid YAML-LD`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateYamlRepresentation(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (typeof key !== 'string') throw new Error(`${path}: YAML-LD mapping keys must be strings`);
      validateYamlRepresentation(item, `${path}.${key}`);
    }
  }
}

function validateYamlMappingKeys(node: unknown, path = '$'): void {
  if (isMap(node)) {
    for (const pair of node.items) {
      if (!isScalar(pair.key) || typeof pair.key.value !== 'string') {
        throw new Error(`${path}: YAML-LD mapping keys must be strings`);
      }
      validateYamlMappingKeys(pair.value, `${path}.${pair.key.value}`);
    }
    return;
  }
  if (isSeq(node)) {
    node.items.forEach((item, index) => validateYamlMappingKeys(item, `${path}[${index}]`));
  }
}

/**
 * Parse descriptor JSON or YAML-LD without executing tags or resolving remote
 * contexts. JSON is recognized from its first non-whitespace byte even when a
 * static host supplies application/octet-stream. YAML is accepted only when
 * the URL or media type explicitly declares YAML, and uses the YAML 1.2 core
 * schema with bounded aliases and unique mapping keys.
 */
export function parseStructuredDocumentText<T>(
  text: string,
  url: string,
  contentType = ''
): T {
  const trimmed = text.trim();
  if (!trimmed) throw new Error(`${url}: descriptor response is empty`);
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as T;
  }
  if (!yamlDocumentUrl(url) && !yamlContentType(contentType)) {
    throw new Error(`${url}: response is neither JSON nor explicitly declared YAML-LD`);
  }
  const document = parseDocument(trimmed, {
    version: '1.2',
    schema: 'core',
    merge: false,
    strict: true,
    uniqueKeys: true
  });
  if (document.errors.length) {
    throw new Error(`${url}: invalid YAML-LD: ${document.errors.map((error) => error.message).join('; ')}`);
  }
  try {
    validateYamlMappingKeys(document.contents);
    const value = document.toJS({ maxAliasCount: 0 }) as T;
    validateYamlRepresentation(value);
    return value;
  } catch (error) {
    throw new Error(`${url}: unsafe or cyclic YAML-LD: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function fetchStructuredDocument<T>(
  url: string,
  timeoutMs = 30000,
  attempts = 3,
  retryDelayMs = 250
): Promise<StructuredDocumentResponse<T>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;
    try {
      const response = await fetch(url, {
        cache: 'default',
        headers: {
          Accept: 'application/json, application/ld+json;q=0.95, application/ld+yaml;q=0.9, application/yaml;q=0.8'
        },
        signal
      });
      if (!response.ok) {
        const error = new Error(`${url}: ${response.status} ${response.statusText}`);
        if (attempt < attempts - 1 && RETRYABLE_STATUS_CODES.has(response.status)) {
          lastError = error;
          await retryDelay(retryDelayMs, attempt);
          continue;
        }
        throw error;
      }
      const text = await readResponseText(response, url, MAX_JSON_BYTES);
      const contentType = response.headers.get('content-type') || '';
      const responseUrl = response.url || url;
      const parsedResponseUrl = new URL(responseUrl);
      if (!['http:', 'https:'].includes(parsedResponseUrl.protocol) || parsedResponseUrl.username || parsedResponseUrl.password) {
        throw new Error(`${url}: response redirected to an unsafe descriptor URL`);
      }
      return {
        document: parseStructuredDocumentText<T>(text, responseUrl, contentType),
        bytes: new TextEncoder().encode(text).byteLength,
        contentType,
        retrievedAt: new Date().toISOString(),
        requestedUrl: url,
        responseUrl,
        attemptedUrls: [url]
      };
    } catch (error) {
      if (attempt < attempts - 1 && isRetryableFetchError(error)) {
        lastError = error;
        await retryDelay(retryDelayMs, attempt);
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${url}: fetch failed`);
}

export function declaredDescriptorCandidates(
  primaryUrl: string,
  routes: FederationAccessRoute[] = []
): string[] {
  const candidates = [{ url: primaryUrl, priority: Number.MIN_SAFE_INTEGER }, ...routes
    .filter((route) =>
      route?.url &&
      (
        route.purpose === 'descriptor' ||
        (!route.purpose && ['published', 'raw'].includes(route.kind))
      )
    )
    .map((route, index) => ({
      url: resolveUrl(route.url, primaryUrl),
      priority: Number.isFinite(route.priority) ? Number(route.priority) : index
    }))
    .sort((left, right) => left.priority - right.priority)];
  return [...new Set(candidates.map((candidate) => candidate.url))];
}

export async function fetchStructuredDocumentWithFallback<T>(
  primaryUrl: string,
  routes: FederationAccessRoute[] = [],
  timeoutMs = 30000,
  attempts = 3,
  retryDelayMs = 250
): Promise<StructuredDocumentResponse<T>> {
  const candidates = declaredDescriptorCandidates(primaryUrl, routes);
  const attemptedUrls: string[] = [];
  const failures: string[] = [];
  for (const candidate of candidates) {
    attemptedUrls.push(candidate);
    try {
      const result = await fetchStructuredDocument<T>(
        candidate,
        timeoutMs,
        attempts,
        retryDelayMs
      );
      return { ...result, requestedUrl: primaryUrl, attemptedUrls };
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(
    `No declared descriptor route succeeded. Attempted ${attemptedUrls.join(', ')}. ` +
    `Repository, documentation and archive links are never guessed or parsed as descriptors. ` +
    `Failures: ${failures.join(' | ')}`
  );
}

export type FetchJsonResourceOptions = {
  releaseDataPlane?: PreparedReleaseDataPlane;
  requireReleaseEntry?: boolean;
  timeoutMs?: number;
  attempts?: number;
  retryDelayMs?: number;
};

async function readResponseBytes(response: Response, url: string, maxBytes: number): Promise<Uint8Array> {
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error(`${url}: response too large (${Number(contentLength)} bytes, limit ${maxBytes})`);
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error(`${url}: response too large (stream exceeded ${maxBytes} bytes)`);
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    received += part.value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error(`${url}: response too large (stream exceeded ${maxBytes} bytes)`);
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function arrayBufferCopy(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function gunzipBoundedBytes(bytes: Uint8Array, label: string): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error(`This browser cannot decompress ${label}`);
  const body = new Response(arrayBufferCopy(bytes)).body;
  if (!body) throw new Error(`This browser cannot stream ${label}`);
  const reader = body.pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    received += part.value.byteLength;
    if (received > MAX_JSON_BYTES) {
      await reader.cancel().catch(() => {});
      throw new Error(`${label} exceeds the ${MAX_JSON_BYTES}-byte decoded response limit`);
    }
    chunks.push(part.value);
  }
  const decoded = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    decoded.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoded;
}

/**
 * Fetch a descriptor-relative JSON resource through either the ordinary static
 * path or an optional same-origin range-pack data plane. Direct bundles retain
 * their existing behavior; ranged resources fail closed on every advertised
 * byte count, Content-Range and SHA-256 binding before JSON parsing.
 */
export async function fetchJsonResource<T>(
  reference: LargeResourceReference,
  baseUrl: string,
  options: FetchJsonResourceOptions = {}
): Promise<T> {
  const distributed = releaseDataRequest(reference, options.releaseDataPlane);
  const path = resourcePath(reference);
  if (!path) throw new Error('JSON resource path is missing');
  if (options.releaseDataPlane && options.requireReleaseEntry && !distributed) {
    throw new Error(`Release data-plane index has no entry for ${path}`);
  }
  const url = distributed ? distributed.url : resolveUrl(path, baseUrl);
  const declaredBytes =
    typeof reference === 'object' &&
    reference !== null &&
    typeof reference.bytes === 'number' &&
    Number.isSafeInteger(reference.bytes) &&
    reference.bytes > 0
      ? reference.bytes
      : undefined;
  if (options.releaseDataPlane && new URL(url).origin !== new URL(baseUrl).origin) {
    throw new Error('Release data-plane resources must stay on the bundle origin');
  }
  const expectedHash = distributed ? distributed.expectedPackedHash : resourceHash(reference);
  if (!distributed && !expectedHash) {
    return fetchJson<T>(
      url,
      options.timeoutMs ?? 30000,
      options.attempts ?? 3,
      options.retryDelayMs ?? 250
    );
  }

  const timeoutMs = options.timeoutMs ?? 30000;
  const attempts = options.attempts ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 250;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(timeoutMs) : undefined;
    try {
      const response = await fetch(url, {
        cache: 'default',
        headers: distributed?.headers,
        signal
      });
      if (!response.ok) {
        const error = new Error(`${url}: ${response.status} ${response.statusText}`);
        if (attempt < attempts - 1 && RETRYABLE_STATUS_CODES.has(response.status)) {
          lastError = error;
          await retryDelay(retryDelayMs, attempt);
          continue;
        }
        throw error;
      }
      if (distributed) {
        if (response.status !== 206) throw new Error('Release pack server did not honour the bounded byte-range request');
        if (response.headers.get('content-encoding')) {
          throw new Error('Range packs must be served as published bytes without Content-Encoding');
        }
        if (response.headers.get('content-range') !== distributed.expectedContentRange) {
          throw new Error('Release pack Content-Range differs from the index');
        }
        const reportedLength = response.headers.get('content-length');
        if (reportedLength && Number(reportedLength) !== distributed.expectedPackedLength) {
          throw new Error('Release pack Content-Length differs from the index');
        }
      }
      const bytes = await readResponseBytes(
        response,
        url,
        distributed
          ? distributed.expectedPackedLength
          : Math.min(MAX_JSON_BYTES, declaredBytes ?? MAX_JSON_BYTES)
      );
      if (distributed && (bytes[0] !== 0x1f || bytes[1] !== 0x8b)) {
        throw new Error('Release-pack transport member is not gzip-framed');
      }
      if (distributed && bytes.byteLength !== distributed.expectedPackedLength) {
        throw new Error('Release pack byte-range length differs from the index');
      }
      if (expectedHash && (await sha256Hex(bytes)) !== expectedHash) {
        throw new Error(`Resource integrity check failed for ${url}`);
      }

      let logicalBytes = bytes;
      if (distributed?.transportCompression === 'gzip') {
        logicalBytes = await gunzipBoundedBytes(bytes, 'the release-pack transport member');
      }
      if (distributed && logicalBytes.byteLength !== distributed.expectedLength) {
        throw new Error('Release-pack decoded member length differs from the index');
      }
      if (distributed && (await sha256Hex(logicalBytes)) !== distributed.expectedHash) {
        throw new Error(`Logical resource integrity check failed for ${distributed.logicalPath}`);
      }
      if (declaredBytes !== undefined && logicalBytes.byteLength !== declaredBytes) {
        throw new Error(
          `${path}: resource byte length differs from the declared ${declaredBytes}-byte binding`
        );
      }

      const logicalPath = distributed ? distributed.logicalPath : path;
      const compression = distributed?.compression || (logicalPath.toLowerCase().endsWith('.gz') ? 'gzip' : 'identity');
      if (compression === 'gzip') {
        if (!distributed && response.headers.get('content-encoding')?.toLowerCase().includes('gzip')) {
          if (resourceHash(reference)) {
            throw new Error('Pre-compressed integrity resources must be served without Content-Encoding');
          }
        } else {
          logicalBytes = await gunzipBoundedBytes(logicalBytes, 'the advertised gzip resource');
        }
      }
      return JSON.parse(new TextDecoder().decode(logicalBytes)) as T;
    } catch (error) {
      if (attempt < attempts - 1 && isRetryableFetchError(error)) {
        lastError = error;
        await retryDelay(retryDelayMs, attempt);
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${url}: fetch failed`);
}

export async function fetchSourceJson(
  url: string,
  timeoutMs = 15000,
  attempts = 2,
  retryDelayMs = 250
): Promise<SourceJsonResponse> {
  const response = await fetchSourceResponse(url, 'json', 'application/json', timeoutMs, attempts, retryDelayMs);
  return {
    json: response.data,
    bytes: response.bytes,
    contentType: response.contentType,
    retrievedAt: response.retrievedAt,
    responseUrl: response.responseUrl
  };
}

export async function fetchSourceResponse(
  url: string,
  displayMode: InlineSourceDisplayMode,
  mediaType = '',
  timeoutMs = 15000,
  attempts = 2,
  retryDelayMs = 250
): Promise<SourceResponse> {
  let lastError: unknown;
  const candidates = displayMode === 'json' ? sourceJsonCandidates(url) : [url];
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    try {
      return await fetchSourceResponseCandidate(
        candidates[candidateIndex],
        displayMode,
        mediaType,
        timeoutMs,
        attempts,
        retryDelayMs
      );
    } catch (error) {
      lastError = error;
      if (candidateIndex === candidates.length - 1) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${url}: fetch failed`);
}

export function sourceJsonCandidates(url: string): string[] {
  try {
    const parsed = new URL(url);
    if ((parsed.hostname === 'data.gov.uk' || parsed.hostname === 'www.data.gov.uk') && /^\/api\/(?:3\/)?action\//.test(parsed.pathname)) {
      const canonical = new URL(parsed.toString());
      canonical.protocol = 'https:';
      canonical.hostname = 'ckan.publishing.service.gov.uk';
      canonical.pathname = parsed.pathname.replace(/^\/api\/(?:3\/)?action\//, '/api/3/action/');
      return [canonical.toString(), parsed.toString()];
    }
  } catch {
    // The caller reports malformed URLs before attempting a source fetch.
  }
  return [url];
}

function sourceAcceptHeader(displayMode: InlineSourceDisplayMode, mediaType: string): string {
  const declared = mediaType.trim();
  const defaults: Record<InlineSourceDisplayMode, string> = {
    json: 'application/json, application/*+json;q=0.9',
    xml: 'application/xml, text/xml;q=0.9, application/*+xml;q=0.8',
    text: 'text/plain, text/*;q=0.9'
  };
  return declared && !defaults[displayMode].startsWith(declared)
    ? `${declared}, ${defaults[displayMode]}`
    : defaults[displayMode];
}

async function fetchSourceResponseCandidate(
  url: string,
  displayMode: InlineSourceDisplayMode,
  mediaType: string,
  timeoutMs: number,
  attempts: number,
  retryDelayMs: number
): Promise<SourceResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(timeoutMs) : undefined;
    try {
      const response = await fetch(url, {
        cache: 'default',
        headers: { Accept: sourceAcceptHeader(displayMode, mediaType) },
        signal
      });
      if (!response.ok) {
        const error = new Error(`${url}: ${response.status} ${response.statusText}`);
        if (attempt < attempts - 1 && RETRYABLE_STATUS_CODES.has(response.status)) {
          lastError = error;
          await retryDelay(retryDelayMs, attempt);
          continue;
        }
        throw error;
      }
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) > MAX_SOURCE_JSON_BYTES) {
        throw new Error(`${url}: response too large (${Number(contentLength)} bytes, limit ${MAX_SOURCE_JSON_BYTES})`);
      }
      const text = await readResponseText(response, url, MAX_SOURCE_JSON_BYTES);
      return {
        data: displayMode === 'json' ? JSON.parse(text) as unknown : null,
        text,
        displayMode,
        bytes: new TextEncoder().encode(text).byteLength,
        contentType: response.headers.get('content-type') || mediaType || (displayMode === 'xml' ? 'application/xml' : displayMode === 'text' ? 'text/plain' : 'application/json'),
        retrievedAt: new Date().toISOString(),
        responseUrl: response.url || url
      };
    } catch (error) {
      if (attempt < attempts - 1 && isRetryableFetchError(error)) {
        lastError = error;
        await retryDelay(retryDelayMs, attempt);
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${url}: fetch failed`);
}

function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || error.name === 'TimeoutError' || error instanceof TypeError;
}

function retryDelay(baseDelayMs: number, attempt: number): Promise<void> {
  if (baseDelayMs <= 0) return Promise.resolve();
  return new Promise((resolve) => globalThis.setTimeout(resolve, baseDelayMs * 2 ** attempt));
}

export function baseUrlFor(url: string): string {
  return new URL('.', url).toString();
}

export async function readResponseText(response: Response, url: string, maxBytes: number = MAX_JSON_BYTES): Promise<string> {
  if (url.toLowerCase().endsWith('.gz') && !response.headers.get('content-encoding')?.toLowerCase().includes('gzip')) {
    if (!response.body || typeof DecompressionStream === 'undefined') {
      throw new Error(`${url}: this browser cannot decompress the gzip corpus chunk`);
    }
    response = new Response(response.body.pipeThrough(new DecompressionStream('gzip')));
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error(`${url}: response too large (stream exceeded ${maxBytes} bytes)`);
    }
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      reader.cancel().catch(() => {});
      throw new Error(`${url}: response too large (stream exceeded ${maxBytes} bytes)`);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}
