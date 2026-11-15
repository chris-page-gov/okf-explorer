/** Bounded local table inspection. This does not replace the Python schema gate. */
export const LIMITS = { manifestBytes: 256 * 1024, csvBytes: 8 * 1024 * 1024, rows: 5000, columns: 128, fieldCharacters: 65536, displayRows: 50, displayColumns: 12 };
const BASE = 'https://chris-page-gov.github.io/okf-explorer/profile/analytical-data/';
const STATES = new Set(['missing', 'notApplicable', 'notAvailable', 'suppressed', 'roundedToZero', 'lowReliability']);
export type Field = { name: string; label: string; role: string; dataType: string; unit?: string; valueStates?: { token: string; state: string }[]; allowedValues?: string[] };
export type Spatial = { crs: string; axes: string[]; unit: string; coordinateFields: string[]; extent: string[]; coverageNote: string; vertical?: { field: string; unit: string; datumStatus: string; datum?: string } };
export type Table = { path: string; sha256: string; source: { url: string; observedAt: string }; observationKey: string[]; fields: Field[]; spatial?: Spatial };
export type Manifest = { conformsTo: string[]; profileVersion: string; dataset: { id: string; title: string; version: string; scope: string; rights: { status: string; source: string; licence?: string } }; tables: Table[] };
export type Inspection = { rowCount: number; rows: string[][]; stateCounts: Record<string, number>; zeroes: number; missingCoordinatePairs: number; gaps: string[]; sha256: string };
type DecimalValue = { negative: boolean; digits: string; exponent: bigint };
const CRS: Record<string, { axes: string[]; unit: string; domains?: [string, string][] }> = {
  'http://www.opengis.net/def/crs/OGC/1.3/CRS84': { axes: ['longitude', 'latitude'], unit: 'degree', domains: [['-180', '180'], ['-90', '90']] },
  'http://www.opengis.net/def/crs/EPSG/0/4326': { axes: ['latitude', 'longitude'], unit: 'degree', domains: [['-90', '90'], ['-180', '180']] },
  'http://www.opengis.net/def/crs/EPSG/0/27700': { axes: ['easting', 'northing'], unit: 'metre' }
};
function fail(message: string): never { throw new Error(message); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected a metadata object.');
  return value as Record<string, unknown>;
}
function keys(value: unknown, allowed: string[], required = allowed): Record<string, unknown> {
  const row = object(value);
  if (Object.keys(row).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(row, key))) fail('Unknown or missing metadata fields. Use the full profile validator.');
  return row;
}
function text(value: unknown, maximum = 2048): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) fail('Expected bounded, non-empty metadata text.');
  return value;
}
function web(value: unknown): string {
  const raw = text(value);
  if (/[\s<>"`\\]/.test(raw) || /%(?![0-9a-f]{2})/i.test(raw)) fail('Unsafe source URL.');
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) fail('Expected a credential-free web URL.');
  return raw;
}
/** Reject duplicates before JSON.parse can silently discard the earlier value. */
function uniqueJson(raw: string): unknown {
  const result: unknown = JSON.parse(raw);
  let i = 0;
  const space = () => { while (/\s/.test(raw[i] ?? '') && i < raw.length) i++; };
  const string = (): string => {
    const start = i++;
    while (i < raw.length) { if (raw[i] === '\\') i += 2; else if (raw[i++] === '"') break; }
    return JSON.parse(raw.slice(start, i));
  };
  const value = (depth: number): void => {
    if (depth > 32) fail('Manifest nesting limit exceeded.');
    space();
    if (raw[i] === '{') {
      i++; space(); const seen = new Set<string>();
      if (raw[i] === '}') { i++; return; }
      while (i < raw.length) {
        space(); const key = string(); if (seen.has(key)) fail('Duplicate JSON property.'); seen.add(key);
        space(); i++; value(depth + 1); space(); if (raw[i++] === '}') return;
      }
    } else if (raw[i] === '[') {
      i++; space(); if (raw[i] === ']') { i++; return; }
      while (i < raw.length) { value(depth + 1); space(); if (raw[i++] === ']') return; }
    } else if (raw[i] === '"') string();
    else { const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(raw.slice(i)); if (!token) fail('Invalid JSON value.'); i += token[0].length; }
  };
  value(0);
  return result;
}
export function decimal(raw: string): DecimalValue {
  if (!/^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(raw) || raw.length > LIMITS.fieldCharacters) fail('Expected a decimal number.');
  const negative = raw.startsWith('-');
  const [coefficient, exponent = '0'] = raw.replace(/^[+-]/, '').toLowerCase().split('e');
  const fraction = coefficient.includes('.') ? coefficient.split('.')[1].length : 0;
  let digits = coefficient.replace('.', '').replace(/^0+/, '');
  if (!digits) return { negative: false, digits: '0', exponent: 0n };
  const trailing = digits.length - digits.replace(/0+$/, '').length;
  digits = digits.slice(0, digits.length - trailing);
  return { negative, digits, exponent: BigInt(exponent) - BigInt(fraction) + BigInt(trailing) };
}
export function decimalKey(raw: string): string { const d = decimal(raw); return `${d.negative ? '-' : ''}${d.digits}e${d.exponent}`; }
export function compareDecimal(left: string, right: string): number {
  const a = decimal(left), b = decimal(right);
  if (a.digits === '0' && b.digits === '0') return 0;
  if (a.negative !== b.negative) return a.negative ? -1 : 1;
  let result: number;
  if (a.digits === '0' || b.digits === '0') result = a.digits === '0' ? -1 : 1;
  else {
    const x = BigInt(a.digits.length) + a.exponent, y = BigInt(b.digits.length) + b.exponent;
    if (x !== y) result = x < y ? -1 : 1;
    else { const n = Math.max(a.digits.length, b.digits.length), aa = a.digits.padEnd(n, '0'), bb = b.digits.padEnd(n, '0'); result = aa === bb ? 0 : aa < bb ? -1 : 1; }
  }
  return a.negative ? -result : result;
}
export function datetimeInstant(raw: string): bigint {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?(Z|[+-][0-9]{2}:[0-9]{2})$/.exec(raw);
  if (!m) fail('Expected a candidate datetime with a known offset and at most 9 fractional digits.');
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number), zone = m[8];
  const date = new Date(0); date.setUTCFullYear(year, month - 1, day); date.setUTCHours(hour, minute, second, 0);
  if (year < 1 || hour > 23 || minute > 59 || second > 59 || zone === '-00:00' || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) fail('Invalid calendar/time or unknown offset; leap seconds are outside this candidate.');
  let offset = 0;
  if (zone !== 'Z') { const h = Number(zone.slice(1, 3)), min = Number(zone.slice(4)); if (h > 23 || min > 59) fail('Invalid UTC offset.'); offset = (h * 3600 + min * 60) * (zone[0] === '+' ? 1 : -1); }
  return (BigInt(date.getTime() / 1000) - BigInt(offset)) * 1000000000n + BigInt((m[7] ?? '').padEnd(9, '0'));
}
function typed(raw: string, kind: string): string {
  if (!raw) fail('Blank value requires a declared state.');
  if (kind === 'string') return `s:${raw}`;
  if (kind === 'datetime') return `t:${datetimeInstant(raw)}`;
  if (kind === 'integer' || kind === 'number') { if (kind === 'integer' && !/^[+-]?[0-9]+$/.test(raw)) fail('Expected an integer.'); return `n:${decimalKey(raw)}`; }
  if (kind === 'boolean' && ['true', 'false'].includes(raw)) return `b:${raw}`;
  if (kind === 'date' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw)) { datetimeInstant(`${raw}T00:00:00Z`); return `d:${raw}`; }
  return fail(`Expected ${kind}.`);
}
export function parseManifest(raw: string): Manifest {
  if (new TextEncoder().encode(raw).length > LIMITS.manifestBytes || raw.charCodeAt(0) === 0xfeff) fail('Manifest size/BOM limit exceeded.');
  const doc = keys(uniqueJson(raw), ['conformsTo', 'profileVersion', 'dataset', 'tables']);
  const v2 = doc.profileVersion === '2.0.0-rc.1';
  if (!v2 && doc.profileVersion !== '1.0.0-rc.1') fail('Unsupported profile version.');
  if (!Array.isArray(doc.conformsTo) || doc.conformsTo.length > 32 || !doc.conformsTo.includes(`${BASE}${v2 ? 'v2' : 'v1'}/`)) fail('Profile URI/version mismatch.');
  doc.conformsTo.forEach(web);
  const dataset = keys(doc.dataset, ['id', 'title', 'version', 'scope', 'rights']);
  web(dataset.id); text(dataset.title, 512); text(dataset.version, 512);
  if (!['synthetic', 'real-world'].includes(String(dataset.scope))) fail('Unknown dataset scope.');
  const rights = keys(dataset.rights, ['status', 'source', 'licence'], ['status', 'source']); web(rights.source);
  if (!['declared', 'unverified'].includes(String(rights.status)) || rights.status === 'declared' && !rights.licence) fail('Missing rights declaration.'); if (rights.licence) web(rights.licence);
  if (!Array.isArray(doc.tables) || !doc.tables.length || doc.tables.length > 32) fail('Table limit exceeded.');
  const paths = new Set<string>();
  for (const item of doc.tables) {
    const table = keys(item, ['path', 'sha256', 'source', 'observationKey', 'fields', ...(v2 ? ['spatial'] : [])], ['path', 'sha256', 'source', 'observationKey', 'fields']);
    const path = text(table.path, 512);
    if (!/^[A-Za-z0-9._/-]+\.csv$/.test(path) || path.startsWith('/') || path.split('/').some(part => ['', '.', '..'].includes(part)) || paths.has(path.toLowerCase())) fail('Unsupported, duplicate or unsafe table path.'); paths.add(path.toLowerCase());
    if (!/^[0-9a-f]{64}$/.test(String(table.sha256))) fail('Expected a table SHA-256.');
    const source = keys(table.source, ['url', 'observedAt', 'contract'], ['url', 'observedAt']); web(source.url); if (source.contract) web(source.contract);
    if (v2) datetimeInstant(text(source.observedAt)); else { const stamp = text(source.observedAt); if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(stamp)) fail('Invalid source timestamp.'); datetimeInstant(stamp.replace(/-00:00$/, '+00:00').replace(/(\.[0-9]{9})[0-9]+/, '$1')); }
    if (!Array.isArray(table.fields) || !table.fields.length || table.fields.length > LIMITS.columns) fail('Column limit exceeded.');
    const names = new Set<string>(), dimensions = new Set<string>();
    for (const item of table.fields) {
      const f = keys(item, ['name','label','role','dataType','unit','concept','vocabulary','identifier','allowedValues','valueStates','display'], ['name','label','role','dataType']);
      const name = text(f.name, 128), kind = text(f.dataType);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || names.has(name)) fail('Invalid or duplicate field name.'); names.add(name); text(f.label, 512);
      if (!['dimension', 'measure', 'attribute'].includes(String(f.role)) || !['string','integer','number','boolean','date',...(v2 ? ['datetime'] : [])].includes(kind)) fail('Unsupported field type or role.');
      if (f.role === 'dimension') dimensions.add(name); if (f.unit !== undefined) text(f.unit, 512);
      for (const key of ['concept','vocabulary','identifier']) if (f[key] !== undefined) { if (key !== 'identifier') web(f[key]); }
      const states = new Set<string>();
      if (f.valueStates !== undefined) {
        if (!Array.isArray(f.valueStates) || f.valueStates.length > 32) fail('State declaration limit exceeded.');
        for (const item of f.valueStates) { const state = keys(item, ['token','state']); if (typeof state.token !== 'string' || !STATES.has(String(state.state)) || states.has(state.token)) fail('Invalid or duplicate state token.'); states.add(state.token); if (kind !== 'string') { let valid = false; try { typed(state.token, kind); valid = true; } catch { /* A state must not be a valid typed value. */ } if (valid) fail('State token shadows a typed value.'); } }
      }
      if (f.allowedValues !== undefined) { if (!Array.isArray(f.allowedValues) || f.allowedValues.length > 1024 || new Set(f.allowedValues).size !== f.allowedValues.length) fail('Invalid controlled vocabulary.'); for (const value of f.allowedValues) { if (typeof value !== 'string' || states.has(value)) fail('Controlled value overlaps a state.'); typed(value, kind); } }
    }
    if (!Array.isArray(table.observationKey) || !table.observationKey.length || new Set(table.observationKey).size !== table.observationKey.length || table.observationKey.some(n => !dimensions.has(String(n)))) fail('Observation key must name distinct dimensions.');
    if (table.spatial) spatialRules(table as unknown as Table);
  }
  return doc as unknown as Manifest;
}
function spatialRules(table: Table): void {
  const spatial = keys(table.spatial, ['crs','axes','unit','coordinateFields','extent','coverageNote','vertical'], ['crs','axes','unit','coordinateFields','extent','coverageNote']);
  const s = spatial as unknown as Spatial, def = CRS[s.crs];
  if (!def || JSON.stringify(s.axes) !== JSON.stringify(def.axes) || s.unit !== def.unit) fail('Spatial CRS, axes or unit mismatch.');
  if (!Array.isArray(s.coordinateFields) || s.coordinateFields.length !== 2 || new Set(s.coordinateFields).size !== 2 || !Array.isArray(s.extent) || s.extent.length !== 4 || s.extent.some(v => typeof v !== 'string' || v.length > 1024)) fail('Invalid coordinate fields or exact-decimal extent.');
  s.extent.forEach(decimal); text(s.coverageNote, 1024);
  if (compareDecimal(s.extent[0], s.extent[2]) > 0 || compareDecimal(s.extent[1], s.extent[3]) > 0) fail('Extent must be ordered; wrapping extents are unsupported.');
  def.domains?.forEach(([lo, hi], i) => { if (compareDecimal(s.extent[i], lo) < 0 || compareDecimal(s.extent[i + 2], hi) > 0) fail('Angular extent is outside the declared CRS axes.'); });
  const fields = new Map(table.fields.map(f => [f.name, f]));
  const required: [string, string][] = s.coordinateFields.map(n => [n, s.unit]);
  if (s.vertical) {
    keys(s.vertical, ['field','unit','datumStatus','datum'], ['field','unit','datumStatus']);
    if (s.vertical.unit !== 'metre' || !['declared','not-recorded'].includes(s.vertical.datumStatus) || s.coordinateFields.includes(s.vertical.field) || (s.vertical.datumStatus === 'declared') !== Boolean(s.vertical.datum)) fail('Invalid vertical declaration.');
    if (s.vertical.datum) web(s.vertical.datum); required.push([s.vertical.field, 'metre']);
  }
  for (const [name, unit] of required) { const field = fields.get(name); if (!field || !['integer','number'].includes(field.dataType) || field.unit !== unit) fail('Spatial field is undeclared, non-numeric or has incompatible units.'); }
}
export function* csvRows(raw: string): Generator<string[]> {
  let field = '', row: string[] = [], quoted = false, closed = false, started = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quoted) { if (c === '"') { if (raw[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } } else field += c; }
    else if (c === ',' || c === '\n' || c === '\r') {
      if (c === ',') { row.push(field); field = ''; started = false; closed = false; }
      else { if (started || row.length || field.length || closed) row.push(field); yield row; row = []; field = ''; started = false; closed = false; if (c === '\r' && raw[i + 1] === '\n') i++; }
    } else if (closed) fail('Unexpected text after a quoted CSV field.');
    else if (c === '"' && !started && !field) { quoted = true; started = true; }
    else { field += c; started = true; }
    if (field.length > LIMITS.fieldCharacters || row.length > LIMITS.columns) fail('CSV field/column limit exceeded.');
  }
  if (quoted) fail('Unterminated quoted CSV field.');
  if (started || row.length || field.length || closed) { row.push(field); yield row; }
}
export async function inspectCsv(table: Table, bytes: Uint8Array): Promise<Inspection> {
  if (bytes.byteLength > LIMITS.csvBytes) fail('CSV exceeds the 8 MiB preview limit.');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice().buffer)), n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== table.sha256) fail('CSV checksum differs from the selected table declaration.');
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes), reader = csvRows(raw);
  if (JSON.stringify(reader.next().value) !== JSON.stringify(table.fields.map(f => f.name))) fail('CSV headers differ from the ordered field declarations.');
  const states = table.fields.map(f => new Map(f.valueStates?.map(s => [s.token, s.state]) ?? []));
  const keys = table.observationKey.map(n => table.fields.findIndex(f => f.name === n)), seen = new Set<string>();
  const result: Inspection = { rowCount: 0, rows: [], stateCounts: {}, zeroes: 0, missingCoordinatePairs: 0, gaps: [], sha256: hash };
  if (table.spatial) { spatialRules(table); if (table.spatial.vertical?.datumStatus === 'not-recorded') result.gaps.push('Vertical datum is not recorded.'); }
  for (const row of reader) {
    if (++result.rowCount > LIMITS.rows) fail('CSV exceeds the 5,000-row preview limit. Use the local validator.');
    if (row.length !== table.fields.length) fail(`Observation ${result.rowCount} has the wrong column count.`);
    const values = row.map((value, i) => { const state = states[i].get(value), field = table.fields[i]; if (state) { if (keys.includes(i)) fail('Observation key has a special value.'); result.stateCounts[state] = (result.stateCounts[state] ?? 0) + 1; return null; } const parsed = typed(value, field.dataType); if (field.allowedValues?.length && !field.allowedValues.includes(value)) fail('Value is outside the declared vocabulary.'); if (field.role === 'measure' && ['number','integer'].includes(field.dataType) && decimal(value).digits === '0') result.zeroes++; return parsed; });
    const key = JSON.stringify(keys.map(i => values[i])); if (seen.has(key)) fail(`Duplicate observation key at observation ${result.rowCount}.`); seen.add(key);
    const s = table.spatial;
    if (s) { const positions = s.coordinateFields.map(n => table.fields.findIndex(f => f.name === n)), present = positions.map(i => values[i] !== null); if (present[0] !== present[1]) fail('Partial coordinate pair.'); if (!present[0]) result.missingCoordinatePairs++; else positions.forEach((position, i) => { if (compareDecimal(row[position], s.extent[i]) < 0 || compareDecimal(row[position], s.extent[i + 2]) > 0) fail(`Observation ${result.rowCount} is outside its declared spatial extent.`); }); }
    if (result.rows.length < LIMITS.displayRows) result.rows.push(row.slice(0, LIMITS.displayColumns));
  }
  return result;
}
