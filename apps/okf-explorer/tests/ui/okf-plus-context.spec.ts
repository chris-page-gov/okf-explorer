import { expect, test } from '@playwright/test';
import { openOnsFacetFixture } from './fixtures/ons-facets.fixture';

test('native field inspection preserves gaps and opens bounded evidence discovery without an automatic request', async ({ page }) => {
  const id = 'https://example.test/okf/id/building-v4';
  const requests: string[] = [];
  await openOnsFacetFixture(page, requests, {
    learningPresentation: { schema: 'okf-large-learning-presentation.v1', paths: [{ id: 'height', title: 'Investigate height', steps: [{ route: 'dataset/ons-record-0001', title: 'Read the building metadata', outcome: 'Separate relative height from a datum' }] }] },
    recordContext: {
      schema: 'gis-ai-go.okf-plus-record-context.v1', record_id: id, source_revision: 'a'.repeat(40),
      metadata: { '@id': id, nativeIdentifier: 'building-v4', version: null, limitations: ['Metadata only; observed values are not established.'],
        sources: [{ resource: 'https://example.test/schema/v4', sourcePointer: '/properties/height' }],
        'okfp:field': [{ '@id': `${id}/field/height_relativemax_m`, 'dcterms:identifier': 'height_relativemax_m',
          'okfp:schemaDefinition': { '@value': { type: ['number', 'null'] }, '@type': '@json' }, 'okfp:queryable': false,
          'prov:wasDerivedFrom': { '@id': 'https://example.test/schema/v4' } }]
      }
    }
  });
  await page.getByRole('button', { name: 'Read the building metadata', exact: true }).click();
  const context = page.getByRole('region', { name: 'Record explanation and sources' });
  await expect(context).toBeVisible();
  await context.getByRole('combobox', { name: 'Choose a native field' }).selectOption(`${id}/field/height_relativemax_m`);
  const field = context.getByRole('region', { name: 'Selected native field' });
  await expect(field.getByRole('heading', { name: 'Selected field: height_relativemax_m' })).toBeVisible();
  await expect(field).toContainText('Not recorded in this record.');
  await expect(field).toContainText('Similar names in another version or collection remain separate.');
  await expect(field.getByRole('link', { name: 'Open this field’s schema source' })).toHaveAttribute('href', 'https://example.test/schema/v4');
  await expect(context).toContainText('Recorded as null.');
  await context.getByRole('button', { name: 'Find supporting evidence' }).click();
  const question = page.getByRole('textbox', { name: 'Question', exact: true });
  await expect(question).toHaveValue('height_relativemax_m building-v4');
  await expect(question).toBeFocused();
  expect(requests.some(path => /context|corpus/.test(path))).toBe(false);
});
