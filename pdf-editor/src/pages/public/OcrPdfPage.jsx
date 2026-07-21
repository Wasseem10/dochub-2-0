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
import { createSearchablePdfFromOcrPages, flattenOcrWords, OCR_PDF_LIMITS, ocrTextFromPages, validateOcrPdf } from "../../tools/ocrPdf.js";

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
    setStatus("processing"); setStatusText("Loading the OCR engine…"); setProgress(1); setError(""); setResult(null);
    let worker;
    try {
      const [{ createWorker }, pdfjs] = await Promise.all([import("tesseract.js"), loadPdfRenderer()]);
      let activePage = 0;
      worker = await createWorker("eng", undefined, { logger: (message) => {
        if (message.status === "recognizing text") {
          const completed = (activePage + Number(message.progress || 0)) / Math.max(1, pageCount);
          setProgress(Math.max(2, Math.min(96, Math.round(completed * 96))));
        }
      } });
      const documentProxy = await pdfjs.getDocument({ data: sourceBytes.slice(0) }).promise;
      const pages = [];
      for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
        activePage = pageNumber - 1;
        setStatusText(`Recognizing page ${pageNumber} of ${documentProxy.numPages}…`);
        const pdfPage = await documentProxy.getPage(pageNumber);
        const viewport = pdfPage.getViewport({ scale: OCR_PDF_LIMITS.renderScale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        const recognition = await worker.recognize(canvas, { rotateAuto: true }, { text: true, blocks: true });
        pages.push({ imageBytes: await canvasToPngBytes(canvas), imageWidth: canvas.width, imageHeight: canvas.height, words: flattenOcrWords(recognition.data), text: recognition.data.text || "" });
        pdfPage.cleanup();
      }
      await documentProxy.destroy?.();
      if (!pages.some((page) => page.words.length)) throw new Error("No readable text was found. Try a clearer or higher-resolution scan.");
      setStatusText("Building the searchable PDF…");
      const baseName = file.name.replace(/\.pdf$/i, "") || "scanned-document";
      const pdfBytes = await createSearchablePdfFromOcrPages(pages, { title: baseName });
      const text = ocrTextFromPages(pages);
      setResult({ pdfBytes, text, baseName }); setProgress(100); setStatus("complete");
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
    <section className="conversion-hero"><div><small>Available · runs in your browser</small><h1>Make scanned PDFs searchable.</h1><p>Recognize English text on image-only pages, download a searchable PDF, and save the extracted text.</p></div></section>
    <div className="conversion-workspace-grid"><section>
      <div className={`conversion-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { choose(event.target.files); event.target.value = ""; }} />
        <span><Upload size={27} /></span><h2>Drop a scanned PDF here</h2><p>English PDFs up to 12 MB and {OCR_PDF_LIMITS.maxPages} pages.</p><button type="button" disabled={status === "reading" || status === "processing"} onClick={() => inputRef.current?.click()}>Choose a PDF</button>
      </div>
      {status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Checking your PDF…</div>}
      {error && <div className="conversion-error" role="alert">{error}</div>}
      {file && <div className="office-file-card"><header><FileSearch size={20} /><div><strong>{file.name}</strong><small>{pageCount} page{pageCount === 1 ? "" : "s"}</small></div></header></div>}
    </section><aside className="conversion-settings-card"><span>Searchable output</span><FileSearch size={25} /><h2>Recognize text on every page</h2><div className="office-mode-note"><strong>First run may take longer</strong><p>The OCR engine downloads its English recognition model, then processes your document locally. Your PDF is not sent to a conversion server.</p></div><div className="conversion-summary"><Check size={18} /><span>{file ? `${pageCount} pages ready for OCR` : "Add a scanned PDF to continue"}</span></div>
      {status === "processing" && <><div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div><p className="ocr-status" aria-live="polite">{statusText}</p></>}
      <button className="conversion-primary-action" type="button" disabled={!file || status === "reading" || status === "processing"} onClick={runOcr}>{status === "processing" ? <><LoaderCircle className="is-spinning" size={18} /> OCR {progress}%</> : <><FileSearch size={18} /> Run OCR and download PDF</>}</button>
      {result && <button className="conversion-secondary-action" type="button" onClick={() => downloadBytes(new TextEncoder().encode(result.text), "text/plain", `${result.baseName}-ocr.txt`, tool.id)}><Download size={17} /> Download recognized TXT</button>}
      {status === "complete" && <p className="conversion-success">Your searchable PDF is ready.</p>}
    </aside></div>
    <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private browser processing</strong><p>Pages are recognized on this device. Check important names and numbers because OCR accuracy depends on scan quality.</p></div></section>
  </main>;
}
