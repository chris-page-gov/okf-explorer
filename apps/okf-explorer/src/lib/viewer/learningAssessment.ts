/** Signed assessor decisions are the only source of assessed completion. */
export type Assessor = { id: string; name: string; public_key: string };
export type Submission = {
  schema: 'okf-learning-submission.v1'; programme: string; version: string; snapshot: string;
  learner: string; path: string; attempt: string; submitted_at: string; artefact: string;
};
export type Assessment = {
  schema: 'okf-learning-assessment.v1'; submission_sha256: string; submission: Submission;
  assessor: string; decision: 'passed' | 'changes_required'; scores: number[];
  critical_failures: string[]; feedback: string; assessed_at: string;
};
export type SignedAssessment = { assessment: Assessment; signature: string };
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
export async function sha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function validSubmission(s: Submission): boolean {
  return Boolean(s && s.schema === 'okf-learning-submission.v1' &&
    ['programme','version','snapshot','learner','path','attempt'].every(k => typeof s[k as keyof Submission] === 'string' && /^[a-zA-Z0-9._:/-]{1,160}$/.test(s[k as keyof Submission])) &&
    typeof s.artefact === 'string' && s.artefact.trim().length >= 20 && s.artefact.length <= 20000 && typeof s.submitted_at === 'string' && Number.isFinite(Date.parse(s.submitted_at)));
}
export function meetsRubric(a: Pick<Assessment,'scores'|'critical_failures'>): boolean {
  return Array.isArray(a.scores) && a.scores.length === 5 && a.scores.every(n=>Number.isInteger(n)&&n>=0&&n<=2) &&
    a.scores.reduce((n,x)=>n+x,0)>=8 && [0,1,3].every(i=>a.scores[i]===2) && Array.isArray(a.critical_failures) && a.critical_failures.length===0;
}
export async function verifyAssessment(raw: unknown, assessors: Assessor[]): Promise<SignedAssessment> {
  const signed = raw as SignedAssessment, a = signed?.assessment;
  if (!a || a.schema !== 'okf-learning-assessment.v1' || !validSubmission(a.submission) ||
    !['passed','changes_required'].includes(a.decision) || !Array.isArray(a.scores) || a.scores.length!==5 || a.scores.some(n=>!Number.isInteger(n)||n<0||n>2) ||
    !Array.isArray(a.critical_failures) || a.critical_failures.length>20 || a.critical_failures.some(x=>typeof x!=='string'||x.length>200) ||
    typeof a.feedback!=='string' || a.feedback.length<1 || a.feedback.length>4000 ||
    !Number.isFinite(Date.parse(a.assessed_at)) || Date.parse(a.assessed_at)<Date.parse(a.submission.submitted_at) || Date.parse(a.assessed_at)>Date.now()+300000 ||
    (a.decision==='passed' && !meetsRubric(a))) throw new Error('Invalid assessment or rubric result.');
  const key = assessors.find(k=>k.id===a.assessor);
  if (!key || typeof signed.signature!=='string' || signed.signature.length>128) throw new Error('The assessor is not trusted by this programme.');
  if (await sha256(a.submission)!==a.submission_sha256) throw new Error('The submitted artefact has changed.');
  try {
    const decoded=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
    const pub=await crypto.subtle.importKey('spki',decoded(key.public_key),{name:'Ed25519'},false,['verify']);
    if (!await crypto.subtle.verify('Ed25519',pub,decoded(signed.signature),new TextEncoder().encode(canonical(a)))) throw new Error();
  } catch { throw new Error('The assessor signature could not be verified.'); }
  return signed;
}
export function matchesProgramme(s: Submission, binding: { programme: string; version: string; snapshot: string; learner: string }): boolean {
  return s.programme===binding.programme && s.version===binding.version && s.snapshot===binding.snapshot && s.learner===binding.learner;
}
export function passedPaths(receipts: SignedAssessment[], binding: { programme: string; version: string; snapshot: string; learner: string }, paths: { id:string; prerequisites:string[] }[]): Set<string> {
  // Call only with freshly signature-verified receipts. Revoked keys never survive reload validation.
  const latest=new Map<string,Assessment>();
  for (const {assessment:a} of receipts) if(matchesProgramme(a.submission,binding) && (!latest.has(a.submission.path)||Date.parse(a.assessed_at)>Date.parse(latest.get(a.submission.path)!.assessed_at) || (Date.parse(a.assessed_at)===Date.parse(latest.get(a.submission.path)!.assessed_at) && a.decision==='changes_required'))) latest.set(a.submission.path,a);
  const passed=new Set<string>();
  for(let i=0;i<paths.length;i++) for(const p of paths) if(latest.get(p.id)?.decision==='passed' && p.prerequisites.every(id=>passed.has(id))) passed.add(p.id);
  return passed;
}
