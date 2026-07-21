import { useEffect, useRef, useState } from "react";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down.mjs";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up.mjs";
import Camera from "lucide-react/dist/esm/icons/camera.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileSearch from "lucide-react/dist/esm/icons/file-search.mjs";
import Images from "lucide-react/dist/esm/icons/images.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { createPdfFromImages } from "../../tools/imageConversion.js";
import { createSearchablePdfFromOcrPages, flattenOcrWords } from "../../tools/ocrPdf.js";
import { moveScanPage, nextScanRotation, SCAN_PDF_LIMITS, validateScanFiles } from "../../tools/scanPdf.js";

function canvasToBytes(canvas, mimeType = "image/jpeg", quality = 0.92) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => {
    if (!blob) return reject(new Error("A scan page could not be encoded."));
    resolve(new Uint8Array(await blob.arrayBuffer()));
  }, mimeType, quality));
}

async function loadImage(source) {
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderPage(record, cleanup) {
  const { image, width, height } = await loadImage(record.file);
  const swaps = record.rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = swaps ? height : width;
  canvas.height = swaps ? width : height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(record.rotation * Math.PI / 180);
  if (cleanup) context.filter = "grayscale(1) contrast(1.14)";
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
  return canvas;
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

export function ScanPdfPage({ tool }) {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isCamera = tool.id === "pdf-scanner";
  const isSearchable = tool.id === "image-to-searchable-pdf";
  const [pages, setPages] = useState([]);
  const [cleanup, setCleanup] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };
  useEffect(() => () => stopCamera(), []);

  const addFiles = (files) => {
    const list = Array.from(files || []);
    const validationError = validateScanFiles(list);
    if (validationError) return setError(validationError);
    if (pages.length + list.length > SCAN_PDF_LIMITS.maxImages) return setError(`A scan can contain up to ${SCAN_PDF_LIMITS.maxImages} pages.`);
    setError("");
    setPages((current) => [...current, ...list.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), rotation: 0 }))]);
    trackProductEvent("upload_started", { toolId: tool.id });
  };

  const removePage = (index) => setPages((current) => {
    URL.revokeObjectURL(current[index].preview);
    return current.filter((_, itemIndex) => itemIndex !== index);
  });

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);
    } catch {
      setError("Camera access was unavailable. Allow camera permission or add photos from your device.");
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return setError("The camera is not ready yet.");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.94));
    if (!blob) return setError("The page photo could not be captured.");
    addFiles([new File([blob], `scan-page-${pages.length + 1}.jpg`, { type: "image/jpeg" })]);
  };

  const createPdf = async () => {
    if (!pages.length) return;
    setStatus("working");
    setProgress(1);
    setError("");
    let worker;
    try {
      const rendered = [];
      if (isSearchable) {
        const { createWorker } = await import("tesseract.js");
        let activePage = 0;
        worker = await createWorker("eng", undefined, { logger: (message) => {
          if (message.status === "recognizing text") setProgress(Math.min(96, Math.round((activePage + Number(message.progress || 0)) / pages.length * 96)));
        } });
        for (let index = 0; index < pages.length; index += 1) {
          activePage = index;
          const canvas = await renderPage(pages[index], cleanup);
          const recognition = await worker.recognize(canvas, { rotateAuto: false }, { text: true, blocks: true });
          rendered.push({ imageBytes: await canvasToBytes(canvas, "image/png"), imageWidth: canvas.width, imageHeight: canvas.height, words: flattenOcrWords(recognition.data), text: recognition.data.text || "" });
        }
        if (!rendered.some((page) => page.words.length)) throw new Error("No readable English text was found. Try clearer, closer page images.");
        const output = await createSearchablePdfFromOcrPages(rendered, { title: "Searchable scan" });
        downloadPdf(output, "searchable-scan.pdf", tool.id);
      } else {
        for (let index = 0; index < pages.length; index += 1) {
          const canvas = await renderPage(pages[index], cleanup);
          rendered.push({ bytes: await canvasToBytes(canvas), mimeType: "image/jpeg", width: canvas.width, height: canvas.height });
          setProgress(Math.round((index + 1) / pages.length * 85));
        }
        const output = await createPdfFromImages(rendered, { pageSize: "fit", margin: 0, title: "Scanned document" });
        downloadPdf(output, isCamera ? "camera-scan.pdf" : "scanned-pages.pdf", tool.id);
      }
      setProgress(100);
      setStatus("complete");
      trackProductEvent("export_succeeded", { toolId: tool.id });
    } catch (processingError) {
      setStatus("idle");
      setError(processingError?.message || "The scanned PDF could not be created.");
      trackProductEvent("export_failed", { toolId: tool.id, errorCategory: "scan_failed" });
    } finally {
      await worker?.terminate();
    }
  };

  return <main className="image-conversion-page office-conversion-page scan-pdf-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
    <section className="conversion-hero"><div><small>Available · runs in your browser</small><h1>{isCamera ? "Scan paper pages into one PDF." : isSearchable ? "Turn page images into a searchable PDF." : "Build a clean PDF from scanned pages."}</h1><p>{isCamera ? "Use your camera or existing page photos, put them in order, clean them up, and download one PDF." : isSearchable ? "Recognize English text in ordered JPG and PNG pages, then add an invisible text layer for search and copy." : "Add JPG and PNG page images, rotate and reorder them, apply scan cleanup, and download one PDF."}</p></div></section>
    {isCamera && <section className="scan-camera-card"><div className="scan-video-shell"><video ref={videoRef} muted playsInline />{!cameraOn && <span><Camera size={30} /><strong>Camera preview</strong><small>Use the rear camera for clearer paper scans.</small></span>}</div><div><button type="button" onClick={cameraOn ? capture : startCamera}>{cameraOn ? <><Camera size={18} /> Capture page</> : <><Camera size={18} /> Start camera</>}</button>{cameraOn && <button className="scan-camera-secondary" type="button" onClick={stopCamera}>Stop camera</button>}<p>Camera capture requires browser permission and HTTPS. You can always upload existing photos instead.</p></div></section>}
    <div className="conversion-workspace-grid"><section>
      <div className="conversion-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}><input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} /><span><Upload size={27} /></span><h2>Add scanned page images</h2><p>Up to {SCAN_PDF_LIMITS.maxImages} JPG or PNG pages, 20 MB each.</p><button type="button" onClick={() => inputRef.current?.click()}>Choose page images</button></div>
      {error && <div className="conversion-error" role="alert">{error}</div>}
      {pages.length > 0 && <ol className="scan-page-list">{pages.map((pageRecord, index) => <li key={pageRecord.id}><img src={pageRecord.preview} alt={`Scan page ${index + 1}`} style={{ transform: `rotate(${pageRecord.rotation}deg)` }} /><div><strong>Page {index + 1}</strong><small>{pageRecord.file.name}</small></div><span><button type="button" aria-label={`Move page ${index + 1} up`} disabled={index === 0} onClick={() => setPages((items) => moveScanPage(items, index, index - 1))}><ArrowUp size={15} /></button><button type="button" aria-label={`Move page ${index + 1} down`} disabled={index === pages.length - 1} onClick={() => setPages((items) => moveScanPage(items, index, index + 1))}><ArrowDown size={15} /></button><button type="button" aria-label={`Rotate page ${index + 1}`} onClick={() => setPages((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, rotation: nextScanRotation(item.rotation) } : item))}><RotateCw size={15} /></button><button type="button" aria-label={`Remove page ${index + 1}`} onClick={() => removePage(index)}><Trash2 size={15} /></button></span></li>)}</ol>}
    </section><aside className="conversion-settings-card"><span>{isSearchable ? "OCR output" : "Scan settings"}</span>{isSearchable ? <FileSearch size={25} /> : <Images size={25} />}<h2>{isSearchable ? "Searchable English text" : "Ordered PDF pages"}</h2><label className="protection-authorization"><input type="checkbox" checked={cleanup} onChange={(event) => setCleanup(event.target.checked)} /><span>Apply grayscale and contrast cleanup to every page.</span></label><div className="conversion-summary"><Check size={18} /><span>{pages.length ? `${pages.length} page${pages.length === 1 ? "" : "s"} ready` : "Add page images to continue"}</span></div>
      {status === "working" && <><div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div><p className="ocr-status">{isSearchable ? "Recognizing and building…" : "Building your PDF…"} {progress}%</p></>}
      <button className="conversion-primary-action" type="button" disabled={!pages.length || status === "working"} onClick={createPdf}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Processing…</> : <><Download size={18} /> {isSearchable ? "Run OCR and download PDF" : "Create and download PDF"}</>}</button>{status === "complete" && <p className="conversion-success">Your scanned PDF was downloaded.</p>}
    </aside></div>
    <section className="conversion-privacy-note"><ShieldCheck size={19} /><div><strong>Private browser processing</strong><p>Photos, recognized text, and PDF output stay on this device. Review OCR results and page orientation before relying on the document.</p></div></section>
    <ToolGuideContent tool={tool} />
  </main>;
}
