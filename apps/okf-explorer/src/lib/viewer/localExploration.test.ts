import { describe, expect, it } from 'vitest';
import { matchesLocalText, summariseLocalExploration } from './localExploration';

describe('local and map-constrained exploration', () => {
  const rows = [{ id: 'a', type: ['Record', 'Record'] }, { id: 'b', type: ['Action'] }, { id: 'c', type: ['Record'] }];
  it('counts each identity once and folds only complete constrained membership', () => {
    const scope = summariseLocalExploration(rows.slice(0, 2), { type: ['Record'] }, ['type'], row => row.id, row => row.type, true);
    expect(scope).toMatchObject({ total: 2, highlighted: 1, scopeIds: ['a', 'b'], highlightedIds: ['a'], exact: true });
    expect(scope.facets.type).toContainEqual({ value: 'Record', count: 1, highlighted: 1 });
    const partial = summariseLocalExploration(rows.slice(0, 1), { type: ['Record'] }, ['type'], row => row.id, row => row.type, false);
    expect(partial).toMatchObject({ total: 1, highlighted: 1, exact: false });
    expect(partial.scopeIds).toBeUndefined();
  });
  it('distinguishes no highlight from an empty scope', () => {
    const scope = summariseLocalExploration(rows, {}, ['type'], row => row.id, row => row.type, true);
    expect(scope.highlighted).toBe(0);
    expect(scope.scopeIds).toHaveLength(3);
    expect(scope.highlightedIds).toEqual([]);
  });
  it('uses an explicit all-words local matcher without treating metadata as instructions', () => {
    expect(matchesLocalText('CHILD benefit', ['Child support', ['benefit']])).toBe(true);
    expect(matchesLocalText('child referral', ['Child support', ['benefit']])).toBe(false);
    expect(matchesLocalText('', [])).toBe(true);
    expect(matchesLocalText('hidden', [{ hidden: 'hidden' }])).toBe(false);
  });
});
