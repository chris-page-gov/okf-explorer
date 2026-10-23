import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const packageDocument = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);
const packageVersion = packageDocument.version;
if (typeof packageVersion !== 'string' ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageVersion)) {
  throw new Error('package.json version must be a deterministic semantic version');
}

export default defineConfig({
  plugins: [sveltekit({
    preprocess: vitePreprocess(),
    adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
    paths: { relative: true },
    version: { name: packageVersion, pollInterval: 0 },
    prerender: {
      entries: ['*'],
      handleHttpError: ({ path, message }) => {
        // Documentation and profiles are assembled and link-checked later.
        if (/^\/(?:docs|profile)\//.test(path)) return;
        throw new Error(message);
      },
      handleMissingId: ({ path, message }) => {
        // Explorer hashes are record routes rather than DOM identifiers.
        if (path === '/explore/') return;
        throw new Error(message);
      }
    }
  })],
  // Keep existing source imports explicit rather than relying on Kit 2 defaults.
  resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) } },
  worker: {
    format: 'es'
  },
  build: {
    target: 'baseline-widely-available'
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/types.ts']
    }
  }
});
