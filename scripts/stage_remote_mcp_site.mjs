#!/usr/bin/env node
// Export reviewed source into a separate Sites checkout; never copy a second engine.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';

const args = process.argv.slice(2);
const output = args[0] && resolve(args[0]);
if (!output || args.length !== 1) throw new Error('Usage: node scripts/stage_remote_mcp_site.mjs /absolute/site-checkout');
const repo = resolve(import.meta.dirname, '..');
if (!relative(repo, output).startsWith('..')) throw new Error('Use a separate checkout outside the source repository.');
const git = (...values) => execFileSync('git', values, { cwd: repo, encoding: 'utf8' }).trim();
const paths = ['services/ask-okf-mcp', 'apps/okf-explorer/src/lib/context', 'profiles/context-assembly/v1', 'LICENSE'];
if (git('status', '--porcelain', '--', ...paths)) throw new Error('Commit and review the service inputs before staging.');
const commit = git('rev-parse', '--verify', 'HEAD');
const files = git('ls-tree', '-r', '--name-only', commit, '--', ...paths).split('\n').filter(Boolean);
if (!files.includes('services/ask-okf-mcp/src/worker.ts')) throw new Error('The committed Worker entry point is missing.');
const manifest = resolve(output, '.openai/hosting.json');
if (!existsSync(manifest) || !JSON.parse(readFileSync(manifest, 'utf8')).project_id) throw new Error('Register the Site once and preserve its project_id before staging.');
for (const file of files) {
  if (file.split('/').includes('..') || file.startsWith('/')) throw new Error('Unsafe Git path.');
  const destination = resolve(output, file);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, execFileSync('git', ['show', `${commit}:${file}`], { cwd: repo }));
}
writeFileSync(resolve(output, 'upstream.json'), JSON.stringify({ repository: 'https://github.com/chris-page-gov/okf-explorer', commit, paths, files }, null, 2) + '\n');
writeFileSync(resolve(output, 'package.json'), JSON.stringify({ name: 'ask-okf-service-deployment', private: true, type: 'module', scripts: { build: 'npm --prefix services/ask-okf-mcp run build && node stage-build.mjs' } }, null, 2) + '\n');
writeFileSync(resolve(output, 'stage-build.mjs'), `import {cpSync,mkdirSync,rmSync} from 'node:fs';\nrmSync('dist',{recursive:true,force:true});\nmkdirSync('dist/server',{recursive:true});\ncpSync('services/ask-okf-mcp/dist/server/index.js','dist/server/index.js');\ncpSync('.openai','dist/.openai',{recursive:true});\n`);
writeFileSync(resolve(output, '.gitignore'), 'node_modules/\ndist/\n.env*\n');
writeFileSync(resolve(output, 'README.md'), `# Ask OKF service deployment\n\nThis checkout packages the unchanged Ask OKF core and remote adapter from Explorer commit \`${commit}\`.\nThe public service is an independent experimental publication, not an official DWP service.\n\nRun \`npm --prefix services/ask-okf-mcp ci --ignore-scripts\`, then \`npm run build\`.\nHosting manifest registration is managed through Sites. See the source service README for tests and limits.\n`);
console.log(JSON.stringify({ output, source_commit: commit, exported_files: files.length }));
