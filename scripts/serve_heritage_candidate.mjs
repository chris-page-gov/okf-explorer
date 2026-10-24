/** Serve the assembled public Site and checked Heritage corpus for local evidence. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portText = process.env.HERITAGE_EVIDENCE_PORT || '8002';
if (!/^[1-9][0-9]{0,4}$/.test(portText) || Number(portText) > 65535) throw Error('HERITAGE_EVIDENCE_PORT must be 1 to 65535.');
const site = path.join(repository, '_site');
const corpus = path.join(repository, 'evaluation/heritage');
for (const file of [path.join(site, 'okf-explorer-build-manifest.json'), path.join(corpus, 'okf-explorer.json')]) {
  if (!fs.statSync(file).isFile()) throw Error('Build the exact app/Site and retain the checked Heritage corpus first.');
}
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.gz':'application/gzip', '.svg':'image/svg+xml', '.md':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.woff2':'font/woff2' };
function fileIn(root, relative) {
  let file = path.resolve(root, '.' + relative);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    return fs.statSync(file).isFile() && fs.realpathSync(file).startsWith(fs.realpathSync(root) + path.sep) ? file : null;
  } catch { return null; }
}
http.createServer((request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const route = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = route.startsWith('/publication/')
      ? fileIn(corpus, route.slice('/publication'.length))
      : fileIn(site, route) || fileIn(corpus, route);
    if (!file) { response.writeHead(404).end('Not found'); return; }
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.setHeader('Content-Length', fs.statSync(file).size);
    response.setHeader('Cache-Control', 'no-store');
    if (request.method === 'HEAD') { response.end(); return; }
    fs.createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch { response.writeHead(400).end('Bad request'); }
}).listen(Number(portText), '127.0.0.1', () => console.log('Heritage candidate server ready on loopback port ' + portText));
