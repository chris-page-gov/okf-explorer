import { describe, expect, it } from 'vitest';
import { largeDatasetTimelinePeriod, timelinePeriodBucket, timelinePeriodInScope } from './largeTimeline';

describe('large-corpus Timeline date roles and precision', () => {
  it.each([['2026', '2026', 'year'], ['2026-04', 'Apr 2026', 'month'], ['2026-04-06', '6 Apr 2026', 'day']])
  ('preserves source release precision %s ahead of capture and title', (date, label, precision) => {
    const period = largeDatasetTimelinePeriod({ name: 'ref', title: 'Handbook 2026/27',
      operational_metadata: { latest_release: { date } }, extras: { source_dates: { captured_at: '2026-09-15' } } })!;
    expect(period).toMatchObject({ sortKey: date, label, precision, basis: 'source', role: 'Source publication or release' });
    expect(period.audit).toEqual([{ label: 'Captured', value: '2026-09-15', display: '15 Sep 2026' }]);
  });
  it('uses a declared unknown publication status to prevent inference from a title year', () => {
    const period = largeDatasetTimelinePeriod({ name: 'doc', title: 'Memo 2020', extras: { source_dates: {
      publication_date_status: 'not-established-from-document-evidence', captured_at: '2026-09-15'
    } } })!;
    expect(period).toMatchObject({ role: 'Captured', basis: 'audit', sortKey: '2026-09-15' });
    expect(timelinePeriodInScope(period, 'source')).toBe(false);
    expect(timelinePeriodInScope(period, 'audit')).toBe(true);
  });
  it('labels title and resource periods as inferred and excludes them from source-only selection', () => {
    const period = largeDatasetTimelinePeriod({ name: 'lookup', title: 'Lookup (April 2018)' })!;
    expect(period.role).toBe('Period inferred from title');
    expect(timelinePeriodInScope(period, 'source')).toBe(false);
    expect(timelinePeriodInScope(period, 'all')).toBe(true);
  });
  it('does not fabricate finer date precision in grouped timelines', () => {
    const period = largeDatasetTimelinePeriod({ name: 'year', title: 'Annual data', temporal_coverage: '2024' })!;
    expect(timelinePeriodBucket(period, 'month')).toBe('2024 · month not specified');
    expect(timelinePeriodBucket(period, 'quarter')).toBe('2024 · quarter not specified');
    const quarter = largeDatasetTimelinePeriod({ name: 'q', title: 'Quarter data', temporal_coverage: 'Q2 2024' })!;
    expect(timelinePeriodBucket(quarter, 'month')).toBe('2024 · month not specified');
    expect(timelinePeriodBucket(quarter, 'quarter')).toBe('2024-Q2');
  });
  it('ignores listing updates, HTTP dates and ambiguous source text', () => {
    expect(largeDatasetTimelinePeriod({ name: 'doc', title: 'Document', extras: { source_dates: {
      listing_page_publication_updated_at: '2026-07-01', http_last_modified: '2026-06-01', revision_statement_review: { stated_revision_dates: ['2026-04', '2025-09'] }
    } } })).toBeNull();
  });
  it('rejects malformed publication days without concealing the capture role', () => {
    expect(largeDatasetTimelinePeriod({ name: 'doc', title: 'Document', operational_metadata: { latest_release: { date: '2026-02-30' } }, captured_at: '2026-09-15' }))
      .toMatchObject({ role: 'Captured', basis: 'audit' });
  });
  it('preserves exact declared coverage days and labels catalogue creation as creation', () => {
    expect(largeDatasetTimelinePeriod({ name: 'daily', title: 'Daily observations', temporal_coverage: '2026-04-06' }))
      .toMatchObject({ sortKey: '2026-04-06', precision: 'day', role: 'Declared coverage' });
    expect(largeDatasetTimelinePeriod({ name: 'created', title: 'Record', metadata_created: '2026-09-15' }))
      .toMatchObject({ role: 'Catalogue metadata created', basis: 'audit' });
  });
});
