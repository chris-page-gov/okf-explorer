import { describe,it,expect } from 'vitest';
// @ts-expect-error -- Node-only test harness; browser application has no Node type dependency.
import { generateKeyPairSync,sign } from 'node:crypto';
import { canonical,sha256,verifyAssessment,passedPaths,meetsRubric,type Submission,type Assessment } from './learningAssessment';
const pair=generateKeyPairSync('ed25519');
const assessor={id:'facilitator',name:'Programme facilitator',public_key:pair.publicKey.export({format:'der',type:'spki'}).toString('base64')};
const binding={programme:'demo',version:'v1',snapshot:'sha256:abc',learner:'learner-test'};
const submission:Submission={schema:'okf-learning-submission.v1',...binding,path:'foundation',attempt:'one',submitted_at:'2026-01-01T00:00:00Z',artefact:'A complete fictional artefact with evidence and gaps.'};
async function receipt(overrides:Partial<Assessment>={}) {
 const assessment:Assessment={schema:'okf-learning-assessment.v1',submission,submission_sha256:await sha256(submission),assessor:assessor.id,decision:'passed',scores:[2,2,1,2,1],critical_failures:[],feedback:'Traceable, scoped and reproducible.',assessed_at:'2026-01-02T00:00:00Z',...overrides};
 return {assessment,signature:sign(null,new TextEncoder().encode(canonical(assessment)),pair.privateKey).toString('base64')};
}
describe('assessor decisions',()=>{
 it('verifies signatures and rejects a modified artefact, decision or unknown signer',async()=>{
  const r=await receipt();await expect(verifyAssessment(r,[assessor])).resolves.toEqual(r);
  await expect(verifyAssessment({...r,assessment:{...r.assessment,feedback:'Tampered'}},[assessor])).rejects.toThrow('signature');
  await expect(verifyAssessment({...r,assessment:{...r.assessment,submission:{...submission,artefact:'Changed artefact with different evidence.'}}},[assessor])).rejects.toThrow('artefact');
  await expect(verifyAssessment(r,[])).rejects.toThrow('not trusted');
 });
 it('rejects numerical passes without mandatory criteria or with critical failures',async()=>{
  expect(meetsRubric({scores:[2,2,2,1,2],critical_failures:[]})).toBe(false);
  await expect(verifyAssessment(await receipt({critical_failures:['Invented citation']}),[assessor])).rejects.toThrow('rubric');
 });
 it('keeps snapshot, learner and prerequisite boundaries and later remediation decisions',async()=>{
  const r=await receipt();const paths=[{id:'foundation',prerequisites:[]},{id:'advanced',prerequisites:['foundation']}];
  expect([...passedPaths([r],binding,paths)]).toEqual(['foundation']);
  expect(passedPaths([r],{...binding,snapshot:'new'},paths).size).toBe(0);
  expect(passedPaths([r],{...binding,learner:'learner-other'},paths).size).toBe(0);
  const advanced=await receipt({submission:{...submission,path:'advanced'},submission_sha256:await sha256({...submission,path:'advanced'})});
  expect(passedPaths([advanced],binding,paths).size).toBe(0);
  expect(passedPaths([advanced,r],binding,paths).size).toBe(2);
  const rejected=await receipt({decision:'changes_required',assessed_at:'2026-01-03T00:00:00Z'});
  expect(passedPaths([advanced,r,rejected],binding,paths).size).toBe(0);
 });
});
