import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import Eraser from "lucide-react/dist/esm/icons/eraser.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.mjs";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { toolSeoSchemas } from "../../tools/toolSeoSchemas.js";
import { applyPermanentRedactions, PERMANENT_REDACTION_LIMITS } from "../../tools/permanentRedaction.js";
import { isUsableRedaction, normalizeRedactionRect, redactionsForPage } from "../../tools/permanentRedactionGeometry.js";
import "./redact-pdf.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function downloadBytes(bytes, name) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RedactPdfPage({ tool }) {
  const fileInputRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const previewWrapRef = useRef(null);
  const [file, setFile] = useState(null);
  const [sourceBytes, setSourceBytes] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [redactions, setRedactions] = useState([]);
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const pageRedactions = useMemo(() => redactionsForPage(redactions, pageIndex), [pageIndex, redactions]);

  useEffect(() => () => { pdf?.destroy?.(); }, [pdf]);

  const renderPage = useCallback(async () => {
    if (!pdf || !previewCanvasRef.current) return;
    const page = await pdf.getPage(pageIndex + 1);
    const baseViewport = page.getViewport({ scale: 1 });
    const targetWidth = Math.min(900, Math.max(280, previewWrapRef.current?.clientWidth || 760));
    const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
    const canvas = previewCanvasRef.current;
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    await page.render({ canvasContext: context, viewport, background: "#ffffff" }).promise;
    page.cleanup();
  }, [pageIndex, pdf]);

  useEffect(() => {
    void renderPage();
    const onResize = () => void renderPage();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPage]);

  const loadFile = async (nextFile) => {
    if (!nextFile) return;
    setError("");
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file.");
      return;
    }
    if (nextFile.size > PERMANENT_REDACTION_LIMITS.maxBytes) {
      setError(`Choose a PDF under ${formatBytes(PERMANENT_REDACTION_LIMITS.maxBytes)}.`);
      return;
    }
    setStatus("reading");
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const nextPdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      if (nextPdf.numPages > PERMANENT_REDACTION_LIMITS.maxPages) {
        await nextPdf.destroy();
        throw new Error(`Permanent redaction supports up to ${PERMANENT_REDACTION_LIMITS.maxPages} pages.`);
      }
      await pdf?.destroy?.();
      setFile(nextFile);
      setSourceBytes(bytes);
      setPdf(nextPdf);
      setPageIndex(0);
      setRedactions([]);
      setStatus("ready");
      trackProductEvent("upload_started", { toolId: tool.id });
    } catch (loadError) {
      setStatus("error");
      setError(loadError?.message || "This PDF could not be opened. Encrypted PDFs are not supported.");
    }
  };

  const pointFromEvent = (event) => {
    const rect = previewWrapRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const startMark = (event) => {
    if (status !== "ready") return;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {
      // Synthetic accessibility and cross-browser test pointers may not have an active capture target.
    }
    const start = pointFromEvent(event);
    setDraft({ start, end: start });
  };

  const moveMark = (event) => {
    if (!draft) return;
    setDraft((current) => ({ ...current, end: pointFromEvent(event) }));
  };

  const finishMark = (event) => {
    if (!draft) return;
    const rect = normalizeRedactionRect(draft.start, pointFromEvent(event));
    if (isUsableRedaction(rect)) setRedactions((items) => [...items, { ...rect, pageIndex }]);
    setDraft(null);
  };

  const apply = async () => {
    setError("");
    setStatus("working");
    setProgress(0);
    trackProductEvent("export_started", { toolId: tool.id });
    try {
      const bytes = await applyPermanentRedactions(sourceBytes, redactions, {
        onProgress: ({ completed, total }) => setProgress(Math.round((completed / total) * 100)),
      });
      const baseName = file.name.replace(/\.pdf$/i, "");
      downloadBytes(bytes, `${baseName}-redacted.pdf`);
      trackProductEvent("export_succeeded", { toolId: tool.id });
      trackProductEvent("pdf_downloaded", { toolId: tool.id });
      setStatus("complete");
    } catch (applyError) {
      setError(applyError?.message || "The redacted copy could not be created.");
      trackProductEvent("export_failed", { toolId: tool.id, errorCategory: "redaction_failed" });
      setStatus("ready");
    }
  };

  const draftRect = draft ? normalizeRedactionRect(draft.start, draft.end) : null;

  return <main className="redact-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={toolSeoSchemas(tool)} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">Redact PDF</span></nav>
    <section className="redact-hero"><div><span><ShieldCheck size={16} /> Permanent browser redaction</span><h1>Remove sensitive PDF content for good.</h1><p>Draw over private information, review every mark, then download a flattened copy with the original page content removed.</p></div><aside><LockKeyhole size={22} /><strong>Your PDF stays on this device</strong><small>No document text or file name enters analytics.</small></aside></section>

    {!file ? <section className="redact-upload" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void loadFile(event.dataTransfer.files?.[0]); }}>
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => void loadFile(event.target.files?.[0])} />
      <span><Upload size={27} /></span><h2>Choose the PDF to redact</h2><p>PDFs up to 20 MB and 50 pages. Encrypted files are not supported.</p><button type="button" onClick={() => fileInputRef.current?.click()}>Choose PDF</button>
    </section> : <section className="redact-workspace">
      <aside className="redact-sidebar"><div><FileText size={20} /><span><strong>{file.name}</strong><small>{formatBytes(file.size)} · {pdf?.numPages || 0} pages</small></span></div><ol>{Array.from({ length: pdf?.numPages || 0 }, (_, index) => <li key={index}><button type="button" className={pageIndex === index ? "is-active" : ""} onClick={() => setPageIndex(index)}><span>{index + 1}</span><strong>Page {index + 1}</strong><small>{redactionsForPage(redactions, index).length} mark{redactionsForPage(redactions, index).length === 1 ? "" : "s"}</small></button></li>)}</ol><button type="button" className="redact-new-file" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> Replace PDF</button><input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => void loadFile(event.target.files?.[0])} /></aside>
      <div className="redact-stage"><header><div><span>Page {pageIndex + 1} of {pdf?.numPages || 0}</span><strong>Drag a box over everything that must be removed</strong></div><div><button type="button" disabled={!pageRedactions.length} onClick={() => setRedactions((items) => items.filter((item) => item.pageIndex !== pageIndex))}><Trash2 size={16} /> Clear page</button><button type="button" disabled={!redactions.length} onClick={() => setRedactions((items) => items.slice(0, -1))}><RotateCcw size={16} /> Undo mark</button></div></header><div className="redact-canvas-shell"><div ref={previewWrapRef} className="redact-canvas-wrap" onPointerDown={startMark} onPointerMove={moveMark} onPointerUp={finishMark} onPointerCancel={() => setDraft(null)}><canvas ref={previewCanvasRef} />{pageRedactions.map((mark, index) => <i key={`${mark.pageIndex}-${index}`} style={{ left: `${mark.x * 100}%`, top: `${mark.y * 100}%`, width: `${mark.width * 100}%`, height: `${mark.height * 100}%` }} />)}{draftRect && <i className="is-draft" style={{ left: `${draftRect.x * 100}%`, top: `${draftRect.y * 100}%`, width: `${draftRect.width * 100}%`, height: `${draftRect.height * 100}%` }} />}</div></div></div>
      <aside className="redact-review"><Eraser size={22} /><h2>Review and apply</h2><p><strong>{redactions.length}</strong> permanent redaction mark{redactions.length === 1 ? "" : "s"} across <strong>{new Set(redactions.map((item) => item.pageIndex)).size}</strong> page{new Set(redactions.map((item) => item.pageIndex)).size === 1 ? "" : "s"}.</p><ul><li><CheckCircle2 size={16} /> All pages are rebuilt from pixels</li><li><CheckCircle2 size={16} /> Text, links, forms, layers, and metadata are discarded</li><li><CheckCircle2 size={16} /> Redacted pages cannot be searched or edited</li></ul>{error && <div className="redact-error" role="alert">{error}</div>}<button className="redact-apply" type="button" disabled={!redactions.length || status === "working"} onClick={apply}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Securing PDF… {progress}%</> : <><Download size={18} /> Apply and download</>}</button>{status === "complete" && <div className="redact-complete"><ShieldCheck size={18} /><span><strong>Redacted copy downloaded</strong><small>Open it and visually verify every page before sharing.</small></span></div>}</aside>
    </section>}
    {error && !file && <div className="redact-error" role="alert">{error}</div>}
    <section className="redact-disclosure"><h2>What “permanent” means here</h2><p>FixThatPDF does not place a removable shape over the original PDF. It renders each page to pixels, burns in every black box, and creates a new PDF without copying source content streams or metadata. This is safer for redaction but removes selectable text, forms, links, layers, and accessibility tags from the downloaded copy.</p></section>
    <ToolGuideContent tool={tool} />
  </main>;
}
