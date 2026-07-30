export const ROUTE_PATHS = Object.freeze({
  home: "/",
  about: "/about",
  compare: "/compare",
  comparisonPattern: "/compare/:comparisonSlug",
  features: "/features",
  pricing: "/pricing",
  business: "/business",
  enterprise: "/enterprise",
  security: "/security",
  templates: "/templates",
  developers: "/developers",
  integrations: "/integrations",
  contactSales: "/contact-sales",
  help: "/help",
  support: "/support",
  dataRetention: "/data-retention",
  privacy: "/privacy",
  terms: "/terms",
  resources: "/resources",
  pdfBenchmark: "/research/pdf-conversion-benchmark",
  redactGuide: "/guides/redact-pdf-safely",
  ocrQualityGuide: "/guides/ocr-quality",
  editPdfGuide: "/guides/how-to-edit-a-pdf",
  compressPdfGuide: "/guides/compress-pdf-without-losing-quality",
  combinePdfGuide: "/guides/how-to-combine-pdf-files",
  fillAndSignPdfGuide: "/guides/how-to-fill-and-sign-pdf",
  pdfToWordGuide: "/guides/pdf-to-word-formatting",
  editPdfOnIphoneGuide: "/guides/edit-pdf-on-iphone",
  editScannedPdfGuide: "/guides/edit-scanned-pdf",
  compressPdfToOneMbGuide: "/guides/compress-pdf-to-1mb",
  compressPdfForEmailGuide: "/guides/compress-pdf-for-email",
  combinePdfOnMacGuide: "/guides/combine-pdf-files-on-mac",
  signPdfOnAndroidGuide: "/guides/sign-pdf-on-android",
  fillPdfWithoutAdobeGuide: "/guides/fill-pdf-without-adobe",
  pdfToWordWithoutFormattingLossGuide: "/guides/convert-pdf-to-word-without-losing-formatting",
  removePagesFromPdfGuide: "/guides/remove-pages-from-pdf",
  rotatePdfAndSaveGuide: "/guides/rotate-pdf-and-save",
  pdfAttachmentSizeStudy: "/research/pdf-email-attachment-size-study",
  educationWorkflow: "/workflows/education-pdf-workflow",
  recruitingWorkflow: "/workflows/recruiting-pdf-workflow",
  legalOperationsWorkflow: "/workflows/legal-operations-pdf-workflow",
  realEstateWorkflow: "/workflows/real-estate-pdf-workflow",
  smallBusinessWorkflow: "/workflows/small-business-pdf-workflow",
  architecture: "/architecture",
  uptime: "/uptime",
  incidentHistory: "/incident-history",
  tools: "/tools",
  editPdf: "/edit-pdf",
  mergePdf: "/merge-pdf",
  splitPdf: "/split-pdf",
  compressPdf: "/compress-pdf",
  signPdf: "/sign-pdf",
  pdfToWord: "/pdf-to-word",
  jpgToPdf: "/jpg-to-pdf",
  ocrPdf: "/ocr-pdf",
  redactPdf: "/redact-pdf",
  aiPdf: "/ai-pdf",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  dashboard: "/app/dashboard",
  appTools: "/app/tools",
  documents: "/app/documents",
  appTemplates: "/app/templates",
  signatures: "/app/signatures",
  settings: "/app/settings",
  analytics: "/app/analytics",
  trash: "/app/trash",
  editorPattern: "/app/editor/:documentId",
  share: "/share",
  sharePattern: "/share/:token",
  sign: "/sign",
  signPattern: "/sign/:token",
});

/** @param {string} documentId */
export function editorPath(documentId) {
  return `/app/editor/${encodeURIComponent(documentId)}`;
}

/** @param {string} toolId */
export function publicEditorPath(toolId) {
  const query = toolId ? `?tool=${encodeURIComponent(toolId)}` : "";
  return `${ROUTE_PATHS.editPdf}${query}`;
}

/** @param {string} toolId @param {string} documentId */
export function publicEditorDocumentPath(toolId, documentId) {
  const search = new URLSearchParams();
  if (toolId) search.set("tool", toolId);
  if (documentId) search.set("document", documentId);
  return `${ROUTE_PATHS.editPdf}?${search.toString()}`;
}

/**
 * Keep the complete browser route when replacing transient navigation state.
 * @param {{ pathname?: string, search?: string, hash?: string } | null | undefined} location
 */
export function currentLocationPath(location) {
  const pathname = location?.pathname || ROUTE_PATHS.home;
  return `${pathname}${location?.search || ""}${location?.hash || ""}`;
}

/** @param {string} token */
export function sharePath(token) {
  const search = new URLSearchParams({ token: String(token || "") });
  return `${ROUTE_PATHS.share}#${search.toString()}`;
}

/** @param {string} token */
export function signPath(token) {
  const search = new URLSearchParams({ token: String(token || "") });
  return `${ROUTE_PATHS.sign}#${search.toString()}`;
}
