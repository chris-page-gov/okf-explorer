import path from 'node:path';

export const JOURNEY_SCHEMA = 'okf-explorer-journeys.v1';
export const ACTION_TYPES = new Set(['goto', 'click', 'fill', 'press', 'wait_for']);
export const ASSERTION_TYPES = new Set([
  'attribute',
  'console_clean',
  'count',
  'hidden',
  'not_requested',
  'not_text',
  'requested',
  'text',
  'url_hash',
  'url_param',
  'visible'
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function safeRelativePath(value, label = 'path') {
  invariant(typeof value === 'string' && value.length > 0, `${label} must be a non-empty string`);
  invariant(!value.includes('\\'), `${label} must use POSIX separators`);
  const normalized = path.posix.normalize(value);
  invariant(
    normalized === value &&
      !path.posix.isAbsolute(normalized) &&
      normalized.split('/').every((part) => part && part !== '.' && part !== '..'),
    `unsafe ${label}: ${value}`
  );
  return normalized;
}

function selectorStep(step, label) {
  invariant(typeof step.selector === 'string' && step.selector.length > 0, `${label}.selector is required`);
}

function validateAction(action, label) {
  invariant(action && typeof action === 'object' && !Array.isArray(action), `${label} must be an object`);
  invariant(ACTION_TYPES.has(action.type), `${label}.type is unsupported: ${action.type}`);
  if (action.type === 'goto') {
    if (action.descriptor !== undefined) safeRelativePath(action.descriptor, `${label}.descriptor`);
    if (action.hash !== undefined) invariant(typeof action.hash === 'string', `${label}.hash must be a string`);
    if (action.params !== undefined) {
      invariant(action.params && typeof action.params === 'object' && !Array.isArray(action.params), `${label}.params must be an object`);
      for (const value of Object.values(action.params)) {
        invariant(
          typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string')),
          `${label}.params values must be strings or string arrays`
        );
      }
    }
  } else {
    selectorStep(action, label);
  }
  if (action.type === 'fill') invariant(typeof action.value === 'string', `${label}.value is required`);
  if (action.type === 'press') invariant(typeof action.key === 'string' && action.key, `${label}.key is required`);
}

function validateAssertion(assertion, label) {
  invariant(assertion && typeof assertion === 'object' && !Array.isArray(assertion), `${label} must be an object`);
  invariant(ASSERTION_TYPES.has(assertion.type), `${label}.type is unsupported: ${assertion.type}`);
  if (!['console_clean', 'not_requested', 'requested', 'url_hash', 'url_param'].includes(assertion.type)) {
    selectorStep(assertion, label);
  }
  if (['not_text', 'text'].includes(assertion.type)) invariant(typeof assertion.includes === 'string', `${label}.includes is required`);
  if (assertion.type === 'count') invariant(Number.isSafeInteger(assertion.equals) && assertion.equals >= 0, `${label}.equals must be a non-negative integer`);
  if (assertion.type === 'attribute') {
    invariant(typeof assertion.name === 'string' && assertion.name, `${label}.name is required`);
    invariant(typeof assertion.equals === 'string', `${label}.equals is required`);
  }
  if (['not_requested', 'requested'].includes(assertion.type)) invariant(typeof assertion.includes === 'string' && assertion.includes, `${label}.includes is required`);
  if (assertion.type === 'url_hash') invariant(typeof assertion.equals === 'string', `${label}.equals is required`);
  if (assertion.type === 'url_param') {
    invariant(typeof assertion.name === 'string' && assertion.name, `${label}.name is required`);
    invariant(typeof assertion.equals === 'string', `${label}.equals is required`);
  }
}

export function validateJourneyManifest(value) {
  invariant(value && typeof value === 'object' && !Array.isArray(value), 'journey manifest must be an object');
  invariant(value.schema === JOURNEY_SCHEMA, `journey manifest schema must be ${JOURNEY_SCHEMA}`);
  safeRelativePath(value.bundle_descriptor, 'bundle_descriptor');
  invariant(
    value.expected_identity && typeof value.expected_identity === 'object' && !Array.isArray(value.expected_identity),
    'expected_identity must be an object'
  );
  for (const field of ['schema', 'id', 'version', 'snapshot']) {
    invariant(
      typeof value.expected_identity[field] === 'string' && value.expected_identity[field].length > 0,
      `expected_identity.${field} is required`
    );
  }
  invariant(Array.isArray(value.journeys) && value.journeys.length > 0, 'journeys must be a non-empty array');
  const ids = new Set();
  for (const [index, journey] of value.journeys.entries()) {
    const label = `journeys[${index}]`;
    invariant(journey && typeof journey === 'object' && !Array.isArray(journey), `${label} must be an object`);
    invariant(typeof journey.id === 'string' && journey.id.length > 0, `${label}.id is required`);
    invariant(!ids.has(journey.id), `duplicate journey id: ${journey.id}`);
    ids.add(journey.id);
    invariant(Array.isArray(journey.actions) && journey.actions.length > 0, `${label}.actions must be non-empty`);
    invariant(Array.isArray(journey.assertions) && journey.assertions.length > 0, `${label}.assertions must be non-empty`);
    journey.actions.forEach((action, actionIndex) => validateAction(action, `${label}.actions[${actionIndex}]`));
    journey.assertions.forEach((assertion, assertionIndex) => validateAssertion(assertion, `${label}.assertions[${assertionIndex}]`));
  }
  return value;
}

export function descriptorIdentity(descriptor) {
  const firstString = (...values) => values.find((value) => typeof value === 'string' && value.length > 0) ?? null;
  return {
    schema: firstString(descriptor?.schema, descriptor?.format, descriptor?.type),
    id: firstString(descriptor?.bundle_id, descriptor?.id, descriptor?.['@id']),
    version: firstString(descriptor?.version, descriptor?.bundle_version),
    snapshot: firstString(descriptor?.snapshot, descriptor?.snapshot_id, descriptor?.data?.snapshot)
  };
}

export function identityErrors(actual, expected) {
  return ['schema', 'id', 'version', 'snapshot']
    .filter((field) => actual[field] !== expected[field])
    .map((field) => `descriptor identity ${field} was ${JSON.stringify(actual[field])}, expected ${JSON.stringify(expected[field])}`);
}
