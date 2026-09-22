#!/usr/bin/env node
/** Offline facilitator tool. Never publish the private key with a bundle. */
import { generateKeyPairSync, createPrivateKey, sign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { canonical, sha256, validSubmission, meetsRubric, verifyAssessment } from '../src/lib/viewer/learningAssessment.ts';
export async function main(args) {
  const [command,...rest]=args;
  if(command==='keygen') {
    const [prefix,id,name]=rest;
    if(!prefix||!/^[a-z][a-z0-9-]{0,79}$/.test(id??'')||!name)throw Error('Usage: keygen PREFIX ASSESSOR_ID "Display name"');
    const {privateKey,publicKey}=generateKeyPairSync('ed25519');
    const assessor={id,name,public_key:publicKey.export({format:'der',type:'spki'}).toString('base64')};
    writeFileSync(prefix+'.private.pem',privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600,flag:'wx'});
    writeFileSync(prefix+'.assessor.json',JSON.stringify(assessor,null,2)+'\n',{flag:'wx'});
    return {public_roster_entry:prefix+'.assessor.json',private_key:prefix+'.private.pem'};
  }
  if(command==='assess') {
    const [submissionPath,decisionPath,keyPath,assessorPath,out]=rest;
    if(!out)throw Error('Usage: assess SUBMISSION DECISION_JSON PRIVATE_KEY ASSESSOR_JSON OUTPUT');
    const read=p=>JSON.parse(readFileSync(p,'utf8'));
    const submission=read(submissionPath),decision=read(decisionPath),assessor=read(assessorPath);
    if(!validSubmission(submission))throw Error('Invalid submission.');
    const assessment={schema:'okf-learning-assessment.v1',submission_sha256:await sha256(submission),submission,assessor:assessor.id,decision:decision.decision,scores:decision.scores,critical_failures:decision.critical_failures,feedback:decision.feedback,assessed_at:new Date().toISOString()};
    if(assessment.decision==='passed'&&!meetsRubric(assessment))throw Error('The proposed pass does not meet the programme rubric.');
    const receipt={assessment,signature:sign(null,Buffer.from(canonical(assessment)),createPrivateKey(readFileSync(keyPath))).toString('base64')};
    await verifyAssessment(receipt,[assessor]);
    writeFileSync(out,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
    return {output:out,decision:assessment.decision};
  }
  throw Error('Commands: keygen, assess. Requires Node.js 22.18 or later.');
}
if(import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2)).then(v=>console.log(JSON.stringify(v))).catch(e=>{console.error(e.message);process.exitCode=1;});
