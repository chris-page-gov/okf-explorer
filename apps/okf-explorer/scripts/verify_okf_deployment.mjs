#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { TextDecoder } from 'node:util';

import { chromium } from '@playwright/test';


const IDENTITY_SCHEMA = 'okf-publication-deployment-identity.v1';
const RECEIPT_SCHEMA = 'okf-live-deployment-verification-receipt.v1';
const COMMIT = /^[0-9a-f]{40}$/;


function invariant(condition, message) {
  if (!condition) throw new Error(message);
}


function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}


export function parseJsonBytes(value, label = 'JSON material') {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(`${label} is not valid UTF-8: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}


export function parseArgs(argv) {
  const options = {
    contract: undefined,
    journey: undefined,
    candidateReceipt: undefined,
    expectedCommit: undefined,
    output: undefined,
    timeoutMs: 60_000
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--contract') options.contract = argv[++index];
    else if (argument === '--journey') options.journey = argv[++index];
    else if (argument === '--candidate-receipt') options.candidateReceipt = argv[++index];
    else if (argument === '--expected-commit') options.expectedCommit = argv[++index];
    else if (argument === '--output') options.output = argv[++index];
    else if (argument === '--timeout-ms') options.timeoutMs = Number(argv[++index]);
    else throw new Error(`unknown argument: ${argument}`);
  }
  for (const name of ['contract', 'journey', 'candidateReceipt', 'expectedCommit', 'output']) {
    invariant(typeof options[name] === 'string' && options[name].trim(), `--${name.replace(/[A-Z]/g, (value) => `-${value.toLowerCase()}`)} is required`);
  }
  invariant(COMMIT.test(options.expectedCommit), '--expected-commit must be a full lowercase Git SHA');
  invariant(Number.isInteger(options.timeoutMs) && options.timeoutMs >= 5_000 && options.timeoutMs <= 120_000, '--timeout-ms must be from 5000 to 120000');
  return options;
}


function httpUrl(value, label) {
  const url = new URL(value);
  invariant(['http:', 'https:'].includes(url.protocol), `${label} must be HTTP(S)`);
  invariant(!url.username && !url.password, `${label} must not contain credentials`);
  return url;
}


export function publicationRelativePath(baseValue, targetValue, label = 'publication URL') {
  const base = httpUrl(baseValue, 'publication target');
  const target = httpUrl(targetValue, label);
  invariant(base.pathname.endsWith('/'), 'publication target path must end with /');
  invariant(!base.search && !base.hash, 'publication target must not contain a query or fragment');
  invariant(target.origin === base.origin, `${label} is outside the publication origin`);
  invariant(target.pathname.startsWith(base.pathname), `${label} is outside the publication path`);
  let relative;
  try {
    relative = decodeURIComponent(target.pathname.slice(base.pathname.length));
  } catch (error) {
    throw new Error(`${label} contains invalid percent encoding: ${error.message}`);
  }
  invariant(relative && !relative.startsWith('/'), `${label} has no publication-relative path`);
  invariant(!relative.split('/').some((part) => !part || part === '.' || part === '..'), `${label} has a non-canonical publication path`);
  return relative;
}


export function validateIdentity(identity, { contract, expectedCommit }) {
  invariant(identity?.schema === IDENTITY_SCHEMA, `identity schema must be ${IDENTITY_SCHEMA}`);
  invariant(identity.commit === expectedCommit, `deployed commit ${identity.commit || '<missing>'} does not match ${expectedCommit}`);
  invariant(identity.repository?.name === contract.repository?.name, 'deployment identity repository name differs from the contract');
  invariant(identity.repository?.url === contract.repository?.url, 'deployment identity repository URL differs from the contract');
  invariant(Array.isArray(identity.materials) && identity.materials.length > 0, 'deployment identity has no control materials');
  const paths = new Set();
  for (const material of identity.materials) {
    invariant(typeof material.path === 'string' && material.path, 'identity material path is missing');
    invariant(!paths.has(material.path), `duplicate identity material: ${material.path}`);
    paths.add(material.path);
    invariant(Number.isInteger(material.bytes) && material.bytes >= 0, `identity material ${material.path} has invalid bytes`);
    invariant(/^[0-9a-f]{64}$/.test(material.sha256), `identity material ${material.path} has invalid SHA-256`);
  }
  invariant(paths.has('okf.publication.json'), 'deployment identity does not bind okf.publication.json');
  return identity;
}


export function validateCandidateReceipt(receipt, expectedCommit) {
  invariant(receipt?.schema === 'okf-site-candidate-receipt.v1', 'candidate receipt has an unexpected schema');
  const binding = receipt.publication_identity;
  invariant(binding?.path === 'okf-publication-identity.json', 'candidate receipt does not bind the deployment identity path');
  invariant(binding.commit === expectedCommit, 'candidate receipt commit differs from the expected commit');
  invariant(Number.isInteger(binding.bytes) && binding.bytes > 0, 'candidate receipt identity byte count is invalid');
  invariant(/^[0-9a-f]{64}$/.test(binding.sha256), 'candidate receipt identity SHA-256 is invalid');
  return receipt;
}


function material(identity, path) {
  const value = identity.materials.find((item) => item.path === path);
  invariant(value, `deployment identity does not bind ${path}`);
  return value;
}


export function validatePublishedBytes(bytes, binding, label) {
  invariant(bytes.length === binding.bytes, `${label} byte count differs from the deployment identity`);
  invariant(sha256(bytes) === binding.sha256, `${label} SHA-256 differs from the deployment identity`);
  return bytes;
}


async function fetchBytes(url, deadline) {
  const remaining = deadline - Date.now();
  invariant(remaining > 0, `verification deadline passed before fetching ${url}`);
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(remaining)
  });
  invariant(response.ok, `${url} returned HTTP ${response.status}`);
  invariant(Date.now() < deadline, `verification deadline passed while fetching ${url}`);
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}


async function waitForPublishedBytes(url, binding, deadline, label) {
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fetchBytes(url, deadline);
      validatePublishedBytes(result.bytes, binding, label);
      return result;
    } catch (error) {
      lastError = error;
    }
    await delay(Math.min(2_000, Math.max(0, deadline - Date.now())));
  }
  throw new Error(
    `timed out waiting for ${label} at ${url}: ${lastError?.message || 'no response'}`
  );
}


async function applyStructuredChecks(page, journey, identity, base, deadline) {
  const results = [];
  for (const check of journey.checks || []) {
    invariant(Date.now() < deadline, `verification deadline passed before ${check.id}`);
    const links = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors.map((anchor) => ({ href: anchor.href, text: anchor.textContent?.trim() || '' }))
    );
    const link = links.find((candidate) => candidate.href.includes(check.href_contains));
    invariant(link, `check ${check.id} could not find a link containing ${check.href_contains}`);
    if (check.expected_text) {
      invariant(link.text.toLocaleLowerCase('en-GB').includes(check.expected_text.toLocaleLowerCase('en-GB')), `check ${check.id} link text does not contain ${check.expected_text}`);
    }
    const result = { id: check.id, kind: check.kind, href: link.href, status: 'passed' };
    if (check.kind === 'linked-json') {
      const relative = publicationRelativePath(base, link.href, `check ${check.id} URL`);
      const binding = material(identity, relative);
      const response = await waitForPublishedBytes(
        link.href,
        binding,
        deadline,
        `check ${check.id}`
      );
      const payload = parseJsonBytes(response.bytes, `check ${check.id}`);
      invariant(payload?.schema === check.expected_schema, `check ${check.id} schema ${payload?.schema || '<missing>'} does not match ${check.expected_schema}`);
      result.schema = payload.schema;
      result.sha256 = binding.sha256;
    }
    results.push(result);
  }
  return results;
}


async function openExpectedJourney(browser, url, binding, deadline) {
  let lastError;
  while (Date.now() < deadline) {
    const page = await browser.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    try {
      const remaining = deadline - Date.now();
      invariant(remaining > 0, 'verification deadline passed before journey navigation');
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: remaining
      });
      invariant(response && response.ok(), `journey returned HTTP ${response?.status() || '<none>'}`);
      validatePublishedBytes(await response.body(), binding, 'journey response');
      return { page, response, consoleErrors, pageErrors };
    } catch (error) {
      lastError = error;
      await page.close();
      await delay(Math.min(2_000, Math.max(0, deadline - Date.now())));
    }
  }
  throw new Error(
    `timed out waiting for the exact journey at ${url}: ${lastError?.message || 'no response'}`
  );
}


async function writeReceipt(path, receipt) {
  const target = resolve(path);
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}


export async function verify(options) {
  const deadline = Date.now() + options.timeoutMs;
  const contractPath = resolve(options.contract);
  const contractBytes = await readFile(contractPath);
  const contract = parseJsonBytes(contractBytes, 'local publication contract');
  const candidate = validateCandidateReceipt(
    parseJsonBytes(
      await readFile(resolve(options.candidateReceipt)),
      'candidate receipt'
    ),
    options.expectedCommit
  );
  const journey = contract.verification?.journeys?.find((item) => item.id === options.journey);
  invariant(journey, `verification journey is not declared: ${options.journey}`);
  const target = contract.publication?.targets?.find((item) => item.kind === 'github-pages') || contract.publication?.targets?.[0];
  invariant(target, 'publication contract has no target');
  const base = httpUrl(target.public_base_url, 'publication target');
  publicationRelativePath(base, journey.url, 'journey URL');
  const identityUrl = new URL('okf-publication-identity.json', base).href;
  const identityResponse = await waitForPublishedBytes(
    identityUrl,
    candidate.publication_identity,
    deadline,
    'deployed identity'
  );
  const identity = validateIdentity(parseJsonBytes(identityResponse.bytes, 'deployed identity'), {
    contract,
    expectedCommit: options.expectedCommit
  });
  const contractMaterial = material(identity, 'okf.publication.json');
  invariant(contractMaterial.sha256 === sha256(contractBytes), 'local contract differs from the candidate identity');
  invariant(contractMaterial.bytes === contractBytes.length, 'local contract byte count differs from the candidate identity');
  const remoteContractUrl = new URL('okf.publication.json', base).href;
  const remoteContract = await waitForPublishedBytes(
    remoteContractUrl,
    contractMaterial,
    deadline,
    'deployed publication contract'
  );

  const journeyUrl = httpUrl(journey.url, 'journey URL').href;
  const journeyPath = publicationRelativePath(base, journeyUrl, 'journey URL');
  const journeyMaterial = material(identity, journeyPath);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const browserVersion = browser.version();
  let pageResult;
  let consoleErrors = [];
  let pageErrors = [];
  try {
    const opened = await openExpectedJourney(
      browser,
      journeyUrl,
      journeyMaterial,
      deadline
    );
    const { page, response } = opened;
    invariant(
      publicationRelativePath(base, page.url(), 'final journey URL') === journeyPath,
      'journey navigation finished at a different publication path'
    );
    consoleErrors = opened.consoleErrors;
    pageErrors = opened.pageErrors;
    const loadRemaining = deadline - Date.now();
    invariant(loadRemaining > 0, 'verification deadline passed before journey load');
    await page.waitForLoadState('load', { timeout: loadRemaining });
    const bodyText = await page.locator('body').innerText();
    invariant(bodyText.toLocaleLowerCase('en-GB').includes(journey.expected_identity.toLocaleLowerCase('en-GB')), `journey body does not contain ${journey.expected_identity}`);
    const checks = await applyStructuredChecks(page, journey, identity, base, deadline);
    invariant(consoleErrors.length === 0, `browser console errors: ${consoleErrors.join(' | ')}`);
    invariant(pageErrors.length === 0, `browser page errors: ${pageErrors.join(' | ')}`);
    pageResult = {
      url: page.url(),
      title: await page.title(),
      status: response.status(),
      expected_identity: journey.expected_identity,
      identity_matched: true,
      checks
    };
  } finally {
    await browser.close();
  }

  const receipt = {
    schema: RECEIPT_SCHEMA,
    observed_at: new Date().toISOString(),
    repository: contract.repository,
    expected_commit: options.expectedCommit,
    candidate_identity: candidate.publication_identity,
    deployed_identity: {
      url: identityUrl,
      sha256: sha256(identityResponse.bytes),
      commit: identity.commit
    },
    deployed_contract: {
      url: remoteContractUrl,
      sha256: sha256(remoteContract.bytes)
    },
    browser: {
      channel: 'chrome',
      version: browserVersion,
      console_policy: contract.verification.console_policy,
      console_errors: consoleErrors,
      page_errors: pageErrors
    },
    journey: { id: journey.id, ...pageResult },
    result: 'passed'
  };
  await writeReceipt(options.output, receipt);
  return receipt;
}


async function main() {
  const options = parseArgs(process.argv.slice(2));
  const receipt = await verify(options);
  console.log(`verified ${receipt.repository.name} at ${receipt.expected_commit} with installed Chrome`);
}


export function isEntrypoint(metaUrl, argv1) {
  return typeof argv1 === 'string' && metaUrl === pathToFileURL(resolve(argv1)).href;
}


if (isEntrypoint(import.meta.url, process.argv[1])) {
  main().catch((error) => {
    console.error(`deployment verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
