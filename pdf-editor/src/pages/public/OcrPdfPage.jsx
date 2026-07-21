import { useRef, useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileSearch from "lucide-react/dist/esm/icons/file-search.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import {
  createSearchablePdfFromOcrPages,
  enhanceOcrImageData,
  flattenOcrWords,
  isSupportedOcrLanguage,
  OCR_LANGUAGES,
  OCR_PDF_LIMITS,
  ocrRenderScaleForPage,
  ocrTextFromPages,
  summarizeOcrConfidence,
  validateOcrPdf,
} from "../../tools/ocrPdf.js";

async function loadPdfRenderer() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjs;
}

function canvasToPngBytes(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => {
    if (!blob) return reject(new Error("A page image could not be created for OCR."));
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, "image/png"));
}

function rotateCanvas(source, rotation) {
  const normalized = ((Number(rotation || 0) % 360) + 360) % 360;
  if (!normalized) return source;
  const rotated = document.createElement("canvas");
  const swapsDimensions = normalized === 90 || normalized === 270;
  rotated.width = swapsDimensions ? source.height : source.width;
  rotated.height = swapsDimensions ? source.width : source.height;
  const context = rotated.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, rotated.width, rotated.height);
  context.translate(rotated.width / 2, rotated.height / 2);
  context.rotate(normalized * Math.PI / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return rotated;
}

function preprocessCanvas(canvas, mode) {
  if (mode === "original") return canvas;
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  const source = context.getImageData(0, 0, canvas.width, canvas.height);
  const enhanced = enhanceOcrImageData(source, mode);
  context.putImageData(new ImageData(enhanced.data, enhanced.width, enhanced.height), 0, 0);
  return canvas;
}

function downloadBytes(bytes, type, name, toolId) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  if (type === "application/pdf") trackProductEvent("pdf_downloaded", { toolId });
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OcrPdfPage({ tool }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [sourceBytes, setSourceBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [language, setLanguage] = useState("eng");
  const [cleanupMode, setCleanupMode] = useState("auto");
  const [orientation, setOrientation] = useState("auto");

  const loadFile = async (nextFile) => {
    const validationError = validateOcrPdf(nextFile);
    if (validationError) { setError(validationError); return; }
    setStatus("reading"); setError(""); setResult(null);
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const pdfjs = await loadPdfRenderer();
      const documentProxy = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      if (documentProxy.numPages > OCR_PDF_LIMITS.maxPages) throw new Error(`OCR supports up to ${OCR_PDF_LIMITS.maxPages} pages per PDF.`);
      setFile(nextFile); setSourceBytes(bytes); setPageCount(documentProxy.numPages); setStatus("idle");
      await documentProxy.destroy?.();
    } catch (loadError) {
      setFile(null); setSourceBytes(null); setPageCount(0); setStatus("idle");
      setError(loadError.message || "This PDF could not be opened.");
    }
  };

  const runOcr = async () => {
    if (!file || !sourceBytes) return;
    if (!isSupportedOcrLanguage(language)) { setError("Choose a supported OCR language."); return; }
    setStatus("processing"); setStatusText("Loading the OCR engine…"); setProgress(1); setError(""); setResult(null);
    let worker;
    try {
      const [{ createWorker }, pdfjs] = await Promise.all([import("tesseract.js"), loadPdfRenderer()]);
      let activePage = 0;
      worker = await createWorker(language, undefined, { logger: (message) => {
        if (message.status === "recognizing text") {
          const completed = (activePage + Number(message.progress || 0)) / Math.max(1, pageCount);
          setProgress(Math.max(2, Math.min(96, Math.round(completed * 96))));
        }
      } });
      await worker.setParameters({ preserve_interword_spaces: "1", user_defined_dpi: "300" });
      const documentProxy = await pdfjs.getDocument({ data: sourceBytes.slice(0) }).promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
        activePage = pageNumber - 1;
        setStatusText(`Recognizing page ${pageNumber} of ${documentProxy.numPages}…`);
        const pdfPage = await documentProxy.getPage(pageNumber);
        const pageSize = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: ocrRenderScaleForPage(pageSize.width, pageSize.height) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        const manualRotation = orientation === "auto" ? 0 : Number(orientation);
        const preparedCanvas = preprocessCanvas(rotateCanvas(canvas, manualRotation), cleanupMode);
        const recognition = await worker.recognize(preparedCanvas, { rotateAuto: orientation === "auto" }, { text: true, blocks: true });
        const swapsDimensions = manualRotation === 90 || manualRotation === 270;
        pages.push({
          imageBytes: await canvasToPngBytes(preparedCanvas),
          imageWidth: preparedCanvas.width,
          imageHeight: preparedCanvas.height,
          pageWidth: swapsDimensions ? pageSize.height : pageSize.width,
          pageHeight: swapsDimensions ? pageSize.width : pageSize.height,
          words: flattenOcrWords(recognition.data),
          text: recognition.data.text || "",
        });
        pdfPage.cleanup();
      }
      await documentProxy.destroy?.();
      if (!pages.some((page) => page.words.length)) throw new Error("No readable text was found. Try a clearer or higher-resolution scan.");
      setStatusText("Building the searchable PDF…");
      const baseName = file.name.replace(/\.pdf$/i, "") || "scanned-document";
      const pdfBytes = await createSearchablePdfFromOcrPages(pages, { title: baseName });
      const text = ocrTextFromPages(pages);
      const confidence = summarizeOcrConfidence(pages);
      setResult({ pdfBytes, text, baseName, confidence }); setProgress(100); setStatus("complete");
      downloadBytes(pdfBytes, "application/pdf", `${baseName}-searchable.pdf`, tool.id);
    } catch (ocrError) {
      setStatus("idle"); setError(ocrError.message || "Text recognition could not be completed.");
    } finally {
      await worker?.terminate();
    }
  };

  const choose = (files) => loadFile(Array.from(files || [])[0]);
  return <main className="image-conversion-page office-conversion-page ocr-pdf-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
    <section className="conversion-hero"><div><small>Available · runs in your browser</small><h1>Make scanned PDFs searchable.</h1><p>Clean up scans, correct page orientation, recognize six languages, and download searchable PDF and text files.</p></div></section>
    <div className="conversion-workspace-grid"><section>
      <div className={`conversion-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { choose(event.target.files); event.target.value = ""; }} />
        <span><Upload size={27} /></span><h2>Drop a scanned PDF here</h2><p>PDFs up to 20 MB and {OCR_PDF_LIMITS.maxPages} pages.</p><button type="button" disabled={status === "reading" || status === "processing"} onClick={() => inputRef.current?.click()}>Choose a PDF</button>
      </div>
      {status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Checking your PDF…</div>}
      {error && <div className="conversion-error" role="alert">{error}</div>}
      {file && <div className="office-file-card"><header><FileSearch size={20} /><div><strong>{file.name}</strong><small>{pageCount} page{pageCount === 1 ? "" : "s"}</small></div></header></div>}
    </section><aside className="conversion-settings-card ocr-settings-card"><span>Searchable output</span><FileSearch size={25} /><h2>Recognize text on every page</h2>
      <div className="ocr-settings-grid">
        <label><span>Document language</span><select value={language} disabled={status === "processing"} onChange={(event) => setLanguage(event.target.value)}>{OCR_LANGUAGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Scan cleanup</span><select value={cleanupMode} disabled={status === "processing"} onChange={(event) => setCleanupMode(event.target.value)}><option value="auto">Auto levels</option><option value="document">High contrast</option><option value="original">Keep original</option></select></label>
        <label><span>Page orientation</span><select value={orientation} disabled={status === "processing"} onChange={(event) => setOrientation(event.target.value)}><option value="auto">Detect automatically</option><option value="0">Already upright</option><option value="90">Rotate right 90°</option><option value="180">Rotate 180°</option><option value="270">Rotate left 90°</option></select></label>
      </div>
      <div className="office-mode-note"><strong>Private local recognition</strong><p>The selected language model downloads on first use, then processes your document locally. Page cleanup, rotation, OCR, and PDF creation run on this device.</p></div><div className="conversion-summary"><Check size={18} /><span>{file ? `${pageCount} pages ready for OCR` : "Add a scanned PDF to continue"}</span></div>
      {status === "processing" && <><div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div><p className="ocr-status" aria-live="polite">{statusText}</p></>}
      <button className="conversion-primary-action" type="button" disabled={!file || status === "reading" || status === "processing"} onClick={runOcr}>{status === "processing" ? <><LoaderCircle className="is-spinning" size={18} /> OCR {progress}%</> : <><FileSearch size={18} /> Run OCR and download PDF</>}</button>
      {result && <button className="conversion-secondary-action" type="button" onClick={() => downloadBytes(new TextEncoder().encode(result.text), "text/plain", `${result.baseName}-ocr.txt`, tool.id)}><Download size={17} /> Download recognized TXT</button>}
      {status === "complete" && result && <div className={`ocr-quality-result ${result.confidence.averageConfidence < 75 ? "needs-review" : ""}`} role="status"><strong>{result.confidence.rating} · {result.confidence.averageConfidence}% confidence</strong><span>{result.confidence.wordCount} words recognized · {result.confidence.lowConfidenceWords} need review</span></div>}
    </aside></div>
    <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private browser processing</strong><p>Pages are recognized on this device. Check important names and numbers because OCR accuracy depends on scan quality.</p></div></section>
  </main>;
}
