import { test, expect } from "@playwright/test";

test("Jira Quick Actions render and run SCRUM-8", async ({ page }) => {
  await page.goto("/");

  // Section is visible on the home page
  await expect(page.getByText("Jira Quick Actions")).toBeVisible();

  // Click the hard action that should trigger fetch_ticket for SCRUM-8
  const scrum8Btn = page.getByRole("button", {
    name: "Show me ticket SCRUM-8",
  });
  await expect(scrum8Btn).toBeVisible();
  await scrum8Btn.click();

  // Expect ticket content to appear (fixtures-backed)
  await expect(
    page.getByText("JIRA Ticket: SCRUM-8", { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
});
