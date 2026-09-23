import { resolveLandingDocumentSourceTool } from "./landingDocumentUpload.js";

const OPEN_DOCUMENT_TOOLS = new Set([
  "rtf-to-pdf",
  "odt-to-pdf",
  "ods-to-pdf",
  "odp-to-pdf",
  "epub-to-pdf",
  "zip-to-pdf",
]);

const OPEN_DOCUMENT_EXTENSION = Object.freeze({
  "rtf-to-pdf": ".rtf", "odt-to-pdf": ".odt", "ods-to-pdf": ".ods",
  "odp-to-pdf": ".odp", "epub-to-pdf": ".epub", "zip-to-pdf": ".zip",
});

function pdfName(name) {
  const stem = String(name || "document").replace(/\.[^.]+$/, "") || "document";
  return `${stem}.pdf`;
}

function validationMessage(message) {
  if (message) throw new Error(message);
}

function canvasToPngBytes(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => {
    if (!blob) return reject(new Error("A printable page image could not be created."));
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, "image/png"));
}

function collectRenderedTextItems(pageElement) {
  const bounds = pageElement.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return [];
  const walker = document.createTreeWalker(pageElement, window.NodeFilter.SHOW_TEXT);
  const items = [];
  let node = walker.nextNode();
  while (node) {
    for (const match of (node.nodeValue || "").matchAll(/\S+/g)) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) items.push({
        text: match[0],
        x: Math.max(0, Math.min(1, (rect.left - bounds.left) / bounds.width)),
        y: Math.max(0, Math.min(1, (rect.top - bounds.top) / bounds.height)),
        w: Math.max(0, Math.min(1, rect.width / bounds.width)),
        h: Math.max(0, Math.min(1, rect.height / bounds.height)),
      });
      range.detach();
    }
    node = walker.nextNode();
  }
  return items;
}

async function convertDocx(file, title) {
  const [{ OFFICE_CONVERSION_LIMITS, createPdfFromRenderedDocxPages, validateOfficeConversionFile }, { renderAsync }, html2canvasModule] = await Promise.all([
    import("./officeConversion.js"),
    import("docx-preview"),
    import("html2canvas"),
  ]);
  validationMessage(validateOfficeConversionFile(file, "docx"));
  const host = document.createElement("div");
  host.className = "docx-render-host";
  Object.assign(host.style, { position: "fixed", top: "0", left: "-20000px", zIndex: "-1", width: "max-content", minWidth: "816px", background: "#fff", pointerEvents: "none" });
  host.setAttribute("aria-hidden", "true");
  document.body.append(host);
  try {
    const buffer = await file.arrayBuffer();
    await renderAsync(buffer.slice(0), host, undefined, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      useBase64URL: true,
    });
    await document.fonts?.ready;
    const pageElements = [...host.querySelectorAll("section.docx")];
    if (!pageElements.length) throw new Error("No printable pages were found in this DOCX file.");
    if (pageElements.length > OFFICE_CONVERSION_LIMITS.maxPages) throw new Error(`Word to PDF supports up to ${OFFICE_CONVERSION_LIMITS.maxPages} rendered pages.`);
    const pages = [];
    for (const element of pageElements) {
      const canvas = await html2canvasModule.default(element, { scale: 1.5, backgroundColor: "#ffffff", useCORS: true, logging: false });
      if (canvas.width * canvas.height > OFFICE_CONVERSION_LIMITS.maxRenderedPixels) throw new Error("A Word page is too large to convert safely in this browser.");
      pages.push({ bytes: await canvasToPngBytes(canvas), textItems: collectRenderedTextItems(element) });
    }
    return createPdfFromRenderedDocxPages(pages, { title });
  } finally {
    host.remove();
  }
}

async function convertHtml(file, title) {
  const [{ sanitizeHtmlForRendering, validateToPdfFile }, { createPdfFromRenderedDocxPages }, { renderHtmlPages }] = await Promise.all([
    import("./toPdfConversion.js"),
    import("./officeConversion.js"),
    import("../pages/public/ToPdfConversionPage.jsx"),
  ]);
  validationMessage(validateToPdfFile(file, "html"));
  const source = await file.text();
  if (!source.trim()) throw new Error("This HTML file does not contain any content.");
  const host = document.createElement("div");
  host.className = "safe-html-render-host";
  Object.assign(host.style, { position: "fixed", top: "0", left: "-20000px", zIndex: "-1", width: "816px", background: "#fff", pointerEvents: "none" });
  const iframe = document.createElement("iframe");
  iframe.title = "Safe HTML rendering surface";
  iframe.setAttribute("sandbox", "allow-same-origin");
  Object.assign(iframe.style, { display: "block", width: "816px", minHeight: "1056px", border: "0", background: "#fff" });
  host.append(iframe);
  try {
    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("The HTML preview did not load. Try another file.")), 15000);
      iframe.onload = () => { window.clearTimeout(timer); resolve(); };
      iframe.onerror = () => { window.clearTimeout(timer); reject(new Error("The HTML preview could not load.")); };
      iframe.srcdoc = sanitizeHtmlForRendering(source);
      document.body.append(host);
    });
    const pages = await renderHtmlPages(iframe, () => {});
    return createPdfFromRenderedDocxPages(pages, { title });
  } finally {
    host.remove();
  }
}

/** Convert one supported upload into a PDF File that can open in the editor. */
export async function convertDocumentToPdfFile(file) {
  const toolId = resolveLandingDocumentSourceTool(file);
  if (!toolId) throw new Error("Choose a supported document or image file.");
  if (toolId === "edit-pdf") return file;
  const title = pdfName(file.name).replace(/\.pdf$/i, "");
  let bytes;

  if (toolId === "word-to-pdf") {
    bytes = await convertDocx(file, title);
  } else if (toolId === "excel-to-pdf" || toolId === "powerpoint-to-pdf") {
    const { createPdfFromPresentation, createPdfFromWorkbook, parsePptxPresentation, parseXlsxWorkbook, validateToPdfFile } = await import("./toPdfConversion.js");
    const kind = toolId === "excel-to-pdf" ? "excel" : "powerpoint";
    validationMessage(validateToPdfFile(file, kind));
    const input = await file.arrayBuffer();
    bytes = kind === "excel"
      ? await createPdfFromWorkbook(parseXlsxWorkbook(input), { title })
      : await createPdfFromPresentation(parsePptxPresentation(input), { title });
  } else if (toolId === "txt-to-pdf") {
    const { createPdfFromPlainText, validateTextConversionFile } = await import("./textConversion.js");
    validationMessage(validateTextConversionFile(file, "txt"));
    bytes = await createPdfFromPlainText(await file.text(), { title });
  } else if (OPEN_DOCUMENT_TOOLS.has(toolId)) {
    const { convertOpenDocumentToPdf, validateOpenDocumentFile } = await import("./openDocumentConversion.js");
    const expectedExtension = OPEN_DOCUMENT_EXTENSION[toolId];
    const validationFile = String(file.name || "").toLowerCase().endsWith(expectedExtension)
      ? file
      : { name: `${file.name || "document"}${expectedExtension}`, size: file.size };
    validationMessage(validateOpenDocumentFile(validationFile, toolId));
    bytes = await convertOpenDocumentToPdf(toolId, await file.arrayBuffer(), { title });
  } else if (toolId === "html-to-pdf") {
    bytes = await convertHtml(file, title);
  } else if (toolId === "jpg-to-pdf" || toolId === "png-to-pdf") {
    const { createPdfFromImages, IMAGE_CONVERSION_LIMITS, isSupportedImageType } = await import("./imageConversion.js");
    if (!isSupportedImageType(file.type, file.name)) throw new Error("Choose a JPG or PNG image.");
    if (!file.size) throw new Error("This image is empty.");
    if (file.size > IMAGE_CONVERSION_LIMITS.maxInputBytes) throw new Error("Choose an image no larger than 50 MB.");
    bytes = await createPdfFromImages([{
      bytes: await file.arrayBuffer(),
      mimeType: toolId === "png-to-pdf" ? "image/png" : "image/jpeg",
    }], { title });
  } else {
    throw new Error("This document format cannot open in the editor yet.");
  }

  return new File([bytes], pdfName(file.name), { type: "application/pdf", lastModified: file.lastModified || Date.now() });
}
