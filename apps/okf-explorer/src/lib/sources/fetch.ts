export const MAX_JSON_BYTES = 64 * 1024 * 1024;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export function resolveUrl(path: string, base: string): string {
  return new URL(path, base).toString();
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
