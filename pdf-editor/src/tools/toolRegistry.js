import { absoluteSiteUrl } from "../config/site.js";

/** @typedef {"available" | "beta" | "partial" | "coming-soon"} ToolStatus */
/** @typedef {[string, string, string, string, string, ToolStatus, string[], string[], string]} ToolDefinition */
/** @typedef {{ question: string, answer: string }} FaqEntry */
/**
 * @typedef {Object} ToolRecord
 * @property {string} id
 * @property {string} slug
 * @property {string} route
 * @property {string} name
 * @property {string} shortDescription
 * @property {string} longDescription
 * @property {string} category
 * @property {string} categoryName
 * @property {string} icon
 * @property {string} accentColor
 * @property {ToolStatus} status
 * @property {string[]} supportedInputTypes
 * @property {string[]} supportedOutputTypes
 * @property {boolean} uploadEnabled
 * @property {boolean} opensEditor
 * @property {"editor" | "converter" | "page-tool" | "information"} workflowType
 * @property {string} currentLimitations
 * @property {string} availabilityLabel
 * @property {string} seoTitle
 * @property {string} metaDescription
 * @property {string} heroHeadline
 * @property {string} heroSubheadline
 * @property {string[]} benefits
 * @property {string[]} steps
 * @property {string[]} useCases
 * @property {FaqEntry[]} faqEntries
 * @property {string[]} relatedTools
 * @property {string} canonicalUrl
 * @property {string} schemaType
 */

export const TOOL_STATUSES = Object.freeze(["available", "beta", "partial", "coming-soon"]);

export const TOOL_CATEGORIES = Object.freeze([
  { id: "edit-view", name: "Edit and view", menuLabel: "Edit", description: "Read, update, mark up, and prepare PDFs for delivery.", accentColor: "#dff7ef", icon: "edit" },
  { id: "organize", name: "Organize", menuLabel: "Organize", description: "Arrange pages and combine files into a useful order.", accentColor: "#fff1bf", icon: "pages" },
  { id: "compress", name: "Compress", menuLabel: "Compress", description: "Reduce file size for easier storage and delivery.", accentColor: "#e6f0ff", icon: "compress" },
  { id: "from-pdf", name: "Convert from PDF", menuLabel: "Convert from PDF", description: "Move PDF content into editable or image formats.", accentColor: "#e7e1ff", icon: "convert" },
  { id: "to-pdf", name: "Convert to PDF", menuLabel: "Convert to PDF", description: "Turn common documents and images into PDFs.", accentColor: "#dff5ff", icon: "file-plus" },
  { id: "sign", name: "Sign", menuLabel: "Sign", description: "Place your own signature and prepare signing fields.", accentColor: "#ffe0ea", icon: "signature" },
  { id: "protect", name: "Protect", menuLabel: "Protect", description: "Security and document-finalization workflows.", accentColor: "#e2f3e7", icon: "lock" },
  { id: "ocr-scan", name: "OCR and scan", menuLabel: "OCR and Scan", description: "Create PDFs from scans and make image text searchable.", accentColor: "#ffead9", icon: "scan" },
  { id: "ai", name: "AI PDF", menuLabel: "AI", description: "Planned document understanding and extraction workflows.", accentColor: "#eee6ff", icon: "sparkles" },
  { id: "compare-review", name: "Compare and review", menuLabel: "Review", description: "Review changes, add comments, and compare document versions.", accentColor: "#e5f2ff", icon: "compare" },
  { id: "templates", name: "Templates", menuLabel: "Templates", description: "Planned starting points for common business documents.", accentColor: "#fff0d7", icon: "template" },
]);

const PARTIAL_EDITOR_LIMIT = "This workflow opens the current browser editor. Supported edits are flattened during export, and source formatting or interactive PDF features may not be preserved.";
const COMING_SOON_LIMIT = "This tool is not implemented yet. FixThatPDF does not upload or process files for this workflow today.";
const DEDICATED_CONVERTER_IDS = new Set(["pdf-to-word", "pdf-to-jpg", "pdf-to-png", "pdf-to-txt", "word-to-pdf", "jpg-to-pdf", "png-to-pdf", "txt-to-pdf"]);
const DEDICATED_PAGE_TOOL_IDS = new Set(["merge-pdf", "split-pdf", "rotate-pdf", "delete-pdf-pages", "extract-pdf-pages", "reorder-pdf-pages", "organize-pdf", "add-page-numbers", "watermark-pdf", "crop-pdf", "compress-pdf", "redact-pdf"]);

/** @type {ToolDefinition[]} */
const definitions = [
  ["edit-pdf", "Edit PDF", "Change selected text overlays, add text, images, shapes, and other content to a PDF.", "edit-view", "edit", "available", ["application/pdf"], ["application/pdf"], "Works with valid, unencrypted, text-based PDFs up to 8 MB. Scanned-image text requires the separate OCR workflow."],
  ["annotate-pdf", "Annotate PDF", "Highlight, draw, add shapes, whiteout areas, and place local comments on PDF pages.", "edit-view", "highlight", "available", ["application/pdf"], ["application/pdf"], "Supported annotations are flattened into the downloaded PDF so they remain visible in standard readers. Shared comment threads are a separate collaboration workflow."],
  ["pdf-reader", "PDF Reader", "Open a PDF in the browser, move between pages, zoom, and search extracted text.", "edit-view", "reader", "available", ["application/pdf"], [], "Supports valid, unencrypted PDFs up to 8 MB. Search works on embedded text; image-only pages require OCR."],
  ["fill-pdf", "Fill PDF", "Place text, checkboxes, dates, initials, and signature content on a PDF.", "edit-view", "form", "available", ["application/pdf"], ["application/pdf"], "Completed values are flattened into the exported PDF for consistent display in standard readers."],
  ["pdf-form-filler", "PDF Form Filler", "Detect supported PDF form widgets, enter responses, and export a completed PDF.", "edit-view", "form", "available", ["application/pdf"], ["application/pdf"], "Text and checkbox AcroForm widgets are detected and completed as flattened output. Dynamic XFA forms are outside this browser workflow."],
  ["crop-pdf", "Crop PDF", "Trim page boundaries to keep only the area you need.", "edit-view", "crop", "available", ["application/pdf"], ["application/pdf"], "Browser cropping sets accurate PDF page bounds on selected pages. Original content is preserved outside the visible page box and can be recovered from the source file."],
  ["watermark-pdf", "Watermark PDF", "Apply text or image marks across selected PDF pages.", "edit-view", "watermark", "available", ["application/pdf", "image/png", "image/jpeg"], ["application/pdf"], "Browser watermarking keeps original PDF pages intact and supports text or PNG/JPG marks, selected pages, position, tiling, opacity, rotation, and scale. Encrypted PDFs are not supported."],
  ["add-page-numbers", "Add Page Numbers", "Place consistent page numbers in headers or footers across a PDF.", "edit-view", "numbers", "available", ["application/pdf"], ["application/pdf"], "Browser page numbering supports valid, unencrypted PDFs up to 50 MB and 200 pages, with six header and footer positions."],
  ["redact-pdf", "Redact PDF", "Permanently remove sensitive content from a PDF before sharing it.", "edit-view", "redact", "available", ["application/pdf"], ["application/pdf"], "Permanent browser redaction rebuilds every page from rendered pixels, removes source content streams and metadata, and supports unencrypted PDFs up to 20 MB and 50 pages. The output is flattened and no longer searchable, editable, form-fillable, linked, layered, or tagged for accessibility."],
  ["share-pdf", "Share PDF", "Create a controlled link for another person to view or download a PDF.", "edit-view", "share", "available", ["application/pdf"], [], "Signed-in users can create cryptographically random read-only links with 1-day, 7-day, or 30-day expiration and immediate revocation. Password access and named-recipient restrictions are not yet supported."],

  ["merge-pdf", "Merge PDF", "Combine multiple ordered PDFs into one high-fidelity document.", "organize", "merge", "available", ["application/pdf"], ["application/pdf"], "Browser merging supports up to 20 valid, unencrypted PDFs, 50 MB each, and 200 total pages."],
  ["split-pdf", "Split PDF", "Separate one PDF into downloadable files using page ranges.", "organize", "split", "available", ["application/pdf"], ["application/pdf", "application/zip"], "Browser splitting supports valid, unencrypted PDFs up to 50 MB and 200 pages."],
  ["rotate-pdf", "Rotate PDF", "Rotate PDF pages in 90-degree steps without rasterizing their native content.", "organize", "rotate", "available", ["application/pdf"], ["application/pdf"], "Browser organization supports valid, unencrypted PDFs up to 50 MB and 200 output pages."],
  ["delete-pdf-pages", "Delete PDF Pages", "Remove pages from a PDF and download the remaining native pages.", "organize", "delete", "available", ["application/pdf"], ["application/pdf"], "At least one page must remain. Browser organization supports PDFs up to 50 MB and 200 pages."],
  ["extract-pdf-pages", "Extract PDF Pages", "Select pages and export them as a separate high-fidelity PDF.", "organize", "extract", "available", ["application/pdf"], ["application/pdf"], "Browser extraction supports valid, unencrypted PDFs up to 50 MB and 200 pages."],
  ["reorder-pdf-pages", "Reorder PDF Pages", "Drag page thumbnails into a new order and download the reorganized PDF.", "organize", "reorder", "available", ["application/pdf"], ["application/pdf"], "Browser organization supports valid, unencrypted PDFs up to 50 MB and 200 output pages."],
  ["organize-pdf", "Organize PDF", "Reorder, rotate, duplicate, and delete PDF pages with undo.", "organize", "pages", "available", ["application/pdf"], ["application/pdf"], "Browser organization supports valid, unencrypted PDFs up to 50 MB and 200 output pages."],

  ["compress-pdf", "Compress PDF", "Reduce image-heavy PDFs while balancing visual quality and file size.", "compress", "compress", "available", ["application/pdf"], ["application/pdf"], "Browser compression re-renders pages as JPEGs, preserving their visual appearance but flattening selectable text, links, forms, and layers. The app only offers a download when the result is smaller."],

  ["pdf-to-word", "PDF to Word", "Convert PDF content into an editable or visually faithful Word document.", "from-pdf", "word", "available", ["application/pdf"], ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], "Editable conversion preserves page breaks, text order, indentation, spacing, common font styling, and page proportions. Visual fidelity mode preserves the original page appearance. Browser conversion supports valid, unencrypted PDFs up to 20 MB and 50 pages; scanned documents need OCR before editable text can be recovered."],
  ["pdf-to-excel", "PDF to Excel", "Extract tables and structured values from a PDF into an Excel workbook.", "from-pdf", "sheet", "coming-soon", ["application/pdf"], ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], "Table detection and XLSX generation are not implemented."],
  ["pdf-to-powerpoint", "PDF to PowerPoint", "Turn PDF pages into an editable or image-based presentation.", "from-pdf", "slides", "coming-soon", ["application/pdf"], ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], "PPTX generation and editable slide reconstruction are not implemented."],
  ["pdf-to-jpg", "PDF to JPG", "Render selected PDF pages as individual JPG images.", "from-pdf", "image", "available", ["application/pdf"], ["image/jpeg", "application/zip"], "Browser conversion supports valid, unencrypted PDFs up to 50 MB and 100 pages. Complex transparency is flattened into JPG output."],
  ["pdf-to-png", "PDF to PNG", "Render selected PDF pages as individual lossless PNG images.", "from-pdf", "image", "available", ["application/pdf"], ["image/png", "application/zip"], "Browser conversion supports valid, unencrypted PDFs up to 50 MB and 100 pages. Higher resolutions use more memory."],
  ["pdf-to-txt", "PDF to TXT", "Extract readable text from a text-based PDF into a plain text file.", "from-pdf", "text", "available", ["application/pdf"], ["text/plain"], "Browser extraction supports unencrypted, text-based PDFs up to 10 MB and 200 pages. Scanned image PDFs need OCR before text can be extracted."],
  ["pdf-to-html", "PDF to HTML", "Convert PDF content into a browser-readable HTML document.", "from-pdf", "code", "coming-soon", ["application/pdf"], ["text/html"], "Semantic HTML reconstruction and asset packaging are not implemented."],

  ["word-to-pdf", "Word to PDF", "Convert a DOCX document into a visually faithful, searchable PDF in your browser.", "to-pdf", "word", "available", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], ["application/pdf"], "DOCX pages are rendered at high resolution and include an invisible searchable text layer, so text remains selectable and findable in standard PDF readers. Files up to 20 MB and 50 rendered pages are supported. Macros and live Word fields are intentionally not executed in the browser."],
  ["excel-to-pdf", "Excel to PDF", "Convert spreadsheet sheets and print areas into a PDF.", "to-pdf", "sheet", "coming-soon", ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], ["application/pdf"], "Spreadsheet rendering, print areas, and page scaling are not implemented."],
  ["powerpoint-to-pdf", "PowerPoint to PDF", "Convert presentation slides into a PDF in slide order.", "to-pdf", "slides", "coming-soon", ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], ["application/pdf"], "Presentation rendering and font substitution handling are not implemented."],
  ["jpg-to-pdf", "JPG to PDF", "Combine ordered JPG images into a PDF with configurable page sizing, orientation, and margins.", "to-pdf", "image", "available", ["image/jpeg"], ["application/pdf"], "Browser conversion supports up to 100 JPG images, with each source image limited to 50 MB."],
  ["png-to-pdf", "PNG to PDF", "Combine ordered PNG images into a PDF with configurable page sizing, orientation, and margins.", "to-pdf", "image", "available", ["image/png"], ["application/pdf"], "Browser conversion supports up to 100 PNG images, with each source image limited to 50 MB. Transparency is preserved where the PDF format allows it."],
  ["txt-to-pdf", "TXT to PDF", "Turn plain text into a paginated PDF with readable margins and typography.", "to-pdf", "text", "available", ["text/plain"], ["application/pdf"], "Browser conversion supports TXT files up to 10 MB with US Letter or A4 pages and four readable font sizes. Characters outside the built-in PDF font set are replaced with a question mark."],
  ["rtf-to-pdf", "RTF to PDF", "Convert a rich text document into a PDF.", "to-pdf", "text", "coming-soon", ["application/rtf", "text/rtf"], ["application/pdf"], "RTF parsing and layout rendering are not implemented."],
  ["odt-to-pdf", "ODT to PDF", "Convert an OpenDocument text file into a PDF.", "to-pdf", "text", "coming-soon", ["application/vnd.oasis.opendocument.text"], ["application/pdf"], "ODT parsing, font handling, and pagination are not implemented."],
  ["odp-to-pdf", "ODP to PDF", "Convert an OpenDocument presentation into a PDF.", "to-pdf", "slides", "coming-soon", ["application/vnd.oasis.opendocument.presentation"], ["application/pdf"], "ODP slide rendering is not implemented."],
  ["ods-to-pdf", "ODS to PDF", "Convert an OpenDocument spreadsheet into a PDF.", "to-pdf", "sheet", "coming-soon", ["application/vnd.oasis.opendocument.spreadsheet"], ["application/pdf"], "ODS sheet rendering and print-area controls are not implemented."],
  ["html-to-pdf", "HTML to PDF", "Render a web page or HTML document into a PDF.", "to-pdf", "code", "coming-soon", ["text/html"], ["application/pdf"], "URL fetching, browser rendering, and safe HTML processing are not implemented."],
  ["epub-to-pdf", "EPUB to PDF", "Convert an EPUB ebook into a paginated PDF.", "to-pdf", "book", "coming-soon", ["application/epub+zip"], ["application/pdf"], "EPUB parsing, chapter flow, and typography controls are not implemented."],
  ["zip-to-pdf", "ZIP to PDF", "Create one PDF from supported files contained in a ZIP archive.", "to-pdf", "archive", "coming-soon", ["application/zip"], ["application/pdf"], "Archive inspection, safe extraction, file ordering, and mixed-format conversion are not implemented."],

  ["sign-pdf", "Sign PDF", "Place your own typed, drawn, or uploaded signature on a PDF.", "sign", "signature", "available", ["application/pdf", "image/png", "image/jpeg"], ["application/pdf"], "This is a self-signing workflow. Recipient invitations, identity verification, signing order, and completion certificates belong to Request Signatures."],
  ["request-signatures", "Request Signatures", "Place signer fields, export a signing copy, and hand it off with your device's share sheet.", "sign", "send", "available", ["application/pdf"], ["application/pdf"], "Local signing-copy handoff is available. Hosted signing links, reminders, signing status, identity verification, and audit certificates are not implemented."],
  ["add-initials", "Add Initials", "Create typed initials, place them on a PDF, and include them in the exported file.", "sign", "initials", "available", ["application/pdf"], ["application/pdf"], "Initials are self-attested visual content and are flattened into the exported PDF."],
  ["add-date-fields", "Add Date Fields", "Place the current date or editable date text on a PDF.", "sign", "calendar", "available", ["application/pdf"], ["application/pdf"], "Date content is editable before export and is flattened into the downloaded PDF for consistent display."],

  ["protect-pdf", "Protect PDF", "Require a password before a PDF can be opened.", "protect", "lock", "available", ["application/pdf"], ["application/pdf"], "AES-256 password encryption runs locally in your browser. Account recovery, enterprise password policy, certificates, and digital-rights enforcement are not implemented."],
  ["unlock-pdf", "Unlock PDF", "Remove a known password from a PDF you are authorized to modify.", "protect", "unlock", "coming-soon", ["application/pdf"], ["application/pdf"], "Encrypted PDF input and authorized password removal are not implemented."],
  ["flatten-pdf", "Flatten PDF", "Combine annotations and form appearances into regular page content.", "protect", "layers", "coming-soon", ["application/pdf"], ["application/pdf"], "A verified whole-document flattening workflow is not implemented, even though supported editor overlays export as flattened content."],
  ["remove-pdf-password", "Remove PDF Password", "Remove a password from a PDF when you know the current password and have permission.", "protect", "unlock", "coming-soon", ["application/pdf"], ["application/pdf"], "Password validation and decryption are not implemented."],

  ["ocr-pdf", "OCR PDF", "Recognize text on scanned PDF pages so it can be searched or copied.", "ocr-scan", "scan", "coming-soon", ["application/pdf"], ["application/pdf", "text/plain"], "The editor detects image-only pages but does not run OCR."],
  ["pdf-scanner", "PDF Scanner", "Capture paper pages with a camera and assemble them into a PDF.", "ocr-scan", "camera", "coming-soon", ["image/jpeg", "image/png"], ["application/pdf"], "Camera capture, edge detection, perspective correction, and scan cleanup are not implemented."],
  ["scan-to-pdf", "Scan to PDF", "Turn scanned page images into an ordered PDF.", "ocr-scan", "scan", "coming-soon", ["image/jpeg", "image/png"], ["application/pdf"], "Batch scan import, cleanup, and PDF generation are not implemented."],
  ["image-to-searchable-pdf", "Image to Searchable PDF", "Create a PDF from images and add a searchable OCR text layer.", "ocr-scan", "search", "coming-soon", ["image/jpeg", "image/png"], ["application/pdf"], "Image-to-PDF conversion and OCR text-layer generation are not implemented."],

  ["ai-pdf", "AI PDF Assistant", "Ask for help understanding and working through a PDF with cited source pages.", "ai", "sparkles", "coming-soon", ["application/pdf"], [], "No document AI service is connected. The current landing assistant returns fixed guidance and does not analyze files."],
  ["chat-with-pdf", "Chat with PDF", "Ask conversational questions and receive answers linked to source pages.", "ai", "chat", "coming-soon", ["application/pdf"], [], "Retrieval, citations, model inference, and conversation storage are not implemented."],
  ["summarize-pdf", "Summarize PDF", "Create a concise summary with references to the pages that support it.", "ai", "summary", "coming-soon", ["application/pdf"], ["text/plain"], "Summarization and page citations are not implemented."],
  ["translate-pdf", "Translate PDF", "Translate document text while keeping page structure understandable.", "ai", "translate", "coming-soon", ["application/pdf"], ["application/pdf"], "Translation and layout-preserving reconstruction are not implemented."],
  ["extract-data-from-pdf", "Extract Data from PDF", "Pull selected fields, tables, and structured records from a PDF.", "ai", "database", "coming-soon", ["application/pdf"], ["application/json", "text/csv"], "Schema selection, table extraction, validation, and structured export are not implemented."],
  ["ask-pdf", "Ask Questions About PDF", "Ask a focused question and receive an answer with source references.", "ai", "question", "coming-soon", ["application/pdf"], [], "Question answering and source-reference verification are not implemented."],
  ["ai-question-generator", "AI Question Generator", "Create study or review questions from a document's actual content.", "ai", "question", "coming-soon", ["application/pdf"], ["text/plain"], "Document-based question generation and answer-key validation are not implemented."],
  ["contract-analyzer", "Contract Analyzer", "Identify clauses, obligations, dates, and areas that may need review.", "ai", "contract", "coming-soon", ["application/pdf"], [], "Clause extraction is not implemented and FixThatPDF does not provide legal advice."],
  ["resume-analyzer", "Resume Analyzer", "Review resume structure and surface role-relevant content for a user to assess.", "ai", "resume", "coming-soon", ["application/pdf"], [], "Resume analysis, job matching, and scoring are not implemented."],

  ["compare-pdf", "Compare PDFs", "Compare two PDFs and identify page-level or content-level differences.", "compare-review", "compare", "coming-soon", ["application/pdf"], ["application/pdf"], "Two-document comparison and difference visualization are not implemented."],
  ["document-version-comparison", "Document Version Comparison", "Review what changed between two versions of the same document.", "compare-review", "versions", "coming-soon", ["application/pdf"], [], "Version history and semantic change tracking are not implemented."],
  ["review-pdf", "Review PDF", "Add highlights, drawings, shapes, threaded comments, assignments, and resolution history while reviewing a PDF.", "compare-review", "review", "available", ["application/pdf"], ["application/pdf"], "The complete review trail is stored with the browser editing session, and exported comments are embedded as standard PDF comment annotations. Real-time multi-user synchronization requires saving and sharing an account document."],
  ["comment-on-pdf", "Comment on PDF", "Place threaded comments on PDF pages, add replies, assign follow-up, and resolve or reopen feedback.", "compare-review", "comment", "available", ["application/pdf"], ["application/pdf"], "Comment threads and their resolution history are stored locally with the document and embedded in the exported PDF. Notifications and simultaneous multi-user editing require a shared account workflow."],

  ["resume-templates", "Resume Templates", "Start from a reusable resume layout and export it as a PDF.", "templates", "resume", "coming-soon", [], ["application/pdf"], "The current dashboard cards are examples only; real resume templates and content editing are not implemented."],
  ["contract-templates", "Contract Templates", "Start from a reusable contract structure for your own review and customization.", "templates", "contract", "coming-soon", [], ["application/pdf"], "Real contract templates, legal review, variables, and reusable field definitions are not implemented."],
  ["nda-templates", "NDA Templates", "Start from a reusable nondisclosure agreement structure.", "templates", "contract", "coming-soon", [], ["application/pdf"], "The NDA card in the dashboard is mocked and does not provide a real agreement template."],
  ["invoice-templates", "Invoice Templates", "Start from a reusable invoice layout with business and line-item fields.", "templates", "invoice", "coming-soon", [], ["application/pdf"], "Real invoice layouts, calculations, and reusable customer data are not implemented."],
  ["offer-letter-templates", "Offer Letter Templates", "Start from a reusable offer-letter structure for a hiring workflow.", "templates", "letter", "coming-soon", [], ["application/pdf"], "Real offer-letter templates, variables, approvals, and signing workflows are not implemented."],
];

const CATEGORY_BY_ID = new Map(TOOL_CATEGORIES.map((category) => [category.id, category]));

/** @type {Record<string, { benefit: string, steps: string[], uses: string[] }>} */
const categoryContent = {
  "edit-view": {
    benefit: "Work directly on familiar PDF pages without rebuilding the document from scratch.",
    steps: ["Open the PDF in the FixThatPDF editor.", "Choose the supported editing or viewing control you need.", "Review the result and export a new PDF when ready."],
    uses: ["Correcting a document before delivery", "Marking up a draft for personal review", "Completing a form-like document"],
  },
  organize: {
    benefit: "See page order clearly before producing the final document.",
    steps: ["Open the source PDF in the editor.", "Use page thumbnails and the available page controls.", "Check page order, then export the updated PDF."],
    uses: ["Preparing an approval packet", "Removing an unwanted page", "Reordering a multi-page submission"],
  },
  compress: {
    benefit: "Smaller PDFs are easier to email and store when quality remains acceptable.",
    steps: ["Choose the source PDF.", "Select an appropriate quality target.", "Review the resulting size and download the optimized file."],
    uses: ["Meeting an upload size limit", "Sending a PDF by email", "Reducing archive storage"],
  },
  "from-pdf": {
    benefit: "Move PDF content into a format suited to editing, analysis, or reuse.",
    steps: ["Choose the source PDF.", "Select the required output format and conversion options.", "Review formatting and download the converted file."],
    uses: ["Reusing document content", "Moving tables into analysis tools", "Exporting PDF pages as images"],
  },
  "to-pdf": {
    benefit: "Create a consistent PDF for sharing from a supported source format.",
    steps: ["Choose the source file.", "Review page sizing and conversion options.", "Download and verify the resulting PDF."],
    uses: ["Sharing a fixed-layout copy", "Combining source files into a PDF workflow", "Preparing a document for review"],
  },
  sign: {
    benefit: "Place clear signature-related content exactly where it belongs on the page.",
    steps: ["Open the PDF and choose a signature or field tool.", "Create and position the supported content.", "Review every page and export the signed copy."],
    uses: ["Self-signing a form", "Adding initials to an acknowledgement", "Placing a date beside a signature"],
  },
  protect: {
    benefit: "Security tools should make their protection level and limitations explicit.",
    steps: ["Choose a PDF you are authorized to modify.", "Apply the requested security operation.", "Verify the resulting file before distributing it."],
    uses: ["Controlling document access", "Finalizing a completed document", "Removing protection with authorization"],
  },
  "ocr-scan": {
    benefit: "Searchable scans make image-only documents easier to find and reuse.",
    steps: ["Capture or choose clear page images.", "Review page edges, order, and text recognition.", "Download and verify the searchable PDF."],
    uses: ["Digitizing paper records", "Searching a scanned agreement", "Creating a PDF from photographed pages"],
  },
  ai: {
    benefit: "Useful document AI must point back to the source instead of inventing unsupported answers.",
    steps: ["Open a document in a secure analysis workspace.", "Choose a focused question or extraction task.", "Check every result against its cited source pages."],
    uses: ["Reviewing a long document", "Finding structured information", "Preparing questions for further analysis"],
  },
  "compare-review": {
    benefit: "A clear review trail helps people understand what changed and what still needs attention.",
    steps: ["Open the document or versions you need to review.", "Inspect differences or add supported annotations.", "Verify the final document and export or share it through an approved workflow."],
    uses: ["Reviewing a contract draft", "Checking a revised policy", "Leaving notes on a PDF"],
  },
  templates: {
    benefit: "A useful template provides a real starting structure, not just an empty document.",
    steps: ["Choose a template suited to the document type.", "Replace the sample content with reviewed information.", "Check the final document before export or signing."],
    uses: ["Starting a recurring document", "Keeping formatting consistent", "Reducing repetitive setup work"],
  },
};

/** @param {string} type */
function formatType(type) {
  if (!type) return "supported files";
  /** @type {Record<string, string>} */
  const known = {
    "application/pdf": "PDF",
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "text/plain": "TXT",
    "text/html": "HTML",
    "application/json": "JSON",
    "text/csv": "CSV",
  };
  return known[type] || type.split(/[./+-]/).pop()?.toUpperCase() || type.toUpperCase();
}

/** @param {ToolDefinition} definition @returns {ToolRecord} */
function buildBaseTool([slug, name, shortDescription, category, icon, status, supportedInputTypes, supportedOutputTypes, currentLimitations]) {
  const route = `/${slug}`;
  const categoryRecord = CATEGORY_BY_ID.get(category);
  const content = categoryContent[category];
  if (!categoryRecord || !content) throw new Error(`Unknown tool category: ${category}`);
  const isUsable = status === "available" || status === "beta" || status === "partial";
  const isDedicatedConverter = DEDICATED_CONVERTER_IDS.has(slug);
  const isDedicatedPageTool = DEDICATED_PAGE_TOOL_IDS.has(slug);
  const hasDedicatedWorkflow = isDedicatedConverter || isDedicatedPageTool;
  const inputLabel = supportedInputTypes.length ? supportedInputTypes.map(formatType).join(", ") : "No upload today";
  const outputLabel = supportedOutputTypes.length ? supportedOutputTypes.map(formatType).join(", ") : "No generated output today";
  const availabilityLabel = status === "available" ? "Available" : status === "beta" ? "Beta" : status === "partial" ? "Available with limitations" : "Coming soon";

  return {
    id: slug,
    slug,
    route,
    name,
    shortDescription,
    longDescription: `${shortDescription} ${isUsable ? hasDedicatedWorkflow ? "Use the dedicated FixThatPDF workflow and review the downloaded result carefully." : "Use the supported workflow in the current FixThatPDF editor and review the exported result carefully." : "The page explains the intended workflow without pretending that file processing is available."}`,
    category,
    categoryName: categoryRecord.name,
    icon,
    accentColor: categoryRecord.accentColor,
    status,
    supportedInputTypes,
    supportedOutputTypes,
    uploadEnabled: isUsable,
    opensEditor: isUsable && !hasDedicatedWorkflow,
    workflowType: isDedicatedConverter ? "converter" : isDedicatedPageTool ? "page-tool" : isUsable ? "editor" : "information",
    currentLimitations: currentLimitations || (isUsable ? PARTIAL_EDITOR_LIMIT : COMING_SOON_LIMIT),
    availabilityLabel,
    seoTitle: `${name} Online | FixThatPDF`,
    metaDescription: `${shortDescription} See current availability, supported formats, and limitations in FixThatPDF.`,
    heroHeadline: `${name}, with honest limits`,
    heroSubheadline: shortDescription,
    benefits: [content.benefit, `Inputs: ${inputLabel}.`, `Outputs: ${outputLabel}.`],
    steps: content.steps.map((step, index) => index === 0 ? step.replace(/the source|a document|the document or versions|a PDF you are authorized to modify|a document in a secure analysis workspace|the PDF/i, name) : step),
    useCases: content.uses,
    faqEntries: [
      { question: `What does ${name} do?`, answer: shortDescription },
      { question: `Is ${name} available in FixThatPDF today?`, answer: `${availabilityLabel}. ${currentLimitations}` },
      { question: `What should I verify after using ${name}?`, answer: isUsable ? "Open the exported PDF, check every changed page, and confirm that text, images, signatures, and page order look correct before sharing it." : "No file is processed today. Use the related available editor workflows shown on this page, and return when this tool is implemented." },
    ],
    relatedTools: /** @type {string[]} */ ([]),
    canonicalUrl: absoluteSiteUrl(route),
    schemaType: isUsable ? "SoftwareApplication" : "WebPage",
  };
}

const builtTools = definitions.map(buildBaseTool);

export const TOOL_REGISTRY = Object.freeze(builtTools.map((tool) => ({
  ...tool,
  relatedTools: builtTools
    .filter((candidate) => candidate.category === tool.category && candidate.id !== tool.id)
    .slice(0, 3)
    .map((candidate) => candidate.id),
})));

export const TOOL_BY_ID = new Map(TOOL_REGISTRY.map((tool) => [tool.id, tool]));
export const TOOL_BY_ROUTE = new Map(TOOL_REGISTRY.map((tool) => [tool.route, tool]));

export const POPULAR_TOOL_IDS = Object.freeze([
  "edit-pdf",
  "annotate-pdf",
  "fill-pdf",
  "pdf-form-filler",
  "sign-pdf",
  "merge-pdf",
  "split-pdf",
  "organize-pdf",
  "rotate-pdf",
  "delete-pdf-pages",
  "pdf-to-jpg",
  "pdf-to-png",
  "jpg-to-pdf",
  "png-to-pdf",
]);

export const POPULAR_TOOLS = Object.freeze(POPULAR_TOOL_IDS.map((id) => TOOL_BY_ID.get(id)).filter((tool) => tool && tool.status !== "coming-soon"));

/** @param {string} slug */
export function getToolBySlug(slug) {
  return TOOL_BY_ID.get(slug) || null;
}

/** @param {string} categoryId */
export function getToolsByCategory(categoryId) {
  return TOOL_REGISTRY.filter((tool) => tool.category === categoryId);
}

/** @param {ToolRecord} tool */
export function getRelatedTools(tool) {
  return tool.relatedTools.map((id) => TOOL_BY_ID.get(id)).filter(Boolean);
}

/** @param {readonly ToolRecord[]} [tools] */
export function validateToolRegistry(tools = TOOL_REGISTRY) {
  /** @type {string[]} */
  const errors = [];
  /** @type {Array<"id" | "slug" | "route" | "seoTitle" | "metaDescription">} */
  const uniqueFields = ["id", "slug", "route", "seoTitle", "metaDescription"];
  for (const field of uniqueFields) {
    const seen = new Set();
    for (const tool of tools) {
      if (!tool[field]) errors.push(`${tool.id || "Unknown tool"} is missing ${field}.`);
      if (seen.has(tool[field])) errors.push(`Duplicate ${field}: ${tool[field]}.`);
      seen.add(tool[field]);
    }
  }
  for (const tool of tools) {
    if (!TOOL_STATUSES.includes(tool.status)) errors.push(`${tool.id} has invalid status ${tool.status}.`);
    if (!CATEGORY_BY_ID.has(tool.category)) errors.push(`${tool.id} has invalid category ${tool.category}.`);
    for (const relatedId of tool.relatedTools) {
      if (!tools.some((candidate) => candidate.id === relatedId)) errors.push(`${tool.id} references missing related tool ${relatedId}.`);
    }
  }
  return errors;
}

const registryErrors = validateToolRegistry();
if (registryErrors.length) throw new Error(`Invalid FixThatPDF tool registry:\n${registryErrors.join("\n")}`);
