import { describe, expect, it } from 'vitest';
import type { LargeFilterPostings, LargeSortValue } from '$lib/types';
import {
  compareSortValues,
  dynamicFacetRows,
  filterOrdinals,
  inverseDocumentFrequency,
  rankingScore
} from './staticSearch';

const facet = (key: string, values: Record<string, number[]>): LargeFilterPostings => ({
  schema: 'okf-static-filter-postings.v1',
  key,
  values
});

describe('static search filtering and ranking', () => {
  it('uses OR within a facet and AND across facets before limiting results', () => {
    const postings = new Map([
      ['type', facet('type', { API: [0, 1], Dataset: [2], Guide: [3] })],
      ['country', facet('country', { England: [0, 2, 3], Wales: [1] })]
    ]);
    const result = filterOrdinals(
      new Set([0, 1, 2, 3]),
      { type: ['API', 'Dataset'], country: ['England'] },
      postings
    );
    expect([...result.ordinals]).toEqual([0, 2]);
    expect(result.applied).toBe(true);
    expect(result.ignoredFilters).toEqual({});
  });

  it('reports a v1-style fallback when a selected filter index is absent', () => {
    const result = filterOrdinals(new Set([0, 1]), { type: ['API'] }, new Map());
    expect([...result.ordinals]).toEqual([0, 1]);
    expect(result.applied).toBe(false);
  });

  it('ignores and reports values proven absent from an indexed facet', () => {
    const postings = new Map([['type', facet('type', { API: [0, 1], Dataset: [2] })]]);
    const result = filterOrdinals(
      new Set([0, 1, 2]),
      { type: ['API', 'not-a-real-type'] },
      postings
    );

    expect([...result.ordinals]).toEqual([0, 1]);
    expect(result.applied).toBe(true);
    expect(result.ignoredFilters).toEqual({ type: ['not-a-real-type'] });
  });

  it('does not turn an entirely invalid indexed selection into no results', () => {
    const postings = new Map([['type', facet('type', { API: [0, 1] })]]);
    const result = filterOrdinals(new Set([0, 1, 2]), { type: ['old-deep-link-value'] }, postings);

    expect([...result.ordinals]).toEqual([0, 1, 2]);
    expect(result.ignoredFilters).toEqual({ type: ['old-deep-link-value'] });
  });

  it('calculates dynamic facet counts over the supplied candidate universe', () => {
    expect(dynamicFacetRows(new Set([0, 2, 3]), facet('type', { API: [0, 1], Dataset: [2], Guide: [3] }))).toEqual([
      { value: 'API', count: 1 },
      { value: 'Dataset', count: 1 },
      { value: 'Guide', count: 1 }
    ]);
  });

  it('keeps deterministic weighted, IDF and exact-boost scores distinct', () => {
    const score = { weighted: 20, idf: 12 };
    expect(rankingScore(score, 'weighted')).toBe(20);
    expect(rankingScore(score, 'idf')).toBe(12);
    expect(rankingScore(score, 'idf-exact', 8)).toBe(20);
    expect(inverseDocumentFrequency(100, 2)).toBeGreaterThan(inverseDocumentFrequency(100, 50));
  });

  it('sorts compact values by newest, title and metadata quality', () => {
    const values: LargeSortValue[] = [
      ['2024-01-01', 'Zulu', 0.9],
      ['2026-01-01', 'Alpha', 0.4]
    ];
    expect(compareSortValues(0, 1, 'newest', values)).toBeGreaterThan(0);
    expect(compareSortValues(0, 1, 'title', values)).toBeGreaterThan(0);
    expect(compareSortValues(0, 1, 'metadata-quality', values)).toBeLessThan(0);
  });
});
