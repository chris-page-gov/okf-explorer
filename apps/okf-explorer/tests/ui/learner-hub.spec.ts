import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  ONS_FACET_BUNDLE_URL,
  installOnsFacetFixture
} from './fixtures/ons-facets.fixture';

const REVIEW_BUNDLE = 'https://review.fixture.test/okf-bundle.json';

test('HUB-E2E-01 gives a beginner a complete static starting point', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Use knowledge you can inspect with your AI' })).toBeVisible();
  const workedExample = page.getByRole('link', { name: 'Open worked example' });
  await expect(workedExample).toHaveAttribute(
    'href',
    './explore/?bundle=https%3A%2F%2Fchris-page-gov.github.io%2Fokf-heritage-coventry-warwickshire%2Ftiny%2Fokf-explorer.json&q=Coventry+Cathedral#asset%2F1342941'
  );
  await expect(page.getByRole('link', { name: 'Try a bundle with AI' })).toHaveAttribute(
    'href',
    './docs/onboarding/try-a-bundle.html'
  );
  await expect(page.getByRole('heading', { name: 'An optional project course' })).toBeVisible();
  await expect(page.locator('.journey-grid > li')).toHaveCount(8);
  await expect(page.locator('.bundle-card')).toHaveCount(3);
  await context.close();
});

test('HUB-E2E-02 is accessible, compact and does not fetch a bundle', async ({ page }) => {
  const bundleRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/(?:okf-(?:bundle|explorer)|search-manifest|descriptor)[^/]*\.json(?:[?#]|$)/i.test(request.url())) {
      bundleRequests.push(request.url());
    }
  });

  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Use knowledge you can inspect with your AI' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(bundleRequests).toEqual([]);

  const analysis = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    analysis.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => ({ id: violation.id, targets: violation.nodes.flatMap((node) => node.target) }))
  ).toEqual([]);
});

test('HUB-E2E-03 keeps the worked record ahead of navigation on a narrow screen', async ({ context, page }) => {
  await installOnsFacetFixture(context);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto(`/explore/?bundle=${encodeURIComponent(ONS_FACET_BUNDLE_URL)}#overview`);
  await expect(page.getByText('ONS facet interaction fixture', { exact: true }).first()).toBeVisible();

  const panels = page.getByRole('navigation', { name: 'Workspace panels' });
  await expect(page.locator('[data-panel="content"]')).toBeVisible();
  await expect(page.locator('[data-panel="navigation"]')).toBeHidden();
  await expect(panels.getByRole('button', { name: /Results/ })).toHaveAttribute('aria-current', 'page');
  await panels.getByRole('button', { name: 'Search & facets' }).click();
  await expect(page.locator('[data-panel="navigation"]')).toBeVisible();
  await expect(page.locator('[data-panel="content"]')).toBeHidden();
  await panels.getByRole('button', { name: /Results/ }).click();
  await expect(page.locator('[data-panel="content"]')).toBeVisible();
});

test('HUB-E2E-04 preserves a legacy root Explorer link', async ({ context, page }) => {
  await context.route(REVIEW_BUNDLE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        okf_version: '0.2',
        meta: { title: 'Review fixture' },
        nodes: {
          'conversation-register': {
            id: 'conversation-register',
            title: 'OKF conversation evidence register',
            body: '# OKF conversation evidence register\n\n| Task | Evidence |\n| --- | --- |\n| EX-0003 | Timestamped exchange |'
          }
        },
        edges: []
      })
    });
  });

  const query = new URLSearchParams({ bundle: REVIEW_BUNDLE, q: 'conversation' });
  await page.goto(`/?${query.toString()}#conversation-register`);
  await expect(page).toHaveURL(new RegExp(`/explore/\\?${query.toString()}#conversation-register$`));
  const reader = page.getByRole('region', { name: 'Markdown body' });
  await expect(reader.getByRole('heading', { name: 'OKF conversation evidence register' })).toBeVisible();
  await expect(reader.getByRole('table')).toContainText('Timestamped exchange');
  await expect(page.getByRole('link', { name: 'Return to the OKF learning hub' })).toBeVisible();
});
