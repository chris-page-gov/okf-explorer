#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const RECEIPT_SCHEMA = 'okf-genuine-browser-link-receipt.v1';
const JOURNEY_ID = 'journey-publication';
const VERIFICATION_CHANNEL = 'genuine-browser-receipt';
const IDENTITY_SOURCE = 'document.body.innerText';
const BROWSER_CHANNEL = 'genuine-google-chrome-cdp';
const DEFAULT_TIMEOUT_MS = 65_000;
const CHROME_STOP_TIMEOUT_MS = 3_000;
const PROFILE_REMOVE_MAX_RETRIES = 10;
const PROFILE_REMOVE_RETRY_DELAY_MS = 100;
const CANONICAL_REPROBE_BASIS =
  'requested-page-and-declared-canonical-page-both-identity-matched';
const CREDENTIAL_QUERY_KEY =
  /^(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|passwd|bearer|token)$/i;

function usage() {
  return [
    'usage: node observe_protected_links.mjs JOURNEYS OUTPUT',
    '  [--chrome GOOGLE_CHROME_BINARY] [--timeout-ms MILLISECONDS]'
  ].join('\n');
}

function defaultChromeBinary() {
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  return 'google-chrome';
}

export function parseArgs(argv) {
  if (argv.length < 2) throw new Error(usage());
  const options = {
    journeyPath: argv[0],
    outputPath: argv[1],
    chromePath: process.env.CHROME_PATH || defaultChromeBinary(),
    timeoutMs: DEFAULT_TIMEOUT_MS
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--chrome') options.chromePath = argv[++index];
    else if (argument === '--timeout-ms') options.timeoutMs = Number(argv[++index]);
    else throw new Error(`unknown argument: ${argument}\n${usage()}`);
  }
  if (!options.chromePath) throw new Error('--chrome requires a Google Chrome binary.');
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error('--timeout-ms must be an integer of at least 1000.');
  }
  return options;
}

export function protectedActions(payload) {
  const journey = payload?.journeys?.find((item) => item.id === JOURNEY_ID);
  if (!journey) throw new Error(`${JOURNEY_ID} is missing.`);
  const actions = journey.actions
    .filter(
      (item) =>
        item.action === 'verify_url' &&
        item.verification_channel === VERIFICATION_CHANNEL
    )
    .sort((left, right) => left.sequence - right.sequence);
  if (actions.length === 0) {
    throw new Error(`${JOURNEY_ID} has no protected browser actions.`);
  }
  const sequences = new Set();
  for (const action of actions) {
    if (!Number.isInteger(action.sequence) || sequences.has(action.sequence)) {
      throw new Error('protected actions require unique integer sequences.');
    }
    sequences.add(action.sequence);
    for (const field of ['value', 'expected_text']) {
      if (typeof action[field] !== 'string' || !action[field].trim()) {
        throw new Error(`protected action ${action.sequence} requires ${field}.`);
      }
    }
    const requested = new URL(action.value);
    if (!['http:', 'https:'].includes(requested.protocol)) {
      throw new Error(`protected action ${action.sequence} is not HTTP(S).`);
    }
  }
  return actions;
}

function timestamp(value, label) {
  if (
    typeof value !== 'string' ||
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(`${label} must be a timezone-qualified timestamp.`);
  }
  return Date.parse(value);
}

function locationIdentity(value) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`URL is not HTTP(S): ${value}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`URL contains credentials: ${value}`);
  }
  if ([...parsed.searchParams.keys()].some((key) => CREDENTIAL_QUERY_KEY.test(key))) {
    throw new Error(`URL contains a credential-like query key: ${value}`);
  }
  return `${parsed.origin}${parsed.pathname}${parsed.search}`;
}

export function assertReceiptContract(receipt) {
  if (receipt?.schema !== RECEIPT_SCHEMA) {
    throw new Error(`receipt schema must be ${RECEIPT_SCHEMA}.`);
  }
  if (
    typeof receipt.browser?.channel !== 'string' ||
    !receipt.browser.channel.trim() ||
    typeof receipt.browser.user_agent !== 'string' ||
    !receipt.browser.user_agent.trim() ||
    receipt.browser.webdriver !== false ||
    !Array.isArray(receipt.browser.languages) ||
    receipt.browser.languages.length === 0 ||
    receipt.browser.languages.some(
      (language) => typeof language !== 'string' || !language.trim()
    )
  ) {
    throw new Error(
      'receipt browser requires channel, user_agent, webdriver=false and languages.'
    );
  }
  if (!Array.isArray(receipt.records) || receipt.records.length === 0) {
    throw new Error('receipt records must be a nonempty array.');
  }
  const keys = new Set();
  let previous = Number.NEGATIVE_INFINITY;
  for (const [index, record] of receipt.records.entries()) {
    const prefix = `record ${index + 1}`;
    const observedAt = timestamp(record.observed_at, `${prefix} observed_at`);
    if (observedAt < previous) throw new Error('record timestamps are not ordered.');
    previous = observedAt;
    locationIdentity(record.requested_url);
    locationIdentity(record.final_url);
    if (typeof record.title !== 'string' || !record.title.trim()) {
      throw new Error(`${prefix} title is empty.`);
    }
    if (
      !Number.isInteger(record.response_status) ||
      record.response_status < 200 ||
      record.response_status >= 400
    ) {
      throw new Error(`${prefix} response_status is not from 200 to 399.`);
    }
    if (
      typeof record.expected_text !== 'string' ||
      !record.expected_text.trim() ||
      record.identity_matched !== true ||
      record.identity_source !== IDENTITY_SOURCE ||
      typeof record.identity_excerpt !== 'string' ||
      !record.identity_excerpt
        .toLocaleLowerCase('en-GB')
        .includes(record.expected_text.toLocaleLowerCase('en-GB'))
    ) {
      throw new Error(`${prefix} is not bound to its DOM identity text.`);
    }
    const key = `${record.requested_url}\u0000${record.expected_text}`;
    if (keys.has(key)) throw new Error(`${prefix} duplicates a URL/text identity.`);
    keys.add(key);
    if (record.canonical_reprobe === true) {
      if (
        record.validation_basis !== CANONICAL_REPROBE_BASIS ||
        locationIdentity(record.requested_final_url) !==
          locationIdentity(record.requested_url) ||
        locationIdentity(record.final_url) ===
          locationIdentity(record.requested_final_url) ||
        !Number.isInteger(record.requested_response_status) ||
        record.requested_response_status < 200 ||
        record.requested_response_status >= 400 ||
        typeof record.requested_title !== 'string' ||
        !record.requested_title.trim() ||
        typeof record.requested_identity_excerpt !== 'string' ||
        !record.requested_identity_excerpt
          .toLocaleLowerCase('en-GB')
          .includes(record.expected_text.toLocaleLowerCase('en-GB'))
      ) {
        throw new Error(`${prefix} has invalid canonical-reprobe evidence.`);
      }
    } else if (
      'canonical_reprobe' in record ||
      'requested_final_url' in record ||
      'requested_response_status' in record ||
      'requested_title' in record ||
      'requested_identity_excerpt' in record ||
      'validation_basis' in record
    ) {
      throw new Error(`${prefix} has incomplete canonical-reprobe evidence.`);
    }
  }
  if (timestamp(receipt.observed_at, 'receipt observed_at') !== previous) {
    throw new Error('receipt observed_at must equal the latest record observed_at.');
  }
  return receipt;
}

export function buildReceipt(actions, observations, browser) {
  if (actions.length !== observations.length) {
    throw new Error('every protected action must have exactly one observation.');
  }
  const records = observations.map((observation, index) => {
    const action = actions[index];
    if (observation.requested_url !== action.value) {
      throw new Error(`observation ${index + 1} is not ordered with its action.`);
    }
    const expectedFinalUrl = action.expected_final_url || action.value;
    if (
      locationIdentity(observation.final_url) !== locationIdentity(expectedFinalUrl) ||
      (action.expected_final_hash &&
        new URL(observation.final_url).hash !== action.expected_final_hash)
    ) {
      throw new Error(`observation ${index + 1} has an unexpected final URL.`);
    }
    return {
      observed_at: observation.observed_at,
      requested_url: action.value,
      ...(observation.canonical_reprobe === true
        ? {
            requested_final_url: observation.requested_final_url,
            requested_response_status: observation.requested_response_status,
            requested_title: observation.requested_title,
            requested_identity_excerpt: observation.requested_identity_excerpt,
            canonical_reprobe: true,
            validation_basis: observation.validation_basis
          }
        : {}),
      final_url: observation.final_url,
      title: observation.title,
      response_status: observation.response_status,
      expected_text: action.expected_text,
      identity_matched: observation.identity_matched,
      identity_source: IDENTITY_SOURCE,
      identity_excerpt: observation.identity_excerpt
    };
  });
  const receipt = {
    schema: RECEIPT_SCHEMA,
    observed_at: records.at(-1).observed_at,
    purpose:
      'Identity-bound verification of protected Historic England pages in an externally launched Google Chrome CDP session.',
    browser: {
      channel: browser.channel,
      user_agent: browser.user_agent,
      webdriver: browser.webdriver,
      languages: [...browser.languages]
    },
    scope: {
      journey_id: JOURNEY_ID,
      sequences: actions.map((action) => action.sequence),
      limitation:
        'This receipt proves response status, final URL, title and quoted DOM identity in Google Chrome without an automation launch flag. When a publisher stops redirecting a requested page to its declared canonical URL, canonical-reprobe records expose both final URLs and prove the same identity at each endpoint.'
    },
    records
  };
  return assertReceiptContract(receipt);
}

async function availablePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('could not reserve a Chrome debugging port.');
  }
  const port = address.port;
  server.close();
  await once(server, 'close');
  return port;
}

function assertGoogleChrome(chromePath) {
  const result = spawnSync(chromePath, ['--version'], {
    encoding: 'utf8',
    timeout: 10_000
  });
  const version = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.error || result.status !== 0 || !/^Google Chrome\s+\d/.test(version)) {
    throw new Error(
      `--chrome must resolve to Google Chrome; observed ${version || result.error || 'no version'}.`
    );
  }
  return version;
}

async function launchChrome(chromePath, userDataDirectory, port) {
  const chromeArguments = [
    `--remote-debugging-address=127.0.0.1`,
    `--remote-debugging-port=${port}`,
    `--remote-allow-origins=http://127.0.0.1:${port}`,
    `--user-data-dir=${userDataDirectory}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--disable-session-crashed-bubble',
    '--password-store=basic',
    '--use-mock-keychain',
    '--window-size=1365,900',
    'about:blank'
  ];
  const processHandle = spawn(chromePath, chromeArguments, {
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let stderr = '';
  processHandle.stderr.on('data', (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-8_000);
  });
  try {
    await once(processHandle, 'spawn');
  } catch (error) {
    throw new Error(`could not launch Google Chrome: ${error.message}`);
  }
  return { processHandle, stderr: () => stderr };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  return response.json();
}

async function waitForDevTools(port, processHandle, chromeStderr, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(
        `Google Chrome exited before CDP was ready (${processHandle.exitCode}): ${chromeStderr()}`
      );
    }
    try {
      return await fetchJson(endpoint);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Google Chrome CDP did not become ready: ${chromeStderr()}`);
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', (event) => this.handleMessage(event.data));
    socket.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error('Chrome CDP connection closed.'));
      }
      this.pending.clear();
    });
  }

  static async connect(webSocketUrl) {
    const socket = new WebSocket(webSocketUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener(
        'error',
        () => reject(new Error('could not open the Chrome CDP WebSocket.')),
        { once: true }
      );
    });
    return new CdpSession(socket);
  }

  handleMessage(raw) {
    const message = JSON.parse(String(raw));
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(`CDP ${pending.method}: ${message.error.message}`));
      } else {
        pending.resolve(message.result || {});
      }
      return;
    }
    for (const listener of this.listeners.get(message.method) || []) {
      listener(message.params || {});
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { method, resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || new Set();
    listeners.add(listener);
    this.listeners.set(method, listeners);
    return () => listeners.delete(listener);
  }

  async close() {
    if (this.socket.readyState >= 2) return;
    const closed = new Promise((resolve) => {
      this.socket.addEventListener('close', resolve, { once: true });
    });
    this.socket.close();
    await Promise.race([closed, delay(1_000)]);
  }
}

async function evaluatePage(session) {
  const evaluation = await session.send('Runtime.evaluate', {
    expression: `(() => ({
      readyState: document.readyState,
      href: location.href,
      title: document.title,
      bodyText: document.body ? document.body.innerText : '',
      userAgent: navigator.userAgent,
      webdriver: navigator.webdriver,
      languages: Array.from(navigator.languages || [])
    }))()`,
    returnByValue: true
  });
  if (evaluation.exceptionDetails) {
    throw new Error('page identity evaluation raised an exception.');
  }
  return evaluation.result?.value;
}

function identityExcerpt(bodyText, expectedText) {
  const normalized = bodyText.replace(/\s+/g, ' ').trim();
  const index = normalized
    .toLocaleLowerCase('en-GB')
    .indexOf(expectedText.toLocaleLowerCase('en-GB'));
  if (index < 0) return null;
  const start = Math.max(0, index - 100);
  const end = Math.min(normalized.length, index + expectedText.length + 220);
  return normalized.slice(start, end);
}

export function canonicalReprobeTarget(action, observedFinalUrl) {
  if (
    typeof action.expected_final_url === 'string' &&
    !action.expected_final_hash &&
    locationIdentity(observedFinalUrl) === locationIdentity(action.value) &&
    locationIdentity(observedFinalUrl) !== locationIdentity(action.expected_final_url)
  ) {
    return action.expected_final_url;
  }
  return null;
}

async function observeAction(session, action, timeoutMs) {
  const documentResponses = [];
  const stopCollecting = session.on('Network.responseReceived', (event) => {
    if (event.type === 'Document') documentResponses.push(event);
  });
  let navigation;
  try {
    navigation = await session.send('Page.navigate', { url: action.value });
    if (navigation.errorText) {
      throw new Error(`navigation failed: ${navigation.errorText}`);
    }
    const deadline = Date.now() + timeoutMs;
    let pageIdentity;
    let excerpt;
    while (Date.now() < deadline) {
      try {
        pageIdentity = await evaluatePage(session);
        excerpt = identityExcerpt(pageIdentity?.bodyText || '', action.expected_text);
        if (
          ['interactive', 'complete'].includes(pageIdentity?.readyState) &&
          pageIdentity?.title?.trim() &&
          excerpt
        ) {
          break;
        }
      } catch {
        // Navigation can replace the execution context between polling attempts.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!pageIdentity || !excerpt) {
      throw new Error(`DOM identity text did not appear: ${action.expected_text}`);
    }
    if (pageIdentity.webdriver !== false) {
      throw new Error(
        `navigator.webdriver must be false; observed ${String(pageIdentity.webdriver)}.`
      );
    }
    if (!Array.isArray(pageIdentity.languages) || pageIdentity.languages.length === 0) {
      throw new Error('navigator.languages must be a nonempty array.');
    }
    const response = [...documentResponses]
      .reverse()
      .find(
        (event) =>
          event.frameId === navigation.frameId &&
          locationIdentity(event.response.url) === locationIdentity(pageIdentity.href)
      );
    const responseStatus = response?.response?.status;
    if (
      !Number.isInteger(responseStatus) ||
      responseStatus < 200 ||
      responseStatus >= 400
    ) {
      throw new Error(`final document response status is invalid: ${responseStatus}.`);
    }
    const expectedFinalUrl = action.expected_final_url || action.value;
    if (locationIdentity(pageIdentity.href) !== locationIdentity(expectedFinalUrl)) {
      const reprobeTarget = canonicalReprobeTarget(action, pageIdentity.href);
      if (reprobeTarget) {
        const canonicalObservation = await observeAction(
          session,
          {
            ...action,
            value: reprobeTarget,
            expected_final_url: reprobeTarget
          },
          timeoutMs
        );
        if (
          canonicalObservation.browser.user_agent !== pageIdentity.userAgent ||
          JSON.stringify(canonicalObservation.browser.languages) !==
            JSON.stringify(pageIdentity.languages) ||
          canonicalObservation.browser.webdriver !== pageIdentity.webdriver
        ) {
          throw new Error('browser identity changed during a canonical reprobe.');
        }
        return {
          ...canonicalObservation,
          requested_url: action.value,
          requested_final_url: pageIdentity.href,
          requested_response_status: responseStatus,
          requested_title: pageIdentity.title.trim(),
          requested_identity_excerpt: excerpt,
          canonical_reprobe: true,
          validation_basis: CANONICAL_REPROBE_BASIS
        };
      }
      throw new Error(
        `final URL ${pageIdentity.href} does not match ${expectedFinalUrl}.`
      );
    }
    if (
      action.expected_final_hash &&
      new URL(pageIdentity.href).hash !== action.expected_final_hash
    ) {
      throw new Error(
        `final URL hash ${new URL(pageIdentity.href).hash || '(empty)'} does not match ` +
          `${action.expected_final_hash}.`
      );
    }
    return {
      observed_at: new Date().toISOString(),
      requested_url: action.value,
      final_url: pageIdentity.href,
      title: pageIdentity.title.trim(),
      response_status: responseStatus,
      identity_matched: true,
      identity_excerpt: excerpt,
      browser: {
        channel: BROWSER_CHANNEL,
        user_agent: pageIdentity.userAgent,
        webdriver: pageIdentity.webdriver,
        languages: pageIdentity.languages
      }
    };
  } finally {
    stopCollecting();
  }
}

export async function stopChrome(processHandle) {
  if (processHandle.exitCode !== null) return;
  const exited = once(processHandle, 'exit');
  processHandle.kill('SIGTERM');
  await Promise.race([exited, delay(CHROME_STOP_TIMEOUT_MS)]);
  if (processHandle.exitCode === null) {
    processHandle.kill('SIGKILL');
    await Promise.race([exited, delay(CHROME_STOP_TIMEOUT_MS)]);
  }
  if (processHandle.exitCode === null) {
    throw new Error('Google Chrome did not exit after SIGTERM and SIGKILL.');
  }
}

export async function removeChromeProfile(profile, remover = rm) {
  await remover(profile, {
    recursive: true,
    force: true,
    maxRetries: PROFILE_REMOVE_MAX_RETRIES,
    retryDelay: PROFILE_REMOVE_RETRY_DELAY_MS
  });
}

export function appendCleanupDiagnostics(operationError, cleanupErrors) {
  if (cleanupErrors.length === 0) return operationError;
  const details = cleanupErrors
    .map((error) => error?.stack || error?.message || String(error))
    .join('\n');
  operationError.stack = `${operationError.stack || operationError.message}\n` +
    `Cleanup diagnostics:\n${details}`;
  return operationError;
}

async function closeChromeSession(session) {
  try {
    await Promise.race([session.send('Browser.close'), delay(1_000)]);
  } catch {
    // Closing the browser can close CDP before Browser.close replies.
  }
  await session.close();
}

async function writeReceipt(outputPath, receipt) {
  await mkdir(dirname(outputPath), { recursive: true });
  const temporary = `${outputPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await rename(temporary, outputPath);
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const chromeVersion = assertGoogleChrome(options.chromePath);
  const payload = JSON.parse(await readFile(options.journeyPath, 'utf8'));
  const actions = protectedActions(payload);
  const profile = await mkdtemp(`${tmpdir()}/okf-genuine-chrome-`);
  const port = await availablePort();
  let chrome;
  let session;
  let operationError;
  try {
    chrome = await launchChrome(options.chromePath, profile, port);
    await waitForDevTools(
      port,
      chrome.processHandle,
      chrome.stderr,
      Math.min(options.timeoutMs, 20_000)
    );
    const target = await fetchJson(
      `http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`,
      { method: 'PUT' }
    );
    session = await CdpSession.connect(target.webSocketDebuggerUrl);
    await session.send('Page.enable');
    await session.send('Runtime.enable');
    await session.send('Network.enable');
    const observations = [];
    let browserIdentity;
    for (const action of actions) {
      const observation = await observeAction(session, action, options.timeoutMs);
      browserIdentity ||= observation.browser;
      if (
        observation.browser.user_agent !== browserIdentity.user_agent ||
        JSON.stringify(observation.browser.languages) !==
          JSON.stringify(browserIdentity.languages) ||
        observation.browser.webdriver !== false
      ) {
        throw new Error('browser identity changed within the Chrome CDP session.');
      }
      observations.push(observation);
    }
    const receipt = buildReceipt(actions, observations, browserIdentity);
    await writeReceipt(options.outputPath, receipt);
    console.log(
      `observed ${receipt.records.length} protected URLs with ${chromeVersion}; ` +
        `receipt=${options.outputPath}`
    );
  } catch (error) {
    operationError = error;
  }
  const cleanupErrors = [];
  if (session) {
    try {
      await closeChromeSession(session);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (chrome) {
    try {
      await stopChrome(chrome.processHandle);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  try {
    await removeChromeProfile(profile);
  } catch (error) {
    cleanupErrors.push(error);
  }
  if (operationError) {
    throw appendCleanupDiagnostics(operationError, cleanupErrors);
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      `Google Chrome cleanup failed: ${cleanupErrors
        .map((error) => error?.message || String(error))
        .join('; ')}`
    );
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
