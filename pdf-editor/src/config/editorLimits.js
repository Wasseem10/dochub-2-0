export const EDITOR_LIMITS = Object.freeze({
  maxFileBytes: 8 * 1024 * 1024,
  maxPages: 100,
});

export function validateEditorPdfFile(file) {
  if (!file) return { errorCategory: "missing_file", message: "No file selected." };
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return { errorCategory: "file_type", message: "Choose a PDF file to open in the editor." };
  if (file.size > EDITOR_LIMITS.maxFileBytes) return { errorCategory: "file_size", message: "The editor currently supports PDFs up to 8 MB. Dedicated page and conversion tools may support larger files." };
  return null;
}

export function validateEditorPageCount(pageCount) {
  if (pageCount > EDITOR_LIMITS.maxPages) return { errorCategory: "page_count", message: `This PDF has ${pageCount} pages. The editor limit is ${EDITOR_LIMITS.maxPages} pages.` };
  return null;
}
