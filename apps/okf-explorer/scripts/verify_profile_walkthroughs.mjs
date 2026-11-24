/** Click each profile guide's real link through the exact local Reader build. */
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readdir,readFile,realpath,stat,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {staticBuildFile} from './external_bundle_acceptance_contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const build=path.join(root,'apps/okf-explorer/build');
const buildFiles=new Map(JSON.parse(await readFile(path.join(build,'okf-explorer-build-manifest.json'))).materials.map(row=>[row.path,row]));
const output=path.resolve(process.argv[2]||'profile-guide-browser.json');
const publicBase='https://chris-page-gov.github.io/okf-explorer/';
const fixtures=[['prov','profiles/bounded-inference/v1/ontology'],['vocabulary','profiles/governed-vocabulary/v1/examples/vocabulary'],['missing-label','profiles/governed-vocabulary/v1/examples/missing-csv-label'],['boundaries','profiles/geospatial-boundary-pack/v1/examples/uk-countries-december-2025']].map(([id,relative])=>({id,root:path.join(root,relative),public:publicBase+relative.replace(/^profiles\//,'profile/')+'/'}));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const assert=(value,message)=>{if(!value)throw Error(message);};
const report={status:'failed',observed_at:new Date().toISOString(),scope:'Local exact guide links, unchanged profile data and current Reader; public publication and formal release remain separate.',journeys:[],asset_sweeps:[]};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.md':'text/plain','.nt':'application/n-triples','.ttl':'text/turtle'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');let base,relative;
  const fixture=fixtures.find(f=>url.pathname.startsWith('/fixtures/'+f.id+'/'));
  if(fixture){base=fixture.root;relative=url.pathname.slice(('/fixtures/'+fixture.id+'/').length);}
  else{base=build;relative=staticBuildFile(url.pathname.replace(/^\//,''),buildFiles);if(relative==='404.html'&&url.pathname!=='/404.html')throw Error('Unknown app route');}
  relative=decodeURIComponent(relative);assert(!relative.includes('\\')&&!relative.split('/').includes('..'),'Unsafe static path');
  const file=await realpath(path.resolve(base,relative));assert(file.startsWith(await realpath(base)+path.sep),'Static path escaped');
  const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','access-control-allow-origin':'*','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const local='http://127.0.0.1:'+server.address().port;
let browser;
async function files(directory,prefix=''){
 const result=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  assert(!entry.isSymbolicLink(),'Fixture symlink rejected');const relative=prefix+entry.name;
  if(entry.isDirectory())result.push(...await files(path.join(directory,entry.name),relative+'/'));
  else if(entry.isFile())result.push(relative);
 }
 return result.sort();
}
try{
 await stat(path.join(build,'okf-explorer-build-manifest.json'));
 browser=await chromium.launch({channel:'chrome',chromiumSandbox:true});
 for(const fixture of fixtures){
  const evidence=JSON.parse(await readFile(path.join(fixture.root,'walkthrough-evidence.json')));const record=evidence.records[0];
  for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){
   const context=await browser.newContext({viewport,serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];report.current={fixture:fixture.id,viewport:viewport.name,errors};
   page.on('framenavigated',frame=>{if(frame===page.mainFrame())report.current.url=frame.url();});
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
   await context.route(publicBase+'**',async route=>{
    const url=new URL(route.request().url());const owner=fixtures.find(f=>url.href.startsWith(f.public));
    if(url.pathname==='/okf-explorer/explore/'&&url.searchParams.get('bundle')===fixture.public+'okf-explorer.json'){
     const target=new URL('/explore/',local);for(const [key,value]of url.searchParams)target.searchParams.set(key,value);target.searchParams.set('bundle',local+'/fixtures/'+fixture.id+'/okf-explorer.json');target.hash=record.route||'dataset/'+record.name;await route.fulfill({status:302,headers:{location:target.href}});return;
    }
    const target=owner?local+'/fixtures/'+owner.id+'/'+url.href.slice(owner.public.length):local+'/'+url.pathname.slice('/okf-explorer/'.length)+url.search;
    const response=await route.fetch({url:target});await route.fulfill({response});
   });
   const response=await page.goto(local+'/fixtures/'+fixture.id+'/walkthrough.html',{waitUntil:'domcontentloaded'});assert(response.ok(),'Guide unavailable');
   const guideAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert(!guideAxe.violations.length,'Guide accessibility: '+JSON.stringify(guideAxe.violations.map(v=>v.id)));
   const screenshot=output.replace(/\.json$/,'')+'-'+fixture.id+'-'+viewport.name;await page.screenshot({path:screenshot+'-guide.png',fullPage:true});
   const link=page.getByRole('link',{name:'Inspect '+record.title+' in Reader',exact:true});const href=await link.getAttribute('href');assert(new URL(href).searchParams.get('bundle')===fixture.public+'okf-explorer.json','Wrong authored bundle link');
   await link.click();const heading=page.locator('.right-panel h2').filter({hasText:record.title}).first();
   async function details(){
    if(viewport.width<1100&&!await heading.isVisible()){
     const button=page.getByRole('button',{name:'Details',exact:true});if(await button.isVisible())await button.click();else await page.getByRole('button',{name:'Inspect',exact:true}).click();
    }else if(viewport.width>=1100){const toggle=page.getByRole('button',{name:'Toggle details'});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();}
    await heading.waitFor({state:'visible'});
   }
   await details();const expected=record.route||'dataset/'+record.name;assert(new URL(page.url()).searchParams.get('bundle')===local+'/fixtures/'+fixture.id+'/okf-explorer.json','Wrong controlled bundle');assert(decodeURIComponent(new URL(page.url()).hash.slice(1))===expected,'Guide selected a different record');
   const readerAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert(!readerAxe.violations.length,'Reader accessibility: '+JSON.stringify(readerAxe.violations.map(v=>v.id)));
   await page.screenshot({path:screenshot+'-reader.png',fullPage:true});await page.reload({waitUntil:'domcontentloaded'});await details();assert(decodeURIComponent(new URL(page.url()).hash.slice(1))===expected,'Reload lost exact record');assert(!errors.length,'Browser errors: '+errors.join('; '));
   report.journeys.push({fixture:fixture.id,viewport:viewport.name,guide_sha256:sha(await readFile(path.join(fixture.root,'walkthrough.html'))),reader_route:expected,guide_axe:0,reader_axe:0,reload:true,errors});await context.close();console.log('Passed '+fixture.id+'/'+viewport.name);
  }
  let bytes=0;const rows=[];
  for(const relative of await files(fixture.root)){
   const original=await readFile(path.join(fixture.root,relative));const response=await fetch(local+'/fixtures/'+fixture.id+'/'+relative.split('/').map(encodeURIComponent).join('/'),{signal:AbortSignal.timeout(15000)});const actual=Buffer.from(await response.arrayBuffer());assert(response.ok&&sha(actual)===sha(original),'Asset response differs: '+relative);bytes+=actual.length;rows.push(relative+'\t'+actual.length+'\t'+sha(actual)+'\n');
  }
  report.asset_sweeps.push({fixture:fixture.id,files:rows.length,bytes,response_manifest_sha256:sha(rows.join(''))});
 }
 report.status='passed';report.browser=browser.version();
}catch(error){report.failure=String(error.stack||error);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,journeys:report.journeys.length,failure:report.failure}));}
