import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('candidate server contains its public roots and preserves corpus aliases', async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'heritage-server-'));
  let server;
  try {
    const write = async (relative, value) => {
      const file = path.join(fixture, relative);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, value);
    };
    await write('_site/index.html', 'Assembled Site');
    await write('_site/okf-explorer-build-manifest.json', '{}');
    await write('evaluation/heritage/okf-explorer.json', '{"id":"corpus"}');
    await write('evaluation/heritage/tiny/test.json', '{"id":"tiny"}');
    await write('outside.txt', 'Outside the public roots');
    await fs.symlink(path.join(fixture, 'outside.txt'), path.join(fixture, '_site/outside-link.txt'));
    await fs.mkdir(path.join(fixture, 'scripts'));
    await fs.copyFile(new URL('./serve_heritage_candidate.mjs', import.meta.url), path.join(fixture, 'scripts/server.mjs'));
    const reservation = net.createServer().listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    server = spawn(process.execPath, [path.join(fixture, 'scripts/server.mjs')], {
      env: { ...process.env, HERITAGE_EVIDENCE_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Candidate server did not start')), 5000);
      server.once('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', code => { clearTimeout(timer); reject(Error('Candidate server exited: ' + code)); });
      server.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    });
    for (const [route, method, status, body] of [
      ['/', 'GET', 200, 'Assembled Site'],
      ['/publication/okf-explorer.json', 'GET', 200, '{"id":"corpus"}'],
      ['/okf-explorer.json', 'GET', 200, '{"id":"corpus"}'],
      ['/publication/tiny/test.json', 'GET', 200, '{"id":"tiny"}'],
      ['/okf-explorer.json', 'HEAD', 200, ''],
      ['/publication/%2e%2e/%2e%2e/outside.txt', 'GET', 404, 'Not found'],
      ['/outside-link.txt', 'GET', 404, 'Not found'],
      ['/okf-explorer.json', 'POST', 405, '']
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, { method });
      assert.equal(response.status, status, route);
      assert.equal(await response.text(), body, route);
    }
  } finally {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exit = once(server, 'exit');
      server.kill('SIGTERM');
      await exit;
    }
    await fs.rm(fixture, { recursive: true, force: true });
  }
});
