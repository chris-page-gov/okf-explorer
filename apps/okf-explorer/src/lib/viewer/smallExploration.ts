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

export function smallFacetValues(node: OkfNode, key: string, learningKeys: string[] = [], semanticKeys: string[] = [], version = ''): string[] {
  if (key === 'type') return [node.type || 'Node'];
  if (key === 'section') return [node.section || 'root'];
  if (key === 'trust' || key === 'lifecycle') {
    const presentation = okfConceptPresentation(node, undefined, version);
    return key === 'trust' ? [trustTierLabel(presentation.trustTier)] : [presentation.status];
  }
  if (semanticKeys.includes(key)) return semanticFacetValues(node, key);
  return learningKeys.includes(key) ? conceptualFacetValues(node, key) : [];
}

export function smallIsHighlighted(node: OkfNode, selection: FacetSelection, learningKeys: string[] = [], semanticKeys: string[] = [], version = ''): boolean {
  return hasSelection(selection) && matchesSelection(selection, key => smallFacetValues(node, key, learningKeys, semanticKeys, version));
}

/** Count every facet against the same searched, reduced and map-scoped universe. */
export function smallFacetRows(all: OkfNode[], scope: OkfNode[], selection: FacetSelection, key: string, learningKeys: string[] = [], semanticKeys: string[] = [], version = '') {
  const valuesFor = (node: OkfNode) => smallFacetValues(node, key, learningKeys, semanticKeys, version);
  const values = new Set(all.flatMap(valuesFor));
  const rows = new Map([...values].map(value => [value, { value, label: value, count: 0, highlighted: 0 }]));
  for (const node of scope) {
    const memberValues = new Set(valuesFor(node));
    const highlighted = memberValues.size > 0 && smallIsHighlighted(node, selection, learningKeys, semanticKeys, version);
    for (const value of memberValues) {
      const row = rows.get(value);
      if (!row) continue;
      row.count += 1;
      if (highlighted) row.highlighted += 1;
    }
  }
  return [...rows.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
