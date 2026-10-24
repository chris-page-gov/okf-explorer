import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length !== 3) throw Error('Usage: node scripts/package_gis_learning_preview.mjs GIS_PROJECTION_ROOT NEW_OUTPUT_DIRECTORY GIS_SOURCE_REVISION');
const [projectionRoot, output] = args.slice(0, 2).map(value => path.resolve(value));
const sourceRevision = args[2];
if (!/^[0-9a-f]{40}$/.test(sourceRevision)) throw Error('Supply the actual GIS source commit.');
if (fs.existsSync(output)) throw Error('Retain existing candidates; choose a new output directory.');
const explorerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(explorerRoot, 'apps/okf-explorer/build');
const siteRoot = path.join(explorerRoot, '_site');
const appIdentity = JSON.parse(fs.readFileSync(path.join(appRoot, 'okf-explorer-build-manifest.json')));
for (const row of appIdentity.materials) {
  const bytes = fs.readFileSync(path.join(appRoot, row.path));
  if (bytes.length !== row.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== row.sha256) {
    throw Error('App build identity mismatch: ' + row.path);
  }
}
for (const name of ['explorer/okf-explorer.json', 'explorer/context/manifest.json']) {
  if (!fs.statSync(path.join(projectionRoot, name)).isFile()) throw Error('Missing projection: ' + name);
}
const contextIdentity = JSON.parse(fs.readFileSync(path.join(projectionRoot, 'explorer/context/manifest.json')));
if (contextIdentity.bundle?.source_url !== 'http://127.0.0.1:8130/gis/explorer/context/manifest.json') {
  throw Error('Generate the local context for http://127.0.0.1:8130/gis/explorer/context/ before packaging.');
}
for (const name of ['docs', 'profile', 'okf-bundle.json']) {
  if (!fs.existsSync(path.join(siteRoot, name))) throw Error('Build the Explorer Site before packaging its guides: ' + name);
}
fs.mkdirSync(output, { recursive: true });
fs.cpSync(appRoot, output, { recursive: true });
for (const name of ['docs', 'profile', 'okf-bundle.json', 'okf-bundle.jsonld', 'okf-bundle.yamlld', 'okf-registry.json', 'LICENSE-CODE.md', 'LICENSE.md']) {
  fs.cpSync(path.join(siteRoot, name), path.join(output, name), { recursive: true });
}
fs.cpSync(path.join(projectionRoot, 'explorer'), path.join(output, 'gis/explorer'), { recursive: true });
for (const name of ['LICENSE-CODE.md', 'LICENSE.md']) fs.copyFileSync(path.join(explorerRoot, name), path.join(output, 'EXPLORER-' + name));
fs.writeFileSync(path.join(output, 'start.html'), `<!doctype html>
<html lang="en-GB"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OS and ONS learning review</title>
<style>body{font:19px/1.6 system-ui;max-width:65ch;margin:3rem auto;padding:0 1rem}a{color:#005ea5}a:focus{background:#ffdd00;color:#000}li{margin:1rem 0}</style>
<h1>OS and ONS learning review</h1>
<p>Explore the retained OKF+ metadata through the existing OKF Explorer. Follow the pavement width, building heights and road elevation learning paths.</p>
<p><a href="explore/?bundle=%2Fgis%2Fexplorer%2Fokf-explorer.json#overview">Open Explorer and choose a learning path</a></p>
<p>Metadata and teaching guidance describe their dated sources and limitations. Missing evidence stays explicit. Practice progress is not an assessment. This preview makes no geographic feature-data requests and establishes no data entitlement.</p>
<p>Records and lessons work from this local package. Official source links need an internet connection. Use the Reader search to select a record, then inspect its field context and source references. Ask OKF assembles bounded evidence from the full retained corpus.</p>
<p><a href="START-HERE.md">Run and review this package</a> · <a href="PACKAGE-MANIFEST.json">Inspect package identity</a></p></html>\n`);
fs.writeFileSync(path.join(output, 'serve.mjs'), `import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=8130;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+rel);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.realpathSync(file).startsWith(fs.realpathSync(root)+path.sep)){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='HEAD'){res.end();return;}
  fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log('Open http://127.0.0.1:'+port+'/start.html'));
`);
fs.writeFileSync(path.join(output, 'START-HERE.md'), `# OS and ONS learning review\n\nRequires Node.js 24 or later. Keep the complete folder together and run:\n\n\`\`\`sh\nnode serve.mjs\n\`\`\`\n\nOpen http://127.0.0.1:8130/start.html in Chrome. Stop with Ctrl+C. Use HTTP because the Reader verifies and loads local shards. No package installation, API key or external service is needed. Port 8130 is fixed because the generated evidence passages bind that exact local URL. Regenerate the projections for another port.\n\nChoose each learning path, open its steps, inspect the source/version and explicit missing information, and follow the evidence links. Search for pavement width, building height and road elevation. Ask OKF retrieves bounded evidence; an insufficient result remains insufficient. Compare relative height, vertical datum and inferred terrain carefully.\n\nGIS source commit: ${sourceRevision}. The generated projection retains its input digest and context snapshot. PACKAGE-MANIFEST.json binds these exact candidate bytes; it is not a claim of release acceptance. The full metadata corpus is included; private captures, credentials and geographic feature payloads are excluded.\n`);
const files = [];
function walk(directory) {
  for (const name of fs.readdirSync(directory).sort()) {
    const file = path.join(directory, name);
    if (fs.statSync(file).isDirectory()) walk(file);
    else {
      const bytes = fs.readFileSync(file);
      files.push({ path: path.relative(output, file).split(path.sep).join('/'), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
walk(output);
fs.writeFileSync(path.join(output, 'PACKAGE-MANIFEST.json'), JSON.stringify({ schema: 'gis-okf-explorer-review.v1', gis_source_revision: sourceRevision, app_tree_sha256: appIdentity.tree_sha256, files }, null, 2) + '\n');
console.log(JSON.stringify({ output, files: files.length, bytes: files.reduce((sum, row) => sum + row.bytes, 0), app_tree_sha256: appIdentity.tree_sha256 }));
