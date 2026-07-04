export function resolveUrl(path: string, base: string): string {
  return new URL(path, base).toString();
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'default' });
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export function baseUrlFor(url: string): string {
  return new URL('.', url).toString();
}
