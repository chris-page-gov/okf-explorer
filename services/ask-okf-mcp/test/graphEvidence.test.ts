import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/client/validators/cf-worker';
import { Client as LegacyClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport as LegacyTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createAskService, PUBLIC_ORIGIN } from '../src/service.ts';
import { GRAPH_RELEASE } from '../src/graphEvidence.ts';
import { collectGraphEvidence } from '../vendor/graph-evidence/graph_evidence_client.mjs';

const question = "How does a backdated increase in a child's DLA award affect the Universal Credit disabled child addition when reported late?";
const targetSuffixes = ['source-0000024273-000-64312571d5f1', 'source-0000023318-000-bec866c4cfa0',
  'source-0000055420-000-9e9c31f56b39', 'source-0000059337-000-65ba8377e1e6'];

test('the native and public graph routes expose the same two bounded tools', async () => {
  const service = createAskService({ loadContext: async () => { throw new Error('Legacy engine was not requested'); } });
  try {
    const results = [];
    for (const path of ['/mcp', '/graph/mcp']) {
      const response = await service.fetch(new Request(PUBLIC_ORIGIN + path, { method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }) }));
      assert.equal(response.status, 200);
      const text = await response.text();
      results.push(text.startsWith('event:') ? JSON.parse(text.split('\n').find(line => line.startsWith('data: '))!.slice(6)) : JSON.parse(text));
    }
    assert.deepEqual(results[0], results[1]);
    assert.deepEqual(results[0].result.tools.map((row: any) => row.name), ['plan_okf_evidence', 'read_okf_planned_evidence']);
  } finally { await service.close(); }
});

for (const legacy of [false, true]) test(`graph plan and complete source package cross official SDK ${legacy ? 'v1' : 'v2'} within the whole-response bound`, async () => {
  const logs: unknown[] = [], responseSizes: number[] = [];
  const service = createAskService({ loadContext: async () => { throw new Error('Legacy engine was not requested'); }, diagnostics: value => logs.push(value) });
  const fetcher: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const message = await request.clone().json() as any;
    const response = await service.fetch(request);
    if (message.method === 'tools/call' && ['plan_okf_evidence', 'read_okf_planned_evidence'].includes(message.params?.name)) {
      const text = await response.clone().text(); responseSizes.push(Buffer.byteLength(text));
      assert(Buffer.byteLength(text) <= 8192, 'Full HTTP JSON-RPC result exceeded the selected bound');
    }
    return response;
  };
  const client = legacy ? new LegacyClient({ name: 'graph-v1-test', version: '1' })
    : new Client({ name: 'graph-v2-test', version: '1' }, { jsonSchemaValidator: new CfWorkerJsonSchemaValidator(), versionNegotiation: { mode: { pin: '2026-07-28' } } });
  const transport = legacy ? new LegacyTransport(new URL(PUBLIC_ORIGIN + '/mcp'), { fetch: fetcher })
    : new StreamableHTTPClientTransport(new URL(PUBLIC_ORIGIN + '/mcp'), { fetch: fetcher });
  try {
    await client.connect(transport as any);
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(tool => tool.name), ['plan_okf_evidence', 'read_okf_planned_evidence']);
    for (const name of ['plan_okf_evidence', 'read_okf_planned_evidence']) assert(listed.tools.some(tool => tool.name === name));
    const invoke = (name: string, args: any) => client.callTool({ name, arguments: { bundle: 'okf-dwp', ...args } }) as Promise<any>;
    const result = await collectGraphEvidence({ question, expectedGraphSha256: GRAPH_RELEASE.graph_sha256,
      expectedEngineId: GRAPH_RELEASE.engine_id,
      transport: { manifest: args => invoke('plan_okf_evidence', args), read: args => invoke('read_okf_planned_evidence', args) } });
    assert.equal(result.summary.delivery_complete, true);
    assert.equal(result.summary.package_complete, true);
    assert.equal(result.summary.retrieval_complete, true);
    assert.equal(result.summary.evidence_status, 'insufficient');
    assert.equal(result.summary.ai_answer, null);
    for (const suffix of targetSuffixes) assert(result.package.selected.some((row: any) => row.record.id.endsWith(suffix)), suffix);
    assert(responseSizes.length > 1 && Math.max(...responseSizes) <= 8192);
    assert(!JSON.stringify(logs).includes(question));
    assert(!JSON.stringify(logs).includes('claimant'));
  } finally { await client.close(); await service.close(); }
});

test('graph calls reject unbound identities, off-plan records and extra input fields without evidence', async () => {
  const service = createAskService({ loadContext: async () => { throw new Error('Legacy engine was not requested'); } });
  const call = async (name: string, args: any, rpcId: string | number = 1) => {
    const response = await service.fetch(new Request(PUBLIC_ORIGIN + '/mcp', { method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: rpcId, method: 'tools/call', params: { name, arguments: { bundle: 'okf-dwp', question, ...args } } }) }));
    const text = await response.text();
    assert(Buffer.byteLength(text) <= 8192, 'Escaped request IDs and SSE framing remain within the complete response bound');
    const message = text.startsWith('event:') ? JSON.parse(text.split('\n').find(line => line.startsWith('data: '))!.slice(6)) : JSON.parse(text);
    return message.result;
  };
  try {
    const first = await call('plan_okf_evidence', {});
    assert.equal(first.isError, undefined);
    const recipe = { graph_sha256: GRAPH_RELEASE.graph_sha256, engine_id: GRAPH_RELEASE.engine_id, plan_id: first.structuredContent.plan_id };
    const escaped = await call('read_okf_planned_evidence', { ...recipe, section: 'package', offset: 0 }, '\u0000'.repeat(128));
    assert.equal(escaped.isError, undefined);
    for (const [name, args] of [
      ['plan_okf_evidence', { graph_sha256: '0'.repeat(64) }],
      ['plan_okf_evidence', { offset: 1 }],
      ['plan_okf_evidence', { url: 'https://example.invalid/' }],
      ['read_okf_planned_evidence', { ...recipe, section: 'record_text', record_id: 'https://example.invalid/off-plan' }],
      ['read_okf_planned_evidence', { ...recipe, question: 'different wording', section: 'package' }],
    ] as const) {
      const result = await call(name, args);
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
    }
  } finally { await service.close(); }
});
