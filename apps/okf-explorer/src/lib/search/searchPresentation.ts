import type { LargeSearchResponse } from '$lib/types';

type SearchSummaryResponse = Pick<
  LargeSearchResponse,
  'total' | 'total_relation' | 'filters_applied' | 'truncation' | 'truncations'
>;

export function formatSearchResultSummary(options: {
  response: SearchSummaryResponse | null;
  shown: number;
  hydratedMatchingCount?: number;
  queryActive?: boolean;
}): string {
  const { response, shown, hydratedMatchingCount, queryActive = false } = options;
  if (!response) return `${shown.toLocaleString()} shown`;
  if (hydratedMatchingCount !== undefined && !response.filters_applied) {
    if (!queryActive) return `${hydratedMatchingCount.toLocaleString()} records match the active filters`;
    return `${hydratedMatchingCount.toLocaleString()} matching records shown from the retrieved query candidates`;
  }

  const truncations = response.truncations?.length
    ? response.truncations
    : response.truncation
      ? [response.truncation]
      : [];
  const reasons = new Set(truncations.map((item) => item.reason));
  const notes = [
    reasons.has('result-chunk-budget') ? 'additional matches were not loaded to keep browser memory use bounded' : '',
    reasons.has('capped-postings') ? 'the common-term index limit was reached' : '',
    reasons.has('result-limit') ? 'the result display limit was reached' : ''
  ].filter(Boolean);
  if (response.total_relation === 'unknown') {
    const explanation = ['exact matching total unavailable', ...notes].join('; ');
    return `${shown.toLocaleString()} shown from ${response.total.toLocaleString()} indexed candidates (${explanation})`;
  }
  const total = `${response.total_relation === 'gte' ? 'at least ' : ''}${response.total.toLocaleString()}`;
  return `${shown.toLocaleString()} shown of ${total} matching records${notes.length ? ` (${notes.join('; ')})` : ''}`;
}
