import { describe, expect, it } from 'vitest';
import { relationshipWindow, visibleIncidentRelationships } from './relationshipWindows';

describe('bounded relationship windows', () => {
  it('makes every late incoming and outgoing relationship reachable without expanding the display budget', () => {
    const rows = Array.from({ length: 211 }, (_, index) => ({
      id: `assertion-${index}`, source: index === 180 ? 'page/route-late' : 'chapter/focus',
      target: index === 180 ? 'chapter/focus' : `page/${index}`
    }));
    const pages = [0, 72, 144].map((offset) => relationshipWindow(rows, offset));
    expect(pages.map((page) => page.rows.length)).toEqual([72, 72, 67]);
    expect(pages.flatMap((page) => page.rows)).toEqual(rows);
    expect(pages[2].rows).toContain(rows[180]);
    expect(pages[2].next).toBeNull();
    expect(pages[2].previous).toBe(72);
  });

  it('clamps a page after the selected scope shrinks and handles empty scopes', () => {
    expect(relationshipWindow(['a'], 144).rows).toEqual(['a']);
    expect(relationshipWindow([], 144)).toMatchObject({ rows: [], total: 0, offset: 0, end: 0, next: null, previous: null });
    expect(relationshipWindow(['a', 'b'], -1).offset).toBe(0);
  });

  it('rejects unbounded or invalid display sizes', () => {
    for (const size of [0, -1, 181, 1.5, Infinity]) expect(() => relationshipWindow([], 0, size)).toThrow();
  });

  it('uses canonical record routes and includes incoming links at reduction boundaries', () => {
    const rows = [
      { source: 'term/capital', target: 'page/guide/0128' },
      { source: 'page/other/0003', target: 'chapter/guide' },
      { source: 'document/unrelated', target: 'term/other' }
    ];
    expect(visibleIncidentRelationships(rows, new Set(['term/capital', 'chapter/guide']))).toEqual(rows.slice(0, 2));
    expect(visibleIncidentRelationships(rows, null)).toBe(rows);
    expect(visibleIncidentRelationships(rows, new Set())).toEqual([]);
  });
});
