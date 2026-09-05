import { expect, it } from 'vitest';
import { displayedRoute, swipePanel } from './workspaceNavigation';
it('keeps vertical scroll and bounds horizontal panel swipes', () => {
  expect(swipePanel('content', -100, 10, 300)).toBe('details');
  expect(swipePanel('content', 100, 10, 300)).toBe('navigation');
  expect(swipePanel('content', 100, 120, 300)).toBe('content');
  expect(swipePanel('navigation', 100, 0, 300)).toBe('navigation');
  expect(displayedRoute('candidate/c-01', 'record/h-01')).toBe('candidate/c-01');
});

for (const panel of ['navigation', 'details'] as const) {
  it(`switches the paired ${panel} view consistently in either swipe direction`, () => {
    expect(swipePanel(panel, 100, 0, 300, true)).toBe('content');
    expect(swipePanel(panel, -100, 0, 300, true)).toBe('content');
    expect(swipePanel(panel, 0, 100, 300, true)).toBe(panel);
  });
}
