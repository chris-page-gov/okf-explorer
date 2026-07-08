import type { LargeSearchManifest, SearchResultDoc, SearchSuggestion } from '$lib/types';

type InitMessage = {
  type: 'init';
  id: number;
  baseUrl: string;
  manifestUrl: string;
};

type QueryMessage = {
  type: 'query';
  id: number;
  query: string;
};

type SuggestMessage = {
  type: 'suggest';
  id: number;
  prefix: string;
};

type WorkerMessage = InitMessage | QueryMessage | SuggestMessage;
type SearchEntry = { token: string; df: number; postings: string };

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'with']);

let baseUrl = '';
let manifest: LargeSearchManifest | null = null;
const jsonCache = new Map<string, Promise<unknown>>();
const lexiconCache = new Map<string, Promise<Map<string, SearchEntry>>>();
const postingsCache = new Map<string, Promise<Record<string, Array<[number, number, number]>>>>();
const docCache = new Map<string, Promise<SearchResultDoc[]>>();
const prefixCache = new Map<string, Promise<Record<string, SearchSuggestion[]>>>();

const MAX_JSON_BYTES = 64 * 1024 * 1024;

function resolvePath(path: string): string {
  return new URL(path, baseUrl).toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  if (!jsonCache.has(url)) {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(30000) : undefined;
    const request = fetch(url, { signal }).then((response) => {
      if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) > MAX_JSON_BYTES) {
        throw new Error(`${url}: response too large (${Number(contentLength)} bytes, limit ${MAX_JSON_BYTES})`);
      }
      return response.json() as Promise<T>;
    });
    // Drop failed fetches from the cache so transient errors can be retried.
    request.catch(() => jsonCache.delete(url));
    jsonCache.set(url, request);
  }
  return (await jsonCache.get(url)) as T;
}

function tokenize(value: string): string[] {
  const text = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(/[a-z0-9][a-z0-9._-]*/g)) {
    const token = match[0].replace(/^[._-]+|[._-]+$/g, '');
    if (token.length < (manifest?.token_min_length || 2) || STOP_WORDS.has(token) || seen.has(token)) continue;
    tokens.push(token);
    seen.add(token);
  }
  return tokens;
}

function shardFor(value: string): string {
  const clean = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean.slice(0, manifest?.lexicon_shard_length || 2) || '_';
}

async function lexiconEntry(token: string) {
  if (!manifest) return null;
  const shard = shardFor(token);
  const path = manifest.entrypoints.lexicon[shard] || manifest.entrypoints.lexicon._;
  if (!path) return null;
  if (!lexiconCache.has(shard)) {
    lexiconCache.set(
      shard,
      fetchJson<SearchEntry[]>(resolvePath(path)).then((rows) => new Map(rows.map((row) => [row.token, row])))
    );
  }
  return (await lexiconCache.get(shard))?.get(token) || null;
}

async function suggestionsFor(prefix: string): Promise<SearchSuggestion[]> {
  if (!manifest) return [];
  const tokens = tokenize(prefix);
  const normalised = tokens[tokens.length - 1] || prefix.toLowerCase().replace(/[^a-z0-9]/g, '');
  const minLength = manifest.prefix_min_length || 3;
  const maxStoredPrefixLength = 8;
  if (normalised.length < minLength) return [];
  const shard = shardFor(normalised);
  const path = manifest.entrypoints.prefixes[shard] || manifest.entrypoints.prefixes._;
  if (!path) return [];
  if (!prefixCache.has(shard)) {
    prefixCache.set(shard, fetchJson<Record<string, SearchSuggestion[]>>(resolvePath(path)));
  }
  const payload = await prefixCache.get(shard)!;
  for (let length = Math.min(normalised.length, maxStoredPrefixLength); length >= minLength; length -= 1) {
    const rows = payload[normalised.slice(0, length)] || [];
    if (!rows.length) continue;
    const exactPrefix = rows.filter((item) => item.token.startsWith(normalised));
    return (exactPrefix.length ? exactPrefix : rows).slice(0, 16);
  }
  return [];
}

async function entriesForToken(token: string): Promise<SearchEntry[]> {
  const exact = await lexiconEntry(token);
  if (exact) return [exact];
  const suggestions = await suggestionsFor(token);
  const entries = await Promise.all(suggestions.map((suggestion) => lexiconEntry(suggestion.token)));
  return entries.filter((entry): entry is SearchEntry => Boolean(entry));
}

async function postingsFor(path: string) {
  if (!postingsCache.has(path)) {
    postingsCache.set(
      path,
      fetchJson<{ tokens: Record<string, Array<[number, number, number]>> }>(resolvePath(path)).then((payload) => payload.tokens || {})
    );
  }
  return postingsCache.get(path)!;
}

async function docsFor(path: string) {
  if (!docCache.has(path)) {
    docCache.set(path, fetchJson<SearchResultDoc[]>(resolvePath(path)));
  }
  return docCache.get(path)!;
}

function intersect(left: Set<number>, right: Set<number>): Set<number> {
  const out = new Set<number>();
  for (const value of left) {
    if (right.has(value)) out.add(value);
  }
  return out;
}

async function queryIndex(query: string): Promise<SearchResultDoc[]> {
  if (!manifest) throw new Error('Search worker is not initialised');
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const entryGroups = (await Promise.all(tokens.map(entriesForToken))).filter((group) => group.length);
  entryGroups.sort((a, b) => Math.min(...a.map((entry) => entry.df)) - Math.min(...b.map((entry) => entry.df)));
  if (!entryGroups.length) return [];

  const scores = new Map<number, number>();
  const sets: Set<number>[] = [];
  for (const entries of entryGroups) {
    const set = new Set<number>();
    for (const entry of entries) {
      const chunk = await postingsFor(entry.postings);
      const postings = chunk[entry.token] || [];
      for (const [ordinal, baseScore, mask] of postings) {
        set.add(ordinal);
        scores.set(ordinal, (scores.get(ordinal) || 0) + baseScore + (mask & 1 ? 4 : 0));
      }
    }
    sets.push(set);
  }

  let matches = sets[0] || new Set<number>();
  for (const set of sets.slice(1)) matches = intersect(matches, set);
  if (!matches.size && sets.length > 1) {
    matches = new Set<number>();
    for (const set of sets) {
      for (const value of set) matches.add(value);
    }
  }

  const ordinals = [...matches]
    .sort((a, b) => (scores.get(b) || 0) - (scores.get(a) || 0) || a - b)
    .slice(0, manifest.result_limit || 200);
  const docsByOrdinal = new Map<number, SearchResultDoc>();
  const chunkPaths = new Set<string>();
  for (const ordinal of ordinals) {
    const path = manifest.entrypoints.result_docs[Math.floor(ordinal / (manifest.result_doc_chunk_size || 1000))];
    if (path) chunkPaths.add(path);
  }
  await Promise.all(
    [...chunkPaths].map(async (path) => {
      for (const doc of await docsFor(path)) docsByOrdinal.set(doc.ordinal, doc);
    })
  );
  const results: SearchResultDoc[] = [];
  for (const ordinal of ordinals) {
    const doc = docsByOrdinal.get(ordinal);
    if (doc) results.push({ ...doc, score: scores.get(ordinal) || 0 });
  }
  return results;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      baseUrl = message.baseUrl;
      manifest = await fetchJson<LargeSearchManifest>(message.manifestUrl);
      self.postMessage({ type: 'ready', id: message.id, manifest });
      return;
    }
    if (message.type === 'query') {
      self.postMessage({ type: 'results', id: message.id, results: await queryIndex(message.query) });
      return;
    }
    if (message.type === 'suggest') {
      self.postMessage({ type: 'suggestions', id: message.id, suggestions: await suggestionsFor(message.prefix) });
    }
  } catch (error) {
    self.postMessage({ type: 'error', id: message.id, error: error instanceof Error ? error.message : String(error) });
  }
};
