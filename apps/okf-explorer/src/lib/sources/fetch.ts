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
  return (await response.json()) as T;
}

export function baseUrlFor(url: string): string {
  return new URL('.', url).toString();
}
