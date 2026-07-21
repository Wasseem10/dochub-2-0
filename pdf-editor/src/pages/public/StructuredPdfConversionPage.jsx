import { useRef, useState } from "react";
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
import {
  createPptxFromRenderedPages,
  createStandaloneHtmlFromPdfPages,
  createXlsxFromPdfPages,
  pdfTextItemsToRows,
  STRUCTURED_CONVERSION_LIMITS,
  validateStructuredPdf,
} from "../../tools/structuredPdfConversion.js";

const MODES = Object.freeze({
  "pdf-to-excel": {
    format: "Excel",
    extension: "xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    icon: FileSpreadsheet,
    heading: "Extract rows into a real workbook",
    detail: "Each PDF page becomes an Excel sheet. Text on the same visual line is grouped into rows and separated into cells when the horizontal gap suggests a new column.",
  },
  "pdf-to-powerpoint": {
    format: "PowerPoint",
    extension: "pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    icon: Presentation,
    heading: "Preserve every page as a slide",
    detail: "Each page is rendered at high resolution and placed proportionally on its own PowerPoint slide. The result prioritizes visual fidelity over editable source objects.",
  },
  "pdf-to-html": {
    format: "HTML",
    extension: "html",
    mimeType: "text/html;charset=utf-8",
    icon: FileText,
    heading: "Create standalone selectable HTML",
    detail: "Embedded PDF text is placed into responsive SVG pages, preserving its approximate position while remaining selectable in a browser.",
  },
});

async function loadPdfRenderer() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjsLib;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function friendlyPdfError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (error?.name === "PasswordException" || message.includes("password")) return "This PDF is encrypted. Remove its password with an authorized tool, then try again.";
  if (message.includes("invalid pdf") || message.includes("missing pdf")) return "This PDF appears corrupted or incomplete. Try downloading a fresh copy.";
  if (message.includes("supports up to") || message.includes("no embedded text")) return error.message;
  return error?.message || "FixThatPDF could not convert this PDF.";
}

function downloadOutput(data, type, name, toolId) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  trackProductEvent("pdf_downloaded", { toolId });
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToJpegDataUrl(canvas) {
  return canvas.toDataURL("image/jpeg", 0.92);
}

export function StructuredPdfConversionPage({ tool }) {
  const mode = MODES[tool.id];
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const ModeIcon = mode.icon;

  const loadFile = async (nextFile) => {
    const validationError = validateStructuredPdf(nextFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      setPdfDocument(null);
      return;
    }
    setStatus("reading");
    setProgress(0);
    setError("");
    try {
      const pdfjsLib = await loadPdfRenderer();
      const buffer = await nextFile.arrayBuffer();
      const documentProxy = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      if (documentProxy.numPages > STRUCTURED_CONVERSION_LIMITS.maxPages) throw new Error(`${mode.format} conversion supports up to ${STRUCTURED_CONVERSION_LIMITS.maxPages} pages.`);
      setFile(nextFile);
      setPdfDocument(documentProxy);
      setPageCount(documentProxy.numPages);
      setStatus("idle");
    } catch (loadError) {
      setFile(null);
      setPdfDocument(null);
      setPageCount(0);
      setStatus("idle");
      setError(friendlyPdfError(loadError));
    }
  };

  const convert = async () => {
    if (!file || !pdfDocument) return;
    setStatus("converting");
    setProgress(0);
    setError("");
    const baseName = file.name.replace(/\.pdf$/i, "") || "fixthatpdf-document";
    try {
      if (tool.id === "pdf-to-excel") {
        const pages = [];
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          pages.push({ name: `Page ${pageNumber}`, rows: pdfTextItemsToRows((await page.getTextContent()).items) });
          setProgress(Math.round((pageNumber / pdfDocument.numPages) * 90));
        }
        const hasText = pages.some((page) => page.rows.length);
        if (!hasText) throw new Error("No embedded text was found. Scanned image PDFs need OCR before Excel conversion.");
        downloadOutput(createXlsxFromPdfPages(pages, { title: baseName }), mode.mimeType, `${baseName}.xlsx`, tool.id);
      } else if (tool.id === "pdf-to-html") {
        const pdfjsLib = await loadPdfRenderer();
        const pages = [];
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1 });
          const textContent = await page.getTextContent();
          const items = textContent.items.filter((item) => String(item.str || "").trim()).map((item) => {
            const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const fontSize = Math.max(4, Math.hypot(transform[2], transform[3]) || Number(item.height || 10));
            return { text: item.str, x: transform[4], y: transform[5], fontSize, fontFamily: "Arial, sans-serif" };
          });
          pages.push({ width: viewport.width, height: viewport.height, items });
          setProgress(Math.round((pageNumber / pdfDocument.numPages) * 90));
        }
        if (!pages.some((page) => page.items.length)) throw new Error("No embedded text was found. Scanned image PDFs need OCR before HTML conversion.");
        downloadOutput(createStandaloneHtmlFromPdfPages(pages, { title: baseName }), mode.mimeType, `${baseName}.html`, tool.id);
      } else {
        const renderedPages = [];
        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.6 });
          if (viewport.width * viewport.height > STRUCTURED_CONVERSION_LIMITS.maxRenderedPixels) throw new Error(`Page ${pageNumber} is too large to render safely in this browser.`);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          renderedPages.push({ dataUrl: canvasToJpegDataUrl(canvas), width: viewport.width, height: viewport.height });
          setProgress(Math.round((pageNumber / pdfDocument.numPages) * 80));
        }
        const pptx = await createPptxFromRenderedPages(renderedPages, { title: baseName });
        downloadOutput(pptx, mode.mimeType, `${baseName}.pptx`, tool.id);
      }
      setProgress(100);
      setStatus("complete");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch (conversionError) {
      setStatus("idle");
      setError(friendlyPdfError(conversionError));
    }
  };

  const choose = (files) => loadFile(Array.from(files || [])[0]);
  return (
    <main className="image-conversion-page office-conversion-page structured-conversion-page">
      <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} />
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
      <section className="conversion-hero"><div><small>Available · runs in your browser</small><h1>{tool.name} online.</h1><p>{tool.shortDescription} No conversion-server upload required.</p></div></section>
      <div className="conversion-workspace-grid">
        <section>
          <div className={`conversion-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { choose(event.target.files); event.target.value = ""; }} />
            <span><Upload size={27} /></span><h2>Drop your PDF here</h2><p>Choose a valid, unencrypted PDF up to 25 MB and 100 pages.</p><button type="button" disabled={status === "reading" || status === "converting"} onClick={() => inputRef.current?.click()}>Choose a PDF</button>
          </div>
          {status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading your PDF…</div>}
          {error && <div className="conversion-error" role="alert">{error}</div>}
          {file && <div className="office-file-card"><header><FileText size={20} /><div><strong>{file.name}</strong><small>{formatBytes(file.size)} · {pageCount} page{pageCount === 1 ? "" : "s"}</small></div></header></div>}
        </section>
        <aside className="conversion-settings-card">
          <span>{mode.format} output</span><ModeIcon size={25} /><h2>{mode.heading}</h2><div className="office-mode-note"><strong>What the converter preserves</strong><p>{mode.detail}</p></div>
          <div className="conversion-summary"><Check size={18} /><span>{file ? `${pageCount} page${pageCount === 1 ? "" : "s"} ready` : "Add a PDF to continue"}</span></div>
          {status === "converting" && <div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div>}
          <button className="conversion-primary-action" type="button" disabled={!file || status === "reading" || status === "converting"} onClick={convert}>{status === "converting" ? <><LoaderCircle className="is-spinning" size={18} /> Converting {progress}%</> : <><Download size={18} /> Download {mode.extension.toUpperCase()}</>}</button>
          {status === "complete" && <p className="conversion-success">Your {mode.format} file is ready.</p>}
        </aside>
      </div>
      <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private browser processing</strong><p>The source PDF stays in your browser during conversion. Review complex tables, fonts, and layouts after downloading.</p></div></section>
      <ToolGuideContent tool={tool} />
    </main>
  );
}
