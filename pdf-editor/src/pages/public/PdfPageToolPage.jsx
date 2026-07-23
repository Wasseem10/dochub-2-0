import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down.mjs";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Copy from "lucide-react/dist/esm/icons/copy.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical.mjs";
import Hash from "lucide-react/dist/esm/icons/hash.mjs";
import ImageIcon from "lucide-react/dist/esm/icons/image.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import Undo2 from "lucide-react/dist/esm/icons/undo-2.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { createStoredZip } from "../../tools/imageConversion.js";
import { compressionSavings, compressPdfPreservingStructure, createCompressedPdfFromJpegs, PDF_COMPRESSION_PRESETS } from "../../tools/pdfCompression.js";
import { cropPdfPages } from "../../tools/pdfCrop.js";
import { addPageNumbersToPdf, buildPdfFromPagePlan, extractPdfPages, inspectPdfBytes, mergePdfDocuments, PAGE_TOOL_LIMITS, parsePageRanges, splitPdfByRanges } from "../../tools/pdfPageOperations.js";
import { addWatermarkToPdf } from "../../tools/pdfWatermark.js";
import { ExportSuccessState } from "../../components/public/ExportSuccessState.jsx";
import { beginToolOperation, pageCountBucket, trackProductEvent, trackToolUpload, trackUploadValidationFailure } from "../../analytics/productAnalytics.js";
import { toolSeoSchemas } from "../../tools/toolSeoSchemas.js";

async function loadPdfRenderer() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjsLib;
}

async function renderCompressionPreview(bytes) {
  const pdfjsLib = await loadPdfRenderer();
  const documentProxy = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  try {
    const page = await documentProxy.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1, 520 / Math.max(1, base.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, background: "#ffffff" }).promise;
    page.cleanup?.();
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    await documentProxy.destroy?.();
  }
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBytes(bytes, type, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  const toolId = window.location.pathname.split("/").filter(Boolean).at(-1) || "pdf-page-tool";
  trackProductEvent("result_downloaded", { toolId });
  if (type === "application/pdf") trackProductEvent("pdf_downloaded", { toolId });
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function friendlyPdfError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (error?.name === "PasswordException" || message.includes("encrypted") || message.includes("password")) return "This PDF is encrypted. Use an authorized password-removal workflow before organizing it.";
  if (message.includes("invalid pdf") || message.includes("missing pdf") || message.includes("no pdf header") || message.includes("parse pdf")) return "This PDF appears corrupted or incomplete. Try downloading a fresh copy.";
  return error?.message || "FixThatPDF could not read this PDF. Try a valid, unencrypted file under 50 MB.";
}

function PdfDropzone({ multiple, onFiles, disabled, label }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  return <div className={`conversion-dropzone page-tool-dropzone ${dragging ? "is-dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); onFiles(event.dataTransfer.files); }}>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple={multiple} onChange={(event) => { onFiles(event.target.files); event.target.value = ""; }} />
    <span><Upload size={27} /></span><h2>{label}</h2><p>Valid, unencrypted PDFs up to 50 MB each. Processing stays in this browser.</p>
    <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>Choose {multiple ? "PDFs" : "a PDF"}</button>
  </div>;
}

function MergeWorkspace({ tool }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);

  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setError("");
    if (files.length + incoming.length > PAGE_TOOL_LIMITS.maxFiles) { trackUploadValidationFailure(tool.id, "too_many_files"); return setError(`Merge no more than ${PAGE_TOOL_LIMITS.maxFiles} PDFs at once.`); }
    if (incoming.some((file) => file.size > PAGE_TOOL_LIMITS.maxFileBytes)) { trackUploadValidationFailure(tool.id, "file_too_large"); return setError("Each PDF must be under 50 MB."); }
    if (incoming.some((file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) { trackUploadValidationFailure(tool.id, "wrong_file_type"); return setError("Only PDF files can be merged."); }
    setStatus("reading");
    try {
      const records = [];
      for (const file of incoming) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const details = await inspectPdfBytes(bytes);
        if (details.pageCount > PAGE_TOOL_LIMITS.maxPages) throw new Error(`${file.name} exceeds the ${PAGE_TOOL_LIMITS.maxPages}-page limit.`);
        trackToolUpload(tool.id, file, { pageCount: details.pageCount });
        records.push({ id: makeId("merge-file"), name: file.name, size: file.size, bytes, pageCount: details.pageCount });
      }
      setFiles((current) => [...current, ...records]);
    } catch (readError) {
      trackUploadValidationFailure(tool.id, "invalid_pdf");
      setError(friendlyPdfError(readError));
    } finally {
      setStatus("idle");
    }
  };

  const move = (from, to) => {
    if (from === to || to < 0 || to >= files.length) return;
    setFiles((current) => { const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });
  };

  const merge = async () => {
    setStatus("working"); setError("");
    const operation = beginToolOperation(tool.id, { operation: "merge" });
    try {
      const bytes = await mergePdfDocuments(files);
      downloadBytes(bytes, "application/pdf", "merged-realpdf.pdf");
      operation.succeed({ pageCountBucket: pageCountBucket(files.reduce((sum, file) => sum + file.pageCount, 0)) });
      setStatus("complete");
    } catch (mergeError) { operation.fail("pdf_processing"); setError(friendlyPdfError(mergeError)); setStatus("idle"); }
  };

  return <div className="conversion-workspace-grid"><section><PdfDropzone multiple label="Drop PDFs to merge" onFiles={addFiles} disabled={status === "working"} />{error && <div className="conversion-error" role="alert">{error}</div>}{files.length > 0 && <div className="merge-file-list">{files.map((file, index) => <article key={file.id} draggable className={draggedIndex === index ? "is-dragging" : ""} onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedIndex !== null) move(draggedIndex, index); setDraggedIndex(null); }} onDragEnd={() => setDraggedIndex(null)}><GripVertical size={18} /><span>{index + 1}</span><div><strong>{file.name}</strong><small>{file.pageCount} page{file.pageCount === 1 ? "" : "s"} · {formatBytes(file.size)}</small></div><button type="button" onClick={() => move(index, index - 1)} disabled={!index} aria-label={`Move ${file.name} up`}><ArrowUp size={16} /></button><button type="button" onClick={() => move(index, index + 1)} disabled={index === files.length - 1} aria-label={`Move ${file.name} down`}><ArrowDown size={16} /></button><button type="button" onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))} aria-label={`Remove ${file.name}`}><Trash2 size={16} /></button></article>)}</div>}</section><aside className="conversion-settings-card"><span>Merge order</span><h2>Combine complete PDFs</h2><p className="page-tool-help">Drag files into order. Pages inside each PDF retain their native text, vectors, dimensions, and rotation.</p><div className="conversion-summary"><Check size={18} /><span>{files.length >= 2 ? `${files.length} PDFs ready · ${files.reduce((sum, file) => sum + file.pageCount, 0)} pages` : "Add at least two PDFs"}</span></div><button className="conversion-primary-action" type="button" disabled={files.length < 2 || status === "working"} onClick={merge}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Merging...</> : <><Download size={18} /> Download merged PDF</>}</button>{status === "complete" && <ExportSuccessState toolId={tool.id} onDownloadAgain={merge} onStartAnother={() => { setFiles([]); setStatus("idle"); }} relatedRoute="/split-pdf" relatedName="Split PDF" />}</aside></div>;
}

function PageNumberWorkspace({ tool }) {
  const [file, setFile] = useState(null);
  const [bytes, setBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [position, setPosition] = useState("bottom-center");
  const [startAt, setStartAt] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const loadPdf = async (fileList) => {
    const nextFile = Array.from(fileList || [])[0];
    if (!nextFile) return;
    setError("");
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) { trackUploadValidationFailure(tool.id, "wrong_file_type"); return setError("Choose a PDF file."); }
    if (nextFile.size > PAGE_TOOL_LIMITS.maxFileBytes) { trackUploadValidationFailure(tool.id, "file_too_large"); return setError("PDFs must be under 50 MB."); }
    setStatus("reading");
    try {
      const nextBytes = new Uint8Array(await nextFile.arrayBuffer());
      const details = await inspectPdfBytes(nextBytes);
      if (details.pageCount > PAGE_TOOL_LIMITS.maxPages) throw new Error(`This PDF has ${details.pageCount} pages. The limit is ${PAGE_TOOL_LIMITS.maxPages}.`);
      setFile(nextFile);
      setBytes(nextBytes);
      setPageCount(details.pageCount);
    } catch (readError) {
      setError(friendlyPdfError(readError));
      setFile(null);
      setBytes(null);
      setPageCount(0);
    } finally {
      setStatus("idle");
    }
  };

  const exportNumberedPdf = async () => {
    if (!file || !bytes) return;
    setStatus("working");
    setError("");
    try {
      const output = await addPageNumbersToPdf(bytes, { position, startAt, fontSize });
      const baseName = file.name.replace(/\.pdf$/i, "") || "document";
      downloadBytes(output, "application/pdf", `${baseName}-numbered.pdf`);
      setStatus("complete");
    } catch (exportError) {
      setError(friendlyPdfError(exportError));
      setStatus("idle");
    }
  };

  return <div className="conversion-workspace-grid"><section><PdfDropzone multiple={false} label="Drop a PDF to number its pages" onFiles={loadPdf} disabled={status === "reading" || status === "working"} />{status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading PDF...</div>}{error && <div className="conversion-error" role="alert">{error}</div>}{file && <article className="page-number-file-card"><Hash size={21} /><div><strong>{file.name}</strong><small>{pageCount} page{pageCount === 1 ? "" : "s"} · {formatBytes(file.size)}</small></div></article>}</section><aside className="conversion-settings-card"><span>Page number settings</span><h2>Choose the number style</h2><label>Position<select value={position} onChange={(event) => setPosition(event.target.value)}><option value="bottom-left">Bottom left</option><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option><option value="top-left">Top left</option><option value="top-center">Top center</option><option value="top-right">Top right</option></select></label><label>Start at<input type="number" min="0" max="999999" value={startAt} onChange={(event) => setStartAt(Number(event.target.value))} /></label><label>Text size<select value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))}><option value="10">Small</option><option value="12">Medium</option><option value="16">Large</option></select></label><div className="conversion-summary"><Check size={18} /><span>{file ? `${pageCount} page${pageCount === 1 ? "" : "s"} ready` : "Upload a PDF to continue"}</span></div><button className="conversion-primary-action" type="button" disabled={!file || status === "working" || status === "reading"} onClick={exportNumberedPdf}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Adding numbers...</> : <><Download size={18} /> Download numbered PDF</>}</button>{status === "complete" && <ExportSuccessState toolId={tool.id} onDownloadAgain={exportNumberedPdf} onStartAnother={() => { setFile(null); setBytes(null); setPageCount(0); setStatus("idle"); }} relatedRoute="/organize-pdf" relatedName="Organize PDF" />}</aside></div>;
}

function WatermarkWorkspace({ tool }) {
  const [file, setFile] = useState(null);
  const [sourceBytes, setSourceBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [kind, setKind] = useState("text");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkImage, setWatermarkImage] = useState(null);
  const [layout, setLayout] = useState("single");
  const [position, setPosition] = useState("center");
  const [opacity, setOpacity] = useState(28);
  const [rotation, setRotation] = useState(-35);
  const [fontSize, setFontSize] = useState(42);
  const [color, setColor] = useState("#2851eb");
  const [imageScale, setImageScale] = useState(30);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const loadPdf = async (fileList) => {
    const nextFile = Array.from(fileList || [])[0];
    if (!nextFile) return;
    setError("");
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) return setError("Choose a PDF file.");
    if (nextFile.size > PAGE_TOOL_LIMITS.maxFileBytes) return setError("PDFs must be under 50 MB.");
    setStatus("reading");
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const details = await inspectPdfBytes(bytes);
      if (details.pageCount > PAGE_TOOL_LIMITS.maxPages) throw new Error(`This PDF has ${details.pageCount} pages. The limit is ${PAGE_TOOL_LIMITS.maxPages}.`);
      setFile(nextFile);
      setSourceBytes(bytes);
      setPageCount(details.pageCount);
      setSelectedPages(new Set(Array.from({ length: details.pageCount }, (_, index) => index)));
    } catch (loadError) {
      setFile(null); setSourceBytes(null); setPageCount(0); setSelectedPages(new Set());
      setError(friendlyPdfError(loadError));
    } finally { setStatus("idle"); }
  };

  const loadWatermarkImage = async (event) => {
    const nextFile = event.target.files?.[0];
    event.target.value = "";
    if (!nextFile) return;
    if (!/^image\/(png|jpeg)$/.test(nextFile.type) && !/\.(png|jpe?g)$/i.test(nextFile.name)) return setError("Choose a PNG or JPG watermark image.");
    if (nextFile.size > 5 * 1024 * 1024) return setError("Watermark images must be under 5 MB.");
    setWatermarkImage({ bytes: new Uint8Array(await nextFile.arrayBuffer()), mimeType: nextFile.type, name: nextFile.name });
    setError("");
  };

  const togglePage = (pageIndex) => setSelectedPages((current) => {
    const next = new Set(current);
    if (next.has(pageIndex)) next.delete(pageIndex); else next.add(pageIndex);
    return next;
  });

  const exportWatermarkedPdf = async () => {
    if (!sourceBytes || !file) return;
    setStatus("working"); setError("");
    try {
      const output = await addWatermarkToPdf(sourceBytes, {
        kind,
        text: watermarkText,
        imageBytes: watermarkImage?.bytes,
        imageMimeType: watermarkImage?.mimeType,
        selectedPages: [...selectedPages],
        layout,
        position,
        opacity: opacity / 100,
        rotation,
        fontSize,
        color,
        imageScale: imageScale / 100,
      });
      downloadBytes(output, "application/pdf", `${file.name.replace(/\.pdf$/i, "") || "document"}-watermarked.pdf`);
      setStatus("complete");
    } catch (exportError) { setError(friendlyPdfError(exportError)); setStatus("idle"); }
  };

  const allPagesSelected = pageCount > 0 && selectedPages.size === pageCount;
  const canDownload = Boolean(file && selectedPages.size && (kind === "text" ? watermarkText.trim() : watermarkImage));
  return <div className="conversion-workspace-grid"><section><PdfDropzone multiple={false} label="Drop a PDF to watermark" onFiles={loadPdf} disabled={status === "reading" || status === "working"} />{status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading PDF...</div>}{error && <div className="conversion-error" role="alert">{error}</div>}{file && <article className="page-number-file-card watermark-file-card"><ImageIcon size={21} /><div><strong>{file.name}</strong><small>{pageCount} page{pageCount === 1 ? "" : "s"} · {formatBytes(file.size)}</small></div></article>}{pageCount > 0 && <section className="watermark-page-selector"><header><strong>Apply to pages</strong><button type="button" onClick={() => setSelectedPages(allPagesSelected ? new Set() : new Set(Array.from({ length: pageCount }, (_, index) => index)))}>{allPagesSelected ? "Clear all" : "Select all"}</button></header><div>{Array.from({ length: pageCount }, (_, index) => <label key={index}><input type="checkbox" checked={selectedPages.has(index)} onChange={() => togglePage(index)} /> Page {index + 1}</label>)}</div></section>}</section><aside className="conversion-settings-card watermark-settings"><span>Watermark settings</span><h2>Make it unmistakable</h2><label>Watermark type<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="text">Text</option><option value="image">PNG or JPG image</option></select></label>{kind === "text" ? <><label>Text<input value={watermarkText} maxLength="120" onChange={(event) => setWatermarkText(event.target.value)} placeholder="CONFIDENTIAL" /></label><div className="watermark-inline-fields"><label>Color<input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label><label>Text size<input type="number" min="8" max="144" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label></div></> : <label className="watermark-image-input"><span>Watermark image</span><input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={loadWatermarkImage} /><small>{watermarkImage ? watermarkImage.name : "PNG or JPG, up to 5 MB"}</small></label>}<label>Layout<select value={layout} onChange={(event) => setLayout(event.target.value)}><option value="single">One mark</option><option value="tile">Repeat across pages</option></select></label>{layout === "single" && <label>Position<select value={position} onChange={(event) => setPosition(event.target.value)}><option value="center">Center</option><option value="top-left">Top left</option><option value="top-center">Top center</option><option value="top-right">Top right</option><option value="bottom-left">Bottom left</option><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option></select></label>}<label>Opacity<input type="range" min="5" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /><small>{opacity}%</small></label><label>Rotation<input type="range" min="-180" max="180" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} /><small>{rotation}°</small></label>{kind === "image" && <label>Image scale<input type="range" min="6" max="90" value={imageScale} onChange={(event) => setImageScale(Number(event.target.value))} /><small>{imageScale}% of page width</small></label>}<div className="conversion-summary"><Check size={18} /><span>{file ? `${selectedPages.size} of ${pageCount} page${pageCount === 1 ? "" : "s"} selected` : "Upload a PDF to continue"}</span></div><button className="conversion-primary-action" type="button" disabled={!canDownload || status === "working" || status === "reading"} onClick={exportWatermarkedPdf}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Applying watermark...</> : <><Download size={18} /> Download watermarked PDF</>}</button>{status === "complete" && <ExportSuccessState toolId={tool.id} onDownloadAgain={exportWatermarkedPdf} onStartAnother={() => { setFile(null); setSourceBytes(null); setPageCount(0); setSelectedPages(new Set()); setStatus("idle"); }} relatedRoute="/organize-pdf" relatedName="Organize PDF" />}</aside></div>;
}

function CropWorkspace({ tool }) {
  const [file, setFile] = useState(null);
  const [sourceBytes, setSourceBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [top, setTop] = useState(0);
  const [right, setRight] = useState(0);
  const [bottom, setBottom] = useState(0);
  const [left, setLeft] = useState(0);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const loadPdf = async (fileList) => {
    const nextFile = Array.from(fileList || [])[0];
    if (!nextFile) return;
    setError("");
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) return setError("Choose a PDF file.");
    if (nextFile.size > PAGE_TOOL_LIMITS.maxFileBytes) return setError("PDFs must be under 50 MB.");
    setStatus("reading");
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const details = await inspectPdfBytes(bytes);
      if (details.pageCount > PAGE_TOOL_LIMITS.maxPages) throw new Error(`This PDF has ${details.pageCount} pages. The limit is ${PAGE_TOOL_LIMITS.maxPages}.`);
      setFile(nextFile);
      setSourceBytes(bytes);
      setPageCount(details.pageCount);
      setSelectedPages(new Set(Array.from({ length: details.pageCount }, (_, index) => index)));
    } catch (loadError) {
      setFile(null); setSourceBytes(null); setPageCount(0); setSelectedPages(new Set());
      setError(friendlyPdfError(loadError));
    } finally { setStatus("idle"); }
  };

  const updateMargin = (setter) => (event) => setter(Math.max(0, Math.min(45, Number(event.target.value))));
  const togglePage = (pageIndex) => setSelectedPages((current) => {
    const next = new Set(current);
    if (next.has(pageIndex)) next.delete(pageIndex); else next.add(pageIndex);
    return next;
  });
  const setPreset = (value) => { setTop(value); setRight(value); setBottom(value); setLeft(value); };
  const exportCroppedPdf = async () => {
    if (!sourceBytes || !file) return;
    setStatus("working"); setError("");
    try {
      const output = await cropPdfPages(sourceBytes, { selectedPages: [...selectedPages], top, right, bottom, left });
      downloadBytes(output, "application/pdf", `${file.name.replace(/\.pdf$/i, "") || "document"}-cropped.pdf`);
      setStatus("complete");
    } catch (cropError) { setError(friendlyPdfError(cropError)); setStatus("idle"); }
  };

  const allPagesSelected = pageCount > 0 && selectedPages.size === pageCount;
  const margins = [{ label: "Top", value: top, set: setTop }, { label: "Right", value: right, set: setRight }, { label: "Bottom", value: bottom, set: setBottom }, { label: "Left", value: left, set: setLeft }];
  return <div className="conversion-workspace-grid"><section><PdfDropzone multiple={false} label="Drop a PDF to crop" onFiles={loadPdf} disabled={status === "reading" || status === "working"} />{status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading PDF...</div>}{error && <div className="conversion-error" role="alert">{error}</div>}{file && <article className="page-number-file-card"><strong>{file.name}</strong><small>{pageCount} page{pageCount === 1 ? "" : "s"} · {formatBytes(file.size)}</small></article>}{pageCount > 0 && <section className="watermark-page-selector"><header><strong>Crop these pages</strong><button type="button" onClick={() => setSelectedPages(allPagesSelected ? new Set() : new Set(Array.from({ length: pageCount }, (_, index) => index)))}>{allPagesSelected ? "Clear all" : "Select all"}</button></header><div>{Array.from({ length: pageCount }, (_, index) => <label key={index}><input type="checkbox" checked={selectedPages.has(index)} onChange={() => togglePage(index)} /> Page {index + 1}</label>)}</div></section>}</section><aside className="conversion-settings-card crop-settings"><span>Crop settings</span><h2>Trim the edges</h2><p className="page-tool-help">Choose how much to remove from each edge. Values are a percentage of the current visible page. The original source stays unchanged.</p><div className="crop-presets"><button type="button" onClick={() => setPreset(0)}>No trim</button><button type="button" onClick={() => setPreset(5)}>Trim 5%</button><button type="button" onClick={() => setPreset(10)}>Trim 10%</button></div><div className="crop-margin-grid">{margins.map((margin) => <label key={margin.label}>{margin.label}<input type="number" min="0" max="45" value={margin.value} onChange={updateMargin(margin.set)} /><small>{margin.value}%</small></label>)}</div><div className="conversion-summary"><Check size={18} /><span>{file ? `${selectedPages.size} of ${pageCount} page${pageCount === 1 ? "" : "s"} selected` : "Upload a PDF to continue"}</span></div><button className="conversion-primary-action" type="button" disabled={!file || !selectedPages.size || status === "working" || status === "reading"} onClick={exportCroppedPdf}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Cropping PDF...</> : <><Download size={18} /> Download cropped PDF</>}</button>{status === "complete" && <ExportSuccessState toolId={tool.id} onDownloadAgain={exportCroppedPdf} onStartAnother={() => { setFile(null); setSourceBytes(null); setPageCount(0); setSelectedPages(new Set()); setStatus("idle"); }} relatedRoute="/organize-pdf" relatedName="Organize PDF" />}</aside></div>;
}

function LegacyCompressWorkspace({ tool }) {
  const [file, setFile] = useState(null);
  const [sourceBytes, setSourceBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [preset, setPreset] = useState("balanced");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [resultSize, setResultSize] = useState(0);
  const [error, setError] = useState("");
  const options = {
    balanced: { label: "Balanced — preserve PDF features", structurePreserving: true },
    lossless: { label: "Preserve quality — lossless cleanup", structurePreserving: true },
    maximum: { label: "Maximum — flatten pages", scale: 0.85, quality: 0.48, structurePreserving: false },
  };

  const loadPdf = async (fileList) => {
    const nextFile = Array.from(fileList || [])[0];
    if (!nextFile) return;
    setError(""); setResultSize(0);
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) { trackUploadValidationFailure(tool.id, "wrong_file_type"); return setError("Choose a PDF file."); }
    if (nextFile.size > PAGE_TOOL_LIMITS.maxFileBytes) { trackUploadValidationFailure(tool.id, "file_too_large"); return setError("PDFs must be under 50 MB."); }
    setStatus("reading");
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const details = await inspectPdfBytes(bytes);
      if (details.pageCount > PAGE_TOOL_LIMITS.maxPages) throw new Error(`This PDF has ${details.pageCount} pages. The limit is ${PAGE_TOOL_LIMITS.maxPages}.`);
      trackToolUpload(tool.id, nextFile, { pageCount: details.pageCount });
      setFile(nextFile); setSourceBytes(bytes); setPageCount(details.pageCount);
    } catch (loadError) { trackUploadValidationFailure(tool.id, "invalid_pdf"); setFile(null); setSourceBytes(null); setPageCount(0); setError(friendlyPdfError(loadError)); }
    finally { setStatus("idle"); }
  };

  const compressPdf = async () => {
    if (!sourceBytes || !file) return;
    setStatus("working"); setProgress(0); setError(""); setResultSize(0);
    const operation = beginToolOperation(tool.id, { operation: "compress", slowAfterMs: 15000 });
    try {
      const config = options[preset];
      let output;
      if (config.structurePreserving) {
        setProgress(25);
        output = await compressPdfPreservingStructure(sourceBytes.slice(0), preset);
        setProgress(100);
      } else {
        const pdfjsLib = await loadPdfRenderer();
        const source = await pdfjsLib.getDocument({ data: sourceBytes.slice(0) }).promise;
        const pages = [];
        for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
          const page = await source.getPage(pageNumber);
          const outputViewport = page.getViewport({ scale: 1 });
          const renderViewport = page.getViewport({ scale: config.scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(renderViewport.width));
          canvas.height = Math.max(1, Math.round(renderViewport.height));
          await page.render({ canvasContext: canvas.getContext("2d"), viewport: renderViewport }).promise;
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", config.quality));
          if (!blob) throw new Error("A page could not be prepared for compression.");
          pages.push({ jpegBytes: new Uint8Array(await blob.arrayBuffer()), width: outputViewport.width, height: outputViewport.height });
          setProgress(Math.round((pageNumber / source.numPages) * 100));
        }
        await source.destroy?.();
        output = await createCompressedPdfFromJpegs(pages);
      }
      if (output.length >= sourceBytes.length) throw new Error(config.structurePreserving
        ? "This PDF is already optimized with its features intact. Try Maximum compression only if a flattened visual copy is acceptable."
        : "This PDF is already as small as the Maximum compression result. Keep the original PDF.");
      downloadBytes(output, "application/pdf", `${file.name.replace(/\.pdf$/i, "") || "document"}-compressed.pdf`);
      operation.succeed({ result: preset, pageCountBucket: pageCountBucket(pageCount) });
      setResultSize(output.length); setStatus("complete");
    } catch (compressionError) {
      operation.fail("pdf_processing", { result: preset });
      const message = String(compressionError?.message || "");
      setError(message.startsWith("This PDF is already") ? message : friendlyPdfError(compressionError));
      setStatus("idle");
    }
  };

  const preservesStructure = options[preset].structurePreserving;
  return (
    <div className="conversion-workspace-grid">
      <section>
        <PdfDropzone multiple={false} label="Drop a PDF to compress" onFiles={loadPdf} disabled={status === "reading" || status === "working"} />
        {status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading PDF...</div>}
        {status === "working" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Compressing PDF... {progress}%</div>}
        {error && <div className="conversion-error" role="alert">{error}</div>}
        {file && <article className="page-number-file-card"><strong>{file.name}</strong><small>{pageCount} page{pageCount === 1 ? "" : "s"} · {formatBytes(file.size)}</small></article>}
      </section>
      <aside className="conversion-settings-card">
        <span>Compression settings</span>
        <h2>Make PDFs lighter</h2>
        <p className="page-tool-help">Balanced and Preserve quality keep selectable text, links, form fields, vectors, and page structure. Maximum can shrink image-heavy files further by flattening every page.</p>
        <label>Compression level<select value={preset} onChange={(event) => setPreset(event.target.value)}>{Object.entries(options).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}</select></label>
        <div className="office-mode-note"><strong>{preservesStructure ? "Document features stay intact" : "Smallest visual copy"}</strong><p>{preservesStructure ? "Your PDF is rewritten without turning its pages into pictures. Existing digital signatures should be revalidated after any PDF compression." : "Maximum compression removes searchable text, links, forms, layers, and accessibility structure. Use it only when file size matters more than editing or searching."}</p></div>
        <div className="conversion-summary"><Check size={18} /><span>{!file ? "Upload a PDF to continue" : resultSize ? `${formatBytes(file.size)} → ${formatBytes(resultSize)}` : `${pageCount} page${pageCount === 1 ? "" : "s"} ready`}</span></div>
        <button className="conversion-primary-action" type="button" disabled={!file || status === "working" || status === "reading"} onClick={compressPdf}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Compressing...</> : <><Download size={18} /> Download compressed PDF</>}</button>
        {status === "complete" && <ExportSuccessState toolId={tool.id} onDownloadAgain={compressPdf} onStartAnother={() => { setFile(null); setSourceBytes(null); setPageCount(0); setResultSize(0); setStatus("idle"); }} relatedRoute="/organize-pdf" relatedName="Organize PDF" />}
      </aside>
    </div>
  );
}

function CompressWorkspace({ tool }) {
  const [files, setFiles] = useState([]);
  const [preset, setPreset] = useState("balanced");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const selectedPreset = PDF_COMPRESSION_PRESETS[preset];
  const totalPages = files.reduce((sum, file) => sum + file.pageCount, 0);
  const successfulResults = results.filter((result) => result.status === "success");
  const totalOriginalBytes = successfulResults.reduce((sum, result) => sum + result.metrics.originalBytes, 0);
  const totalCompressedBytes = successfulResults.reduce((sum, result) => sum + result.metrics.compressedBytes, 0);
  const totalMetrics = compressionSavings(totalOriginalBytes, totalCompressedBytes);

  const reset = () => {
    setFiles([]);
    setResults([]);
    setPreview(null);
    setProgress(0);
    setError("");
    setStatus("idle");
  };

  const loadPdfs = async (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setError("");
    setResults([]);
    setPreview(null);
    if (incoming.length > PAGE_TOOL_LIMITS.maxFiles) {
      trackUploadValidationFailure(tool.id, "too_many_files");
      setError(`Compress no more than ${PAGE_TOOL_LIMITS.maxFiles} PDFs at once.`);
      return;
    }
    if (incoming.some((file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) {
      trackUploadValidationFailure(tool.id, "wrong_file_type");
      setError("Choose PDF files only.");
      return;
    }
    if (incoming.some((file) => file.size > PAGE_TOOL_LIMITS.maxFileBytes)) {
      trackUploadValidationFailure(tool.id, "file_too_large");
      setError("Each PDF must be under 50 MB.");
      return;
    }
    setStatus("reading");
    try {
      const loaded = [];
      for (const nextFile of incoming) {
        const bytes = new Uint8Array(await nextFile.arrayBuffer());
        const details = await inspectPdfBytes(bytes);
        if (details.pageCount > PAGE_TOOL_LIMITS.maxPages) {
          throw new Error(`${nextFile.name} has ${details.pageCount} pages. The limit is ${PAGE_TOOL_LIMITS.maxPages}.`);
        }
        trackToolUpload(tool.id, nextFile, { pageCount: details.pageCount });
        loaded.push({ id: makeId("compress"), file: nextFile, bytes, pageCount: details.pageCount });
      }
      setFiles(loaded);
      if (loaded[0]) {
        setPreview({
          fileId: loaded[0].id,
          fileName: loaded[0].file.name,
          original: await renderCompressionPreview(loaded[0].bytes),
          compressed: "",
        });
      }
    } catch (loadError) {
      trackUploadValidationFailure(tool.id, "invalid_pdf");
      setFiles([]);
      setError(friendlyPdfError(loadError));
    } finally {
      setStatus("idle");
    }
  };

  const compressRecord = async (record, config, fileIndex) => {
    const updateFileProgress = (value) => {
      const completed = (fileIndex + Math.max(0, Math.min(100, value)) / 100) / files.length;
      setProgress(Math.round(completed * 100));
    };
    if (config.structurePreserving) {
      updateFileProgress(20);
      const output = await compressPdfPreservingStructure(record.bytes.slice(0), preset);
      updateFileProgress(100);
      return output;
    }
    const pdfjsLib = await loadPdfRenderer();
    const source = await pdfjsLib.getDocument({ data: record.bytes.slice(0) }).promise;
    try {
      const renderedPages = [];
      for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
        const page = await source.getPage(pageNumber);
        const outputViewport = page.getViewport({ scale: 1 });
        const renderViewport = page.getViewport({ scale: config.scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(renderViewport.width));
        canvas.height = Math.max(1, Math.round(renderViewport.height));
        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport: renderViewport, background: "#ffffff" }).promise;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", config.quality));
        page.cleanup?.();
        if (!blob) throw new Error("A page could not be prepared for compression.");
        renderedPages.push({
          jpegBytes: new Uint8Array(await blob.arrayBuffer()),
          width: outputViewport.width,
          height: outputViewport.height,
        });
        updateFileProgress(pageNumber / source.numPages * 100);
      }
      return createCompressedPdfFromJpegs(renderedPages);
    } finally {
      await source.destroy?.();
    }
  };

  const showResultPreview = async (result) => {
    const source = files.find((file) => file.id === result.fileId);
    if (!source || result.status !== "success") return;
    setPreview({
      fileId: source.id,
      fileName: source.file.name,
      original: await renderCompressionPreview(source.bytes),
      compressed: await renderCompressionPreview(result.output),
    });
  };

  const compressPdfs = async () => {
    if (!files.length) return;
    setStatus("working");
    setProgress(0);
    setError("");
    setResults([]);
    const operation = beginToolOperation(tool.id, { operation: "compress", slowAfterMs: 15000 });
    try {
      const nextResults = [];
      for (const [index, record] of files.entries()) {
        try {
          const output = await compressRecord(record, selectedPreset, index);
          const metrics = compressionSavings(record.bytes.length, output.length);
          if (!metrics.smaller) {
            nextResults.push({
              fileId: record.id,
              fileName: record.file.name,
              status: "skipped",
              message: selectedPreset.structurePreserving
                ? "Already optimized with PDF features intact. Try Maximum reduction only if a flattened copy is acceptable."
                : "The original is already smaller than the flattened result.",
              metrics,
            });
          } else {
            nextResults.push({
              fileId: record.id,
              fileName: record.file.name,
              outputName: `${record.file.name.replace(/\.pdf$/i, "") || "document"}-compressed.pdf`,
              status: "success",
              output,
              metrics,
            });
          }
        } catch (compressionError) {
          nextResults.push({
            fileId: record.id,
            fileName: record.file.name,
            status: "error",
            message: friendlyPdfError(compressionError),
          });
        }
      }
      setResults(nextResults);
      const downloadable = nextResults.filter((result) => result.status === "success");
      if (!downloadable.length) {
        operation.fail("no_smaller_output", { result: preset });
        setError("None of these PDFs produced a smaller result. Keep the originals or choose a different compression level.");
        setStatus("idle");
        return;
      }
      await showResultPreview(downloadable[0]);
      if (downloadable.length === 1 && files.length === 1) {
        downloadBytes(downloadable[0].output, "application/pdf", downloadable[0].outputName);
      } else {
        downloadBytes(
          createStoredZip(downloadable.map((result) => ({ name: result.outputName, data: result.output }))),
          "application/zip",
          "fixthatpdf-compressed.zip",
        );
      }
      operation.succeed({ result: preset, pageCountBucket: pageCountBucket(totalPages), batchSize: files.length });
      setProgress(100);
      setStatus("complete");
    } catch (compressionError) {
      operation.fail("pdf_processing", { result: preset });
      setError(friendlyPdfError(compressionError));
      setStatus("idle");
    }
  };

  return (
    <>
      <div className="conversion-workspace-grid compression-workspace">
        <section>
          <PdfDropzone multiple label="Drop PDFs to compress" onFiles={loadPdfs} disabled={status === "reading" || status === "working"} />
          {status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading PDFs...</div>}
          {status === "working" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Compressing {files.length > 1 ? `${files.length} PDFs` : "PDF"}... {progress}%</div>}
          {files.length > 0 && <div className="compression-file-list">{files.map((record) => <article key={record.id}>
            <div><strong>{record.file.name}</strong><small>{record.pageCount} page{record.pageCount === 1 ? "" : "s"} · {formatBytes(record.file.size)}</small></div>
            <button type="button" aria-label={`Remove ${record.file.name}`} disabled={status === "working"} onClick={() => {
              setFiles((items) => items.filter((item) => item.id !== record.id));
              setResults([]);
              if (preview?.fileId === record.id) setPreview(null);
            }}><Trash2 size={16} /></button>
          </article>)}</div>}
          {results.length > 0 && <section className="compression-results" aria-label="Compression results">
            <header><strong>Measured results</strong><small>{successfulResults.length} smaller file{successfulResults.length === 1 ? "" : "s"}</small></header>
            {results.map((result) => <article key={result.fileId} className={`is-${result.status}`}>
              <div><strong>{result.fileName}</strong>{result.status === "success"
                ? <small>{formatBytes(result.metrics.originalBytes)} → {formatBytes(result.metrics.compressedBytes)} · {result.metrics.savedPercent.toFixed(1)}% smaller</small>
                : <small>{result.message}</small>}</div>
              {result.status === "success" && <button type="button" onClick={() => void showResultPreview(result)}>Preview</button>}
            </article>)}
          </section>}
          {error && <div className="conversion-error" role="alert">{error}</div>}
        </section>
        <aside className="conversion-settings-card compression-settings-card">
          <span>Compression settings</span>
          <h2>Make PDFs lighter</h2>
          <label>Compression level<select value={preset} disabled={status === "working"} onChange={(event) => {
            setPreset(event.target.value);
            setResults([]);
          }}>{Object.entries(PDF_COMPRESSION_PRESETS).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}</select></label>
          <div className="compression-preset-detail"><strong>{selectedPreset.impact}</strong><p>{selectedPreset.detail}</p></div>
          <div className="office-mode-note"><strong>{selectedPreset.structurePreserving ? "Document features stay intact" : "Flattened visual copy"}</strong><p>{selectedPreset.structurePreserving ? "Selectable text, links, forms, vectors, and page structure remain. Revalidate cryptographic signatures after changing the file." : "Every page becomes an image. Search, links, forms, layers, and accessibility tags are removed."}</p></div>
          <div className="conversion-summary"><Check size={18} /><span>{!files.length
            ? "Add up to 20 PDFs"
            : successfulResults.length
              ? `${formatBytes(totalOriginalBytes)} → ${formatBytes(totalCompressedBytes)} · ${totalMetrics.savedPercent.toFixed(1)}% smaller`
              : `${files.length} PDF${files.length === 1 ? "" : "s"} · ${totalPages} page${totalPages === 1 ? "" : "s"} ready`}</span></div>
          <button className="conversion-primary-action" type="button" disabled={!files.length || status === "working" || status === "reading"} onClick={compressPdfs}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Compressing {progress}%</> : <><Download size={18} /> {files.length > 1 ? "Compress and download ZIP" : "Download compressed PDF"}</>}</button>
          {status === "complete" && <ExportSuccessState toolId={tool.id} onDownloadAgain={compressPdfs} onStartAnother={reset} relatedRoute="/organize-pdf" relatedName="Organize PDF" />}
        </aside>
      </div>
      {preview && <section className="compression-preview" aria-label={`Compression preview for ${preview.fileName}`}>
        <header><div><span>Visual check</span><h2>Compare the first page</h2></div><small>{preview.fileName}</small></header>
        <div>
          <figure><figcaption>Original</figcaption><img src={preview.original} alt={`Original first page of ${preview.fileName}`} /></figure>
          <figure className={!preview.compressed ? "is-waiting" : ""}><figcaption>Compressed</figcaption>{preview.compressed ? <img src={preview.compressed} alt={`Compressed first page of ${preview.fileName}`} /> : <p>Compress the PDF to see the result beside the original.</p>}</figure>
        </div>
        <p>Preview checks appearance only. Also reopen the downloaded PDF to verify text selection, links, forms, and signatures when those features matter.</p>
      </section>}
    </>
  );
}

function SinglePdfWorkspace({ tool }) {
  const isSplit = tool.id === "split-pdf";
  const isExtract = tool.id === "extract-pdf-pages";
  const [file, setFile] = useState(null);
  const [sourceBytes, setSourceBytes] = useState(null);
  const [pages, setPages] = useState([]);
  const [plan, setPlan] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [ranges, setRanges] = useState("");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const previewUrlsRef = useRef([]);

  useEffect(() => () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const loadPdf = async (fileList) => {
    const nextFile = Array.from(fileList || [])[0];
    if (!nextFile) return;
    setError("");
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) { trackUploadValidationFailure(tool.id, "wrong_file_type"); return setError("Choose a PDF file."); }
    if (nextFile.size > PAGE_TOOL_LIMITS.maxFileBytes) { trackUploadValidationFailure(tool.id, "file_too_large"); return setError("PDFs must be under 50 MB."); }
    setStatus("reading"); setProgress(0);
    try {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); previewUrlsRef.current = [];
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const pdfjsLib = await loadPdfRenderer();
      const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      if (pdf.numPages > PAGE_TOOL_LIMITS.maxPages) throw new Error(`This PDF has ${pdf.numPages} pages. The limit is ${PAGE_TOOL_LIMITS.maxPages}.`);
      trackToolUpload(tool.id, nextFile, { pageCount: pdf.numPages });
      const pageRecords = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.32 });
        const canvas = document.createElement("canvas"); canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
        if (!blob) throw new Error("A page preview could not be created.");
        const previewUrl = URL.createObjectURL(blob); previewUrlsRef.current.push(previewUrl);
        pageRecords.push({ sourceIndex: pageNumber - 1, previewUrl, width: viewport.width, height: viewport.height });
        setProgress(Math.round((pageNumber / pdf.numPages) * 100));
      }
      const initialPlan = pageRecords.map((page) => ({ id: makeId("page-plan"), sourceIndex: page.sourceIndex, rotation: 0 }));
      setFile(nextFile); setSourceBytes(bytes); setPages(pageRecords); setPlan(initialPlan); setSelected(new Set(pageRecords.map((page) => page.sourceIndex))); setRanges(pdf.numPages > 1 ? `1-${Math.ceil(pdf.numPages / 2)}, ${Math.ceil(pdf.numPages / 2) + 1}-${pdf.numPages}` : "1"); setHistory([]);
    } catch (readError) { trackUploadValidationFailure(tool.id, "invalid_pdf"); setError(friendlyPdfError(readError)); setFile(null); setPages([]); setPlan([]); }
    finally { setStatus("idle"); }
  };

  const commitPlan = (next) => { setHistory((current) => [...current.slice(-19), plan]); setPlan(next); };
  const undo = () => { if (!history.length) return; setPlan(history[history.length - 1]); setHistory((current) => current.slice(0, -1)); };
  const move = (from, to) => { if (from === to || to < 0 || to >= plan.length) return; const next = [...plan]; const [item] = next.splice(from, 1); next.splice(to, 0, item); commitPlan(next); };
  const rotate = (id) => commitPlan(plan.map((item) => item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item));
  const remove = (id) => { if (plan.length <= 1) return setError("A PDF must keep at least one page."); commitPlan(plan.filter((item) => item.id !== id)); };
  const duplicate = (index) => { const item = plan[index]; commitPlan([...plan.slice(0, index + 1), { ...item, id: makeId("page-plan") }, ...plan.slice(index + 1)]); };
  const toggleSelected = (sourceIndex) => setSelected((current) => { const next = new Set(current); if (next.has(sourceIndex)) next.delete(sourceIndex); else next.add(sourceIndex); return next; });

  const exportResult = async () => {
    if (!sourceBytes || !file) return;
    setStatus("working"); setError("");
    const operation = beginToolOperation(tool.id, { operation: isSplit ? "split" : isExtract ? "extract" : "organize" });
    try {
      const baseName = file.name.replace(/\.pdf$/i, "") || "document";
      if (isSplit) {
        const groups = parsePageRanges(ranges, pages.length);
        const outputs = await splitPdfByRanges(sourceBytes, groups);
        if (outputs.length === 1) downloadBytes(outputs[0].bytes, "application/pdf", `${baseName}-${outputs[0].name}`);
        else downloadBytes(createStoredZip(outputs.map((output) => ({ name: output.name, data: output.bytes }))), "application/zip", `${baseName}-split.zip`);
      } else if (isExtract) {
        const indices = [...selected].sort((a, b) => a - b);
        if (!indices.length) throw new Error("Select at least one page to extract.");
        downloadBytes(await extractPdfPages(sourceBytes, indices), "application/pdf", `${baseName}-extracted.pdf`);
      } else {
        downloadBytes(await buildPdfFromPagePlan(sourceBytes, plan, `${tool.name} output`), "application/pdf", `${baseName}-organized.pdf`);
      }
      operation.succeed({ pageCountBucket: pageCountBucket(pages.length) });
      setStatus("complete");
    } catch (exportError) { operation.fail("pdf_processing"); setError(friendlyPdfError(exportError)); setStatus("idle"); }
  };

  const allSelected = pages.length > 0 && selected.size === pages.length;
  return <div className="conversion-workspace-grid"><section><PdfDropzone multiple={false} label={`Drop a PDF to ${isSplit ? "split" : isExtract ? "extract pages" : "organize"}`} onFiles={loadPdf} disabled={status === "reading" || status === "working"} />{status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading pages... {progress}%</div>}{error && <div className="conversion-error" role="alert">{error}</div>}{pages.length > 0 && <div className="page-organizer"><header><div><strong>{file.name}</strong><small>{pages.length} original page{pages.length === 1 ? "" : "s"} · {formatBytes(file.size)}</small></div>{isExtract ? <button type="button" onClick={() => setSelected(allSelected ? new Set() : new Set(pages.map((page) => page.sourceIndex)))}>{allSelected ? "Clear all" : "Select all"}</button> : !isSplit && <button type="button" disabled={!history.length} onClick={undo}><Undo2 size={16} /> Undo</button>}</header>{isSplit ? <div className="split-range-guide"><strong>Previewed pages</strong><div>{pages.map((page) => <span key={page.sourceIndex}><img src={page.previewUrl} alt={`Page ${page.sourceIndex + 1}`} /><small>{page.sourceIndex + 1}</small></span>)}</div></div> : isExtract ? <div className="extract-page-grid">{pages.map((page) => <label key={page.sourceIndex} className={selected.has(page.sourceIndex) ? "is-selected" : ""}><input type="checkbox" checked={selected.has(page.sourceIndex)} onChange={() => toggleSelected(page.sourceIndex)} /><img src={page.previewUrl} alt={`Page ${page.sourceIndex + 1}`} /><span>Page {page.sourceIndex + 1}</span></label>)}</div> : <div className="organizer-page-grid">{plan.map((item, index) => { const sourcePage = pages[item.sourceIndex]; return <article key={item.id} draggable className={draggedIndex === index ? "is-dragging" : ""} onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedIndex !== null) move(draggedIndex, index); setDraggedIndex(null); }} onDragEnd={() => setDraggedIndex(null)}><div className="organizer-page-preview"><img src={sourcePage.previewUrl} alt={`Output page ${index + 1}`} style={{ transform: `rotate(${item.rotation}deg)` }} /></div><strong>Page {index + 1}</strong><small>Original {item.sourceIndex + 1}{item.rotation ? ` · ${item.rotation}°` : ""}</small><footer><button type="button" onClick={() => move(index, index - 1)} disabled={!index} aria-label="Move page left"><ArrowUp size={15} /></button><button type="button" onClick={() => move(index, index + 1)} disabled={index === plan.length - 1} aria-label="Move page right"><ArrowDown size={15} /></button><button type="button" onClick={() => rotate(item.id)} aria-label="Rotate page"><RotateCw size={15} /></button><button type="button" onClick={() => duplicate(index)} aria-label="Duplicate page"><Copy size={15} /></button><button type="button" onClick={() => remove(item.id)} disabled={plan.length <= 1} aria-label="Delete page"><Trash2 size={15} /></button></footer></article>; })}</div>}</div>}</section><aside className="conversion-settings-card"><span>{isSplit ? "Split ranges" : isExtract ? "Page selection" : "Page organizer"}</span><h2>{isSplit ? "Create separate PDFs" : isExtract ? "Extract selected pages" : "Arrange the final PDF"}</h2>{isSplit && <label>Ranges<input className="page-range-input" value={ranges} onChange={(event) => setRanges(event.target.value)} placeholder="1-3, 4-6, 7" /><small>Each comma-separated range becomes a separate PDF.</small></label>}{!isSplit && !isExtract && <p className="page-tool-help">Drag pages to reorder. Rotate, duplicate, or delete them. Undo restores the previous organizer action.</p>}<div className="conversion-summary"><Check size={18} /><span>{!pages.length ? "Upload a PDF to continue" : isSplit ? `${pages.length} pages ready` : isExtract ? `${selected.size} page${selected.size === 1 ? "" : "s"} selected` : `${plan.length} output page${plan.length === 1 ? "" : "s"}`}</span></div><button className="conversion-primary-action" type="button" disabled={!pages.length || status === "working" || (isExtract && !selected.size)} onClick={exportResult}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Processing...</> : <><Download size={18} /> {isSplit ? "Download split files" : isExtract ? "Download extracted PDF" : "Download organized PDF"}</>}</button>{status === "complete" && <ExportSuccessState toolId={tool.id} onDownloadAgain={exportResult} onStartAnother={() => { setFile(null); setSourceBytes(null); setPages([]); setPlan([]); setSelected(new Set()); setStatus("idle"); }} relatedRoute="/merge-pdf" relatedName="Merge PDF" />}</aside></div>;
}

export function PdfPageToolPage({ tool }) {
  const isMerge = tool.id === "merge-pdf";
  const isPageNumbers = tool.id === "add-page-numbers";
  const isWatermark = tool.id === "watermark-pdf";
  const isCrop = tool.id === "crop-pdf";
  const isCompress = tool.id === "compress-pdf";
  return <main className="image-conversion-page pdf-page-tool-page"><PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={toolSeoSchemas(tool)} /><nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav><section className="conversion-hero"><div><small>Available now · runs in your browser</small><h1>{tool.heroHeadline}.</h1><p>{tool.heroSubheadline}</p></div></section>{isCompress ? <CompressWorkspace tool={tool} /> : isCrop ? <CropWorkspace tool={tool} /> : isWatermark ? <WatermarkWorkspace tool={tool} /> : isPageNumbers ? <PageNumberWorkspace tool={tool} /> : isMerge ? <MergeWorkspace tool={tool} /> : <SinglePdfWorkspace tool={tool} />}<section className="conversion-privacy-note"><Check size={19} /><div><strong>Private browser processing</strong><p>{tool.privacySummary}</p></div></section><ToolGuideContent tool={tool} /></main>;
}
