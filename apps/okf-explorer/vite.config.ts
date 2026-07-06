import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
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
