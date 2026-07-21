import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function chooseShape(page, name) {
  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  const menu = page.getByRole("menu", { name: "Shape tools" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name, exact: true }).click();
}

async function drawShape(page, startRatio, endRatio) {
  const surface = page.locator(".page-surface");
  const box = await surface.boundingBox();
  const start = {
    pointerId: 9,
    pointerType: "mouse",
    clientX: box.x + box.width * startRatio.x,
    clientY: box.y + box.height * startRatio.y,
    buttons: 1,
    bubbles: true,
  };
  const end = {
    pointerId: 9,
    pointerType: "mouse",
    clientX: box.x + box.width * endRatio.x,
    clientY: box.y + box.height * endRatio.y,
    buttons: 1,
    bubbles: true,
  };
  await surface.dispatchEvent("pointerdown", start);
  await page.waitForTimeout(50);
  await surface.dispatchEvent("pointermove", end);
  await page.waitForTimeout(50);
  await surface.dispatchEvent("pointerup", { ...end, buttons: 0 });
}

test("Shapes toolbar draws arrow, line, circle, and rectangle into the exported PDF", async ({ page }) => {
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page" }).click();
  await expect(page.getByRole("button", { name: "Shapes", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  const menu = page.getByRole("menu", { name: "Shape tools" });
  expect((await menu.getByRole("menuitem").allTextContents()).map((label) => label.trim())).toEqual(["Arrow", "Line", "Circle", "Rectangle"]);
  await menu.getByRole("menuitem", { name: "Arrow", exact: true }).click();
  await drawShape(page, { x: 0.12, y: 0.14 }, { x: 0.32, y: 0.23 });

  await chooseShape(page, "Line");
  await drawShape(page, { x: 0.48, y: 0.14 }, { x: 0.72, y: 0.23 });

  await chooseShape(page, "Circle");
  await drawShape(page, { x: 0.12, y: 0.36 }, { x: 0.32, y: 0.52 });

  await chooseShape(page, "Rectangle");
  await drawShape(page, { x: 0.48, y: 0.36 }, { x: 0.72, y: 0.52 });

  await expect(page.locator(".annotation.line-box.arrow-line:not(.drafting)")).toHaveCount(1);
  await expect(page.locator(".annotation.line-box:not(.arrow-line):not(.drafting)")).toHaveCount(1);
  await expect(page.locator(".annotation.shape.circle:not(.drafting)")).toHaveCount(1);
  await expect(page.locator(".annotation.shape.rectangle:not(.drafting)")).toHaveCount(1);

  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  const exported = await PDFDocument.load(await readFile(await download.path()));
  expect(exported.getPageCount()).toBe(1);
});
