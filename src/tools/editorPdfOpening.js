export const MOBILE_PDF_PAGE_RENDER_TIMEOUT_MS = 20_000;
export const DESKTOP_PDF_PAGE_RENDER_TIMEOUT_MS = 8_000;

const MOBILE_MAX_RENDER_PIXELS = 1_600_000;
const DESKTOP_MAX_RENDER_PIXELS = 4_000_000;
const MOBILE_MAX_RENDER_DIMENSION = 4_096;
const DESKTOP_MAX_RENDER_DIMENSION = 8_192;
const PREFERRED_RENDER_SCALE = 1.35;

export function pdfPageRenderTimeoutMs({ mobile = false } = {}) {
  return mobile ? MOBILE_PDF_PAGE_RENDER_TIMEOUT_MS : DESKTOP_PDF_PAGE_RENDER_TIMEOUT_MS;
}

export function editorPdfRenderScale(width, height, { mobile = false } = {}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const maxPixels = mobile ? MOBILE_MAX_RENDER_PIXELS : DESKTOP_MAX_RENDER_PIXELS;
  const maxDimension = mobile ? MOBILE_MAX_RENDER_DIMENSION : DESKTOP_MAX_RENDER_DIMENSION;
  return Math.max(0.1, Math.min(
    PREFERRED_RENDER_SCALE,
    Math.sqrt(maxPixels / (safeWidth * safeHeight)),
    maxDimension / safeWidth,
    maxDimension / safeHeight,
  ));
}

export function shouldDeferInitialCloudPage({ cloudDocumentRecord, mobile = false } = {}) {
  return Boolean(mobile && cloudDocumentRecord?.cloudDocumentId);
}
