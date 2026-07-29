import { zipSync } from "fflate";
import * as pdfjsLib from "pdfjs-dist";

const MAX_RENDERED_PIXELS = 18_000_000;

function safeBaseName(value) {
  return String(value || "pdfenrich-document")
    .replace(/\.[^.]+$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    || "pdfenrich-document";
}

function renderScaleForPage(width, height, preferredScale) {
  const sourcePixels = Math.max(1, Number(width) * Number(height));
  return Math.max(.5, Math.min(preferredScale, Math.sqrt(MAX_RENDERED_PIXELS / sourcePixels)));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`The ${type === "image/png" ? "PNG" : "JPG"} page image could not be created.`));
    }, type, quality);
  });
}

async function renderPdfPage(page, { type = "image/png", quality, preferredScale = 1.6 } = {}) {
  const baseViewport = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({
    scale: renderScaleForPage(baseViewport.width, baseViewport.height, preferredScale),
  });
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("This browser could not prepare a page image.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  const blob = await canvasToBlob(canvas, type, quality);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const dataUrl = type === "image/png"
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", quality ?? .9);
  page.cleanup?.();
  canvas.width = 1;
  canvas.height = 1;
  return { blob, bytes, dataUrl, width: viewport.width, height: viewport.height };
}

export async function createEditorFormatDownload({
  format,
  pdfBytes,
  fileName,
  onProgress = () => {},
}) {
  if (!(pdfBytes instanceof Uint8Array) || !pdfBytes.length) {
    throw new Error("The edited PDF could not be prepared for conversion.");
  }
  const baseName = safeBaseName(fileName).replace(/-edited$/i, "");
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
  const pdfDocument = await loadingTask.promise;
  const progressForPage = (pageNumber, maximum = 88) => {
    onProgress(Math.max(8, Math.round((pageNumber / pdfDocument.numPages) * maximum)));
  };

  try {
    if (format === "png" || format === "jpg") {
      const isPng = format === "png";
      const type = isPng ? "image/png" : "image/jpeg";
      const extension = isPng ? "png" : "jpg";
      const renderedPages = [];
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        renderedPages.push(await renderPdfPage(page, {
          type,
          quality: isPng ? undefined : .9,
          preferredScale: 2,
        }));
        progressForPage(pageNumber);
      }
      if (renderedPages.length === 1) {
        return {
          blob: renderedPages[0].blob,
          name: `${baseName}.${extension}`,
          message: `${isPng ? "PNG" : "JPG"} downloaded.`,
        };
      }
      const files = Object.fromEntries(renderedPages.map((page, index) => [
        `${baseName}-page-${String(index + 1).padStart(2, "0")}.${extension}`,
        page.bytes,
      ]));
      return {
        blob: new Blob([zipSync(files, { level: 6 })], { type: "application/zip" }),
        name: `${baseName}-${extension}-pages.zip`,
        message: `${renderedPages.length} ${extension.toUpperCase()} pages downloaded as a ZIP.`,
      };
    }

    if (format === "word") {
      const { createDocxFromPdfPages } = await import("./officeConversion.js");
      const renderedPages = [];
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const rendered = await renderPdfPage(page, { type: "image/png", preferredScale: 1.55 });
        renderedPages.push({ imageBytes: rendered.bytes, width: rendered.width, height: rendered.height });
        progressForPage(pageNumber, 82);
      }
      const bytes = await createDocxFromPdfPages(renderedPages, { mode: "visual", title: baseName });
      onProgress(96);
      return {
        blob: new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
        name: `${baseName}.docx`,
        message: "Word document downloaded.",
      };
    }

    if (format === "excel") {
      const { createXlsxFromPdfPages, pdfTextItemsToRows } = await import("./structuredPdfConversion.js");
      const workbookPages = [];
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        workbookPages.push({
          name: `Page ${pageNumber}`,
          rows: pdfTextItemsToRows(textContent.items),
        });
        page.cleanup?.();
        progressForPage(pageNumber, 88);
      }
      if (!workbookPages.some((page) => page.rows.length)) {
        throw new Error("Excel needs readable text. This document appears to contain only images.");
      }
      const bytes = createXlsxFromPdfPages(workbookPages, { title: baseName });
      onProgress(96);
      return {
        blob: new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        name: `${baseName}.xlsx`,
        message: "Excel workbook downloaded.",
      };
    }

    if (format === "powerpoint") {
      const { createPptxFromRenderedPages } = await import("./structuredPdfConversion.js");
      const renderedPages = [];
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const rendered = await renderPdfPage(page, {
          type: "image/jpeg",
          quality: .9,
          preferredScale: 1.6,
        });
        renderedPages.push({ dataUrl: rendered.dataUrl, width: rendered.width, height: rendered.height });
        progressForPage(pageNumber, 80);
      }
      const bytes = await createPptxFromRenderedPages(renderedPages, { title: baseName });
      onProgress(96);
      return {
        blob: new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }),
        name: `${baseName}.pptx`,
        message: "PowerPoint presentation downloaded.",
      };
    }

    throw new Error("Choose a supported download format.");
  } finally {
    await pdfDocument.destroy?.();
  }
}
