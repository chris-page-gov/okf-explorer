import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import FacetPanel from '$lib/components/FacetPanel.svelte';
import ResultList from '$lib/components/ResultList.svelte';
import ExplorationToolbar from '$lib/components/ExplorationToolbar.svelte';
import SmallRecordInspector from '$lib/components/SmallRecordInspector.svelte';
import { emptyExploration } from './facetSelection';

describe('shared Explorer presentation contracts', () => {
  it('shows incoming direction and declared inverse without hiding relationship evidence', () => {
    const { body } = render(SmallRecordInspector, { props: {
      detailNode: { id: 'target', title: 'Target' }, smallCorpus: null, sourceUrl: 'https://example.test/bundle.json',
      detailRelationships: [{ source: 'source', target: 'target', kind: 'supports', inverse_label: 'supported by' }],
      inspectNode() {}, inspectRelationship() {}, loadFederationChild() {}
    } });
    expect(body).toContain('Incoming · supported by');
    expect(body).toContain('source → target');
    expect(body).toContain('Inspect relationship');
    expect(body).toContain('Inspect source');
  });

  it('renders current-scope distributions, collapsed selections, touch selection and keyboard alternatives', () => {
    const { body } = render(FacetPanel, { props: {
      facets: [{ key: 'type', label: 'Type', open: false, pinned: false, exact: true,
        rows: [{ value: 'Record', label: 'Record', count: 11, highlighted: 11 }, { value: 'Action', label: 'Action', count: 3, highlighted: 0 }] }],
      selection: { type: ['Record'] }, onopen() {}, onpin() {}, onpreview() {}, onpreviewsummary() {}, onkeep() {}, onmove() {}, onhide() {}
    } });
    expect(body).toContain('aria-expanded="false"');
    expect(body).toContain('selection-summary');
    expect(body).toContain('11 highlighted / 11 in scope');
    expect(body).toContain('Select multiple values');
    expect(body).toContain('Alt+Enter');
    expect(body).toContain('Move up');
    expect(body).toContain('Hide facet');
  });

  it('preserves result capture markers and distinguishes loading from an empty result', () => {
    const props = { query: 'child', onselect() {}, items: [{ id: 'one', route: 'record/one', title: 'One', type: 'Record', description: 'Authored evidence', highlighted: true, canonicalUrl: 'https://example.test/one', reason: 'Matched title' }] };
    const { body } = render(ResultList, { props });
    expect(body).toContain('data-okf-ranked-results="primary"');
    expect(body).toContain('data-result-canonical-url="https://example.test/one"');
    expect(body).toContain('data-okf-query="child"');
    expect(body).toContain('data-okf-search-state="settled"');
    expect(body).toContain('data-highlighted="true"');
    expect(body).toContain('Why this matched: Matched title');
    const loading = render(ResultList, { props: { ...props, busy: true, items: [] } }).body;
    expect(loading).toContain('Updating results…');
    expect(loading).not.toContain('No records match.');
    expect(render(ResultList, { props: { ...props, items: [] } }).body).toContain('No records match.');
  });

  it('disables keep without a preview and calculates folded bars from live membership', () => {
    const { body } = render(ExplorationToolbar, { props: { exploration: emptyExploration(), highlighted: 0, total: 22,
      folds: [{ id: 'f', label: 'Records', members: ['a', 'b'] }], foldCounts: { f: { highlighted: 1, inScope: 2 } },
      onkeep() {}, onfold() {}, onunfold() {}, onclear() {}, onundo() {}, onreset() {} } });
    expect(body).toContain('--highlight-share:50%');
    expect(body).toContain('1 highlighted / 2 in scope');
    expect(body).toMatch(/<button[^>]*disabled[^>]*>Keep highlighted/);
  });
});
