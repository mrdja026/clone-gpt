import { test, expect } from "@playwright/test";

test("About page renders hero, grid and project card", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByText("Mrdjan Stajic")).toBeVisible();
  await expect(
    page.getByText("10+ years of experience", { exact: false }),
  ).toBeVisible();

  // Experience cards visible
  await expect(page.getByText("Bosch")).toBeVisible();
  await expect(page.getByText("Ernst & Young", { exact: false })).toBeVisible();
  await expect(page.getByText("Fincore Group")).toBeVisible();
  await expect(page.getByText("Levi9")).toBeVisible();
  await expect(page.getByText("Videobolt.net")).toBeVisible();

  // Career break details present
  await expect(page.getByText("Independent R&D / Career Break")).toBeVisible();
  await expect(
    page.getByText("Self-directed research & prototyping"),
  ).toBeVisible();

  // Why this project card visible
  await expect(page.getByText("Why this project")).toBeVisible();
});
