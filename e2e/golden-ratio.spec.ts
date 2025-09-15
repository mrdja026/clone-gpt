import { test, expect } from "@playwright/test";

test("PostLogin uses golden-ratio layout with left wider than right", async ({
  page,
}) => {
  await page.goto("/");

  const left = page.getByTestId("golden-left");
  const right = page.getByTestId("golden-right");

  await expect(left).toBeVisible();
  await expect(right).toBeVisible();

  const leftBox = await left.boundingBox();
  const rightBox = await right.boundingBox();

  if (!leftBox || !rightBox) throw new Error("Missing bounding boxes");

  const ratio = leftBox.width / rightBox.width;
  // Accept tolerance around 1.618
  expect(ratio).toBeGreaterThan(1.55);
  expect(ratio).toBeLessThan(1.7);

  // Key content present
  await expect(page.getByText("Welcome back", { exact: false })).toBeVisible();
  await expect(page.getByText("Connect to provider")).toBeVisible();
  await expect(page.getByText("About")).toBeVisible();
});
