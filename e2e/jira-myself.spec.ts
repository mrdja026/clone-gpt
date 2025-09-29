import { test, expect } from '@playwright/test';

// This test validates that calling the Jira "myself" endpoint via MCP works
// when real Jira credentials are configured. It is skipped when fixtures are on
// or when required environment variables are missing.

const needsEnv = [
  'JIRA_BASE_URL',
  'JIRA_EMAIL',
  'JIRA_API_TOKEN',
];

const real = process.env.REAL_JIRA === '1' || process.env.REAL_JIRA === 'true';
test.skip(!real, 'Set REAL_JIRA=1 to run real Jira tests');

test('Jira myself via MCP returns user profile', async ({ request }) => {
  const resp = await request.post('/api/mcp/tool', {
    data: { name: 'fetch_jira_myself', arguments: {} },
    headers: { 'content-type': 'application/json' },
  });
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  expect(body).toBeTruthy();
  expect(Array.isArray(body.content)).toBeTruthy();
  const content = body.content?.[0];
  expect(content?.type).toBe('text');
  const parsed = JSON.parse(content?.text || '{}');
  // At minimum, Jira returns accountId/displayName; email may require scopes
  expect(typeof parsed.accountId === 'string' || typeof parsed.self === 'string').toBeTruthy();
  expect(typeof parsed.displayName === 'string' || typeof parsed.name === 'string').toBeTruthy();
});
