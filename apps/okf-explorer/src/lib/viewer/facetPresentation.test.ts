import { describe, expect, it } from 'vitest';
import {
  applyFacetPreferenceOrder,
  facetPreferenceOverrides,
  facetDistributionSegments,
  facetExampleValues,
  mergeExplorerDisplay,
  moveFacetKey,
  moveFacetKeyBeforeWithinPinGroup,
  moveFacetKeyToTargetWithinPinGroup,
  moveFacetKeyWithinPinGroup,
  normalizeExplorerDisplay,
  normalizeExplorerPresentation,
  normalizeFacetPreferences,
  orderFacetRows,
  type FacetPreferences
} from './facetPresentation';

const defaults: FacetPreferences = {
  version: 1,
  order: ['type', 'publisher', 'year'],
  pinned: ['type'],
  shown: [],
  hidden: [],
  mode: 'suggested',
  density: 'compact'
};

describe('facet presentation', () => {
  it('normalizes bundle-scoped user preferences without retaining unknown facets', () => {
    expect(
      normalizeFacetPreferences(
        {
          order: ['year', 'unknown'],
          pinned: ['publisher', 'unknown'],
          shown: ['year', 'unknown'],
          hidden: ['type'],
          mode: 'all',
          density: 'explained'
        },
        defaults.order,
        defaults
      )
    ).toEqual({
      version: 1,
      order: ['year', 'type', 'publisher'],
      pinned: ['publisher'],
      shown: ['year'],
      hidden: ['type'],
      mode: 'all',
      density: 'explained'
    });
  });

  it('places pinned facets first and moves facets without losing the provider order', () => {
    const preferences = { ...defaults, pinned: ['year'] };
    expect(applyFacetPreferenceOrder(defaults.order, preferences)).toEqual(['year', 'type', 'publisher']);
    expect(moveFacetKey(defaults.order, 'publisher', -1)).toEqual(['publisher', 'type', 'year']);
    expect(moveFacetKey(defaults.order, 'type', -1)).toBe(defaults.order);
  });

  it('lets pinned state win when untrusted preferences contain a hidden conflict', () => {
    const preferences = normalizeFacetPreferences(
      { pinned: ['type'], shown: ['publisher', 'year'], hidden: ['type', 'year'] },
      defaults.order,
      defaults
    );
    expect(preferences.pinned).toEqual(['type']);
    expect(preferences.shown).toEqual(['publisher']);
    expect(preferences.hidden).toEqual(['year']);
  });

  it('normalizes provider profiles and rejects the wrong schema', () => {
    expect(normalizeExplorerPresentation({ schema: 'something-else', facets: [] })).toBeUndefined();
    expect(
      normalizeExplorerPresentation({
        schema: 'okf-explorer-presentation.v1',
        status: 'experimental',
        defaults: { facet_mode: 'all', search_threshold: 30, distribution_segment_limit: 7 },
        facets: [
          { key: 'publisher', label: ' Provider ', default_state: 'shown', open_control: 'search', examples: ['ONS', '', 'ONS'] },
          { key: '../bad', label: 'Bad' },
          null
        ],
        panels: {
          left: { tabs: ['facets', 'unknown', 'results'], default_tab: 'results' },
          right: { tabs: ['overview', { id: 'custom' }, 'data'], default_tab: 'missing' }
        }
      })
    ).toEqual({
      schema: 'okf-explorer-presentation.v1',
      status: 'experimental',
      defaults: { facet_mode: 'all', search_threshold: 30, distribution_segment_limit: 7 },
      facets: [
        { key: 'publisher', label: 'Provider', default_state: 'shown', open_control: 'search', examples: ['ONS'] }
      ],
      panels: {
        left: { tabs: ['facets', 'results'], default_tab: 'results' },
        right: { tabs: ['overview', 'data'] }
      }
    });
  });

  it('merges provider fields per facet without promoting label-only entries', () => {
    expect(
      mergeExplorerDisplay(
        {
          facets: { order: ['type', 'publisher'], pinned: ['type'], hidden: ['publisher'] },
          detail: { tabs: ['overview', 'data'], default_tab: 'overview' }
        },
        {
          schema: 'okf-explorer-presentation.v1',
          facets: [
            { key: 'publisher', label: 'Provider', default_state: 'shown' },
            { key: 'year', order: 1, default_state: 'pinned' }
          ],
          panels: { right: { tabs: ['evidence', 'data'], default_tab: 'evidence' } }
        }
      )
    ).toEqual({
      facets: {
        order: ['year', 'type', 'publisher'],
        pinned: ['type', 'year'],
        hidden: []
      },
      detail: { tabs: ['evidence', 'data'], default_tab: 'evidence' }
    });
  });

  it('stores only user preference deltas and moves within the visible pin group', () => {
    expect(facetPreferenceOverrides({ ...defaults, density: 'explained' }, defaults)).toEqual({ density: 'explained' });
    expect(facetPreferenceOverrides({ ...defaults, shown: ['year'] }, defaults)).toEqual({ shown: ['year'] });
    expect(
      moveFacetKeyWithinPinGroup(['a', 'p1', 'b', 'p2'], ['p1', 'p2'], 'p2', -1)
    ).toEqual(['a', 'p2', 'b', 'p1']);
    const unchanged = ['a', 'p1', 'b', 'p2'];
    expect(moveFacetKeyWithinPinGroup(unchanged, ['p1', 'p2'], 'p1', -1)).toBe(unchanged);
    expect(moveFacetKeyBeforeWithinPinGroup(['p1', 'p2', 'a', 'b', 'c'], ['p1', 'p2'], 'c', 'a')).toEqual([
      'p1', 'p2', 'c', 'a', 'b'
    ]);
    expect(moveFacetKeyBeforeWithinPinGroup(unchanged, ['p1', 'p2'], 'b', 'p1')).toBe(unchanged);
    expect(moveFacetKeyToTargetWithinPinGroup(['a', 'b', 'c'], [], 'a', 'b')).toEqual(['b', 'a', 'c']);
    expect(moveFacetKeyToTargetWithinPinGroup(['a', 'b', 'c'], [], 'a', 'c')).toEqual(['b', 'c', 'a']);
    expect(moveFacetKeyToTargetWithinPinGroup(['a', 'b', 'c'], [], 'c', 'a')).toEqual(['c', 'a', 'b']);
    expect(moveFacetKeyToTargetWithinPinGroup(unchanged, ['p1', 'p2'], 'b', 'p1')).toBe(unchanged);
  });

  it('defensively normalizes legacy analysis display hints', () => {
    expect(
      normalizeExplorerDisplay({
        facets: {
          order: ['publisher', 42, '../bad'],
          pinned: 'publisher',
          hidden: ['tag'],
          default_mode: 'invalid',
          high_cardinality_threshold: 40
        },
        detail: { tabs: ['overview', 'custom', 'data'], default_tab: 'custom' }
      })
    ).toEqual({
      facets: { order: ['publisher'], hidden: ['tag'], high_cardinality_threshold: 40 },
      detail: { tabs: ['overview', 'data'] }
    });
    expect(
      normalizeExplorerDisplay({ detail: { tabs: ['overview', 'data'], default_tab: 'evidence' } })
    ).toEqual({ detail: { tabs: ['overview', 'data'] } });
  });

  it('creates a bounded proportional distribution with an explicit remainder', () => {
    expect(
      facetDistributionSegments(
        [
          { value: 'A', count: 8 },
          { value: 'B', count: 4 },
          { value: 'C', count: 2 },
          { value: 'D', count: 1 }
        ],
        3
      )
    ).toEqual([
      { value: 'A', count: 8 },
      { value: 'B', count: 4 },
      { value: '__other__', count: 3, otherValues: 2 }
    ]);
  });

  it('orders categorical and numeric values predictably and supplies useful examples', () => {
    const rows = [
      { value: '2025', count: 2 },
      { value: '1999', count: 5 },
      { value: 'unknown', count: 9 }
    ];
    expect(orderFacetRows(rows, 'count-desc').map((row) => row.value)).toEqual(['unknown', '1999', '2025']);
    expect(orderFacetRows(rows, 'value-asc').map((row) => row.value)).toEqual(['1999', '2025', 'unknown']);
    expect(orderFacetRows(rows.slice(0, 2), 'label-asc', (value) => value === '2025' ? 'A' : 'Z').map((row) => row.value)).toEqual(['2025', '1999']);
    expect(facetExampleValues(rows, ['Typical', 'Latest'], (value) => value)).toEqual(['Typical', 'Latest']);
    expect(facetExampleValues(rows, undefined, (value) => `Label ${value}`, 2)).toEqual(['Label 2025', 'Label 1999']);
  });
});
