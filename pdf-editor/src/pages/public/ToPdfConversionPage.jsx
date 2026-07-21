import { useRef, useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Code2 from "lucide-react/dist/esm/icons/code-2.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileSpreadsheet from "lucide-react/dist/esm/icons/file-spreadsheet.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Presentation from "lucide-react/dist/esm/icons/presentation.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { Link } from "react-router-dom";
import { beginToolOperation, pageCountBucket, trackProductEvent, trackToolUpload, trackUploadValidationFailure } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { toolSeoSchemas } from "../../tools/toolSeoSchemas.js";
import { createPdfFromRenderedDocxPages } from "../../tools/officeConversion.js";
import {
  createPdfFromPresentation,
  createPdfFromWorkbook,
  parsePptxPresentation,
  parseXlsxWorkbook,
  sanitizeHtmlForRendering,
  validateToPdfFile,
} from "../../tools/toPdfConversion.js";

const MODES = Object.freeze({
  "excel-to-pdf": {
    kind: "excel",
    label: "Excel",
    accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx",
    extension: ".xlsx",
    icon: FileSpreadsheet,
    heading: "Turn every worksheet into readable PDF pages",
    detail: "Rows and columns are paginated into landscape tables. Wide sheets continue across clearly labeled page sections.",
  },
  "powerpoint-to-pdf": {
    kind: "powerpoint",
    label: "PowerPoint",
    accept: "application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx",
    extension: ".pptx",
    icon: Presentation,
    heading: "Keep your slides in presentation order",
    detail: "FixThatPDF rebuilds common text boxes, fills, shapes, and PNG or JPEG images on proportionally sized PDF pages.",
  },
  "html-to-pdf": {
    kind: "html",
    label: "HTML",
    accept: "text/html,application/xhtml+xml,.html,.htm",
    extension: ".html",
    icon: Code2,
    heading: "Render safe HTML into searchable PDF pages",
    detail: "Scripts, forms, frames, and remote resources are removed before rendering. Visible local text is added as a searchable PDF layer.",
  },
});

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadPdf(bytes, name, toolId) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  trackProductEvent("result_downloaded", { toolId });
  trackProductEvent("pdf_downloaded", { toolId });
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToPngBytes(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => {
    if (!blob) return reject(new Error("A printable page image could not be created."));
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, "image/png"));
}

function collectTextItems(root) {
  const rootBounds = root.getBoundingClientRect();
  const walker = root.ownerDocument.createTreeWalker(root, window.NodeFilter.SHOW_TEXT);
  const result = [];
  let node = walker.nextNode();
  while (node) {
    const value = node.nodeValue || "";
    for (const match of value.matchAll(/\S+/g)) {
      const range = root.ownerDocument.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = range.getBoundingClientRect();
      const style = root.ownerDocument.defaultView.getComputedStyle(node.parentElement);
      if (rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none") result.push({
        text: match[0],
        left: rect.left - rootBounds.left,
        top: rect.top - rootBounds.top,
        width: rect.width,
        height: rect.height,
        color: style.color,
        fontFamily: style.fontFamily,
        fontSize: Number.parseFloat(style.fontSize) || rect.height,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
      });
      range.detach();
    }
    node = walker.nextNode();
  }
  return { width: Math.max(1, rootBounds.width), items: result };
}

function drawHtmlSnapshot(root, contentHeight, scale) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(816 * scale);
  canvas.height = Math.round(contentHeight * scale);
  const context = canvas.getContext("2d");
  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 816, contentHeight);
  const rootBounds = root.getBoundingClientRect();
  root.querySelectorAll("*").forEach((element) => {
    const style = root.ownerDocument.defaultView.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return;
    const rect = element.getBoundingClientRect();
    const x = rect.left - rootBounds.left;
    const y = rect.top - rootBounds.top;
    if (rect.width <= 0 || rect.height <= 0 || y > contentHeight || y + rect.height < 0) return;
    if (style.backgroundColor && style.backgroundColor !== "transparent" && !style.backgroundColor.endsWith(", 0)")) {
      context.fillStyle = style.backgroundColor;
      context.fillRect(x, y, rect.width, rect.height);
    }
    const borderWidth = Number.parseFloat(style.borderTopWidth) || 0;
    if (borderWidth > 0 && style.borderTopStyle !== "none") {
      context.strokeStyle = style.borderTopColor || "#000000";
      context.lineWidth = borderWidth;
      context.strokeRect(x, y, rect.width, rect.height);
    }
  });
  const text = collectTextItems(root);
  text.items.forEach((item) => {
    context.fillStyle = item.color || "#111827";
    context.font = `${item.fontStyle || "normal"} ${item.fontWeight || "400"} ${item.fontSize}px ${item.fontFamily || "sans-serif"}`;
    context.textBaseline = "alphabetic";
    context.fillText(item.text, item.left, item.top + Math.min(item.height, item.fontSize * 0.92));
  });
  return { canvas, text };
}

async function renderHtmlPages(iframe, setProgress) {
  const documentNode = iframe?.contentDocument;
  const root = documentNode?.body;
  if (!root) throw new Error("The safe HTML preview is not ready yet.");
  if (documentNode.fonts?.ready) {
    await Promise.race([
      documentNode.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ]);
  }
  const contentHeight = Math.max(1056, documentNode.documentElement.scrollHeight, root.scrollHeight);
  iframe.style.height = `${contentHeight}px`;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const scale = 1.25;
  const pageHeightCss = 1056;
  if (contentHeight > pageHeightCss * 50) throw new Error("HTML conversion supports up to 50 rendered pages.");
  const { canvas, text } = drawHtmlSnapshot(root, contentHeight, scale);
  const pageHeightPixels = Math.round(pageHeightCss * scale);
  const pageCount = Math.ceil(contentHeight / pageHeightCss);
  const pages = [];
  for (let index = 0; index < pageCount; index += 1) {
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightPixels;
    const context = pageCanvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    const sourceHeight = Math.min(pageHeightPixels, canvas.height - index * pageHeightPixels);
    context.drawImage(canvas, 0, index * pageHeightPixels, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
    const pageTop = index * pageHeightCss;
    const textItems = text.items.filter((item) => item.top + item.height >= pageTop && item.top < pageTop + pageHeightCss).map((item) => ({
      text: item.text,
      x: Math.max(0, Math.min(1, item.left / text.width)),
      y: Math.max(0, Math.min(1, (item.top - pageTop) / pageHeightCss)),
      w: Math.max(0, Math.min(1, item.width / text.width)),
      h: Math.max(0, Math.min(1, item.height / pageHeightCss)),
    }));
    pages.push({ bytes: await canvasToPngBytes(pageCanvas), textItems });
    setProgress(Math.round(20 + ((index + 1) / pageCount) * 65));
  }
  return pages;
}

export function ToPdfConversionPage({ tool }) {
  const mode = MODES[tool.id];
  const inputRef = useRef(null);
  const iframeRef = useRef(null);
  const [file, setFile] = useState(null);
  const [prepared, setPrepared] = useState(null);
  const [safeHtml, setSafeHtml] = useState("");
  const [htmlReady, setHtmlReady] = useState(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const ModeIcon = mode.icon;

  const loadFile = async (nextFile) => {
    const validationError = validateToPdfFile(nextFile, mode.kind);
    if (validationError) { trackUploadValidationFailure(tool.id, `invalid_${mode.kind}`); setError(validationError); return; }
    setStatus("reading");
    setError("");
    setPrepared(null);
    setSafeHtml("");
    setHtmlReady(false);
    try {
      const buffer = await nextFile.arrayBuffer();
      if (mode.kind === "excel") setPrepared(parseXlsxWorkbook(buffer));
      else if (mode.kind === "powerpoint") setPrepared(parsePptxPresentation(buffer));
      else {
        const source = new TextDecoder().decode(buffer);
        if (!source.trim()) throw new Error("This HTML file does not contain any content.");
        setSafeHtml(sanitizeHtmlForRendering(source));
        setPrepared({ sourceLength: source.length });
      }
      trackToolUpload(tool.id, nextFile);
      setFile(nextFile);
      setStatus("idle");
    } catch (loadError) {
      trackUploadValidationFailure(tool.id, `invalid_${mode.kind}`);
      setFile(null);
      setPrepared(null);
      setStatus("idle");
      setError(loadError.message || `This ${mode.label} file could not be read.`);
    }
  };

  const convert = async () => {
    if (!file || !prepared) return;
    setStatus("converting");
    setProgress(5);
    setError("");
    const operation = beginToolOperation(tool.id, { operation: "convert", slowAfterMs: 15000 });
    try {
      const baseName = file.name.replace(/\.(xlsx|pptx|html?|xhtml)$/i, "") || "fixthatpdf-document";
      let bytes;
      let outputPageCount = 1;
      if (mode.kind === "excel") {
        bytes = await createPdfFromWorkbook(prepared, { title: baseName });
        outputPageCount = prepared.sheets.length;
        setProgress(92);
      } else if (mode.kind === "powerpoint") {
        bytes = await createPdfFromPresentation(prepared, { title: baseName });
        outputPageCount = prepared.slides.length;
        setProgress(92);
      } else {
        if (!htmlReady) throw new Error("The safe HTML preview is still loading. Try again in a moment.");
        const pages = await renderHtmlPages(iframeRef.current, setProgress);
        outputPageCount = pages.length;
        bytes = await createPdfFromRenderedDocxPages(pages, { title: baseName });
      }
      setProgress(100);
      downloadPdf(bytes, `${baseName}.pdf`, tool.id);
      operation.succeed({ pageCountBucket: pageCountBucket(outputPageCount) });
      setStatus("complete");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch (conversionError) {
      operation.fail("conversion_failed");
      setStatus("idle");
      setError(conversionError.message || "The PDF could not be created.");
    }
  };

  const choose = (files) => loadFile(Array.from(files || [])[0]);
  const summary = mode.kind === "excel" && prepared ? `${prepared.sheets.length} worksheet${prepared.sheets.length === 1 ? "" : "s"}`
    : mode.kind === "powerpoint" && prepared ? `${prepared.slides.length} slide${prepared.slides.length === 1 ? "" : "s"}`
      : mode.kind === "html" && prepared ? "Safe HTML preview ready" : "";

  return (
    <main className="image-conversion-page office-conversion-page to-pdf-conversion-page">
      <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={toolSeoSchemas(tool)} />
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
      <section className="conversion-hero"><div><small>Available · runs in your browser</small><h1>{tool.name} online.</h1><p>{tool.shortDescription} No conversion-server upload required.</p></div></section>
      <div className="conversion-workspace-grid">
        <section>
          <div className={`conversion-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}>
            <input ref={inputRef} type="file" accept={mode.accept} onChange={(event) => { choose(event.target.files); event.target.value = ""; }} />
            <span><Upload size={27} /></span><h2>Drop your {mode.label} file here</h2><p>Choose a {mode.extension} file up to 20 MB.</p><button type="button" disabled={status === "reading" || status === "converting"} onClick={() => inputRef.current?.click()}>Choose a file</button>
          </div>
          {status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading your {mode.label} file…</div>}
          {error && <div className="conversion-error" role="alert">{error}</div>}
          {file && <div className="office-file-card"><header><FileText size={20} /><div><strong>{file.name}</strong><small>{formatBytes(file.size)} · {summary}</small></div></header></div>}
          {safeHtml && <div className="safe-html-render-host" aria-hidden="true"><iframe ref={iframeRef} title="Safe HTML rendering surface" sandbox="allow-same-origin" srcDoc={safeHtml} onLoad={() => setHtmlReady(true)} /></div>}
        </section>
        <aside className="conversion-settings-card">
          <span>PDF output</span><ModeIcon size={25} /><h2>{mode.heading}</h2><div className="office-mode-note"><strong>What the converter preserves</strong><p>{mode.detail}</p></div>
          <div className="conversion-summary"><Check size={18} /><span>{file ? summary : `Add a ${mode.extension} file to continue`}</span></div>
          {status === "converting" && <div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div>}
          <button className="conversion-primary-action" type="button" disabled={!file || !prepared || (mode.kind === "html" && !htmlReady) || status === "reading" || status === "converting"} onClick={convert}>{status === "converting" ? <><LoaderCircle className="is-spinning" size={18} /> Converting {progress}%</> : <><Download size={18} /> Download PDF</>}</button>
          {status === "complete" && <p className="conversion-success">Your PDF is ready.</p>}
        </aside>
      </div>
      <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private browser processing</strong><p>The source file stays in your browser. Review complex formulas, slide effects, fonts, and page breaks after downloading.</p></div></section>
      <ToolGuideContent tool={tool} />
    </main>
  );
}
