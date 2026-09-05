/** Alternating luminance separates neighbouring values; labels convey identity. */
export const FACET_COLOURS = ['#003078', '#ffdd00', '#3d134f', '#b1e1f5', '#064b38', '#f5c6df', '#0b0c0c', '#d5e8b0'] as const;
export function facetColour(index: number): string {
  return FACET_COLOURS[index % FACET_COLOURS.length];
}
export const HIGHLIGHT_COLOUR = '#0b0c0c';
export const TRACK_COLOUR = '#ffffff';
