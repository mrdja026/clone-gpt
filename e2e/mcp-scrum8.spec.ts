import { test, expect } from '@playwright/test';

test('SCRUM-8 with triggers MCP and ping call', async ({ page }) => {
  // Intercept ping endpoint to assert it was called
  let pingCalled = false;
  await page.route('**/api/ping-alert', async (route) => {
    pingCalled = true;
    const request = route.request();
    // Basic sanity: should be POST
    expect(request.method()).toBe('POST');
    const postData = request.postDataJSON() as any;
    expect(typeof postData).toBe('object');
    // Allow the request to go through with a mocked OK response
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
  });

  await page.goto('/');

  // Type the prompt containing DO PING
  const textarea = page.getByPlaceholder('Ask anything…');
  await textarea.fill('SCRUM-8 DO PING');
  await textarea.press('Enter');

  // Expect some MCP result rendering from the fixture
  await expect(page.getByText('JIRA Ticket: SCRUM-8', { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Summary:', { exact: false })).toBeVisible();
  await expect(page.getByText('Assignee:', { exact: false })).toBeVisible();
  await expect(page.getByText('Description:', { exact: false })).toBeVisible();

  // Ensure the ping endpoint was called
  expect(pingCalled).toBeTruthy();
});

