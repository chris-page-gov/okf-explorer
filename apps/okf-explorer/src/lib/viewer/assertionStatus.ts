import type { RelationshipAssertionStatus } from '$lib/types';

export type AssertionStatus = RelationshipAssertionStatus | 'unclassified';
export type AssertionFilter = AssertionStatus | 'all';
export const assertionLabels: Record<AssertionStatus, string> = {
  official: 'Source-asserted',
  normalized: 'Normalised',
  inferred: 'Inferred',
  'model-derived': 'Model-derived',
  unclassified: 'Unclassified'
};
export const assertionStatuses = Object.keys(assertionLabels) as AssertionStatus[];

export function assertionStatus(value: unknown): AssertionStatus {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return assertionStatuses.includes(candidate as AssertionStatus) ? candidate as AssertionStatus : 'unclassified';
}

export function assertionFilter(value: unknown): AssertionFilter {
  return assertionStatuses.includes(value as AssertionStatus) ? value as AssertionStatus : 'all';
}

export function countAssertionStatuses(values: Iterable<unknown>): Record<AssertionStatus, number> {
  const counts = { official: 0, normalized: 0, inferred: 0, 'model-derived': 0, unclassified: 0 };
  for (const value of values) counts[assertionStatus(value)] += 1;
  return counts;
}
