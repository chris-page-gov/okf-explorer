import { describe, expect, it } from 'vitest';
import { sourcePublisherTitle } from './publisherLabels';

describe('sourcePublisherTitle', () => {
  it('prefers the full publisher index title', () => {
    expect(sourcePublisherTitle('gds', 'Government Digital Service', [
      { publisher: 'gds', publisher_title: 'A record title' }
    ])).toBe('Government Digital Service');
  });

  it('uses a title from an exact loaded publisher record when the index is absent', () => {
    expect(sourcePublisherTitle('gds', undefined, [
      { publisher: 'other', publisher_title: 'Wrong organisation' },
      { publisher: 'gds', publisher_title: 'Government Digital Service' }
    ])).toBe('Government Digital Service');
  });

  it('does not borrow a title from a different publisher or invent a label', () => {
    expect(sourcePublisherTitle('gds', undefined, [
      { publisher: 'other', publisher_title: 'Government Digital Service' }
    ])).toBeUndefined();
    expect(sourcePublisherTitle('unknown', undefined, [])).toBeUndefined();
  });

  it('ignores blank titles', () => {
    expect(sourcePublisherTitle('gds', '  ', [
      { publisher: 'gds', publisher_title: '  ' }
    ])).toBeUndefined();
  });
});
