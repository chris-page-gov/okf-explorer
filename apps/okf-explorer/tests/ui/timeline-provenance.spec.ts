import { expect, test } from '@playwright/test';

test('Timeline separates a source publication month from capture and generation dates', async ({ context, page }) => {
  const url = 'https://timeline.fixture.test/okf-bundle.json';
  await context.route(url, (route) => route.fulfill({
    status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ okf_version: '0.2', title: 'Timeline provenance fixture', nodes: {
      reference: {
        id: 'reference', title: 'Handbook reference', type: 'External resource reference',
        'schema:about': {
          '@id': 'https://publisher.fixture.test/handbook',
          'schema:datePublished': { '@value': '2026-04', '@type': 'xsd:gYearMonth' }
        },
        retrieved_at: '2026-09-15T16:14:01Z',
        observedAt: '2026-09-15T17:15:00Z',
        generated: { by: 'process:fixture', at: '2026-09-15T16:14:01Z' }
      },
      later: { id: 'later', title: 'Later publication', 'schema:datePublished': '2026-07-20' },
      generated: { id: 'generated', title: 'Generated-only record', generated: { at: '2026-08-20T12:00:00Z' } },
      legacy: { id: 'legacy', title: 'Legacy timestamp record', timestamp: '2020-01-02T09:00:00Z' }
    }, relationships: [] })
  }));
  await page.goto(`?${new URLSearchParams({ bundle: url, view: 'timeline' })}#reference`);
  const timeline = page.getByRole('region', { name: 'Record timeline' });
  const handbook = timeline.getByRole('button').filter({ hasText: 'Handbook reference' });
  await expect(handbook.locator('.timeline-date')).toHaveText('Source publishedApril 2026');
  await expect(handbook.locator('.timeline-date time')).toHaveAttribute('datetime', '2026-04');
  await expect(handbook).toContainText('Captured: 15 September 2026');
  await expect(handbook).toContainText('Observed: 15 September 2026');
  await expect(handbook).toContainText('Record generated: 15 September 2026');
  await expect(handbook).not.toContainText('1 April 2026');
  await expect(timeline.getByRole('button').filter({ hasText: 'Generated-only record' }).locator('.timeline-date'))
    .toHaveText('Record generated20 August 2026');
  await expect(timeline.getByRole('button').filter({ hasText: 'Legacy timestamp record' }).locator('.timeline-date'))
    .toHaveText('Recorded timestamp2 January 2020');
  await expect(timeline.getByRole('button').locator('strong')).toHaveText([
    'Generated-only record', 'Later publication', 'Handbook reference', 'Legacy timestamp record'
  ]);
});
