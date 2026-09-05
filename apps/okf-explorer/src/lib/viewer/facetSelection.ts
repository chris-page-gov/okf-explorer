/** SeeLinks exploration algebra. Preview, reduction and folding are independent. */
export type FacetSelection = Record<string, string[]>;
export type Reduction = { mode: 'keep' | 'remove'; selection: FacetSelection };
export type Exploration = { preview: FacetSelection; reductions: Reduction[] };
export type FoldedSet = { id: string; label: string; members: string[] };
export const EXPLORATION_PARAM = 'explore';
export const MAX_REDUCTIONS = 24;
export const MAX_FOLDED_MEMBERS = 50_000;
export const emptyExploration = (): Exploration => ({ preview: {}, reductions: [] });

export function hasSelection(selection: FacetSelection): boolean {
  return Object.values(selection).some(values => values.length > 0);
}

export function previewValue(selection: FacetSelection, key: string, value: string, additive = false): FacetSelection {
  if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid facet key.');
  const selected = selection[key]?.includes(value);
  const values = new Set(additive || selected ? selection[key] || [] : []);
  if (selected) values.delete(value);
  else values.add(value);
  const next = { ...selection };
  if (values.size) next[key] = [...values];
  else delete next[key];
  return next;
}

/** OR within a facet; AND across facets. No preview is distinct from no matches. */
export function matchesSelection(selection: FacetSelection, values: (key: string) => readonly string[]): boolean {
  return Object.entries(selection).every(([key, selected]) =>
    !selected.length || selected.some(value => values(key).includes(value)));
}

export function matchesReductions(reductions: Reduction[], values: (key: string) => readonly string[]): boolean {
  return reductions.every(step => matchesSelection(step.selection, values) === (step.mode === 'keep'));
}

export function keepPreview(state: Exploration, mode: Reduction['mode']): Exploration {
  if (!hasSelection(state.preview)) return state;
  if (state.reductions.length >= MAX_REDUCTIONS) throw new Error('Undo a step or reset the view before adding another reduction.');
  return { preview: {}, reductions: [...state.reductions, { mode, selection: readSelection(state.preview) }] };
}

export function highlightFirst<T>(rows: readonly T[], highlighted: (row: T) => boolean): T[] {
  return [...rows.filter(highlighted), ...rows.filter(row => !highlighted(row))];
}

export function selectionLabel(selection: FacetSelection, label: (key: string) => string = key => key): string {
  return Object.entries(selection).map(([key, values]) => `${label(key)}: ${values.join(' or ')}`).join(' and ');
}

function readSelection(value: unknown): FacetSelection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid facet selection.');
  const entries = Object.entries(value);
  if (entries.length > 32) throw new Error('Too many preview facets.');
  const result: FacetSelection = {};
  for (const [key, values] of entries) {
    if (!/^[\w-]{1,80}$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key) || !Array.isArray(values) || !values.length || values.length > 100 ||
      values.some(v => typeof v !== 'string' || !v.trim() || v.length > 500)) throw new Error('Invalid facet values.');
    result[key] = [...new Set(values)] as string[];
  }
  return result;
}

/** Reject a malformed expression as a whole; never silently weaken a keep/remove predicate. */
export function readExploration(value: unknown): Exploration {
  if (!value || typeof value !== 'object') throw new Error('Invalid exploration state.');
  const row = value as Record<string, unknown>;
  if (!Array.isArray(row.reductions) || row.reductions.length > MAX_REDUCTIONS) throw new Error('Invalid reduction history.');
  return {
    preview: readSelection(row.preview),
    reductions: row.reductions.map(step => {
      if (!step || !['keep', 'remove'].includes(step.mode)) throw new Error('Invalid reduction mode.');
      const selection = readSelection(step.selection);
      if (!hasSelection(selection)) throw new Error('A reduction needs a selection.');
      return { mode: step.mode, selection };
    })
  };
}

export function explorationFromUrl(params: URLSearchParams): Exploration {
  const raw = params.get(EXPLORATION_PARAM);
  if (!raw) return emptyExploration();
  if (raw.length > 16_000) throw new Error('The exploration link is too long.');
  return readExploration(JSON.parse(raw));
}

export function writeExploration(params: URLSearchParams, state: Exploration): void {
  const serialised = JSON.stringify(readExploration(state));
  if (serialised.length > 16_000) throw new Error('Undo a keep step or clear a facet before adding to this shareable selection.');
  if (!hasSelection(state.preview) && !state.reductions.length) params.delete(EXPLORATION_PARAM);
  else params.set(EXPLORATION_PARAM, serialised);
}

/** Apply to an index's identities before limiting/hydrating result documents. */
export function exploreIdentities<T>(scope: ReadonlySet<T>, state: Exploration,
  members: (key: string, value: string) => ReadonlySet<T>): { scope: Set<T>; highlighted: Set<T> } {
  const select = (universe: ReadonlySet<T>, selection: FacetSelection) => {
    let selected = new Set(universe);
    for (const [key, values] of Object.entries(selection)) {
      const union = new Set<T>();
      for (const value of values) for (const id of members(key, value)) union.add(id);
      selected = new Set([...selected].filter(id => union.has(id)));
    }
    return selected;
  };
  let current = new Set(scope);
  for (const step of state.reductions) {
    const matching = select(current, step.selection);
    current = step.mode === 'keep' ? matching : new Set([...current].filter(id => !matching.has(id)));
  }
  return { scope: current, highlighted: hasSelection(state.preview) ? select(current, state.preview) : new Set() };
}
