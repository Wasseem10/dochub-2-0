import { describe, expect, it } from "vitest";
import {
  DESKTOP_PDF_PAGE_RENDER_TIMEOUT_MS,
  editorPdfRenderScale,
  MOBILE_PDF_PAGE_RENDER_TIMEOUT_MS,
  pdfPageRenderTimeoutMs,
  shouldDeferInitialCloudPage,
} from "../../src/tools/editorPdfOpening.js";

describe("mobile PDF opening strategy", () => {
  it("opens account PDFs before waiting for page-one rendering on mobile", () => {
    expect(shouldDeferInitialCloudPage({
      mobile: true,
      cloudDocumentRecord: { cloudDocumentId: "doc_123" },
    })).toBe(true);
    expect(shouldDeferInitialCloudPage({
      mobile: false,
      cloudDocumentRecord: { cloudDocumentId: "doc_123" },
    })).toBe(false);
    expect(shouldDeferInitialCloudPage({ mobile: true, cloudDocumentRecord: null })).toBe(false);
  });

  it("gives slower phones longer to render a PDF page", () => {
    expect(pdfPageRenderTimeoutMs({ mobile: true })).toBe(MOBILE_PDF_PAGE_RENDER_TIMEOUT_MS);
    expect(pdfPageRenderTimeoutMs()).toBe(DESKTOP_PDF_PAGE_RENDER_TIMEOUT_MS);
  });

  it("caps unusually large pages more aggressively on mobile", () => {
    const mobileScale = editorPdfRenderScale(2_000, 3_000, { mobile: true });
    const desktopScale = editorPdfRenderScale(2_000, 3_000);
    expect(mobileScale).toBeLessThan(desktopScale);
    expect(2_000 * mobileScale * 3_000 * mobileScale).toBeLessThanOrEqual(1_600_001);
  });
});
