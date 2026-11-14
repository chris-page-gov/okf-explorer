import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { readEesPair, parseCsv, displayValue, filterEesRows, EES_LIMITS } from './ees';
const data = readFileSync(new URL('../../../static/examples/dfe-ees/ees_demo_datafile.csv', import.meta.url), 'utf8');
const meta = readFileSync(new URL('../../../static/examples/dfe-ees/ees_demo_datafile.meta.csv', import.meta.url), 'utf8');

describe('DfE EES paired CSV reader', () => {
  it('reads the complete publisher example with four exact sidecar joins and original names', () => {
    const pair = readEesPair(data, meta);
    expect(pair.rows).toHaveLength(15); expect(pair.metadata).toHaveLength(4); expect(pair.headers).toHaveLength(11);
    expect(pair.geographyHeader).toBe('geographical_level'); expect(pair.fields.find(f => f.name === 'percent_children')).toMatchObject({ unit: '%', decimals: 1, role: 'Indicator' });
  });
  it('preserves commas, doubled quotes, quoted newlines, empty cells, BOM and CRLF', () => {
    expect(parseCsv('\uFEFFa,b,c\r\n"one,two","a""b\nc",\r\n')).toEqual([['a', 'b', 'c'], ['one,two', 'a"b\nc', '']]);
  });
  it.each(['a,a\n1,2', 'a,b\n1', 'a\n"unfinished', 'a\n"x"tail', 'a\na"b', 'a, b\n1,2'])('rejects malformed CSV %j', value => expect(() => parseCsv(value)).toThrow());
  it('accepts the detailed-guide geography spelling without changing the source', () => {
    expect(readEesPair(data.replace('geographical_level', 'geographic_level'), meta).geographyHeader).toBe('geographic_level');
  });
  it('rejects both geography spellings together', () => {
    expect(() => readEesPair(data.replace('region_code', 'geographic_level'), meta)).toThrow(/exactly one geography/);
  });
  it('rejects missing compulsory time/geography headings', () => expect(() => readEesPair(data.replace('country_code', 'other'), meta)).toThrow(/missing country_code/));
  it('rejects missing, duplicate or unmatched metadata definitions', () => {
    expect(() => readEesPair(data, meta.split('\n')[0])).toThrow(/at least one definition/);
    expect(() => readEesPair(data, meta + meta.split('\n')[1] + '\n')).toThrow(/Duplicate/);
    expect(() => readEesPair(data, meta.replace('number_children', 'unknown'))).toThrow(/no exact data heading/);
  });
  it('rejects invalid roles, blank labels and excessive precision', () => {
    expect(() => readEesPair(data, meta.replace('Filter', 'Measure'))).toThrow(/type and a label/);
    expect(() => readEesPair(data, meta.replace('Filter,Sex', 'Filter,'))).toThrow(/type and a label/);
    expect(() => readEesPair(data, meta.replace('%,1', '%,1000'))).toThrow(/precision/);
  });
  it('preserves unknown units with a warning and without applying numeric formatting', () => {
    const pair = readEesPair(data, meta.replace('%,1', 'miles,1'));
    expect(pair.warnings.join(' ')).toContain('unrecognised unit');
    expect(displayValue('100.000', pair.fields[10])).toBe('100.000');
  });
  it('keeps unknown fields explicit rather than inventing a role', () => {
    const pair = readEesPair(data.replace('region_name', 'unlisted'), meta);
    expect(pair.fields.find(f => f.name === 'unlisted')?.role).toBe('Unspecified');
    expect(pair.warnings.join(' ')).toContain('unlisted has no sidecar definition');
  });
  it('distinguishes zero from every published special symbol and preserves raw values', () => {
    const field = readEesPair(data, meta).fields.find(f => f.name === 'percent_children')!;
    expect(displayValue('0', field)).toBe('0.0%'); expect(displayValue('c', field)).toBe('c — Suppressed');
    for (const value of ['x', 'z', 'low', 'k', 'u']) expect(displayValue(value, field)).toContain(value + ' — ');
    expect(displayValue('c', field, false)).toBe('c'); expect(displayValue('100.000', field, false)).toBe('100.000');
    expect(displayValue('12345678901234567890', field)).toBe('12345678901234567890');
    expect(displayValue('', field)).toBe(''); expect(displayValue('=IMPORTXML("x")', field)).toBe('=IMPORTXML("x")');
  });
  it('preserves numeric identifiers marked numberstring and filters exact source values', () => {
    const pair = readEesPair(data, meta); const field = { ...pair.fields[9], unit: 'numberstring' };
    expect(displayValue('00123', field)).toBe('00123');
    expect(filterEesRows(pair, 'sex', 'Male')).toHaveLength(5);
    expect(filterEesRows(pair, 'sex', 'male')).toHaveLength(0);
  });
  it('enforces bounded input before parsing a large file', () => expect(() => parseCsv('x'.repeat(EES_LIMITS.bytes + 1))).toThrow(/8 MiB/));
});
