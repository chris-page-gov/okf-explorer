import { expect, test } from '@playwright/test';

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
