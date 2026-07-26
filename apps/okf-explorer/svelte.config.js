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
      fallback: '404.html',
      strict: true
    }),
    paths: {
      relative: true
    },
    version: {
      name: packageVersion
    },
    prerender: {
      entries: ['*']
    }
  }
};

export default config;
