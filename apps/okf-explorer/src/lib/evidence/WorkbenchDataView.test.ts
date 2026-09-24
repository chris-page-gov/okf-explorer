import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import WorkbenchDataView from './WorkbenchDataView.svelte';
import type { ViewPayload } from './toolTypes';

const base: ViewPayload = {
  schema: 'okf-workbench-view.v1', kind: 'graph', title: 'Capital dependencies',
  fields: [{ key: 'ref', label: 'Evidence item', type: 'string' }, { key: 'readiness', label: 'Ready', type: 'boolean' }],
  rows: [{ ref: 'record-u07', readiness: null }],
  nodes: [{ ref: 'record-u07', label: 'Capital rule', status: 'Unreviewed' }, { ref: 'record-84861', label: 'Amount of notional capital', status: 'Source captured' }],
  edges: [{ ref: 'assertion-one', source: 'record-u07', target: 'record-84861', label: 'Needs source entry', status: 'Proposed' }],
  time_basis: { assessment_date: null, effective_from: '2026-01-01', effective_to: null },
  provenance: [{ ref: 'record-84861', url: 'https://example.test/source.pdf#page=3', locator: 'PDF page 3', source_date: null }],
  limitations: ['Legal applicability has not been reviewed.'], authority: 'authored-unreviewed-proposal'
};
const html = (payload: ViewPayload): string => render(WorkbenchDataView, { props: { payload, onRecord() {} } }).body;

describe('workbench data view', () => {
  it('shows a directional graph with equivalent tables and keyboard controls', () => {
    const body = html(base);
    expect(body).toContain('Directed graph with 2 nodes and 1 displayed connections');
    expect(body).toContain('marker-end="url(#workbench-arrowhead)"');
    expect(body).toMatch(/<h5[^>]*>Nodes<\/h5>/);
    expect(body).toMatch(/<h5[^>]*>Connections<\/h5>/);
    expect(body).toMatch(/<button[^>]*>Capital rule<\/button>/);
    expect(body).toMatch(/<button[^>]*>Amount of notional capital<\/button>/);
    expect(body).toContain('Needs source entry');
    expect(body).toContain('Legal applicability has not been reviewed.');
  });
  it('always exposes authority, limitations and dates, with unknowns distinct from zero', () => {
    const body = html({ ...base, kind: 'rates', title: 'Rate review', rows: [{ ref: 'record-u07', readiness: null }, { ref: 'record-84861', readiness: false }] });
    expect(body).toContain('Authored proposal, not reviewed');
    expect(body).toContain('Assessment date');
    expect(body).toContain('Effective from');
    expect(body).toContain('2026-01-01');
    expect(body).toContain('Effective to');
    expect(body).toContain('Unknown');
    expect(body).toContain('No');
    expect(body).toContain('Unknown rates and readiness values are not zero.');
  });
  it('keeps empty readiness and calculation views explicit without calculating', () => {
    const body = html({ ...base, kind: 'calculation', rows: [], limitations: [], provenance: [], time_basis: { assessment_date: null, effective_from: null, effective_to: null } });
    expect(body).toContain('No entries were supplied. Unknown values are not zero.');
    expect(body).toContain('No limitation statement was supplied.');
    expect(body).toContain('No source references were supplied.');
    expect(body).toContain('It does not calculate an award or decide entitlement.');
  });
  it.each([
    ['interactions', 'Interactions'],
    ['requirements', 'Evidence requirements']
  ] as const)('renders %s as a labelled table without changing its values', (kind, heading) => {
    const body = html({ ...base, kind, fields: [{ key: 'label', label: 'Item', type: 'string' }, { key: 'count', label: 'Count', type: 'number', unit: 'records' }], rows: [{ label: 'Review path', count: 0 }] });
    expect(body).toContain(heading);
    expect(body).toContain('Item');
    expect(body).toContain('Count');
    expect(body).toContain('(records)');
    expect(body).toContain('Review path');
    expect(body).toContain('>0<');
  });
  it('escapes untrusted values and only links credential-free HTTPS sources', () => {
    const body = html({ ...base, title: '<script>alert(1)</script>', rows: [{ ref: '<img src=x onerror=alert(1)>', readiness: null }],
      provenance: [{ ref: 'safe', url: 'https://example.test/source.pdf', locator: 'Safe', source_date: null },
        { ref: 'unsafe', url: 'javascript:alert(1)', locator: 'Unsafe', source_date: null },
        { ref: 'credentials', url: 'https://user:pass@example.test/source.pdf', locator: 'Credentials', source_date: null },
        { ref: 'http', url: 'http://example.test/source.pdf', locator: 'HTTP', source_date: null }] });
    expect(body).toContain('&lt;script>alert(1)&lt;/script>');
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('<img src=x onerror=alert(1)>');
    expect(body).toContain('href="https://example.test/source.pdf"');
    expect(body).not.toContain('href="javascript:');
    expect(body).not.toContain('href="https://user:pass@');
    expect(body).not.toContain('href="http://example.test');
    expect(body.match(/Source link unavailable/g)).toHaveLength(3);
  });
  it('bounds displayed rows and graph nodes and announces clipping', () => {
    const body = html({ ...base,
      nodes: Array.from({ length: 30 }, (_, index) => ({ ref: `r${index}`, label: `Node ${index}`, status: 'Proposed' })),
      edges: [], rows: Array.from({ length: 110 }, (_, index) => ({ ref: `r${index}`, readiness: null })) });
    expect(body).toContain('This display is limited.');
    expect(body).toContain('Node 23');
    expect(body).not.toContain('Node 24');
    expect(body).toContain('r99');
    expect(body).not.toContain('r100');
  });
  it('omits edges whose endpoints are outside the bounded graph and explains that display limit', () => {
    const body = html({ ...base, edges: [{ ref: 'outside', source: 'record-u07', target: 'not-displayed', label: 'Unshown target', status: 'Unknown' }] });
    expect(body).toContain('This display is limited.');
    expect(body).toContain('0 displayed connections');
    expect(body).not.toContain('Unshown target');
  });
  it('states partial row coverage without claiming the full table is shown', () => {
    const body = html({ ...base, kind: 'requirements', coverage: { offset: 5, total_rows: 18, delivered_rows: 1, complete: false, next_cursor: 'opaque' } });
    expect(body).toContain('Showing rows 6–6 of 18.');
    expect(body).toContain('This is a partial page; further rows are available.');
    expect(body).not.toContain('This view page is complete.');
  });
  it('shows each supplied evidence reference for an interaction or stage', () => {
    const body = html({ ...base, kind: 'interactions', rows: [{ readiness: null, references: ['source-a', 'source-b'] }] });
    expect(body).toContain('Evidence sources');
    expect(body).toContain('Inspect source 1');
    expect(body).toContain('Inspect source 2');
  });
});
