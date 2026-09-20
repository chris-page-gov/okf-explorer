import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assembleContext } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { contextManifest, readContextEvidence } from '../../../apps/okf-explorer/src/lib/context/delivery.ts';
import { reviewLink } from '../src/deliveryContracts.ts';
import { LEGACY_BUNDLE_VERSION, verifyBundledContext } from '../src/registry.ts';
// @ts-ignore -- Portable verifier is JavaScript used by the live SDK script.
import { verifyCompactDelivery } from '../scripts/verify-delivery.mjs';

const origin = 'https://ask-okf.crpage.chatgpt.site';
const source = await verifyBundledContext(
  await readFile(new URL('../vendor/okf-dwp-assembly-index.json', import.meta.url), 'utf8'),
  await readFile(new URL('../vendor/okf-dwp-descriptor.json', import.meta.url), 'utf8'));
const request = { bundle: 'okf-dwp', version: LEGACY_BUNDLE_VERSION, question: 'imprisonment' } as const;
const context = await assembleContext(source.index, request.question, undefined, source.binding);
const budget = Object.fromEntries(['max_nodes', 'max_relationships', 'max_depth', 'max_bytes'].map(key => [key, context.budget[key as keyof typeof context.budget]]));
const errorMessage = 'Evidence could not be verified. The context identity, selected record or requested range may differ. No source content was returned; start again with ask_okf_manifest if the source or question changed.';
type Mutation = (tool: string, value: any) => void;
function client(mutate: Mutation = () => {}) {
  return { async callTool({ name, arguments: input }: any) {
    let value: any;
    let link: any;
    try {
      if (name === 'ask_okf_manifest') {
        const extra = { replay: { bundle: request.bundle, version: request.version, budget },
          review_url: reviewLink(origin, { ...request, budget: budget as any, context_id: context.context_id }),
          response_bytes: 0, response_limit: input.delivery_bytes };
        const reserve = Buffer.byteLength(JSON.stringify(extra)) + 32;
        value = { ...await contextManifest(context, { offset: input.offset, max_bytes: input.delivery_bytes - reserve }), ...extra };
        for (let n = 0; n < 4; n++) value.response_bytes = Buffer.byteLength(JSON.stringify(value));
        link = { type: 'resource_link', uri: value.review_url, name: 'Review this evidence', mimeType: 'text/html' };
      } else value = await readContextEvidence(context, { ...input, max_bytes: input.delivery_bytes });
    } catch {
      return { isError: true, content: [{ type: 'text', text: errorMessage }] };
    }
    value = structuredClone(value);
    mutate(name, value);
    return { structuredContent: value, content: [{ type: 'text', text: JSON.stringify(value) }, ...(link ? [link] : [])] };
  } };
}

test('compact verifier reconstructs exact package and preserves fail-closed controls', async () => {
  const result = await verifyCompactDelivery(client(), context, request, origin);
  assert.equal(result.reconstructed_package_matches_direct_engine, true);
  assert.equal(result.catalogue_records, context.selected.length);
  assert.equal(result.negative_controls.length, 3);
  assert.ok(result.reads.find((item: any) => item.section === 'package').slices > 1);
});

test('compact verifier supports bounded larger delivery slices and rejects unsafe limits', async () => {
  const result = await verifyCompactDelivery(client(), context, request, origin, { read_bytes: 32768 });
  assert.equal(result.reconstructed_package_matches_direct_engine, true);
  assert.ok(result.calls.filter((row: any) => row.tool === 'read_okf_evidence').every((row: any) => row.response_limit === 32768));
  for (const read_bytes of [8191, 65537, 8192.5, NaN]) {
    await assert.rejects(verifyCompactDelivery(client(), context, request, origin, { read_bytes }), /bounded verification delivery size/);
  }
});

for (const [label, mutation] of Object.entries<Mutation>({
  'record omitted from catalogue': (name, value) => { if (name === 'ask_okf_manifest') value.records.pop(); },
  'scope status upgraded': (name, value) => { if (name === 'ask_okf_manifest') value.evidence_status = 'conflicting'; },
  'replay context budget changed': (name, value) => { if (name === 'ask_okf_manifest') value.replay.budget.max_bytes = 8192; },
  'source slice altered': (name, value) => { if (name === 'read_okf_evidence') value.data += ' fabricated'; },
  'slice hash forged': (name, value) => { if (name === 'read_okf_evidence') value.content_sha256 = '0'.repeat(64); },
  'slice offset skips text': (name, value) => { if (name === 'read_okf_evidence') value.offset++; },
  'delivery byte count forged': (name, value) => { if (name === 'read_okf_evidence') value.delivery.used_bytes = 1; }
})) {
  test(`compact verifier rejects ${label}`, async () => {
    await assert.rejects(verifyCompactDelivery(client(mutation), context, request, origin), /Compact verification/);
  });
}
