import { describe, expect, it } from 'vitest';
import type { OkfNode } from '$lib/types';
import { smallNodeTimeline, smallTimelineRows } from './smallTimeline';

const reference: OkfNode = {
  id: 'resource/handbook', title: 'Handbook reference',
  generated: { at: '2026-09-15T16:14:01Z' }, observedAt: '2026-09-15T16:14:01Z'
};

describe('small-bundle Timeline date provenance', () => {
  it('uses the described source publication month and retains record audit dates', () => {
    const node = { ...reference, 'schema:about': {
      '@id': 'https://source.example/handbook', 'schema:datePublished': { '@value': '2026-04', '@type': 'xsd:gYearMonth' }
    } };
    const row = smallNodeTimeline(node)!;
    expect(row.primary).toEqual({ value: '2026-04', display: 'April 2026', precision: 'month', label: 'Source published' });
    expect(row.audit.map(({ label, value }) => [label, value])).toEqual([
      ['Observed', '2026-09-15T16:14:01Z'], ['Record generated', '2026-09-15T16:14:01Z']
    ]);
    expect(node.generated?.at).toBe('2026-09-15T16:14:01Z');
  });

  it('distinguishes record publication from a described source and accepts expanded literals', () => {
    const row = smallNodeTimeline({ ...reference,
      'https://schema.org/about': [{ 'http://purl.org/dc/terms/issued': [{ '@value': '2026' }] }],
      'schema:datePublished': '2026-09-15'
    })!;
    expect(row.primary).toMatchObject({ value: '2026', display: '2026', precision: 'year', label: 'Source issued' });
    expect(row.audit[0]).toMatchObject({ value: '2026-09-15', label: 'Record published' });
    expect(smallNodeTimeline({ ...reference, 'dcterms:issued': '2026-04-23' })?.primary)
      .toMatchObject({ display: '23 April 2026', label: 'Record issued', precision: 'day' });
  });

  it('labels capture, generation and legacy fallback dates without implying publication', () => {
    expect(smallNodeTimeline(reference)?.primary.label).toBe('Observed');
    expect(smallNodeTimeline({ id: 'capture', title: 'Capture', retrieved_at: '2026-09-14', generated: reference.generated })?.primary.label).toBe('Captured');
    expect(smallNodeTimeline({ id: 'generated', title: 'Generated', generated: reference.generated })?.primary.label).toBe('Record generated');
    expect(smallNodeTimeline({ id: 'legacy', title: 'Legacy', timestamp: '2020-01-02' })?.primary.label).toBe('Recorded timestamp');
    expect(smallNodeTimeline({ id: 'undated', title: 'Undated' })).toBeUndefined();
  });

  it.each(['April 2026', '2026-13', '2026-02-30', '2026-04-01T25:00Z'])('rejects malformed or ambiguous date text %s', (date) => {
    expect(smallNodeTimeline({ id: 'invalid', title: 'Invalid', 'schema:datePublished': date })).toBeUndefined();
  });

  it('does not choose an arbitrary date among multiple described publications', () => {
    const row = smallNodeTimeline({ ...reference, 'schema:about': [
      { 'schema:datePublished': '2026-04' }, { 'schema:datePublished': '2025-04' }
    ] })!;
    expect(row.primary.label).toBe('Observed');
    expect(smallNodeTimeline({ ...reference, 'schema:about': { '@id': 'https://source.example/2026-04' } })?.primary.label).toBe('Observed');
  });

  it('detects conflicting source dates even when subjects use different date predicates', () => {
    const subjects = [{ 'schema:datePublished': '2026-04' }, { 'dcterms:issued': '2025-04' }];
    expect(smallNodeTimeline({ ...reference, 'schema:about': subjects })?.primary.label).toBe('Observed');
    expect(smallNodeTimeline({ ...reference, 'schema:about': [...subjects].reverse() })?.primary.label).toBe('Observed');
    expect(smallNodeTimeline({ ...reference, 'schema:about': [subjects[0], { 'dcterms:issued': '2026-04' }] })?.primary)
      .toMatchObject({ value: '2026-04', label: 'Source published or issued' });
  });

  it('retains conflicting declarations within a subject when other subjects have dates', () => {
    const ambiguous = { 'schema:datePublished': [{ '@value': '2026-04' }, { '@value': '2025-04' }] };
    const dated = { 'schema:datePublished': '2026-04' };
    for (const subjects of [[ambiguous, dated], [dated, ambiguous]]) {
      expect(smallNodeTimeline({ ...reference, 'schema:about': subjects })?.primary.label).toBe('Observed');
    }
    expect(smallNodeTimeline({ ...reference, 'schema:about': {
      ...ambiguous, 'dcterms:issued': '2026-04'
    } })?.primary.label).toBe('Observed');
    expect(smallNodeTimeline({ ...reference, 'schema:about': {
      ...dated, 'dcterms:issued': ['2026-04', '2025-04']
    } })?.primary.label).toBe('Observed');
    expect(smallNodeTimeline({ ...reference, 'schema:about': [
      { '@id': 'https://source.example/undated' }, dated
    ] })?.primary.label).toBe('Source published');
  });

  it('sorts by the displayed primary date rather than the later capture date', () => {
    const earlier = { ...reference, 'schema:about': { 'schema:datePublished': '2026-04' } };
    const later = { id: 'summer', title: 'Summer release', 'schema:datePublished': '2026-07-20', generated: { at: '2026-08-01' } };
    expect(smallTimelineRows([earlier, later]).map(({ node }) => node.id)).toEqual(['summer', 'resource/handbook']);
  });
});
