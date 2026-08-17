import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const packageDocument = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
);
const packageVersion = packageDocument.version;
if (
  typeof packageVersion !== 'string' ||
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageVersion)
) {
  throw new Error('package.json version must be a deterministic semantic version');
}

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      strict: true
    }),
    paths: {
      relative: true
    },
    version: {
      name: packageVersion
    },
    prerender: {
      entries: ['*'],
      handleHttpError: ({ path, message }) => {
        // Documentation and profile pages are rendered by scripts/build_site.py
        // after SvelteKit has produced the application. The site-wide link
        // checker remains responsible for proving that these routes exist.
        if (/^\/(?:docs|profile)\//.test(path)) return;
        throw new Error(message);
      },
      handleMissingId: ({ path, message }) => {
        // Explorer hashes are durable application record routes, not DOM IDs.
        if (path === '/explore/') return;
        throw new Error(message);
      }
    }
  }
};

export default config;
