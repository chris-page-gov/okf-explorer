import { expect, it } from 'vitest';
import type { NormalizedCorpus } from '$lib/types';
import { focusedSmallGraph } from './smallGraph';

it('keeps focus independent of inspection and respects scope and presentation folds', () => {
  const nodes = Object.fromEntries(['a', 'b', 'c', 'd'].map(id => [id, { id, title: id }]));
  const corpus = { nodes, relationships: [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }, { source: 'b', target: 'd' }] } as NormalizedCorpus;
  const scope = Object.values(corpus.nodes);
  expect(focusedSmallGraph(corpus, scope, 'a').nodes.map(n => n.id)).toEqual(['a', 'b', 'c']);
  expect(focusedSmallGraph(corpus, scope, 'a', new Set(['b'])).relationships).toEqual([{ source: 'a', target: 'c' }]);
  expect(focusedSmallGraph(corpus, scope.filter(n => n.id !== 'c'), 'a').nodes.map(n => n.id)).toEqual(['a', 'b']);
});
