import { TOOL_CATEGORIES } from "./toolRegistry.js";

/** @type {Readonly<Record<string, { slug: string, seoTitle: string, metaDescription: string, headline: string, intro: string, guidance: string[] }>>} */
const categorySeoContent = Object.freeze({
  "edit-view": {
    slug: "edit-pdf-tools",
    seoTitle: "Edit PDF Tools Online | FixThatPDF",
    metaDescription: "Edit, annotate, fill, crop, watermark, number, redact, and review PDFs with browser-based tools and clear file limits.",
    headline: "Edit PDF tools for the changes people make most.",
    intro: "Correct a page, complete a form, add visual feedback, or prepare a clean sharing copy without rebuilding the document in another app.",
    guidance: ["Use OCR first when the page is only a scanned image.", "Review replaced text when the source uses unusual embedded fonts.", "Download a new copy and keep the original PDF as a backup."],
  },
  organize: {
    slug: "organize-pdf-tools",
    seoTitle: "Organize PDF Pages Online | FixThatPDF",
    metaDescription: "Merge, split, reorder, rotate, delete, extract, duplicate, and organize PDF pages in your browser.",
    headline: "Put every PDF page in the right place.",
    intro: "Combine documents, separate page ranges, fix page direction, and prepare a final page order while preserving native PDF pages whenever the workflow allows.",
    guidance: ["Check the thumbnail order before downloading.", "Keep at least one page when deleting from a document.", "Use split or extract when the recipient only needs part of the PDF."],
  },
  compress: {
    slug: "compress-pdf-tools",
    seoTitle: "Compress PDF Online | FixThatPDF",
    metaDescription: "Reduce image-heavy PDF file size in your browser with an honest explanation of quality and text tradeoffs.",
    headline: "Make an image-heavy PDF easier to send.",
    intro: "Compression can shrink scans and image-based documents, but stronger compression trades detail for size and may flatten searchable text, links, forms, and layers.",
    guidance: ["Start with balanced quality before choosing a stronger setting.", "Compare the downloaded size with the original before sharing.", "Check small text and detailed images at 100% zoom."],
  },
  "from-pdf": {
    slug: "convert-from-pdf",
    seoTitle: "Convert PDF to Word, Excel, Images and More | FixThatPDF",
    metaDescription: "Convert PDFs to Word, Excel, PowerPoint, HTML, TXT, JPG, or PNG with format-specific browser workflows.",
    headline: "Move PDF content into the format you need next.",
    intro: "Choose an editable document, spreadsheet, presentation, text file, webpage, or page image based on what you need to do after conversion.",
    guidance: ["Choose visual fidelity when appearance matters more than editability.", "Run OCR before text conversion when the PDF contains scanned pages.", "Review tables, fonts, and reading order in editable outputs."],
  },
  "to-pdf": {
    slug: "convert-to-pdf",
    seoTitle: "Convert Files to PDF Online | FixThatPDF",
    metaDescription: "Convert Word, Excel, PowerPoint, HTML, images, text, OpenDocument, EPUB, and ZIP content into PDFs.",
    headline: "Turn the files you already use into a PDF.",
    intro: "Create shareable PDFs from office documents, webpages, images, text, and open document formats with limits shown before processing.",
    guidance: ["Check page breaks and margins in the finished PDF.", "Confirm formula results and slide order before sending.", "Keep the source file when exact editing or animation must remain available."],
  },
  sign: {
    slug: "sign-pdf-tools",
    seoTitle: "Sign PDF Online | FixThatPDF",
    metaDescription: "Add a signature, initials, or date to a PDF and prepare signing fields with clear self-signing limitations.",
    headline: "Add the signature details a PDF needs.",
    intro: "Place your own typed, drawn, or uploaded signature, add initials and dates, or prepare a signing copy for handoff from your device.",
    guidance: ["Confirm the signature belongs to the person placing it.", "Review every signature and date position before export.", "Use a regulated e-signature provider when identity verification or an audit certificate is required."],
  },
  protect: {
    slug: "protect-pdf-tools",
    seoTitle: "Protect, Unlock and Flatten PDF Online | FixThatPDF",
    metaDescription: "Protect a PDF with a password, unlock an authorized file, or flatten interactive content in your browser.",
    headline: "Prepare a PDF for safer access or final delivery.",
    intro: "Add open-password protection, remove a known password from an authorized document, or flatten content when a stable visual copy matters more than editability.",
    guidance: ["Store the new password somewhere secure and separate from the file.", "Only unlock documents you are authorized to modify.", "Keep an editable source because flattening can remove text, forms, links, layers, and accessibility tags."],
  },
  "ocr-scan": {
    slug: "ocr-pdf-tools",
    seoTitle: "OCR and Scan PDF Tools Online | FixThatPDF",
    metaDescription: "Recognize English text in scanned PDFs, turn page photos into PDFs, and create searchable image PDFs in your browser.",
    headline: "Turn scanned pages into useful PDFs.",
    intro: "Capture paper pages, combine ordered images, and add a searchable English text layer when a PDF contains pictures of text instead of selectable text.",
    guidance: ["Use clear, straight, well-lit page images for stronger recognition.", "Verify names, dates, totals, and other important text after OCR.", "Keep the original scan when visual evidence must remain unchanged."],
  },
  ai: {
    slug: "document-analysis-tools",
    seoTitle: "PDF Analysis and Question Tools | FixThatPDF",
    metaDescription: "Search, summarize, extract, and review PDF content with source-grounded browser tools and page references.",
    headline: "Find important PDF content with its source pages attached.",
    intro: "Search for matching passages, create extractive summaries, identify structured fields, and surface review questions without pretending the tool knows more than the document shows.",
    guidance: ["Use specific names, dates, phrases, and numbers in questions.", "Open the cited page before relying on an extracted passage.", "Treat contract and resume analysis as review support, not professional or hiring advice."],
  },
  "compare-review": {
    slug: "compare-pdf-tools",
    seoTitle: "Compare and Review PDF Tools Online | FixThatPDF",
    metaDescription: "Compare two PDF versions, inspect text and visual changes, and add review comments with browser-based tools.",
    headline: "See what changed between PDF versions.",
    intro: "Review word-level additions and deletions in searchable documents, inspect focused visual changes in scans, and leave page-level feedback for follow-up.",
    guidance: ["Compare the same page positions for the clearest result.", "Use OCR first when both versions are scanned images and text detail matters.", "Open each highlighted region before accepting the generated report."],
  },
  templates: {
    slug: "pdf-document-templates",
    seoTitle: "PDF Document Templates Online | FixThatPDF",
    metaDescription: "Create resumes, contracts, NDAs, invoices, and offer-letter drafts in your browser and export searchable PDFs.",
    headline: "Start common documents with a structured draft.",
    intro: "Build a resume, services agreement, NDA, invoice, or offer letter with editable fields and a live PDF-ready preview.",
    guidance: ["Replace every example field before exporting.", "Review legal and employment documents with qualified counsel when appropriate.", "Keep the editable browser draft until the final PDF has been checked."],
  },
});

export const TOOL_CATEGORY_PAGES = Object.freeze(TOOL_CATEGORIES.map((category) => {
  const content = categorySeoContent[category.id];
  if (!content) throw new Error(`Missing SEO category content for ${category.id}`);
  return Object.freeze({ ...category, ...content, route: `/tools/${content.slug}` });
}));

export const TOOL_CATEGORY_PAGE_BY_SLUG = new Map(TOOL_CATEGORY_PAGES.map((category) => [category.slug, category]));
export const TOOL_CATEGORY_PAGE_BY_ID = new Map(TOOL_CATEGORY_PAGES.map((category) => [category.id, category]));

/** @param {string} categoryId */
export function getToolCategoryPage(categoryId) {
  return TOOL_CATEGORY_PAGE_BY_ID.get(categoryId) || null;
}
