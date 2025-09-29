import { test, expect } from '@playwright/test';

test('healthz exposes env and ollamaProxy status', async ({ request }) => {
  const res = await request.get('/api/healthz');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe('ok');
  expect(body.env).toBeTruthy();
  expect(typeof body.env.OPENAI_BASE_URL).toBe('string');
  expect(body.ollamaProxy).toBeTruthy();
  // Key fields should exist regardless of activation
  expect(typeof body.ollamaProxy.active).toBe('boolean');
  expect(typeof body.ollamaProxy.baseUrl).toBe('string');
  expect(typeof body.ollamaProxy.checkedModel).toBe('string');
});

