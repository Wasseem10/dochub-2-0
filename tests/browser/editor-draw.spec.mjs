import { expect, test } from "@playwright/test";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

test("draw mode keeps the pen strip close and leaves completed strokes unselected", async ({ page }) => {
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page", exact: true }).click();
  await page.getByRole("button", { name: "Draw", exact: true }).click();

  const settings = page.locator(".draw-tool-settings");
  const ribbon = page.locator(".reference-tool-ribbon");
  await expect(settings).toBeVisible();
  await expect(ribbon).toBeVisible();

  const [settingsBox, ribbonBox, pageBox] = await Promise.all([
    settings.boundingBox(),
    ribbon.boundingBox(),
    page.locator(".page-surface").boundingBox(),
  ]);
  expect(settingsBox).not.toBeNull();
  expect(ribbonBox).not.toBeNull();
  expect(pageBox).not.toBeNull();
  expect(settingsBox.y - (ribbonBox.y + ribbonBox.height)).toBeLessThanOrEqual(12);

  const firstStroke = [
    { x: pageBox.x + 90, y: pageBox.y + 105 },
    { x: pageBox.x + 105, y: pageBox.y + 120 },
    { x: pageBox.x + 120, y: pageBox.y + 105 },
  ];
  const secondStroke = firstStroke.map((point) => ({ ...point, x: point.x + 42 }));
  for (const stroke of [firstStroke, secondStroke]) {
    await page.mouse.move(stroke[0].x, stroke[0].y);
    await page.mouse.down();
    for (const point of stroke.slice(1)) await page.mouse.move(point.x, point.y);
    await page.mouse.up();
  }

  await expect(page.locator(".ink-annotation")).toHaveCount(2);
  await expect(page.locator(".ink-annotation.is-selected")).toHaveCount(0);
  await expect(page.locator(".ink-annotation .annotation-controls")).toHaveCount(0);
});

test("new text stays readable while the cursor is active", async ({ page }) => {
  await page.goto(appPath("/edit-pdf"));
  await page.getByRole("button", { name: "Start with a blank page", exact: true }).click();
  await page.getByRole("button", { name: "Add Text", exact: true }).click();

  const pageSurface = page.locator(".page-surface");
  const pageBox = await pageSurface.boundingBox();
  expect(pageBox).not.toBeNull();
  await page.mouse.click(pageBox.x + 90, pageBox.y + 110);

  await expect(page.getByRole("textbox", { name: "Edit text box", exact: true })).toBeFocused();
  await expect(page.locator(".text-box.is-selected .annotation-controls")).toHaveCount(0);
  await expect(page.locator(".text-box.is-selected .resize-control")).toHaveCount(0);
});
