import { expect, test } from "@playwright/test";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

const representativeTools = [
  { path: "/merge-pdf", dropzone: ".conversion-dropzone" },
  { path: "/pdf-to-word", dropzone: ".conversion-dropzone" },
  { path: "/ocr-pdf", dropzone: ".conversion-dropzone" },
  { path: "/translate-pdf", dropzone: ".analysis-upload" },
  { path: "/redact-pdf", dropzone: ".redact-upload" },
];

for (const { path, dropzone } of representativeTools) {
  test(`${path} uses the shared Edit PDF upload-first landing system`, async ({ page }) => {
    await page.goto(appPath(path));
    const heading = page.locator("main h1").first();
    const upload = page.locator(dropzone).first();
    const primaryAction = upload.locator("button").first();

    await expect(heading).toBeVisible();
    await expect(upload).toBeVisible();
    await expect(primaryAction).toBeVisible();

    const visualTokens = await upload.evaluate((element) => {
      const uploadStyle = getComputedStyle(element);
      const buttonStyle = getComputedStyle(element.querySelector("button"));
      return {
        minHeight: Number.parseFloat(uploadStyle.minHeight),
        background: uploadStyle.backgroundColor,
        buttonBackground: buttonStyle.backgroundColor,
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(visualTokens.minHeight).toBeGreaterThanOrEqual(320);
    expect(visualTokens.background).toMatch(/rgba?\(255, 255, 255/);
    expect(visualTokens.buttonBackground).toBe("rgb(40, 81, 235)");
    expect(visualTokens.scrollWidth).toBeLessThanOrEqual(visualTokens.viewportWidth + 1);
  });
}

test("representative tool landings remain upload-first without horizontal overflow on phones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const { path, dropzone } of representativeTools) {
    await page.goto(appPath(path));
    await expect(page.locator(dropzone).first()).toBeVisible();
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(widths.content, `${path} should not overflow horizontally`).toBeLessThanOrEqual(widths.viewport + 1);
  }
});
