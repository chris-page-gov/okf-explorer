import { createHash } from 'node:crypto';
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

export const JOURNEY_SCHEMA = 'okf-explorer-journeys.v1';
export const ACCEPTANCE_LIMITS = Object.freeze({
  manifest_bytes: 1024 * 1024,
  journeys: 32,
  actions_per_journey: 128,
  assertions_per_journey: 128,
  total_actions: 1024,
  total_assertions: 1024,
  observations_per_journey: 32,
  total_observations: 256,
  selector_chars: 2048,
  general_string_chars: 8192,
  path_chars: 1024,
  captured_value_chars: 4096,
  captured_values_total_chars: 131_072,
  request_events: 50_000,
  console_events: 1_000,
  page_errors: 100,
  receipt_bytes: 25 * 1024 * 1024,
  telemetry_bytes: 8 * 1024 * 1024,
  input_entries: 100_000,
  input_files: 100_000,
  input_depth: 64,
  input_total_bytes: 2 * 1024 * 1024 * 1024,
  served_asset_bytes: 256 * 1024 * 1024,
  journey_timeout_ms: 90_000,
  run_timeout_ms: 20 * 60 * 1000
});
export const ACTION_TYPES = new Set([
  'capture_attributes',
  'goto',
  'click',
  'fill',
  'press',
  'wait_for_ranked_result',
  'wait_for'
]);
export const ASSERTION_TYPES = new Set([
  'attribute',
  'console_clean',
  'count',
  'hidden',
  'not_requested',
  'not_text',
  'ranked_result',
  'requested',
  'text',
  'url_hash',
  'url_param',
  'visible'
]);
const CREDENTIAL_QUERY_KEY = /^(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|passwd|bearer|token)$/i;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function boundedString(value, label, maximum = ACCEPTANCE_LIMITS.general_string_chars, { empty = false } = {}) {
  invariant(typeof value === 'string', `${label} must be a string`);
  invariant(empty || value.length > 0, `${label} must be a non-empty string`);
  invariant(value.length <= maximum, `${label} must be at most ${maximum} characters`);
  invariant(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value), `${label} contains a control character`);
  return value;
}

export function safeRelativePath(value, label = 'path') {
  boundedString(value, label, ACCEPTANCE_LIMITS.path_chars);
  invariant(!/[\u0000-\u001f\u007f]/u.test(value), `${label} contains a path control character`);
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

export function receiptFailureReference(error) {
  const rawName = String(error?.name || 'Error');
  const name = /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(rawName) ? rawName : 'Error';
  const detail = Buffer.from(String(error?.message ?? error ?? 'Unknown failure'), 'utf8');
  return {
    name,
    detail_bytes: detail.length,
    detail_sha256: sha256(detail)
  };
}

export function receiptPageState(value) {
  const raw = boundedString(value, 'browser page URL', ACCEPTANCE_LIMITS.general_string_chars);
  const url = new URL(raw);
  invariant(!url.username && !url.password, 'browser page URL contains credentials');
  invariant(
    ['http:', 'https:'].includes(url.protocol) || url.href === 'about:blank',
    'browser page URL must be HTTP(S) or about:blank'
  );
  const observation = {
    url: url.href === 'about:blank' ? 'about:blank' : `${url.origin}${url.pathname}`,
    query_parameters_present: [...url.searchParams.keys()].length,
    fragment_present: Boolean(url.hash)
  };
  invariant(
    !observation.url.includes('?') && !observation.url.includes('#'),
    'retained browser page URL must omit query and fragment state'
  );
  return observation;
}

function pathWithin(candidate, root) {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedRoot = path.resolve(root);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
}

function directoryIdentity(info) {
  return {
    dev: info.dev,
    ino: info.ino,
    mode: info.mode
  };
}

export async function inspectSafeOutputDestination(outputPath, inputRoots) {
  invariant(typeof outputPath === 'string' && path.isAbsolute(outputPath), 'output path must be absolute');
  invariant(Array.isArray(inputRoots) && inputRoots.length > 0, 'output containment requires input roots');
  const resolvedOutput = path.resolve(outputPath);
  const parent = path.dirname(resolvedOutput);
  const physicalParent = await realpath(parent);
  invariant(physicalParent === parent, `output parent must not contain a symbolic-link component: ${parent}`);
  const parentInfo = await lstat(parent);
  invariant(parentInfo.isDirectory() && !parentInfo.isSymbolicLink(), `output parent must be a real directory: ${parent}`);
  for (const root of inputRoots) {
    const physicalRoot = await realpath(path.resolve(root));
    invariant(
      !pathWithin(path.join(physicalParent, path.basename(resolvedOutput)), physicalRoot),
      `output must not resolve inside runtime input root: ${root}`
    );
  }
  try {
    await lstat(resolvedOutput);
    throw new Error(`output already exists: ${resolvedOutput}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return {
    outputPath: resolvedOutput,
    parent,
    physicalParent,
    parentIdentity: directoryIdentity(parentInfo)
  };
}

export async function verifySafeOutputParent(state) {
  const physicalParent = await realpath(state.parent);
  const parentInfo = await lstat(state.parent);
  invariant(
    physicalParent === state.physicalParent &&
      parentInfo.isDirectory() &&
      !parentInfo.isSymbolicLink() &&
      JSON.stringify(directoryIdentity(parentInfo)) === JSON.stringify(state.parentIdentity),
    `output parent changed after containment verification: ${state.parent}`
  );
  return state;
}

function selectorStep(step, label) {
  boundedString(step.selector, `${label}.selector`, ACCEPTANCE_LIMITS.selector_chars);
}

function validateAction(action, label) {
  invariant(action && typeof action === 'object' && !Array.isArray(action), `${label} must be an object`);
  invariant(ACTION_TYPES.has(action.type), `${label}.type is unsupported: ${action.type}`);
  if (action.type === 'goto') {
    if (action.descriptor !== undefined) safeRelativePath(action.descriptor, `${label}.descriptor`);
    if (action.hash !== undefined) boundedString(action.hash, `${label}.hash`, 4096, { empty: true });
    if (action.params !== undefined) {
      invariant(action.params && typeof action.params === 'object' && !Array.isArray(action.params), `${label}.params must be an object`);
      const entries = Object.entries(action.params);
      invariant(entries.length <= 64, `${label}.params must contain at most 64 names`);
      let parameterCharacters = 0;
      for (const [name, value] of entries) {
        boundedString(name, `${label}.params name`, 128);
        invariant(
          typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string')),
          `${label}.params values must be strings or string arrays`
        );
        const values = Array.isArray(value) ? value : [value];
        invariant(values.length <= 64, `${label}.params.${name} must contain at most 64 values`);
        for (const [index, item] of values.entries()) {
          boundedString(item, `${label}.params.${name}[${index}]`, ACCEPTANCE_LIMITS.general_string_chars, { empty: true });
          parameterCharacters += item.length;
        }
      }
      invariant(
        parameterCharacters <= ACCEPTANCE_LIMITS.captured_values_total_chars,
        `${label}.params contains too much text`
      );
    }
  } else if (action.type !== 'wait_for_ranked_result') {
    selectorStep(action, label);
  }
  if (action.type === 'wait_for_ranked_result') {
    invariant(
      Object.keys(action).sort().join('\u0000') === ['canonical_url', 'type'].join('\u0000'),
      `${label} wait_for_ranked_result fields are unsupported or have drifted`
    );
    boundedString(action.canonical_url, `${label}.canonical_url`, ACCEPTANCE_LIMITS.captured_value_chars);
    invariant(
      isCredentialFreeAbsoluteHttpUrl(action.canonical_url),
      `${label}.canonical_url must be a credential-free absolute HTTP(S) URL`
    );
  }
  if (action.type === 'capture_attributes') {
    invariant(
      typeof action.id === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/.test(action.id),
      `${label}.id must be a bounded lowercase observation identifier`
    );
    invariant(
      typeof action.name === 'string' && /^(?:href|data-[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(action.name),
      `${label}.name must be href or a data-* attribute`
    );
    invariant(
      Number.isSafeInteger(action.max_items) && action.max_items >= 1 && action.max_items <= 100,
      `${label}.max_items must be an integer from 1 to 100`
    );
    if (action.min_items !== undefined) {
      invariant(
        Number.isSafeInteger(action.min_items) && action.min_items >= 1 && action.min_items <= action.max_items,
        `${label}.min_items must be an integer from 1 to max_items`
      );
    }
  }
  if (action.type === 'fill') boundedString(action.value, `${label}.value`, ACCEPTANCE_LIMITS.general_string_chars, { empty: true });
  if (action.type === 'press') boundedString(action.key, `${label}.key`, 128);
  if (action.type === 'wait_for' && action.state !== undefined) {
    invariant(
      ['attached', 'detached', 'hidden', 'visible'].includes(action.state),
      `${label}.state must be attached, detached, hidden or visible`
    );
  }
}

function validateAssertion(assertion, label) {
  invariant(assertion && typeof assertion === 'object' && !Array.isArray(assertion), `${label} must be an object`);
  invariant(ASSERTION_TYPES.has(assertion.type), `${label}.type is unsupported: ${assertion.type}`);
  if (!['console_clean', 'not_requested', 'ranked_result', 'requested', 'url_hash', 'url_param'].includes(assertion.type)) {
    selectorStep(assertion, label);
  }
  if (assertion.type === 'ranked_result') {
    invariant(
      Object.keys(assertion).sort().join('\u0000') === ['canonical_url', 'type'].join('\u0000'),
      `${label} ranked_result fields are unsupported or have drifted`
    );
    boundedString(assertion.canonical_url, `${label}.canonical_url`, ACCEPTANCE_LIMITS.captured_value_chars);
    invariant(
      isCredentialFreeAbsoluteHttpUrl(assertion.canonical_url),
      `${label}.canonical_url must be a credential-free absolute HTTP(S) URL`
    );
  }
  if (['not_text', 'text'].includes(assertion.type)) {
    boundedString(assertion.includes, `${label}.includes`, ACCEPTANCE_LIMITS.general_string_chars, { empty: true });
  }
  if (assertion.type === 'count') {
    invariant(
      Number.isSafeInteger(assertion.equals) && assertion.equals >= 0 && assertion.equals <= 1_000_000,
      `${label}.equals must be an integer from 0 to 1000000`
    );
  }
  if (assertion.type === 'attribute') {
    boundedString(assertion.name, `${label}.name`, 256);
    boundedString(assertion.equals, `${label}.equals`, ACCEPTANCE_LIMITS.general_string_chars, { empty: true });
  }
  if (['not_requested', 'requested'].includes(assertion.type)) {
    boundedString(assertion.includes, `${label}.includes`, ACCEPTANCE_LIMITS.selector_chars);
  }
  if (assertion.type === 'url_hash') boundedString(assertion.equals, `${label}.equals`, 4096, { empty: true });
  if (assertion.type === 'url_param') {
    boundedString(assertion.name, `${label}.name`, 128);
    boundedString(assertion.equals, `${label}.equals`, ACCEPTANCE_LIMITS.general_string_chars, { empty: true });
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
    boundedString(value.expected_identity[field], `expected_identity.${field}`, field === 'id' ? 2048 : 512);
  }
  invariant(
    Array.isArray(value.journeys) && value.journeys.length > 0 && value.journeys.length <= ACCEPTANCE_LIMITS.journeys,
    `journeys must contain from 1 to ${ACCEPTANCE_LIMITS.journeys} entries`
  );
  const ids = new Set();
  let totalActions = 0;
  let totalAssertions = 0;
  let totalObservations = 0;
  for (const [index, journey] of value.journeys.entries()) {
    const label = `journeys[${index}]`;
    invariant(journey && typeof journey === 'object' && !Array.isArray(journey), `${label} must be an object`);
    boundedString(journey.id, `${label}.id`, 128);
    invariant(!ids.has(journey.id), `duplicate journey id: ${journey.id}`);
    ids.add(journey.id);
    invariant(
      Array.isArray(journey.actions) && journey.actions.length > 0 && journey.actions.length <= ACCEPTANCE_LIMITS.actions_per_journey,
      `${label}.actions must contain from 1 to ${ACCEPTANCE_LIMITS.actions_per_journey} entries`
    );
    invariant(
      Array.isArray(journey.assertions) && journey.assertions.length > 0 && journey.assertions.length <= ACCEPTANCE_LIMITS.assertions_per_journey,
      `${label}.assertions must contain from 1 to ${ACCEPTANCE_LIMITS.assertions_per_journey} entries`
    );
    totalActions += journey.actions.length;
    totalAssertions += journey.assertions.length;
    journey.actions.forEach((action, actionIndex) => validateAction(action, `${label}.actions[${actionIndex}]`));
    const observationIds = journey.actions
      .filter((action) => action.type === 'capture_attributes')
      .map((action) => action.id);
    invariant(
      observationIds.length <= ACCEPTANCE_LIMITS.observations_per_journey,
      `${label}.actions must contain at most ${ACCEPTANCE_LIMITS.observations_per_journey} observations`
    );
    totalObservations += observationIds.length;
    invariant(
      new Set(observationIds).size === observationIds.length,
      `${label}.actions contains a duplicate observation id`
    );
    journey.assertions.forEach((assertion, assertionIndex) => validateAssertion(assertion, `${label}.assertions[${assertionIndex}]`));
  }
  invariant(totalActions <= ACCEPTANCE_LIMITS.total_actions, `manifest exceeds ${ACCEPTANCE_LIMITS.total_actions} total actions`);
  invariant(totalAssertions <= ACCEPTANCE_LIMITS.total_assertions, `manifest exceeds ${ACCEPTANCE_LIMITS.total_assertions} total assertions`);
  invariant(totalObservations <= ACCEPTANCE_LIMITS.total_observations, `manifest exceeds ${ACCEPTANCE_LIMITS.total_observations} total observations`);
  return value;
}

export async function captureAttributeObservation(locator, action) {
  await locator.first().waitFor({ state: 'attached' });
  const snapshot = await locator.evaluateAll(
    (elements, { attribute, maximum }) => ({
      matched_items: elements.length,
      values: elements.slice(0, maximum).map((element) => element.getAttribute(attribute))
    }),
    { attribute: action.name, maximum: action.max_items }
  );
  invariant(
    snapshot && Number.isSafeInteger(snapshot.matched_items) && Array.isArray(snapshot.values),
    `${action.selector} did not yield a valid atomic attribute snapshot`
  );
  const matchedItems = snapshot.matched_items;
  const minimum = action.min_items || 1;
  if (matchedItems < minimum) {
    throw new Error(`${action.selector} matched ${matchedItems} items, fewer than min_items ${minimum}`);
  }
  const values = snapshot.values;
  invariant(values.length === Math.min(matchedItems, action.max_items), `${action.selector} returned an inconsistent atomic snapshot`);
  let capturedCharacters = 0;
  for (const [index, value] of values.entries()) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`${action.selector} item ${index + 1} lacks attribute ${action.name}`);
    }
    boundedString(value, `${action.selector} item ${index + 1} attribute ${action.name}`, ACCEPTANCE_LIMITS.captured_value_chars);
    capturedCharacters += value.length;
    if (action.name === 'data-result-canonical-url') {
      invariant(isCredentialFreeAbsoluteHttpUrl(value), `${action.selector} item ${index + 1} has an invalid canonical HTTP(S) URL`);
    }
  }
  invariant(
    capturedCharacters <= ACCEPTANCE_LIMITS.captured_values_total_chars,
    `${action.selector} captured more than ${ACCEPTANCE_LIMITS.captured_values_total_chars} characters`
  );
  return {
    id: action.id,
    type: 'ordered_attributes',
    selector: action.selector,
    attribute: action.name,
    min_items: minimum,
    max_items: action.max_items,
    matched_items: matchedItems,
    values
  };
}

export function isCredentialFreeAbsoluteHttpUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) return false;
  if (
    value.length > ACCEPTANCE_LIMITS.captured_value_chars ||
    /[^\x21-\x7e]/.test(value) ||
    /[\s"'<>\\^`{|}]/.test(value) ||
    /%(?![0-9A-Fa-f]{2})/.test(value) ||
    !/^https?:\/\/(?:\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?)(?::(?:[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))?(?:[/?#]|$)/i.test(value)
  ) return false;
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      Boolean(parsed.hostname) &&
      parsed.username === '' &&
      parsed.password === '' &&
      ![...parsed.searchParams.keys()].some((key) => CREDENTIAL_QUERY_KEY.test(key))
    );
  } catch {
    return false;
  }
}

export async function waitForLocator(locator, state = 'visible') {
  await locator.waitFor({ state });
}

export async function waitForRankedResult(page, canonicalUrl) {
  invariant(
    isCredentialFreeAbsoluteHttpUrl(canonicalUrl),
    'ranked-result canonical_url must be a credential-free absolute HTTP(S) URL'
  );
  const query = new URL(page.url()).searchParams.get('q');
  invariant(query !== null && query.length > 0, 'wait_for_ranked_result requires a non-empty q URL parameter');
  const containerSelector = '[data-okf-ranked-results="primary"]';
  const observationHandle = await page.waitForFunction(
    ({ selector, expectedQuery, canonicalUrl }) => {
      const container = document.querySelector(selector);
      const observedQuery = container?.getAttribute('data-okf-query') ?? null;
      const searchState = container?.getAttribute('data-okf-search-state') ?? null;
      if (observedQuery !== expectedQuery || searchState !== 'settled') return false;

      // Read the settled state, ordered row identities and visibility in one
      // browser task. A rerender cannot make visibility refer to a different
      // row from the canonical URL whose identity was observed.
      const rows = [...container.querySelectorAll('[data-okf-ranked-result]')];
      const canonicalUrls = rows.map((element) => element.getAttribute('data-result-canonical-url'));
      const matchingRows = rows.filter(
        (element) => element.getAttribute('data-result-canonical-url') === canonicalUrl
      );
      const visibleMatchingRows = matchingRows.filter((element) => {
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
      });
      return {
        query: observedQuery,
        search_state: searchState,
        canonical_urls: canonicalUrls,
        matching_result_count: matchingRows.length,
        visible_matching_result_count: visibleMatchingRows.length
      };
    },
    { selector: containerSelector, expectedQuery: query, canonicalUrl }
  );
  let observation;
  try {
    observation = await observationHandle.jsonValue();
  } finally {
    await observationHandle.dispose();
  }
  invariant(
    observation?.query === query && observation?.search_state === 'settled',
    'ranked-result settlement observation is inconsistent'
  );
  invariant(
    observation.matching_result_count === 1,
    `settled search for ${JSON.stringify(query)} contained ${observation.matching_result_count} ranked results for the expected canonical URL`
  );
  invariant(
    observation.visible_matching_result_count === 1,
    'the expected canonical ranked result is not visible'
  );
  return {
    query,
    canonical_url: canonicalUrl,
    ranked_result_count: observation.canonical_urls.length,
    matching_result_count: observation.matching_result_count
  };
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
