import { createHash } from 'node:crypto';
import { canonicalJson } from '../../../apps/okf-explorer/src/lib/context/index.ts';
import { contextManifest, readContextEvidence } from '../../../apps/okf-explorer/src/lib/context/delivery.ts';
import { reviewLink } from '../src/deliveryContracts.ts';

const hash = value => createHash('sha256').update(value).digest('hex');
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const equal = (actual, expected, label) => {
  if (canonicalJson(actual) !== canonicalJson(expected)) throw new Error(`Compact verification differs: ${label}.`);
};
const require = (condition, label) => { if (!condition) throw new Error(`Compact verification failed: ${label}.`); };

/** Verify transport delivery separately from context selection and evidence sufficiency. */
export async function verifyCompactDelivery(client, direct, request, reviewOrigin) {
  const budget = Object.fromEntries(['max_nodes', 'max_relationships', 'max_depth', 'max_bytes'].map(key => [key, direct.budget[key]]));
  const replay = { bundle: request.bundle, version: request.version, budget };
  const replayArgs = { ...request, budget, context_id: direct.context_id };
  const expectedReview = reviewLink(reviewOrigin, { ...replayArgs });
  const manifestLimit = 16384;
  const readLimit = 8192;
  const calls = [];
  let manifestOffset = 0;
  const catalogue = [];
  const summaries = [];
  async function call(name, arguments_, expectedContentCount) {
    const response = await client.callTool({ name, arguments: arguments_ });
    require(!response.isError && response.structuredContent, `${name} returned no structured result`);
    require(response.content?.length === expectedContentCount && response.content[0].type === 'text', `${name} content envelope`);
    equal(JSON.parse(response.content[0].text), response.structuredContent, `${name} text/structured parity`);
    return response;
  }
  do {
    const response = await call('ask_okf_manifest', { ...replayArgs, offset: manifestOffset, delivery_bytes: manifestLimit }, 2);
    const remote = response.structuredContent;
    require(remote.delivery.max_bytes >= 8192 && remote.delivery.max_bytes < manifestLimit, 'manifest internal budget');
    const expected = await contextManifest(direct, { offset: manifestOffset, max_bytes: remote.delivery.max_bytes });
    const { replay: observedReplay, review_url, response_bytes, response_limit, ...compact } = remote;
    equal(compact, expected, 'manifest content against direct context');
    equal(observedReplay, replay, 'replay identity and original context budget');
    require(review_url === expectedReview && response.content[1].type === 'resource_link'
      && response.content[1].uri === expectedReview && response.content[1].mimeType === 'text/html', 'review resource link');
    require(response_limit === manifestLimit && response_bytes === bytes(remote) && response_bytes <= manifestLimit, 'manifest response byte limit');
    require(remote.delivery.offset === manifestOffset && remote.delivery.returned === remote.records.length, 'manifest contiguous record offsets');
    require(remote.delivery.next_offset === null || remote.delivery.next_offset > manifestOffset, 'manifest continuation must progress');
    catalogue.push(...remote.records); summaries.push(remote.summary);
    calls.push({ tool: 'ask_okf_manifest', offset: manifestOffset, next_offset: remote.delivery.next_offset,
      response_bytes, response_limit, response_canonical_sha256: hash(canonicalJson(remote)) });
    manifestOffset = remote.delivery.next_offset;
    require(calls.length <= 201, 'manifest pagination limit');
  } while (manifestOffset !== null);
  equal(catalogue.map(record => record.id), direct.selected.map(item => item.record.id), 'complete ordered catalogue');
  for (const summary of summaries) equal(summary, summaries[0], 'stable manifest summary');
  const expectedURL = new URL(expectedReview);
  require(!expectedURL.search && expectedURL.pathname === '/review/' && expectedURL.origin === reviewOrigin, 'review URL origin and fragment');
  equal(JSON.parse(Buffer.from(expectedURL.hash.slice(1), 'base64url').toString('utf8')), replayArgs, 'lossless review recipe');

  const reads = [];
  async function read(section, record_id) {
    const chunks = [];
    let offset = 0;
    let contentHash;
    let characters;
    let parts = 0;
    do {
      const args = { ...replayArgs, section, ...(record_id ? { record_id } : {}), offset, delivery_bytes: readLimit };
      const remote = (await call('read_okf_evidence', args, 1)).structuredContent;
      const expected = await readContextEvidence(direct, {
        context_id: direct.context_id, section, ...(record_id ? { record_id } : {}), offset, max_bytes: readLimit
      });
      equal(remote, expected, `${section} slice against direct context`);
      require(remote.offset === offset && remote.end_offset === offset + remote.data.length, `${section} UTF-16 continuity`);
      require(remote.delivery.max_bytes === readLimit && remote.delivery.used_bytes === bytes(remote)
        && remote.delivery.used_bytes <= readLimit, `${section} JSON byte limit`);
      if (contentHash !== undefined) require(remote.content_sha256 === contentHash && remote.total_characters === characters, `${section} stable content identity`);
      contentHash = remote.content_sha256; characters = remote.total_characters;
      require(remote.next_offset === (remote.end_offset < characters ? remote.end_offset : null), `${section} continuation offset`);
      require(remote.next_offset === null || remote.next_offset > offset, `${section} continuation must progress`);
      chunks.push(remote.data); parts++;
      calls.push({ tool: 'read_okf_evidence', section, record_id: record_id ?? null, offset, next_offset: remote.next_offset,
        response_bytes: remote.delivery.used_bytes, response_limit: readLimit,
        response_canonical_sha256: hash(canonicalJson(remote)) });
      offset = remote.next_offset;
      require(parts <= 256, `${section} slice count limit`);
    } while (offset !== null);
    const value = chunks.join('');
    require(value.length === characters && hash(value) === contentHash, `${section} full reconstructed content hash`);
    reads.push({ section, record_id: record_id ?? null, slices: parts, characters, content_sha256: contentHash,
      reconstructed_hash_matches: true, contiguous_offsets: true, all_delivery_bounds_checked: true });
    return value;
  }
  // Read an actual source record and its complete inclusion/provenance metadata, not just a catalogue label.
  const record = direct.selected.find(item => item.record.kind === 'evidence');
  require(record, 'acceptance context contains a source evidence record');
  equal(await read('record_text', record.record.id), record.record.text, 'source text exact parity');
  const metadata = JSON.parse(await read('record_metadata', record.record.id));
  equal(metadata.record.provenance, record.record.provenance, 'source provenance exact parity');
  equal(metadata.reasons, record.reasons, 'inclusion reasons exact parity');
  equal(metadata.paths, record.paths, 'traversal paths exact parity');
  const diagnostics = JSON.parse(await read('diagnostics'));
  equal(diagnostics.missing_evidence, direct.missing_evidence, 'missing evidence exact parity');
  equal(diagnostics.budget, direct.budget, 'context selection budget exact parity');
  equal(JSON.parse(await read('relationships')), direct.relationships, 'relationship exact parity');
  const reconstructed = await read('package');
  require(reconstructed === canonicalJson(direct), 'complete package canonical bytes');
  equal(JSON.parse(reconstructed), direct, 'complete package structural parity');
  const controls = [];
  const staleIdentity = `urn:sha256:${direct.context_id.endsWith('0'.repeat(64)) ? '1'.repeat(64) : '0'.repeat(64)}`;
  for (const control of [
    { id: 'stale-context', args: { ...replayArgs, context_id: staleIdentity, section: 'package' } },
    { id: 'unknown-record', args: { ...replayArgs, section: 'record_text', record_id: 'urn:okf:unknown-verification-record' } },
    { id: 'out-of-range', args: { ...replayArgs, section: 'package', offset: reconstructed.length + 1 } }
  ]) {
    const response = await client.callTool({ name: 'read_okf_evidence', arguments: control.args });
    require(response.isError === true && response.structuredContent === undefined
      && response.content?.length === 1 && response.content[0].type === 'text', `${control.id} must fail without evidence`);
    require(response.content[0].text === 'Evidence could not be verified. The context identity, selected record or requested range may differ. No source content was returned; start again with ask_okf_manifest if the source or question changed.', `${control.id} fixed error`);
    controls.push({ id: control.id, rejected_without_evidence: true });
  }
  return { id: 'bounded-abroad-compact-delivery', bundle_version: request.version,
    question_sha256: hash(request.question), context_id: direct.context_id, context_budget: budget,
    evidence_status: direct.evidence_status, context_truncated: direct.budget.truncated,
    retrieval_truncated: direct.retrieval?.truncated ?? false, selected_records: direct.selected.length,
    selected_relationships: direct.relationships.length, catalogue_records: catalogue.length,
    catalogue_pages: summaries.length, catalogue_matches_selected_records: true,
    review_recipe_matches_context: true, review_url: expectedReview,
    package_canonical_sha256: hash(reconstructed), reconstructed_package_bytes: Buffer.byteLength(reconstructed),
    reconstructed_package_matches_direct_engine: true, text_matches_structured_content: true,
    all_delivery_bounds_checked: true, model_answer_present: false,
    reads, negative_controls: controls, calls };
}
