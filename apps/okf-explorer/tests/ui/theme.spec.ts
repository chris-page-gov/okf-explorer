import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the Explorer follows system colours and preserves an explicit theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('./explore/');
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  const body = page.locator('body');
  await expect(theme).toHaveValue('system');
  await expect(body).toHaveCSS('background-color', 'rgb(19, 27, 37)');
  await expect(body).toHaveCSS('color', 'rgb(241, 245, 251)');
  await theme.focus();
  await expect(theme).toBeFocused();
  await theme.selectOption('light');
  await expect(body).toHaveCSS('background-color', 'rgb(238, 242, 245)');

  await page.reload();
  await expect(theme).toHaveValue('light');
  await expect(body).toHaveCSS('background-color', 'rgb(238, 242, 245)');
  await theme.selectOption('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(body).toHaveCSS('background-color', 'rgb(19, 27, 37)');
  await page.reload();
  await expect(theme).toHaveValue('dark');
  await expect(body).toHaveCSS('background-color', 'rgb(19, 27, 37)');

  await page.emulateMedia({ media: 'print' });
  await expect(theme).toBeHidden();
  await expect(body).toHaveCSS('background-color', 'rgb(238, 242, 245)');
  await page.emulateMedia({ media: 'screen' });
  await theme.selectOption('system');
  expect(await page.evaluate(() => localStorage.getItem('okf-explorer-theme-v1'))).toBeNull();
  await expect(body).toHaveCSS('background-color', 'rgb(238, 242, 245)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(body).toHaveCSS('background-color', 'rgb(19, 27, 37)');
});

test('the sample Explorer views pass automated colour-contrast checks in both themes', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.goto('./explore/');
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  const views = page.getByRole('navigation', { name: 'Views', exact: true });
  await expect(views.getByRole('button')).toHaveCount(8);
  const viewNames = await views.getByRole('button').allTextContents();
  for (const mode of ['light', 'dark']) {
    await theme.selectOption(mode);
    for (const view of viewNames) {
      await views.getByRole('button', { name: view, exact: true }).click();
      const evidence = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      expect(evidence.violations, `${view} in ${mode} theme`).toEqual([]);
    }
  }
});

test('the selected view and keyboard focus remain visible in forced colours', async ({ page, browserName }) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.goto('./explore/');
  const views = page.getByRole('navigation', { name: 'Views', exact: true });
  const graph = views.getByRole('button', { name: 'Graph', exact: true });
  const reader = views.getByRole('button', { name: 'Reader', exact: true });

  await graph.focus();
  await graph.press('Enter');
  await expect(graph).toHaveAttribute('aria-pressed', 'true');
  await expect(reader).toHaveAttribute('aria-pressed', 'false');
  await expect(graph).toBeFocused();
  await expect(graph).toHaveCSS('text-decoration-line', 'underline');
  await expect(graph).toHaveCSS('outline-style', 'solid');
  const forcedColours = await page.evaluate(() => matchMedia('(forced-colors: active)').matches);
  if (browserName === 'chromium') expect(forcedColours).toBe(true);
  if (forcedColours) {
    await expect(graph).toHaveCSS('border-top-style', 'double');
  }
});

test('keyboard focus draws a distinct Graph edge marker in light and dark themes', async ({ page }) => {
  await page.goto('./explore/');
  await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: 'Graph', exact: true }).click();
  const edge = page.locator('.graph .edge-hit').first();
  const arrow = page.locator('.graph .edge-arrow').first();
  await expect(edge).toBeAttached();
  const theme = page.getByRole('combobox', { name: 'Theme' });
  for (const [mode, ink, arrowColour] of [
    ['light', 'rgb(23, 32, 42)', 'rgb(96, 120, 145)'],
    ['dark', 'rgb(241, 245, 251)', 'rgb(164, 181, 201)']
  ]) {
    await theme.selectOption(mode);
    await edge.focus();
    await page.keyboard.press('Shift');
    await expect(edge).toBeFocused();
    await expect(edge).toHaveCSS('stroke', ink);
    await expect(edge).toHaveCSS('opacity', '1');
    await expect(edge).toHaveCSS('stroke-linecap', 'round');
    await expect(arrow).toHaveCSS('fill', arrowColour);
  }
});
