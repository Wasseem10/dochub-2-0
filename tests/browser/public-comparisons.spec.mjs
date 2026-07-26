import { expect, test } from "@playwright/test";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("pdfarrow.privacy-choices.v1");
  });
});

test("homepage exposes comparisons and keeps first-visit privacy choices compact", async ({ page }) => {
  await page.setViewportSize({ width: 1160, height: 704 });
  await page.goto(appPath("/"));

  await expect(page.getByRole("link", { name: "Compare", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Compare PDFArrow", exact: true })).toBeVisible();
  const consent = page.locator(".privacy-consent");
  await expect(consent).toBeVisible();
  const consentBox = await consent.boundingBox();
  expect(consentBox.height).toBeLessThan(120);
  const uploadActionBox = await page.getByRole("button", { name: "Choose a PDF from your device" }).boundingBox();
  expect(consentBox.x + consentBox.width).toBeLessThan(uploadActionBox.x + uploadActionBox.width / 2);
  await expect(consent.getByRole("button", { name: "Reject optional analytics" })).toBeVisible();
  await expect(consent.getByRole("button", { name: "Allow analytics" })).toBeVisible();
});

test("comparison pages provide mobile navigation without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appPath("/compare"));

  const consent = page.locator(".privacy-consent");
  await expect(consent).toBeVisible();
  const consentBox = await consent.boundingBox();
  expect(consentBox.height).toBeLessThan(190);
  await consent.getByRole("button", { name: "Reject optional analytics" }).click();

  await page.getByRole("link", { name: "Read the comparison" }).first().click();
  const sectionNav = page.getByRole("navigation", { name: "On this comparison page" });
  await expect(sectionNav).toBeVisible();
  await expect(sectionNav.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#comparison-table");
  await expect(sectionNav.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "#plans");
  await expect(page.getByRole("banner").locator(".marketing-brand img")).toHaveAttribute("src", "/pdfarrow-logo.png");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
