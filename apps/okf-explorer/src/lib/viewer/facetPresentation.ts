import type { LargeExplorerDisplay, LargeExplorerPresentation, LargeExplorerPresentationFacet, LargeFacetRow } from '$lib/types';

export type FacetMode = 'suggested' | 'all';
export type FacetDensity = 'compact' | 'explained';

export type FacetPreferences = {
  version: 1;
  order: string[];
  pinned: string[];
  shown: string[];
  hidden: string[];
  mode: FacetMode;
  density: FacetDensity;
};

export type FacetDistributionSegment = LargeFacetRow & {
  otherValues?: number;
};

const FACET_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const FACET_VALUE_TYPES = new Set(['nominal', 'ordinal', 'number', 'date']);
const FACET_STATES = new Set(['pinned', 'shown', 'hidden']);
const FACET_CONTROLS = new Set(['auto', 'distribution', 'histogram', 'search', 'list']);
const FACET_VALUE_ORDERS = new Set(['count-desc', 'label-asc', 'label-desc', 'value-asc', 'value-desc']);
const LEFT_PANEL_TABS = new Set(['facets', 'browse', 'results']);
const RIGHT_PANEL_TABS = new Set(['overview', 'evidence', 'data']);

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function enumString<T extends string>(value: unknown, allowed: Set<string>): T | undefined {
  return typeof value === 'string' && allowed.has(value) ? value as T : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
    ? value
    : undefined;
}

function normalizePresentationFacet(value: unknown): LargeExplorerPresentationFacet | null {
  const candidate = recordValue(value);
  const key = nonEmptyString(candidate?.key);
  if (!candidate || !key || !FACET_KEY_PATTERN.test(key)) return null;
  const examples = Array.isArray(candidate.examples)
    ? [...new Set(candidate.examples.map(nonEmptyString).filter((item): item is string => Boolean(item)))].slice(0, 5)
    : undefined;
  const order = typeof candidate.order === 'number' && Number.isInteger(candidate.order) ? candidate.order : undefined;
  return {
    key,
    ...(nonEmptyString(candidate.label) ? { label: nonEmptyString(candidate.label) } : {}),
    ...(nonEmptyString(candidate.description) ? { description: nonEmptyString(candidate.description) } : {}),
    ...(enumString<LargeExplorerPresentationFacet['value_type'] & string>(candidate.value_type, FACET_VALUE_TYPES)
      ? { value_type: enumString<LargeExplorerPresentationFacet['value_type'] & string>(candidate.value_type, FACET_VALUE_TYPES) }
      : {}),
    ...(order !== undefined ? { order } : {}),
    ...(enumString<LargeExplorerPresentationFacet['default_state'] & string>(candidate.default_state, FACET_STATES)
      ? { default_state: enumString<LargeExplorerPresentationFacet['default_state'] & string>(candidate.default_state, FACET_STATES) }
      : {}),
    ...(enumString<LargeExplorerPresentationFacet['open_control'] & string>(candidate.open_control, FACET_CONTROLS)
      ? { open_control: enumString<LargeExplorerPresentationFacet['open_control'] & string>(candidate.open_control, FACET_CONTROLS) }
      : {}),
    ...(enumString<LargeExplorerPresentationFacet['value_order'] & string>(candidate.value_order, FACET_VALUE_ORDERS)
      ? { value_order: enumString<LargeExplorerPresentationFacet['value_order'] & string>(candidate.value_order, FACET_VALUE_ORDERS) }
      : {}),
    ...(examples?.length ? { examples } : {})
  };
}

function normalizePanel<T extends string>(value: unknown, allowed: Set<string>) {
  const candidate = recordValue(value);
  if (!candidate) return undefined;
  const tabs = Array.isArray(candidate.tabs)
    ? [...new Set(candidate.tabs.map((tab) => enumString<T>(tab, allowed)).filter((tab): tab is T => Boolean(tab)))]
    : undefined;
  const configuredDefault = enumString<T>(candidate.default_tab, allowed);
  const defaultTab = configuredDefault && (!tabs?.length || tabs.includes(configuredDefault)) ? configuredDefault : undefined;
  if (!tabs?.length && !defaultTab) return undefined;
  return {
    ...(tabs?.length ? { tabs } : {}),
    ...(defaultTab ? { default_tab: defaultTab } : {})
  };
}

export function normalizeExplorerPresentation(value: unknown): LargeExplorerPresentation | undefined {
  const candidate = recordValue(value);
  if (candidate?.schema !== 'okf-explorer-presentation.v1') return undefined;
  const normalizedFacets = Array.isArray(candidate.facets)
    ? candidate.facets.map(normalizePresentationFacet).filter((facet): facet is LargeExplorerPresentationFacet => Boolean(facet))
    : undefined;
  const facets = normalizedFacets?.filter(
    (facet, index, all) => all.findIndex((candidateFacet) => candidateFacet.key === facet.key) === index
  );
  const defaultsValue = recordValue(candidate.defaults);
  const facetMode = enumString<'suggested' | 'all'>(defaultsValue?.facet_mode, new Set(['suggested', 'all']));
  const searchThreshold = boundedInteger(defaultsValue?.search_threshold, 12, 500);
  const segmentLimit = boundedInteger(defaultsValue?.distribution_segment_limit, 3, 18);
  const defaults = facetMode || searchThreshold !== undefined || segmentLimit !== undefined
    ? {
        ...(facetMode ? { facet_mode: facetMode } : {}),
        ...(searchThreshold !== undefined ? { search_threshold: searchThreshold } : {}),
        ...(segmentLimit !== undefined ? { distribution_segment_limit: segmentLimit } : {})
      }
    : undefined;
  const panelsValue = recordValue(candidate.panels);
  const left = normalizePanel<'facets' | 'browse' | 'results'>(panelsValue?.left, LEFT_PANEL_TABS);
  const right = normalizePanel<'overview' | 'evidence' | 'data'>(panelsValue?.right, RIGHT_PANEL_TABS);
  const status = enumString<'experimental' | 'stable' | 'deprecated'>(candidate.status, new Set(['experimental', 'stable', 'deprecated']));
  return {
    schema: 'okf-explorer-presentation.v1',
    ...(status ? { status } : {}),
    ...(nonEmptyString(candidate.snapshot) ? { snapshot: nonEmptyString(candidate.snapshot) } : {}),
    ...(defaults ? { defaults } : {}),
    ...(facets?.length ? { facets } : {}),
    ...(left || right ? { panels: { ...(left ? { left } : {}), ...(right ? { right } : {}) } } : {})
  };
}

function facetKeyArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const keys = [...new Set(value.map(nonEmptyString).filter((key): key is string => typeof key === 'string' && FACET_KEY_PATTERN.test(key)))];
  return keys.length ? keys : undefined;
}

export function normalizeExplorerDisplay(value: unknown): LargeExplorerDisplay {
  const candidate = recordValue(value);
  const facetsValue = recordValue(candidate?.facets);
  const order = facetKeyArray(facetsValue?.order);
  const pinned = facetKeyArray(facetsValue?.pinned);
  const hidden = facetKeyArray(facetsValue?.hidden);
  const defaultMode = enumString<'suggested' | 'all'>(facetsValue?.default_mode, new Set(['suggested', 'all']));
  const searchThreshold = boundedInteger(facetsValue?.high_cardinality_threshold, 12, 500);
  const segmentLimit = boundedInteger(facetsValue?.distribution_segments, 3, 18);
  const facets = order || pinned || hidden || defaultMode || searchThreshold !== undefined || segmentLimit !== undefined
    ? {
        ...(order ? { order } : {}),
        ...(pinned ? { pinned } : {}),
        ...(hidden ? { hidden } : {}),
        ...(defaultMode ? { default_mode: defaultMode } : {}),
        ...(searchThreshold !== undefined ? { high_cardinality_threshold: searchThreshold } : {}),
        ...(segmentLimit !== undefined ? { distribution_segments: segmentLimit } : {})
      }
    : undefined;
  const detailValue = recordValue(candidate?.detail);
  const tabs = Array.isArray(detailValue?.tabs)
    ? [...new Set(detailValue.tabs.map((tab) => enumString<'overview' | 'evidence' | 'data'>(tab, RIGHT_PANEL_TABS)).filter((tab): tab is 'overview' | 'evidence' | 'data' => Boolean(tab)))]
    : undefined;
  const configuredDefault = enumString<'overview' | 'evidence' | 'data'>(detailValue?.default_tab, RIGHT_PANEL_TABS);
  const defaultTab = configuredDefault && (!tabs?.length || tabs.includes(configuredDefault)) ? configuredDefault : undefined;
  const detail = tabs?.length || defaultTab
    ? { ...(tabs?.length ? { tabs } : {}), ...(defaultTab ? { default_tab: defaultTab } : {}) }
    : undefined;
  return { ...(facets ? { facets } : {}), ...(detail ? { detail } : {}) };
}

export function mergeExplorerDisplay(
  generatedValue: unknown,
  presentationValue: unknown
): LargeExplorerDisplay {
  const generated = normalizeExplorerDisplay(generatedValue);
  const presentation = normalizeExplorerPresentation(presentationValue);
  const presentationFacets = presentation?.facets || [];
  const presentationOrder = [...presentationFacets]
    .filter((facet) => Number.isFinite(facet.order))
    .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER))
    .map((facet) => facet.key);
  const explicitStateKeys = new Set(
    presentationFacets.filter((facet) => facet.default_state).map((facet) => facet.key)
  );
  const facetOrder = [...presentationOrder, ...(generated.facets?.order || [])]
    .filter((key, index, all) => all.indexOf(key) === index);
  const pinned = [
    ...(generated.facets?.pinned || []).filter((key) => !explicitStateKeys.has(key)),
    ...presentationFacets.filter((facet) => facet.default_state === 'pinned').map((facet) => facet.key)
  ];
  const hidden = [
    ...(generated.facets?.hidden || []).filter((key) => !explicitStateKeys.has(key)),
    ...presentationFacets.filter((facet) => facet.default_state === 'hidden').map((facet) => facet.key)
  ];
  const rightTabs = presentation?.panels?.right?.tabs;
  return {
    facets: {
      ...generated.facets,
      ...(facetOrder.length ? { order: facetOrder } : {}),
      pinned,
      hidden,
      ...(presentation?.defaults?.facet_mode ? { default_mode: presentation.defaults.facet_mode } : {}),
      ...(presentation?.defaults?.search_threshold !== undefined
        ? { high_cardinality_threshold: presentation.defaults.search_threshold }
        : {}),
      ...(presentation?.defaults?.distribution_segment_limit !== undefined
        ? { distribution_segments: presentation.defaults.distribution_segment_limit }
        : {})
    },
    detail: {
      ...generated.detail,
      ...(rightTabs?.length ? { tabs: rightTabs } : {}),
      ...(presentation?.panels?.right?.default_tab ? { default_tab: presentation.panels.right.default_tab } : {})
    }
  };
}

export function facetPreferenceOverrides(
  preferences: FacetPreferences,
  defaults: FacetPreferences
): Partial<FacetPreferences> {
  const sameList = (left: string[], right: string[], unordered = false) => {
    const leftValues = unordered ? [...left].sort() : left;
    const rightValues = unordered ? [...right].sort() : right;
    return leftValues.length === rightValues.length && leftValues.every((value, index) => value === rightValues[index]);
  };
  return {
    ...(!sameList(preferences.order, defaults.order) ? { order: preferences.order } : {}),
    ...(!sameList(preferences.pinned, defaults.pinned, true) ? { pinned: preferences.pinned } : {}),
    ...(!sameList(preferences.shown, defaults.shown, true) ? { shown: preferences.shown } : {}),
    ...(!sameList(preferences.hidden, defaults.hidden, true) ? { hidden: preferences.hidden } : {}),
    ...(preferences.mode !== defaults.mode ? { mode: preferences.mode } : {}),
    ...(preferences.density !== defaults.density ? { density: preferences.density } : {})
  };
}

export function moveFacetKeyWithinPinGroup(
  order: string[],
  pinnedKeys: string[],
  key: string,
  direction: -1 | 1
): string[] {
  const pinned = new Set(pinnedKeys);
  const group = order.filter((candidate) => pinned.has(candidate) === pinned.has(key));
  const current = group.indexOf(key);
  const neighbour = group[current + direction];
  if (current < 0 || !neighbour) return order;
  const next = [...order];
  const keyIndex = next.indexOf(key);
  const neighbourIndex = next.indexOf(neighbour);
  [next[keyIndex], next[neighbourIndex]] = [next[neighbourIndex], next[keyIndex]];
  return next;
}

export function moveFacetKeyBeforeWithinPinGroup(
  order: string[],
  pinnedKeys: string[],
  key: string,
  target: string
): string[] {
  if (key === target || !order.includes(key) || !order.includes(target)) return order;
  const pinned = new Set(pinnedKeys);
  if (pinned.has(key) !== pinned.has(target)) return order;
  const next = order.filter((candidate) => candidate !== key);
  const targetIndex = next.indexOf(target);
  if (targetIndex < 0) return order;
  next.splice(targetIndex, 0, key);
  return next.every((candidate, index) => candidate === order[index]) ? order : next;
}

export function moveFacetKeyToTargetWithinPinGroup(
  order: string[],
  pinnedKeys: string[],
  key: string,
  target: string
): string[] {
  if (key === target || !order.includes(key) || !order.includes(target)) return order;
  const pinned = new Set(pinnedKeys);
  const isPinned = pinned.has(key);
  if (isPinned !== pinned.has(target)) return order;
  const group = order.filter((candidate) => pinned.has(candidate) === isPinned);
  const sourceIndex = group.indexOf(key);
  const targetIndex = group.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0) return order;
  const reordered = group.filter((candidate) => candidate !== key);
  const remainingTargetIndex = reordered.indexOf(target);
  reordered.splice(remainingTargetIndex + (sourceIndex < targetIndex ? 1 : 0), 0, key);
  let groupIndex = 0;
  const next = order.map((candidate) => (
    pinned.has(candidate) === isPinned ? reordered[groupIndex++] : candidate
  ));
  return next.every((candidate, index) => candidate === order[index]) ? order : next;
}

function uniqueKnownStrings(value: unknown, known: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && known.has(item)))];
}

export function normalizeFacetPreferences(
  value: unknown,
  keys: string[],
  defaults: FacetPreferences
): FacetPreferences {
  const known = new Set(keys);
  const candidate = value && typeof value === 'object' ? (value as Partial<FacetPreferences>) : {};
  const explicitOrder = uniqueKnownStrings(candidate.order, known);
  const defaultOrder = uniqueKnownStrings(defaults.order, known);
  const order = [...explicitOrder, ...defaultOrder, ...keys].filter((key, index, all) => all.indexOf(key) === index);
  const mode = candidate.mode === 'all' || candidate.mode === 'suggested' ? candidate.mode : defaults.mode;
  const density = candidate.density === 'explained' || candidate.density === 'compact' ? candidate.density : defaults.density;
  const pinned = uniqueKnownStrings(candidate.pinned ?? defaults.pinned, known);
  const pinnedSet = new Set(pinned);
  const hidden = uniqueKnownStrings(candidate.hidden ?? defaults.hidden, known).filter((key) => !pinnedSet.has(key));
  const hiddenSet = new Set(hidden);
  return {
    version: 1,
    order,
    pinned,
    shown: uniqueKnownStrings(candidate.shown ?? defaults.shown, known).filter((key) => !hiddenSet.has(key)),
    hidden,
    mode,
    density
  };
}

export function applyFacetPreferenceOrder(keys: string[], preferences: FacetPreferences): string[] {
  const known = new Set(keys);
  const ordered = [...preferences.order, ...keys].filter((key, index, all) => known.has(key) && all.indexOf(key) === index);
  const pinned = new Set(preferences.pinned);
  return [...ordered.filter((key) => pinned.has(key)), ...ordered.filter((key) => !pinned.has(key))];
}

export function moveFacetKey(order: string[], key: string, direction: -1 | 1): string[] {
  const current = order.indexOf(key);
  const target = current + direction;
  if (current < 0 || target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[current], next[target]] = [next[target], next[current]];
  return next;
}

export function facetDistributionSegments(rows: LargeFacetRow[], limit = 10): FacetDistributionSegment[] {
  const positive = rows.filter((row) => Number.isFinite(row.count) && row.count > 0);
  if (positive.length <= limit) return positive;
  const visible = positive.slice(0, Math.max(1, limit - 1));
  const omitted = positive.slice(visible.length);
  return [
    ...visible,
    {
      value: '__other__',
      count: omitted.reduce((total, row) => total + row.count, 0),
      otherValues: omitted.length
    }
  ];
}

function numericValue(value: string): number | null {
  const normalized = value.trim().replaceAll(',', '');
  if (!normalized || !/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function orderFacetRows(
  rows: LargeFacetRow[],
  order: string | undefined,
  label: (value: string) => string = (value) => value
): LargeFacetRow[] {
  const next = [...rows];
  if (order === 'label-asc') return next.sort((left, right) => label(left.value).localeCompare(label(right.value)));
  if (order === 'label-desc') return next.sort((left, right) => label(right.value).localeCompare(label(left.value)));
  if (order === 'value-asc' || order === 'value-desc') {
    const direction = order === 'value-asc' ? 1 : -1;
    return next.sort((left, right) => {
      const leftNumber = numericValue(left.value);
      const rightNumber = numericValue(right.value);
      if (leftNumber !== null && rightNumber !== null) return direction * (leftNumber - rightNumber);
      if (leftNumber !== null) return -1;
      if (rightNumber !== null) return 1;
      return direction * left.value.localeCompare(right.value);
    });
  }
  return next.sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

export function facetExampleValues(
  rows: LargeFacetRow[],
  explicitExamples: string[] | undefined,
  label: (value: string) => string,
  limit = 3
): string[] {
  if (explicitExamples?.length) return [...new Set(explicitExamples.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
  return [...new Set(rows.slice(0, limit).map((row) => label(row.value)).filter(Boolean))];
}
