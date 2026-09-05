import { expect, it } from 'vitest';
import { facetColour, HIGHLIGHT_COLOUR, TRACK_COLOUR } from './facetColours';
function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
it('keeps every adjacent segment above 3:1 through palette wrap and the other-values segment', () => {
  for (let index = 0; index < 17; index += 1) expect(contrast(facetColour(index), facetColour(index + 1))).toBeGreaterThanOrEqual(3);
});
it('keeps the separate highlighted-membership track above 3:1', () => {
  expect(contrast(HIGHLIGHT_COLOUR, TRACK_COLOUR)).toBeGreaterThanOrEqual(3);
});
