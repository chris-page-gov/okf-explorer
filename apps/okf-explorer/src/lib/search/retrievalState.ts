export const RETRIEVAL_STATE_SCHEMA = 'okf-explorer-retrieval.v1' as const;
export const FILTER_PARAM_PREFIX = 'filter.';
export const MISSING_FILTER_VALUE = '__missing__';
export const RETRIEVAL_SORTS = ['relevance', 'newest', 'title', 'metadata-quality'] as const;

export type RetrievalSort = (typeof RETRIEVAL_SORTS)[number];

export type RetrievalStateV1 = {
  schema: typeof RETRIEVAL_STATE_SCHEMA;
  query: string;
  filters: Record<string, string[]>;
  sort: RetrievalSort;
};

const MAX_QUERY_LENGTH = 500;
const MAX_FILTER_KEY_LENGTH = 80;
const MAX_FILTER_VALUE_LENGTH = 500;
const MAX_FILTER_VALUES = 100;
const FILTER_KEY = /^[a-zA-Z0-9_-]+$/;

export function defaultRetrievalSort(query: string): RetrievalSort {
  return query.trim() ? 'relevance' : 'newest';
}

export function isRetrievalSort(value: string | null): value is RetrievalSort {
  return Boolean(value && (RETRIEVAL_SORTS as readonly string[]).includes(value));
}

export function normalizeRetrievalFilters(
  filters: Record<string, string[]>,
  allowedKeys?: Iterable<string>
): Record<string, string[]> {
  const allowed = allowedKeys ? new Set(allowedKeys) : null;
  const normalized: Record<string, string[]> = {};
  let count = 0;
  for (const key of Object.keys(filters).sort()) {
    if (
      !key ||
      key.length > MAX_FILTER_KEY_LENGTH ||
      !FILTER_KEY.test(key) ||
      (allowed && !allowed.has(key))
    ) continue;
    const values = [...new Set(filters[key].map((value) => value.trim()).filter(Boolean))]
      .filter((value) => value.length <= MAX_FILTER_VALUE_LENGTH)
      .sort((left, right) => left.localeCompare(right));
    if (!values.length) continue;
    const remaining = MAX_FILTER_VALUES - count;
    if (remaining <= 0) break;
    normalized[key] = values.slice(0, remaining);
    count += normalized[key].length;
  }
  return normalized;
}

export function parseRetrievalState(
  params: URLSearchParams,
  allowedFilterKeys?: Iterable<string>
): RetrievalStateV1 {
  const query = (params.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH);
  const filters: Record<string, string[]> = {};
  let count = 0;
  for (const [param, rawValue] of params) {
    if (!param.startsWith(FILTER_PARAM_PREFIX) || count >= MAX_FILTER_VALUES) continue;
    const key = param.slice(FILTER_PARAM_PREFIX.length);
    (filters[key] ||= []).push(rawValue);
    count += 1;
  }
  const requestedSort = params.get('sort');
  return {
    schema: RETRIEVAL_STATE_SCHEMA,
    query,
    filters: normalizeRetrievalFilters(filters, allowedFilterKeys),
    sort: isRetrievalSort(requestedSort) ? requestedSort : defaultRetrievalSort(query)
  };
}

export function writeRetrievalState(params: URLSearchParams, state: RetrievalStateV1): void {
  params.delete('q');
  params.delete('sort');
  for (const key of [...params.keys()]) {
    if (key.startsWith(FILTER_PARAM_PREFIX)) params.delete(key);
  }

  const query = state.query.trim().slice(0, MAX_QUERY_LENGTH);
  if (query) params.set('q', query);
  for (const [key, values] of Object.entries(normalizeRetrievalFilters(state.filters))) {
    for (const value of values) params.append(`${FILTER_PARAM_PREFIX}${key}`, value);
  }
  if (state.sort !== defaultRetrievalSort(query)) params.set('sort', state.sort);
}

export function hasSerializedFilters(params: URLSearchParams): boolean {
  return [...params.keys()].some((key) => key.startsWith(FILTER_PARAM_PREFIX));
}
