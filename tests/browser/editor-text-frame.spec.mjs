import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function addText(page) {
  await page.goto("/edit-pdf");
  await page.getByRole("button", { name: "Start with a blank page", exact: true }).click();
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await page.locator(".page-surface").click({ position: { x: 110, y: 180 } });
  const box = page.locator(".text-box");
  await expect(box.locator(".text-content")).toBeFocused();
  return box;
}

async function resizeRight(page, box, amount) {
  const handle = box.getByRole("button", { name: "Resize object e", exact: true });
  await expect(handle).toBeVisible();
  // Wait for auto-growing text layout before reading coordinates for a real drag.
  await handle.hover();
  const point = await handle.boundingBox();
  await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
  await page.mouse.down();
  await page.mouse.move(point.x + point.width / 2 + amount, point.y + point.height / 2, { steps: 8 });
  await page.mouse.up();
}

test("a new empty text frame can be resized before typing without disappearing", async ({ page }, testInfo) => {
  const box = await addText(page);
  await page.screenshot({ path: testInfo.outputPath("text-frame-initial.png") });
  const width = (await box.boundingBox()).width;
  await resizeRight(page, box, 70);
  await expect(box).toHaveCount(1);
  expect((await box.boundingBox()).width).toBeGreaterThan(width + 50);
  await box.getByRole("button", { name: "Edit text", exact: true }).click();
  await box.locator(".text-content").fill("A text box that stays put");
  await box.getByRole("button", { name: "Done typing", exact: true }).click();
  await expect(box).toContainText("A text box that stays put");
  await page.screenshot({ path: testInfo.outputPath("text-frame-resized.png") });
});

test("manual width survives editing, outside clicks, reload and PDF export", async ({ page }) => {
  const box = await addText(page);
  const input = box.locator(".text-content");
  await input.fill("A paragraph with several words to wrap inside the text frame.");
  const fontSize = await input.evaluate((element) => getComputedStyle(element).fontSize);
  await resizeRight(page, box, -100);
  const width = (await box.boundingBox()).width;
  expect(await input.evaluate((element) => getComputedStyle(element).fontSize)).toBe(fontSize);
  await box.getByRole("button", { name: "Edit text", exact: true }).click();
  await input.fill("A paragraph with several words to wrap inside the text frame. More text stays here.");
  await box.getByRole("button", { name: "Done typing", exact: true }).click();
  expect((await box.boundingBox()).width).toBeCloseTo(width, 0);
  await page.locator(".page-surface").click({ position: { x: 30, y: 50 } });
  await expect(box).toContainText("More text stays here.");
  await expect(page.locator(".reference-save-state")).toContainText("Saved in this browser");
  await page.reload();
  await expect(box).toContainText("More text stays here.");
  expect((await box.boundingBox()).width).toBeCloseTo(width, 0);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(await readFile(await (await pending).path())), verbosity: 0 });
  const pdf = await task.promise;
  const items = (await (await pdf.getPage(1)).getTextContent()).items.filter((item) => item.str?.trim());
  const text = items.map((item) => item.str).join(" ");
  expect(text).toContain("More text stays here.");
  expect(new Set(items.map((item) => Math.round(item.transform[5]))).size).toBeGreaterThan(1);
  for (const item of items) expect(Math.abs(item.transform[0])).toBeCloseTo(16, 1);
  await task.destroy();
});

test("touch can resize a frame without scrolling or losing the text", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "android-chromium", "Native touch input uses Chromium's mobile protocol.");
  const box = await addText(page);
  await box.locator(".text-content").fill("Touch resize");
  await box.getByRole("button", { name: "Done typing", exact: true }).click();
  const width = (await box.boundingBox()).width;
  const scrollTop = await page.locator(".canvas-column").evaluate((element) => element.scrollTop);
  const handle = await box.getByRole("button", { name: "Resize object e", exact: true }).boundingBox();
  const client = await page.context().newCDPSession(page);
  const x = handle.x + handle.width / 2;
  const y = handle.y + handle.height / 2;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step += 1) {
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + step * 6, y }] });
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await client.detach();
  expect((await box.boundingBox()).width).toBeGreaterThan(width + 35);
  expect(await page.locator(".canvas-column").evaluate((element) => element.scrollTop)).toBe(scrollTop);
  await expect(box.locator(".text-content")).toHaveText("Touch resize");
  await page.screenshot({ path: testInfo.outputPath("text-frame-touch.png") });
});

test("formatting and repeated edit-select transitions preserve the draft", async ({ page }) => {
  const box = await addText(page);
  const input = box.locator(".text-content");
  await input.fill("Keep my text while formatting");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(input).toHaveText("Keep my text while formatting");
  await expect(page.getByRole("button", { name: "Bold", exact: true })).toHaveAttribute("aria-pressed", "true");
  await box.getByRole("button", { name: "Edit text", exact: true }).click();
  await input.fill("Keep my text while formatting and resizing");
  await input.press("Escape");
  await expect(box.getByRole("button", { name: "Edit text", exact: true })).toBeVisible();
  const width = (await box.boundingBox()).width;
  await resizeRight(page, box, -40);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(input).toHaveText("Keep my text while formatting and resizing");
  expect((await box.boundingBox()).width).toBeCloseTo(width, 0);
});
