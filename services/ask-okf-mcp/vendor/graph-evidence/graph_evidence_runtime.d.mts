export type GraphPlan = { plan_id: string; graph_sha256: string; engine_id: string; [key: string]: any };
export function graphCanonical(value: unknown): string;
export function graphBytes(value: unknown): number;
export function graphSha(value: string): Promise<string>;
export function createGraphEvidenceRuntime(options: {
  graphText: string; graphSha256: string; engineId: string;
  resolveConcepts: Function; validateContextIndex: Function;
}): Promise<{ plan(question: string): Promise<GraphPlan>; identity: object }>;
export function graphEvidenceManifest(plan: GraphPlan, options: { offset?: number; maxBytes?: number }, sizer?: (value: unknown) => number): Promise<Record<string, any>>;
export function readGraphEvidence(plan: GraphPlan, options: { plan_id: string; section: string; record_id?: string; offset?: number; maxBytes?: number }, sizer?: (value: unknown) => number): Promise<Record<string, any>>;
