#!/usr/bin/env node
/** Prepare identical-evidence requests from a saved Explorer/Ask OKF context. No provider calls. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildRenderingRequest, MAX_INPUT_BYTES } from './explorer-adapter.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== '--context' || args[2] !== '--output') {
  throw new Error('Usage: node experiments/controlled-language/prepare.mjs --context SAVED_CONTEXT.json --output DIR');
}
const bytes = await readFile(args[1]);
if (bytes.length > MAX_INPUT_BYTES) throw new Error('Context exceeds input limit');
const context = JSON.parse(bytes);
const profiles = JSON.parse(await readFile(path.join(HERE, 'profiles.json'), 'utf8'));
await mkdir(args[3], { recursive: true });
for (const profile of Object.keys(profiles.profiles)) {
  const request = buildRenderingRequest(context, profiles, profile);
  await writeFile(path.join(args[3], profile + '.request.json'), JSON.stringify(request, null, 2) + '\n');
}
console.log('Prepared three requests with identical evidence; no model called. Keep the assessor separate.');
