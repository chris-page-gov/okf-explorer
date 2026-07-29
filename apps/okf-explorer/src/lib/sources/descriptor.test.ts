import { describe, expect, it } from 'vitest';
import { isLargeCorpusDescriptor } from './descriptor';

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
