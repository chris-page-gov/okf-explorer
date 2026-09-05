import { exploreIdentities, highlightFirst, MAX_FOLDED_MEMBERS, readExploration } from '$lib/viewer/facetSelection';
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
  SearchSuggestion,
  SearchTokenCorrection
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
import {
  QUERY_POLICY_RESULT_SCHEMA,
  requiredQueryTokenGroups,
  tokeniseWithQueryPolicy
} from '$lib/search/queryPolicy';
import {
  TYPO_TOLERANCE_CONTRACT,
  correctionFor,
  symmetricDeleteKeys,
  typoShardFor,
  validateTypoDeletionShard,
  type TypoDeletionShard
} from '$lib/search/typoTolerance';
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
type TokenEntryGroup = {
  queryToken: string;
  entries: SearchEntry[];
  /** Legacy short-prefix expansion, retained if bounded typo lookup has no verified candidate. */
  fallbackEntries: SearchEntry[];
  corrections: Map<string, SearchTokenCorrection>;
};
type TypoQueryBudget = {
  tokensConsidered: number;
  shardPaths: Set<string>;
  truncated: boolean;
};

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
const typoDeletionCache = new Map<string, Promise<TypoDeletionShard>>();
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
  if (manifest?.query_policy) {
    return tokeniseWithQueryPolicy(value, manifest.query_policy, manifest.token_min_length || 2);
  }
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

function minimumShouldMatchOrdinals(groupSets: Set<number>[], requiredGroups: number): Set<number> {
  if (requiredGroups <= 0 || groupSets.length < requiredGroups) return new Set<number>();
  const groupCounts = new Map<number, number>();
  for (const set of groupSets) {
    for (const ordinal of set) groupCounts.set(ordinal, (groupCounts.get(ordinal) || 0) + 1);
  }
  return new Set(
    [...groupCounts]
      .filter(([, count]) => count >= requiredGroups)
      .map(([ordinal]) => ordinal)
  );
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
  return [...new Set(candidates.filter((value) => value.length >= 2 && value.length <= 8).map((value) => value.toUpperCase()))];
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

type RecognizedEntity = {
  entity: SearchEntity;
  match: SearchEntityMatch;
  phrase: string;
  residualQuery: string;
};

function removeWholePhrase(value: string, phrase: string): string {
  const paddedValue = ` ${value} `;
  const paddedPhrase = ` ${phrase} `;
  const start = paddedValue.indexOf(paddedPhrase);
  if (start < 0) return value;
  return normalizePhrase(`${paddedValue.slice(0, start)} ${paddedValue.slice(start + paddedPhrase.length)}`);
}

async function recognizedEntity(query: string): Promise<RecognizedEntity | null> {
  const normalized = normalizePhrase(query);
  if (!normalized) return null;
  const entities = await searchEntities();
  const exactMatches = entities.filter((entity) => entitySearchValues(entity).includes(normalized));
  if (exactMatches.length > 1) return null;
  let entity: SearchEntity;
  let phrase: string;
  let matchedAlias: string | undefined;
  let residualQuery = '';
  if (exactMatches.length === 1) {
    entity = exactMatches[0];
    phrase = normalized;
    matchedAlias = (entity.aliases || []).find((alias) => normalizePhrase(alias) === normalized);
  } else {
    // Only full governed labels or filter values may be embedded in prose.
    // Inferred short aliases remain exact-query conveniences so ordinary words
    // such as "it" cannot silently become an organisation filter.
    const spanMatches = entities.flatMap((candidate) => {
      const phrases = [...new Set([candidate.label, candidate.filter_value].map(normalizePhrase).filter(Boolean))]
        .filter((value) => ` ${normalized} `.includes(` ${value} `))
        .sort((left, right) => right.length - left.length || left.localeCompare(right));
      return phrases.length ? [{ entity: candidate, phrase: phrases[0] }] : [];
    });
    if (spanMatches.length !== 1) return null;
    ({ entity, phrase } = spanMatches[0]);
    residualQuery = removeWholePhrase(normalized, phrase);
    // Conversational scaffolding is removed only through this exact bounded
    // form. Any other residual term remains a required lexical constraint.
    if (normalized === `what does ${phrase} cover`) residualQuery = '';
  }
  return {
    entity,
    phrase,
    residualQuery,
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

async function lexicalEntriesForToken(token: string): Promise<TokenEntryGroup> {
  const exact = await lexiconEntry(token);
  if (exact) return { queryToken: token, entries: [exact], fallbackEntries: [], corrections: new Map() };
  const suggestions = (await lexicalSuggestionsFor(token)).slice(0, 3);
  const entries = await Promise.all(suggestions.map((suggestion) => lexiconEntry(suggestion.token)));
  const resolved = entries.filter((entry): entry is SearchEntry => Boolean(entry));
  // Prefix shards intentionally fall back from a long, absent prefix to a
  // shorter stored prefix. With an opt-in typo index, only genuine prefixes
  // retain precedence; broad legacy expansion remains the fallback if no
  // one-edit candidate verifies. Old manifests keep their exact behaviour.
  const exactPrefixes = resolved.filter((entry) => entry.token.startsWith(token));
  const deferBroadPrefix = Boolean(manifest?.typo_tolerance && resolved.length && !exactPrefixes.length);
  return {
    queryToken: token,
    entries: deferBroadPrefix ? [] : exactPrefixes.length ? exactPrefixes : resolved,
    fallbackEntries: deferBroadPrefix ? resolved : [],
    corrections: new Map()
  };
}

async function typoDeletionShard(path: string): Promise<TypoDeletionShard> {
  if (!manifest) throw new Error('Search worker is not initialised');
  if (!typoDeletionCache.has(path)) {
    const request = fetchJson<unknown>(
      bindShardIntegrity(path, 'Search typo-deletion shard'),
      Boolean(releaseDataPlane)
    ).then((payload) => validateTypoDeletionShard(payload, {
      documents: manifest?.counts.documents || 0,
      path
    }));
    request.catch(() => typoDeletionCache.delete(path));
    typoDeletionCache.set(path, request);
  }
  return typoDeletionCache.get(path)!;
}

async function typoEntriesForToken(token: string, budget: TypoQueryBudget): Promise<TokenEntryGroup> {
  const empty = (): TokenEntryGroup => ({ queryToken: token, entries: [], fallbackEntries: [], corrections: new Map() });
  if (!manifest?.typo_tolerance || !manifest.entrypoints.typo_deletions) return empty();
  if (
    token.length < TYPO_TOLERANCE_CONTRACT.min_token_length ||
    token.length > TYPO_TOLERANCE_CONTRACT.max_token_length
  ) {
    return empty();
  }
  if (budget.tokensConsidered >= TYPO_TOLERANCE_CONTRACT.max_corrected_tokens_per_query) {
    budget.truncated = true;
    return empty();
  }

  const keys = symmetricDeleteKeys(token);
  if (keys.length > TYPO_TOLERANCE_CONTRACT.max_delete_keys_per_token) {
    throw new Error('Search typo correction exceeds the supported delete-key limit');
  }
  const shardPaths = [...new Set(keys
    .map((key) => typoShardFor(key, TYPO_TOLERANCE_CONTRACT.shard_length))
    .map((shard) => manifest?.entrypoints.typo_deletions?.[shard] || manifest?.entrypoints.typo_deletions?._)
    .filter((path): path is string => Boolean(path)))]
    .sort();
  if (!shardPaths.length) return empty();

  const additionalPaths = shardPaths.filter((path) => !budget.shardPaths.has(path));
  if (budget.shardPaths.size + additionalPaths.length > TYPO_TOLERANCE_CONTRACT.max_shards_per_query) {
    budget.truncated = true;
    return empty();
  }
  budget.tokensConsidered += 1;
  for (const path of additionalPaths) budget.shardPaths.add(path);

  const shards = await Promise.all(shardPaths.map(typoDeletionShard));
  const candidates = new Map<string, number>();
  for (const shard of shards) {
    for (const key of keys) {
      for (const candidate of shard.keys[key] || []) {
        if (!correctionFor(token, candidate.token, 1)) continue;
        const priorDf = candidates.get(candidate.token);
        if (priorDf !== undefined && priorDf !== candidate.df) {
          throw new Error(`Typo deletion candidate ${candidate.token} has conflicting document frequencies`);
        }
        candidates.set(candidate.token, candidate.df);
      }
    }
  }

  const ranked = [...candidates]
    .sort(([leftToken, leftDf], [rightToken, rightDf]) => rightDf - leftDf || leftToken.localeCompare(rightToken))
    .slice(0, TYPO_TOLERANCE_CONTRACT.max_candidates_per_token);
  const entries = await Promise.all(ranked.map(([candidate]) => lexiconEntry(candidate)));
  const corrections = new Map<string, SearchTokenCorrection>();
  const acceptedEntries: SearchEntry[] = [];
  for (const [index, [candidate, advertisedDf]] of ranked.entries()) {
    const entry = entries[index];
    if (!entry || entry.token !== candidate || entry.df !== advertisedDf) {
      throw new Error(`Typo deletion candidate ${candidate} differs from the search lexicon`);
    }
    const correction = correctionFor(token, candidate, index + 1);
    if (!correction) continue;
    acceptedEntries.push(entry);
    corrections.set(candidate, correction);
  }
  return { queryToken: token, entries: acceptedEntries, fallbackEntries: [], corrections };
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

async function ordinalSetForEntries(entries: SearchEntry[]): Promise<Set<number>> {
  const ordinals = new Set<number>();
  for (const entry of entries) {
    const chunk = await postingsFor(entry.postings);
    for (const [ordinal] of chunk[entry.token] || []) ordinals.add(ordinal);
  }
  return ordinals;
}

function setsOverlap(left: Set<number>, right: Set<number>): boolean {
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  for (const value of smaller) if (larger.has(value)) return true;
  return false;
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
  return Object.entries(manifest.field_masks ?? {})
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
  const rawTokens = tokenize(query);
  if (rawTokens.length > SEARCH_MANIFEST_LIMITS.maxQueryTokens) {
    throw new Error('Search query exceeds the supported token limit');
  }
  const entityRecognition = await recognizedEntity(query);
  const recognizedOrdinals = entityRecognition ? await entityOrdinals(entityRecognition.entity) : null;
  const exactPolicyEntity = Boolean(
    manifest.query_policy &&
      entityRecognition &&
      recognizedOrdinals !== null &&
      rawTokens.length === 1 &&
      normalizePhrase(query) === entityRecognition.phrase
  );
  const entityTokens = !manifest.query_policy && entityRecognition ? tokenize(entityRecognition.phrase) : [];
  const residualTokens = !manifest.query_policy && entityRecognition
    ? tokenize(entityRecognition.residualQuery)
    : rawTokens;
  const residualTokenSet = new Set(residualTokens);
  // An explicit producer query policy governs every meaningful query token.
  // Legacy manifests retain the established entity-plus-residual behaviour.
  const requiredTokenSet = manifest.query_policy ? new Set(rawTokens) : residualTokenSet;
  const tokens = manifest.query_policy ? rawTokens : [...new Set([...entityTokens, ...residualTokens])];
  const resolvedGroups = exactPolicyEntity
    ? []
    : await Promise.all(tokens.map(lexicalEntriesForToken));
  const lexicalAnchorGroups = resolvedGroups.filter((group) => group.entries.length);
  let lexicalAnchorOrdinals: Set<number> | null = null;
  const maximumPostings = manifest.counts.max_postings_per_token || Number.MAX_SAFE_INTEGER;
  const completeAnchorGroups = lexicalAnchorGroups.filter((group) =>
    group.entries.every((entry) => entry.df <= maximumPostings)
  );
  if (completeAnchorGroups.length) {
    const anchorSets = await Promise.all(
      completeAnchorGroups.map((group) => ordinalSetForEntries(group.entries))
    );
    if (manifest.query_policy) {
      lexicalAnchorOrdinals = new Set<number>();
      for (const set of anchorSets) {
        for (const ordinal of set) lexicalAnchorOrdinals.add(ordinal);
      }
    } else {
      lexicalAnchorOrdinals = anchorSets[0] || new Set<number>();
      for (const set of anchorSets.slice(1)) {
        lexicalAnchorOrdinals = intersectOrdinals(lexicalAnchorOrdinals, set);
      }
    }
  }
  const typoBudget: TypoQueryBudget = { tokensConsidered: 0, shardPaths: new Set(), truncated: false };
  for (const [index, group] of resolvedGroups.entries()) {
    if (!requiredTokenSet.has(group.queryToken)) continue;
    if (group.entries.length) continue;
    let corrected = await typoEntriesForToken(group.queryToken, typoBudget);
    if (corrected.entries.length && lexicalAnchorOrdinals) {
      const acceptedEntries: SearchEntry[] = [];
      for (const entry of corrected.entries) {
        const candidateOrdinals = await ordinalSetForEntries([entry]);
        if (setsOverlap(candidateOrdinals, lexicalAnchorOrdinals)) acceptedEntries.push(entry);
      }
      const acceptedTokens = new Set(acceptedEntries.map((entry) => entry.token));
      corrected = {
        ...corrected,
        entries: acceptedEntries,
        corrections: new Map(
          [...corrected.corrections].filter(([token]) => acceptedTokens.has(token))
        )
      };
    }
    resolvedGroups[index] = corrected.entries.length
      ? corrected
      : {
          ...group,
          entries: manifest.typo_tolerance ? [] : group.fallbackEntries,
          fallbackEntries: []
        };
  }
  const queryCorrections = resolvedGroups.flatMap((group) => [...group.corrections.values()]);
  const unresolvedTokens = resolvedGroups
    .filter((group) => requiredTokenSet.has(group.queryToken) && !group.entries.length)
    .map((group) => group.queryToken);
  const entryGroups = resolvedGroups.filter((group) => group.entries.length);
  entryGroups.sort(
    (a, b) =>
      Math.min(...a.entries.map((entry) => entry.df)) - Math.min(...b.entries.map((entry) => entry.df)) ||
      a.queryToken.localeCompare(b.queryToken)
  );

  const scores: OrdinalScores = new Map();
  const correctionsByOrdinal = new Map<number, Map<string, SearchTokenCorrection>>();
  const requiredSets: Set<number>[] = [];
  const completeRequiredSets: Set<number>[] = [];
  let cappedCandidates = false;
  for (const group of entryGroups) {
    const set = new Set<number>();
    for (const entry of group.entries) {
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
        const correction = group.corrections.get(entry.token);
        if (correction) {
          if (!correctionsByOrdinal.has(ordinal)) correctionsByOrdinal.set(ordinal, new Map());
          correctionsByOrdinal.get(ordinal)!.set(`${correction.query_token}\u0000${correction.matched_token}`, correction);
        }
      }
    }
    if (requiredTokenSet.has(group.queryToken)) {
      requiredSets.push(set);
      if (group.entries.every((entry) => entry.df <= (manifest?.counts.max_postings_per_token || Number.MAX_SAFE_INTEGER))) {
        completeRequiredSets.push(set);
      } else {
        cappedCandidates = true;
      }
    }
  }

  // Legacy strict AND excludes capped groups from intersection because their
  // omitted postings are unknown. An explicit minimum-should-match policy
  // counts all loaded groups and returns only records with at least k observed
  // distinct groups; its total relation records any capped uncertainty.
  const intersectionSets = completeRequiredSets.length
    ? completeRequiredSets
    : requiredSets.slice(0, 1);
  const policyQueryTokenCount = exactPolicyEntity ? 1 : requiredTokenSet.size;
  const policyResolvedGroupCount = exactPolicyEntity ? 1 : requiredSets.length;
  const requiredTokenGroupCount = manifest.query_policy
    ? requiredQueryTokenGroups(manifest.query_policy, policyQueryTokenCount)
    : requiredTokenSet.size;
  const queryPolicyResult = manifest.query_policy
    ? {
        schema: QUERY_POLICY_RESULT_SCHEMA,
        mode: 'minimum-should-match' as const,
        tokeniser: manifest.query_policy.tokeniser,
        query_token_count: policyQueryTokenCount,
        resolved_token_group_count: policyResolvedGroupCount,
        required_token_group_count: requiredTokenGroupCount,
        unresolved_token_group_count: unresolvedTokens.length
      }
    : null;
  let matches: Set<number>;
  if (exactPolicyEntity) {
    matches = recognizedOrdinals ? new Set(recognizedOrdinals) : new Set<number>();
  } else if (manifest.query_policy) {
    matches = query && requiredTokenSet.size
      ? minimumShouldMatchOrdinals(requiredSets, requiredTokenGroupCount)
      : query
        ? new Set<number>()
        : allOrdinals();
    if (recognizedOrdinals) matches = intersectOrdinals(matches, recognizedOrdinals);
  } else if (recognizedOrdinals) {
    matches = new Set(recognizedOrdinals);
    if (unresolvedTokens.length) {
      matches = new Set<number>();
    } else {
      for (const set of intersectionSets) matches = intersectOrdinals(matches, set);
    }
  } else if (query && (!tokens.length || !entryGroups.length || unresolvedTokens.length)) {
    // A non-empty stop-word-only query, or a query with no indexed lexical
    // term, is not filter-only browsing. Keep its query universe empty while
    // still validating/applying filters below.
    matches = new Set<number>();
  } else {
    matches = tokens.length ? intersectionSets[0] || new Set<number>() : allOrdinals();
    for (const set of intersectionSets.slice(1)) matches = intersectOrdinals(matches, set);
  }

  const exploration = request.exploration ? readExploration(request.exploration) : undefined;
  const explorationKeys = exploration ? [...new Set([
    ...Object.keys(exploration.preview), ...exploration.reductions.flatMap(step => Object.keys(step.selection))
  ])] : [];
  const requestedPostingKeys = [...new Set([...Object.keys(request.filters ?? {}), ...(request.facet_keys || []), ...explorationKeys])];
  const filterIndexes = new Map<string, LargeFilterPostings>();
  await Promise.all(requestedPostingKeys.map(async (key) => {
    const postings = await filterPostingsFor(key);
    if (postings) filterIndexes.set(key, postings);
  }));
  const filtered = filterOrdinals(matches, request.filters, filterIndexes);
  const hasActiveExploration = explorationKeys.length > 0 || Boolean(exploration?.reductions.length);
  if (explorationKeys.some(key => !filterIndexes.has(key)) || (hasActiveExploration && !filtered.applied)) {
    throw new Error('This index cannot evaluate every selected facet. Clear the selection or use a bundle with complete facet postings.');
  }
  // Withhold partial exploration counts while legacy filters use the full-index fallback.
  const explored = exploration && filtered.applied ? exploreIdentities(filtered.ordinals, exploration,
    (key, value) => new Set(filterIndexes.get(key)?.values[value] || [])) : undefined;
  if (explored) filtered.ordinals = explored.scope;
  const explorationFacets: LargeSearchResponse['facets'] = {};
  if (explored) for (const key of request.facet_keys || []) {
    const postings = filterIndexes.get(key);
    if (postings) explorationFacets[key] = Object.entries(postings.values).map(([value, ids]) => ({
      value, count: ids.filter(id => explored.scope.has(id)).length,
      highlighted: ids.filter(id => explored.highlighted.has(id)).length
    })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }
  const explorationResult = explored ? {
    highlighted_count: explored.highlighted.size,
    facets: explorationFacets,
    ...(explored.scope.size <= MAX_FOLDED_MEMBERS && !cappedCandidates ? {
      scope_ids: [...explored.scope], highlighted_ids: [...explored.highlighted]
    } : {})
  } : undefined;
  const facets: LargeSearchResponse['facets'] = {};
  // If any active filter needs the v1/full-index fallback, every dynamic count
  // would omit that constraint. Suppress the partial counts instead of
  // presenting them as filter-aware.
  if (filtered.applied) {
    for (const key of request.facet_keys || []) {
      const postings = filterIndexes.get(key);
      if (!postings) continue;
      const facetUniverse = filterOrdinals(matches, request.filters, filterIndexes, key).ordinals;
      facets[key] = dynamicFacetRows(facetUniverse, postings);
    }
  }

  const postingsTruncated = cappedCandidates;
  // A single capped residual group yields a genuine lower bound because every
  // loaded posting is a match and additional postings may have been omitted.
  // With multiple residual groups, capped groups are intentionally excluded
  // from strict intersection, so the candidate count can contain false
  // positives as well as omit matches. Entity recognition narrows the same
  // candidate universe and must not hide that uncertainty.
  const totalRelation: LargeSearchResponse['total_relation'] = postingsTruncated
    ? requiredSets.length === 1
      ? 'gte'
      : 'unknown'
    : 'eq';

  if (request.include_results === false) {
    const truncations: NonNullable<LargeSearchResponse['truncation']>[] =
      postingsTruncated ? [{ reason: 'capped-postings' }] : [];
    return {
      results: [],
      exploration: explorationResult,
      total: filtered.ordinals.size,
      total_relation: totalRelation,
      truncated: Boolean(truncations.length),
      truncations,
      ...(truncations[0] ? { truncation: truncations[0] } : {}),
      filters_applied: filtered.applied,
      ignored_filters: filtered.ignoredFilters,
      facets,
      ranking: request.ranking || 'weighted',
      elapsed_ms: Math.round(performance.now() - started),
      ...(entityRecognition ? { interpreted_entity: entityRecognition.match } : {}),
      ...(queryCorrections.length ? { query_corrections: queryCorrections } : {}),
      ...(unresolvedTokens.length ? { unresolved_tokens: unresolvedTokens } : {}),
      ...(queryPolicyResult ? { query_policy: queryPolicyResult } : {}),
      ...(typoBudget.truncated ? { correction_truncated: true } : {})
    };
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
  if (explored) ordinals = highlightFirst(ordinals, id => explored.highlighted.has(id));
  ordinals = ordinals.slice(0, prelimit);
  const docsByOrdinal = new Map<number, SearchResultDoc>();
  const chunkPaths = new Set<string>();
  const boundedOrdinals: number[] = [];
  let resultChunkBudgetReached = false;
  for (const ordinal of ordinals) {
    const path = manifest.entrypoints.result_docs[Math.floor(ordinal / (manifest.result_doc_chunk_size || 1000))];
    if (path && !chunkPaths.has(path) && chunkPaths.size >= SEARCH_MANIFEST_LIMITS.maxResultChunksPerQuery) {
      resultChunkBudgetReached = true;
      // Keep scanning the ranked candidates: a later candidate can belong to
      // one of the chunks already admitted. Dropping it merely because an
      // intervening candidate introduced a seventeenth chunk would under-fill
      // the result page without reducing the number of fetched chunks.
      continue;
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
  if (explored) ordinals = highlightFirst(ordinals, id => explored.highlighted.has(id));
  for (const ordinal of ordinals.slice(0, limit)) {
    const doc = docsByOrdinal.get(ordinal);
    if (!doc) continue;
    const score = scores.get(ordinal) || { weighted: 0, idf: 0, mask: 0 };
    const exact = strategy === 'idf-exact' ? exactBoost(doc, query) : 0;
    const entityScore = recognizedOrdinals?.has(ordinal) ? ENTITY_SCORE : 0;
    const total = request.sort === 'relevance' ? rankingScore(score, strategy, exact) + entityScore : 0;
    const fields = matchedFields(score.mask);
    const correctedTokens = [...(correctionsByOrdinal.get(ordinal)?.values() || [])]
      .sort((left, right) => left.candidate_rank - right.candidate_rank || left.matched_token.localeCompare(right.matched_token));
    if (entityRecognition && !fields.includes(entityRecognition.entity.filter_key)) fields.unshift(entityRecognition.entity.filter_key);
    results.push({
      ...doc,
      ...(explored ? { highlighted: explored.highlighted.has(ordinal) } : {}),
      score: Math.round(total * 1000) / 1000,
      match: {
        query_tokens: tokens,
        matched_fields: fields,
        ...(correctedTokens.length ? { corrected_tokens: correctedTokens } : {}),
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
  const resultLimitReached = filtered.ordinals.size > limit;
  const truncations: NonNullable<LargeSearchResponse['truncation']>[] = [];
  if (resultChunkBudgetReached) {
    truncations.push({
      reason: 'result-chunk-budget',
      loaded_result_chunks: chunkPaths.size,
      result_chunk_budget: SEARCH_MANIFEST_LIMITS.maxResultChunksPerQuery
    });
  }
  if (postingsTruncated) truncations.push({ reason: 'capped-postings' });
  if (resultLimitReached) truncations.push({ reason: 'result-limit' });
  return {
    results,
    exploration: explorationResult,
    total: filtered.ordinals.size,
    total_relation: totalRelation,
    truncated: Boolean(truncations.length),
    truncations,
    ...(truncations[0] ? { truncation: truncations[0] } : {}),
    filters_applied: filtered.applied,
    ignored_filters: filtered.ignoredFilters,
    facets,
    ranking: strategy,
    elapsed_ms: Math.round(performance.now() - started),
    ...(entityRecognition ? { interpreted_entity: entityRecognition.match } : {}),
    ...(queryCorrections.length ? { query_corrections: queryCorrections } : {}),
    ...(unresolvedTokens.length ? { unresolved_tokens: unresolvedTokens } : {}),
    ...(queryPolicyResult ? { query_policy: queryPolicyResult } : {}),
    ...(typoBudget.truncated ? { correction_truncated: true } : {})
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
