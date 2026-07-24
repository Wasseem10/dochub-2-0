import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function chooseShape(page, name) {
  const shapes = page.getByRole("button", { name: "Shapes", exact: true });
  if (await shapes.isVisible()) {
    await shapes.click();
    const menu = page.getByRole("menu", { name: "Shape tools" });
    await expect(menu).toBeVisible();
    await menu.getByRole("menuitem", { name, exact: true }).click();
    return;
  }

  await page.getByRole("button", { name: "More", exact: true }).click();
  const menu = page.getByRole("menu", { name: "More editing tools" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name, exact: true }).click();
}

async function drawShape(page, startRatio, endRatio) {
  const surface = page.locator(".page-surface");
  const box = await surface.boundingBox();
  await page.mouse.move(box.x + box.width * startRatio.x, box.y + box.height * startRatio.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * endRatio.x, box.y + box.height * endRatio.y, { steps: 4 });
  await page.mouse.up();
}

test("Shapes toolbar draws arrow, line, circle, and rectangle into the exported PDF", async ({ page }, testInfo) => {
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page" }).click();
  const isMobile = testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone");
  if (isMobile) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    const menu = page.getByRole("menu", { name: "More editing tools" });
    await expect(menu).toBeVisible();
    for (const name of ["Arrow", "Line", "Circle", "Rectangle"]) {
      await expect(menu.getByRole("menuitem", { name, exact: true })).toBeVisible();
    }
    await menu.getByRole("menuitem", { name: "Arrow", exact: true }).click();
  } else {
    await expect(page.getByRole("button", { name: "Shapes", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Shapes", exact: true }).click();
    const menu = page.getByRole("menu", { name: "Shape tools" });
    expect((await menu.getByRole("menuitem").allTextContents()).map((label) => label.trim())).toEqual(["Arrow", "Line", "Circle", "Rectangle"]);
    await menu.getByRole("menuitem", { name: "Arrow", exact: true }).click();
  }
  await drawShape(page, { x: 0.32, y: 0.25 }, { x: 0.12, y: 0.14 });
  const arrow = page.locator(".annotation.line-box.arrow-line:not(.drafting)");
  await expect(arrow).toHaveCount(1);
  const arrowDirection = await arrow.locator("svg > line").evaluate((line) => ({
    x1: Number(line.getAttribute("x1")),
    y1: Number(line.getAttribute("y1")),
    x2: Number(line.getAttribute("x2")),
    y2: Number(line.getAttribute("y2")),
  }));
  expect(arrowDirection.x1).toBeGreaterThan(arrowDirection.x2);
  expect(arrowDirection.y1).toBeGreaterThan(arrowDirection.y2);
  const arrowTip = await arrow.locator("svg > line").evaluate((line) => {
    const svg = line.ownerSVGElement;
    const tip = svg.createSVGPoint();
    tip.x = Number(line.getAttribute("x2"));
    tip.y = Number(line.getAttribute("y2"));
    const screenTip = tip.matrixTransform(svg.getScreenCTM());
    return { x: screenTip.x, y: screenTip.y };
  });
  const surfaceBox = await page.locator(".page-surface").boundingBox();
  expect(Math.abs(arrowTip.x - (surfaceBox.x + surfaceBox.width * 0.12))).toBeLessThanOrEqual(3);
  expect(Math.abs(arrowTip.y - (surfaceBox.y + surfaceBox.height * 0.14))).toBeLessThanOrEqual(3);

  const tipHandle = page.getByRole("button", { name: "Move arrow tip", exact: true });
  const tipHandleBox = await tipHandle.boundingBox();
  await page.mouse.move(tipHandleBox.x + tipHandleBox.width / 2, tipHandleBox.y + tipHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(surfaceBox.x + surfaceBox.width * 0.18, surfaceBox.y + surfaceBox.height * 0.1, { steps: 4 });
  await page.mouse.up();
  const adjustedArrowTip = await arrow.locator("svg > line").evaluate((line) => {
    const svg = line.ownerSVGElement;
    const tip = svg.createSVGPoint();
    tip.x = Number(line.getAttribute("x2"));
    tip.y = Number(line.getAttribute("y2"));
    const screenTip = tip.matrixTransform(svg.getScreenCTM());
    return { x: screenTip.x, y: screenTip.y };
  });
  expect(Math.abs(adjustedArrowTip.x - (surfaceBox.x + surfaceBox.width * 0.18))).toBeLessThanOrEqual(3);
  expect(Math.abs(adjustedArrowTip.y - (surfaceBox.y + surfaceBox.height * 0.1))).toBeLessThanOrEqual(3);

  await chooseShape(page, "Line");
  await drawShape(page, { x: 0.48, y: 0.14 }, { x: 0.72, y: 0.23 });
  await expect(page.locator(".annotation.line-box:not(.arrow-line):not(.drafting)")).toHaveCount(1);

  await chooseShape(page, "Circle");
  await drawShape(page, { x: 0.12, y: 0.36 }, { x: 0.32, y: 0.52 });
  const circle = page.locator(".annotation.shape.circle:not(.drafting)");
  await expect(circle).toHaveCount(1);
  const circleBox = await circle.boundingBox();
  expect(Math.abs(circleBox.width - circleBox.height)).toBeLessThanOrEqual(1.5);

  await chooseShape(page, "Rectangle");
  await drawShape(page, { x: 0.48, y: 0.36 }, { x: 0.72, y: 0.52 });
  await expect(page.locator(".annotation.shape.rectangle:not(.drafting)")).toHaveCount(1);

  if (testInfo.project.name.includes("android") || testInfo.project.name.includes("iphone")) return;

  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  const exported = await PDFDocument.load(await readFile(await download.path()));
  expect(exported.getPageCount()).toBe(1);
});
