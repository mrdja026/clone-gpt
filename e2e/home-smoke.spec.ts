import { test, expect } from "@playwright/test";

test("Home shows Jira Quick Actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("JiraGPT")).toBeVisible();
  await expect(page.getByText("Jira Quick Actions")).toBeVisible();
});
