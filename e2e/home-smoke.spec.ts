import { test, expect } from '@playwright/test';

test('Home loads and input accepts text', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('JiraGPT')).toBeVisible();
  const textarea = page.getByPlaceholder('Ask anything…');
  await expect(textarea).toBeVisible();
  await textarea.fill('hello');
  await textarea.press('Enter');
  // Do not assert on model output; just ensure UI updates a bot message
  await expect(page.getByText('Analyzing', { exact: false })).toBeVisible({ timeout: 20000 });
});
