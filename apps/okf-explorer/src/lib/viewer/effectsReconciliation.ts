import type {
  EffectsReconciliationState,
  EffectsReconciliationStateId,
  LargeEffectsReconciliation
} from '$lib/types';

const STATE_PRESENTATION: Record<
  EffectsReconciliationStateId,
  Pick<EffectsReconciliationState, 'label' | 'description'>
> = {
  agreement: {
    label: 'Agreement',
    description: 'The reviewed live result agrees with the frozen static snapshot.'
  },
  'live-addition': {
    label: 'Live addition',
    description: 'The reviewed live source contains an assertion not yet present in the snapshot.'
  },
  superseded: {
    label: 'Superseded',
    description: 'A frozen assertion has been replaced or is no longer present in the reviewed live result.'
  },
  inaccessible: {
    label: 'Inaccessible',
    description: 'The live route could not be compared; the frozen snapshot remains available.'
  }
};

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function optionalRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, label: string, required = false): string {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`${label} must be a non-empty string`);
    return '';
  }
  if (typeof value !== 'string' || !value.trim() || value.trim() !== value) {
    throw new Error(`${label} must be a trimmed string`);
  }
  return value;
}

function firstCount(candidates: Array<[Record<string, unknown>, string]>, label: string): number {
  for (const [record, key] of candidates) {
    if (record[key] === undefined) continue;
    const value = record[key];
    if (!Number.isSafeInteger(value) || Number(value) < 0) {
      throw new Error(`${label} must be a non-negative integer`);
    }
    return Number(value);
  }
  return 0;
}

export function normalizeEffectsReconciliation(value: unknown): LargeEffectsReconciliation {
  const document = recordValue(value, 'Effects reconciliation');
  if (document.schema !== 'okf-official-effects-reconciliation.v1') {
    throw new Error('Effects reconciliation uses an unsupported schema');
  }
  const postBuild = optionalRecord(document.post_build_live);
  const postBuildStates = optionalRecord(postBuild.states);
  const documentStates = optionalRecord(document.states);
  const counts: Record<EffectsReconciliationStateId, number> = {
    agreement: firstCount([
      [postBuildStates, 'agreement'],
      [documentStates, 'post_build_agreement'],
      [documentStates, 'agreement']
    ], 'agreement count'),
    'live-addition': firstCount([
      [postBuildStates, 'live-addition'],
      [postBuildStates, 'live_additions'],
      [postBuild, 'live_additions'],
      [documentStates, 'post_build_live_additions'],
      [documentStates, 'live_additions']
    ], 'live-addition count'),
    superseded: firstCount([
      [postBuildStates, 'superseded'],
      [postBuild, 'superseded'],
      [documentStates, 'post_build_superseded'],
      [documentStates, 'superseded']
    ], 'superseded count'),
    inaccessible: firstCount([
      [postBuildStates, 'inaccessible'],
      [postBuildStates, 'inaccessible-consistent'],
      [postBuildStates, 'inaccessible_consistent'],
      [documentStates, 'post_build_inaccessible'],
      [documentStates, 'post_build_inaccessible_consistent'],
      [documentStates, 'inaccessible']
    ], 'inaccessible count')
  };
  const scopeRecord = optionalRecord(postBuild.scope);
  const states = (Object.keys(STATE_PRESENTATION) as EffectsReconciliationStateId[]).map((id) => ({
    id,
    ...STATE_PRESENTATION[id],
    count: counts[id]
  }));
  return {
    schema: 'okf-official-effects-reconciliation.v1',
    snapshotId: stringValue(document.snapshot_id, 'snapshot_id', true),
    generatedAt: stringValue(document.generated_at, 'generated_at', true),
    observedAt: stringValue(postBuild.observed_at, 'post_build_live.observed_at'),
    releaseEffect: stringValue(postBuild.release_effect, 'post_build_live.release_effect'),
    receipt: stringValue(postBuild.receipt, 'post_build_live.receipt'),
    scope: stringValue(scopeRecord.statement, 'post_build_live.scope.statement'),
    notice: stringValue(document.notice, 'notice'),
    states
  };
}
