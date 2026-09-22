import { describe, expect, it, vi } from 'vitest';
import { documentContextRegistry, registerContextTools, type ContextTool, type ContextToolHandlers } from './webmcp';
import type { ContextPackage } from './types';
import { assembleContext, canonicalJson, contextSha256 } from './index';
import { studyClubContextFixture } from '../../test/contextFixture';
import { unitFixture } from '../../test/unitFixture';
import type { ContextManifest, EvidenceRead } from './delivery';

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
    expect([...registered.keys()]).toEqual(['okf_build_context', 'okf_explain_context', 'okf_context_manifest', 'okf_read_evidence']);
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


describe('browser compact delivery of the same retained evidence', () => {
  it('continues a multi-page catalogue with the identical question, budget and identity', async () => {
    const index = await studyClubContextFixture();
    const source = index.records[0], edge = index.assertions[0];
    for (let i = 0; i < 40; i++) {
      const record = { ...source, id: `https://example.test/extra/${i}`, route: `evidence/extra-${i}`,
        label: `Synthetic complete passage ${i}: ` + 'Source catalogue label '.repeat(20) };
      index.records.push(record);
      index.assertions.push({ ...edge, id: `${edge.id}/extra-${i}`, target: record.id });
    }
    const context = await assembleContext(index, 'Reading circle');
    const { registered, registration, handlers } = fixture({ build: vi.fn(async () => context) });
    await registration.ready;
    let offset: number | null = 0, pages = 0;
    const found: string[] = [];
    do {
      const part = await registered.get('okf_context_manifest')!.execute({ question: 'Reading circle',
        budget: { max_bytes: 524288 }, delivery_bytes: 8192, offset,
        ...(offset ? { context_id: context.context_id } : {}) }) as ContextManifest;
      expect(part.context_id).toBe(context.context_id);
      expect(part.delivery.used_bytes).toBeLessThanOrEqual(8192);
      expect(part.records.length).toBeGreaterThan(0);
      found.push(...part.records.map(r => r.id)); offset = part.delivery.next_offset; pages++;
    } while (offset !== null);
    expect(pages).toBeGreaterThan(1);
    expect(found).toEqual(context.selected.map(r => r.record.id));
    expect(handlers.build).toHaveBeenCalledTimes(pages);
    for (const call of (handlers.build as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call.slice(0, 2)).toEqual(['Reading circle', { max_bytes: 524288 }]);
    }
    registration.dispose();
  });
  it('keeps assembly separate from delivery and reconstructs the whole package and spans', async () => {
    const index = await studyClubContextFixture();
    const record = await unitFixture(['Café reading. '.repeat(2400), 'Only with a booking.'], index.records[0].id);
    index.records[0] = record;
    const context = await assembleContext(index, 'Reading circle');
    const before = canonicalJson(context);
    const { registered, registration, handlers } = fixture({ build: vi.fn(async () => context), explain: vi.fn(async () => context) });
    await registration.ready;
    const catalogue = await registered.get('okf_context_manifest')!.execute({ question: 'Reading circle', budget: { max_bytes: 524288 }, delivery_bytes: 32768 }) as ContextManifest;
    expect(catalogue.context_id).toBe(context.context_id);
    expect(catalogue.delivery.used_bytes).toBeLessThanOrEqual(32768);
    expect(catalogue.summary.full_package_bytes).toBeGreaterThan(32768);
    expect(catalogue.records.some(r => r.id === record.id)).toBe(true);
    expect(handlers.explain).not.toHaveBeenCalled();
    const parts: string[] = []; let offset: number | null = 0, digest = '';
    do {
      const value = await registered.get('okf_read_evidence')!.execute({ context_id: context.context_id, section: 'package', offset, delivery_bytes: 32768 }) as EvidenceRead;
      expect(value.context_id).toBe(context.context_id);
      expect(value.delivery.used_bytes).toBeLessThanOrEqual(32768);
      parts.push(value.data); offset = value.next_offset; digest = value.content_sha256;
    } while (offset !== null);
    expect(parts.length).toBeGreaterThan(1);
    expect(await contextSha256(parts.join(''))).toBe(digest);
    expect(JSON.parse(parts.join(''))).toEqual(context);
    expect(canonicalJson(context)).toBe(before);
    expect(JSON.parse(parts.join('')).selected.find((r: any) => r.record.id === record.id).record.evidence_unit).toEqual(record.evidence_unit);
    registration.dispose();
  });
  it.each([
    { question: 'Reading circle', offset: 1 },
    { question: 'Reading circle', delivery_bytes: 8191 },
    { question: 'Reading circle', delivery_bytes: 65537 },
    { question: 'Reading circle', delivery_bytes: 9000.5 },
    { question: 'Reading circle', offset: -1 },
    { question: 'Reading circle', context_id: '' },
    { question: 'Reading circle', url: 'https://unrelated.test/' }
  ])('rejects malformed catalogue input before assembly: %j', async input => {
    const { registered, registration, handlers } = fixture(); await registration.ready;
    await expect(registered.get('okf_context_manifest')!.execute(input)).rejects.toThrow();
    expect(handlers.build).not.toHaveBeenCalled(); registration.dispose();
  });
  it('rejects changed replay identities and evicted evidence', async () => {
    const { registered, registration } = fixture({ explain: async () => { throw new Error('not retained'); } });
    await registration.ready;
    await expect(registered.get('okf_context_manifest')!.execute({ question: 'Reading circle', offset: 1, context_id: 'stale' })).rejects.toThrow('identity');
    await expect(registered.get('okf_read_evidence')!.execute({ context_id: 'evicted', section: 'package' })).rejects.toThrow('not retained');
    registration.dispose();
  });
  it.each([
    { section: 'other' }, { section: 'package', record_id: 'unselected' },
    { section: 'record_text' }, { section: 'record_metadata', record_id: '' },
    { section: 'package', offset: 0.5 }, { section: 'package', delivery_bytes: 65537 },
    { section: 'package', url: 'https://unrelated.test/' }
  ])('rejects invalid exact reads before retained lookup: %j', async fields => {
    const { registered, registration, handlers } = fixture(); await registration.ready;
    await expect(registered.get('okf_read_evidence')!.execute({ context_id: context.context_id, ...fields })).rejects.toThrow();
    expect(handlers.explain).not.toHaveBeenCalled(); registration.dispose();
  });
  it('cancels compact builds when the source changes', async () => {
    const { registered, registration } = fixture({ build: () => new Promise(() => {}) });
    await registration.ready;
    const pending = registered.get('okf_context_manifest')!.execute({ question: 'Reading circle' });
    registration.dispose(); await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
