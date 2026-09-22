import { describe, expect, it } from 'vitest';
import { largeLearningPresentation } from './largeLearning';
const fixture = () => ({ schema: 'okf-large-learning-presentation.v1', title: 'Learn to assess evidence', paths: [{ id: 'assess', title: 'Assess evidence', steps: [{ route: 'dataset/example', title: 'Read the source', outcome: 'Explain its limits', practice: 'List two gaps.', minutes: 15 }] }] });
describe('large learning overlay', () => {
  it('preserves authored ordering, outcomes and practice without corpus hydration', () => {
    expect(largeLearningPresentation(fixture())?.paths[0].steps[0]).toEqual(fixture().paths[0].steps[0]);
  });
  it('accepts source-native DWP routes without inventing a dataset prefix', () => {
    const raw = fixture(); raw.paths[0].steps[0].route = 'chapter/77';
    expect(largeLearningPresentation(raw)?.paths[0].steps[0].route).toBe('chapter/77');
  });
  it('keeps legacy and unknown versions inactive', () => {
    expect(largeLearningPresentation(undefined)).toBeNull();
    expect(largeLearningPresentation({ ...fixture(), schema: 'future' })).toBeNull();
  });
  it('rejects external, traversal, malformed and duplicate routes', () => {
    for (const route of ['https://example.org', 'dataset/../secret', 'dataset/%oops', 'constructor']) {
      const raw = fixture(); raw.paths[0].steps[0].route = route;
      expect(largeLearningPresentation(raw)).toBeNull();
    }
    const raw = fixture(); raw.paths[0].steps.push(raw.paths[0].steps[0]);
    expect(largeLearningPresentation(raw)).toBeNull();
  });
  it('rejects oversize paths and missing outcomes', () => {
    const raw = fixture(); raw.paths[0].steps = Array(25).fill(raw.paths[0].steps[0]);
    expect(largeLearningPresentation(raw)).toBeNull();
    const empty = fixture(); empty.paths[0].steps[0].outcome = '';
    expect(largeLearningPresentation(empty)).toBeNull();
  });
});
