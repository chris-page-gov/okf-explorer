/** Closed interpreter for the keywords in our pinned local package profile.
 * Unknown validation keywords fail closed; no remote references or code generation.
 */
import { requireValue, canonical } from './shared.mjs';
const allowed = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'const', 'enum',
  'properties', 'required', 'additionalProperties', 'items', 'oneOf', 'allOf', 'if', 'then', 'uniqueItems', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern']);
function definition(ref, common) {
  const name = ref === 'https://chris-page-gov.github.io/okf-explorer/profiles/context-assembly/v1/evidence-unit.schema.json'
    ? 'evidence_unit' : /^(?:common\.schema\.json)?#\/\$defs\/[A-Za-z0-9_-]+$/.test(ref) ? ref.split('/').at(-1) : null;
  requireValue(name !== null, 'non-local schema reference');
  requireValue(common.$defs && Object.hasOwn(common.$defs, name), 'missing local definition');
  return common.$defs[name];
}
function admitSchema(schema, common, visited = new Set(), depth = 0) {
  requireValue(schema && typeof schema === 'object' && !Array.isArray(schema) && depth <= 80, 'unsupported schema shape or depth');
  if (visited.has(schema)) return; visited.add(schema);
  for (const key of Object.keys(schema)) requireValue(allowed.has(key), `unsupported local schema keyword ${key}`);
  for (const branch of Object.values(schema.properties || {})) admitSchema(branch, common, visited, depth + 1);
  for (const branch of Object.values(schema.$defs || {})) admitSchema(branch, common, visited, depth + 1);
  for (const branch of schema.oneOf || []) admitSchema(branch, common, visited, depth + 1);
  for (const branch of schema.allOf || []) admitSchema(branch, common, visited, depth + 1);
  for (const key of ['if', 'then']) if (schema[key]) admitSchema(schema[key], common, visited, depth + 1);
  if (schema.items) admitSchema(schema.items, common, visited, depth + 1);
  if (schema.$ref) {
    admitSchema(definition(schema.$ref, common), common, visited, depth + 1);
  }
}
export function validateLocalSchema(value, schema, common, path = '$', depth = 0) {
  if (depth === 0) admitSchema(schema, common);
  requireValue(depth <= 80, 'schema nesting exceeds bound');
  for (const key of Object.keys(schema)) requireValue(allowed.has(key), `unsupported local schema keyword ${key}`);
  if (schema.$ref) {
    const target = definition(schema.$ref, common);
    validateLocalSchema(value, target, common, path, depth + 1);
  }
  if (schema.oneOf) {
    let matches = 0; for (const item of schema.oneOf) { try { validateLocalSchema(value, item, common, path, depth + 1); matches++; } catch {} }
    requireValue(matches === 1, `${path}: oneOf mismatch`);
  }
  for (const item of schema.allOf || []) validateLocalSchema(value, item, common, path, depth + 1);
  if (schema.if) {
    let matches = true;
    try { validateLocalSchema(value, schema.if, common, path, depth + 1); } catch { matches = false; }
    if (matches && schema.then) validateLocalSchema(value, schema.then, common, path, depth + 1);
  }
  if ('const' in schema) requireValue(canonical(value) === canonical(schema.const), `${path}: const mismatch`);
  if (schema.enum) requireValue(schema.enum.some(x => canonical(x) === canonical(value)), `${path}: enum mismatch`);
  if (schema.type) requireValue(schema.type === 'null' ? value === null : schema.type === 'array' ? Array.isArray(value)
    : schema.type === 'object' ? value && typeof value === 'object' && !Array.isArray(value)
    : schema.type === 'integer' ? Number.isSafeInteger(value) : typeof value === schema.type, `${path}: type mismatch`);
  if (typeof value === 'string') {
    requireValue(schema.minLength === undefined || [...value].length >= schema.minLength, `${path}: short string`);
    requireValue(schema.maxLength === undefined || [...value].length <= schema.maxLength, `${path}: long string`);
    requireValue(!schema.pattern || new RegExp(schema.pattern).test(value), `${path}: pattern mismatch`);
  }
  if (typeof value === 'number') requireValue(Number.isFinite(value) && (schema.minimum === undefined || value >= schema.minimum) && (schema.maximum === undefined || value <= schema.maximum), `${path}: numeric bounds`);
  if (Array.isArray(value)) {
    if (schema.uniqueItems) requireValue(new Set(value.map(canonical)).size === value.length, `${path}: duplicate array item`);
    requireValue((schema.minItems === undefined || value.length >= schema.minItems) && (schema.maxItems === undefined || value.length <= schema.maxItems), `${path}: array bounds`);
    if (schema.items) value.forEach((x, i) => validateLocalSchema(x, schema.items, common, `${path}[${i}]`, depth + 1));
  } else if (value && typeof value === 'object') {
    for (const key of schema.required || []) requireValue(Object.hasOwn(value, key), `${path}: missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties && Object.hasOwn(schema.properties, key)) validateLocalSchema(item, schema.properties[key], common, `${path}.${key}`, depth + 1);
      else requireValue(schema.additionalProperties !== false, `${path}: unexpected ${key}`);
    }
  }
}
