import { useRef, useState } from "react";
import Archive from "lucide-react/dist/esm/icons/archive.mjs";
import BookOpen from "lucide-react/dist/esm/icons/book-open.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileSpreadsheet from "lucide-react/dist/esm/icons/file-spreadsheet.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Presentation from "lucide-react/dist/esm/icons/presentation.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { convertOpenDocumentToPdf, validateOpenDocumentFile } from "../../tools/openDocumentConversion.js";

const MODES = Object.freeze({
  "rtf-to-pdf": { label: "RTF", extension: ".rtf", accept: "application/rtf,text/rtf,.rtf", icon: FileText, heading: "Keep the document's readable text and paragraphs", detail: "The browser parser reads standard RTF text, paragraph breaks, tabs, symbols, and Unicode escapes. Complex text boxes, images, tables, headers, footers, and exact fonts are not reconstructed." },
  "odt-to-pdf": { label: "ODT", extension: ".odt", accept: "application/vnd.oasis.opendocument.text,.odt", icon: FileText, heading: "Turn OpenDocument text into clean PDF pages", detail: "Paragraphs, headings, tabs, and line breaks are extracted from the ODT package. The output prioritizes readable searchable text over exact LibreOffice page layout." },
  "odp-to-pdf": { label: "ODP", extension: ".odp", accept: "application/vnd.oasis.opendocument.presentation,.odp", icon: Presentation, heading: "Keep every presentation slide in order", detail: "Each ODP slide becomes a landscape PDF page with its readable title and text. Animations, master themes, charts, media, and exact object placement are not reconstructed." },
  "ods-to-pdf": { label: "ODS", extension: ".ods", accept: "application/vnd.oasis.opendocument.spreadsheet,.ods", icon: FileSpreadsheet, heading: "Paginate OpenDocument worksheets into tables", detail: "Sheet names, cells, values, and repeated rows or columns are read from the ODS package. Formulas use stored values; charts, macros, print areas, and exact formatting are not reconstructed." },
  "epub-to-pdf": { label: "EPUB", extension: ".epub", accept: "application/epub+zip,.epub", icon: BookOpen, heading: "Flow ebook chapters into readable PDF pages", detail: "The EPUB package order is followed and chapter text is converted into searchable PDF pages. DRM, audio, video, scripts, custom fonts, and exact ebook CSS are not supported." },
  "zip-to-pdf": { label: "ZIP", extension: ".zip", accept: "application/zip,application/x-zip-compressed,.zip", icon: Archive, heading: "Combine supported archive files in filename order", detail: "PDF, JPG, PNG, TXT, Markdown, HTML, RTF, ODT, ODP, ODS, and EPUB files are converted and combined. Nested ZIPs, encrypted archives, executables, and unsupported files are ignored." },
});

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function downloadPdf(bytes, name, toolId) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  trackProductEvent("pdf_downloaded", { toolId });
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OpenDocumentConversionPage({ tool }) {
  const mode = MODES[tool.id];
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [bytes, setBytes] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const ModeIcon = mode.icon;

  const choose = async (nextFile) => {
    const validationError = validateOpenDocumentFile(nextFile, tool.id);
    if (validationError) return setError(validationError);
    setStatus("reading"); setError("");
    try {
      setBytes(new Uint8Array(await nextFile.arrayBuffer()));
      setFile(nextFile);
      setStatus("ready");
      trackProductEvent("upload_started", { toolId: tool.id });
    } catch {
      setFile(null); setBytes(null); setStatus("idle"); setError(`This ${mode.label} file could not be read.`);
    }
  };

  const convert = async () => {
    if (!file || !bytes) return;
    setStatus("converting"); setProgress(8); setError("");
    trackProductEvent("export_started", { toolId: tool.id });
    try {
      const baseName = file.name.replace(/\.[^.]+$/, "") || "fixthatpdf-document";
      const output = await convertOpenDocumentToPdf(tool.id, bytes, { title: baseName, onProgress: ({ completed, total }) => setProgress(Math.round(10 + completed / total * 82)) });
      setProgress(100);
      downloadPdf(output, `${baseName}.pdf`, tool.id);
      setStatus("complete");
      trackProductEvent("export_succeeded", { toolId: tool.id });
    } catch (conversionError) {
      setStatus("ready");
      setError(conversionError?.message || "The PDF could not be created.");
      trackProductEvent("export_failed", { toolId: tool.id, errorCategory: "open_document_conversion_failed" });
    }
  };

  return <main className="image-conversion-page office-conversion-page open-document-conversion-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
    <section className="conversion-hero"><div><small>Available · runs in your browser</small><h1>{tool.name} online.</h1><p>{tool.shortDescription} Your source file is processed locally, without a conversion-server upload.</p></div></section>
    <div className="conversion-workspace-grid"><section><div className={`conversion-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files?.[0]); }}>
      <input ref={inputRef} type="file" accept={mode.accept} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} /><span><Upload size={27} /></span><h2>Drop your {mode.label} file here</h2><p>Choose a {mode.extension} file up to 25 MB.</p><button type="button" disabled={status === "reading" || status === "converting"} onClick={() => inputRef.current?.click()}>Choose a file</button>
    </div>{status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading the {mode.label} file…</div>}{error && <div className="conversion-error" role="alert">{error}</div>}{file && <div className="office-file-card"><header><ModeIcon size={20} /><div><strong>{file.name}</strong><small>{formatBytes(file.size)} · ready for conversion</small></div></header></div>}</section>
    <aside className="conversion-settings-card"><span>PDF output</span><ModeIcon size={25} /><h2>{mode.heading}</h2><div className="office-mode-note"><strong>What this converter preserves</strong><p>{mode.detail}</p></div><div className="conversion-summary"><Check size={18} /><span>{file ? `${file.name} is ready` : `Add a ${mode.extension} file to continue`}</span></div>{status === "converting" && <><div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div><p className="ocr-status">Converting locally… {progress}%</p></>}<button className="conversion-primary-action" type="button" disabled={!file || !bytes || status === "reading" || status === "converting"} onClick={convert}>{status === "converting" ? <><LoaderCircle className="is-spinning" size={18} /> Converting…</> : <><Download size={18} /> Download PDF</>}</button>{status === "complete" && <p className="conversion-success">Your PDF was downloaded.</p>}</aside></div>
    <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private browser processing</strong><p>The source file stays on this device. Open the downloaded PDF and review complex layout, typography, formulas, and archive order.</p></div></section>
    <ToolGuideContent tool={tool} />
  </main>;
}
