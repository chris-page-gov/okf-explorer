import assert from 'node:assert/strict';
import test from 'node:test';
import { merge } from '../node_modules/@sveltejs/vite-plugin-svelte/src/utils/options.js';

test('configuration merge prevents returned-object prototype poisoning across target shapes', () => {
  for (const target of [{ session: null }, { session: false }, { session: [] }, {}]) {
    const result = merge(target, JSON.parse('{"session":{"__proto__":{"admin":true}}}'));
    assert.equal(Object.getPrototypeOf(result.session), Object.prototype);
    assert.equal(result.session.admin, undefined);
    assert.equal({}.admin, undefined);
    assert.equal(Object.hasOwn(result.session, '__proto__'), true);
  }
});

test('constructor and null-prototype inputs cannot modify shared prototypes', () => {
  const payload = JSON.parse('{"constructor":{"prototype":{"admin":true}},"__proto__":{"admin":true}}');
  const input = Object.assign(Object.create(null), payload);
  const result = merge(input, { normal: true });
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(result.admin, undefined);
  assert.equal({}.admin, undefined);
  assert.equal(result.normal, true);
});

test('configuration precedence, array replacement and source isolation are preserved', () => {
  const defaults = { compilerOptions: { css: 'external', dev: false }, extensions: ['.svelte'] };
  const extensions = ['.html'];
  const result = merge(defaults, undefined, null, { compilerOptions: { dev: true }, extensions });
  assert.deepEqual(result, { compilerOptions: { css: 'external', dev: true }, extensions });
  assert.equal(result.extensions, extensions);
  result.compilerOptions.css = 'injected';
  assert.equal(defaults.compilerOptions.css, 'external');
  assert.deepEqual(merge({ a: 1, b: {} }, { a: undefined, b: null }), { a: undefined, b: null });
});

test('functions, regular expressions, symbols and preprocessor instances retain behaviour', () => {
  class Preprocessor { markup() { return 'processed'; } }
  const preprocess = new Preprocessor();
  const onwarn = () => {};
  const include = /svelte$/;
  const symbol = Symbol('option');
  const result = merge({ preprocess: {} }, { preprocess, onwarn, include, [symbol]: 42 });
  assert.equal(result.preprocess, preprocess);
  assert.equal(result.preprocess.markup(), 'processed');
  assert.equal(result.onwarn, onwarn);
  assert.equal(result.include, include);
  assert.equal(result[symbol], 42);
});
