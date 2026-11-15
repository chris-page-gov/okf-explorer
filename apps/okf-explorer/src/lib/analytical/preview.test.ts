import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareDecimal, csvRows, datetimeInstant, decimalKey, inspectCsv, LIMITS, parseManifest, type Table } from './preview';
const root = new URL('../../../../../profiles/analytical-data/v2/', import.meta.url);
const original = readFileSync(new URL('examples/library-observations/okf-analytical-data.json', root), 'utf8');
const csv = new Uint8Array(readFileSync(new URL('examples/library-observations/observations.csv', root)));
const vectors = JSON.parse(readFileSync(new URL('conformance-vectors.json', root), 'utf8'));
async function hash(bytes: Uint8Array): Promise<string> { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice().buffer)), n => n.toString(16).padStart(2, '0')).join(''); }
function fixture(): ReturnType<typeof parseManifest> { return parseManifest(original); }
async function tableFor(body: string, table = fixture().tables[0]): Promise<[Table, Uint8Array]> { const bytes = new TextEncoder().encode(body); return [{ ...table, sha256: await hash(bytes) }, bytes]; }

describe('candidate datetime and decimal identities', () => {
  for (const row of vectors.datetime) it(`${row.valid ? 'accepts' : 'rejects'} ${row.literal}`, () => { if (row.valid) expect(typeof datetimeInstant(row.literal)).toBe('bigint'); else expect(() => datetimeInstant(row.literal)).toThrow(); });
  it('retains nanoseconds and equal instants across offsets', () => { const [a,b] = vectors.equivalent_instants; expect(datetimeInstant(a)).toBe(datetimeInstant(b)); const [c,d] = vectors.distinct_instants; expect(datetimeInstant(d) - datetimeInstant(c)).toBe(1n); });
  for (const [a,b] of vectors.decimal_equal) it(`retains exact decimal equality ${a}/${b}`, () => expect(decimalKey(a)).toBe(decimalKey(b)));
  it('compares without floating-point precision loss or exponent expansion', () => { expect(compareDecimal('1000000000000000000001', '1000000000000000000000')).toBe(1); expect(compareDecimal('-1.5','-1.499999999999999999999')).toBe(-1); expect(compareDecimal('1e9999999999999','1e9999999999998')).toBe(1); expect(compareDecimal('-0','0.0')).toBe(0); });
});

describe('bounded CSV and metadata', () => {
  it('handles quoted newlines, escaped quotes, CRLF and empty fields', () => expect([...csvRows('a,b\r\n"x\ny","say ""hi"""\r\n,\r\n')]).toEqual([['a','b'],['x\ny','say "hi"'],['','']]));
  it('keeps blank lines distinct from quoted empty cells', () => expect([...csvRows('a\n\n""\n')]).toEqual([['a'],[],['']]));
  it('rejects broken quoting and oversized fields', () => { expect(() => [...csvRows('"unfinished')]).toThrow(); expect(() => [...csvRows('"a"extra')]).toThrow(); expect(() => [...csvRows('x'.repeat(LIMITS.fieldCharacters + 1))]).toThrow(); });
  it('rejects duplicate JSON properties before values disappear', () => expect(() => parseManifest(original.replace('"profileVersion":', '"profileVersion":"wrong","profileVersion":'))).toThrow('Duplicate JSON'));
  it('rejects oversized, deeply nested and unsupported manifests', () => { expect(() => parseManifest(' '.repeat(LIMITS.manifestBytes + 1))).toThrow(); expect(() => parseManifest('['.repeat(33)+'0'+']'.repeat(33))).toThrow('nesting'); const f = fixture(); f.profileVersion = '99.0.0'; expect(() => parseManifest(JSON.stringify(f))).toThrow(); });
  it('rejects unsafe paths and URL credentials', () => { const f = fixture(); f.tables[0].path = '../outside.csv'; expect(() => parseManifest(JSON.stringify(f))).toThrow(); f.tables[0].path = 'observations.csv'; f.tables[0].source.url = 'https://user:secret@example.invalid/'; expect(() => parseManifest(JSON.stringify(f))).toThrow(); });
  it('supports frozen v1 without adding datetime or spatial fields', () => { const f = fixture(); f.profileVersion = '1.0.0-rc.1'; f.conformsTo = ['https://chris-page-gov.github.io/okf-explorer/profile/analytical-data/v1/']; delete f.tables[0].spatial; f.tables[0].fields[1].dataType = 'string'; expect(parseManifest(JSON.stringify(f)).profileVersion).toBe('1.0.0-rc.1'); f.tables[0].source.observedAt = '2025-02-29T00:00:00Z'; expect(() => parseManifest(JSON.stringify(f))).toThrow(); });
});

describe('read-only selected-table checks', () => {
  it('checks the example, preserves literals and separates zero/suppression/datum gaps', async () => { const before = csv.slice(), result = await inspectCsv(fixture().tables[0], csv); expect(result.rowCount).toBe(2); expect(result.zeroes).toBe(1); expect(result.stateCounts).toEqual({ suppressed: 1 }); expect(result.gaps).toEqual(['Vertical datum is not recorded.']); expect(result.rows[0][1]).toBe('2026-11-14T10:00:00.000000001Z'); expect(csv).toEqual(before); });
  it('rejects a checksum mismatch before decoding', async () => { const table = fixture().tables[0]; table.sha256 = '0'.repeat(64); await expect(inspectCsv(table, csv)).rejects.toThrow('checksum'); });
  it('rejects invalid UTF-8 even with a matching digest', async () => { const bad = new Uint8Array([0xff]); const table = fixture().tables[0]; table.sha256 = await hash(bad); await expect(inspectCsv(table,bad)).rejects.toThrow(); });
  it('detects offset-equivalent key collisions', async () => { const raw = new TextDecoder().decode(csv).replace('North,2026-11-14T10:00:00.000000001Z','North,2026-11-14T10:00:00Z').replace('South,','North,'); const [t,b] = await tableFor(raw); await expect(inspectCsv(t,b)).rejects.toThrow('Duplicate observation key'); });
  it('checks declared axes and exact extent bounds', async () => { const f = fixture(); f.tables[0].spatial!.axes.reverse(); expect(() => parseManifest(JSON.stringify(f))).toThrow('axes'); const t = fixture().tables[0]; t.spatial!.extent[0] = '-1.499999999999999999999'; await expect(inspectCsv(t,csv)).rejects.toThrow('extent'); });
  it('rejects a partial coordinate pair while counting a declared missing pair', async () => { const table = fixture().tables[0]; table.fields[2].valueStates = [{token:'',state:'notAvailable'}]; table.fields[3].valueStates = [{token:'',state:'notAvailable'}]; const raw = new TextDecoder().decode(csv); let [t,b] = await tableFor(raw.replace('-1.5,52.2',','),table); expect((await inspectCsv(t,b)).missingCoordinatePairs).toBe(1); [t,b] = await tableFor(raw.replace('-1.5,52.2',',52.2'),table); await expect(inspectCsv(t,b)).rejects.toThrow('Partial'); });
  it('rejects rows beyond the preview ceiling and bytes beyond its ceiling', async () => { const t: Table = {path:'many.csv',sha256:'',source:{url:'https://example.invalid/',observedAt:'2026-11-14T00:00:00Z'},observationKey:['id'],fields:[{name:'id',label:'ID',role:'dimension',dataType:'integer'}]}; const [table,bytes] = await tableFor('id\n'+Array.from({length:5001},(_,i)=>`${i}\n`).join(''),t); await expect(inspectCsv(table,bytes)).rejects.toThrow('5,000'); await expect(inspectCsv(t,new Uint8Array(LIMITS.csvBytes+1))).rejects.toThrow('8 MiB'); });
});
