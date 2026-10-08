import tesseractPackage from "tesseract.js/package.json";

/** Keep the worker, WASM engine, and supported models on the same origin. */
export async function createBrowserOcrWorker(language, options = {}, workerFactory) {
  const assetRoot = `${import.meta.env.BASE_URL}vendor/ocr/${tesseractPackage.version}`;
  let phase = "engine";
  try {
    const createWorker = workerFactory || (await import("tesseract.js")).createWorker;
    return await createWorker(language, undefined, {
      ...options,
      workerPath: `${assetRoot}/worker.min.js`,
      corePath: `${assetRoot}/core`,
      langPath: `${assetRoot}/lang`,
      workerBlobURL: false,
      // Tesseract rejects the operation as well as throwing a provider string
      // when no handler exists. Keep that string out of logs and user copy.
      errorHandler: () => {},
      logger(message) {
        if (message.status === "loading language traineddata") phase = "language";
        if (message.status === "initializing api") phase = "initialization";
        options.logger?.(message);
      },
    });
  } catch {
    const message = phase === "language"
      ? "The OCR language model could not load. Check your connection and try again."
      : phase === "initialization"
        ? "The OCR engine could not initialize. Reload the page and try again."
        : "The OCR engine could not load. Check your connection, reload the page, and try again.";
    throw new Error(message);
  }
}
