import { expect, test } from "@playwright/test";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

test("the editor opens neutrally and keeps resized desktop canvases visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page" }).click();

  await expect(page.locator(".reference-select-tool")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".page-nav-zoom-select")).toHaveValue("fit-width");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".page-nav-zoom-select")).toHaveValue("100");
  const desktopLayout = await page.locator(".canvas-column").evaluate((canvas) => ({
    clientWidth: canvas.clientWidth,
    pageWidth: canvas.querySelector(".page-surface")?.getBoundingClientRect().width || 0,
  }));
  expect(desktopLayout.clientWidth).toBeGreaterThan(1000);
  expect(desktopLayout.pageWidth).toBeGreaterThan(500);
});

test("mobile zoom modes are named and custom zoom remains pannable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page" }).click();

  const zoom = page.locator(".page-nav-zoom-select");
  await expect(zoom).toHaveValue("fit-width");
  await expect(zoom.locator("option:checked")).toHaveText("Fit width");

  await zoom.selectOption("fit-page");
  await expect(zoom.locator("option:checked")).toHaveText("Fit page");

  await zoom.selectOption("100");
  const customLayout = await page.locator(".canvas-column").evaluate((canvas) => ({
    clientWidth: canvas.clientWidth,
    scrollWidth: canvas.scrollWidth,
    pageLeft: canvas.querySelector(".page-surface")?.getBoundingClientRect().left || 0,
  }));
  expect(customLayout.scrollWidth).toBeGreaterThan(customLayout.clientWidth);
  expect(customLayout.pageLeft).toBeGreaterThanOrEqual(0);
});

test("the homepage keeps one hero upload target and the desktop CTA in view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(appPath("/"));

  await expect(page.locator(".freepdf-hero button")).toHaveCount(1);
  await expect(page.locator(".freepdf-tool-card")).toHaveCount(10);
  const desktopHeader = await page.locator(".freepdf-header-cta").evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return { right: rect.right, innerWidth: window.innerWidth };
  });
  expect(desktopHeader.right).toBeLessThanOrEqual(desktopHeader.innerWidth);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileHero = await page.locator(".freepdf-hero").evaluate((hero) => ({
    height: hero.getBoundingClientRect().height,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(mobileHero.height).toBeLessThan(800);
  expect(mobileHero.scrollWidth).toBeLessThanOrEqual(mobileHero.innerWidth);

  const mobileToolColumns = await page.locator(".freepdf-tool-grid").evaluate((grid) =>
    getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length);
  expect(mobileToolColumns).toBe(2);
});
