import { describe, expect, it } from 'vitest';
import { formatSearchResultSummary } from './searchPresentation';

const exactResponse = {
  total: 100,
  total_relation: 'eq' as const,
  filters_applied: true,
  truncations: []
};

describe('search result summary', () => {
  it('preserves the worker total after the full index is hydrated', () => {
    expect(formatSearchResultSummary({
      response: exactResponse,
      shown: 20,
      hydratedMatchingCount: 20,
      queryActive: true
    })).toBe('20 shown of 100 matching records');
  });

  it('uses an exact hydrated count when the worker could not apply filter postings', () => {
    expect(formatSearchResultSummary({
      response: { ...exactResponse, filters_applied: false },
      shown: 20,
      hydratedMatchingCount: 7
    })).toBe('7 records match the active filters');
  });

  it('does not call a bounded query subset an exact filtered total', () => {
    expect(formatSearchResultSummary({
      response: { ...exactResponse, filters_applied: false },
      shown: 20,
      hydratedMatchingCount: 7,
      queryActive: true
    })).toBe('7 matching records shown from the retrieved query candidates');
  });

  it('reports a lower-bound total and every applicable truncation reason', () => {
    expect(formatSearchResultSummary({
      response: {
        ...exactResponse,
        total_relation: 'gte',
        truncations: [{ reason: 'capped-postings' }, { reason: 'result-chunk-budget' }]
      },
      shown: 200
    })).toBe(
      '200 shown of at least 100 matching records (additional matches were not loaded to keep browser memory use bounded; the common-term index limit was reached)'
    );
  });

  it('does not describe an approximate multi-token candidate count as matching records', () => {
    expect(formatSearchResultSummary({
      response: {
        ...exactResponse,
        total: 42,
        total_relation: 'unknown',
        truncations: [{ reason: 'capped-postings' }]
      },
      shown: 12
    })).toBe(
      '12 shown from 42 indexed candidates (exact matching total unavailable; the common-term index limit was reached)'
    );
  });
});
