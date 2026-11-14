export function collectGraphEvidence(options: {
  transport: { manifest: (args: any, signal?: AbortSignal) => Promise<unknown>; read: (args: any, signal?: AbortSignal) => Promise<unknown> };
  question: string; expectedGraphSha256: string; expectedEngineId: string; deliveryBytes?: number;
}): Promise<any>;
