import { describe, expect, it } from 'vitest';
import { routeHash, routeFromHash } from './routeHash';

function readFragment(value: string): string {
  const url = new URL('https://example.test/explore/');
  url.hash = value;
  return routeFromHash(url.hash);
}

describe('routeHash', () => {
  it.each([
    'repositories/111online%2Fnhs111-resources.md',
    'language/C%2B%2B.md',
    'dataset/caf%C3%A9.md',
    'record:literal',
    'route with spaces',
    'café/東京',
    'route+with#symbols',
    'route%malformed'
  ])('round-trips %s', (route) => {
    expect(readFragment(routeHash(route))).toBe(route);
  });

  it('preserves simple routes as readable fragments', () => {
    expect(routeHash('overview')).toBe('overview');
    expect(routeHash('repositories/example.md')).toBe('repositories/example.md');
  });

  it('retains malformed old fragments without throwing', () => {
    expect(routeFromHash('#route%malformed')).toBe('route%malformed');
    expect(routeFromHash('#record:!')).toBe('record:!');
  });
});
