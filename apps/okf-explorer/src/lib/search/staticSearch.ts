import type { LargeFacetRow, LargeFilterPostings, LargeSortValue, SearchRankingStrategy } from '$lib/types';

export type OrdinalScores = Map<number, { weighted: number; idf: number; mask: number }>;

export function intersectOrdinals(left: Set<number>, right: Set<number>): Set<number> {
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  const out = new Set<number>();
  for (const value of small) {
    if (large.has(value)) out.add(value);
  }
  return out;
}

export function unionOrdinals(values: Iterable<number>[]): Set<number> {
  const out = new Set<number>();
  for (const rows of values) {
    for (const value of rows) out.add(value);
  }
  return out;
}

export function filterOrdinals(
  candidates: Set<number>,
  filters: Record<string, string[]>,
  postings: Map<string, LargeFilterPostings>,
  exceptKey = ''
): { ordinals: Set<number>; applied: boolean } {
  let result = new Set(candidates);
  let applied = true;
  for (const [key, selected] of Object.entries(filters)) {
    if (key === exceptKey || !selected.length) continue;
    const facet = postings.get(key);
    if (!facet) {
      applied = false;
      continue;
    }
    const allowed = unionOrdinals(selected.map((value) => facet.values[value] || []));
    result = intersectOrdinals(result, allowed);
  }
  return { ordinals: result, applied };
}

export function dynamicFacetRows(candidates: Set<number>, postings: LargeFilterPostings): LargeFacetRow[] {
  const rows: LargeFacetRow[] = [];
  for (const [value, ordinals] of Object.entries(postings.values)) {
    let count = 0;
    for (const ordinal of ordinals) {
      if (candidates.has(ordinal)) count += 1;
    }
    if (count) rows.push({ value, count });
  }
  return rows.sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

export function inverseDocumentFrequency(documents: number, frequency: number): number {
  return Math.log(1 + (Math.max(documents - frequency, 0) + 0.5) / (frequency + 0.5));
}

export function rankingScore(
  score: { weighted: number; idf: number },
  strategy: SearchRankingStrategy,
  exactBoost = 0
): number {
  if (strategy === 'weighted') return score.weighted;
  if (strategy === 'idf-exact') return score.idf + exactBoost;
  return score.idf;
}

export function compareSortValues(
  leftOrdinal: number,
  rightOrdinal: number,
  sort: 'newest' | 'title' | 'metadata-quality',
  values: LargeSortValue[]
): number {
  const left = values[leftOrdinal] || ['', '', null];
  const right = values[rightOrdinal] || ['', '', null];
  if (sort === 'title') return left[1].localeCompare(right[1]) || leftOrdinal - rightOrdinal;
  if (sort === 'metadata-quality') return (right[2] ?? -1) - (left[2] ?? -1) || left[1].localeCompare(right[1]);
  return right[0].localeCompare(left[0]) || left[1].localeCompare(right[1]);
}
