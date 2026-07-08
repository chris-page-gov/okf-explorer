export const MAX_JSON_BYTES = 64 * 1024 * 1024;

export function resolveUrl(path: string, base: string): string {
  return new URL(path, base).toString();
}

export async function fetchJson<T>(url: string, timeoutMs = 30000): Promise<T> {
  const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(timeoutMs) : undefined;
  const response = await fetch(url, { cache: 'default', signal });
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_JSON_BYTES) {
    throw new Error(`${url}: response too large (${Number(contentLength)} bytes, limit ${MAX_JSON_BYTES})`);
  }
  return JSON.parse(await readResponseText(response, url, MAX_JSON_BYTES)) as T;
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
