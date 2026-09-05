import { expect, it } from 'vitest';
import type { OkfNode } from '$lib/types';
import { smallFacetRows, smallFacetValues, smallIsHighlighted } from './smallExploration';

it('uses declared sections independently of route prefixes and slashless IDs', () => {
  const nodes: OkfNode[] = [
    { id: 'record/a', title: 'A', section: 'evidence' },
    { id: 'b', title: 'B', section: 'evidence' },
    { id: 'record/c', title: 'C', section: 'actions' }
  ];
  const selection = { section: ['evidence'] };
  expect(nodes.map(node => smallIsHighlighted(node, selection))).toEqual([true, true, false]);
  expect(smallFacetRows(nodes, nodes, selection, 'section')).toEqual([
    { value: 'evidence', label: 'evidence', count: 2, highlighted: 2 },
    { value: 'actions', label: 'actions', count: 1, highlighted: 0 }
  ]);
});

it('uses the normaliser root section when no section is declared', () => {
  expect(smallFacetValues({ id: 'record/a', title: 'A' }, 'section')).toEqual(['root']);
});
