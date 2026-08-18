import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

import {
  isEntrypoint,
  parseArgs,
  parseJsonBytes,
  publicationRelativePath,
  validateCandidateReceipt,
  validateIdentity,
  validatePublishedBytes
} from './verify_okf_deployment.mjs';


const commit = 'a'.repeat(40);
const contract = {
  repository: {
    name: 'okf-fixture',
    url: 'https://github.com/example/okf-fixture'
  }
};


test('byte JSON parsing is explicit, UTF-8 strict and deterministic', () => {
  assert.deepEqual(parseJsonBytes(Buffer.from('{"value":1}\n')), { value: 1 });
  assert.throws(() => parseJsonBytes(Buffer.from([0xff])), /not valid UTF-8/);
  assert.throws(() => parseJsonBytes(Buffer.from('{')), /not valid JSON/);
});


test('publication paths cannot escape the declared deployment base', () => {
  const base = 'https://example.org/okf/';
  assert.equal(
    publicationRelativePath(base, 'https://example.org/okf/registry/index.html'),
    'registry/index.html'
  );
  assert.throws(
    () => publicationRelativePath(base, 'https://example.org/other/index.html'),
    /outside the publication path/
  );
  assert.throws(
    () => publicationRelativePath(base, 'https://other.example/okf/index.html'),
    /outside the publication origin/
  );
  assert.throws(
    () => publicationRelativePath('https://example.org/okf', 'https://example.org/index.html'),
    /must end with/
  );
});


test('published bytes must match both candidate length and digest', () => {
  const bytes = Buffer.from('exact bytes');
  const binding = {
    bytes: bytes.length,
    sha256: 'e38e581aade78b64cc86f7ac9f3555ca78c2dcca747942a7f1d9b3275a834f75'
  };
  assert.equal(validatePublishedBytes(bytes, binding, 'fixture'), bytes);
  assert.throws(
    () => validatePublishedBytes(Buffer.from('other'), binding, 'fixture'),
    /byte count differs/
  );
});


test('entrypoint detection resolves relative script paths as file URLs', () => {
  const path = resolve('scripts/example.mjs');
  const url = pathToFileURL(path).href;
  assert.equal(isEntrypoint(url, path), true);
  assert.equal(isEntrypoint(url, 'scripts/other.mjs'), false);
  assert.equal(isEntrypoint(url, undefined), false);
});


test('arguments require exact commit and all bounded inputs', () => {
  const parsed = parseArgs([
    '--contract', 'okf.publication.json',
    '--journey', 'worked-example',
    '--candidate-receipt', 'candidate.json',
    '--expected-commit', commit,
    '--output', 'receipt.json'
  ]);
  assert.equal(parsed.expectedCommit, commit);
  assert.equal(parsed.timeoutMs, 60_000);
  assert.throws(
    () => parseArgs([
      '--contract', 'okf.publication.json',
      '--journey', 'worked-example',
      '--candidate-receipt', 'candidate.json',
      '--expected-commit', 'main',
      '--output', 'receipt.json'
    ]),
    /full lowercase Git SHA/
  );
});


test('candidate receipt binds the exact deployed identity bytes and commit', () => {
  const receipt = validateCandidateReceipt({
    schema: 'okf-site-candidate-receipt.v1',
    publication_identity: {
      path: 'okf-publication-identity.json',
      bytes: 123,
      sha256: 'b'.repeat(64),
      commit
    }
  }, commit);
  assert.equal(receipt.publication_identity.commit, commit);
  assert.throws(
    () => validateCandidateReceipt({
      schema: 'okf-site-candidate-receipt.v1',
      publication_identity: {
        path: 'okf-publication-identity.json',
        bytes: 123,
        sha256: 'b'.repeat(64),
        commit: 'c'.repeat(40)
      }
    }, commit),
    /differs/
  );
});


test('deployment identity must match repository, commit and contract material', () => {
  const identity = validateIdentity({
    schema: 'okf-publication-deployment-identity.v1',
    repository: contract.repository,
    commit,
    materials: [
      {
        path: 'okf.publication.json',
        bytes: 12,
        sha256: 'd'.repeat(64)
      }
    ]
  }, { contract, expectedCommit: commit });
  assert.equal(identity.commit, commit);
  assert.throws(
    () => validateIdentity({
      schema: 'okf-publication-deployment-identity.v1',
      repository: { ...contract.repository, name: 'other' },
      commit,
      materials: [
        {
          path: 'okf.publication.json',
          bytes: 12,
          sha256: 'd'.repeat(64)
        }
      ]
    }, { contract, expectedCommit: commit }),
    /repository name differs/
  );
});
