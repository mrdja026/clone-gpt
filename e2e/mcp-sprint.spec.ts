import { test, expect } from '@playwright/test';

test('Typing "current sprint" renders Sprint Summary from MCP', async ({ page }) => {
  await page.goto('/');
  const textarea = page.getByPlaceholder('Ask anything…');
  await textarea.fill('current sprint');
  await textarea.press('Enter');
  await expect(page.getByText('Sprint Summary:', { exact: false })).toBeVisible({ timeout: 30_000 });
});
