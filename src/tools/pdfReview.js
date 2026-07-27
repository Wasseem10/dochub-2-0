export const PDF_REVIEW_MIN_ZOOM = 60;
export const PDF_REVIEW_MAX_ZOOM = 180;
export const PDF_REVIEW_ZOOM_STEP = 20;

export function clampPdfReviewPage(pageNumber, pageCount) {
  const safePageCount = Math.max(1, Number(pageCount) || 1);
  return Math.min(safePageCount, Math.max(1, Math.round(Number(pageNumber) || 1)));
}

export function clampPdfReviewZoom(zoomPercent) {
  const safeZoom = Number(zoomPercent) || 100;
  return Math.min(PDF_REVIEW_MAX_ZOOM, Math.max(PDF_REVIEW_MIN_ZOOM, safeZoom));
}

export function calculatePdfReviewRenderMetrics({
  pageWidth,
  pageHeight,
  availableWidth,
  zoomPercent = 100,
  devicePixelRatio = 1,
}) {
  const safePageWidth = Math.max(1, Number(pageWidth) || 1);
  const safePageHeight = Math.max(1, Number(pageHeight) || 1);
  const safeAvailableWidth = Math.max(1, Number(availableWidth) || safePageWidth);
  const fitScale = Math.min(1, safeAvailableWidth / safePageWidth);
  const cssScale = fitScale * (clampPdfReviewZoom(zoomPercent) / 100);
  const renderScale = cssScale * Math.min(2, Math.max(1, Number(devicePixelRatio) || 1));

  return {
    cssScale,
    renderScale,
    cssWidth: Math.max(1, Math.round(safePageWidth * cssScale)),
    cssHeight: Math.max(1, Math.round(safePageHeight * cssScale)),
    canvasWidth: Math.max(1, Math.round(safePageWidth * renderScale)),
    canvasHeight: Math.max(1, Math.round(safePageHeight * renderScale)),
  };
}
