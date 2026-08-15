export const MOBILE_PDF_PAGE_RENDER_TIMEOUT_MS = 20_000;
export const DESKTOP_PDF_PAGE_RENDER_TIMEOUT_MS = 8_000;
export const PDF_DOCUMENT_RELEASE_TIMEOUT_MS = 1_000;
export const PDF_PAGE_HYDRATION_TIMEOUT_BUFFER_MS = 2_000;

const MOBILE_MAX_RENDER_PIXELS = 1_600_000;
const MOBILE_RECOVERY_MAX_RENDER_PIXELS = 650_000;
const DESKTOP_MAX_RENDER_PIXELS = 4_000_000;
const MOBILE_MAX_RENDER_DIMENSION = 4_096;
const MOBILE_RECOVERY_MAX_RENDER_DIMENSION = 2_048;
const DESKTOP_MAX_RENDER_DIMENSION = 8_192;
const PREFERRED_RENDER_SCALE = 1.35;

export function pdfPageRenderTimeoutMs({ mobile = false } = {}) {
  return mobile ? MOBILE_PDF_PAGE_RENDER_TIMEOUT_MS : DESKTOP_PDF_PAGE_RENDER_TIMEOUT_MS;
}

export function pdfPageHydrationTimeoutMs({ mobile = false } = {}) {
  return pdfPageRenderTimeoutMs({ mobile }) + PDF_PAGE_HYDRATION_TIMEOUT_BUFFER_MS;
}

export function editorPdfRenderScale(width, height, { mobile = false, recovery = false } = {}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const maxPixels = mobile
    ? recovery ? MOBILE_RECOVERY_MAX_RENDER_PIXELS : MOBILE_MAX_RENDER_PIXELS
    : DESKTOP_MAX_RENDER_PIXELS;
  const maxDimension = mobile
    ? recovery ? MOBILE_RECOVERY_MAX_RENDER_DIMENSION : MOBILE_MAX_RENDER_DIMENSION
    : DESKTOP_MAX_RENDER_DIMENSION;
  return Math.max(0.1, Math.min(
    PREFERRED_RENDER_SCALE,
    Math.sqrt(maxPixels / (safeWidth * safeHeight)),
    maxDimension / safeWidth,
    maxDimension / safeHeight,
  ));
}

export async function releasePdfDocumentWithDeadline(documentProxy, {
  timeoutMs = PDF_DOCUMENT_RELEASE_TIMEOUT_MS,
} = {}) {
  if (typeof documentProxy?.destroy !== "function") return;
  let timer;
  try {
    await Promise.race([
      Promise.resolve().then(() => documentProxy.destroy()).catch(() => undefined),
      new Promise((resolve) => {
        timer = globalThis.setTimeout(resolve, Math.max(0, Number(timeoutMs) || 0));
      }),
    ]);
  } finally {
    globalThis.clearTimeout(timer);
  }
}
