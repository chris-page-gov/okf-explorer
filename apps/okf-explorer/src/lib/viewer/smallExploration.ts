import { conceptualFacetValues, semanticFacetValues } from './smallPresentation';
import type { OkfNode } from '$lib/types';
import { okfConceptPresentation, trustTierLabel } from '$lib/okfV02';
import { hasSelection, matchesSelection, type FacetSelection } from './facetSelection';

export const SMALL_FACETS = [
  { key: 'type', label: 'Type' },
  { key: 'trust', label: 'Trust tier' },
  { key: 'lifecycle', label: 'Lifecycle' },
  { key: 'section', label: 'Section' }
];

export function smallFacetValues(node: OkfNode, key: string, learningKeys: string[] = [], semanticKeys: string[] = []): string[] {
  if (key === 'type') return [node.type || 'Node'];
  if (key === 'section') return [node.section || 'root'];
  const presentation = okfConceptPresentation(node);
  if (key === 'trust') return [trustTierLabel(presentation.trustTier)];
  if (key === 'lifecycle') return [presentation.status];
  if (semanticKeys.includes(key)) return semanticFacetValues(node, key);
  return learningKeys.includes(key) ? conceptualFacetValues(node, key) : [];
}

export function smallIsHighlighted(node: OkfNode, selection: FacetSelection, learningKeys: string[] = [], semanticKeys: string[] = []): boolean {
  return hasSelection(selection) && matchesSelection(selection, key => smallFacetValues(node, key, learningKeys, semanticKeys));
}

/** Count every facet against the same searched, reduced and map-scoped universe. */
export function smallFacetRows(all: OkfNode[], scope: OkfNode[], selection: FacetSelection, key: string, learningKeys: string[] = [], semanticKeys: string[] = []) {
  return [...new Set(all.flatMap(node => smallFacetValues(node, key, learningKeys, semanticKeys)))].map(value => {
    const members = scope.filter(node => smallFacetValues(node, key, learningKeys, semanticKeys).includes(value));
    return { value, label: value, count: members.length,
      highlighted: members.filter(node => smallIsHighlighted(node, selection, learningKeys, semanticKeys)).length };
  }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
