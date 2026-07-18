import { loadPdfRuntime } from "./pdfRuntime.mjs";

function copyPdfBytes(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes.slice(0);
  if (ArrayBuffer.isView(bytes)) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  throw new TypeError("PDF data must be an ArrayBuffer or typed array.");
}

export async function createPdfDocumentController(bytes, { canvasFactory, runtime, maxCachedPreviews = 18 } = {}) {
  const pdfjsLib = await (runtime || loadPdfRuntime());
  const loadingTask = pdfjsLib.getDocument({ data: copyPdfBytes(bytes) });
  const pdfDocument = await loadingTask.promise;
  const textDataPromises = new Map();
  const previewPromises = new Map();
  const previewCacheLimit = Number.isFinite(maxCachedPreviews) ? Math.max(1, Math.floor(maxCachedPreviews)) : 18;
  let renderQueue = Promise.resolve();
  let destroyed = false;

  const getTextData = (pageNumber) => {
    if (destroyed) return Promise.reject(new Error("PDF document session is closed."));
    if (!textDataPromises.has(pageNumber)) {
      textDataPromises.set(pageNumber, (async () => {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const textViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 1.35 });
        const text = textContent.items
          .map((item) => item.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        return {
          pageNumber,
          text,
          textContent,
          textViewport,
          width: viewport.width,
          height: viewport.height,
          rotation: page.rotate || 0,
        };
      })().catch((error) => {
        textDataPromises.delete(pageNumber);
        throw error;
      }));
    }
    return textDataPromises.get(pageNumber);
  };

  const renderPreview = (pageNumber, scale = 1.35) => {
    if (destroyed) return Promise.reject(new Error("PDF document session is closed."));
    const cacheKey = `${pageNumber}:${scale}`;
    if (previewPromises.has(cacheKey)) {
      const cachedPreview = previewPromises.get(cacheKey);
      previewPromises.delete(cacheKey);
      previewPromises.set(cacheKey, cachedPreview);
      return cachedPreview;
    }

    const renderPromise = renderQueue.then(async () => {
      if (destroyed) throw new Error("PDF document session is closed.");
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = canvasFactory ? canvasFactory() : window.document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas rendering is unavailable.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      try {
        await page.render({ canvasContext: context, viewport }).promise;
        return canvas.toDataURL("image/png");
      } finally {
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }
    });
    renderQueue = renderPromise.catch(() => undefined);
    const cachedRenderPromise = renderPromise.catch((error) => {
      previewPromises.delete(cacheKey);
      throw error;
    });
    previewPromises.set(cacheKey, cachedRenderPromise);
    while (previewPromises.size > previewCacheLimit) {
      const oldestKey = previewPromises.keys().next().value;
      previewPromises.delete(oldestKey);
    }
    return cachedRenderPromise;
  };

  return {
    pdfjsLib,
    numPages: pdfDocument.numPages,
    getTextData,
    renderPreview,
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      textDataPromises.clear();
      previewPromises.clear();
      await loadingTask.destroy();
    },
  };
}
