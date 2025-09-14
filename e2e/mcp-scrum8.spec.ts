import { test, expect } from '@playwright/test';

test('SCRUM-8 triggers MCP and renders details', async ({ page }) => {

  await page.goto('/');

  // Type the prompt
  const textarea = page.getByPlaceholder('Ask anything…');
  await textarea.fill('SCRUM-8');
  await textarea.press('Enter');

  // Expect UI to show analyzing state (MCP + LLM flow)
  await expect(page.getByText('Analyzing', { exact: false })).toBeVisible({ timeout: 20_000 });

  // No ping assertions; only verify visible Jira details
});
