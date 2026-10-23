import assert from 'node:assert/strict';
import test from 'node:test';

import { checkDependencyPolicy } from './check_dependency_policy.mjs';

function fixture() {
  return {
    manifest: {
      devDependencies: { '@sveltejs/kit': '3.1.0', vitest: '^4.1.12', '@vitest/coverage-v8': '^4.1.12' },
      pnpm: { overrides: { 'cookie@<0.7.2': '0.7.2' } }
    },
    lock: {
      overrides: { 'cookie@<0.7.2': '0.7.2' },
      importers: { '.': { devDependencies: {
        '@sveltejs/kit': { specifier: '3.1.0', version: '3.1.0' },
        vitest: { specifier: '^4.1.12', version: '4.1.12(@vitest/coverage-v8@4.1.12)' },
        '@vitest/coverage-v8': { specifier: '^4.1.12', version: '4.1.12(vitest@4.1.12)' }
      } } },
      packages: {
        'devalue@5.9.2': {},
        'nanoid@3.3.18': {},
        'cookie@0.7.2': {},
        'cookie@2.0.1': {},
        '@types/cookie@0.6.0': {},
        '@sveltejs/kit@3.1.0': {},
        'vitest@4.1.12': {},
        '@vitest/mocker@4.1.12': {},
        '@vitest/coverage-v8@4.1.12': {}
      },
      snapshots: {
        'devalue@5.9.2': {},
        'nanoid@3.3.18': {},
        'cookie@0.7.2': {},
        'cookie@2.0.1': {},
        '@sveltejs/kit@3.1.0': { dependencies: { cookie: '2.0.1' } },
        'vitest@4.1.12(@vitest/coverage-v8@4.1.12)': {
          dependencies: { '@vitest/mocker': '4.1.12' },
          optionalDependencies: { '@vitest/coverage-v8': '4.1.12(vitest@4.1.12)' }
        },
        '@vitest/mocker@4.1.12': {},
        '@vitest/coverage-v8@4.1.12(vitest@4.1.12)': {
          dependencies: { vitest: '4.1.12(@vitest/coverage-v8@4.1.12)' }
        }
      }
    }
  };
}

test('accepts patched dependencies and does not mistake @types/cookie for cookie', () => {
  const { manifest, lock } = fixture();
  assert.doesNotThrow(() => checkDependencyPolicy(manifest, lock));
});

for (const [name, vulnerable, safe] of [['devalue', '5.9.0', '5.9.2'], ['nanoid', '3.3.17', '3.3.18']]) {
  test(`rejects vulnerable ${name} copies`, () => {
    const { manifest, lock } = fixture();
    lock.packages[`${name}@${vulnerable}`] = {};
    lock.snapshots[`${name}@${vulnerable}`] = {};
    assert.throws(() => checkDependencyPolicy(manifest, lock), /below the reviewed minimum/);
  });
  test(`rejects vulnerable ${name} references with a safe inventory`, () => {
    const { manifest, lock } = fixture();
    lock.snapshots[`consumer@1.0.0`] = { dependencies: { [name]: vulnerable } };
    assert.throws(() => checkDependencyPolicy(manifest, lock), /below the reviewed minimum/);
    lock.snapshots[`consumer@1.0.0`].dependencies[name] = safe;
    assert.doesNotThrow(() => checkDependencyPolicy(manifest, lock));
  });
}

test('rejects a lost manifest override', () => {
  const { manifest, lock } = fixture();
  delete manifest.pnpm.overrides['cookie@<0.7.2'];
  assert.throws(() => checkDependencyPolicy(manifest, lock), /cookie override/);
});

test('rejects the lost lockfile override from the automated update', () => {
  const { manifest, lock } = fixture();
  delete lock.overrides['cookie@<0.7.2'];
  assert.throws(() => checkDependencyPolicy(manifest, lock), /cookie override/);
});

test('rejects both overrides removed even if the importer would otherwise match', () => {
  const { manifest, lock } = fixture();
  delete manifest.pnpm.overrides['cookie@<0.7.2'];
  delete lock.overrides['cookie@<0.7.2'];
  assert.throws(() => checkDependencyPolicy(manifest, lock), /cookie override/);
});

test('rejects an alternate vulnerable cookie snapshot', () => {
  const { manifest, lock } = fixture();
  lock.packages['cookie@0.6.0'] = {};
  lock.snapshots['cookie@0.6.0'] = {};
  assert.throws(() => checkDependencyPolicy(manifest, lock), /cookie@0\.6\.0/);
});

test('rejects a vulnerable cookie dependency reference', () => {
  const { manifest, lock } = fixture();
  lock.snapshots['@sveltejs/kit@3.1.0'].dependencies.cookie = '0.6.0';
  assert.throws(() => checkDependencyPolicy(manifest, lock), /cookie dependency/);
});

test('rejects mismatched coverage and Vitest versions', () => {
  const { manifest, lock } = fixture();
  lock.importers['.'].devDependencies['@vitest/coverage-v8'].version = '4.1.13(vitest@4.1.12)';
  lock.packages['@vitest/coverage-v8@4.1.13'] = {};
  lock.snapshots['@vitest/coverage-v8@4.1.13(vitest@4.1.12)'] = {
    dependencies: { vitest: '4.1.12(@vitest/coverage-v8@4.1.13)' }
  };
  assert.throws(() => checkDependencyPolicy(manifest, lock), /coverage-v8 version must match/);
});

test('rejects an importer resolution without its exact snapshot', () => {
  const { manifest, lock } = fixture();
  lock.importers['.'].devDependencies.vitest.version = '4.1.12(@vitest/coverage-v8@4.1.13)';
  assert.throws(() => checkDependencyPolicy(manifest, lock), /no matching snapshot/);
});

test('rejects a Vitest snapshot using mismatched coverage', () => {
  const { manifest, lock } = fixture();
  lock.snapshots['vitest@4.1.12(@vitest/coverage-v8@4.1.12)']
    .optionalDependencies['@vitest/coverage-v8'] = '4.1.13(vitest@4.1.12)';
  assert.throws(() => checkDependencyPolicy(manifest, lock), /coverage-v8@4\.1\.13 is absent from the package inventory/);
});

test('rejects an old mocker copy reached through a Vitest snapshot', () => {
  const { manifest, lock } = fixture();
  lock.packages['@vitest/mocker@4.1.11'] = {};
  lock.snapshots['@vitest/mocker@4.1.11'] = {};
  lock.snapshots['vitest@4.1.12(@vitest/coverage-v8@4.1.12)'].dependencies['@vitest/mocker'] = '4.1.11';
  assert.throws(() => checkDependencyPolicy(manifest, lock), /@vitest\/mocker@4\.1\.11/);
});

test('rejects missing package inventory for a resolved dependency', () => {
  const { manifest, lock } = fixture();
  delete lock.packages['@vitest/mocker@4.1.12'];
  assert.throws(() => checkDependencyPolicy(manifest, lock), /inventory or snapshot is missing/);
});

test('rejects prerelease versions until reviewed', () => {
  const { manifest, lock } = fixture();
  lock.packages['vitest@4.1.13-beta.1'] = {};
  lock.snapshots['vitest@4.1.13-beta.1'] = {};
  assert.throws(() => checkDependencyPolicy(manifest, lock), /stable version/);
});

test('rejects safe dependency inventory without its exact referenced snapshot', () => {
  const { manifest, lock } = fixture();
  delete lock.snapshots['devalue@5.9.2'];
  lock.packages['devalue@5.9.3'] = {};
  lock.snapshots['devalue@5.9.3'] = {};
  lock.snapshots['consumer@1.0.0'] = { dependencies: { devalue: '5.9.2' } };
  assert.throws(() => checkDependencyPolicy(manifest, lock), /no matching snapshot/);
});

test('rejects old duplicate coverage even when the direct pair is patched', () => {
  const { manifest, lock } = fixture();
  lock.packages['@vitest/coverage-v8@4.1.10'] = {};
  lock.snapshots['@vitest/coverage-v8@4.1.10(vitest@4.1.12)'] = {
    dependencies: { vitest: '4.1.12(@vitest/coverage-v8@4.1.12)' }
  };
  assert.throws(() => checkDependencyPolicy(manifest, lock), /below the reviewed minimum/);
});

test('rejects a patched alternate coverage copy with a mismatched Vitest peer', () => {
  const { manifest, lock } = fixture();
  lock.packages['@vitest/coverage-v8@4.1.13'] = {};
  lock.snapshots['@vitest/coverage-v8@4.1.13(vitest@4.1.12)'] = {
    dependencies: { vitest: '4.1.12(@vitest/coverage-v8@4.1.12)' }
  };
  assert.throws(() => checkDependencyPolicy(manifest, lock), /Every coverage-v8 snapshot/);
});

test('rejects an older framework and a cookie override that downgrades Kit 3', () => {
  const { manifest, lock } = fixture();
  manifest.devDependencies['@sveltejs/kit'] = '2.70.3';
  assert.throws(() => checkDependencyPolicy(manifest, lock), /manifest minimum/);
  manifest.devDependencies['@sveltejs/kit'] = '3.1.0';
  lock.packages['@sveltejs/kit@2.70.3'] = {};
  assert.throws(() => checkDependencyPolicy(manifest, lock), /below the reviewed minimum/);
  delete lock.packages['@sveltejs/kit@2.70.3'];
  lock.snapshots['@sveltejs/kit@3.1.0'].dependencies.cookie = '0.7.2';
  assert.throws(() => checkDependencyPolicy(manifest, lock), /cookie dependency/);
  lock.snapshots['@sveltejs/kit@3.1.0'].dependencies.cookie = '2.0.1';
  manifest.pnpm.overrides.cookie = '^0.7.2';
  assert.throws(() => checkDependencyPolicy(manifest, lock), /cookie override/);
});
