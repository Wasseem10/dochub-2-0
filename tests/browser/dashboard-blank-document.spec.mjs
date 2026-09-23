import { expect, test } from "@playwright/test";

test("dashboard starts a blank document even when recent documents exist", async ({ page }) => {
  await page.goto("/app/dashboard");
  const blankAction = page.locator(".dashboard-selected-blank-action");

  await expect(blankAction).toBeVisible();
  await expect(blankAction).toContainText("Start blank document");
  await blankAction.click();
  await expect(page).toHaveURL(/\/app\/editor\/[^/]+/);
  await expect(page.locator('.page-surface[data-page-index="0"] .blank-doc')).toBeVisible();
  const firstDocumentUrl = page.url();

  await page.goto("/app/dashboard");
  await expect(page.locator(".dashboard-selected-shelf-item")).toHaveCount(1);
  await expect(blankAction).toBeVisible();
  await blankAction.click();
  await expect(page).toHaveURL(/\/app\/editor\/[^/]+/);
  await expect(page.locator('.page-surface[data-page-index="0"] .blank-doc')).toBeVisible();
  expect(page.url()).not.toBe(firstDocumentUrl);
});
