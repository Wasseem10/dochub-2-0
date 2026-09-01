export const LANDING_DOCUMENT_ACCEPT = [
  "application/pdf",
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
  ".txt",
  ".rtf",
  ".odt",
  ".ods",
  ".odp",
  ".epub",
  ".html",
  ".htm",
  ".jpg",
  ".jpeg",
  ".png",
  ".zip",
].join(",");

const TOOL_BY_EXTENSION = Object.freeze({
  pdf: "edit-pdf",
  docx: "word-to-pdf",
  xlsx: "excel-to-pdf",
  pptx: "powerpoint-to-pdf",
  txt: "txt-to-pdf",
  rtf: "rtf-to-pdf",
  odt: "odt-to-pdf",
  ods: "ods-to-pdf",
  odp: "odp-to-pdf",
  epub: "epub-to-pdf",
  html: "html-to-pdf",
  htm: "html-to-pdf",
  jpg: "jpg-to-pdf",
  jpeg: "jpg-to-pdf",
  png: "png-to-pdf",
  zip: "zip-to-pdf",
});

const TOOL_BY_MIME_TYPE = Object.freeze({
  "application/pdf": "edit-pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word-to-pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel-to-pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "powerpoint-to-pdf",
  "text/plain": "txt-to-pdf",
  "application/rtf": "rtf-to-pdf",
  "text/rtf": "rtf-to-pdf",
  "application/vnd.oasis.opendocument.text": "odt-to-pdf",
  "application/vnd.oasis.opendocument.spreadsheet": "ods-to-pdf",
  "application/vnd.oasis.opendocument.presentation": "odp-to-pdf",
  "application/epub+zip": "epub-to-pdf",
  "text/html": "html-to-pdf",
  "application/xhtml+xml": "html-to-pdf",
  "image/jpeg": "jpg-to-pdf",
  "image/png": "png-to-pdf",
  "application/zip": "zip-to-pdf",
  "application/x-zip-compressed": "zip-to-pdf",
});

export const LANDING_DOCUMENT_FORMATS = "PDF, DOCX, XLSX, PPTX, TXT, RTF, OpenDocument, EPUB, HTML, JPG, PNG, or ZIP";

export function resolveLandingDocumentTool(file) {
  if (!file) return null;
  const extension = String(file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  const toolId = TOOL_BY_EXTENSION[extension] || TOOL_BY_MIME_TYPE[String(file.type || "").toLowerCase()];
  if (!toolId) return null;
  return {
    toolId,
    route: toolId === "edit-pdf" ? "/edit-pdf" : `/${toolId}`,
  };
}
