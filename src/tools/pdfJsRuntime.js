let pdfJsRuntimePromise = null;

export async function loadPdfJsRuntime() {
  if (!pdfJsRuntimePromise) {
    pdfJsRuntimePromise = import("pdfjs-dist")
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url,
        ).toString();
        return pdfjs;
      })
      .catch((error) => {
        pdfJsRuntimePromise = null;
        throw error;
      });
  }

  return pdfJsRuntimePromise;
}
