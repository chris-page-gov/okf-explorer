import { describe, expect, it, vi } from 'vitest';
import { documentContextRegistry, registerContextTools, type ContextTool, type ContextToolHandlers } from './webmcp';
import type { ContextPackage } from './types';

const context = { context_id: 'urn:context:checked', question: 'Explain a concept', ai_answer: null } as ContextPackage;

function fixture(overrides: Partial<ContextToolHandlers> = {}) {
  const registered = new Map<string, ContextTool>();
  const signals: AbortSignal[] = [];
  const registry = {
    registerTool: vi.fn(async (tool: ContextTool, options: { signal: AbortSignal }) => {
      registered.set(tool.name, tool);
      signals.push(options.signal);
      options.signal.addEventListener('abort', () => registered.delete(tool.name), { once: true });
    })
  };
  const handlers = { build: vi.fn(async () => context), explain: vi.fn(async () => context), ...overrides };
  const registration = registerContextTools(registry, handlers);
  return { registry, handlers, registered, signals, registration };
}

describe('optional read-only WebMCP context transport', () => {
  it('detects only document.modelContext and remains optional', async () => {
    expect(documentContextRegistry({ navigator: { modelContext: { registerTool() {} } } })).toBeUndefined();
    expect(documentContextRegistry({ get modelContext() { throw new Error('permission blocked'); } })).toBeUndefined();
    expect((await registerContextTools(undefined, fixture().handlers).ready).available).toBe(false);
  });

  it('registers current-draft tools with bounded schemas and untrusted read-only annotations', async () => {
    const { registered, registration, handlers } = fixture();
    expect((await registration.ready).available).toBe(true);
    expect([...registered.keys()]).toEqual(['okf_build_context', 'okf_explain_context']);
    for (const tool of registered.values()) {
      expect(tool.annotations).toEqual({ readOnlyHint: true, untrustedContentHint: true, consequentialHint: false });
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
    expect(await registered.get('okf_build_context')!.execute({ question: context.question, budget: { max_depth: 0 } })).toBe(context);
    expect(handlers.build).toHaveBeenCalledWith(context.question, { max_depth: 0 }, expect.any(AbortSignal));
    expect(await registered.get('okf_explain_context')!.execute({ context_id: context.context_id })).toBe(context);
    registration.dispose();
    expect(registered.size).toBe(0);
  });

  it.each([
    null, [], { question: '' }, { question: ' '.repeat(10) }, { question: 'x'.repeat(2001) },
    { question: 'Valid', url: 'https://unrelated.example/' },
    { question: 'Valid', budget: { unknown: 2 } },
    { question: 'Valid', budget: { max_bytes: 524289 } },
    { question: 'Valid', budget: { max_bytes: 8191 } },
    { question: 'Valid', budget: { max_nodes: 2.5 } },
    { question: 'Valid', budget: { max_relationships: 0 } }
  ])('rejects invalid inputs before calling the engine: %j', async (input) => {
    const { registered, registration, handlers } = fixture();
    await registration.ready;
    await expect(registered.get('okf_build_context')!.execute(input)).rejects.toThrow();
    expect(handlers.build).not.toHaveBeenCalled();
    registration.dispose();
  });

  it('accepts only a retained context ID for explanation', async () => {
    const { registered, registration, handlers } = fixture();
    await registration.ready;
    await expect(registered.get('okf_explain_context')!.execute({ context_id: 'known', package: context })).rejects.toThrow('unsupported');
    await expect(registered.get('okf_explain_context')!.execute({ context_id: '' })).rejects.toThrow('context_id');
    expect(handlers.explain).not.toHaveBeenCalled();
    registration.dispose();
  });

  it('cancels pending execution on source disposal even when the engine cannot abort', async () => {
    let finish!: (value: ContextPackage) => void;
    const { registered, registration } = fixture({ build: () => new Promise((resolve) => { finish = resolve; }) });
    await registration.ready;
    const tool = registered.get('okf_build_context')!;
    const pending = tool.execute({ question: 'Explain a concept' });
    registration.dispose();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    finish(context);
    await expect(tool.execute({ question: 'Another concept' })).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('honours the invoker cancellation signal', async () => {
    const { registered, registration, handlers } = fixture({ build: () => new Promise(() => {}) });
    await registration.ready;
    const controller = new AbortController();
    const pending = registered.get('okf_build_context')!.execute({ question: 'Explain a concept' }, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(registered.get('okf_explain_context')!.execute({ context_id: 'known' }, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(handlers.explain).not.toHaveBeenCalled();
    registration.dispose();
  });

  it('cleans up the first tool when later registration is rejected', async () => {
    const { registry, registered, registration } = fixture();
    registry.registerTool.mockRejectedValueOnce(new Error('blocked'));
    expect((await registration.ready).available).toBe(false);
    expect(registered.size).toBe(0);
  });
});
