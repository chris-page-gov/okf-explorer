/** Optional authored teaching overlay; never creates semantic relationships. */
export type LearningStep = { route: string; title: string; outcome: string; practice: string; minutes: number | null };
export type LargeLearningPath = { id: string; title: string; description: string; steps: LearningStep[] };
export type LargeLearning = { title: string; introduction: string; paths: LargeLearningPath[] };
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown, limit = 240) => typeof v === 'string' ? v.trim().slice(0, limit) : '';
export function largeLearningPresentation(value: unknown): LargeLearning | null {
  const raw = obj(value);
  if (raw.schema !== 'okf-large-learning-presentation.v1' || !Array.isArray(raw.paths) || raw.paths.length > 12) return null;
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
      steps.push({ route, title, outcome, practice: text(step.practice, 1200), minutes: typeof step.minutes === 'number' && Number.isInteger(step.minutes) && step.minutes > 0 && step.minutes <= 480 ? step.minutes : null });
    }
    paths.push({ id, title, description: text(path.description, 800), steps });
  }
  return paths.length ? { title: text(raw.title) || 'Learning paths', introduction: text(raw.introduction, 1200), paths } : null;
}
