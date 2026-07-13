import { describe, expect, it } from 'vitest';
import {
  RETRIEVAL_STATE_SCHEMA,
  defaultRetrievalSort,
  hasSerializedFilters,
  parseRetrievalState,
  writeRetrievalState
} from './retrievalState';

describe('retrieval URL state', () => {
  it('round-trips query, repeated filters and a non-default sort', () => {
    const params = new URLSearchParams('bundle=pack.json&view=graph');
    writeRetrievalState(params, {
      schema: RETRIEVAL_STATE_SCHEMA,
      query: ' flood risk ',
      filters: { jurisdiction: ['England'], record_type: ['Dataset', 'API'] },
      sort: 'title'
    });
    expect(params.get('bundle')).toBe('pack.json');
    expect(params.get('view')).toBe('graph');
    expect(params.get('q')).toBe('flood risk');
    expect(params.getAll('filter.record_type')).toEqual(['API', 'Dataset']);
    expect(parseRetrievalState(params)).toEqual({
      schema: RETRIEVAL_STATE_SCHEMA,
      query: 'flood risk',
      filters: { jurisdiction: ['England'], record_type: ['API', 'Dataset'] },
      sort: 'title'
    });
  });

  it('ignores malformed and disallowed filter keys and unsafe sort values', () => {
    const params = new URLSearchParams();
    params.append('filter.publisher', 'ons');
    params.append('filter.publisher', 'ons');
    params.append('filter.bad.key', 'value');
    params.set('sort', 'random');
    const state = parseRetrievalState(params, ['publisher']);
    expect(state.filters).toEqual({ publisher: ['ons'] });
    expect(state.sort).toBe('newest');
  });

  it('uses relevance for a query and newest for filter-only browsing', () => {
    expect(defaultRetrievalSort('planning')).toBe('relevance');
    expect(defaultRetrievalSort('')).toBe('newest');
    expect(parseRetrievalState(new URLSearchParams('q=planning')).sort).toBe('relevance');
    expect(parseRetrievalState(new URLSearchParams('filter.type=Concept')).sort).toBe('newest');
  });

  it('detects serialized filters independently of their validity', () => {
    expect(hasSerializedFilters(new URLSearchParams('filter.type=Concept'))).toBe(true);
    expect(hasSerializedFilters(new URLSearchParams('q=concept'))).toBe(false);
  });

  it('removes stale retrieval parameters before serializing replacement state', () => {
    const params = new URLSearchParams('q=old&sort=title&filter.type=Old&unrelated=kept');
    writeRetrievalState(params, {
      schema: RETRIEVAL_STATE_SCHEMA,
      query: '',
      filters: {},
      sort: 'newest'
    });
    expect(params.toString()).toBe('unrelated=kept');
  });
});
