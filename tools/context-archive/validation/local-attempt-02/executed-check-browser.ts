#!/usr/bin/env node
/** Actual local browser acceptance. No public network requests or model calls. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { exportArchive } from './export.ts';
import { prepareSynthetic, retainedRegistry } from './fixtures.ts';
import { canonical, sha256 } from './shared.mjs';
import { boundedFile } from './files.mjs';
const REPO=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
assert.equal(args.length,4);assert.equal(args[0],'--playwright-module');assert.equal(args[2],'--output');
const output=resolve(args[3]);await mkdir(output); // Fresh observation directory, including failures.
const started=new Date().toISOString(), work=await mkdtemp(resolve(tmpdir(),'okf-archive-browser-'));
let browser:any, server:any;const requests:any[]=[], errors:string[]=[], assertions:string[]=[];
const report:any={schema:'okf-context-archive-local-browser.v1',started_at:started,network_scope:'loopback-only',model_calls:0,public_calls:0,assertions,errors,requests};
try {
  const input=resolve(work,'input');const {registry}=await prepareSynthetic(input);
  const actual=await retainedRegistry(REPO);
  for(const entry of actual.cases) for(const file of [entry.package,entry.receipt]) {
    const to=resolve(input,file.path);await mkdir(dirname(to),{recursive:true});await copyFile(resolve(REPO,file.path),to);
  }
  registry.cases.push(...actual.cases as any[]);await writeFile(resolve(input,'registry.json'),canonical(registry));
  const archive=resolve(work,'archive');report.export=await exportArchive(resolve(input,'registry.json'),input,archive);
  const inventoryRaw=await boundedFile(resolve(archive,'artifact-manifest.json'),4194304);report.artifact_manifest_sha256=await sha256(inventoryRaw);
  await writeFile(resolve(output,'artifact-manifest.json'),inventoryRaw,{flag:'wx'});
  await writeFile(resolve(output,'executed-check-browser.ts'),await readFile(fileURLToPath(import.meta.url)),{flag:'wx'});
  let tamper=false;
  server=createServer(async(req,res)=>{
    try {
      assert.equal(req.method,'GET');const url=new URL(req.url!,'http://localhost');let path=url.pathname.slice(1)||'index.html';
      assert.match(path,/^(?:index\.html|index\.json|reader\.mjs|shared\.mjs|reader\.css|[a-f0-9]{64}\/(?:descriptor\.json|package\.json|data\/[a-f0-9]{64}\.json))$/);
      let raw=await boundedFile(resolve(archive,path),524288);
      if(tamper&&path.endsWith('/descriptor.json'))raw=Buffer.from(raw.toString().replace('okf-context-archive.v1','okf-context-archive.v0'));
      requests.push({path,status:200,bytes:raw.length,sha256:await sha256(raw),tampered:tamper});
      res.writeHead(200,{'Content-Type':({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json'} as any)[extname(path)],'Content-Length':raw.length,'Cache-Control':'no-store'});res.end(raw);
    }catch{res.writeHead(404);res.end();}
  });await new Promise<void>((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const {chromium}=await import(pathToFileURL(resolve(args[1])).href);
  browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
  const page=await browser.newPage({viewport:{width:1100,height:850}});
  await page.route('**/*',async(route:any)=>{if(new URL(route.request().url()).origin!==origin){errors.push('Unexpected external request blocked');await route.abort();}else await route.continue();});
  page.on('pageerror',(error:any)=>errors.push(error.message));page.on('console',(message:any)=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(origin);await page.getByRole('link',{name:'Fictional museum room',exact:true}).waitFor();
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Skip to evidence');assertions.push('keyboard skip-link focus');
  await page.getByRole('link',{name:'Fictional museum room',exact:true}).click();
  await page.getByRole('button',{name:'Read evidence: Fictional room',exact:true}).click();
  await page.getByText('Complete selected value verified against its retained hash.',{exact:true}).waitFor();
  const detail=page.getByRole('region',{name:'Verified evidence detail'});
  assert.match(await detail.textContent(),/<script>unsafe\(\)<\/script>/);assert.equal(await page.locator('script:not([src])').count(),0);
  assert.match(await detail.textContent(),/Fictional edition month: 2026-04/);assert.match(await detail.textContent(),/Captured: 2026-09-21/);
  assertions.push('synthetic exact Unicode/text, inert markup, distinct source/capture dates, provenance');
  await page.screenshot({path:resolve(output,'synthetic-reader.png'),fullPage:true});
  for(const entry of actual.cases) {
    await page.getByRole('link',{name:entry.title,exact:true}).click();
    await page.getByRole('button',{name:'Verify complete machine package',exact:true}).waitFor();
    const context=JSON.parse(gunzipSync(await readFile(resolve(REPO,entry.package.path))).toString());
    assert.match(await page.locator('#example').textContent(),/Evidence insufficient/);
    assert.equal(await page.getByRole('button',{name:/^Read evidence:/}).count(),context.selected.length);
    if(context.selected.length) {
      const row=context.selected.find((x:any)=>x.record.kind==='evidence')||context.selected[0];
      await page.getByRole('button',{name:`Read evidence: ${row.record.label}`,exact:true}).click();
      await page.getByText('Complete selected value verified against its retained hash.',{exact:true}).waitFor();
      assert.equal(await detail.locator('pre').first().textContent(),row.record.text);
      await page.getByRole('button',{name:'Read directed relationships',exact:true}).click();
      await detail.getByRole('heading',{name:'Directed relationships',exact:true}).waitFor();
      assert.equal(await detail.locator('li').count(),context.relationships.length);
    }else{await page.getByText('No records selected. This empty result does not answer the question.',{exact:true}).waitFor();}
    await page.getByRole('button',{name:'Verify complete machine package',exact:true}).click();
    await detail.getByRole('heading',{name:'Complete machine package',exact:true}).waitFor();
    assert.equal(await sha256(await detail.locator('pre').textContent()),entry.package.canonical_sha256);
    assertions.push(`${entry.id}: exact selected census, insufficient status and canonical package hash`);
  }
  await page.setViewportSize({width:390,height:844});await page.getByRole('link',{name:actual.cases[0].title,exact:true}).click();
  await page.getByRole('button',{name:'Read directed relationships',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assertions.push('390px mobile layout without horizontal overflow');
  await page.screenshot({path:resolve(output,'care-home-mobile.png')});
  tamper=true;await page.getByRole('link',{name:actual.cases[1].title,exact:true}).click();
  await page.getByText('Evidence unavailable: Archive rejected: resource hash differs',{exact:true}).waitFor();assert.equal(await page.locator('#example').isVisible(),false);
  assertions.push('tampered descriptor hides previous evidence and fails closed');
  assert.deepEqual(errors,[]);report.outcome='passed';
}catch(error:any){report.outcome='failed';report.failure={name:error.name,message:error.message};process.exitCode=1;}
finally{
  await browser?.close();if(server?.listening)await new Promise<void>(done=>server.close(done));await rm(work,{recursive:true,force:true});
  report.completed_at=new Date().toISOString();report.executed_harness_sha256=await sha256(await readFile(fileURLToPath(import.meta.url)));
  await writeFile(resolve(output,'observation.json'),canonical(report),{flag:'wx'});
  console.log(JSON.stringify({outcome:report.outcome,assertions:assertions.length,requests:requests.length,errors:errors.length,failure:report.failure}));
}
