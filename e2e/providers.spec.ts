import { test, expect } from '@playwright/test';

test('Home shows Connect to provider and pages open', async ({ page }) => {
  await page.goto('/');

  // Section visible
  await expect(page.getByText('Connect to provider')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Perplexity' }).or(page.getByText('Perplexity', { exact: true }))).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Notion' }).or(page.getByText('Notion', { exact: true }))).toBeVisible();

  // Perplexity page via card button
  await page.getByRole('link', { name: 'Open' }).first().click();
  await expect(page).toHaveURL(/\/providers\/perplexity$/);
  await expect(page.getByText('Enter your creds data here', { exact: false })).toBeVisible();

  // Navigate to Notion via header Providers dropdown (if present) or back link
  // Try header path first
  const providersTrigger = page.getByText('Providers').first();
  if (await providersTrigger.isVisible()) {
    await providersTrigger.click();
    await page.getByRole('menuitem', { name: 'Notion' }).click();
  } else {
    await page.goto('/providers/notion');
  }

  await expect(page).toHaveURL(/\/providers\/notion$/);
  await expect(page.getByText('Enter your creds data here', { exact: false })).toBeVisible();
  await expect(page.getByText('NOTION_API_KEY', { exact: false })).toBeVisible();
  await expect(page.getByText('NOTION_DATABASE_ID', { exact: false })).toBeVisible();
});
