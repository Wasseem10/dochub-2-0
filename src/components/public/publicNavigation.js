import { ROUTE_PATHS } from "../../router/routePaths.js";

export const PUBLIC_PRIMARY_NAV_LINKS = Object.freeze([
  { label: "Tools", to: ROUTE_PATHS.tools },
  { label: "Edit", to: ROUTE_PATHS.editPdf },
  { label: "Organize", to: "/organize-pdf" },
  { label: "Sign", to: ROUTE_PATHS.signPdf },
  { label: "Convert", to: "/pdf-to-jpg" },
  { label: "Compare", to: ROUTE_PATHS.compare },
  { label: "About", to: ROUTE_PATHS.about },
]);

export const PUBLIC_FOOTER_NAVIGATION_GROUPS = Object.freeze([
  {
    title: "Tools",
    links: [
      { label: "Edit PDF", to: ROUTE_PATHS.editPdf },
      { label: "Merge PDF", to: ROUTE_PATHS.mergePdf },
      { label: "Split PDF", to: ROUTE_PATHS.splitPdf },
      { label: "Compress PDF", to: ROUTE_PATHS.compressPdf },
      { label: "All tools", to: ROUTE_PATHS.tools },
    ],
  },
  {
    title: "Edit & sign",
    links: [
      { label: "Edit PDF", to: ROUTE_PATHS.editPdf },
      { label: "Annotate PDF", to: "/annotate-pdf" },
      { label: "Fill PDF", to: "/fill-pdf" },
      { label: "Sign PDF", to: ROUTE_PATHS.signPdf },
      { label: "PDF Form Filler", to: "/pdf-form-filler" },
    ],
  },
  {
    title: "Convert",
    links: [
      { label: "PDF to Word", to: ROUTE_PATHS.pdfToWord },
      { label: "PDF to JPG", to: "/pdf-to-jpg" },
      { label: "PDF to PNG", to: "/pdf-to-png" },
      { label: "Word to PDF", to: "/word-to-pdf" },
      { label: "JPG to PDF", to: ROUTE_PATHS.jpgToPdf },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About PDFEnrich", to: ROUTE_PATHS.about },
      { label: "Free—no paid plans", to: ROUTE_PATHS.pricing },
      { label: "Comparisons", to: ROUTE_PATHS.compare },
      { label: "Resources", to: ROUTE_PATHS.resources },
      { label: "Security", to: ROUTE_PATHS.security },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: ROUTE_PATHS.support },
      { label: "Contact us", to: ROUTE_PATHS.support },
      { label: "FAQs", to: "/#faq-title" },
      { label: "Privacy", to: ROUTE_PATHS.privacy },
    ],
  },
]);

export const PUBLIC_LEGAL_LINKS = Object.freeze([
  { label: "Privacy", to: ROUTE_PATHS.privacy },
  { label: "Terms", to: ROUTE_PATHS.terms },
  { label: "Security", to: ROUTE_PATHS.security },
  { label: "Accessibility", to: ROUTE_PATHS.support },
]);
