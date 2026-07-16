export const ROUTE_PATHS = Object.freeze({
  home: "/",
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
  privacy: "/privacy",
  terms: "/terms",
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
  documents: "/app/documents",
  appTemplates: "/app/templates",
  signatures: "/app/signatures",
  settings: "/app/settings",
  trash: "/app/trash",
  editorPattern: "/app/editor/:documentId",
  sharePattern: "/share/:token",
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

/** @param {string} token */
export function sharePath(token) {
  return `/share/${encodeURIComponent(token)}`;
}

/** @param {string} token */
export function signPath(token) {
  return `/sign/${encodeURIComponent(token)}`;
}
