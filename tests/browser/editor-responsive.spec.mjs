import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

test("the editor opens neutrally and keeps resized desktop canvases visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page" }).click();

  await expect(page.locator(".reference-select-tool")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Zoom out" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.locator(".page-nav")).toHaveCount(0);
  const mobileZoomControl = await page.locator(".status-bar--zoom-corner").evaluate((control) => {
    const rect = control.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left };
  });
  expect(mobileZoomControl).toMatchObject({ width: 78, height: 34, left: 4 });

  await page.setViewportSize({ width: 1440, height: 1000 });
  const desktopLayout = await page.locator(".canvas-column").evaluate((canvas) => ({
    clientWidth: canvas.clientWidth,
    pageWidth: canvas.querySelector(".page-surface")?.getBoundingClientRect().width || 0,
  }));
  expect(desktopLayout.clientWidth).toBeGreaterThan(1000);
  expect(desktopLayout.pageWidth).toBeGreaterThan(800);
  expect(desktopLayout.pageWidth).toBeLessThanOrEqual(desktopLayout.clientWidth);
});

test("an opened desktop document starts at a readable fitted zoom", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(appPath("/edit-pdf"));
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  const bytes = await document.save();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "readable-on-open.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  });
  await expect(page.locator(".page-surface")).toBeVisible();

  const layout = await page.locator(".canvas-column").evaluate((canvas) => ({
    canvasWidth: canvas.clientWidth,
    pageWidth: canvas.querySelector(".page-surface")?.getBoundingClientRect().width || 0,
  }));
  expect(layout.pageWidth).toBeGreaterThanOrEqual(layout.canvasWidth * .72);
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.canvasWidth);
});

test("editor tool selection keeps floating guidance off the document", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page" }).click();

  const editText = page.getByRole("button", { name: "Edit Text", exact: true });
  await editText.click();
  await expect(editText).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".toast")).toHaveCount(0);
  await expect(page.locator(".tool-instruction-settings")).toContainText(
    "No editable text on this page. Use Add Text to place new text.",
  );

  await page.getByRole("button", { name: "Erase", exact: true }).click();
  await expect(page.locator(".toast")).toHaveCount(0);
  await expect(page.locator(".tool-instruction-settings")).toContainText(
    "Select an annotation or existing text item to remove it.",
  );

  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  await page.getByRole("menu", { name: "Shape tools" }).getByRole("menuitem", { name: "Line", exact: true }).click();
  await expect(page.locator(".toast")).toHaveCount(0);
});

test("the mobile corner zoom control stays compact and functional", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page" }).click();

  const surface = page.locator(".page-surface");
  const initialWidth = await surface.evaluate((element) => element.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect.poll(() => surface.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(initialWidth);
  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect.poll(() => surface.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(Math.round(initialWidth));
  const customLayout = await page.locator(".canvas-column").evaluate((canvas) => ({
    clientWidth: canvas.clientWidth,
    scrollWidth: canvas.scrollWidth,
    pageLeft: canvas.querySelector(".page-surface")?.getBoundingClientRect().left || 0,
  }));
  expect(customLayout.scrollWidth).toBeGreaterThanOrEqual(customLayout.clientWidth);
  expect(customLayout.pageLeft).toBeGreaterThanOrEqual(0);
});

test("mobile text survives blur, returns to selection mode, and remains exportable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page" }).click();
  await expect(page.locator(".privacy-consent")).toHaveCount(0);
  await page.getByRole("button", { name: "Add Text", exact: true }).click();

  const surface = page.locator(".page-surface");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  await surface.click({ position: { x: Math.min(110, box.width * .3), y: Math.min(170, box.height * .25) } });

  const textBox = page.getByRole("textbox", { name: "Edit text box", exact: true });
  await expect(textBox).toBeFocused();
  await textBox.fill("Mobile text stays after blur");
  await page.getByRole("button", { name: "Select", exact: true }).click();

  await expect(textBox).toHaveText("Mobile text stays after blur");
  await expect(page.locator(".text-box")).toHaveCount(1);
  await expect(page.locator(".reference-select-tool")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Download", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
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
