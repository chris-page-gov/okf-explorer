import { describe, expect, it } from 'vitest';
import { emptyExploration, exploreIdentities, explorationFromUrl, highlightFirst, keepPreview, matchesSelection,
  previewValue, readExploration, writeExploration } from './facetSelection';

const rows = [
  { id: 'a', type: ['Record'], region: ['North', 'South'] },
  { id: 'b', type: ['Record'], region: ['South'] },
  { id: 'c', type: ['Action'], region: ['North'] }
];
const members = (key: string, value: string) => new Set(rows.filter(row => row[key as 'type' | 'region'].includes(value)).map(row => row.id));
describe('SeeLinks exploration', () => {
  it('replaces one facet, preserves cross-facet AND, and toggles additive OR', () => {
    let preview = previewValue({}, 'type', 'Record');
    preview = previewValue(preview, 'region', 'North');
    expect(rows.filter(row => matchesSelection(preview, key => row[key as 'type' | 'region'])).map(row => row.id)).toEqual(['a']);
    preview = previewValue(preview, 'type', 'Action', true);
    expect(exploreIdentities(new Set(['a', 'b', 'c']), { preview, reductions: [] }, members).highlighted).toEqual(new Set(['a', 'c']));
    expect(previewValue(preview, 'region', 'South')).toEqual({ type: ['Record', 'Action'], region: ['South'] });
  });
  it('removes a selected value on a second ordinary click, preserving other selections', () => {
    expect(previewValue({ type: ['Record'] }, 'type', 'Record')).toEqual({});
    expect(previewValue({ type: ['Record', 'Action'], region: ['North'] }, 'type', 'Record'))
      .toEqual({ type: ['Action'], region: ['North'] });
    expect(previewValue({ type: ['Record', 'Action'] }, 'type', 'Other')).toEqual({ type: ['Other'] });
  });
  it('keeps the complement of the complete intersection, including overlapping values', () => {
    const state = keepPreview({ preview: { type: ['Record'], region: ['North'] }, reductions: [] }, 'remove');
    expect(exploreIdentities(new Set(['a', 'b', 'c']), state, members).scope).toEqual(new Set(['b', 'c']));
    expect(keepPreview(state, 'keep')).toBe(state);
  });
  it('keeps a zero-match preview empty rather than reverting to the full scope', () => {
    const state = keepPreview({ preview: { type: ['Action'], region: ['South'] }, reductions: [] }, 'keep');
    expect(exploreIdentities(new Set(['a', 'b', 'c']), state, members).scope.size).toBe(0);
  });
  it('floats the whole highlighted set without losing others or changing their relative order', () => {
    expect(highlightFirst(['b', 'c', 'a'], id => id !== 'b')).toEqual(['c', 'a', 'b']);
  });
  it('round-trips preview and negative reductions independently of old filter parameters', () => {
    const params = new URLSearchParams('q=child&filter.type=Record');
    const state = { preview: { region: ['North'] }, reductions: [{ mode: 'remove' as const, selection: { type: ['Action'] } }] };
    writeExploration(params, state);
    expect(explorationFromUrl(params)).toEqual(state);
    writeExploration(params, emptyExploration());
    expect(params.toString()).toBe('q=child&filter.type=Record');
  });
  it('rejects malformed predicates instead of relaxing a committed scope', () => {
    expect(() => readExploration({ preview: {}, reductions: [{ mode: 'remove', selection: {} }] })).toThrow();
    expect(() => readExploration({ preview: { type: 42 }, reductions: [] })).toThrow();
  });
});
