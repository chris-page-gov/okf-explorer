import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

test('built Worker serves full evidence with dynamic code generation prohibited', async () => {
  const child = spawnSync(process.execPath, ['--disallow-code-generation-from-strings', '--input-type=module', '-e', `
    import worker from './dist/server/index.js';
    const question='A claimant is imprisoned. Explain the effect on JSA, IS, State Pension Credit and ESA, distinguishing loss of payment from loss of entitlement, and trace each conclusion to the relevant DMG guidance.';
    const r=await worker.fetch(new Request('https://ask-okf.crpage.chatgpt.site/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'ask_okf',arguments:{bundle:'okf-dwp',version:'efb05c66616a9cd4328a86cf412780fe7bc7cf0b',question}}})}));
    const text=await r.text();
    const data=JSON.parse(text.split('\\n').find(line=>line.startsWith('data: ')).slice(6));
    if(r.status!==200||data.result?.structuredContent?.context_id!=='urn:sha256:283cddceca09958b96949527280ea14775de5f26d092c939cacfaa545500e80e') process.exit(1);
    if(JSON.stringify(data.result.structuredContent)!==JSON.stringify(JSON.parse(data.result.content[0].text))) process.exit(2);
    await worker.close();
  `], { cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 10000 });
  assert.equal(child.status, 0, child.stderr + child.stdout);
  const receipt = JSON.parse(await readFile(new URL('../dist/build-receipt.json', import.meta.url), 'utf8'));
  assert.equal(receipt.worker_node_dependencies, false);
  assert.ok(Object.keys(receipt.inputs).some(path => path.endsWith('apps/okf-explorer/src/lib/context/index.ts')));
});
