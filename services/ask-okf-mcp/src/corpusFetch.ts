import type { ApprovedCorpus } from './registry.ts';

export const CORPUS_CACHE_BYTES = 8 * 1024 * 1024;
export const CORPUS_CACHE_FILES = 64;

/** Bounded transport cache for immutable public files, never questions/packages. */
export function createCorpusFetcher(source: ApprovedCorpus, upstream: typeof fetch = fetch): typeof fetch {
  const root = new URL('.', source.binding.index_url);
  const refs = [source.manifest.base_index, ...source.manifest.records.shards, ...Object.values(source.manifest.search.shards)];
  const allowed = new Map(refs.map(ref => [new URL(ref.path, root).href, ref]));
  const cached = new Map<string, Uint8Array>();
  const pending = new Map<string, Promise<Uint8Array>>();
  let cacheBytes = 0;
  const acquire = async (url: string, init?: RequestInit): Promise<Uint8Array> => {
    const ref = allowed.get(url);
    if (!ref || (init?.method && init.method !== 'GET') || init?.body) throw new Error('Corpus asset is not approved.');
    const hit = cached.get(url);
    if (hit) { cached.delete(url); cached.set(url, hit); return hit; }
    if (pending.has(url)) return pending.get(url)!;
    const promise = (async () => {
      // workerd rejects redirect:'error' before I/O. Manual mode never follows
      // Location; every 3xx response fails the same non-OK guard below.
      const response = await upstream(url, { redirect: 'manual', credentials: 'omit', signal: init?.signal ?? AbortSignal.timeout(15000) });
      if (!response.ok || (response.url && response.url !== url) || !response.body) throw new Error('Approved corpus asset is unavailable.');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = []; let length = 0;
      try {
        while (true) {
          const item = await reader.read(); if (item.done) break;
          length += item.value.byteLength;
          if (length > ref.bytes) { await reader.cancel(); throw new Error('Corpus asset exceeds its binding.'); }
          chunks.push(item.value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      if (length !== ref.bytes || hash !== ref.sha256) throw new Error('Corpus asset integrity check failed.');
      while (cached.size >= CORPUS_CACHE_FILES || cacheBytes + length > CORPUS_CACHE_BYTES) {
        const oldest = cached.keys().next().value;
        if (oldest === undefined) break;
        cacheBytes -= cached.get(oldest)!.length; cached.delete(oldest);
      }
      if (length <= CORPUS_CACHE_BYTES) { cached.set(url, bytes); cacheBytes += length; }
      return bytes;
    })();
    pending.set(url, promise);
    try { return await promise; } finally { pending.delete(url); }
  };
  return async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // Never preserve caller headers, cookies or credentials on the source fetch.
    const raw = await acquire(url, init);
    return new Response(raw as BodyInit, { headers: { 'Content-Type': 'application/octet-stream' } });
  };
}
