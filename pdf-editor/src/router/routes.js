import { ROUTE_PATHS } from "./routePaths.js";

export const PUBLIC_PLACEHOLDER_ROUTES = [
  [ROUTE_PATHS.features, "Features", "Explore the RealPDF workspace and the tools that are currently available."],
  [ROUTE_PATHS.pricing, "Pricing", "RealPDF plans are still being prepared. No checkout or paid plan is active yet."],
  [ROUTE_PATHS.business, "RealPDF for business", "A focused document workspace for teams that edit and review PDFs."],
  [ROUTE_PATHS.enterprise, "Enterprise", "Enterprise administration and access controls are currently in development."],
  [ROUTE_PATHS.security, "Security", "Learn what the current browser workspace supports and where additional safeguards are planned."],
  [ROUTE_PATHS.templates, "Templates", "Reusable production templates are currently in development."],
  [ROUTE_PATHS.developers, "Developers", "The RealPDF developer platform and API are currently in development."],
  [ROUTE_PATHS.integrations, "Integrations", "External storage and workflow integrations are currently in development."],
  [ROUTE_PATHS.contactSales, "Contact sales", "Sales-assisted plans are not available yet. Product updates will appear here."],
  [ROUTE_PATHS.help, "Help center", "Upload, edit, organize, sign locally, and export PDFs using the existing workspace."],
  [ROUTE_PATHS.privacy, "Privacy", "RealPDF privacy documentation is being prepared for the production service."],
  [ROUTE_PATHS.terms, "Terms", "RealPDF service terms are being prepared before public production launch."],
].map(([path, title, description]) => ({ path, title, description, status: "Available as an information page" }));

export const FEATURE_PLACEHOLDER_ROUTES = [
  [ROUTE_PATHS.mergePdf, "Merge PDF", "Combine PDFs from inside the editor. A dedicated public merge workflow is in development."],
  [ROUTE_PATHS.splitPdf, "Split PDF", "A dedicated PDF splitting workflow is currently in development."],
  [ROUTE_PATHS.compressPdf, "Compress PDF", "Reliable PDF compression is currently in development."],
  [ROUTE_PATHS.signPdf, "Sign PDF", "Signatures can be placed in the editor. Secure signature-request workflows are in development."],
  [ROUTE_PATHS.pdfToWord, "PDF to Word", "Layout-preserving PDF to Word conversion is currently in development."],
  [ROUTE_PATHS.jpgToPdf, "JPG to PDF", "A dedicated image-to-PDF workflow is currently in development."],
  [ROUTE_PATHS.ocrPdf, "OCR PDF", "OCR for scanned PDFs is currently in development."],
  [ROUTE_PATHS.redactPdf, "Redact PDF", "Permanent, verified redaction is currently in development."],
  [ROUTE_PATHS.aiPdf, "AI PDF", "Document AI features are currently in development and do not return fake results."],
].map(([path, title, description]) => ({ path, title, description, status: "Coming soon" }));

export const APP_ROUTE_SECTIONS = Object.freeze({
  [ROUTE_PATHS.dashboard]: "Home",
  [ROUTE_PATHS.documents]: "Documents",
  [ROUTE_PATHS.appTemplates]: "Templates",
  [ROUTE_PATHS.signatures]: "Signatures",
  [ROUTE_PATHS.settings]: "Settings",
  [ROUTE_PATHS.trash]: "Trash",
});
