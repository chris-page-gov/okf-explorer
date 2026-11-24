const FEDERATION_CORE_PAIRS = Object.freeze({
  'okf-explorer-federation.v1': '0.2',
  'okf-explorer-federation.v2': '0.3'
});

export function federationOverviewContract(bytes) {
  let descriptor;
  try {
    descriptor = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    throw new Error('Federation acceptance input is not valid JSON');
  }
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    throw new Error('Federation acceptance input must be an object');
  }
  const { schema, kind, okf_version: coreVersion } = descriptor;
  const expectedCore = FEDERATION_CORE_PAIRS[schema];
  if (!expectedCore || kind !== 'okf-federation') {
    throw new Error('Federation acceptance input has an unsupported descriptor schema or kind');
  }
  if (coreVersion !== expectedCore) {
    throw new Error(`${schema} requires okf_version ${expectedCore}`);
  }
  return Object.freeze({
    schema,
    okf_version: coreVersion,
    selector: `[data-federation-overview="${schema}"]`
  });
}
