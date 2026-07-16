import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down.mjs";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical.mjs";
import ImageIcon from "lucide-react/dist/esm/icons/image.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { ToolIcon } from "../../tools/ToolIcon.jsx";
import { createPdfFromImages, createStoredZip, IMAGE_CONVERSION_LIMITS, isSupportedImageType } from "../../tools/imageConversion.js";
import { absoluteSiteUrl } from "../../config/site.js";
import { ExportSuccessState } from "../../components/public/ExportSuccessState.jsx";

async function loadPdfRenderer() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjsLib;
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function downloadBytes(bytes, type, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToBytes(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => {
    if (!blob) {
      reject(new Error("Could not create an image for this page."));
      return;
    }
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, type, quality));
}

function readImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("This image could not be read."));
    image.src = url;
  });
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFriendlyPdfError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (error?.name === "PasswordException" || message.includes("password")) return "This PDF is encrypted. Remove its password with an authorized tool, then try again.";
  if (message.includes("invalid pdf") || message.includes("missing pdf")) return "This PDF appears corrupted or incomplete. Try downloading a fresh copy.";
  return "FixThatPDF could not read this PDF. Try a valid, unencrypted file under 50 MB.";
}

function ConversionDropzone({ accept, multiple, label, hint, onFiles, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      className={`conversion-dropzone ${dragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); onFiles(event.dataTransfer.files); }}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={(event) => { onFiles(event.target.files); event.target.value = ""; }} />
      <span><Upload size={27} /></span>
      <h2>{label}</h2>
      <p>{hint}</p>
      <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>Choose {multiple ? "files" : "a file"}</button>
    </div>
  );
}

function ImagesToPdfWorkspace({ tool }) {
  const acceptsPng = tool.id === "png-to-pdf";
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState("fit");
  const [orientation, setOrientation] = useState("auto");
  const [margin, setMargin] = useState(24);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const previewUrlsRef = useRef([]);

  useEffect(() => () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    setError("");
    if (!files.length) return;
    if (images.length + files.length > IMAGE_CONVERSION_LIMITS.maxImageCount) {
      setError(`Choose no more than ${IMAGE_CONVERSION_LIMITS.maxImageCount} images at once.`);
      return;
    }
    const expectedType = acceptsPng ? "image/png" : "image/jpeg";
    const invalid = files.find((file) => !isSupportedImageType(file.type, file.name) || (acceptsPng ? file.type !== "image/png" && !file.name.toLowerCase().endsWith(".png") : file.type === "image/png" || file.name.toLowerCase().endsWith(".png")));
    if (invalid) {
      setError(`${tool.name} accepts ${acceptsPng ? "PNG" : "JPG"} images. ${invalid.name} is not supported here.`);
      return;
    }
    if (files.some((file) => file.size > IMAGE_CONVERSION_LIMITS.maxInputBytes)) {
      setError("Each image must be under 50 MB.");
      return;
    }
    setStatus("reading");
    try {
      const records = await Promise.all(files.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.push(previewUrl);
        const dimensions = await readImageDimensions(previewUrl);
        return { id: makeId("image"), name: file.name, size: file.size, mimeType: expectedType, bytes: new Uint8Array(await file.arrayBuffer()), previewUrl, ...dimensions };
      }));
      setImages((current) => [...current, ...records]);
      setStatus("idle");
    } catch (uploadError) {
      setStatus("idle");
      setError(uploadError.message || "One of these images could not be read.");
    }
  };

  const moveImage = (from, to) => {
    if (to < 0 || to >= images.length || from === to) return;
    setImages((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const removeImage = (id) => setImages((current) => {
    const target = current.find((image) => image.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    return current.filter((image) => image.id !== id);
  });

  const exportPdf = async () => {
    setStatus("converting");
    setError("");
    try {
      const bytes = await createPdfFromImages(images, { pageSize, orientation, margin, title: `${tool.name} conversion` });
      downloadBytes(bytes, "application/pdf", `${acceptsPng ? "png" : "jpg"}-images.pdf`);
      setStatus("complete");
    } catch (conversionError) {
      setStatus("idle");
      setError(conversionError.message || "The PDF could not be created.");
    }
  };

  return (
    <div className="conversion-workspace-grid">
      <section>
        <ConversionDropzone accept={acceptsPng ? "image/png,.png" : "image/jpeg,.jpg,.jpeg"} multiple label={`Drop ${acceptsPng ? "PNG" : "JPG"} images here`} hint="Add up to 100 images, then drag them into the exact page order you want." onFiles={addFiles} disabled={status !== "idle"} />
        {error && <div className="conversion-error" role="alert">{error}</div>}
        {images.length > 0 && <div className="conversion-image-list" aria-label="Images in PDF order">
          {images.map((image, index) => <article
            key={image.id}
            draggable
            className={draggedIndex === index ? "is-dragging" : ""}
            onDragStart={() => setDraggedIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => { if (draggedIndex !== null) moveImage(draggedIndex, index); setDraggedIndex(null); }}
            onDragEnd={() => setDraggedIndex(null)}
          >
            <GripVertical size={18} aria-hidden="true" />
            <img src={image.previewUrl} alt="" />
            <div><strong>{index + 1}. {image.name}</strong><small>{image.width} × {image.height} · {formatBytes(image.size)}</small></div>
            <button type="button" onClick={() => moveImage(index, index - 1)} disabled={index === 0} aria-label={`Move ${image.name} up`}><ArrowUp size={16} /></button>
            <button type="button" onClick={() => moveImage(index, index + 1)} disabled={index === images.length - 1} aria-label={`Move ${image.name} down`}><ArrowDown size={16} /></button>
            <button type="button" onClick={() => removeImage(image.id)} aria-label={`Remove ${image.name}`}><Trash2 size={16} /></button>
          </article>)}
        </div>}
      </section>
      <aside className="conversion-settings-card">
        <span>PDF settings</span>
        <h2>Set the page layout</h2>
        <label>Page size<select value={pageSize} onChange={(event) => setPageSize(event.target.value)}><option value="fit">Fit each image</option><option value="a4">A4</option><option value="letter">US Letter</option></select></label>
        <label>Orientation<select value={orientation} onChange={(event) => setOrientation(event.target.value)}><option value="auto">Automatic</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
        <label>Margins<select value={margin} onChange={(event) => setMargin(Number(event.target.value))}><option value="0">None</option><option value="24">Small</option><option value="48">Large</option></select></label>
        <div className="conversion-summary"><Check size={18} /><span>{images.length ? `${images.length} image${images.length === 1 ? "" : "s"} ready` : "Add images to continue"}</span></div>
        <button className="conversion-primary-action" type="button" disabled={!images.length || status === "converting" || status === "reading"} onClick={exportPdf}>{status === "converting" ? <><LoaderCircle className="is-spinning" size={18} /> Creating PDF...</> : <><Download size={18} /> Download PDF</>}</button>
        {status === "complete" && <ExportSuccessState toolId={tool.id} onDownloadAgain={exportPdf} onStartAnother={() => { images.forEach((image) => URL.revokeObjectURL(image.previewUrl)); setImages([]); setStatus("idle"); }} relatedRoute="/organize-pdf" relatedName="Organize PDF" />}
      </aside>
    </div>
  );
}

function PdfToImagesWorkspace({ tool }) {
  const outputPng = tool.id === "pdf-to-png";
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(0.88);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const previewUrlsRef = useRef([]);

  useEffect(() => () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const loadPdf = async (fileList) => {
    const file = Array.from(fileList || [])[0];
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file.");
      return;
    }
    if (file.size > IMAGE_CONVERSION_LIMITS.maxInputBytes) {
      setError("PDFs must be under 50 MB for this browser conversion workflow.");
      return;
    }
    setStatus("reading");
    setProgress(0);
    try {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
      const buffer = await file.arrayBuffer();
      const pdfjsLib = await loadPdfRenderer();
      const documentProxy = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      if (documentProxy.numPages > IMAGE_CONVERSION_LIMITS.maxPdfPages) throw new Error(`This PDF has ${documentProxy.numPages} pages. The current limit is ${IMAGE_CONVERSION_LIMITS.maxPdfPages}.`);
      const pageRecords = [];
      for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
        const page = await documentProxy.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.34 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        const previewBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
        if (!previewBlob) throw new Error("A page preview could not be created.");
        const previewUrl = URL.createObjectURL(previewBlob);
        previewUrlsRef.current.push(previewUrl);
        pageRecords.push({ pageNumber, width: viewport.width, height: viewport.height, previewUrl });
        setProgress(Math.round((pageNumber / documentProxy.numPages) * 100));
      }
      setPdfFile(file);
      setPdfDocument(documentProxy);
      setPages(pageRecords);
      setSelectedPages(new Set(pageRecords.map((page) => page.pageNumber)));
      setStatus("idle");
    } catch (pdfError) {
      setStatus("idle");
      setPdfDocument(null);
      setPages([]);
      setError(pdfError.message?.includes("current limit") ? pdfError.message : getFriendlyPdfError(pdfError));
    }
  };

  const togglePage = (pageNumber) => setSelectedPages((current) => {
    const next = new Set(current);
    if (next.has(pageNumber)) next.delete(pageNumber); else next.add(pageNumber);
    return next;
  });

  const exportImages = async () => {
    if (!pdfDocument || !selectedPages.size) return;
    setStatus("converting");
    setError("");
    setProgress(0);
    try {
      const chosen = [...selectedPages].sort((a, b) => a - b);
      const outputFiles = [];
      for (let index = 0; index < chosen.length; index += 1) {
        const pageNumber = chosen[index];
        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        const context = canvas.getContext("2d", { alpha: outputPng });
        if (!outputPng) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        await page.render({ canvasContext: context, viewport }).promise;
        const extension = outputPng ? "png" : "jpg";
        const data = await canvasToBytes(canvas, outputPng ? "image/png" : "image/jpeg", outputPng ? undefined : quality);
        outputFiles.push({ name: `page-${String(pageNumber).padStart(3, "0")}.${extension}`, data });
        setProgress(Math.round(((index + 1) / chosen.length) * 100));
      }
      const baseName = pdfFile.name.replace(/\.pdf$/i, "") || "realpdf-pages";
      if (outputFiles.length === 1) downloadBytes(outputFiles[0].data, outputPng ? "image/png" : "image/jpeg", `${baseName}-${outputFiles[0].name}`);
      else downloadBytes(createStoredZip(outputFiles), "application/zip", `${baseName}-${outputPng ? "png" : "jpg"}.zip`);
      setStatus("complete");
    } catch (conversionError) {
      setStatus("idle");
      setError(conversionError.message || "The selected pages could not be converted.");
    }
  };

  const allSelected = pages.length > 0 && selectedPages.size === pages.length;
  return (
    <div className="conversion-workspace-grid">
      <section>
        <ConversionDropzone accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here" hint={`Choose pages and export them as ${outputPng ? "lossless PNG" : "high-quality JPG"} images.`} onFiles={loadPdf} disabled={status === "reading" || status === "converting"} />
        {status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading pages... {progress}%</div>}
        {error && <div className="conversion-error" role="alert">{error}</div>}
        {pages.length > 0 && <div className="conversion-page-picker">
          <header><div><strong>{pdfFile.name}</strong><small>{pages.length} page{pages.length === 1 ? "" : "s"} · {formatBytes(pdfFile.size)}</small></div><button type="button" onClick={() => setSelectedPages(allSelected ? new Set() : new Set(pages.map((page) => page.pageNumber)))}>{allSelected ? "Clear all" : "Select all"}</button></header>
          <div>{pages.map((page) => <label key={page.pageNumber} className={selectedPages.has(page.pageNumber) ? "is-selected" : ""}><input type="checkbox" checked={selectedPages.has(page.pageNumber)} onChange={() => togglePage(page.pageNumber)} /><img src={page.previewUrl} alt={`Page ${page.pageNumber}`} /><span>Page {page.pageNumber}</span></label>)}</div>
        </div>}
      </section>
      <aside className="conversion-settings-card">
        <span>{outputPng ? "PNG" : "JPG"} settings</span>
        <h2>Choose output quality</h2>
        <label>Resolution<select value={scale} onChange={(event) => setScale(Number(event.target.value))}><option value="1.5">Standard · 108 DPI</option><option value="2">High · 144 DPI</option><option value="3">Maximum · 216 DPI</option></select></label>
        {!outputPng && <label>JPG quality<input type="range" min="55" max="100" value={Math.round(quality * 100)} onChange={(event) => setQuality(Number(event.target.value) / 100)} /><small>{Math.round(quality * 100)}%</small></label>}
        <div className="conversion-summary"><ImageIcon size={18} /><span>{selectedPages.size ? `${selectedPages.size} page${selectedPages.size === 1 ? "" : "s"} selected` : "Select at least one page"}</span></div>
        {status === "converting" && <div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div>}
        <button className="conversion-primary-action" type="button" disabled={!selectedPages.size || status === "converting" || status === "reading"} onClick={exportImages}>{status === "converting" ? <><LoaderCircle className="is-spinning" size={18} /> Converting {progress}%</> : <><Download size={18} /> Download {selectedPages.size > 1 ? "ZIP" : outputPng ? "PNG" : "JPG"}</>}</button>
        {status === "complete" && <ExportSuccessState toolId={tool.id} onDownloadAgain={exportImages} onStartAnother={() => { setPdfFile(null); setPdfDocument(null); setPages([]); setSelectedPages(new Set()); setStatus("idle"); }} relatedRoute="/jpg-to-pdf" relatedName="JPG to PDF" />}
      </aside>
    </div>
  );
}

export function ImageConversionPage({ tool }) {
  const imagesToPdf = tool.category === "to-pdf";
  const schema = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: tool.name, applicationCategory: "BusinessApplication", operatingSystem: "Web", url: absoluteSiteUrl(tool.canonicalUrl), offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  return (
    <main className="image-conversion-page">
      <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={[schema]} />
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
      <section className="conversion-hero">
        <span style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={29} /></span>
        <div><small>Available now · runs in your browser</small><h1>{tool.name}</h1><p>{tool.shortDescription} Files remain on this device during conversion.</p></div>
      </section>
      {imagesToPdf ? <ImagesToPdfWorkspace tool={tool} /> : <PdfToImagesWorkspace tool={tool} />}
      <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private browser processing</strong><p>This conversion runs locally in your browser. FixThatPDF does not send these files to an Office, OCR, or AI service.</p></div></section>
    </main>
  );
}
