import { describe, expect, it } from "vitest";
import {
  calculatePdfReviewRenderMetrics,
  clampPdfReviewPage,
  clampPdfReviewZoom,
  PDF_REVIEW_MAX_ZOOM,
  PDF_REVIEW_MIN_ZOOM,
} from "../../src/tools/pdfReview.js";

describe("signed PDF review", () => {
  it("keeps page navigation inside the document", () => {
    expect(clampPdfReviewPage(-4, 5)).toBe(1);
    expect(clampPdfReviewPage(3, 5)).toBe(3);
    expect(clampPdfReviewPage(12, 5)).toBe(5);
  });

  it("keeps zoom controls within the supported range", () => {
    expect(clampPdfReviewZoom(20)).toBe(PDF_REVIEW_MIN_ZOOM);
    expect(clampPdfReviewZoom(120)).toBe(120);
    expect(clampPdfReviewZoom(400)).toBe(PDF_REVIEW_MAX_ZOOM);
  });

  it("fits a page to the review surface and renders sharply on dense screens", () => {
    const metrics = calculatePdfReviewRenderMetrics({
      pageWidth: 612,
      pageHeight: 792,
      availableWidth: 306,
      zoomPercent: 100,
      devicePixelRatio: 3,
    });

    expect(metrics.cssWidth).toBe(306);
    expect(metrics.cssHeight).toBe(396);
    expect(metrics.canvasWidth).toBe(612);
    expect(metrics.canvasHeight).toBe(792);
    expect(metrics.renderScale).toBe(1);
  });
});
