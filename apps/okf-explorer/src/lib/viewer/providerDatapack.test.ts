import { describe, expect, it } from 'vitest';
import {
  normalizeProviderDatapack,
  normalizeProviderDatapackManifest,
  providerDatapackComparisonLabel,
  providerDatapackRecordContext,
  providerDatapackScopeState,
  providerDatapacksForRecord,
  resolveProviderDatapackActions,
  validateProviderDatapackCollection
} from './providerDatapack';

const snapshotId = 'metadata-enrichment-2026-07-21-r6';
const recordId = 'ons-explore-local-statistics:indicator:average-house-price';

function providerPack() {
  return {
    schema: 'okf-explorer-provider-datapack.v1',
    snapshot: snapshotId,
    id: 'ons-explore-local-statistics',
    provider: {
      id: 'ons-explore-local-statistics',
      title: 'ONS Explore Local Statistics',
      liveServiceUrl: 'https://www.ons.gov.uk/explore-local-statistics/',
      repositoryUrl: 'https://github.com/ONSdigital/explore-local-statistics-app'
    },
    selector: {
      field: 'source_surface',
      operator: 'equals',
      value: 'ons-explore-local-statistics'
    },
    governedSnapshot: {
      status: 'governed-pinned-snapshot',
      label: 'Governed metadata snapshot',
      snapshotId,
      recordCount: 108,
      sourceCommit: '795eaf204f47986f6be248a63f857a42afe4fdf2',
      sourceCommitShort: '795eaf2',
      sourceAsOf: '2026-07-17T08:35:03Z',
      sourceAsOfBasis: 'verified Git commit time',
      metadataOnly: true,
      observationsIncluded: false,
      records: [
        {
          recordId,
          title: 'Average house price',
          timeCoverageEnd: '2026-04-01/P1M',
          metadataModified: '2026-06-18',
          dataModified: '2026-06-18'
        }
      ]
    },
    reviewedLiveReference: {
      status: 'reviewed-reference-not-live-validated',
      label: 'Reviewed upstream reference',
      lastChecked: '2026-07-22',
      network: 'external',
      liveServiceUrl: 'https://www.ons.gov.uk/explore-local-statistics/',
      repositoryUrl: 'https://github.com/ONSdigital/explore-local-statistics-app',
      sourceCommit: 'd5f0ac948f8f2f5da2dacd0011ef4e4778918b01',
      sourceCommitShort: 'd5f0ac9',
      sourceCommitAsOf: '2026-07-22T14:44:20+01:00',
      metadataInputSha256: 'a'.repeat(64),
      records: [
        {
          recordId,
          title: 'Average house price',
          timeCoverageEnd: '2026-05-01/P1M',
          metadataModified: '2026-07-22',
          dataModified: '2026-07-22'
        }
      ]
    },
    comparison: {
      status: 'known-drift',
      comparisonAsOf: '2026-07-22',
      summary: 'The reviewed upstream reference is newer than the governed snapshot.',
      evidenceScope: 'reviewed-record-examples',
      exhaustive: false,
      executionRequiresLiveValidation: true,
      differences: [
        {
          recordId,
          title: 'Average house price',
          fields: [
            {
              field: 'timeCoverage.end',
              snapshot: '2026-04-01/P1M',
              reviewedLiveReference: '2026-05-01/P1M'
            },
            {
              field: 'metadataModified',
              snapshot: '2026-06-18',
              reviewedLiveReference: '2026-07-22'
            },
            {
              field: 'dataModified',
              snapshot: '2026-06-18',
              reviewedLiveReference: '2026-07-22'
            }
          ]
        }
      ]
    },
    presentation: {
      snapshotLabel: 'In this governed snapshot',
      liveLabel: 'Reviewed upstream reference',
      lastCheckedWording: 'Reviewed on 22 July 2026; not live-validated in this browser.',
      notice: 'The Explorer uses frozen metadata. The external service may have changed again.',
      actions: [
        {
          id: 'open-live-indicator',
          label: 'Open live indicator',
          kind: 'external-link',
          urlTemplate:
            'https://www.ons.gov.uk/explore-local-statistics/indicators/{native_id}',
          network: 'external'
        },
        {
          id: 'open-live-service',
          label: 'Open live service',
          kind: 'external-link',
          urlTemplate: 'https://www.ons.gov.uk/explore-local-statistics/',
          network: 'external'
        }
      ]
    }
  };
}

function providerManifest() {
  return {
    schema: 'okf-explorer-provider-datapack-manifest.v1',
    snapshot: snapshotId,
    packCount: 1,
    packs: [
      {
        id: 'ons-explore-local-statistics',
        selector: {
          field: 'source_surface',
          operator: 'equals',
          value: 'ons-explore-local-statistics'
        },
        path: 'data/providers/ons-explore-local-statistics.json',
        sha256: 'd'.repeat(64),
        status: 'known-drift',
        lastChecked: '2026-07-22'
      }
    ]
  };
}

describe('provider datapack contract', () => {
  it('normalizes and binds a reviewed live reference to the governed snapshot', () => {
    const manifest = normalizeProviderDatapackManifest(providerManifest());
    const pack = normalizeProviderDatapack(providerPack());
    const collection = validateProviderDatapackCollection(manifest, [pack], snapshotId);

    expect(collection.packs[0].governedSnapshot.sourceCommitShort).toBe('795eaf2');
    expect(collection.packs[0].reviewedLiveReference.sourceCommitShort).toBe('d5f0ac9');
    expect(providerDatapackComparisonLabel(pack.comparison.status)).toBe(
      'Known snapshot/live difference'
    );
  });

  it('selects records without making the provider contract source-specific', () => {
    const pack = normalizeProviderDatapack(providerPack());
    const collection = validateProviderDatapackCollection(
      normalizeProviderDatapackManifest(providerManifest()),
      [pack],
      snapshotId
    );
    const record = {
      id: recordId,
      record_id: recordId,
      source_surface: 'ons-explore-local-statistics',
      native_id: 'average-house-price'
    };

    expect(providerDatapacksForRecord(collection, record)).toEqual([pack]);
    expect(
      providerDatapacksForRecord(collection, {
        ...record,
        source_surface: 'nomis'
      })
    ).toEqual([]);
    expect(providerDatapackRecordContext(pack, record).difference?.fields[0]).toEqual({
      field: 'timeCoverage.end',
      snapshot: '2026-04-01/P1M',
      reviewedLiveReference: '2026-05-01/P1M'
    });
  });

  it('distinguishes reviewed differences, reviewed alignment and unreviewed records by scope', () => {
    const packValue = providerPack();
    const alignedRecordId = 'ons-explore-local-statistics:indicator:aligned-example';
    const alignedRecord = {
      recordId: alignedRecordId,
      title: 'Aligned example',
      timeCoverageEnd: '2026-05-01/P1M',
      metadataModified: '2026-07-22',
      dataModified: '2026-07-22'
    };
    packValue.governedSnapshot.records.push(alignedRecord);
    packValue.reviewedLiveReference.records.push(alignedRecord);
    const pack = normalizeProviderDatapack(packValue);

    expect(
      providerDatapackScopeState(
        pack,
        { record_id: recordId, source_surface: 'ons-explore-local-statistics' },
        'record'
      )
    ).toEqual(
      expect.objectContaining({
        status: 'known-drift',
        label: 'Known snapshot/live difference',
        isDrift: true
      })
    );

    for (const scope of ['record', 'resource'] as const) {
      const state = providerDatapackScopeState(
        pack,
        {
          record_id: alignedRecordId,
          source_surface: 'ons-explore-local-statistics'
        },
        scope
      );
      expect(state).toEqual(
        expect.objectContaining({
          status: 'aligned-reviewed-fields',
          label: 'Aligned in reviewed fields',
          isDrift: false
        })
      );
      expect(state.summary).toContain('not an exhaustive live comparison');
      expect(state.summary).not.toBe(pack.comparison.summary);
    }

    expect(
      providerDatapackScopeState(
        pack,
        {
          record_id: 'ons-explore-local-statistics:indicator:not-reviewed',
          source_surface: 'ons-explore-local-statistics'
        },
        'record'
      )
    ).toEqual(
      expect.objectContaining({
        status: 'not-reviewed',
        label: 'Record alignment not reviewed',
        isDrift: false
      })
    );
    expect(providerDatapackScopeState(pack, undefined, 'bundle')).toEqual(
      expect.objectContaining({
        status: 'known-drift',
        label: 'Known snapshot/live difference',
        summary: pack.comparison.summary
      })
    );
  });

  it('resolves only allowlisted record placeholders as one HTTPS path segment', () => {
    const pack = normalizeProviderDatapack(providerPack());
    expect(
      resolveProviderDatapackActions(pack, {
        native_id: 'average house/price'
      }).map((action) => action.url)
    ).toEqual([
      'https://www.ons.gov.uk/explore-local-statistics/indicators/average%20house%2Fprice',
      'https://www.ons.gov.uk/explore-local-statistics/'
    ]);
    expect(resolveProviderDatapackActions(pack).map((action) => action.id)).toEqual([
      'open-live-service'
    ]);
    for (const dotSegment of ['.', '..']) {
      expect(
        resolveProviderDatapackActions(pack, { native_id: dotSegment }).map(
          (action) => action.id
        )
      ).toEqual(['open-live-service']);
    }
  });

  it('rejects unsafe links, unknown placeholders and cross-snapshot packs', () => {
    const unsafe = providerPack();
    unsafe.presentation.actions[0].urlTemplate = 'javascript:alert(1)';
    expect(() => normalizeProviderDatapack(unsafe)).toThrow('absolute HTTPS URL');

    const unknownPlaceholder = providerPack();
    unknownPlaceholder.presentation.actions[0].urlTemplate =
      'https://example.test/{record_id}';
    expect(() => normalizeProviderDatapack(unknownPlaceholder)).toThrow(
      'unsupported placeholder'
    );

    for (const misplacedTemplate of [
      'https://{native_id}.example.test/indicator',
      'https://example.test/indicator/prefix-{native_id}',
      'https://example.test/indicator?id={native_id}'
    ]) {
      const misplacedPlaceholder = providerPack();
      misplacedPlaceholder.presentation.actions[0].urlTemplate = misplacedTemplate;
      expect(() => normalizeProviderDatapack(misplacedPlaceholder)).toThrow(
        'complete pathname segment'
      );
    }

    const manifest = normalizeProviderDatapackManifest(providerManifest());
    const pack = normalizeProviderDatapack(providerPack());
    expect(() =>
      validateProviderDatapackCollection(manifest, [pack], 'different-snapshot')
    ).toThrow('differs from bundle snapshot');
  });

  it('binds displayed revisions, provider identity, provider URLs and review dates', () => {
    const shortCommitMismatch = providerPack();
    shortCommitMismatch.governedSnapshot.sourceCommitShort = 'bbbbbbb';
    expect(() => normalizeProviderDatapack(shortCommitMismatch)).toThrow(
      'sourceCommitShort must abbreviate sourceCommit'
    );

    const reviewedShortCommitMismatch = providerPack();
    reviewedShortCommitMismatch.reviewedLiveReference.sourceCommitShort = '795eaf2';
    expect(() => normalizeProviderDatapack(reviewedShortCommitMismatch)).toThrow(
      'sourceCommitShort must abbreviate sourceCommit'
    );

    const providerIdMismatch = providerPack();
    providerIdMismatch.provider.id = 'different-provider';
    expect(() => normalizeProviderDatapack(providerIdMismatch)).toThrow(
      'provider.id must match its top-level id'
    );

    const providerUrlMismatch = providerPack();
    providerUrlMismatch.reviewedLiveReference.liveServiceUrl =
      'https://different.example/live/';
    expect(() => normalizeProviderDatapack(providerUrlMismatch)).toThrow(
      'reviewed reference URLs must match'
    );

    const reviewDateMismatch = providerPack();
    reviewDateMismatch.comparison.comparisonAsOf = '2026-07-23';
    expect(() => normalizeProviderDatapack(reviewDateMismatch)).toThrow(
      'comparison.comparisonAsOf must match'
    );

    const invalidSnapshotDate = providerPack();
    invalidSnapshotDate.governedSnapshot.sourceAsOf = '2026-02-30T08:35:03Z';
    expect(() => normalizeProviderDatapack(invalidSnapshotDate)).toThrow(
      'valid RFC 3339 full-date'
    );

    const invalidReviewedDateTime = providerPack();
    invalidReviewedDateTime.reviewedLiveReference.sourceCommitAsOf = '2026-07-22 13:44:20';
    expect(() => normalizeProviderDatapack(invalidReviewedDateTime)).toThrow(
      'RFC 3339 date-time'
    );
  });

  it('rejects manifest summaries that do not match the loaded pack', () => {
    const manifestValue = providerManifest();
    manifestValue.packs[0].lastChecked = '2026-07-21';
    const manifest = normalizeProviderDatapackManifest(manifestValue);
    const pack = normalizeProviderDatapack(providerPack());
    expect(() => validateProviderDatapackCollection(manifest, [pack], snapshotId)).toThrow(
      'last-checked date differs'
    );
  });

  it('requires bundle-relative pack paths and a metadata-only governed snapshot', () => {
    for (const path of [
      'https://evil.example/pack.json',
      '/data/providers/pack.json',
      '../pack.json',
      'data/../pack.json',
      '%2e%2e/pack.json',
      'data/providers/pack.json?version=1'
    ]) {
      const manifest = providerManifest();
      manifest.packs[0].path = path;
      expect(() => normalizeProviderDatapackManifest(manifest)).toThrow('path is unsafe');
    }

    const observations = providerPack();
    observations.governedSnapshot.observationsIncluded = true;
    expect(() => normalizeProviderDatapack(observations)).toThrow(
      'observationsIncluded must be false'
    );

    const notMetadataOnly = providerPack();
    notMetadataOnly.governedSnapshot.metadataOnly = false;
    expect(() => normalizeProviderDatapack(notMetadataOnly)).toThrow(
      'metadataOnly must be true'
    );

    const missingDigest = providerManifest();
    delete (missingDigest.packs[0] as { sha256?: string }).sha256;
    expect(() => normalizeProviderDatapackManifest(missingDigest)).toThrow(
      'sha256 must be a non-empty'
    );

    const uppercaseDigest = providerManifest();
    uppercaseDigest.packs[0].sha256 = 'A'.repeat(64);
    expect(() => normalizeProviderDatapackManifest(uppercaseDigest)).toThrow(
      'lowercase SHA-256'
    );

    const emptyKnownDifference = providerPack();
    emptyKnownDifference.comparison.differences = [];
    expect(() => normalizeProviderDatapack(emptyKnownDifference)).toThrow(
      'must describe a known-drift comparison'
    );

    const emptyDifferenceFields = providerPack();
    emptyDifferenceFields.comparison.differences[0].fields = [];
    expect(() => normalizeProviderDatapack(emptyDifferenceFields)).toThrow(
      'must contain at least one reviewed field'
    );

    const noLiveValidation = providerPack();
    noLiveValidation.comparison.executionRequiresLiveValidation = false;
    expect(() => normalizeProviderDatapack(noLiveValidation)).toThrow(
      'executionRequiresLiveValidation must be true'
    );

    const missingExactDifference = providerPack();
    missingExactDifference.comparison.differences[0].fields =
      missingExactDifference.comparison.differences[0].fields.filter(
        (field) => field.field !== 'metadataModified'
      );
    expect(() => normalizeProviderDatapack(missingExactDifference)).toThrow(
      'requires an exact metadataModified comparison.differences entry'
    );

    const falseAlignedPair = providerPack();
    falseAlignedPair.governedSnapshot.records.push({
      recordId: 'ons-explore-local-statistics:indicator:false-aligned',
      title: 'False aligned example',
      timeCoverageEnd: '2026-04-01/P1M',
      metadataModified: '2026-07-01',
      dataModified: '2026-07-01'
    });
    falseAlignedPair.reviewedLiveReference.records.push({
      recordId: 'ons-explore-local-statistics:indicator:false-aligned',
      title: 'False aligned example',
      timeCoverageEnd: '2026-05-01/P1M',
      metadataModified: '2026-07-01',
      dataModified: '2026-07-01'
    });
    expect(() => normalizeProviderDatapack(falseAlignedPair)).toThrow(
      'requires an exact timeCoverage.end comparison.differences entry'
    );

    const wrongExactDifference = providerPack();
    wrongExactDifference.comparison.differences[0].fields[0].reviewedLiveReference =
      '2026-06-01/P1M';
    expect(() => normalizeProviderDatapack(wrongExactDifference)).toThrow(
      'has an inexact timeCoverage.end field'
    );

    const orphanDifference = providerPack();
    orphanDifference.comparison.differences[0].recordId = 'missing-reviewed-record';
    expect(() => normalizeProviderDatapack(orphanDifference)).toThrow(
      'must reference a record in both reviewed arrays'
    );

    const wrongDifferenceTitle = providerPack();
    wrongDifferenceTitle.comparison.differences[0].title = 'A different record';
    expect(() => normalizeProviderDatapack(wrongDifferenceTitle)).toThrow(
      'title must match its governed record'
    );

    const manufacturedDifference = providerPack();
    manufacturedDifference.reviewedLiveReference.records[0].timeCoverageEnd =
      '2026-04-01/P1M';
    expect(() => normalizeProviderDatapack(manufacturedDifference)).toThrow(
      'has an inexact timeCoverage.end field'
    );

    const duplicateDifferenceRecord = providerPack();
    duplicateDifferenceRecord.comparison.differences.push({
      ...duplicateDifferenceRecord.comparison.differences[0],
      fields: [...duplicateDifferenceRecord.comparison.differences[0].fields]
    });
    expect(() => normalizeProviderDatapack(duplicateDifferenceRecord)).toThrow(
      'duplicate record IDs'
    );

    const duplicateDifferenceField = providerPack();
    duplicateDifferenceField.comparison.differences[0].fields.push({
      ...duplicateDifferenceField.comparison.differences[0].fields[0]
    });
    expect(() => normalizeProviderDatapack(duplicateDifferenceField)).toThrow(
      'duplicate field names'
    );

    for (const status of ['aligned', 'unknown']) {
      const inconsistentStatus = providerPack();
      inconsistentStatus.comparison.status = status;
      expect(() => normalizeProviderDatapack(inconsistentStatus)).toThrow(
        'must be empty unless status is known-drift'
      );
    }
  });
});
