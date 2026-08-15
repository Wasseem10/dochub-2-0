import { describe, expect, it } from "vitest";
import {
  DESKTOP_PDF_PAGE_RENDER_TIMEOUT_MS,
  editorPdfRenderScale,
  MOBILE_PDF_PAGE_RENDER_TIMEOUT_MS,
  pdfPageHydrationTimeoutMs,
  pdfPageRenderTimeoutMs,
  releasePdfDocumentWithDeadline,
} from "../../src/tools/editorPdfOpening.js";

describe("mobile PDF opening strategy", () => {
  it("gives slower phones longer to render a PDF page", () => {
    expect(pdfPageRenderTimeoutMs({ mobile: true })).toBe(MOBILE_PDF_PAGE_RENDER_TIMEOUT_MS);
    expect(pdfPageRenderTimeoutMs()).toBe(DESKTOP_PDF_PAGE_RENDER_TIMEOUT_MS);
    expect(pdfPageHydrationTimeoutMs({ mobile: true })).toBeGreaterThan(MOBILE_PDF_PAGE_RENDER_TIMEOUT_MS);
    expect(pdfPageHydrationTimeoutMs()).toBeGreaterThan(DESKTOP_PDF_PAGE_RENDER_TIMEOUT_MS);
  });

  it("caps unusually large pages more aggressively on mobile", () => {
    const mobileScale = editorPdfRenderScale(2_000, 3_000, { mobile: true });
    const mobileRecoveryScale = editorPdfRenderScale(2_000, 3_000, { mobile: true, recovery: true });
    const desktopScale = editorPdfRenderScale(2_000, 3_000);
    expect(mobileScale).toBeLessThan(desktopScale);
    expect(mobileRecoveryScale).toBeLessThan(mobileScale);
    expect(2_000 * mobileScale * 3_000 * mobileScale).toBeLessThanOrEqual(1_600_001);
    expect(2_000 * mobileRecoveryScale * 3_000 * mobileRecoveryScale).toBeLessThanOrEqual(650_001);
  });

  it("does not let a stalled PDF.js destroy block page recovery", async () => {
    let releaseFinished = false;
    const startedAt = Date.now();
    await releasePdfDocumentWithDeadline({ destroy: () => new Promise(() => {}) }, { timeoutMs: 10 });
    releaseFinished = true;

    expect(releaseFinished).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(200);
  });
});
