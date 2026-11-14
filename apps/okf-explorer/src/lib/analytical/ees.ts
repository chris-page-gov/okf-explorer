/** Bounded DfE EES CSV/metadata reader. Original names, values and symbols survive. */
export const EES_LIMITS = { bytes: 8 * 1024 * 1024, rows: 100_000, columns: 256, cells: 500_000 };
const META_HEADERS = ['col_name', 'col_type', 'label', 'indicator_grouping', 'indicator_unit', 'indicator_dp', 'filter_hint', 'filter_grouping_column'];
export const EES_SYMBOLS: Record<string, string> = {
  c: 'Suppressed', x: 'Unavailable', z: 'Not applicable', low: 'Rounded to zero', k: 'Rounded to zero', u: 'Low reliability'
};
export type EesField = { name: string; label: string; role: 'Filter' | 'Indicator' | 'Observation' | 'Unspecified'; unit: string; decimals: number; hint: string; indicatorGroup: string; filterGroupingColumn: string };
export type EesPair = { headers: string[]; rows: string[][]; fields: EesField[]; metadata: Record<string, string>[]; warnings: string[]; geographyHeader: string };

export function parseCsv(text: string): string[][] {
  if (new TextEncoder().encode(text).byteLength > EES_LIMITS.bytes) throw new Error('The CSV exceeds the 8 MiB inspection limit.');
  const input = text.replace(/^\uFEFF/, '');
  const rows: string[][] = []; let row: string[] = []; let value = ''; let quoted = false; let closed = false; let cells = 0;
  const field = () => {
    row.push(value); value = ''; closed = false;
    if (row.length > EES_LIMITS.columns || ++cells > EES_LIMITS.cells) throw new Error('The CSV exceeds the column or cell inspection limit.');
  };
  const line = () => {
    field(); rows.push(row); row = [];
    if (rows.length > EES_LIMITS.rows + 1) throw new Error('The CSV exceeds the 100,000-row inspection limit.');
  };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else value += ch;
    } else if (ch === ',') field();
    else if (ch === '\r' || ch === '\n') { if (ch === '\r' && input[i + 1] === '\n') i++; line(); }
    else if (closed) throw new Error('Unexpected text after a closing CSV quote.');
    else if (ch === '"') { if (value) throw new Error('Unexpected quote in an unquoted CSV field.'); quoted = true; }
    else value += ch;
  }
  if (quoted) throw new Error('The CSV has an unterminated quoted field.');
  if (value || row.length || closed) line();
  if (!rows.length || rows[0].some(h => !h || h.trim() !== h) || new Set(rows[0]).size !== rows[0].length) throw new Error('CSV headings must be non-empty, exact and unique.');
  if (rows.some(r => r.length !== rows[0].length)) throw new Error('A CSV row has a different number of fields from its headings.');
  return rows;
}

export function readEesPair(data: string, sidecar: string): EesPair {
  const [headers, ...rows] = parseCsv(data); const [metaHeaders, ...definitions] = parseCsv(sidecar);
  if (!rows.length) throw new Error('The data CSV has no observations.');
  if (!META_HEADERS.every(h => metaHeaders.includes(h)) || !definitions.length) throw new Error('The sidecar needs all eight EES metadata headings and at least one definition.');
  const geography = headers.filter(h => ['geographic_level', 'geographical_level'].includes(h));
  if (geography.length !== 1) throw new Error('Provide exactly one geography column: geographic_level or geographical_level.');
  for (const name of ['time_period', 'time_identifier', 'country_code', 'country_name']) {
    if (!headers.includes(name)) throw new Error(`The data CSV is missing ${name}.`);
  }
  const metadata = definitions.map(values => Object.fromEntries(metaHeaders.map((name, i) => [name, values[i]])));
  const byName = new Map<string, Record<string, string>>(); const warnings: string[] = [];
  for (const definition of metadata) {
    const name = definition.col_name;
    if (!headers.includes(name)) throw new Error(`Sidecar column ${name || '(blank)'} has no exact data heading.`);
    if (byName.has(name)) throw new Error(`Duplicate sidecar definition for ${name}.`);
    if (!['Filter', 'Indicator'].includes(definition.col_type) || !definition.label.trim()) throw new Error(`Sidecar column ${name} needs a Filter/Indicator type and a label.`);
    if (definition.filter_grouping_column && !headers.includes(definition.filter_grouping_column)) throw new Error(`Filter grouping column ${definition.filter_grouping_column} is absent.`);
    if (definition.indicator_dp && (!/^\d+$/.test(definition.indicator_dp) || Number(definition.indicator_dp) > 15)) throw new Error(`Invalid display precision for ${name}; use 0 to 15 decimal places.`);
    if (!['', '£', '£m', '%', 'pp', 'numberstring'].includes(definition.indicator_unit)) warnings.push(`${name} declares an unrecognised unit (${definition.indicator_unit}); values are shown without numeric formatting.`);
    byName.set(name, definition);
  }
  const observation = new Set(['time_period', 'time_identifier', geography[0],
    ...['country', 'region', 'local_authority', 'old_la', 'new_la', 'la', 'school', 'provider', 'institution', 'parliamentary_constituency', 'ward', 'local_authority_district'].flatMap(p => [p + '_code', p + '_name'])]);
  const fields: EesField[] = headers.map(name => {
    const d = byName.get(name);
    if (!d && !observation.has(name)) warnings.push(`${name} has no sidecar definition; its role and meaning remain unspecified. Single-level filters may legitimately omit a definition.`);
    return { name, label: d?.label ?? name, role: d ? d.col_type as 'Filter' | 'Indicator' : observation.has(name) ? 'Observation' : 'Unspecified',
      unit: d?.indicator_unit ?? '', decimals: d?.indicator_dp ? Number(d.indicator_dp) : 2,
      hint: d?.filter_hint ?? '', indicatorGroup: d?.indicator_grouping ?? '', filterGroupingColumn: d?.filter_grouping_column ?? '' };
  });
  warnings.push(`The source uses ${geography[0]}. Both published spellings are recognised and the original is preserved.`);
  warnings.push('Local pair inspection does not establish DfE upload acceptance, statistical accuracy, geography-code validity or permission to use the data.');
  warnings.push('Exact metadata joins and matching filenames do not prove that these files belong to the same publisher release. Check their source and edition.');
  return { headers, rows, fields, metadata, warnings, geographyHeader: geography[0] };
}

export function displayValue(raw: string, field: EesField, formatted = true): string {
  if (field.role !== 'Indicator' || !formatted || field.unit === 'numberstring') return raw;
  if (!['', '£', '£m', '%', 'pp'].includes(field.unit)) return raw;
  if (Object.hasOwn(EES_SYMBOLS, raw)) return `${raw} — ${EES_SYMBOLS[raw]}`;
  // Preserve strings, blanks and numbers beyond safe display precision exactly.
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw) || raw.replace(/\D/g, '').length > 15) return raw;
  const number = Number(raw); if (!Number.isFinite(number)) return raw;
  const value = new Intl.NumberFormat('en-GB', { minimumFractionDigits: field.decimals, maximumFractionDigits: field.decimals }).format(number);
  if (field.unit === '£') return '£' + value;
  if (field.unit === '£m') return '£' + value + 'm';
  if (field.unit === '%') return value + '%';
  if (field.unit === 'pp') return value + ' pp';
  return value;
}

export function filterEesRows(pair: EesPair, fieldName: string, value: string): string[][] {
  if (!fieldName) return pair.rows;
  const index = pair.headers.indexOf(fieldName);
  if (index < 0) throw new Error('The selected filter column is absent.');
  return pair.rows.filter(row => row[index] === value);
}
