import type { Assessor } from './learningAssessment';
/** Optional authored teaching overlay; never creates semantic relationships. */
export type LearningStep = { route: string; title: string; outcome: string; practice: string; minutes: number | null; evidence_routes?: string[] };
export type LargeLearningPath = { id: string; title: string; description: string; steps: LearningStep[]; prerequisites?: string[]; personas?: string[]; assessment?: string };
export type LargeLearning = { title: string; introduction: string; paths: LargeLearningPath[]; programme?: { id:string; version:string; assessors:Assessor[] } };
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown, limit = 240) => typeof v === 'string' ? v.trim().slice(0, limit) : '';
export function largeLearningPresentation(value: unknown): LargeLearning | null {
  const raw = obj(value);
  if (!['okf-large-learning-presentation.v1','okf-large-learning-presentation.v2'].includes(String(raw.schema)) || !Array.isArray(raw.paths) || raw.paths.length > 12) return null;
  if (raw.schema === 'okf-large-learning-presentation.v2') {
    const bounded = (v: unknown, n: number) => v === undefined || typeof v === 'string' && v.length <= n;
    if (!bounded(raw.title, 240) || !bounded(raw.introduction, 1200)) return null;
    for (const value of raw.paths) {
      const p = obj(value);
      if (!bounded(p.id,80)||!bounded(p.title,240)||!bounded(p.description,800)||!bounded(p.assessment,1200)) return null;
      for (const value of Array.isArray(p.steps)?p.steps:[]) {
        const step=obj(value);
        if(!bounded(step.route,512)||!bounded(step.title,240)||!bounded(step.outcome,800)||!bounded(step.practice,1200))return null;
      }
    }
  }
  const ids = new Set<string>();
  const paths: LargeLearningPath[] = [];
  for (const value of raw.paths) {
    const path = obj(value), id = text(path.id, 80), title = text(path.title);
    if (!/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id) || !title || !Array.isArray(path.steps) || !path.steps.length || path.steps.length > 24) return null;
    ids.add(id);
    const routes = new Set<string>(), steps: LearningStep[] = [];
    for (const value of path.steps) {
      const step = obj(value), route = text(step.route, 512), title = text(step.title), outcome = text(step.outcome, 800);
      // Routes are local Reader identities, never URLs or filesystem paths.
      if (!/^[A-Za-z0-9][A-Za-z0-9._~-]*\/[A-Za-z0-9][A-Za-z0-9._~/-]*$/.test(route) || route.includes('..') || /%(?![0-9a-f]{2})/i.test(route) || routes.has(route) || !title || !outcome) return null;
      routes.add(route);
      const evidence = Array.isArray(step.evidence_routes) ? step.evidence_routes : [];
      if(evidence.length>64 || evidence.some(r=>typeof r!=='string'|| !/^[A-Za-z0-9][A-Za-z0-9._~-]*\/[A-Za-z0-9][A-Za-z0-9._~/-]*$/.test(r) || r.includes('..'))) return null;
      steps.push({ ...(raw.schema==='okf-large-learning-presentation.v2' ? {evidence_routes:evidence as string[]} : {}), route, title, outcome, practice: text(step.practice, 1200), minutes: typeof step.minutes === 'number' && Number.isInteger(step.minutes) && step.minutes > 0 && step.minutes <= 480 ? step.minutes : null });
    }
    const prerequisites = path.prerequisites ?? [], personas = path.personas ?? [];
    if(raw.schema==='okf-large-learning-presentation.v2' && (!Array.isArray(prerequisites)||prerequisites.length>12||prerequisites.some(x=>typeof x!=='string')||new Set(prerequisites).size!==prerequisites.length||!Array.isArray(personas)||personas.length>12||personas.some(x=>typeof x!=='string'||x.length>120))) return null;
    paths.push({ id, title, description: text(path.description, 800), steps, ...(raw.schema==='okf-large-learning-presentation.v2' ? {prerequisites:prerequisites as string[],personas:personas as string[],assessment:text(path.assessment,1200)}:{}) });
  }
  let programme: LargeLearning['programme'];
  if(raw.schema==='okf-large-learning-presentation.v2') {
    const cfg=obj(raw.programme);
    if(typeof cfg.id!=='string'||!/^[a-z][a-z0-9-]{0,79}$/.test(cfg.id)||typeof cfg.version!=='string'||!/^[a-zA-Z0-9._-]{1,160}$/.test(cfg.version)||!Array.isArray(cfg.assessors)||cfg.assessors.length>20) return null;
    const assessors=cfg.assessors as Assessor[];
    if(assessors.some(a=>!a||typeof a.id!=='string'||!/^[a-z][a-z0-9-]{0,79}$/.test(a.id)||typeof a.name!=='string'||a.name.length>160||typeof a.public_key!=='string'||!/^[A-Za-z0-9+/=]{40,160}$/.test(a.public_key))||new Set(assessors.map(a=>a.id)).size!==assessors.length) return null;
    const visited=new Set<string>();
    const walk=(id:string,ancestors:string[]):boolean=> {
      if(ancestors.includes(id)||!ids.has(id))return false;
      if(visited.has(id))return true;
      if(!paths.find(p=>p.id===id)!.prerequisites!.every(x=>walk(x,[...ancestors,id])))return false;
      visited.add(id);return true;
    };
    if(!paths.every(p=>walk(p.id,[])))return null;
    programme={id:cfg.id,version:cfg.version,assessors};
  }
  return paths.length ? { ...(programme?{programme}:{}), title: text(raw.title) || 'Learning paths', introduction: text(raw.introduction, 1200), paths } : null;
}
