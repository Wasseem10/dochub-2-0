import { useEffect, useMemo, useRef, useState } from "react";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down.mjs";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up.mjs";
import Camera from "lucide-react/dist/esm/icons/camera.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Crop from "lucide-react/dist/esm/icons/crop.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileSearch from "lucide-react/dist/esm/icons/file-search.mjs";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical.mjs";
import Images from "lucide-react/dist/esm/icons/images.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import RefreshCcw from "lucide-react/dist/esm/icons/refresh-ccw.mjs";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw.mjs";
import ScanLine from "lucide-react/dist/esm/icons/scan-line.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent, trackUploadValidationFailure } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { WorkflowErrorState } from "../../components/public/WorkflowErrorState.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import {
  applyDocumentFilter,
  autoPageSizeForAspect,
  defaultDocumentCorners,
  detectDocumentCorners,
  getCornerDrift,
  loadDocumentVision,
  warpDocument,
} from "../../tools/documentScannerVision.js";
import { createPdfFromImages } from "../../tools/imageConversion.js";
import { createSearchablePdfFromOcrPages, flattenOcrWords } from "../../tools/ocrPdf.js";
import { moveScanPage, nextScanRotation, SCAN_PDF_LIMITS, validateScanFiles } from "../../tools/scanPdf.js";
import { toolSeoSchemas } from "../../tools/toolSeoSchemas.js";

const FILTER_OPTIONS = [
  { id: "original", label: "Original" },
  { id: "enhanced", label: "Enhanced / Magic Color" },
  { id: "grayscale", label: "Grayscale" },
  { id: "black-white", label: "Black & White" },
];

function canvasToBlob(canvas, mimeType = "image/jpeg", quality = 0.93) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("A scan page could not be encoded."));
  }, mimeType, quality));
}

async function canvasToBytes(canvas, mimeType = "image/jpeg", quality = 0.93) {
  return new Uint8Array(await (await canvasToBlob(canvas, mimeType, quality)).arrayBuffer());
}

async function fileToCanvas(source) {
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d", { alpha: false }).drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function renderProcessedPage(record) {
  const source = await fileToCanvas(record.processedBlob);
  if (!record.rotation) return source;
  const swaps = record.rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = swaps ? source.height : source.width;
  canvas.height = swaps ? source.width : source.height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(record.rotation * Math.PI / 180);
  context.drawImage(source, -source.width / 2, -source.height / 2);
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

function pointFromPointer(event, width, height) {
  const svg = event.currentTarget.ownerSVGElement;
  const box = svg.getBoundingClientRect();
  const scale = Math.min(box.width / width, box.height / height);
  const offsetX = (box.width - width * scale) / 2;
  const offsetY = (box.height - height * scale) / 2;
  return {
    x: Math.max(0, Math.min(width, (event.clientX - box.left - offsetX) / scale)),
    y: Math.max(0, Math.min(height, (event.clientY - box.top - offsetY) / scale)),
  };
}

export function ScanPdfPage({ tool }) {
  const inputRef = useRef(null);
  const retakeInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionCanvasRef = useRef(null);
  const detectionFrameRef = useRef(0);
  const captureRef = useRef(null);
  const captureLockRef = useRef(false);
  const stableRef = useRef({ corners: null, since: 0 });
  const pagesRef = useRef([]);
  const filterRequestRef = useRef(0);
  const retakeIndexRef = useRef(null);
  const isCamera = tool.id === "pdf-scanner";
  const isSearchable = tool.id === "image-to-searchable-pdf";

  const [pages, setPages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [pending, setPending] = useState(null);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [visionStatus, setVisionStatus] = useState("idle");
  const [liveCorners, setLiveCorners] = useState(null);
  const [detectionHint, setDetectionHint] = useState("Align the document within the frame.");
  const [filterStatus, setFilterStatus] = useState("idle");
  const [pageSize, setPageSize] = useState("auto");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  pagesRef.current = pages;
  const selectedPage = useMemo(() => pages.find((page) => page.id === selectedId) || pages[0] || null, [pages, selectedId]);

  const ensureVision = async () => {
    setVisionStatus("loading");
    try {
      const cv = await loadDocumentVision();
      setVisionStatus("ready");
      return cv;
    } catch (visionError) {
      setVisionStatus("error");
      throw new Error(visionError?.message || "The document scanner could not initialize.");
    }
  };

  const stopCamera = () => {
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(detectionFrameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    stableRef.current = { corners: null, since: 0 };
    setCameraOn(false);
    setLiveCorners(null);
  };

  useEffect(() => () => {
    stopCamera();
    pagesRef.current.forEach((page) => URL.revokeObjectURL(page.preview));
  }, []);

  const preparePending = async (file, retakeIndex = null) => {
    setError("");
    setFilterStatus("detecting");
    try {
      const [cv, sourceCanvas] = await Promise.all([ensureVision(), fileToCanvas(file)]);
      const detection = detectDocumentCorners(cv, sourceCanvas);
      const sourcePreview = URL.createObjectURL(file);
      setPending({
        file,
        preview: sourcePreview,
        width: sourceCanvas.width,
        height: sourceCanvas.height,
        corners: detection?.corners || defaultDocumentCorners(sourceCanvas.width, sourceCanvas.height),
        detected: Boolean(detection),
        retakeIndex,
      });
      if (!detection) setDetectionHint("No document edge was found. Drag the four handles onto the page corners.");
    } catch (pendingError) {
      setError(pendingError?.message || "This page photo could not be prepared.");
    } finally {
      setFilterStatus("idle");
    }
  };

  const advanceQueue = async () => {
    const [next, ...remaining] = queuedFiles;
    setQueuedFiles(remaining);
    if (next) await preparePending(next.file, next.retakeIndex);
  };

  const queueFiles = async (files, retakeIndex = null) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const occupied = retakeIndex === null ? pages.length + queuedFiles.length + (pending ? 1 : 0) : pages.length - 1;
    const remainingSlots = Math.max(0, SCAN_PDF_LIMITS.maxImages - occupied);
    if (!remainingSlots) {
      trackUploadValidationFailure(tool.id, "too_many_files");
      setError(`You already have the maximum of ${SCAN_PDF_LIMITS.maxImages} pages. Remove one before adding another.`);
      return;
    }
    const accepted = [];
    const skipped = [];
    list.slice(0, remainingSlots).forEach((file, index) => {
      const validationError = validateScanFiles([file]);
      if (validationError) {
        trackUploadValidationFailure(tool.id, "invalid_image");
        skipped.push(`${file.name}: ${validationError}`);
      } else {
        accepted.push({ file, retakeIndex: index === 0 ? retakeIndex : null });
      }
    });
    list.slice(remainingSlots).forEach((file) => skipped.push(`${file.name}: the ${SCAN_PDF_LIMITS.maxImages}-page limit was reached`));
    if (accepted.length) {
      trackProductEvent("upload_started", { toolId: tool.id, batchSize: accepted.length });
      if (pending) setQueuedFiles((current) => [...current, ...accepted]);
      else {
        setQueuedFiles(accepted.slice(1));
        await preparePending(accepted[0].file, accepted[0].retakeIndex);
      }
    }
    if (skipped.length) setError(`${skipped.length} file${skipped.length === 1 ? " was" : "s were"} skipped: ${skipped.slice(0, 3).join("; ")}${skipped.length > 3 ? `; and ${skipped.length - 3} more` : ""}.`);
  };

  const startCamera = async () => {
    setError("");
    try {
      await ensureVision();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera capture is not supported in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);
    } catch (cameraError) {
      setError(cameraError?.message || "Camera access was unavailable. Allow camera permission or add photos from your device.");
    }
  };

  const captureCurrentFrame = async (mode = "manual") => {
    if (captureLockRef.current || pagesRef.current.length >= SCAN_PDF_LIMITS.maxImages) return;
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setError("The camera is not ready yet.");
      return;
    }
    captureLockRef.current = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d", { alpha: false }).drawImage(video, 0, 0);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      const file = new File([blob], `scan-page-${pagesRef.current.length + 1}.jpg`, { type: "image/jpeg" });
      const fallback = liveCorners || defaultDocumentCorners(canvas.width, canvas.height);
      setPending({
        file,
        preview: URL.createObjectURL(file),
        width: canvas.width,
        height: canvas.height,
        corners: fallback,
        detected: Boolean(liveCorners),
        retakeIndex: retakeIndexRef.current,
      });
      setDetectionHint(mode === "auto" ? "Captured automatically. Adjust any corner before confirming." : "Adjust any corner before confirming the crop.");
      stableRef.current = { corners: null, since: 0 };
    } catch (captureError) {
      setError(captureError?.message || "The page photo could not be captured.");
    } finally {
      captureLockRef.current = false;
    }
  };
  captureRef.current = captureCurrentFrame;

  useEffect(() => {
    if (!cameraOn || pending || visionStatus !== "ready" || pages.length >= SCAN_PDF_LIMITS.maxImages) return undefined;
    let cancelled = false;
    let lastRun = 0;
    const detect = async (timestamp) => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video?.videoWidth && timestamp - lastRun > 145) {
        lastRun = timestamp;
        const canvas = detectionCanvasRef.current || document.createElement("canvas");
        detectionCanvasRef.current = canvas;
        const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext("2d", { alpha: false }).drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const cv = await loadDocumentVision();
          const result = detectDocumentCorners(cv, canvas, { maxDimension: 720 });
          if (result) {
            const corners = result.corners.map((point) => ({ x: point.x / scale, y: point.y / scale }));
            setLiveCorners(corners);
            const drift = getCornerDrift(stableRef.current.corners, corners, video.videoWidth, video.videoHeight);
            if (drift < 0.012) {
              if (!stableRef.current.since) stableRef.current.since = timestamp;
              const elapsed = timestamp - stableRef.current.since;
              setDetectionHint(autoCapture ? `Hold steady… ${Math.min(100, Math.round(elapsed / 10))}%` : "Document detected. Tap the shutter when ready.");
              if (autoCapture && elapsed >= 1000) captureRef.current?.("auto");
            } else {
              stableRef.current.since = timestamp;
              setDetectionHint("Document detected. Hold steady for auto-capture.");
            }
            stableRef.current.corners = corners;
          } else {
            setLiveCorners(null);
            stableRef.current = { corners: null, since: 0 };
            setDetectionHint("Align the document within the frame.");
          }
        } catch {
          setDetectionHint("Live edge detection paused. You can still use the shutter and adjust corners manually.");
        }
      }
      detectionFrameRef.current = requestAnimationFrame(detect);
    };
    detectionFrameRef.current = requestAnimationFrame(detect);
    return () => {
      cancelled = true;
      cancelAnimationFrame(detectionFrameRef.current);
    };
  }, [autoCapture, cameraOn, pages.length, pending, visionStatus]);

  const updatePendingCorner = (index, event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = pointFromPointer(event, pending.width, pending.height);
    setPending((current) => ({ ...current, corners: current.corners.map((corner, cornerIndex) => cornerIndex === index ? point : corner) }));
  };

  const confirmCrop = async () => {
    if (!pending) return;
    setFilterStatus("processing");
    setError("");
    try {
      const [cv, sourceCanvas] = await Promise.all([ensureVision(), fileToCanvas(pending.file)]);
      const flattenedCanvas = warpDocument(cv, sourceCanvas, pending.corners);
      const flattenedBlob = await canvasToBlob(flattenedCanvas, "image/png");
      const filteredCanvas = applyDocumentFilter(cv, flattenedCanvas, "enhanced");
      const processedBlob = await canvasToBlob(filteredCanvas, "image/jpeg", 0.94);
      const preview = URL.createObjectURL(processedBlob);
      const existing = pending.retakeIndex === null ? null : pages[pending.retakeIndex];
      const record = {
        id: existing?.id || crypto.randomUUID(),
        fileName: pending.file.name,
        flattenedBlob,
        processedBlob,
        preview,
        width: filteredCanvas.width,
        height: filteredCanvas.height,
        filter: "enhanced",
        rotation: existing?.rotation || 0,
      };
      setPages((current) => {
        if (pending.retakeIndex === null) return [...current, record];
        const next = [...current];
        URL.revokeObjectURL(next[pending.retakeIndex].preview);
        next[pending.retakeIndex] = record;
        return next;
      });
      setSelectedId(record.id);
      URL.revokeObjectURL(pending.preview);
      setPending(null);
      retakeIndexRef.current = null;
      trackProductEvent("scan_page_confirmed", { toolId: tool.id, detectionMode: pending.detected ? "automatic" : "manual" });
      await advanceQueue();
    } catch (processingError) {
      setError(processingError?.message || "The document crop could not be applied.");
    } finally {
      setFilterStatus("idle");
    }
  };

  const cancelPending = async () => {
    if (pending) URL.revokeObjectURL(pending.preview);
    setPending(null);
    retakeIndexRef.current = null;
    await advanceQueue();
  };

  const changeFilter = async (filter) => {
    if (!selectedPage || selectedPage.filter === filter) return;
    const requestId = ++filterRequestRef.current;
    setFilterStatus("processing");
    try {
      const [cv, sourceCanvas] = await Promise.all([ensureVision(), fileToCanvas(selectedPage.flattenedBlob)]);
      const filteredCanvas = applyDocumentFilter(cv, sourceCanvas, filter);
      const processedBlob = await canvasToBlob(filteredCanvas, filter === "black-white" ? "image/png" : "image/jpeg", 0.94);
      if (requestId !== filterRequestRef.current) return;
      const preview = URL.createObjectURL(processedBlob);
      setPages((current) => current.map((page) => {
        if (page.id !== selectedPage.id) return page;
        URL.revokeObjectURL(page.preview);
        return { ...page, filter, processedBlob, preview, width: filteredCanvas.width, height: filteredCanvas.height };
      }));
    } catch (filterError) {
      setError(filterError?.message || "That scan filter could not be applied.");
    } finally {
      if (requestId === filterRequestRef.current) setFilterStatus("idle");
    }
  };

  const removePage = (index) => setPages((current) => {
    const removed = current[index];
    URL.revokeObjectURL(removed.preview);
    const next = current.filter((_, itemIndex) => itemIndex !== index);
    if (removed.id === selectedId) setSelectedId(next[Math.min(index, next.length - 1)]?.id || null);
    return next;
  });

  const beginRetake = async (index) => {
    retakeIndexRef.current = index;
    setSelectedId(pages[index].id);
    if (isCamera) {
      if (!cameraOn) await startCamera();
      document.querySelector(".scan-camera-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else retakeInputRef.current?.click();
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
          const canvas = await renderProcessedPage(pages[index]);
          const recognition = await worker.recognize(canvas, { rotateAuto: false }, { text: true, blocks: true });
          rendered.push({ imageBytes: await canvasToBytes(canvas, "image/png"), imageWidth: canvas.width, imageHeight: canvas.height, words: flattenOcrWords(recognition.data), text: recognition.data.text || "" });
        }
        if (!rendered.some((page) => page.words.length)) throw new Error("No readable English text was found. Try clearer, closer page images.");
        downloadPdf(await createSearchablePdfFromOcrPages(rendered, { title: "Searchable scan" }), "searchable-scan.pdf", tool.id);
      } else {
        for (let index = 0; index < pages.length; index += 1) {
          const canvas = await renderProcessedPage(pages[index]);
          rendered.push({ bytes: await canvasToBytes(canvas), mimeType: "image/jpeg", width: canvas.width, height: canvas.height });
          setProgress(Math.round((index + 1) / pages.length * 82));
        }
        const resolvedPageSize = pageSize === "auto" ? autoPageSizeForAspect(rendered[0].width, rendered[0].height) : pageSize;
        const output = await createPdfFromImages(rendered, { pageSize: resolvedPageSize, orientation: "auto", margin: 18, title: "Scanned document" });
        downloadPdf(output, isCamera ? "camera-scan.pdf" : "scanned-pages.pdf", tool.id);
      }
      setProgress(100);
      setStatus("complete");
      trackProductEvent("export_succeeded", { toolId: tool.id, pageCountBucket: pages.length === 1 ? "1" : pages.length <= 5 ? "2_5" : "6_plus" });
    } catch (processingError) {
      setStatus("idle");
      setError(processingError?.message || "The scanned PDF could not be created.");
      trackProductEvent("export_failed", { toolId: tool.id, errorCategory: "scan_failed" });
    } finally {
      await worker?.terminate();
    }
  };

  return <main className="image-conversion-page office-conversion-page scan-pdf-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={toolSeoSchemas(tool)} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
    <section className="conversion-hero"><div><small>Available · runs in your browser</small><h1>{isCamera ? "Scan paper pages into one clean PDF." : isSearchable ? "Turn page images into a searchable PDF." : "Build a clean PDF from scanned pages."}</h1><p>{isCamera ? "Detect page edges, correct perspective, enhance each scan, and capture up to 30 pages without leaving the camera." : "Every JPG or PNG goes through document edge detection, manual corner correction, deskewing, and a real saved-pixel scan filter."}</p></div></section>

    {isCamera && <section className="scan-camera-card" aria-label="Document camera">
      <div className="scan-video-shell">
        <video ref={videoRef} muted playsInline />
        {cameraOn && liveCorners && <svg className="scan-live-overlay" viewBox={`0 0 ${videoRef.current?.videoWidth || 1} ${videoRef.current?.videoHeight || 1}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true"><polygon points={liveCorners.map((point) => `${point.x},${point.y}`).join(" ")} /></svg>}
        {!cameraOn && <span>{visionStatus === "loading" ? <LoaderCircle className="is-spinning" size={30} /> : <Camera size={30} />}<strong>{visionStatus === "loading" ? "Loading document detection…" : "Camera preview"}</strong><small>{visionStatus === "loading" ? "The scanner engine may take a couple seconds on its first load." : "Use the rear camera for clearer paper scans."}</small></span>}
        {cameraOn && <div className={`scan-detection-hint${liveCorners ? " is-detected" : ""}`}>{liveCorners ? <ScanLine size={16} /> : null}{detectionHint}</div>}
      </div>
      <div className="scan-camera-controls">
        <span className="scan-page-counter">Page {Math.min(SCAN_PDF_LIMITS.maxImages, pages.length + 1)} / {SCAN_PDF_LIMITS.maxImages}</span>
        <h2>{retakeIndexRef.current === null ? "Capture the next page" : `Retake page ${retakeIndexRef.current + 1}`}</h2>
        <p>The outline shows the detected document. Hold it steady for one second or use the shutter, then adjust the corners before saving.</p>
        <div>{!cameraOn ? <button type="button" onClick={startCamera} disabled={visionStatus === "loading" || pages.length >= SCAN_PDF_LIMITS.maxImages}><Camera size={18} /> {pages.length >= SCAN_PDF_LIMITS.maxImages ? "30-page limit reached" : "Start camera"}</button> : <><button className="scan-shutter" type="button" onClick={() => captureCurrentFrame("manual")} aria-label="Capture page" disabled={pages.length >= SCAN_PDF_LIMITS.maxImages}><Camera size={20} /> {pages.length >= SCAN_PDF_LIMITS.maxImages ? "30-page limit reached" : "Capture page"}</button><button className="scan-camera-secondary" type="button" onClick={stopCamera}>Stop camera</button></>}</div>
        <label className="scan-auto-toggle"><input type="checkbox" checked={autoCapture} onChange={(event) => setAutoCapture(event.target.checked)} /><span>Auto-capture after the document stays steady for about one second</span></label>
        <p>Camera capture requires browser permission and HTTPS. Existing JPG and PNG photos remain available below.</p>
      </div>
    </section>}

    {pending && <section className="scan-crop-review" aria-labelledby="scan-crop-heading">
      <header><div><span>Corner review</span><h2 id="scan-crop-heading">Place each handle on the paper corner.</h2></div><span className="scan-page-counter">{pending.retakeIndex === null ? `New page ${pages.length + 1}` : `Retaking page ${pending.retakeIndex + 1}`}</span></header>
      <div className="scan-corner-stage">
        <img src={pending.preview} alt="Captured page awaiting corner correction" />
        <svg viewBox={`0 0 ${pending.width} ${pending.height}`} preserveAspectRatio="xMidYMid meet" aria-label="Adjustable document crop">
          <polygon points={pending.corners.map((point) => `${point.x},${point.y}`).join(" ")} />
          {pending.corners.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={Math.max(12, Math.min(pending.width, pending.height) * 0.018)} tabIndex="0" role="slider" aria-label={`Document corner ${index + 1}`} onPointerDown={(event) => updatePendingCorner(index, event)} onPointerMove={(event) => { if (event.buttons) updatePendingCorner(index, event); }} />)}
        </svg>
      </div>
      <p className="scan-crop-hint">{pending.detected ? "Edges were detected automatically. Fine-tune them if needed." : "No reliable edge was detected, so a safe inset was selected for manual adjustment."}</p>
      <div className="scan-review-actions"><button type="button" className="scan-camera-secondary" onClick={cancelPending}>Cancel / retake</button><button type="button" onClick={confirmCrop} disabled={filterStatus === "processing"}>{filterStatus === "processing" ? <><LoaderCircle className="is-spinning" size={18} /> Correcting perspective…</> : <><Crop size={18} /> Confirm crop & deskew</>}</button></div>
    </section>}

    <div className="conversion-workspace-grid"><section>
      <div className="conversion-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); queueFiles(event.dataTransfer.files); }}><input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event) => { queueFiles(event.target.files); event.target.value = ""; }} /><span>{filterStatus === "detecting" ? <LoaderCircle className="is-spinning" size={27} /> : <Upload size={27} />}</span><h2>{filterStatus === "detecting" ? "Detecting document edges…" : "Add existing page photos"}</h2><p>Up to {SCAN_PDF_LIMITS.maxImages} JPG or PNG pages, 20 MB each. Photos use the same crop and deskew flow.</p><button type="button" onClick={() => inputRef.current?.click()} disabled={Boolean(pending)}>Choose page images</button></div>
      <input ref={retakeInputRef} className="scan-hidden-input" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event) => { queueFiles(event.target.files, retakeIndexRef.current); event.target.value = ""; }} />
      <WorkflowErrorState message={error} onDismiss={() => setError("")} onRetry={pages.length && status === "idle" ? createPdf : undefined} />

      {pages.length > 0 && <section className="scan-page-editor" aria-label="Scanned pages">
        <div className="scan-selected-preview"><div className="scan-preview-canvas">{filterStatus === "processing" && <span><LoaderCircle className="is-spinning" size={24} /> Applying saved-pixel filter…</span>}<img src={selectedPage.preview} alt={`Selected scanned page using ${selectedPage.filter} filter`} style={{ transform: `rotate(${selectedPage.rotation}deg)` }} /></div><div className="scan-filter-controls"><strong>Page filter</strong><div>{FILTER_OPTIONS.map((filter) => <button key={filter.id} type="button" className={selectedPage.filter === filter.id ? "is-active" : ""} onClick={() => changeFilter(filter.id)} disabled={filterStatus === "processing"}>{filter.label}</button>)}</div><small>Filters change the saved pixels used in the PDF; they are not CSS effects.</small></div></div>
        <div className="scan-filmstrip-heading"><div><span>Captured pages</span><h2>{pages.length} / {SCAN_PDF_LIMITS.maxImages} ready</h2></div><small>Drag thumbnails to reorder.</small></div>
        <ol className="scan-page-list scan-filmstrip">{pages.map((pageRecord, index) => <li key={pageRecord.id} className={pageRecord.id === selectedPage.id ? "is-selected" : ""} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData("text/plain")); setPages((items) => moveScanPage(items, from, index)); }} onClick={() => setSelectedId(pageRecord.id)}><GripVertical className="scan-drag-handle" size={17} aria-hidden="true" /><img src={pageRecord.preview} alt={`Scan page ${index + 1}`} style={{ transform: `rotate(${pageRecord.rotation}deg)` }} /><div><strong>Page {index + 1}</strong><small>{pageRecord.filter === "enhanced" ? "Magic Color" : FILTER_OPTIONS.find((filter) => filter.id === pageRecord.filter)?.label}</small></div><span><button type="button" aria-label={`Move page ${index + 1} up`} disabled={index === 0} onClick={(event) => { event.stopPropagation(); setPages((items) => moveScanPage(items, index, index - 1)); }}><ArrowUp size={15} /></button><button type="button" aria-label={`Move page ${index + 1} down`} disabled={index === pages.length - 1} onClick={(event) => { event.stopPropagation(); setPages((items) => moveScanPage(items, index, index + 1)); }}><ArrowDown size={15} /></button><button type="button" aria-label={`Retake page ${index + 1}`} onClick={(event) => { event.stopPropagation(); beginRetake(index); }}><RefreshCcw size={15} /></button><button type="button" aria-label={`Rotate page ${index + 1}`} onClick={(event) => { event.stopPropagation(); setPages((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, rotation: nextScanRotation(item.rotation) } : item)); }}><RotateCw size={15} /></button><button type="button" aria-label={`Remove page ${index + 1}`} onClick={(event) => { event.stopPropagation(); removePage(index); }}><Trash2 size={15} /></button></span></li>)}</ol>
      </section>}
    </section><aside className="conversion-settings-card"><span>{isSearchable ? "OCR output" : "PDF output"}</span>{isSearchable ? <FileSearch size={25} /> : <Images size={25} />}<h2>{isSearchable ? "Searchable English text" : "Deskewed document pages"}</h2>{!isSearchable && <label className="conversion-field"><span>Paper size</span><select value={pageSize} onChange={(event) => setPageSize(event.target.value)}><option value="auto">Auto (A4 or Letter)</option><option value="a4">A4</option><option value="letter">Letter</option></select></label>}<div className="conversion-summary"><Check size={18} /><span>{pages.length ? `${pages.length} corrected page${pages.length === 1 ? "" : "s"} ready` : "Add or capture a page to continue"}</span></div>
      {status === "working" && <><div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div><p className="ocr-status">{isSearchable ? "Recognizing and building…" : "Building your PDF…"} {progress}%</p></>}
      <button className="conversion-primary-action" type="button" disabled={!pages.length || status === "working" || Boolean(pending)} onClick={createPdf}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Processing…</> : <><Download size={18} /> {isSearchable ? "Run OCR and download PDF" : "Create and download PDF"}</>}</button>{status === "complete" && <p className="conversion-success">Your scanned PDF was downloaded.</p>}
    </aside></div>
    <section className="conversion-privacy-note"><ShieldCheck size={19} /><div><strong>Private browser processing</strong><p>Camera frames, page photos, detected corners, recognized text, and PDF output stay on this device. Nothing is uploaded by the scanner.</p></div></section>
    <ToolGuideContent tool={tool} />
  </main>;
}
