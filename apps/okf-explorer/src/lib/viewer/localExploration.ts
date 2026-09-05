import { hasSelection, matchesSelection, MAX_FOLDED_MEMBERS, type FacetSelection } from './facetSelection';

/** Counts and membership must come from the same scope, before presentation folds. */
export function summariseLocalExploration<T>(
  rows: readonly T[],
  selection: FacetSelection,
  keys: readonly string[],
  identity: (row: T) => string,
  values: (row: T, key: string) => readonly string[],
  complete: boolean
) {
  const selected = rows.filter(row => hasSelection(selection) && matchesSelection(selection, key => values(row, key)));
  const selectedIds = new Set(selected.map(identity));
  const facets = Object.fromEntries(keys.map(key => {
    const counts = new Map<string, { value: string; count: number; highlighted: number }>();
    for (const row of rows) {
      for (const value of new Set(values(row, key))) {
        const count = counts.get(value) || { value, count: 0, highlighted: 0 };
        count.count += 1;
        if (selectedIds.has(identity(row))) count.highlighted += 1;
        counts.set(value, count);
      }
    }
    return [key, [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))];
  }));
  const canFold = complete && rows.length <= MAX_FOLDED_MEMBERS;
  return { total: rows.length, highlighted: selected.length, exact: complete, facets,
    scopeIds: canFold ? rows.map(identity) : undefined,
    highlightedIds: canFold ? [...selectedIds] : undefined };
}

/** Explicit fallback: all query words must occur in the supplied local text fields. */
export function matchesLocalText(query: string, fields: readonly unknown[]): boolean {
  const text = fields.flatMap(field => Array.isArray(field) ? field : [field])
    .filter(field => typeof field === 'string').join(' ').toLocaleLowerCase('en-GB');
  return query.toLocaleLowerCase('en-GB').trim().split(/\s+/).filter(Boolean).every(word => text.includes(word));
}
