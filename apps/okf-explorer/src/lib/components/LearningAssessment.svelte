<script lang="ts">
  import { onMount } from 'svelte';
  import type { LargeLearning } from '$lib/viewer/largeLearning';
  import { canonical, verifyAssessment, matchesProgramme, passedPaths, validSubmission, type Submission, type SignedAssessment } from '$lib/viewer/learningAssessment';
  let { presentation, snapshot }: { presentation: LargeLearning; snapshot: string } = $props();
  let learner = $state('');
  let drafts = $state<Record<string,string>>({});
  let attempts = $state<Submission[]>([]);
  let receipts = $state<SignedAssessment[]>([]);
  let message = $state('');
  let ready = $state(false);
  const programme = $derived(presentation.programme!);
  const binding = $derived({programme:programme.id,version:programme.version,snapshot,learner});
  const key = $derived(`okf-learning:${programme.id}`);
  const passed = $derived(passedPaths(receipts,binding,presentation.paths.map(p=>({id:p.id,prerequisites:p.prerequisites??[]}))));
  const historical = $derived(receipts.filter(r=>!matchesProgramme(r.assessment.submission,binding)).length);
  function save() {
    try { localStorage.setItem(key,JSON.stringify({learner,drafts,attempts,receipts})); }
    catch { message='Browser storage is unavailable or full. Export your learning journal before leaving.'; }
  }
  function download(name:string,value:unknown) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function restore(raw:unknown) {
    const v=raw as {learner:string;drafts:Record<string,string>;attempts:Submission[];receipts:unknown[]};
    if(!v||typeof v.learner!=='string'||!/^learner-[a-zA-Z0-9-]{1,100}$/.test(v.learner)||!Array.isArray(v.attempts)||v.attempts.length>500||v.attempts.some(s=>!validSubmission(s)||s.learner!==v.learner)||!Array.isArray(v.receipts)||v.receipts.length>500)throw Error('Invalid learning journal.');
    const checked:SignedAssessment[]=[];
    for(const receipt of v.receipts) checked.push(await verifyAssessment(receipt,programme.assessors));
    if(checked.some(r=>!v.attempts.some(s=>canonical(s)===canonical(r.assessment.submission))))throw Error('An assessment has no matching submitted attempt.');
    const cleanDrafts:Record<string,string>={};
    for(const [id,value] of Object.entries(v.drafts??{})) if(presentation.paths.some(p=>p.id===id)&&typeof value==='string'&&value.length<=20000)cleanDrafts[id]=value;
    learner=v.learner;drafts=cleanDrafts;attempts=v.attempts;receipts=checked;
  }
  onMount(()=>{void(async()=>{
    learner=`learner-${crypto.randomUUID()}`;
    try {const raw=localStorage.getItem(key);if(raw)await restore(JSON.parse(raw));}
    catch {message='Stored progress could not be verified. It has not been accepted; import a valid journal to recover it.';}
    ready=true;
  })();});
  async function submit(id:string) {
    const path=presentation.paths.find(p=>p.id===id)!;
    if(!ready||(path.prerequisites??[]).some(p=>!passed.has(p)))return;
    const s:Submission={schema:'okf-learning-submission.v1',...binding,path:id,attempt:crypto.randomUUID(),submitted_at:new Date().toISOString(),artefact:drafts[id]??''};
    if(!validSubmission(s)){message='Provide an artefact of 20 to 20,000 characters before submitting.';return;}
    if(attempts.length>=500){message='The journal has reached its 500-attempt limit. Export it before starting a new workspace.';return;}
    attempts=[...attempts,s];save();download(`${id}-${s.attempt}.submission.json`,s);message='Submission exported for an assessor. This does not award a pass.';
  }
  async function importFile(event:Event,journal=false) {
    const input=event.currentTarget as HTMLInputElement,file=input.files?.[0];if(!file)return;
    try {
      if(file.size>24000000)throw Error('The file exceeds the 24 MB journal limit.');
      const raw=JSON.parse(await file.text());
      if(journal){await restore(raw);message='Journal restored; signatures have been verified.';}
      else {
        const receipt=await verifyAssessment(raw,programme.assessors),s=receipt.assessment.submission;
        if(!matchesProgramme(s,binding)||!presentation.paths.some(p=>p.id===s.path))throw Error('This decision belongs to another learner, programme version or bundle snapshot.');
        if(!attempts.some(a=>canonical(a)===canonical(s)))throw Error('No matching submitted artefact exists in this journal.');
        if(receipts.some(r=>r.signature===receipt.signature))throw Error('This decision is already in the journal.');
        if(receipts.length>=500)throw Error('Export this full journal before starting a new workspace.');
        receipts=[...receipts,receipt];message='Assessor decision verified and recorded.';
      }
      save();
    }catch(e){message=e instanceof Error?e.message:'The file could not be imported.';}finally{input.value='';}
  }
</script>
<section aria-label="Assessed learning" class="assessed">
  <h3>Evidence and assessment</h3>
  <p>Practice ticks do not award a pass. Export an artefact for a named programme assessor, then import their signed decision. This is an independent teaching programme, not a DWP qualification or an entitlement decision.</p>
  <p>Use fictional examples only. Your journal stays in this browser until you export it. Learner key: <code>{learner}</code>.</p>
  <p>Assessed paths: {passed.size}/{presentation.paths.length}. {#if historical}{historical} historical decisions need review for this version or source snapshot.{/if}</p>
  {#if !programme.assessors.length}<p>No assessors are configured for this programme. Submissions can be prepared; assessed progression needs a producer-configured assessor.</p>{:else}<p>Programme assessors: {programme.assessors.map(a=>a.name).join(', ')}.</p>{/if}
  <label>Import assessor decision <input type="file" accept="application/json,.json" onchange={e=>importFile(e)} disabled={!ready}/></label>
  <button type="button" disabled={!ready} onclick={()=>download('learning-journal.json',{learner,drafts,attempts,receipts})}>Export learning journal</button>
  <label>Restore learning journal (replaces this workspace) <input type="file" accept="application/json,.json" onchange={e=>importFile(e,true)} disabled={!ready}/></label>
  {#each presentation.paths as path}
    {@const missing=(path.prerequisites??[]).filter(p=>!passed.has(p))}
    {@const decisions=receipts.filter(r=>r.assessment.submission.path===path.id&&matchesProgramme(r.assessment.submission,binding))}
    <details>
      <summary>{path.title} — {passed.has(path.id)?'assessed pass':missing.length?'prerequisites awaiting assessment':decisions.length?'review decision and feedback':attempts.some(a=>a.path===path.id&&matchesProgramme(a,binding))?'submitted':'ready to practise'}</summary>
      <p>{path.assessment}</p>
      {#if missing.length}<p>Before submitting, obtain assessed passes for: {missing.map(id=>presentation.paths.find(p=>p.id===id)?.title??id).join('; ')}. You can still read every lesson and source.</p>{/if}
      <p>Rubric: traceability, scope, reasoning, counterexample and communication; each 0–2. Pass requires 8/10, full marks for traceability, scope and counterexample, and no critical failure.</p>
      <label>Assessment artefact for {path.title}<textarea rows="5" maxlength="20000" value={drafts[path.id]??''} oninput={e=>{drafts={...drafts,[path.id]:e.currentTarget.value};save();}} placeholder="Record the claim, exact evidence and version, qualifications, changed scenario, gaps and your conclusion." disabled={!ready}></textarea></label>
      <button type="button" disabled={!ready||missing.length>0} onclick={()=>submit(path.id)}>Export submission for {path.id}</button>
      {#each decisions as receipt}
        <p><strong>{receipt.assessment.decision==='passed'?'Assessor pass':'Changes required'}</strong> · {receipt.assessment.assessed_at} · {receipt.assessment.scores.reduce((a,b)=>a+b,0)}/10<br/>{receipt.assessment.feedback}</p>
      {/each}
    </details>
  {/each}
  {#if message}<p role="status">{message}</p>{/if}
</section>
<style>
  .assessed{border-top:2px solid #b6c9d5;margin-top:1rem;padding-top:1rem}summary{cursor:pointer;font-weight:700;padding:.75rem 0}label{display:block;margin:.75rem 0}textarea{display:block;width:100%;box-sizing:border-box;font:inherit}button,input{max-width:100%;font:inherit;margin:.4rem 0}button{padding:.5rem}p,code{overflow-wrap:anywhere}button:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #ffdd00;outline-offset:3px}
</style>
