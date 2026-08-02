export const PUBLIC_TOOL_MODULE_LOADERS = Object.freeze({
  app: () => import("../App.jsx"),
  comparePdf: () => import("../pages/public/ComparePdfPage.jsx"),
  documentAnalysis: () => import("../pages/public/DocumentAnalysisPage.jsx"),
  imageConversion: () => import("../pages/public/ImageConversionPage.jsx"),
  officeConversion: () => import("../pages/public/OfficeConversionPage.jsx"),
  ocrPdf: () => import("../pages/public/OcrPdfPage.jsx"),
  openDocumentConversion: () => import("../pages/public/OpenDocumentConversionPage.jsx"),
  pdfPageTool: () => import("../pages/public/PdfPageToolPage.jsx"),
  pdfProtection: () => import("../pages/public/PdfProtectionPage.jsx"),
  redactPdf: () => import("../pages/public/RedactPdfPage.jsx"),
  scanPdf: () => import("../pages/public/ScanPdfPage.jsx"),
  structuredPdfConversion: () => import("../pages/public/StructuredPdfConversionPage.jsx"),
  textConversion: () => import("../pages/public/TextConversionPage.jsx"),
  toPdfConversion: () => import("../pages/public/ToPdfConversionPage.jsx"),
});

/** @param {import("../tools/toolRegistry.js").ToolRecord} tool */
export function getPublicToolModuleLoader(tool) {
  if (tool.id === "redact-pdf") return PUBLIC_TOOL_MODULE_LOADERS.redactPdf;
  if (["unlock-pdf", "flatten-pdf", "remove-pdf-password"].includes(tool.id)) return PUBLIC_TOOL_MODULE_LOADERS.pdfProtection;
  if (["pdf-scanner", "scan-to-pdf", "image-to-searchable-pdf"].includes(tool.id)) return PUBLIC_TOOL_MODULE_LOADERS.scanPdf;
  if (["rtf-to-pdf", "odt-to-pdf", "odp-to-pdf", "ods-to-pdf", "epub-to-pdf", "zip-to-pdf"].includes(tool.id)) return PUBLIC_TOOL_MODULE_LOADERS.openDocumentConversion;
  if (["ai-pdf", "chat-with-pdf", "summarize-pdf", "translate-pdf", "extract-data-from-pdf", "ask-pdf", "ai-question-generator"].includes(tool.id)) return PUBLIC_TOOL_MODULE_LOADERS.documentAnalysis;
  if (["compare-pdf", "document-version-comparison"].includes(tool.id)) return PUBLIC_TOOL_MODULE_LOADERS.comparePdf;
  if (tool.id === "ocr-pdf") return PUBLIC_TOOL_MODULE_LOADERS.ocrPdf;
  if (tool.workflowType === "page-tool") return PUBLIC_TOOL_MODULE_LOADERS.pdfPageTool;
  if (tool.workflowType === "editor") return PUBLIC_TOOL_MODULE_LOADERS.app;
  if (tool.workflowType !== "converter") return null;
  if (["pdf-to-excel", "pdf-to-powerpoint", "pdf-to-html"].includes(tool.id)) return PUBLIC_TOOL_MODULE_LOADERS.structuredPdfConversion;
  if (["excel-to-pdf", "powerpoint-to-pdf", "html-to-pdf"].includes(tool.id)) return PUBLIC_TOOL_MODULE_LOADERS.toPdfConversion;
  if (["pdf-to-txt", "txt-to-pdf"].includes(tool.id)) return PUBLIC_TOOL_MODULE_LOADERS.textConversion;
  if (["pdf-to-word", "word-to-pdf"].includes(tool.id)) return PUBLIC_TOOL_MODULE_LOADERS.officeConversion;
  return PUBLIC_TOOL_MODULE_LOADERS.imageConversion;
}

/** @param {import("../tools/toolRegistry.js").ToolRecord} tool */
export function preloadPublicToolModule(tool) {
  const loader = getPublicToolModuleLoader(tool);
  return loader ? loader() : Promise.resolve();
}
