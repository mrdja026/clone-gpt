import { test, expect } from '@playwright/test';

test('Diagnostics page shows health data', async ({ page }) => {
  await page.goto('/diagnostics');
  await expect(page.getByText('Diagnostics')).toBeVisible();
  await expect(page.getByText('Ollama Proxy')).toBeVisible();
  await expect(page.getByText('Environment')).toBeVisible();
});

