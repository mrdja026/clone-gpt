import { test, expect } from '@playwright/test';

// Direct route sanity check for Jira credentials without going through MCP.
// Skipped when fixtures are enabled or when required envs are missing.

const needsEnv = [
  'JIRA_BASE_URL',
  'JIRA_EMAIL',
  'JIRA_API_TOKEN',
];

const real = process.env.REAL_JIRA === '1' || process.env.REAL_JIRA === 'true';
test.skip(!real, 'Set REAL_JIRA=1 to run real Jira tests');

test('Direct GET /api/jira/myself returns profile', async ({ request }) => {
  const resp = await request.get('/api/jira/myself');
  expect(resp.ok()).toBeTruthy();
  const body = await resp.json();
  expect(body).toBeTruthy();
  // Typical Jira fields
  expect(typeof body.accountId === 'string' || typeof body.self === 'string').toBeTruthy();
  expect(typeof body.displayName === 'string' || typeof body.name === 'string').toBeTruthy();
});
