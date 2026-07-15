import type {
  LargeFilterPostings,
  LargeReleaseDataPlaneIndex,
  LargeResourceReference,
  LargeShardMetadata,
  LargeSearchManifest,
  LargeSearchRequest,
  LargeSearchResponse,
  LargeSortValue,
  SearchEntity,
  SearchEntityMatch,
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
import { SEARCH_MANIFEST_LIMITS, validateLargeSearchManifest } from '$lib/search/largeSearchContract';
import { fetchJsonResource } from '$lib/sources/fetch';
import {
  type PreparedReleaseDataPlane,
  canonicalJson,
  prepareReleaseDataPlane,
  releaseDataRequest,
  resourceHash,
  sha256Hex,
  resourcePath
} from '$lib/sources/releaseDataPlane';

type InitMessage = {
  type: 'init';
  id: number;
  baseUrl: string;
  manifestReference: LargeResourceReference;
  releaseDataPlane?: LargeReleaseDataPlaneIndex;
  snapshot?: string;
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
const ENTITY_CONNECTORS = new Set(['a', 'an', 'and', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'with']);
const ENTITY_SCORE = 64;

let baseUrl = '';
let manifest: LargeSearchManifest | null = null;
let releaseDataPlane: PreparedReleaseDataPlane | undefined;
let shardIntegrity = new Map<string, string>();
const jsonCache = new Map<string, Promise<unknown>>();
const lexiconCache = new Map<string, Promise<Map<string, SearchEntry>>>();
const postingsCache = new Map<string, Promise<Record<string, Array<[number, number, number]>>>>();
const docCache = new Map<string, Promise<SearchResultDoc[]>>();
const prefixCache = new Map<string, Promise<Record<string, SearchSuggestion[]>>>();
const filterPostingsCache = new Map<string, Promise<LargeFilterPostings>>();
let sortValuesPromise: Promise<LargeSortValue[]> | null = null;
let entitiesPromise: Promise<SearchEntity[]> | null = null;
let legacyFacetsPromise: Promise<Record<string, Record<string, number[]>>> | null = null;

async function fetchJson<T>(reference: LargeResourceReference, requireReleaseEntry = false): Promise<T> {
  const path = resourcePath(reference);
  if (!path) throw new Error('Search resource path is missing');
  const hash = resourceHash(reference);
  const key = releaseDataPlane
    ? `${path}#${hash}#${requireReleaseEntry ? 'packed' : 'auto'}`
    : `${new URL(path, baseUrl).toString()}#${hash}`;
  if (!jsonCache.has(key)) {
    const request = fetchJsonResource<T>(reference, baseUrl, { releaseDataPlane, requireReleaseEntry });
    // Drop failed fetches from the cache so transient errors can be retried.
    request.catch(() => jsonCache.delete(key));
    jsonCache.set(key, request);
  }
  return (await jsonCache.get(key)) as T;
}

function bindShardIntegrity(reference: LargeResourceReference, label: string): LargeResourceReference {
  const path = resourcePath(reference);
  if (!path) throw new Error(`${label} path is missing`);
  const advertisedHash = resourceHash(reference);
  const expectedHash = shardIntegrity.get(path) || '';
  if (advertisedHash && expectedHash && advertisedHash !== expectedHash) {
    throw new Error(`${label} integrity differs from the search shard manifest`);
  }
  if (expectedHash) return { path, sha256: expectedHash };
  if (manifest?.shard_metadata) throw new Error(`${label} has no integrity metadata`);
  return reference;
}

type SearchShardIntegrityDocument = {
  snapshot?: string;
  snapshot_id?: string;
  shards?: Record<string, LargeShardMetadata[]>;
};

async function loadShardIntegrity(expectedSnapshot: string): Promise<Map<string, string>> {
  if (!manifest?.shard_metadata) {
    if (releaseDataPlane) throw new Error('Release-packed search manifest has no shard-integrity document');
    return new Map();
  }
  const document = await fetchJson<SearchShardIntegrityDocument>(manifest.shard_metadata);
  if (!document || typeof document !== 'object' || !document.shards || typeof document.shards !== 'object') {
    throw new Error('Search shard metadata is malformed');
  }
  const snapshot = String(document.snapshot_id || document.snapshot || '');
  if (expectedSnapshot && snapshot !== expectedSnapshot) {
    throw new Error('Search shard metadata snapshot differs from the loaded bundle snapshot');
  }
  const expectedRoot = String(manifest.shard_manifest_sha256 || '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedRoot)) {
    throw new Error('Search manifest has no valid shard-manifest SHA-256');
  }
  const observedRoot = await sha256Hex(`${canonicalJson(document.shards)}\n`);
  if (observedRoot !== expectedRoot) throw new Error('Search shard metadata integrity check failed');

  const entries = new Map<string, string>();
  for (const rows of Object.values(document.shards)) {
    if (!Array.isArray(rows)) throw new Error('Search shard metadata group is malformed');
    for (const row of rows) {
      const path = resourcePath(row);
      const hash = resourceHash(row);
      if (!path || !hash) throw new Error('Search shard metadata row is incomplete');
      if (expectedSnapshot && String(row.snapshot || '') !== expectedSnapshot) {
        throw new Error('Search shard snapshot differs from the loaded bundle snapshot');
      }
      if (entries.has(path)) throw new Error('Duplicate search shard integrity path');
      if (releaseDataPlane && !releaseDataRequest(row, releaseDataPlane)) {
        throw new Error(`Release data-plane index has no entry for search shard ${path}`);
      }
      entries.set(path, hash);
    }
  }
  return entries;
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
      fetchJson<SearchEntry[]>(bindShardIntegrity(path, 'Search lexicon shard'), Boolean(releaseDataPlane)).then(
        (rows) => new Map(rows.map((row) => [row.token, row]))
      )
    );
  }
  return (await lexiconCache.get(shard))?.get(token) || null;
}

function normalizePhrase(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function humanizeFacetValue(value: string): string {
  const words = normalizePhrase(value).split(' ').filter(Boolean);
  return words
    .map((word, index) => (index > 0 && ENTITY_CONNECTORS.has(word) ? word : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`))
    .join(' ');
}

function inferredEntityAliases(label: string): string[] {
  const words = normalizePhrase(label).split(' ').filter(Boolean);
  const candidates = [
    words.filter((word) => !ENTITY_CONNECTORS.has(word)).map((word) => word[0]).join(''),
    words.map((word) => word[0]).join('')
  ];
  return [...new Set(candidates.filter((value) => value.length >= 3 && value.length <= 8).map((value) => value.toUpperCase()))];
}

type SearchEntityPayload = { schema?: string; entities?: SearchEntity[] } | SearchEntity[];
type FacetPayload = Record<string, Record<string, number[]> | Array<{ value: string; count: number }>>;

async function legacyFacets(): Promise<Record<string, Record<string, number[]>>> {
  if (!manifest?.entrypoints.facets) return {};
  if (!legacyFacetsPromise) {
    legacyFacetsPromise = fetchJson<FacetPayload>(manifest.entrypoints.facets)
      .then((payload) => {
        const out: Record<string, Record<string, number[]>> = {};
        for (const [key, values] of Object.entries(payload || {})) {
          if (!Array.isArray(values)) out[key] = values;
        }
        return out;
      })
      .catch(() => ({}));
  }
  return legacyFacetsPromise;
}

async function searchEntities(): Promise<SearchEntity[]> {
  if (!manifest) return [];
  if (!entitiesPromise) {
    const explicitEntities = Boolean(manifest.entrypoints.entities);
    const load = (async () => {
      let entities: SearchEntity[] = [];
      if (manifest?.entrypoints.entities) {
        const payload = await fetchJson<SearchEntityPayload>(
          bindShardIntegrity(manifest.entrypoints.entities, 'Search entity shard'),
          Boolean(releaseDataPlane)
        );
        entities = Array.isArray(payload) ? payload : payload.entities || [];
      } else if (manifest?.entrypoints.facets) {
        const facets = await fetchJson<FacetPayload>(manifest.entrypoints.facets);
        const publishers = facets.publisher;
        if (Array.isArray(publishers)) {
          entities = publishers.map((row) => ({
            id: `facet/publisher/${row.value}`,
            label: humanizeFacetValue(row.value),
            kind: 'organisation',
            filter_key: 'publisher',
            filter_value: row.value,
            count: row.count,
            route: `publisher/${row.value}`
          }));
        } else if (publishers) {
          entities = Object.entries(publishers).map(([value, encoded]) => ({
            id: `facet/publisher/${value}`,
            label: humanizeFacetValue(value),
            kind: 'organisation',
            filter_key: 'publisher',
            filter_value: value,
            count: encoded.length,
            route: `publisher/${value}`
          }));
        }
      }
      return entities
        .filter((entity) => entity.id && entity.label && entity.filter_key && entity.filter_value)
        .map((entity) => ({
          ...entity,
          aliases: [...new Set([...(entity.aliases || []), ...inferredEntityAliases(entity.label)])]
        }));
    })();
    entitiesPromise = explicitEntities ? load : load.catch(() => []);
  }
  return entitiesPromise;
}

function entitySearchValues(entity: SearchEntity): string[] {
  return [...new Set([entity.label, entity.filter_value, ...(entity.aliases || [])].map(normalizePhrase).filter(Boolean))];
}

async function recognizedEntity(query: string): Promise<{ entity: SearchEntity; match: SearchEntityMatch } | null> {
  const normalized = normalizePhrase(query);
  if (!normalized) return null;
  const matches = (await searchEntities()).filter((entity) => entitySearchValues(entity).includes(normalized));
  if (matches.length !== 1) return null;
  const entity = matches[0];
  const matchedAlias = (entity.aliases || []).find((alias) => normalizePhrase(alias) === normalized);
  return {
    entity,
    match: {
      id: entity.id,
      label: entity.label,
      kind: entity.kind,
      filter_key: entity.filter_key,
      filter_value: entity.filter_value,
      ...(matchedAlias ? { matched_alias: matchedAlias } : {})
    }
  };
}

async function entitySuggestionsFor(query: string): Promise<SearchSuggestion[]> {
  const normalized = normalizePhrase(query);
  if (normalized.length < 2) return [];
  return (await searchEntities())
    .map((entity) => {
      const values = entitySearchValues(entity);
      const exact = values.includes(normalized);
      const prefix = values.some((value) => value.startsWith(normalized));
      const wordPrefix = values.some((value) => value.split(' ').some((word) => word.startsWith(normalized)));
      return { entity, rank: exact ? 0 : prefix ? 1 : wordPrefix ? 2 : 3 };
    })
    .filter((row) => row.rank < 3)
    .sort((left, right) => left.rank - right.rank || (right.entity.count || 0) - (left.entity.count || 0) || left.entity.label.localeCompare(right.entity.label))
    .slice(0, 8)
    .map(({ entity }) => ({
      token: entity.label,
      label: entity.label,
      query: entity.label,
      df: entity.count || 0,
      kind: 'entity',
      entity_kind: entity.kind
    }));
}

async function lexicalSuggestionsFor(prefix: string): Promise<SearchSuggestion[]> {
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
    prefixCache.set(
      shard,
      fetchJson<Record<string, SearchSuggestion[]>>(
        bindShardIntegrity(path, 'Search prefix shard'),
        Boolean(releaseDataPlane)
      )
    );
  }
  const payload = await prefixCache.get(shard)!;
  for (let length = Math.min(normalised.length, maxStoredPrefixLength); length >= minLength; length -= 1) {
    const rows = payload[normalised.slice(0, length)] || [];
    if (!rows.length) continue;
    const exactPrefix = rows.filter((item) => item.token.startsWith(normalised));
    return (exactPrefix.length ? exactPrefix : rows).slice(0, 16).map((row) => ({ ...row, kind: 'term' }));
  }
  return [];
}

async function suggestionsFor(prefix: string): Promise<SearchSuggestion[]> {
  const entities = await entitySuggestionsFor(prefix);
  if (entities.length || normalizePhrase(prefix).includes(' ')) return entities;
  return (await lexicalSuggestionsFor(prefix)).slice(0, 8);
}

async function entriesForToken(token: string): Promise<SearchEntry[]> {
  const exact = await lexiconEntry(token);
  if (exact) return [exact];
  const suggestions = (await lexicalSuggestionsFor(token)).slice(0, 3);
  const entries = await Promise.all(suggestions.map((suggestion) => lexiconEntry(suggestion.token)));
  return entries.filter((entry): entry is SearchEntry => Boolean(entry));
}

async function postingsFor(path: string) {
  if (!postingsCache.has(path)) {
    postingsCache.set(
      path,
      fetchJson<{ tokens: Record<string, Array<[number, number, number]>> }>(
        bindShardIntegrity(path, 'Search postings shard'),
        Boolean(releaseDataPlane)
      ).then((payload) => payload.tokens || {})
    );
  }
  return postingsCache.get(path)!;
}

async function docsFor(path: string) {
  if (!docCache.has(path)) {
    docCache.set(
      path,
      fetchJson<SearchResultDoc[]>(bindShardIntegrity(path, 'Search result shard'), Boolean(releaseDataPlane))
    );
  }
  return docCache.get(path)!;
}

async function filterPostingsFor(key: string): Promise<LargeFilterPostings | null> {
  const path = manifest?.entrypoints.filter_postings?.[key];
  if (!path) return null;
  if (!filterPostingsCache.has(key)) {
    filterPostingsCache.set(
      key,
      fetchJson<LargeFilterPostings>(
        bindShardIntegrity(path, 'Search filter-postings shard'),
        Boolean(releaseDataPlane)
      )
    );
  }
  return filterPostingsCache.get(key)!;
}

function decodeDeltaPostings(encoded: number[]): number[] {
  const ordinals: number[] = [];
  let ordinal = 0;
  for (const [index, delta] of encoded.entries()) {
    ordinal = index === 0 ? delta : ordinal + delta;
    if (Number.isSafeInteger(ordinal) && ordinal >= 0) ordinals.push(ordinal);
  }
  return ordinals;
}

async function entityOrdinals(entity: SearchEntity): Promise<Set<number> | null> {
  const indexed = await filterPostingsFor(entity.filter_key);
  if (indexed?.values[entity.filter_value]) return new Set(indexed.values[entity.filter_value]);
  const facets = await legacyFacets();
  const encoded = facets[entity.filter_key]?.[entity.filter_value];
  return encoded ? new Set(decodeDeltaPostings(encoded)) : null;
}

async function sortValues(): Promise<LargeSortValue[]> {
  const path = manifest?.entrypoints.sort_values;
  if (!path) return [];
  if (!sortValuesPromise) {
    sortValuesPromise = fetchJson<LargeSortValue[]>(
      bindShardIntegrity(path, 'Search sort-values shard'),
      Boolean(releaseDataPlane)
    );
  }
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
  if (tokens.length > SEARCH_MANIFEST_LIMITS.maxQueryTokens) {
    throw new Error('Search query exceeds the supported token limit');
  }
  const entityRecognition = await recognizedEntity(query);
  const recognizedOrdinals = entityRecognition ? await entityOrdinals(entityRecognition.entity) : null;
  const entryGroups = (await Promise.all(tokens.map(entriesForToken))).filter((group) => group.length);
  entryGroups.sort((a, b) => Math.min(...a.map((entry) => entry.df)) - Math.min(...b.map((entry) => entry.df)));
  if (tokens.length && !entryGroups.length && !recognizedOrdinals) {
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
  let matches: Set<number>;
  if (recognizedOrdinals) {
    matches = new Set(recognizedOrdinals);
  } else {
    matches = tokens.length ? intersectionSets[0] || new Set<number>() : allOrdinals();
    for (const set of intersectionSets.slice(1)) matches = intersectOrdinals(matches, set);
    if (!matches.size && intersectionSets.length > 1) {
      matches = new Set<number>();
      for (const set of intersectionSets) {
        for (const value of set) matches.add(value);
      }
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
      const leftEntity = recognizedOrdinals?.has(left) ? ENTITY_SCORE : 0;
      const rightEntity = recognizedOrdinals?.has(right) ? ENTITY_SCORE : 0;
      return rightEntity + rankingScore(rightScore, strategy) - leftEntity - rankingScore(leftScore, strategy) || left - right;
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
  const boundedOrdinals: number[] = [];
  let resultChunkBudgetReached = false;
  for (const ordinal of ordinals) {
    const path = manifest.entrypoints.result_docs[Math.floor(ordinal / (manifest.result_doc_chunk_size || 1000))];
    if (path && !chunkPaths.has(path) && chunkPaths.size >= SEARCH_MANIFEST_LIMITS.maxResultChunksPerQuery) {
      resultChunkBudgetReached = true;
      break;
    }
    if (path) chunkPaths.add(path);
    boundedOrdinals.push(ordinal);
  }
  ordinals = boundedOrdinals;
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
    const entityScore = recognizedOrdinals?.has(ordinal) ? ENTITY_SCORE : 0;
    const total = request.sort === 'relevance' ? rankingScore(score, strategy, exact) + entityScore : 0;
    const fields = matchedFields(score.mask);
    if (entityRecognition && !fields.includes(entityRecognition.entity.filter_key)) fields.unshift(entityRecognition.entity.filter_key);
    results.push({
      ...doc,
      score: Math.round(total * 1000) / 1000,
      match: {
        query_tokens: tokens,
        matched_fields: fields,
        ...(entityRecognition ? { recognized_entity: entityRecognition.match } : {}),
        score_components: {
          weighted: Math.round(score.weighted * 1000) / 1000,
          idf: Math.round(score.idf * 1000) / 1000,
          exact,
          entity: entityScore,
          total: Math.round(total * 1000) / 1000
        }
      }
    });
  }
  const postingsTruncated = !recognizedOrdinals && cappedCandidates;
  const resultLimitReached = filtered.ordinals.size > limit;
  const truncated = resultChunkBudgetReached || postingsTruncated || resultLimitReached;
  const truncation = resultChunkBudgetReached
    ? {
        reason: 'result-chunk-budget' as const,
        loaded_result_chunks: chunkPaths.size,
        result_chunk_budget: SEARCH_MANIFEST_LIMITS.maxResultChunksPerQuery
      }
    : postingsTruncated
      ? { reason: 'capped-postings' as const }
      : resultLimitReached
        ? { reason: 'result-limit' as const }
        : undefined;
  return {
    results,
    total: filtered.ordinals.size,
    truncated,
    ...(truncation ? { truncation } : {}),
    filters_applied: filtered.applied,
    facets,
    ranking: strategy,
    elapsed_ms: Math.round(performance.now() - started),
    ...(entityRecognition ? { interpreted_entity: entityRecognition.match } : {})
  };
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      baseUrl = new URL(message.baseUrl).toString();
      releaseDataPlane = message.releaseDataPlane
        ? await prepareReleaseDataPlane(message.releaseDataPlane, baseUrl, message.snapshot || '')
        : undefined;
      manifest = validateLargeSearchManifest(
        await fetchJson<LargeSearchManifest>(message.manifestReference),
        message.snapshot || ''
      );
      shardIntegrity = await loadShardIntegrity(message.snapshot || '');
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
