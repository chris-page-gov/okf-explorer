import { expect, it } from 'vitest';
import { addBookmark, readBookmarks } from './bookmarks';
it('keeps the same route in different bundles and replaces only the same identity', () => {
  const a = { bundle: 'https://a.test/bundle.json', route: 'overview', label: 'A', url: 'https://viewer.test/#overview' };
  const b = { ...a, bundle: 'https://b.test/bundle.json', label: 'B' };
  expect(addBookmark(addBookmark([], a), b)).toEqual([b, a]);
  expect(addBookmark([b, a], { ...a, label: 'Updated' })).toEqual([{ ...a, label: 'Updated' }, b]);
  expect(readBookmarks('["overview"]')).toEqual([]);
  expect(readBookmarks(JSON.stringify([a, { ...b, url: 'javascript:alert(1)' }]))).toEqual([a]);
});
