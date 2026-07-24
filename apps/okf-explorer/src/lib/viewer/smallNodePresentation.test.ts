import { describe, expect, it } from 'vitest';
import type { OkfNode } from '$lib/types';
import {
  renderSafeMarkdown,
  safeSmallNodeUrl,
  smallNodeLinks,
  smallNodeMetadataRows,
  smallNodeSearchText
} from './smallNodePresentation';

const node: OkfNode = {
  id: 'alpha',
  title: 'Alpha record',
  body: '# Body heading\n\nA body-only searchable phrase.',
  source: 'records/alpha.md',
  source_url: 'https://source.example/alpha?token=secret&view=public',
  resources: [
    { title: 'Boundary CSV', url: 'https://data.example/alpha.csv?api_key=secret&download=1' },
    'files/alpha.geojson'
  ],
  schema: {
    '@type': 'Dataset',
    '@id': 'https://schema.example/alpha',
    url: 'https://schema.example/alpha?signature=secret&view=public'
  },
  provenance: {
    source_url: 'https://provenance.example/alpha',
    retrieved_at: '2026-07-16T00:00:00Z',
    method: 'fixture'
  }
};

describe('small node presentation', () => {
  it('includes Markdown body text in deterministic small-bundle search', () => {
    expect(smallNodeSearchText(node)).toContain('body-only searchable phrase');
  });

  it('renders an escaped Markdown subset and rejects active-content links', () => {
    const html = renderSafeMarkdown(
      '# Safe heading\n\n**Strong** [relative](guides/use.html?token=secret&view=full)\n\n<script>alert(1)</script> [unsafe](javascript:alert(1))',
      'https://bundle.example/okf-bundle.json'
    );

    expect(html).toContain('<h1>Safe heading</h1>');
    expect(html).toContain('<strong>Strong</strong>');
    expect(html).toContain('href="https://bundle.example/guides/use.html?view=full"');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
  });

  it('renders pipe tables and constrained Mermaid flowcharts without active content', () => {
    const html = renderSafeMarkdown(`# Evidence

| Field | Value |
|---|---|
| Source | [record](records/alpha.json) |

\`\`\`mermaid
flowchart LR
  Source["Source record"] --> Explorer["OKF Explorer"]
\`\`\`
`, 'https://bundle.example/okf-bundle.json');

    expect(html).toContain('<table>');
    expect(html).toContain('<th>Field</th>');
    expect(html).toContain('href="https://bundle.example/records/alpha.json"');
    expect(html).toContain('<svg class="mermaid-lite"');
    expect(html).toContain('Source record');
    expect(html).toContain('marker-end=');
  });

  it('resolves, redacts and deduplicates safe source and resource links', () => {
    expect(safeSmallNodeUrl('https://user:pass@example.test/private')).toBe('');
    expect(safeSmallNodeUrl('javascript:alert(1)', 'https://bundle.example/okf-bundle.json')).toBe('');

    expect(smallNodeLinks(node, 'https://bundle.example/okf-bundle.json')).toEqual([
      { label: 'Source', url: 'https://bundle.example/records/alpha.md', kind: 'source' },
      { label: 'Source URL', url: 'https://source.example/alpha?view=public', kind: 'source' },
      { label: 'Schema.org URL', url: 'https://schema.example/alpha?view=public', kind: 'source' },
      { label: 'Provenance source', url: 'https://provenance.example/alpha', kind: 'source' },
      { label: 'Boundary CSV', url: 'https://data.example/alpha.csv?download=1', kind: 'resource' },
      { label: 'Resource 2', url: 'https://bundle.example/files/alpha.geojson', kind: 'resource' }
    ]);
  });

  it('selects Schema.org and provenance fields while the JSON disclosure retains the rest', () => {
    expect(smallNodeMetadataRows(node)).toEqual([
      { key: 'schema_org_type', label: 'Schema.org type', value: 'Dataset' },
      { key: 'schema_org_id', label: 'Schema.org ID', value: 'https://schema.example/alpha' },
      { key: 'provenance.source', label: 'Provenance source', value: 'https://provenance.example/alpha' },
      { key: 'provenance.retrieved_at', label: 'Retrieved', value: '2026-07-16T00:00:00Z' },
      { key: 'provenance.method', label: 'Provenance method', value: 'fixture' }
    ]);
  });
});
