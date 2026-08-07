import {
  OCR_PDF_LIMITS,
  enhanceOcrImageData,
  flattenOcrWords,
  isSupportedOcrLanguage,
  ocrRenderScaleForPage,
  summarizeOcrConfidence,
} from "./ocrPdf.js";
import { loadPdfJs } from "./scannedPdfDetection.js";

function abortError() {
  return new DOMException("Local OCR was cancelled.", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

/** Converts a rendered PDF page to high-contrast grayscale using OpenCV.js. */
export function preprocessCanvasWithOpenCv(sourceCanvas, cv, createCanvas = () => document.createElement("canvas")) {
  const outputCanvas = createCanvas();
  outputCanvas.width = sourceCanvas.width;
  outputCanvas.height = sourceCanvas.height;

  const source = cv.imread(sourceCanvas);
  const grayscale = new cv.Mat();
  const enhanced = new cv.Mat();
  const rgba = new cv.Mat();
  try {
    cv.cvtColor(source, grayscale, cv.COLOR_RGBA2GRAY);
    cv.equalizeHist(grayscale, enhanced);
    cv.cvtColor(enhanced, rgba, cv.COLOR_GRAY2RGBA);
    cv.imshow(outputCanvas, rgba);
    return outputCanvas;
  } finally {
    source.delete();
    grayscale.delete();
    enhanced.delete();
    rgba.delete();
  }
}

/**
 * Keeps OpenCV initialization and pixel processing off the UI thread. One worker
 * is reused for all pages in a document and terminated when the OCR run ends.
 */
export function createOpenCvWorkerPreprocessor({
  workerFactory = () => new Worker(new URL("../workers/opencvPreprocess.worker.js", import.meta.url), { type: "module" }),
  createCanvas = () => document.createElement("canvas"),
  initializationTimeoutMs = 12_000,
} = {}) {
  const worker = workerFactory();
  const pending = new Map();
  let nextRequestId = 1;
  let disposed = false;
  let fallbackOnly = false;

  const canvasFromPixels = (pixels, width, height) => {
    const output = createCanvas();
    output.width = width;
    output.height = height;
    const context = output.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not prepare the cleaned page for OCR.");
    context.putImageData(new ImageData(pixels, width, height), 0, 0);
    return output;
  };

  const fallbackCanvas = (request) => {
    const enhanced = enhanceOcrImageData({
      data: request.fallbackPixels,
      width: request.width,
      height: request.height,
    }, "auto");
    return canvasFromPixels(enhanced.data, enhanced.width, enhanced.height);
  };

  const rejectPending = (error) => {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.signal?.removeEventListener("abort", request.abort);
      request.reject(error);
    }
    pending.clear();
  };

  worker.addEventListener("message", (event) => {
    const request = pending.get(event.data?.id);
    if (!request) return;
    pending.delete(event.data.id);
    clearTimeout(request.timeout);
    request.signal?.removeEventListener("abort", request.abort);
    if (event.data.error) {
      fallbackOnly = true;
      worker.terminate();
      request.resolve(fallbackCanvas(request));
      return;
    }
    const pixels = new Uint8ClampedArray(event.data.pixels);
    request.resolve(canvasFromPixels(pixels, event.data.width, event.data.height));
  });
  worker.addEventListener("error", () => {
    fallbackOnly = true;
    worker.terminate();
    for (const [id, request] of pending.entries()) {
      pending.delete(id);
      clearTimeout(request.timeout);
      request.signal?.removeEventListener("abort", request.abort);
      request.resolve(fallbackCanvas(request));
    }
  });

  return {
    process(sourceCanvas, signal) {
      if (disposed) return Promise.reject(new Error("The OpenCV.js preprocessor has already closed."));
      if (signal?.aborted) return Promise.reject(abortError());
      const context = sourceCanvas.getContext("2d", { alpha: false, willReadFrequently: true });
      if (!context) return Promise.reject(new Error("This browser could not read the rendered PDF page."));
      const imageData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      const fallbackPixels = new Uint8ClampedArray(imageData.data);
      if (fallbackOnly) {
        return Promise.resolve(fallbackCanvas({ fallbackPixels, width: imageData.width, height: imageData.height }));
      }
      const id = nextRequestId;
      nextRequestId += 1;
      return new Promise((resolve, reject) => {
        const abort = () => {
          const request = pending.get(id);
          pending.delete(id);
          clearTimeout(request?.timeout);
          reject(abortError());
        };
        const request = {
          resolve,
          reject,
          signal,
          abort,
          fallbackPixels,
          width: imageData.width,
          height: imageData.height,
          timeout: null,
        };
        request.timeout = setTimeout(() => {
          if (!pending.has(id)) return;
          pending.delete(id);
          signal?.removeEventListener("abort", abort);
          fallbackOnly = true;
          worker.terminate();
          try {
            resolve(fallbackCanvas(request));
          } catch (error) {
            reject(error);
          }
        }, initializationTimeoutMs);
        pending.set(id, request);
        signal?.addEventListener("abort", abort, { once: true });
        worker.postMessage({
          id,
          width: imageData.width,
          height: imageData.height,
          pixels: imageData.data.buffer,
        }, [imageData.data.buffer]);
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      rejectPending(abortError());
      worker.terminate();
    },
  };
}

function emitProgress(onProgress, details) {
  onProgress?.({ pageNumber: 0, pageCount: 0, progress: 0, ...details });
}

/**
 * Reusable in-memory scanned-PDF pipeline. It renders with PDF.js, preprocesses
 * with OpenCV.js, recognizes with one Tesseract.js worker, and returns page text.
 * No PDF bytes, rendered pages, filenames, or recognized text leave this tab.
 */
export async function runLocalPdfOcr({
  file,
  sourceBytes,
  language = "eng",
  pdfjsLoader = loadPdfJs,
  openCvPreprocessorFactory = createOpenCvWorkerPreprocessor,
  tesseractLoader = () => import("tesseract.js"),
  createCanvas = () => document.createElement("canvas"),
  onProgress,
  signal,
} = {}) {
  if (!sourceBytes && !file) throw new Error("Choose a scanned PDF to continue.");
  if (!isSupportedOcrLanguage(language)) throw new Error("Choose a supported OCR language.");

  throwIfAborted(signal);
  emitProgress(onProgress, { phase: "loading", progress: 1, message: "Loading local OCR…" });
  const bytes = sourceBytes instanceof Uint8Array
    ? sourceBytes
    : new Uint8Array(await file.arrayBuffer());

  const openCvPreprocessor = openCvPreprocessorFactory({ createCanvas });
  let pdfjs;
  let tesseract;
  let documentProxy;
  let worker;
  let activePage = 0;
  let pageCount = 0;
  let terminated = false;
  const terminateWorker = async () => {
    if (worker && !terminated) {
      terminated = true;
      await worker.terminate?.();
    }
  };
  const handleAbort = () => { void terminateWorker(); };

  try {
    [pdfjs, tesseract] = await Promise.all([pdfjsLoader(), tesseractLoader()]);
    throwIfAborted(signal);
    documentProxy = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    pageCount = documentProxy.numPages;
    if (pageCount > OCR_PDF_LIMITS.maxPages) {
      throw new Error(`Local OCR supports up to ${OCR_PDF_LIMITS.maxPages} pages at a time.`);
    }

    worker = await tesseract.createWorker(language, undefined, {
      logger: (message) => {
        if (message.status !== "recognizing text") return;
        const completedPages = Math.max(0, activePage - 1);
        const fractionalPage = Number(message.progress || 0);
        emitProgress(onProgress, {
          phase: "recognizing",
          pageNumber: activePage,
          pageCount,
          progress: Math.min(96, Math.round(((completedPages + fractionalPage) / Math.max(1, pageCount)) * 96)),
          message: `Recognizing page ${activePage} of ${pageCount}…`,
        });
      },
    });
    signal?.addEventListener("abort", handleAbort, { once: true });
    throwIfAborted(signal);
    await worker.setParameters?.({ preserve_interword_spaces: "1", user_defined_dpi: "300" });

    const pages = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      activePage = pageNumber;
      throwIfAborted(signal);
      emitProgress(onProgress, {
        phase: "rendering",
        pageNumber,
        pageCount,
        progress: Math.max(2, Math.round(((pageNumber - 1) / pageCount) * 96)),
        message: `Preparing page ${pageNumber} of ${pageCount}…`,
      });

      const pdfPage = await documentProxy.getPage(pageNumber);
      try {
        const pageSize = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: ocrRenderScaleForPage(pageSize.width, pageSize.height) });
        const canvas = createCanvas();
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("This browser could not prepare the PDF page for OCR.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        throwIfAborted(signal);

        emitProgress(onProgress, {
          phase: "preprocessing",
          pageNumber,
          pageCount,
          progress: Math.max(3, Math.round(((pageNumber - 0.75) / pageCount) * 96)),
          message: `Cleaning page ${pageNumber} of ${pageCount}…`,
        });
        const preparedCanvas = await openCvPreprocessor.process(canvas, signal);
        const recognition = await worker.recognize(preparedCanvas, { rotateAuto: true }, { text: true, blocks: true });
        pages.push({
          pageNumber,
          text: String(recognition.data?.text || "").trim(),
          words: flattenOcrWords(recognition.data),
          confidence: Math.round(Number(recognition.data?.confidence || 0)),
        });
      } finally {
        pdfPage.cleanup?.();
      }
    }

    throwIfAborted(signal);
    if (!pages.some((page) => page.text)) {
      throw new Error("Local OCR could not find readable text. Try a clearer scan or the dedicated OCR tool.");
    }
    const fullText = pages.map((page) => `Page ${page.pageNumber}\n${page.text}`).join("\n\n");
    const result = {
      source: "ocr",
      language,
      pageCount,
      pages,
      fullText,
      confidence: summarizeOcrConfidence(pages),
    };
    emitProgress(onProgress, { phase: "complete", pageNumber: pageCount, pageCount, progress: 100, message: "Local OCR complete." });
    return result;
  } finally {
    signal?.removeEventListener("abort", handleAbort);
    openCvPreprocessor.dispose();
    await terminateWorker();
    await documentProxy?.destroy?.();
  }
}
