import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import {
  createDocxFromPdfPages,
  createPdfFromRenderedDocxPages,
  groupPdfTextItems,
  OFFICE_CONVERSION_LIMITS,
  validateOfficeConversionFile,
} from "../../tools/officeConversion.js";

async function loadPdfRenderer() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjsLib;
}

function downloadBytes(bytes, type, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToPngBytes(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => {
    if (!blob) {
      reject(new Error("A page image could not be created."));
      return;
    }
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, "image/png"));
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function collectRenderedTextItems(pageElement) {
  const pageBounds = pageElement.getBoundingClientRect();
  if (!pageBounds.width || !pageBounds.height) return [];
  const walker = document.createTreeWalker(pageElement, window.NodeFilter.SHOW_TEXT);
  const textItems = [];
  let node = walker.nextNode();
  while (node) {
    const value = node.nodeValue || "";
    for (const match of value.matchAll(/\S+/g)) {
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        textItems.push({
          text: match[0],
          x: Math.max(0, Math.min(1, (rect.left - pageBounds.left) / pageBounds.width)),
          y: Math.max(0, Math.min(1, (rect.top - pageBounds.top) / pageBounds.height)),
          w: Math.max(0, Math.min(1, rect.width / pageBounds.width)),
          h: Math.max(0, Math.min(1, rect.height / pageBounds.height)),
        });
      }
      range.detach();
    }
    node = walker.nextNode();
  }
  return textItems;
}

function friendlyPdfError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (error?.name === "PasswordException" || message.includes("password")) return "This PDF is encrypted. Remove its password with an authorized tool, then try again.";
  if (message.includes("invalid pdf") || message.includes("missing pdf")) return "This PDF appears corrupted or incomplete. Try downloading a fresh copy.";
  if (message.includes("supports up to")) return error.message;
  return "FixThatPDF could not read this PDF. Try a valid, unencrypted PDF under 20 MB.";
}

function ConversionDropzone({ accept, label, hint, onFile, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const choose = (files) => onFile(Array.from(files || [])[0]);
  return (
    <div
      className={`conversion-dropzone ${dragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={(event) => { choose(event.target.files); event.target.value = ""; }} />
      <span><Upload size={27} /></span>
      <h2>{label}</h2>
      <p>{hint}</p>
      <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>Choose a file</button>
    </div>
  );
}

function PdfToWordWorkspace() {
  const [file, setFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pages, setPages] = useState([]);
  const [mode, setMode] = useState("editable");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const previewUrlsRef = useRef([]);

  useEffect(() => () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const loadPdf = async (nextFile) => {
    if (!nextFile) return;
    const validationError = validateOfficeConversionFile(nextFile, "pdf");
    if (validationError) { setError(validationError); return; }
    setStatus("reading");
    setProgress(0);
    setError("");
    try {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
      const pdfjsLib = await loadPdfRenderer();
      const documentProxy = await pdfjsLib.getDocument({ data: (await nextFile.arrayBuffer()).slice(0) }).promise;
      if (documentProxy.numPages > OFFICE_CONVERSION_LIMITS.maxPages) throw new Error(`PDF to Word supports up to ${OFFICE_CONVERSION_LIMITS.maxPages} pages.`);
      const pageRecords = [];
      for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
        const page = await documentProxy.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const sourceViewport = page.getViewport({ scale: 1 });
        const previewViewport = page.getViewport({ scale: 0.32 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(previewViewport.width));
        canvas.height = Math.max(1, Math.round(previewViewport.height));
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: previewViewport }).promise;
        const previewBytes = await canvasToPngBytes(canvas);
        const previewUrl = URL.createObjectURL(new Blob([previewBytes], { type: "image/png" }));
        previewUrlsRef.current.push(previewUrl);
        pageRecords.push({
          pageNumber,
          lines: groupPdfTextItems(textContent.items, textContent.styles),
          previewUrl,
          width: previewViewport.width,
          height: previewViewport.height,
          pageWidth: sourceViewport.width,
          pageHeight: sourceViewport.height,
        });
        setProgress(Math.round((pageNumber / documentProxy.numPages) * 100));
      }
      setFile(nextFile);
      setPdfDocument(documentProxy);
      setPages(pageRecords);
      setStatus("idle");
    } catch (loadError) {
      setFile(null);
      setPdfDocument(null);
      setPages([]);
      setStatus("idle");
      setError(friendlyPdfError(loadError));
    }
  };

  const convert = async () => {
    if (!pdfDocument || !pages.length) return;
    const textLineCount = pages.reduce((total, page) => total + page.lines.length, 0);
    if (mode === "editable" && !textLineCount) {
      setError("No selectable text was found. Use Visual fidelity for this scanned PDF, or run OCR first.");
      return;
    }
    setStatus("converting");
    setProgress(0);
    setError("");
    try {
      let conversionPages = pages;
      if (mode === "visual") {
        conversionPages = [];
        for (let index = 0; index < pages.length; index += 1) {
          const page = await pdfDocument.getPage(index + 1);
          const viewport = page.getViewport({ scale: 1.45 });
          if (viewport.width * viewport.height > OFFICE_CONVERSION_LIMITS.maxRenderedPixels) throw new Error(`Page ${index + 1} is too large to render safely in this browser.`);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(viewport.width));
          canvas.height = Math.max(1, Math.round(viewport.height));
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          conversionPages.push({ ...pages[index], imageBytes: await canvasToPngBytes(canvas), width: viewport.width, height: viewport.height });
          setProgress(Math.round(((index + 1) / pages.length) * 75));
        }
      }
      const bytes = await createDocxFromPdfPages(conversionPages, { mode, title: file.name.replace(/\.pdf$/i, "") });
      setProgress(100);
      downloadBytes(bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", `${file.name.replace(/\.pdf$/i, "") || "fixthatpdf-document"}.docx`);
      setStatus("complete");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch (conversionError) {
      setStatus("idle");
      setError(conversionError.message || "The Word document could not be created.");
    }
  };

  const textLineCount = pages.reduce((total, page) => total + page.lines.length, 0);
  return (
    <div className="conversion-workspace-grid">
      <section>
        <ConversionDropzone accept="application/pdf,.pdf" label="Drop your PDF here" hint="Choose an unencrypted PDF up to 20 MB and 50 pages." onFile={loadPdf} disabled={status === "reading" || status === "converting"} />
        {status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading pages... {progress}%</div>}
        {error && <div className="conversion-error" role="alert">{error}</div>}
        {pages.length > 0 && <div className="office-file-card">
          <header><FileText size={20} /><div><strong>{file.name}</strong><small>{pages.length} page{pages.length === 1 ? "" : "s"} · {formatBytes(file.size)} · {textLineCount} text lines found</small></div></header>
          <div className="office-page-strip">{pages.map((page) => <figure key={page.pageNumber}><img src={page.previewUrl} alt={`Page ${page.pageNumber}`} /><figcaption>Page {page.pageNumber}</figcaption></figure>)}</div>
        </div>}
      </section>
      <aside className="conversion-settings-card">
        <span>Word settings</span>
        <h2>Choose the result</h2>
        <label>Conversion mode<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="editable">Editable text</option><option value="visual">Visual fidelity</option></select></label>
        <div className="office-mode-note"><strong>{mode === "editable" ? "Best for editing" : "Best for appearance"}</strong><p>{mode === "editable" ? "Rebuilds selectable text with page breaks, indentation, vertical spacing, common font styling, and heading detection." : "Places each PDF page into Word as a high-quality image so the original page appearance stays intact."}</p></div>
        <div className="conversion-summary"><Check size={18} /><span>{pages.length ? `${pages.length} page${pages.length === 1 ? "" : "s"} ready` : "Add a PDF to continue"}</span></div>
        {status === "converting" && <div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div>}
        <button className="conversion-primary-action" type="button" disabled={!pages.length || status === "reading" || status === "converting"} onClick={convert}>{status === "converting" ? <><LoaderCircle className="is-spinning" size={18} /> Converting {progress}%</> : <><Download size={18} /> Download DOCX</>}</button>
        {status === "complete" && <p className="conversion-success">Your Word document is ready.</p>}
      </aside>
    </div>
  );
}

function WordToPdfWorkspace() {
  const [file, setFile] = useState(null);
  const [buffer, setBuffer] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [searchableWordCount, setSearchableWordCount] = useState(0);
  const renderHostRef = useRef(null);

  const loadDocx = async (nextFile) => {
    if (!nextFile) return;
    const validationError = validateOfficeConversionFile(nextFile, "docx");
    if (validationError) { setError(validationError); return; }
    setStatus("reading");
    setSearchableWordCount(0);
    setError("");
    try {
      setBuffer(await nextFile.arrayBuffer());
      setFile(nextFile);
      setStatus("idle");
    } catch {
      setStatus("idle");
      setError("This DOCX file could not be read. Try opening and resaving it in Word or LibreOffice.");
    }
  };

  const convert = async () => {
    if (!buffer || !renderHostRef.current) return;
    setStatus("converting");
    setProgress(4);
    setError("");
    const host = renderHostRef.current;
    host.replaceChildren();
    try {
      const [{ renderAsync }, html2canvasModule] = await Promise.all([import("docx-preview"), import("html2canvas")]);
      await renderAsync(buffer.slice(0), host, undefined, {
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        useBase64URL: true,
      });
      await document.fonts?.ready;
      const pageElements = [...host.querySelectorAll("section.docx")];
      if (!pageElements.length) throw new Error("No printable pages were found in this DOCX file.");
      if (pageElements.length > OFFICE_CONVERSION_LIMITS.maxPages) throw new Error(`Word to PDF supports up to ${OFFICE_CONVERSION_LIMITS.maxPages} rendered pages.`);
      const html2canvas = html2canvasModule.default;
      const renderedPages = [];
      for (let index = 0; index < pageElements.length; index += 1) {
        const pageCanvas = await html2canvas(pageElements[index], { scale: 1.5, backgroundColor: "#ffffff", useCORS: true, logging: false });
        if (pageCanvas.width * pageCanvas.height > OFFICE_CONVERSION_LIMITS.maxRenderedPixels) throw new Error(`Page ${index + 1} is too large to convert safely in this browser.`);
        const textItems = collectRenderedTextItems(pageElements[index]);
        renderedPages.push({ bytes: await canvasToPngBytes(pageCanvas), textItems });
        setProgress(Math.round(10 + ((index + 1) / pageElements.length) * 80));
      }
      const bytes = await createPdfFromRenderedDocxPages(renderedPages, { title: file.name.replace(/\.docx$/i, "") });
      setSearchableWordCount(renderedPages.reduce((total, page) => total + page.textItems.length, 0));
      setProgress(100);
      downloadBytes(bytes, "application/pdf", `${file.name.replace(/\.docx$/i, "") || "fixthatpdf-document"}.pdf`);
      setStatus("complete");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch (conversionError) {
      setStatus("idle");
      setError(conversionError.message || "The PDF could not be created from this DOCX file.");
    } finally {
      host.replaceChildren();
    }
  };

  return (
    <div className="conversion-workspace-grid">
      <section>
        <ConversionDropzone accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" label="Drop your Word file here" hint="Choose a DOCX file up to 20 MB. Legacy .doc files are not supported yet." onFile={loadDocx} disabled={status === "reading" || status === "converting"} />
        {status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading your document...</div>}
        {error && <div className="conversion-error" role="alert">{error}</div>}
        {file && <div className="office-file-card"><header><FileText size={20} /><div><strong>{file.name}</strong><small>DOCX · {formatBytes(file.size)} · ready to render</small></div></header></div>}
        <div ref={renderHostRef} className="docx-render-host" aria-hidden="true" />
      </section>
      <aside className="conversion-settings-card">
        <span>PDF settings</span>
        <h2>Preserve the visible pages</h2>
        <div className="office-mode-note"><strong>Visual pages + searchable text</strong><p>FixThatPDF renders each DOCX page at high resolution, then adds an invisible text layer so words remain searchable and selectable in standard PDF readers.</p></div>
        <div className="conversion-summary"><Check size={18} /><span>{file ? "DOCX ready to convert" : "Add a DOCX to continue"}</span></div>
        {status === "converting" && <div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div>}
        <button className="conversion-primary-action" type="button" disabled={!file || status === "reading" || status === "converting"} onClick={convert}>{status === "converting" ? <><LoaderCircle className="is-spinning" size={18} /> Converting {progress}%</> : <><Download size={18} /> Download PDF</>}</button>
        {status === "complete" && <p className="conversion-success">Your searchable PDF is ready{searchableWordCount ? ` with ${searchableWordCount} selectable words` : ""}.</p>}
      </aside>
    </div>
  );
}

export function OfficeConversionPage({ tool }) {
  const pdfToWord = tool.id === "pdf-to-word";
  const schema = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: tool.name, applicationCategory: "BusinessApplication", operatingSystem: "Web", url: tool.canonicalUrl, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  return (
    <main className="image-conversion-page office-conversion-page">
      <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={[schema]} />
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
      <section className="conversion-hero">
        <div><small>Available · runs in your browser</small><h1>{tool.name} online.</h1><p>{tool.shortDescription} Free to use and ready in seconds.</p></div>
      </section>
      {pdfToWord ? <PdfToWordWorkspace /> : <WordToPdfWorkspace />}
      <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private browser processing</strong><p>This conversion runs locally in your browser. FixThatPDF does not upload the file to an Office, OCR, or AI service.</p></div></section>
    </main>
  );
}
