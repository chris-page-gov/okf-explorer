import { describe, expect, it } from 'vitest';
import type { NormalizedCorpus } from '$lib/types';
import { conceptualFacetValues, initialSmallRoute, learningPresentation, semanticFacetPresentation, semanticFacetValues } from './smallPresentation';
import { smallFacetRows, smallIsHighlighted } from './smallExploration';
const corpus = (): NormalizedCorpus => ({
  id: 'example', title: 'Learning example', relationships: [], nodes: {
    'activity.md': { id: 'activity.md', title: 'Welcome — Module 2, condensed', type: 'Activity', learning_facets: { topic: ['Team value'], capability: ['Test value'], workshop: ['Condensed'] } },
    'start.md': { id: 'start.md', title: 'Start here' },
    'goal.md': { id: 'goal.md', title: 'Test value', learning_facets: { topic: ['Team value'], capability: ['Test value'] } }
  }, meta: { learning_presentation: { schema: 'okf-learning-presentation.v1', start_route: 'start.md', title: 'Learn by doing', introduction: 'Choose a goal.', facets: [{ key: 'topic', label: 'Topic' }, { key: 'capability', label: 'Capability' }], groups: [{ title: 'Learning goals', routes: ['goal.md'] }] } }
});

describe('opt-in semantic facets', () => {
  it('shows declared concepts and intersects them without inferring meaning', () => {
    const c = corpus();
    c.meta!.semantic_facet_presentation = { schema: 'okf-semantic-facets.v1', facets: [{ key: 'topic', label: 'Topic' }, { key: 'service_area', label: 'Public service area' }] };
    c.nodes['activity.md'].semantic_facets = { topic: ['Artificial intelligence'], service_area: ['Health and care'] };
    c.nodes['goal.md'].semantic_facets = { topic: ['Artificial intelligence'] };
    expect(semanticFacetPresentation(c)?.facets).toHaveLength(2);
    const nodes = Object.values(c.nodes);
    expect(smallFacetRows(nodes, nodes, { topic: ['Artificial intelligence'] }, 'topic', [], ['topic'])).toEqual([
      { value: 'Artificial intelligence', label: 'Artificial intelligence', count: 2, highlighted: 2 }
    ]);
    expect(smallIsHighlighted(c.nodes['activity.md'], { topic: ['Artificial intelligence'], service_area: ['Health and care'] }, [], ['topic', 'service_area'])).toBe(true);
    expect(semanticFacetValues(c.nodes['start.md'], 'topic')).toEqual([]);
    expect(smallIsHighlighted(c.nodes['activity.md'], { topic: ['Artificial intelligence'] })).toBe(false);
  });
  it('rejects reserved keys and inherited or malformed values', () => {
    const c = corpus();
    c.meta!.semantic_facet_presentation = { schema: 'okf-semantic-facets.v1', facets: [{ key: 'type', label: 'Override' }, { key: 'topic', label: 'Topic' }, { key: '__proto__', label: 'Bad' }] };
    expect(semanticFacetPresentation(c)?.facets).toEqual([{ key: 'topic', label: 'Topic' }]);
    expect(semanticFacetValues({ id: 'x', title: 'X', semantic_facets: Object.create({ topic: ['Inherited'] }) }, 'topic')).toEqual([]);
    expect(semanticFacetValues({ id: 'x', title: 'X', semantic_facets: { topic: [' AI ', 'AI', 3] } }, 'topic')).toEqual(['AI']);
  });
});
describe('opt-in learning presentation', () => {
  it('starts at the authored route and preserves an explicit deep link', () => {
    expect(initialSmallRoute(corpus())).toBe('start.md');
    expect(initialSmallRoute(corpus(), 'activity.md')).toBe('activity.md');
    expect(initialSmallRoute(corpus(), 'stale.md')).toBe('start.md');
  });
  it('preserves legacy loading and ignores malformed presentation', () => {
    const c = corpus(); delete c.meta;
    expect(learningPresentation(c)).toBeNull();
    expect(initialSmallRoute(c)).toBe('activity.md');
    c.meta = { learning_presentation: { schema: 'okf-learning-presentation.v1', start_route: 'missing' } };
    expect(learningPresentation(c)).toBeNull();
  });
  it('rejects inherited routes, reserved facets and dangling group links', () => {
    const c = corpus(); const raw = c.meta!.learning_presentation as any;
    raw.facets.push({ key: '__proto__', label: 'Bad' }, { key: 'type', label: 'Replace type' }, { key: 'topic', label: 'Duplicate' });
    raw.groups[0].routes.push('https://example.org', 'constructor', 'missing');
    expect(learningPresentation(c)?.facets).toHaveLength(2);
    expect(learningPresentation(c)?.groups[0].routes).toEqual(['goal.md']);
    raw.start_route = 'constructor'; expect(learningPresentation(c)).toBeNull();
  });
  it('uses conceptual values for counts and intersections without inventing them from filenames', () => {
    const nodes = Object.values(corpus().nodes);
    expect(nodes.map(node => smallIsHighlighted(node, { topic: ['Team value'] }))).toEqual([false, false, false]);
    const selection = { topic: ['Team value'], workshop: ['Condensed'] };
    expect(nodes.map(node => smallIsHighlighted(node, selection, ['topic', 'workshop']))).toEqual([true, false, false]);
    expect(smallFacetRows(nodes, nodes, selection, 'capability', ['topic', 'workshop', 'capability'])).toEqual([{ value: 'Test value', label: 'Test value', count: 2, highlighted: 1 }]);
    expect(conceptualFacetValues({ id: 'safeguard/security.md', title: 'Security' }, 'topic')).toEqual([]);
  });
  it('bounds labels and values and ignores malformed classifications', () => {
    expect(conceptualFacetValues({ id: 'x', title: 'X', learning_facets: { topic: [' A ', 'A', {}, null, 3] } }, 'topic')).toEqual(['A']);
    expect(conceptualFacetValues({ id: 'x', title: 'X', learning_facets: Object.create({ topic: ['Inherited'] }) }, 'topic')).toEqual([]);
  });
});
