import { describe, expect, it, vi } from 'vitest';
import { TOOL_CONTRACTS, TOOL_NAMES, validateToolInput } from './toolContracts';
import { documentWorkbenchRegistry, registerWorkbenchTools, type WorkbenchTool } from './webmcp';
import type { WorkbenchSession } from './session';
import type { WorkbenchResult } from './toolTypes';

const sample: WorkbenchResult = {
  schema: 'okf-workbench-result.v1', snapshot_id: null, evidence_status: 'not-loaded', state_revision: 0,
  delivery: { complete: true, next_cursor: null, bytes: 0, characters: 0, estimated_tokens: 0 }, limitations: []
};
function fixture(invoke: (name: string, input: unknown, options: { signal?: AbortSignal }) => Promise<WorkbenchResult> = vi.fn(async () => sample)) {
  const tools = new Map<string, WorkbenchTool>();
  const registry = { registerTool: vi.fn(async (tool: WorkbenchTool, options: { signal: AbortSignal }) => {
    if (tools.has(tool.name)) throw new DOMException('Duplicate tool.', 'InvalidStateError');
    tools.set(tool.name, tool);
    options.signal.addEventListener('abort', () => tools.delete(tool.name), { once: true });
  }) };
  const session = { invoke } as unknown as WorkbenchSession;
  return { tools, registry, session, invoke };
}

describe('workbench page-tool contracts', () => {
  it('has small, unique descriptors with truthful read/write and untrusted annotations', () => {
    expect(new Set(TOOL_NAMES).size).toBe(7);
    expect(TOOL_CONTRACTS.map(item => item.name)).toEqual([...TOOL_NAMES]);
    for (const item of TOOL_CONTRACTS) {
      expect(item.name.length).toBeLessThanOrEqual(30);
      expect(item.description.length).toBeLessThanOrEqual(500);
      expect(item.inputSchema.additionalProperties).toBe(false);
      expect('outputSchema' in item).toBe(false);
      expect(item.annotations.untrustedContentHint).toBe(true);
      expect(item.annotations.readOnlyHint).toBe(item.name !== 'okf_show_view');
      for (const field of Object.values(item.inputSchema.properties)) expect(field.description.length).toBeLessThanOrEqual(150);
    }
    expect(JSON.stringify(TOOL_CONTRACTS).length).toBeLessThan(13000);
  });

  it('rejects malformed, excessive and unknown inputs before session dispatch', () => {
    expect(validateToolInput('okf_get_state', {})).toEqual({});
    for (const value of [null, [], { hidden: 1 }]) expect(() => validateToolInput('okf_get_state', value)).toThrow();
    expect(() => validateToolInput('okf_search_evidence', { query: ' ' })).toThrow();
    expect(() => validateToolInput('okf_search_evidence', { query: 'x'.repeat(501) })).toThrow();
    expect(() => validateToolInput('okf_search_evidence', { query: 'capital', limit: 11 })).toThrow();
    expect(() => validateToolInput('okf_get_evidence', { ref: 'r', section: 'full' })).toThrow();
    expect(() => validateToolInput('okf_show_view', { snapshot_id: 's', expected_revision: -1, case_id: 'c' })).toThrow();
    expect(() => validateToolInput('okf_show_view', { snapshot_id: 's', expected_revision: 0 })).toThrow();
    expect(() => validateToolInput('okf_get_relationships', { depth: 1 })).toThrow();
    expect(() => validateToolInput('okf_get_view_data', { view: 'graph', assessment_date: '2026-02-30' })).toThrow();
    expect(validateToolInput('okf_get_calculation', { section: 'overview', assessment_date: '2026-09-24' })).toEqual({ section: 'overview', assessment_date: '2026-09-24' });
  });

  it('detects only the draft Document API and preserves ordinary page fallback', async () => {
    expect(documentWorkbenchRegistry({ navigator: { modelContext: { registerTool() {} } } })).toBeUndefined();
    expect(documentWorkbenchRegistry({ get modelContext() { throw Error('blocked'); } })).toBeUndefined();
    const { session } = fixture();
    expect((await registerWorkbenchTools(undefined, session).ready).available).toBe(false);
  });

  it('registers fixed tools, dispatches validated input, and removes registrations on disposal', async () => {
    const { tools, registry, session, invoke } = fixture();
    const registration = registerWorkbenchTools(registry, session);
    expect((await registration.ready).available).toBe(true);
    expect([...tools.keys()]).toEqual([...TOOL_NAMES]);
    expect(await tools.get('okf_get_state')!.execute({})).toEqual(sample);
    expect(invoke).toHaveBeenCalledWith('okf_get_state', {}, { signal: expect.any(AbortSignal) });
    await expect(tools.get('okf_search_evidence')!.execute({ query: '', unknown: true })).rejects.toThrow();
    expect(invoke).toHaveBeenCalledTimes(1);
    registration.dispose();
    expect(tools.size).toBe(0);
  });

  it('cleans up partial registration failure', async () => {
    const { tools, registry, session } = fixture();
    const original = registry.registerTool;
    registry.registerTool = vi.fn(async (tool: WorkbenchTool, options: { signal: AbortSignal }) => {
      if (tool.name === 'okf_get_evidence') throw Error('policy');
      await original(tool, options);
    });
    const registration = registerWorkbenchTools(registry, session);
    expect((await registration.ready).available).toBe(false);
    expect(tools.size).toBe(0);
  });

  it('cancels a pending call from host signal and from page disposal', async () => {
    let finish!: (value: WorkbenchResult) => void;
    const invoke = vi.fn((_name: string, _input: unknown, _options: { signal?: AbortSignal }) => new Promise<WorkbenchResult>(resolve => { finish = resolve; }));
    const { tools, registry, session } = fixture(invoke);
    const registration = registerWorkbenchTools(registry, session);
    await registration.ready;
    const controller = new AbortController();
    const first = tools.get('okf_get_state')!.execute({}, { signal: controller.signal });
    controller.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(invoke.mock.calls[0]?.[2]?.signal?.aborted).toBe(true);
    const second = tools.get('okf_get_state')!.execute({});
    registration.dispose();
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });
    finish(sample);
  });
});
