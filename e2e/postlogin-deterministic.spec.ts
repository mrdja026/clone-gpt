import { test, expect } from "@playwright/test";

test("PostLogin DeterministicSearchBar: selecting a deterministic Jira item auto-executes", async ({
  page,
}) => {
  // Root path renders PostLoginPage
  await page.goto("/");

  // Ensure the search bar is visible
  const input = page.getByPlaceholder(
    "Type to search deterministic queries...",
  );
  await expect(input).toBeVisible();

  // Focus the input to open suggestions (openOnFocus is enabled)
  await input.focus();

  // Click the deterministic suggestion for SCRUM-8 (from jiraDeterministicPrompts)
  // Suggestions are rendered as buttons with role="option"
  const option = page.getByRole("option", { name: "Show me ticket SCRUM-8" });
  await expect(option).toBeVisible();
  await option.click();

  // Verify that the chat renders the SCRUM-8 ticket content
  await expect(
    page.getByText("JIRA Ticket: SCRUM-8", { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
});
