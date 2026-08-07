import { textContentToPlainText } from "./textConversion.js";

const DEFAULT_MAX_PAGES = 100;
const DEFAULT_MIN_CHARACTERS = 8;
const MAX_TEXT_CHARACTERS = 600_000;

function abortError() {
  return new DOMException("The PDF inspection was cancelled.", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function meaningfulCharacterCount(text) {
  return Array.from(String(text || "")).filter((character) => /[\p{L}\p{N}]/u.test(character)).length;
}

export async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjs;
}

/**
 * Inspects a browser File without uploading it and returns the embedded text by page.
 * A document is considered image-only when the whole PDF has fewer than
 * `minCharacters` meaningful text-layer characters. This small threshold prevents
 * a stray invisible glyph from incorrectly classifying a scan as a text PDF.
 */
export async function detectScannedPdf(file, {
  pdfjsLoader = loadPdfJs,
  maxPages = DEFAULT_MAX_PAGES,
  minCharacters = DEFAULT_MIN_CHARACTERS,
  maxTextCharacters = MAX_TEXT_CHARACTERS,
  onProgress,
  signal,
} = {}) {
  if (!file) throw new Error("Choose a PDF to continue.");
  if (!file.size) throw new Error("This PDF is empty.");
  if (file.type !== "application/pdf" && !String(file.name || "").toLowerCase().endsWith(".pdf")) {
    throw new Error("Choose a PDF file.");
  }

  throwIfAborted(signal);
  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  throwIfAborted(signal);

  const pdfjs = await pdfjsLoader();
  let documentProxy;
  try {
    documentProxy = await pdfjs.getDocument({ data: sourceBytes.slice() }).promise;
    if (documentProxy.numPages > maxPages) {
      throw new Error(`Document analysis supports up to ${maxPages} pages.`);
    }

    const pages = [];
    let totalCharacters = 0;
    let textPageCount = 0;

    for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
      throwIfAborted(signal);
      const page = await documentProxy.getPage(pageNumber);
      try {
        const text = textContentToPlainText(await page.getTextContent());
        const characterCount = meaningfulCharacterCount(text);
        totalCharacters += text.length;
        if (totalCharacters > maxTextCharacters) {
          throw new Error("This PDF contains too much text for safe browser analysis.");
        }
        if (characterCount > 0) textPageCount += 1;
        pages.push({ pageNumber, text, characterCount, hasText: characterCount > 0 });
      } finally {
        page.cleanup?.();
      }
      onProgress?.({
        phase: "detecting",
        pageNumber,
        pageCount: documentProxy.numPages,
        progress: Math.round((pageNumber / documentProxy.numPages) * 100),
      });
    }

    const meaningfulCharacters = pages.reduce((total, page) => total + page.characterCount, 0);
    const isImageOnly = meaningfulCharacters < minCharacters;
    const kind = isImageOnly ? "image-only" : textPageCount === documentProxy.numPages ? "text" : "mixed";

    return {
      kind,
      isImageOnly,
      hasTextLayer: !isImageOnly,
      pageCount: documentProxy.numPages,
      textPageCount,
      imageOnlyPageCount: documentProxy.numPages - textPageCount,
      totalCharacters,
      meaningfulCharacters,
      pages,
      sourceBytes,
    };
  } finally {
    await documentProxy?.destroy?.();
  }
}

