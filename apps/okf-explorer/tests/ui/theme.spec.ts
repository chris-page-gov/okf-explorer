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
