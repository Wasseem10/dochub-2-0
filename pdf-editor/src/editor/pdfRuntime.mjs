import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

let runtimePromise;

export function getPdfWorkerSource() {
  return pdfWorkerUrl;
}

export function configurePdfRuntime(pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  return pdfjsLib;
}

export function loadPdfRuntime() {
  if (!runtimePromise) {
    runtimePromise = import("pdfjs-dist").then(configurePdfRuntime);
  }

  return runtimePromise;
}
