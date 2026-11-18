import { expect, test } from '@playwright/test';

test('reopens a saved ONS boundary map in a new offline tab', async ({ page, context, baseURL }) => {
  const root = new URL('.', baseURL);
  const descriptor = new URL('profile/geospatial-boundary-pack/v1/examples/uk-countries-december-2025/okf-explorer.json', root);
  const app = new URL('explore/', root);
  app.searchParams.set('bundle', descriptor.href);
  app.searchParams.set('view', 'map');
  app.hash = 'dataset/N92000002';
  const boundaryRequests: string[] = [];
  page.on('request', request => {
    if (request.url().endsWith('.geojson')) boundaryRequests.push(request.url());
  });

  await page.goto(app.href);
  await expect(page.getByText('United Kingdom countries · 2025-12 · overview')).toBeVisible();
  expect(boundaryRequests).toHaveLength(1);
  expect(boundaryRequests[0]).toMatch(/overview\.geojson$/);
  await page.getByRole('button', { name: 'Save map for offline use' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Map saved.' })).toBeVisible({ timeout: 28_000 });
  const workerScope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope);
  expect(workerScope).toBe(new URL('explore/', root).href);

  const reopen = page.url();
  await page.close();
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  const response = await offlinePage.goto(reopen);
  expect(response?.fromServiceWorker()).toBe(true);
  await expect(offlinePage.getByText('United Kingdom countries · 2025-12 · overview')).toBeVisible();
  await expect(offlinePage.locator('[data-boundary-code]')).toHaveCount(4);
  await offlinePage.getByRole('button', { name: 'Show focused map' }).click();
  await expect(offlinePage.getByText('United Kingdom countries · 2025-12 · detail')).toBeVisible();
  await offlinePage.getByText('Boundaries and geography codes', { exact: true }).click();
  await expect(offlinePage.getByText('Northern Ireland (N92000002)', { exact: true })).toBeVisible();
});
