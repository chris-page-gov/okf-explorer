/** Closed interpreter for the keywords in our pinned local package profile.
 * Unknown validation keywords fail closed; no remote references or code generation.
 */
import { requireValue, canonical } from './shared.mjs';
const allowed = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'const', 'enum',
  'properties', 'required', 'additionalProperties', 'items', 'oneOf', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'pattern']);
function admitSchema(schema, common, visited = new Set(), depth = 0) {
  requireValue(schema && typeof schema === 'object' && !Array.isArray(schema) && depth <= 80, 'unsupported schema shape or depth');
  if (visited.has(schema)) return; visited.add(schema);
  for (const key of Object.keys(schema)) requireValue(allowed.has(key), `unsupported local schema keyword ${key}`);
  for (const branch of Object.values(schema.properties || {})) admitSchema(branch, common, visited, depth + 1);
  for (const branch of Object.values(schema.$defs || {})) admitSchema(branch, common, visited, depth + 1);
  for (const branch of schema.oneOf || []) admitSchema(branch, common, visited, depth + 1);
  if (schema.items) admitSchema(schema.items, common, visited, depth + 1);
  if (schema.$ref) {
    requireValue(/^(?:common\.schema\.json)?#\/\$defs\/[A-Za-z0-9_-]+$/.test(schema.$ref), 'non-local schema reference');
    const name = schema.$ref.split('/').at(-1);
    requireValue(common.$defs && Object.hasOwn(common.$defs, name), 'missing local definition');
    admitSchema(common.$defs[name], common, visited, depth + 1);
  }
}
export function validateLocalSchema(value, schema, common, path = '$', depth = 0) {
  if (depth === 0) admitSchema(schema, common);
  requireValue(depth <= 80, 'schema nesting exceeds bound');
  for (const key of Object.keys(schema)) requireValue(allowed.has(key), `unsupported local schema keyword ${key}`);
  if (schema.$ref) {
    requireValue(/^(?:common\.schema\.json)?#\/\$defs\/[A-Za-z0-9_-]+$/.test(schema.$ref), 'non-local schema reference');
    const name = schema.$ref.split('/').at(-1);
    requireValue(common.$defs && Object.hasOwn(common.$defs, name), 'missing local definition');
    const target = common.$defs[name];
    validateLocalSchema(value, target, common, path, depth + 1);
  }
  if (schema.oneOf) {
    let matches = 0; for (const item of schema.oneOf) { try { validateLocalSchema(value, item, common, path, depth + 1); matches++; } catch {} }
    requireValue(matches === 1, `${path}: oneOf mismatch`);
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
