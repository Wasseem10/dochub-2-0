import { useEffect, useRef, useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileDiff from "lucide-react/dist/esm/icons/file-diff.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { compareRgbaImages, compareTextStrings, createComparisonPdfReport, PDF_COMPARISON_LIMITS, validateComparisonPdf } from "../../tools/pdfComparison.js";
import "./compare-pdf.css";

async function loadPdfRenderer() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjs;
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => blob ? resolve(new Uint8Array(await blob.arrayBuffer())) : reject(new Error("A comparison preview could not be created.")), "image/png"));
}

function downloadPdf(bytes, name, toolId) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  trackProductEvent("pdf_downloaded", { toolId });
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function renderComparablePage(documentProxy, pageNumber, targetWidth, targetHeight) {
  if (!documentProxy || pageNumber > documentProxy.numPages) return null;
  const page = await documentProxy.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: targetWidth / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth; canvas.height = targetHeight;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff"; context.fillRect(0, 0, targetWidth, targetHeight);
  const renderCanvas = document.createElement("canvas"); renderCanvas.width = Math.ceil(viewport.width); renderCanvas.height = Math.ceil(viewport.height);
  const renderContext = renderCanvas.getContext("2d", { alpha: false }); renderContext.fillStyle = "#ffffff"; renderContext.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
  await page.render({ canvasContext: renderContext, viewport, background: "#ffffff" }).promise;
  context.drawImage(renderCanvas, 0, 0);
  const content = await page.getTextContent();
  const text = content.items.map((item) => item.str).join(" ");
  page.cleanup();
  return { canvas, text, png: await canvasToPng(canvas), imageData: context.getImageData(0, 0, targetWidth, targetHeight).data };
}

function ComparisonFileCard({ label, record, inputRef, onFile, disabled }) {
  return <div className={`comparison-file-card ${record ? "has-file" : ""}`}>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = ""; }} />
    <span>{record ? <FileText size={24} /> : <Upload size={24} />}</span><small>{label}</small><strong>{record?.file.name || "Choose a PDF"}</strong><p>{record ? `${record.pdf.numPages} pages` : "PDF up to 25 MB and 75 pages"}</p>
    <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>{record ? "Replace PDF" : "Choose PDF"}</button>
  </div>;
}

export function ComparePdfPage({ tool }) {
  const firstInput = useRef(null); const secondInput = useRef(null);
  const firstRecordRef = useRef(null); const secondRecordRef = useRef(null);
  const [first, setFirst] = useState(null); const [second, setSecond] = useState(null);
  const [results, setResults] = useState([]); const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0); const [error, setError] = useState("");
  useEffect(() => () => { firstRecordRef.current?.pdf.destroy?.(); secondRecordRef.current?.pdf.destroy?.(); }, []);

  const loadFile = async (file, setter, previous) => {
    const validationError = validateComparisonPdf(file);
    if (validationError) { setError(validationError); return; }
    setError(""); setStatus("reading"); setResults([]);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfjs = await loadPdfRenderer();
      const pdf = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      if (pdf.numPages > PDF_COMPARISON_LIMITS.maxPages) { await pdf.destroy?.(); throw new Error(`Comparison supports up to ${PDF_COMPARISON_LIMITS.maxPages} pages per PDF.`); }
      await previous?.pdf.destroy?.();
      const record = { file, bytes, pdf };
      if (setter === setFirst) firstRecordRef.current = record; else secondRecordRef.current = record;
      setter(record); setStatus("idle");
    } catch (loadError) { setStatus("idle"); setError(loadError.message || "This PDF could not be opened. Encrypted PDFs are not supported."); }
  };

  const compare = async () => {
    if (!first || !second) return;
    setStatus("comparing"); setProgress(0); setError(""); setResults([]);
    try {
      const total = Math.max(first.pdf.numPages, second.pdf.numPages);
      const next = [];
      for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
        const firstPage = pageNumber <= first.pdf.numPages ? await first.pdf.getPage(pageNumber) : null;
        const secondPage = pageNumber <= second.pdf.numPages ? await second.pdf.getPage(pageNumber) : null;
        const firstBase = firstPage?.getViewport({ scale: 1 }); const secondBase = secondPage?.getViewport({ scale: 1 });
        firstPage?.cleanup(); secondPage?.cleanup();
        const targetWidth = PDF_COMPARISON_LIMITS.renderWidth;
        const targetHeight = Math.max(1, Math.ceil(Math.max(firstBase?.height / firstBase?.width || 0, secondBase?.height / secondBase?.width || 0, 1) * targetWidth));
        const [left, right] = await Promise.all([renderComparablePage(first.pdf, pageNumber, targetWidth, targetHeight), renderComparablePage(second.pdf, pageNumber, targetWidth, targetHeight)]);
        const blank = new Uint8ClampedArray(targetWidth * targetHeight * 4).fill(255);
        const visual = compareRgbaImages(left?.imageData || blank, right?.imageData || blank, targetWidth, targetHeight);
        const text = compareTextStrings(left?.text, right?.text);
        const statusLabel = !left ? "Added page" : !right ? "Removed page" : visual.rects.length || text.changed ? "Changed" : "Unchanged";
        next.push({ pageNumber, statusLabel, similarity: visual.similarity, rects: visual.rects, textAdded: text.added, textRemoved: text.removed, firstPng: left?.png, secondPng: right?.png, firstPreview: left ? URL.createObjectURL(new Blob([left.png], { type: "image/png" })) : "", secondPreview: right ? URL.createObjectURL(new Blob([right.png], { type: "image/png" })) : "" });
        setProgress(Math.round(pageNumber / total * 100));
      }
      setResults(next); setStatus("complete");
    } catch (compareError) { setStatus("idle"); setError(compareError.message || "The PDFs could not be compared."); }
  };

  useEffect(() => () => results.forEach((result) => { if (result.firstPreview) URL.revokeObjectURL(result.firstPreview); if (result.secondPreview) URL.revokeObjectURL(result.secondPreview); }), [results]);
  const changed = results.filter((result) => result.statusLabel !== "Unchanged").length;
  const download = async () => {
    setStatus("exporting"); setError("");
    try { const bytes = await createComparisonPdfReport(results, { firstName: first.file.name, secondName: second.file.name }); downloadPdf(bytes, `${second.file.name.replace(/\.pdf$/i, "")}-comparison.pdf`, tool.id); setStatus("complete"); }
    catch (downloadError) { setError(downloadError.message || "The comparison report could not be created."); setStatus("complete"); }
  };

  return <main className="image-conversion-page comparison-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
    <section className="conversion-hero"><div><small>Available · private browser comparison</small><h1>{tool.id === "document-version-comparison" ? "Compare document versions." : "Compare two PDFs."}</h1><p>See visual and text changes page by page, then download a marked comparison report.</p></div></section>
    <section className="comparison-upload-grid"><ComparisonFileCard label="Original document" record={first} inputRef={firstInput} onFile={(file) => loadFile(file, setFirst, first)} disabled={status === "comparing"} /><ComparisonFileCard label="Revised document" record={second} inputRef={secondInput} onFile={(file) => loadFile(file, setSecond, second)} disabled={status === "comparing"} /></section>
    {error && <div className="conversion-error" role="alert">{error}</div>}
    <section className="comparison-action-card"><FileDiff size={25} /><div><strong>{first && second ? "Both PDFs are ready" : "Add an original and revised PDF"}</strong><small>{first && second ? `${Math.max(first.pdf.numPages, second.pdf.numPages)} page positions will be checked` : "Your files stay on this device"}</small></div><button type="button" disabled={!first || !second || status === "comparing" || status === "exporting"} onClick={compare}>{status === "comparing" ? <><LoaderCircle className="is-spinning" size={18} /> Comparing {progress}%</> : "Compare PDFs"}</button></section>
    {results.length > 0 && <section className="comparison-results"><header><div><small>Comparison complete</small><h2>{changed} of {results.length} pages changed</h2><p>Red boxes show tiles with visual differences. Word counts show text added or removed.</p></div><button type="button" disabled={status === "exporting"} onClick={download}>{status === "exporting" ? <LoaderCircle className="is-spinning" size={18} /> : <Download size={18} />} Download report PDF</button></header><div className="comparison-page-list">{results.map((result) => <article key={result.pageNumber}><div className="comparison-page-summary"><span>Page {result.pageNumber}</span><strong className={`comparison-status is-${result.statusLabel.toLowerCase().replace(" ", "-")}`}>{result.statusLabel}</strong><small>{result.similarity.toFixed(1)}% similar · +{result.textAdded} / -{result.textRemoved} words</small></div><div className="comparison-previews"><figure>{result.firstPreview ? <div><img src={result.firstPreview} alt={`Original page ${result.pageNumber}`} />{result.rects.map((rect, index) => <i key={index} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }} />)}</div> : <div className="comparison-missing">Not present</div>}<figcaption>Original</figcaption></figure><figure>{result.secondPreview ? <div><img src={result.secondPreview} alt={`Revised page ${result.pageNumber}`} />{result.rects.map((rect, index) => <i key={index} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }} />)}</div> : <div className="comparison-missing">Not present</div>}<figcaption>Revised</figcaption></figure></div></article>)}</div></section>}
    <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private, reviewable comparison</strong><p>Both PDFs are rendered and compared locally. Review highlighted regions because font substitution, scans, and anti-aliasing can create small visual differences.</p></div></section>
  </main>;
}
