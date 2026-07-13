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

export async function fetchSourceJson(
  url: string,
  timeoutMs = 15000,
  attempts = 2,
  retryDelayMs = 250
): Promise<SourceJsonResponse> {
  let lastError: unknown;
  const candidates = sourceJsonCandidates(url);
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    try {
      return await fetchSourceJsonCandidate(candidates[candidateIndex], timeoutMs, attempts, retryDelayMs);
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

async function fetchSourceJsonCandidate(
  url: string,
  timeoutMs: number,
  attempts: number,
  retryDelayMs: number
): Promise<SourceJsonResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(timeoutMs) : undefined;
    try {
      const response = await fetch(url, {
        cache: 'default',
        headers: { Accept: 'application/json, application/*+json;q=0.9' },
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
        json: JSON.parse(text) as unknown,
        bytes: new TextEncoder().encode(text).byteLength,
        contentType: response.headers.get('content-type') || 'application/json',
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
