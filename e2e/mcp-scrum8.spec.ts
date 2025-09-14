import { test, expect } from '@playwright/test';

test('SCRUM-8 triggers MCP and renders ticket details', async ({ page }) => {
  await page.goto('/');

  const textarea = page.getByPlaceholder('Ask anything…');
  await textarea.fill('SCRUM-8');
  await textarea.press('Enter');

  // MCP kicks in; UI shows analyzing
  await expect(page.getByText('Analyzing', { exact: false })).toBeVisible({ timeout: 30_000 });

  // From fixtures: ensure the core fields render (Summary, Assignee, Description)
  await expect(page.getByText('JIRA Ticket: SCRUM-8', { exact: false })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Summary:', { exact: false })).toBeVisible();
  await expect(page.getByText('Assignee:', { exact: false })).toBeVisible();
  await expect(page.getByText('Description:', { exact: false })).toBeVisible();
});

test('Current sprint query renders sprint summary', async ({ page }) => {
  await page.goto('/');
  const textarea = page.getByPlaceholder('Ask anything…');
  await textarea.fill('current sprint');
  await textarea.press('Enter');
  await expect(page.getByText('Analyzing', { exact: false })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Sprint Summary:', { exact: false })).toBeVisible({ timeout: 30_000 });
});
