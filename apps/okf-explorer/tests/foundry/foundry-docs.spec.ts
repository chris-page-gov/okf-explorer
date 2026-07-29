import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  ['Prompt kit', 'docs/okf-authoring-prompt-kit.html', 'OKF Foundry Prompt Kit'],
  ['Domain warm-up', 'docs/prompts/okf-domain-warm-up.html', 'Prompt 1 — Compile An OKF Domain Profile'],
  ['Build and publish', 'docs/prompts/okf-bundle-build.html', 'Prompt 2 — Build, Validate And Publish An OKF Bundle'],
  [
    'Worked examples',
    'docs/prompts/domain-profile-examples.html',
    'Applying The Domain Profile Across Three Collections'
  ],
  ['Authoring profile', 'profile/authoring/v1/', 'OKF Authoring Profile v1']
] as const;

for (const [label, route, heading] of routes) {
  test(`${label} is published as readable HTML`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);
    expect(response?.headers()['content-type']).toContain('text/html');
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'OKF Foundry documentation' })).toBeVisible();
  });
}

for (const prompt of [
  {
    page: 'docs/prompts/okf-domain-warm-up.html',
    text: 'docs/prompts/okf-domain-warm-up.txt',
    heading: 'OKF Foundry — domain warm-up'
  },
  {
    page: 'docs/prompts/okf-bundle-build.html',
    text: 'docs/prompts/okf-bundle-build.txt',
    heading: 'OKF Foundry — build, assure and publish'
  }
] as const) {
  test(`copies the exact canonical prompt from ${prompt.page}`, async ({ page, request }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as Window & { __copiedPrompt?: string }).__copiedPrompt = text;
          }
        }
      });
    });

    const response = await page.goto(prompt.page);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 2, name: prompt.heading })).toBeVisible();

    const button = page.getByRole('button', { name: 'Copy full prompt' });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveText('Full prompt copied.');

    const copied = await page.evaluate(
      () => (window as Window & { __copiedPrompt?: string }).__copiedPrompt
    );
    const plainTextResponse = await request.get(prompt.text);
    expect(plainTextResponse.ok()).toBe(true);
    expect(copied).toBe(await plainTextResponse.text());
    expect(copied).toContain('# OKF Foundry');
    expect(copied).toContain('{{');
    expect(copied).not.toContain('```');
  });
}

test('chapter 19 routes readers to the rendered kit and profile', async ({ page }) => {
  const response = await page.goto(
    'docs/beginners/19-foundry-authoring-and-domain-profiles.html'
  );
  expect(response?.ok()).toBe(true);

  await expect(
    page.getByRole('link', { name: 'OKF Foundry prompt kit', exact: true })
  ).toHaveAttribute('href', '../okf-authoring-prompt-kit.html');
  await expect(
    page.getByRole('link', { name: 'authoring profile', exact: true })
  ).toHaveAttribute('href', '../../profile/authoring/v1/index.html');
  await expect(
    page.getByRole('link', { name: 'formatted domain warm-up prompt' })
  ).toHaveAttribute('href', '../prompts/okf-domain-warm-up.html');
});

test('the beginner coverage table opens rendered HTML documentation', async ({ page }) => {
  const response = await page.goto('docs/beginners/index.html');
  expect(response?.ok()).toBe(true);

  const coverageTable = page.locator('table').first();
  const repositoryGuide = coverageTable.getByRole('link', {
    name: 'Repository guide',
    exact: true
  }).first();
  await expect(repositoryGuide).toHaveAttribute('href', '../repository-guide.html');

  const [navigation] = await Promise.all([
    page.waitForNavigation(),
    repositoryGuide.click()
  ]);
  expect(navigation?.ok()).toBe(true);
  expect(navigation?.headers()['content-type']).toContain('text/html');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Repository Guide' })
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Documentation' })).toBeVisible();
});

test('cross-page fragments arrive at generated heading anchors', async ({ page }) => {
  await page.goto('docs/beginners/19-foundry-authoring-and-domain-profiles.html');
  const checklist = page.getByRole('link', { name: 'prompt kit checklist' });
  await expect(checklist).toHaveAttribute(
    'href',
    '../okf-authoring-prompt-kit.html#success-checklist'
  );
  await checklist.click();
  await expect(page).toHaveURL(/okf-authoring-prompt-kit\.html#success-checklist$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Success Checklist' })
  ).toBeVisible();
});

test('Foundry pages have no serious accessibility violations', async ({ page }) => {
  await page.goto('docs/prompts/okf-domain-warm-up.html');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical'
  );
  expect(serious).toEqual([]);
});

test('formatted prompt remains within a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('docs/prompts/okf-bundle-build.html');
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole('button', { name: 'Copy full prompt' })).toBeVisible();
});
