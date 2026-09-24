import { TOOL_CONTRACTS, validateToolInput, type ToolContract, type WorkbenchToolName } from './toolContracts';
import type { WorkbenchSession } from './session';
import type { WorkbenchResult } from './toolTypes';

export type WorkbenchTool = ToolContract & {
  execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<WorkbenchResult>;
};
export type WorkbenchToolRegistry = {
  registerTool: (tool: WorkbenchTool, options: { signal: AbortSignal }) => Promise<void> | void;
};

/** The current draft exposes registration on Document, not Navigator. */
export function documentWorkbenchRegistry(documentValue: unknown): WorkbenchToolRegistry | undefined {
  if (!documentValue || typeof documentValue !== 'object') return undefined;
  try {
    const registry = (documentValue as { modelContext?: WorkbenchToolRegistry }).modelContext;
    return registry && typeof registry.registerTool === 'function' ? registry : undefined;
  } catch {
    return undefined;
  }
}

function cancelled(): DOMException { return new DOMException('The workbench tool request was cancelled.', 'AbortError'); }

/** Optional, page-bound transport over the same session used by the human interface. */
export function registerWorkbenchTools(registry: WorkbenchToolRegistry | undefined, session: WorkbenchSession) {
  const lifetime = new AbortController();
  const requests = new Set<AbortController>();
  const dispose = () => {
    lifetime.abort();
    for (const request of requests) request.abort();
    requests.clear();
  };
  const execute = async (name: WorkbenchToolName, input: unknown, signal?: AbortSignal): Promise<WorkbenchResult> => {
    if (lifetime.signal.aborted || signal?.aborted) throw cancelled();
    const values = validateToolInput(name, input);
    const request = new AbortController();
    requests.add(request);
    const cancel = () => request.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted || lifetime.signal.aborted) request.abort();
    let rejectAborted: (() => void) | undefined;
    try {
      if (request.signal.aborted) throw cancelled();
      const aborted = new Promise<never>((_, reject) => {
        rejectAborted = () => reject(cancelled());
        request.signal.addEventListener('abort', rejectAborted, { once: true });
      });
      const result = await Promise.race([session.invoke(name, values, { signal: request.signal }), aborted]);
      if (request.signal.aborted || lifetime.signal.aborted) throw cancelled();
      return result;
    } finally {
      signal?.removeEventListener('abort', cancel);
      if (rejectAborted) request.signal.removeEventListener('abort', rejectAborted);
      requests.delete(request);
    }
  };
  const tools: WorkbenchTool[] = TOOL_CONTRACTS.map(contract => ({
    ...contract, execute: (input, options) => execute(contract.name, input, options?.signal)
  }));
  const ready = (async () => {
    if (!registry) return { available: false, message: 'Page tools are unavailable in this browser. The workbench remains available.' };
    try {
      for (const tool of tools) {
        if (lifetime.signal.aborted) throw cancelled();
        await registry.registerTool(tool, { signal: lifetime.signal });
      }
      if (lifetime.signal.aborted) throw cancelled();
      return { available: true, message: 'Workbench page tools registered. Assistant-host support must be checked separately.' };
    } catch {
      dispose();
      return { available: false, message: 'Workbench page tools could not be registered. The workbench remains available.' };
    }
  })();
  return { ready, dispose };
}
