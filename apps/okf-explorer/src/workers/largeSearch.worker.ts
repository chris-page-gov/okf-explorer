import type {
  LargeFilterPostings,
  LargeSearchManifest,
  LargeSearchRequest,
  LargeSearchResponse,
  LargeSortValue,
  SearchResultDoc,
  SearchSuggestion
} from '$lib/types';
import {
  compareSortValues,
  dynamicFacetRows,
  filterOrdinals,
  intersectOrdinals,
  inverseDocumentFrequency,
  rankingScore,
  type OrdinalScores
} from '$lib/search/staticSearch';

type InitMessage = {
  type: 'init';
  id: number;
  baseUrl: string;
  manifestUrl: string;
};

type QueryMessage = {
  type: 'query';
  id: number;
  request: LargeSearchRequest;
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
const filterPostingsCache = new Map<string, Promise<LargeFilterPostings>>();
let sortValuesPromise: Promise<LargeSortValue[]> | null = null;

const MAX_JSON_BYTES = 64 * 1024 * 1024;

function resolvePath(path: string): string {
  return new URL(path, baseUrl).toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  if (!jsonCache.has(url)) {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(30000) : undefined;
    const request = fetch(url, { signal }).then(async (response) => {
      if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
      const contentLength = response.headers.get('content-length');
      if (contentLength && Number(contentLength) > MAX_JSON_BYTES) {
        throw new Error(`${url}: response too large (${Number(contentLength)} bytes, limit ${MAX_JSON_BYTES})`);
      }
      return JSON.parse(await readResponseText(response, url)) as T;
    });
    // Drop failed fetches from the cache so transient errors can be retried.
    request.catch(() => jsonCache.delete(url));
    jsonCache.set(url, request);
  }
  return (await jsonCache.get(url)) as T;
}

async function readResponseText(response: Response, url: string): Promise<string> {
  if (url.toLowerCase().endsWith('.gz') && !response.headers.get('content-encoding')?.toLowerCase().includes('gzip')) {
    if (!response.body || typeof DecompressionStream === 'undefined') {
      throw new Error(`${url}: this browser cannot decompress the gzip search chunk`);
    }
    response = new Response(response.body.pipeThrough(new DecompressionStream('gzip')));
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
      throw new Error(`${url}: response too large (stream exceeded ${MAX_JSON_BYTES} bytes)`);
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
    if (received > MAX_JSON_BYTES) {
      reader.cancel().catch(() => {});
      throw new Error(`${url}: response too large (stream exceeded ${MAX_JSON_BYTES} bytes)`);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
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

async function filterPostingsFor(key: string): Promise<LargeFilterPostings | null> {
  const path = manifest?.entrypoints.filter_postings?.[key];
  if (!path) return null;
  if (!filterPostingsCache.has(key)) {
    filterPostingsCache.set(key, fetchJson<LargeFilterPostings>(resolvePath(path)));
  }
  return filterPostingsCache.get(key)!;
}

async function sortValues(): Promise<LargeSortValue[]> {
  const path = manifest?.entrypoints.sort_values;
  if (!path) return [];
  if (!sortValuesPromise) sortValuesPromise = fetchJson<LargeSortValue[]>(resolvePath(path));
  return sortValuesPromise;
}

function allOrdinals(): Set<number> {
  const count = manifest?.counts.documents || 0;
  return new Set(Array.from({ length: count }, (_value, ordinal) => ordinal));
}

function matchedFields(mask: number): string[] {
  if (!manifest) return [];
  return Object.entries(manifest.field_masks)
    .filter(([, fieldMask]) => (mask & fieldMask) !== 0)
    .map(([field]) => field);
}

function exactBoost(doc: SearchResultDoc | undefined, query: string): number {
  if (!doc) return 0;
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;
  const title = doc.title.trim().toLowerCase();
  const name = doc.name.trim().toLowerCase();
  if (title === normalized) return 32;
  if (name === normalized || doc.open.toLowerCase() === normalized) return 24;
  if (title.includes(normalized)) return 12;
  if (name.includes(normalized) || doc.open.toLowerCase().includes(normalized)) return 8;
  return 0;
}

async function queryIndex(request: LargeSearchRequest): Promise<LargeSearchResponse> {
  const started = performance.now();
  if (!manifest) throw new Error('Search worker is not initialised');
  const query = request.query.trim();
  const tokens = tokenize(query);
  const entryGroups = (await Promise.all(tokens.map(entriesForToken))).filter((group) => group.length);
  entryGroups.sort((a, b) => Math.min(...a.map((entry) => entry.df)) - Math.min(...b.map((entry) => entry.df)));
  if (tokens.length && !entryGroups.length) {
    return {
      results: [],
      total: 0,
      truncated: false,
      filters_applied: !Object.keys(request.filters).length,
      facets: {},
      ranking: request.ranking || 'weighted',
      elapsed_ms: Math.round(performance.now() - started)
    };
  }

  const scores: OrdinalScores = new Map();
  const sets: Set<number>[] = [];
  const completeSets: Set<number>[] = [];
  let cappedCandidates = false;
  for (const entries of entryGroups) {
    const set = new Set<number>();
    for (const entry of entries) {
      const chunk = await postingsFor(entry.postings);
      const postings = chunk[entry.token] || [];
      const idf = inverseDocumentFrequency(manifest.counts.documents || 0, entry.df);
      for (const [ordinal, baseScore, mask] of postings) {
        set.add(ordinal);
        const current = scores.get(ordinal) || { weighted: 0, idf: 0, mask: 0 };
        const weighted = baseScore + (mask & 1 ? 4 : 0);
        scores.set(ordinal, {
          weighted: current.weighted + weighted,
          idf: current.idf + weighted * idf,
          mask: current.mask | mask
        });
      }
    }
    sets.push(set);
    if (entries.every((entry) => entry.df <= (manifest?.counts.max_postings_per_token || Number.MAX_SAFE_INTEGER))) {
      completeSets.push(set);
    } else {
      cappedCandidates = true;
    }
  }

  // A capped high-frequency token is useful for scoring but cannot safely be
  // required for intersection: the matching document may have been omitted
  // from that token's bounded posting list. Intersect complete lists only.
  const intersectionSets = completeSets.length ? completeSets : sets.slice(0, 1);
  let matches = tokens.length ? intersectionSets[0] || new Set<number>() : allOrdinals();
  for (const set of intersectionSets.slice(1)) matches = intersectOrdinals(matches, set);
  if (!matches.size && intersectionSets.length > 1) {
    matches = new Set<number>();
    for (const set of intersectionSets) {
      for (const value of set) matches.add(value);
    }
  }

  const requestedPostingKeys = [...new Set([...Object.keys(request.filters), ...(request.facet_keys || [])])];
  const filterIndexes = new Map<string, LargeFilterPostings>();
  await Promise.all(requestedPostingKeys.map(async (key) => {
    const postings = await filterPostingsFor(key);
    if (postings) filterIndexes.set(key, postings);
  }));
  const filtered = filterOrdinals(matches, request.filters, filterIndexes);
  const facets: LargeSearchResponse['facets'] = {};
  for (const key of request.facet_keys || []) {
    const postings = filterIndexes.get(key);
    if (!postings) continue;
    const facetUniverse = filterOrdinals(matches, request.filters, filterIndexes, key).ordinals;
    facets[key] = dynamicFacetRows(facetUniverse, postings);
  }

  const strategy = request.ranking || 'weighted';
  const limit = manifest.result_limit || 200;
  let ordinals = [...filtered.ordinals];
  if (request.sort === 'relevance' && tokens.length) {
    ordinals.sort((left, right) => {
      const leftScore = scores.get(left) || { weighted: 0, idf: 0 };
      const rightScore = scores.get(right) || { weighted: 0, idf: 0 };
      return rankingScore(rightScore, strategy) - rankingScore(leftScore, strategy) || left - right;
    });
  } else {
    const values = await sortValues();
    if (values.length) {
      const sort = request.sort === 'relevance' ? 'newest' : request.sort;
      ordinals.sort((left, right) => compareSortValues(left, right, sort, values));
    } else {
      ordinals.sort((left, right) => left - right);
    }
  }

  const prelimit = strategy === 'idf-exact' && request.sort === 'relevance' ? limit * 3 : limit;
  ordinals = ordinals.slice(0, prelimit);
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
  if (strategy === 'idf-exact' && request.sort === 'relevance') {
    ordinals.sort((left, right) => {
      const leftScore = scores.get(left) || { weighted: 0, idf: 0 };
      const rightScore = scores.get(right) || { weighted: 0, idf: 0 };
      return (
        rankingScore(rightScore, strategy, exactBoost(docsByOrdinal.get(right), query)) -
          rankingScore(leftScore, strategy, exactBoost(docsByOrdinal.get(left), query)) ||
        left - right
      );
    });
  }

  const results: SearchResultDoc[] = [];
  for (const ordinal of ordinals.slice(0, limit)) {
    const doc = docsByOrdinal.get(ordinal);
    if (!doc) continue;
    const score = scores.get(ordinal) || { weighted: 0, idf: 0, mask: 0 };
    const exact = strategy === 'idf-exact' ? exactBoost(doc, query) : 0;
    const total = request.sort === 'relevance' ? rankingScore(score, strategy, exact) : 0;
    results.push({
      ...doc,
      score: Math.round(total * 1000) / 1000,
      match: {
        query_tokens: tokens,
        matched_fields: matchedFields(score.mask),
        score_components: {
          weighted: Math.round(score.weighted * 1000) / 1000,
          idf: Math.round(score.idf * 1000) / 1000,
          exact,
          total: Math.round(total * 1000) / 1000
        }
      }
    });
  }
  return {
    results,
    total: filtered.ordinals.size,
    truncated: cappedCandidates || filtered.ordinals.size > limit,
    filters_applied: filtered.applied,
    facets,
    ranking: strategy,
    elapsed_ms: Math.round(performance.now() - started)
  };
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
      self.postMessage({ type: 'results', id: message.id, response: await queryIndex(message.request) });
      return;
    }
    if (message.type === 'suggest') {
      self.postMessage({ type: 'suggestions', id: message.id, suggestions: await suggestionsFor(message.prefix) });
    }
  } catch (error) {
    self.postMessage({ type: 'error', id: message.id, error: error instanceof Error ? error.message : String(error) });
  }
};
