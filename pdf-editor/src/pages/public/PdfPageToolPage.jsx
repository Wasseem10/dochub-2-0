import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down.mjs";
import ArrowUp from "lucide-react/dist/esm/icons/arrow-up.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Copy from "lucide-react/dist/esm/icons/copy.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw.mjs";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.mjs";
import Undo2 from "lucide-react/dist/esm/icons/undo-2.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { createStoredZip } from "../../tools/imageConversion.js";
import { buildPdfFromPagePlan, extractPdfPages, inspectPdfBytes, mergePdfDocuments, PAGE_TOOL_LIMITS, parsePageRanges, splitPdfByRanges } from "../../tools/pdfPageOperations.js";
import { ToolIcon } from "../../tools/ToolIcon.jsx";

async function loadPdfRenderer() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjsLib;
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function friendlyPdfError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (error?.name === "PasswordException" || message.includes("encrypted") || message.includes("password")) return "This PDF is encrypted. Use an authorized password-removal workflow before organizing it.";
  if (message.includes("invalid pdf") || message.includes("missing pdf")) return "This PDF appears corrupted or incomplete. Try downloading a fresh copy.";
  return error?.message || "RealPDF could not read this PDF. Try a valid, unencrypted file under 50 MB.";
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

function MergeWorkspace() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);

  const addFiles = async (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setError("");
    if (files.length + incoming.length > PAGE_TOOL_LIMITS.maxFiles) return setError(`Merge no more than ${PAGE_TOOL_LIMITS.maxFiles} PDFs at once.`);
    if (incoming.some((file) => file.size > PAGE_TOOL_LIMITS.maxFileBytes)) return setError("Each PDF must be under 50 MB.");
    if (incoming.some((file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) return setError("Only PDF files can be merged.");
    setStatus("reading");
    try {
      const records = [];
      for (const file of incoming) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const details = await inspectPdfBytes(bytes);
        if (details.pageCount > PAGE_TOOL_LIMITS.maxPages) throw new Error(`${file.name} exceeds the ${PAGE_TOOL_LIMITS.maxPages}-page limit.`);
        records.push({ id: makeId("merge-file"), name: file.name, size: file.size, bytes, pageCount: details.pageCount });
      }
      setFiles((current) => [...current, ...records]);
    } catch (readError) {
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
    try {
      const bytes = await mergePdfDocuments(files);
      downloadBytes(bytes, "application/pdf", "merged-realpdf.pdf");
      setStatus("complete"); window.setTimeout(() => setStatus("idle"), 1800);
    } catch (mergeError) { setError(friendlyPdfError(mergeError)); setStatus("idle"); }
  };

  return <div className="conversion-workspace-grid"><section><PdfDropzone multiple label="Drop PDFs to merge" onFiles={addFiles} disabled={status !== "idle"} />{error && <div className="conversion-error" role="alert">{error}</div>}{files.length > 0 && <div className="merge-file-list">{files.map((file, index) => <article key={file.id} draggable className={draggedIndex === index ? "is-dragging" : ""} onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedIndex !== null) move(draggedIndex, index); setDraggedIndex(null); }} onDragEnd={() => setDraggedIndex(null)}><GripVertical size={18} /><span>{index + 1}</span><div><strong>{file.name}</strong><small>{file.pageCount} page{file.pageCount === 1 ? "" : "s"} · {formatBytes(file.size)}</small></div><button type="button" onClick={() => move(index, index - 1)} disabled={!index} aria-label={`Move ${file.name} up`}><ArrowUp size={16} /></button><button type="button" onClick={() => move(index, index + 1)} disabled={index === files.length - 1} aria-label={`Move ${file.name} down`}><ArrowDown size={16} /></button><button type="button" onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))} aria-label={`Remove ${file.name}`}><Trash2 size={16} /></button></article>)}</div>}</section><aside className="conversion-settings-card"><span>Merge order</span><h2>Combine complete PDFs</h2><p className="page-tool-help">Drag files into order. Pages inside each PDF retain their native text, vectors, dimensions, and rotation.</p><div className="conversion-summary"><Check size={18} /><span>{files.length >= 2 ? `${files.length} PDFs ready · ${files.reduce((sum, file) => sum + file.pageCount, 0)} pages` : "Add at least two PDFs"}</span></div><button className="conversion-primary-action" type="button" disabled={files.length < 2 || status === "working"} onClick={merge}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Merging...</> : <><Download size={18} /> Download merged PDF</>}</button>{status === "complete" && <p className="conversion-success">Merged PDF created.</p>}</aside></div>;
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
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) return setError("Choose a PDF file.");
    if (nextFile.size > PAGE_TOOL_LIMITS.maxFileBytes) return setError("PDFs must be under 50 MB.");
    setStatus("reading"); setProgress(0);
    try {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); previewUrlsRef.current = [];
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const pdfjsLib = await loadPdfRenderer();
      const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
      if (pdf.numPages > PAGE_TOOL_LIMITS.maxPages) throw new Error(`This PDF has ${pdf.numPages} pages. The limit is ${PAGE_TOOL_LIMITS.maxPages}.`);
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
    } catch (readError) { setError(friendlyPdfError(readError)); setFile(null); setPages([]); setPlan([]); }
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
      setStatus("complete"); window.setTimeout(() => setStatus("idle"), 1800);
    } catch (exportError) { setError(friendlyPdfError(exportError)); setStatus("idle"); }
  };

  const allSelected = pages.length > 0 && selected.size === pages.length;
  return <div className="conversion-workspace-grid"><section><PdfDropzone multiple={false} label={`Drop a PDF to ${isSplit ? "split" : isExtract ? "extract pages" : "organize"}`} onFiles={loadPdf} disabled={status === "reading" || status === "working"} />{status === "reading" && <div className="conversion-progress"><LoaderCircle className="is-spinning" size={18} /> Reading pages... {progress}%</div>}{error && <div className="conversion-error" role="alert">{error}</div>}{pages.length > 0 && <div className="page-organizer"><header><div><strong>{file.name}</strong><small>{pages.length} original page{pages.length === 1 ? "" : "s"} · {formatBytes(file.size)}</small></div>{isExtract ? <button type="button" onClick={() => setSelected(allSelected ? new Set() : new Set(pages.map((page) => page.sourceIndex)))}>{allSelected ? "Clear all" : "Select all"}</button> : !isSplit && <button type="button" disabled={!history.length} onClick={undo}><Undo2 size={16} /> Undo</button>}</header>{isSplit ? <div className="split-range-guide"><strong>Previewed pages</strong><div>{pages.map((page) => <span key={page.sourceIndex}><img src={page.previewUrl} alt={`Page ${page.sourceIndex + 1}`} /><small>{page.sourceIndex + 1}</small></span>)}</div></div> : isExtract ? <div className="extract-page-grid">{pages.map((page) => <label key={page.sourceIndex} className={selected.has(page.sourceIndex) ? "is-selected" : ""}><input type="checkbox" checked={selected.has(page.sourceIndex)} onChange={() => toggleSelected(page.sourceIndex)} /><img src={page.previewUrl} alt={`Page ${page.sourceIndex + 1}`} /><span>Page {page.sourceIndex + 1}</span></label>)}</div> : <div className="organizer-page-grid">{plan.map((item, index) => { const sourcePage = pages[item.sourceIndex]; return <article key={item.id} draggable className={draggedIndex === index ? "is-dragging" : ""} onDragStart={() => setDraggedIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedIndex !== null) move(draggedIndex, index); setDraggedIndex(null); }} onDragEnd={() => setDraggedIndex(null)}><div className="organizer-page-preview"><img src={sourcePage.previewUrl} alt={`Output page ${index + 1}`} style={{ transform: `rotate(${item.rotation}deg)` }} /></div><strong>Page {index + 1}</strong><small>Original {item.sourceIndex + 1}{item.rotation ? ` · ${item.rotation}°` : ""}</small><footer><button type="button" onClick={() => move(index, index - 1)} disabled={!index} aria-label="Move page left"><ArrowUp size={15} /></button><button type="button" onClick={() => move(index, index + 1)} disabled={index === plan.length - 1} aria-label="Move page right"><ArrowDown size={15} /></button><button type="button" onClick={() => rotate(item.id)} aria-label="Rotate page"><RotateCw size={15} /></button><button type="button" onClick={() => duplicate(index)} aria-label="Duplicate page"><Copy size={15} /></button><button type="button" onClick={() => remove(item.id)} disabled={plan.length <= 1} aria-label="Delete page"><Trash2 size={15} /></button></footer></article>; })}</div>}</div>}</section><aside className="conversion-settings-card"><span>{isSplit ? "Split ranges" : isExtract ? "Page selection" : "Page organizer"}</span><h2>{isSplit ? "Create separate PDFs" : isExtract ? "Extract selected pages" : "Arrange the final PDF"}</h2>{isSplit && <label>Ranges<input className="page-range-input" value={ranges} onChange={(event) => setRanges(event.target.value)} placeholder="1-3, 4-6, 7" /><small>Each comma-separated range becomes a separate PDF.</small></label>}{!isSplit && !isExtract && <p className="page-tool-help">Drag pages to reorder. Rotate, duplicate, or delete them. Undo restores the previous organizer action.</p>}<div className="conversion-summary"><Check size={18} /><span>{!pages.length ? "Upload a PDF to continue" : isSplit ? `${pages.length} pages ready` : isExtract ? `${selected.size} page${selected.size === 1 ? "" : "s"} selected` : `${plan.length} output page${plan.length === 1 ? "" : "s"}`}</span></div><button className="conversion-primary-action" type="button" disabled={!pages.length || status === "working" || (isExtract && !selected.size)} onClick={exportResult}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Processing...</> : <><Download size={18} /> {isSplit ? "Download split files" : isExtract ? "Download extracted PDF" : "Download organized PDF"}</>}</button>{status === "complete" && <p className="conversion-success">Your download was created successfully.</p>}</aside></div>;
}

export function PdfPageToolPage({ tool }) {
  const isMerge = tool.id === "merge-pdf";
  const schema = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: tool.name, applicationCategory: "BusinessApplication", operatingSystem: "Web", url: tool.canonicalUrl, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } };
  return <main className="image-conversion-page pdf-page-tool-page"><PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={[schema]} /><nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav><section className="conversion-hero"><span style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={29} /></span><div><small>Available now · preserves native PDF pages</small><h1>{tool.name}</h1><p>{tool.shortDescription} Processing stays on this device.</p></div></section>{isMerge ? <MergeWorkspace /> : <SinglePdfWorkspace tool={tool} />}<section className="conversion-privacy-note"><Check size={19} /><div><strong>High-fidelity browser processing</strong><p>RealPDF copies original PDF pages instead of converting them to screenshots. Text, vectors, dimensions, and supported page rotation remain native.</p></div></section></main>;
}
