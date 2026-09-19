import type { LargeDataset, LargeResource, OkfNode } from '$lib/types';
import { datasetReleasePeriod } from './helpers';
import { smallNodeTimeline } from './smallTimeline';

export type TimelineDateScope = 'all' | 'source' | 'audit';
export type LargeTimelinePeriod = {
  label: string;
  sortKey: string;
  role: string;
  basis: 'source' | 'inferred' | 'audit';
  precision: 'year' | 'quarter' | 'month' | 'day' | 'timestamp';
  catalogueFallback: boolean;
  audit: Array<{ label: string; value: string; display: string }>;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function exactDate(value: unknown, role: string, basis: LargeTimelinePeriod['basis']): LargeTimelinePeriod | null {
  // Reuse calendar and typed-literal validation from the small-bundle consumer.
  const date = smallNodeTimeline({ id: 'date', title: 'Date', 'schema:datePublished': value } as OkfNode)?.primary;
  if (!date) return null;
  const label = date.display.replace(/January|February|March|April|June|July|August|September|October|November|December/g, month => month.slice(0, 3));
  return { label, sortKey: date.value, role, basis, precision: date.precision, catalogueFallback: basis === 'audit', audit: [] };
}

/** Display source, inferred and audit dates distinctly; never select legal effect from a date. */
export function largeDatasetTimelinePeriod(dataset: LargeDataset, resources: LargeResource[] = []): LargeTimelinePeriod | null {
  const sourceDates = object(dataset.extras?.source_dates);
  const provenanceDates = object(dataset.provenance?.date_roles);
  const dates = Object.keys(sourceDates).length ? sourceDates : provenanceDates;
  const audit = [
    exactDate(dates.captured_at ?? dataset.captured_at, 'Captured', 'audit'),
    exactDate(dates.observed_at ?? dataset.observed_at, 'Observed', 'audit'),
    exactDate(dataset.metadata_modified, 'Catalogue metadata updated', 'audit'),
    exactDate(dates.generated_at, 'Record generated', 'audit'),
    exactDate(dataset.metadata_created, 'Catalogue metadata created', 'audit')
  ].filter((date): date is LargeTimelinePeriod => Boolean(date));
  const period = datasetReleasePeriod(dataset, resources);
  let primary: LargeTimelinePeriod | null = null;
  if (period?.source === 'declared') {
    primary = exactDate(dataset.temporal_coverage, 'Declared coverage', 'source') || { label: period.label, sortKey: period.sortKey, role: 'Declared coverage', basis: 'source',
      precision: period.label.startsWith('Q') ? 'quarter' : period.month ? 'month' : 'year', catalogueFallback: false, audit: [] };
  } else {
    const operational = object(dataset.operational_metadata);
    primary = exactDate(object(operational.latest_release).date, 'Source publication or release', 'source');
    if (!primary && !dates.publication_date_status && period && ['title', 'resource'].includes(period.source)) {
      primary = { label: period.label, sortKey: period.sortKey,
        role: period.source === 'title' ? 'Period inferred from title' : 'Period inferred from resource text', basis: 'inferred',
        precision: period.label.startsWith('Q') ? 'quarter' : period.month ? 'month' : 'year', catalogueFallback: false, audit: [] };
    }
  }
  primary ||= audit[0] || null;
  if (!primary && period?.catalogueFallback) {
    for (const value of [dataset.published_at, dataset.updated_at, dataset.timestamp]) {
      primary = exactDate(value, 'Catalogue timestamp (date role not declared)', 'audit');
      if (primary) break;
    }
  }
  if (!primary) return null;
  return { ...primary, audit: audit.filter(date => date.role !== primary!.role || date.sortKey !== primary!.sortKey)
    .map(date => ({ label: date.role, value: date.sortKey, display: date.label })) };
}

export function timelinePeriodInScope(period: LargeTimelinePeriod, scope: TimelineDateScope): boolean {
  return scope === 'all' || period.basis === scope;
}

/** Partial dates retain an explicit unknown precision group instead of a fabricated month. */
export function timelinePeriodBucket(period: LargeTimelinePeriod, resolution: 'year' | 'quarter' | 'month'): string {
  const year = period.sortKey.slice(0, 4);
  if (resolution === 'year') return year;
  if (period.precision === 'year') return `${year} · ${resolution} not specified`;
  if (period.precision === 'quarter' && resolution === 'month') return `${year} · month not specified`;
  const month = Number(period.sortKey.slice(5, 7));
  return resolution === 'quarter' ? `${year}-Q${Math.ceil(month / 3)}` : period.sortKey.slice(0, 7);
}
