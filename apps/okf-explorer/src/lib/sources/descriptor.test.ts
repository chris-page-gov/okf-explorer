import { describe, expect, it } from 'vitest';
import { isLargeCorpusDescriptor, parseRelatedDescriptorLinks } from './descriptor';

describe('large-corpus descriptor discrimination', () => {
  it('accepts only the supported schema and kind pair', () => {
    expect(
      isLargeCorpusDescriptor({
        schema: 'okf-explorer-large-corpus.v1',
        kind: 'okf-large-corpus'
      })
    ).toBe(true);
    expect(isLargeCorpusDescriptor({ title: 'Small OKF bundle' })).toBe(false);
  });

  it('fails closed when schema and kind disagree', () => {
    expect(() =>
      isLargeCorpusDescriptor({
        schema: 'okf-explorer-large-corpus.v1',
        kind: 'not-an-okf-large-corpus'
      })
    ).toThrow('Large-corpus descriptor identity mismatch');
    expect(() => isLargeCorpusDescriptor({ kind: 'okf-large-corpus' })).toThrow(
      'Large-corpus descriptor identity mismatch'
    );
  });

  it('fails closed for unsupported large-corpus schema versions', () => {
    expect(() =>
      isLargeCorpusDescriptor({
        schema: 'okf-explorer-large-corpus.v2',
        kind: 'okf-large-corpus'
      })
    ).toThrow('Unsupported large-corpus descriptor schema');
  });
});

describe('producer-declared related descriptor links', () => {
  it('keeps absent links compatible and accepts bounded canonical HTTPS links', () => {
    expect(parseRelatedDescriptorLinks(undefined)).toEqual([]);
    expect(parseRelatedDescriptorLinks([
      { label: 'AI evaluation reports', url: 'https://example.test/reports/', kind: 'evaluation-reports' }
    ])).toEqual([
      { label: 'AI evaluation reports', url: 'https://example.test/reports/', kind: 'evaluation-reports' }
    ]);
  });

  it('rejects malformed, unsafe, non-canonical and overlong values', () => {
    const invalid = [
      { label: 'bad', url: 'http://example.test/', kind: 'reports' },
      { label: 'bad', url: 'https://user:pass@example.test/', kind: 'reports' },
      { label: 'bad', url: 'javascript:alert(1)', kind: 'reports' },
      { label: 'bad', url: 'https://example.test/%zz', kind: 'reports' },
      { label: 'bad', url: 'https://example.test/a b', kind: 'reports' },
      { label: 'bad', url: 'https://example.test:99999/', kind: 'reports' },
      { label: 'bad', url: 'https://example.test', kind: 'reports' },
      { label: 'bad\nlabel', url: 'https://example.test/', kind: 'reports' },
      { label: 'x'.repeat(121), url: 'https://example.test/', kind: 'reports' },
      { label: 'bad', url: `https://example.test/${'x'.repeat(2040)}`, kind: 'reports' }
    ];
    expect(parseRelatedDescriptorLinks(invalid)).toEqual([]);
  });

  it('caps the declared list at eight entries', () => {
    const rows = Array.from({ length: 9 }, (_, index) => ({
      label: `Report ${index}`, url: `https://example.test/${index}/`, kind: 'reports'
    }));
    expect(parseRelatedDescriptorLinks(rows)).toHaveLength(8);
  });
});
