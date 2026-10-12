export const PDF_PAGE_RENDER_TIMEOUT_MS = 8_000;
export const PDF_PAGE_RENDER_ATTEMPTS = 2;

export function serializePdfPageCanvas(canvas, { recovery = false } = {}) {
  const image = canvas.toDataURL(recovery ? "image/jpeg" : "image/png", 0.88);
  // Canvas serialization can return "data:," without throwing. Treat it as
  // a failed render so the bounded retry can use a smaller JPEG canvas.
  if (typeof image !== "string" || !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]/.test(image)) {
    throw new Error("The PDF page preview could not be created.");
  }
  return image;
}

export class PdfPageRenderTimeoutError extends Error {
  constructor(label = "PDF page", timeoutMs = PDF_PAGE_RENDER_TIMEOUT_MS) {
    super(`${label} did not finish rendering within ${Math.round(timeoutMs / 1000)} seconds.`);
    this.name = "PdfPageRenderTimeoutError";
    this.code = "PDF_PAGE_RENDER_TIMEOUT";
  }
}

export function withPdfPageDeadline(task, {
  timeoutMs = PDF_PAGE_RENDER_TIMEOUT_MS,
  label = "PDF page",
  onTimeout,
} = {}) {
  let timer;
  return Promise.race([
    Promise.resolve(task),
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => {
        try {
          onTimeout?.();
        } finally {
          reject(new PdfPageRenderTimeoutError(label, timeoutMs));
        }
      }, timeoutMs);
    }),
  ]).finally(() => globalThis.clearTimeout(timer));
}

export async function recoverPdfPageRender(render, {
  attempts = PDF_PAGE_RENDER_ATTEMPTS,
  onAttemptFailed,
} = {}) {
  const maximumAttempts = Math.max(1, Math.floor(Number(attempts) || 1));
  let lastError;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await render(attempt);
    } catch (error) {
      lastError = error;
      await onAttemptFailed?.(error, attempt, maximumAttempts);
    }
  }
  throw lastError || new Error("The PDF page could not be rendered.");
}
