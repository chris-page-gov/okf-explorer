import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, symlink, rm, lstat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { exportArchive } from './export.ts';
import { prepareSynthetic, syntheticContext, retainedRegistry } from './fixtures.ts';
import { boundedFile, readAdmittedRegularFile } from './files.mjs';
import { canonical, strictJson, sha256, joinEvidence, LIMITS } from './shared.mjs';
import { makeLoader, readStream, archiveUrl, validateDescriptor } from './reader.mjs';
import { validateLocalSchema } from './schema.mjs';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
async function fixture(t: any, context?: any) {
  const root = await mkdtemp(resolve(tmpdir(), 'okf-archive-test-')); t.after(() => rm(root, { recursive: true, force: true }));
  const input = resolve(root, 'input'); const data = await prepareSynthetic(input, context);
  return { root, input, output: resolve(root, 'output'), ...data };
}
async function localLoad(output: string) {
  return makeLoader('https://archive.test/examples/', new AbortController().signal, async (url: URL) => {
    const raw = await boundedFile(resolve(output, url.pathname.replace('/examples/', '')), 524288);
    return new Response(raw, { headers: { 'content-length': String(raw.length) } });
  });
}
async function verifyExport(output: string) {
  const inventory = JSON.parse(await readFile(resolve(output, 'artifact-manifest.json'), 'utf8'));
  for (const file of inventory.files) { const raw = await boundedFile(resolve(output, file.path), 524288); assert.equal(raw.length, file.bytes); assert.equal(await sha256(raw), file.sha256); }
  const index = JSON.parse(await readFile(resolve(output, 'index.json'), 'utf8'));
  for (const entry of index.cases) {
    const load = await localLoad(output), folder = entry.package_sha256;
    const d = validateDescriptor(await load(entry.path, entry.descriptor), entry);
    const text = await readStream(load, folder, d, 'package', d.sections.package);
    assert.equal(await sha256(text), folder); assert.equal(text, await readFile(resolve(output, folder, 'package.json'), 'utf8'));
    const recordIds = [];
    for (const ref of d.record_indexes) for (const row of await load(`${folder}/data/${ref.sha256}.json`, ref, LIMITS.catalogue_bytes)) {
      recordIds.push(row.id);
      const metadata = JSON.parse(await readStream(load, folder, d, 'record_metadata', row.metadata, row.id));
      const literal = await readStream(load, folder, d, 'record_text', row.text, row.id);
      assert.equal(await sha256(literal), metadata.record.text_reference.sha256);
    }
    assert.equal(recordIds.length, d.counts.records);
    assert.ok(entry.files <= 1024); assert.ok(entry.bytes <= 8388608);
  }
  return index;
}

test('non-DWP package round trip, safe Unicode, exact metadata and deterministic files', async t => {
  const f = await fixture(t, await syntheticContext('💷\n"Quoted" <script>alert(1)</script> '.repeat(2500)));
  assert.equal(f.context.selected.length,2);assert.equal(f.context.relationships.length,1);
  await exportArchive(resolve(f.input, 'registry.json'), f.input, f.output); await verifyExport(f.output);
  const second = resolve(f.root, 'second'); await exportArchive(resolve(f.input, 'registry.json'), f.input, second);
  assert.deepEqual(await readFile(resolve(f.output, 'artifact-manifest.json')), await readFile(resolve(second, 'artifact-manifest.json')));
});
test('actual retained current, historical and empty packages stay byte exact and insufficient', async t => {
  const f = await fixture(t); const registry = await retainedRegistry(REPO), path = resolve(f.root, 'actual.json'); await writeFile(path, canonical(registry));
  await exportArchive(path, REPO, f.output); const index = await verifyExport(f.output);
  assert.equal(index.cases.length, 3); assert.ok(index.cases.every((x:any) => x.evidence_status === 'insufficient'));
  const historical = JSON.parse(await readFile(resolve(f.output, index.cases[2].path), 'utf8')); assert.equal(historical.original_engine_id, null);
});
test('refuses existing output, changed package/receipt/question and unapproved cases', async t => {
  const f = await fixture(t); const path = resolve(f.input, 'registry.json'); await exportArchive(path, f.input, f.output);
  await assert.rejects(exportArchive(path, f.input, f.output), /EEXIST/);
  for (const mutate of [(x:any)=>x.cases[0].approved_publication=false,(x:any)=>x.cases[0].question_sha256='0'.repeat(64),(x:any)=>x.cases[0].receipt.sha256='0'.repeat(64),(x:any)=>x.cases[0].package.sha256='0'.repeat(64),(x:any)=>x.cases[0].package.path='../receipt.json']) {
    const value = structuredClone(f.registry); mutate(value); await writeFile(path, canonical(value));
    await assert.rejects(exportArchive(path, f.input, resolve(f.root, 'rejected')));
  }
});
test('refuses duplicate keys, unsafe paths and mixed descriptor identities', async t => {
  assert.throws(()=>strictJson('{"x":1,"x":2}'),/duplicate/);
  for (const path of ['../index.json','https://evil.test/x','a/data/file.json','index.json?url=x','%2e%2e/index.json']) assert.throws(()=>archiveUrl('https://archive.test/examples/',path));
  const f=await fixture(t); await exportArchive(resolve(f.input,'registry.json'),f.input,f.output);const index=JSON.parse(await readFile(resolve(f.output,'index.json'),'utf8'));
  const d=JSON.parse(await readFile(resolve(f.output,index.cases[0].path),'utf8')); assert.throws(()=>validateDescriptor({...d,package_sha256:'0'.repeat(64)},index.cases[0]));
});
test('bounded file admission rejects root/parent/file symlinks, oversized files and FIFO before open', async t => {
  const f=await fixture(t);await symlink(f.input,resolve(f.root,'linked'));
  await assert.rejects(boundedFile(resolve(f.root,'linked/registry.json'),65536),/symlink/);
  await symlink(resolve(f.input,'registry.json'),resolve(f.root,'link.json'));await assert.rejects(boundedFile(resolve(f.root,'link.json'),65536),/symlink/);
  await assert.rejects(boundedFile(resolve(f.input,'registry.json'),1),/bounded/);
  execFileSync('mkfifo',[resolve(f.root,'fifo')]);await assert.rejects(boundedFile(resolve(f.root,'fifo'),65536),/regular/);
  const race=resolve(f.root,'race');await writeFile(race,'admitted');const stat=await lstat(race);await rm(race);execFileSync('mkfifo',[race]);
  await assert.rejects(readAdmittedRegularFile(race,stat,65536),/changed/);
});
test('browser loader fails closed on altered, excessive, missing, redirected and noncanonical responses', async () => {
  const raw=canonical({safe:true}),ref={sha256:await sha256(raw),bytes:Buffer.byteLength(raw)};
  for(const response of [()=>new Response('changed'),()=>new Response(raw+'x'),()=>new Response('',{status:404}),()=>new Response('{"safe":false,"safe":true}')]) {
    const load=makeLoader('https://archive.test/',new AbortController().signal,async()=>response());await assert.rejects(load('index.json',ref));
  }
  const load=makeLoader('https://archive.test/',new AbortController().signal,async()=>({ok:true,redirected:true}));await assert.rejects(load('index.json',ref),/redirect/);
});
test('exact stream refuses gaps, missing parts and wrong content hash', async t => {
  const f=await fixture(t);await exportArchive(resolve(f.input,'registry.json'),f.input,f.output);
  const index=JSON.parse(await readFile(resolve(f.output,'index.json'),'utf8')),d=JSON.parse(await readFile(resolve(f.output,index.cases[0].path),'utf8'));
  const parts=await Promise.all(d.sections.package.map((r:any)=>readFile(resolve(f.output,d.package_sha256,'data',r.sha256+'.json'),'utf8').then(JSON.parse)));
  const expected={context_id:d.context_id,evidence_status:d.evidence_status,section:'package'};
  for(const mutate of [(x:any)=>x[0].offset=1,(x:any)=>x[0].next_offset=2,(x:any)=>x[0].content_sha256='0'.repeat(64)]) {const v=structuredClone(parts);mutate(v);await assert.rejects(joinEvidence(v,expected));}
});
test('gzip expansion, case census, invalid package schema and forged context identity fail closed', async t => {
  const f=await fixture(t), path=resolve(f.input,'registry.json');
  for(const mutate of [(x:any)=>x.cases=Array.from({length:21},()=>x.cases[0]),(x:any)=>x.cases.push(x.cases[0])]) {
    const v=structuredClone(f.registry);mutate(v);await writeFile(path,canonical(v));await assert.rejects(exportArchive(path,f.input,resolve(f.root,'rejected')));
  }
  for(const raw of [Buffer.alloc(524289,32),Buffer.from(canonical({...f.context,ai_answer:'Invented answer'})),Buffer.from(canonical({...f.context,context_id:'urn:sha256:'+'0'.repeat(64)}))]) {
    const bytes=gzipSync(raw),v=structuredClone(f.registry);await writeFile(resolve(f.input,'package.json.gz'),bytes);
    v.cases[0].package={...v.cases[0].package,bytes:bytes.length,sha256:await sha256(bytes),canonical_bytes:raw.length,canonical_sha256:await sha256(raw)};
    await writeFile(path,canonical(v));await assert.rejects(exportArchive(path,f.input,resolve(f.root,'rejected')));
  }
});
test('cancelled browser loads cannot display a verified value', async () => {
  const controller=new AbortController();controller.abort();const raw=canonical({safe:true});
  const load=makeLoader('https://archive.test/',controller.signal,async()=>new Response(raw));
  await assert.rejects(load('index.json',{bytes:Buffer.byteLength(raw),sha256:await sha256(raw)}),/cancelled|limit/);
});
test('rehashed packages cannot misstate record, edge, byte or depth budgets', async t => {
  const f=await fixture(t,await syntheticContext('Substantial synthetic evidence. '.repeat(2000)));
  for(const mutate of [(x:any)=>x.budget.used_nodes=0,(x:any)=>x.budget.used_relationships=0,(x:any)=>x.budget.max_nodes=1,(x:any)=>x.budget.max_depth=0,(x:any)=>x.budget.max_bytes=8192]) {
    const value=structuredClone(f.context);mutate(value);
    value.context_id='urn:sha256:'+await sha256(canonical({...value,context_id:undefined,budget:{...value.budget,used_bytes:undefined}}));
    for(let i=0;i<4;i++)value.budget.used_bytes=Buffer.byteLength(canonical(value));
    const raw=Buffer.from(canonical(value)),encoded=gzipSync(raw),registry=structuredClone(f.registry);
    registry.cases[0].package={...registry.cases[0].package,bytes:encoded.length,sha256:await sha256(encoded),canonical_bytes:raw.length,canonical_sha256:await sha256(raw)};
    await writeFile(resolve(f.input,'package.json.gz'),encoded);await writeFile(resolve(f.input,'registry.json'),canonical(registry));
    await assert.rejects(exportArchive(resolve(f.input,'registry.json'),f.input,resolve(f.root,'rejected')),/cross-field/);
  }
});
test('schema admission treats prototype names as unexpected fields and absent definitions',()=>{
  for(const key of ['constructor','__proto__','toString','extra']) {
    assert.throws(()=>validateLocalSchema(JSON.parse(`{"${key}":1}`),{type:'object',properties:{},additionalProperties:false},{}),/unexpected/);
    assert.throws(()=>validateLocalSchema(1,{$ref:`common.schema.json#/$defs/${key}`},{$defs:{}}),/missing|non-local/);
  }
  assert.throws(()=>validateLocalSchema('x',{oneOf:[{unknownFutureConstraint:1},{type:'string'}]},{}),/unsupported/);
  assert.throws(()=>validateLocalSchema({},{type:'object',properties:{absent:{unknownFutureConstraint:1}}},{}),/unsupported/);
});
