import { useEffect, useMemo, useRef, useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.mjs";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.mjs";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up.mjs";
import Columns2 from "lucide-react/dist/esm/icons/columns-2.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileDiff from "lucide-react/dist/esm/icons/file-diff.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import Filter from "lucide-react/dist/esm/icons/list-filter.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Lock from "lucide-react/dist/esm/icons/lock.mjs";
import Settings from "lucide-react/dist/esm/icons/settings-2.mjs";
import Unlock from "lucide-react/dist/esm/icons/lock-open.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import ZoomIn from "lucide-react/dist/esm/icons/zoom-in.mjs";
import ZoomOut from "lucide-react/dist/esm/icons/zoom-out.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import {
  comparePositionedWords,
  compareRgbaImages,
  createComparisonPdfReport,
  extractPositionedWords,
  PDF_COMPARISON_LIMITS,
  validateComparisonPdf,
} from "../../tools/pdfComparison.js";
import "./compare-pdf.css";

const CHANGE_TYPES = ["inserted", "deleted", "replaced", "moved", "visual"];

async function loadPdfRenderer() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjs;
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(async (blob) => blob
    ? resolve(new Uint8Array(await blob.arrayBuffer()))
    : reject(new Error("A comparison preview could not be created.")), "image/png"));
}

function downloadPdf(bytes, name, toolId) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  trackProductEvent("pdf_downloaded", { toolId });
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pageCountLabel(count) {
  return `${count} ${count === 1 ? "page" : "pages"}`;
}

function changeTypeLabel(type) {
  return type === "visual" ? "Visual change" : `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

async function renderComparablePage(documentProxy, pageNumber, targetWidth, targetHeight) {
  if (!documentProxy || pageNumber > documentProxy.numPages) return null;
  const page = await documentProxy.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);
  const renderCanvas = document.createElement("canvas");
  renderCanvas.width = Math.ceil(viewport.width);
  renderCanvas.height = Math.ceil(viewport.height);
  const renderContext = renderCanvas.getContext("2d", { alpha: false });
  renderContext.fillStyle = "#ffffff";
  renderContext.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
  const contentPromise = page.getTextContent();
  await page.render({ canvasContext: renderContext, viewport, background: "#ffffff" }).promise;
  context.drawImage(renderCanvas, 0, 0);
  const content = await contentPromise;
  const words = extractPositionedWords(content, baseViewport);
  page.cleanup();
  return {
    canvas,
    words,
    png: await canvasToPng(canvas),
    imageData: context.getImageData(0, 0, targetWidth, targetHeight).data,
  };
}

function ComparisonFileCard({ label, record, inputRef, onFile, disabled }) {
  return (
    <div className={`comparison-file-card ${record ? "has-file" : ""}`}>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { void onFile(event.target.files?.[0]); event.target.value = ""; }} />
      <span>{record ? <FileText size={24} /> : <Upload size={24} />}</span>
      <small>{label}</small>
      <strong>{record?.file.name || "Choose a PDF"}</strong>
      <p>{record ? pageCountLabel(record.pdf.numPages) : "PDF up to 25 MB and 75 pages"}</p>
      <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>{record ? "Replace PDF" : "Choose PDF"}</button>
    </div>
  );
}

function ChangeOverlay({ change, rect, side, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`comparison-word-change is-${change.type} is-${side} ${selected ? "is-selected" : ""}`}
      data-change-id={change.id}
      aria-label={`Change ${change.number}: ${changeTypeLabel(change.type)}`}
      style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}
      onClick={() => onSelect(change)}
    />
  );
}

function DocumentPanel({ side, record, result, zoom, selectedChangeId, onSelectChange, onScroll, scrollRef }) {
  const isOriginal = side === "original";
  const preview = isOriginal ? result?.firstPreview : result?.secondPreview;
  return (
    <section className={`comparison-document-panel is-${side}`} aria-label={`${isOriginal ? "Original" : "Revised"} document`}>
      <header>
        <FileText size={16} />
        <span title={record?.file.name}>{record?.file.name}</span>
        <small>Page {result?.pageNumber || 1}</small>
      </header>
      <div className="comparison-document-scroll" ref={scrollRef} onScroll={onScroll}>
        {preview ? (
          <div className="comparison-document-page" style={{ width: `${zoom * 100}%` }}>
            <img src={preview} alt={`${isOriginal ? "Original" : "Revised"} page ${result.pageNumber}`} />
            {(result.changes || []).flatMap((change) => {
              const rects = isOriginal ? change.removedRects : change.addedRects;
              return (rects || []).map((rect, index) => (
                <ChangeOverlay key={`${change.id}-${index}`} change={change} rect={rect} side={side} selected={selectedChangeId === change.id} onSelect={onSelectChange} />
              ));
            })}
          </div>
        ) : <div className="comparison-missing">Page not present in this document</div>}
      </div>
    </section>
  );
}

function ChangeCard({ change, selected, onSelect }) {
  const oldText = change.removedText || (change.type === "visual" ? "Graphic or layout changed" : "");
  const newText = change.addedText || (change.type === "visual" ? "Graphic or layout changed" : "");
  return (
    <button type="button" className={`comparison-change-card is-${change.type} ${selected ? "is-selected" : ""}`} onClick={() => onSelect(change)}>
      <span className="comparison-change-card-title"><strong>{change.number}. {changeTypeLabel(change.type)}</strong><small>{change.type === "inserted" ? `+${change.addedWords.length}` : change.type === "deleted" ? `-${change.removedWords.length}` : change.type === "replaced" ? `-${change.removedWords.length} / +${change.addedWords.length}` : `Page ${change.pageNumber}`}</small></span>
      {oldText && change.type !== "inserted" && <del>{oldText}</del>}
      {newText && change.type !== "deleted" && <ins>{newText}</ins>}
    </button>
  );
}

export function ComparePdfPage({ tool }) {
  const firstInput = useRef(null);
  const secondInput = useRef(null);
  const firstRecordRef = useRef(null);
  const secondRecordRef = useRef(null);
  const originalScrollRef = useRef(null);
  const revisedScrollRef = useRef(null);
  const resultsRef = useRef(null);
  const syncingScrollRef = useRef(false);
  const [first, setFirst] = useState(null);
  const [second, setSecond] = useState(null);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedChangeId, setSelectedChangeId] = useState("");
  const [activeTypes, setActiveTypes] = useState(() => new Set(CHANGE_TYPES));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scrollLock, setScrollLock] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => () => { firstRecordRef.current?.pdf.destroy?.(); secondRecordRef.current?.pdf.destroy?.(); }, []);
  useEffect(() => () => results.forEach((result) => {
    if (result.firstPreview) URL.revokeObjectURL(result.firstPreview);
    if (result.secondPreview) URL.revokeObjectURL(result.secondPreview);
  }), [results]);
  useEffect(() => {
    if (!results.length) return;
    window.requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ block: "start", behavior: "auto" }));
  }, [results.length]);

  const allChanges = useMemo(() => results.flatMap((result) => result.changes || []), [results]);
  const visibleChanges = useMemo(() => allChanges.filter((change) => activeTypes.has(change.type)), [activeTypes, allChanges]);
  const currentResult = results.find((result) => result.pageNumber === currentPage) || results[0];
  const changedPages = results.filter((result) => result.statusLabel !== "Unchanged").length;
  const selectedIndex = visibleChanges.findIndex((change) => change.id === selectedChangeId);

  const selectChange = (change) => {
    if (!change) return;
    setSelectedChangeId(change.id);
    setCurrentPage(change.pageNumber);
    window.requestAnimationFrame(() => {
      const selected = document.querySelector(`.comparison-change-card.is-selected`);
      selected?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };

  const moveChange = (direction) => {
    if (!visibleChanges.length) return;
    const nextIndex = selectedIndex < 0
      ? 0
      : (selectedIndex + direction + visibleChanges.length) % visibleChanges.length;
    selectChange(visibleChanges[nextIndex]);
  };

  const toggleType = (type) => {
    setActiveTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const syncScroll = (sourceRef, targetRef) => {
    if (!scrollLock || syncingScrollRef.current || !sourceRef.current || !targetRef.current) return;
    syncingScrollRef.current = true;
    const source = sourceRef.current;
    const target = targetRef.current;
    const maxSourceTop = Math.max(1, source.scrollHeight - source.clientHeight);
    const maxTargetTop = Math.max(0, target.scrollHeight - target.clientHeight);
    target.scrollTop = source.scrollTop / maxSourceTop * maxTargetTop;
    target.scrollLeft = source.scrollLeft;
    window.requestAnimationFrame(() => { syncingScrollRef.current = false; });
  };

  const loadFile = async (file, setter, previous) => {
    const validationError = validateComparisonPdf(file);
    if (validationError) { setError(validationError); return; }
    setError("");
    setStatus("reading");
    setResults([]);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdfjs = await loadPdfRenderer();
      const pdf = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      if (pdf.numPages > PDF_COMPARISON_LIMITS.maxPages) {
        await pdf.destroy?.();
        throw new Error(`Comparison supports up to ${PDF_COMPARISON_LIMITS.maxPages} pages per PDF.`);
      }
      await previous?.pdf.destroy?.();
      const record = { file, bytes, pdf };
      if (setter === setFirst) firstRecordRef.current = record; else secondRecordRef.current = record;
      setter(record);
      setStatus("idle");
    } catch (loadError) {
      setStatus("idle");
      setError(loadError.message || "This PDF could not be opened. Encrypted PDFs are not supported.");
    }
  };

  const compare = async () => {
    if (!first || !second) return;
    setStatus("comparing");
    setProgress(0);
    setError("");
    setResults([]);
    try {
      const total = Math.max(first.pdf.numPages, second.pdf.numPages);
      const next = [];
      for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
        const firstPage = pageNumber <= first.pdf.numPages ? await first.pdf.getPage(pageNumber) : null;
        const secondPage = pageNumber <= second.pdf.numPages ? await second.pdf.getPage(pageNumber) : null;
        const firstBase = firstPage?.getViewport({ scale: 1 });
        const secondBase = secondPage?.getViewport({ scale: 1 });
        firstPage?.cleanup();
        secondPage?.cleanup();
        const targetWidth = PDF_COMPARISON_LIMITS.renderWidth;
        const targetHeight = Math.max(1, Math.ceil(Math.max(firstBase?.height / firstBase?.width || 0, secondBase?.height / secondBase?.width || 0, 1) * targetWidth));
        const [left, right] = await Promise.all([
          renderComparablePage(first.pdf, pageNumber, targetWidth, targetHeight),
          renderComparablePage(second.pdf, pageNumber, targetWidth, targetHeight),
        ]);
        const blank = new Uint8ClampedArray(targetWidth * targetHeight * 4).fill(255);
        const visual = compareRgbaImages(left?.imageData || blank, right?.imageData || blank, targetWidth, targetHeight);
        const text = comparePositionedWords(left?.words || [], right?.words || [], { pageNumber });
        let changes = text.changes;
        if (!changes.length && visual.rects.length && visual.changedRatio >= 0.003) {
          changes = visual.rects.slice(0, 12).map((rect, index) => ({
            id: `page-${pageNumber}-visual-${index + 1}`,
            pageNumber,
            type: "visual",
            removedWords: [],
            addedWords: [],
            removedText: "",
            addedText: "",
            removedRects: left ? [rect] : [],
            addedRects: right ? [rect] : [],
          }));
        }
        const statusLabel = !left ? "Added page" : !right ? "Removed page" : changes.length ? "Changed" : "Unchanged";
        next.push({
          pageNumber,
          statusLabel,
          similarity: visual.similarity,
          rects: changes.length ? [] : visual.rects,
          changes,
          textAdded: text.added,
          textRemoved: text.removed,
          firstPng: left?.png,
          secondPng: right?.png,
          firstPreview: left ? URL.createObjectURL(new Blob([left.png], { type: "image/png" })) : "",
          secondPreview: right ? URL.createObjectURL(new Blob([right.png], { type: "image/png" })) : "",
        });
        setProgress(Math.round(pageNumber / total * 100));
      }
      let changeNumber = 1;
      const numbered = next.map((result) => ({
        ...result,
        changes: result.changes.map((change) => ({ ...change, number: changeNumber++ })),
      }));
      const firstChange = numbered.flatMap((result) => result.changes)[0];
      setResults(numbered);
      setCurrentPage(firstChange?.pageNumber || 1);
      setSelectedChangeId(firstChange?.id || "");
      setStatus("complete");
    } catch (compareError) {
      setStatus("idle");
      setError(compareError.message || "The PDFs could not be compared.");
    }
  };

  const download = async () => {
    setStatus("exporting");
    setError("");
    try {
      const bytes = await createComparisonPdfReport(results, { firstName: first.file.name, secondName: second.file.name });
      downloadPdf(bytes, `${second.file.name.replace(/\.pdf$/i, "")}-comparison.pdf`, tool.id);
      setStatus("complete");
    } catch (downloadError) {
      setError(downloadError.message || "The comparison report could not be created.");
      setStatus("complete");
    }
  };

  const resetComparison = () => {
    setResults([]);
    setSelectedChangeId("");
    setCurrentPage(1);
    setStatus("idle");
  };

  return (
    <main className={`image-conversion-page comparison-page ${results.length ? "has-results" : ""}`}>
      <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} />
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
      <section className="conversion-hero"><div><small>Available · private browser comparison</small><h1>{tool.id === "document-version-comparison" ? "Compare document versions." : "Compare two PDFs."}</h1><p>Review exact additions, deletions, replacements, moved text, and visual changes side by side.</p></div></section>
      <section className="comparison-upload-grid">
        <ComparisonFileCard label="Original document" record={first} inputRef={firstInput} onFile={(file) => loadFile(file, setFirst, first)} disabled={status === "comparing"} />
        <ComparisonFileCard label="Revised document" record={second} inputRef={secondInput} onFile={(file) => loadFile(file, setSecond, second)} disabled={status === "comparing"} />
      </section>
      {error && <div className="conversion-error" role="alert">{error}</div>}
      <section className="comparison-action-card">
        <FileDiff size={25} />
        <div><strong>{first && second ? "Both PDFs are ready" : "Add an original and revised PDF"}</strong><small>{first && second ? `${pageCountLabel(Math.max(first.pdf.numPages, second.pdf.numPages))} will be checked word by word` : "Your files stay on this device"}</small></div>
        <button type="button" disabled={!first || !second || status === "comparing" || status === "exporting"} onClick={compare}>{status === "comparing" ? <><LoaderCircle className="is-spinning" size={18} /> Comparing {progress}%</> : "Compare PDFs"}</button>
      </section>

      {results.length > 0 && (
        <section className="comparison-results" ref={resultsRef}>
          <header className="comparison-results-summary">
            <div><small>Comparison complete</small><h2>{changedPages} of {pageCountLabel(results.length)} changed</h2><p>{allChanges.length} reviewable {allChanges.length === 1 ? "change" : "changes"} found · additions are blue and removals are red.</p></div>
            <div className="comparison-results-actions"><button type="button" className="is-secondary" onClick={resetComparison}>Compare new files</button><button type="button" disabled={status === "exporting"} onClick={download}>{status === "exporting" ? <LoaderCircle className="is-spinning" size={18} /> : <Download size={18} />} Download report PDF</button></div>
          </header>

          <div className="comparison-review-toolbar">
            <button type="button" className="is-active"><Columns2 size={17} /> Side by side</button>
            <button type="button" className={scrollLock ? "is-active" : ""} onClick={() => setScrollLock((value) => !value)}>{scrollLock ? <Lock size={17} /> : <Unlock size={17} />} Scroll lock</button>
            <span className="comparison-toolbar-spacer" />
            <button type="button" disabled={!visibleChanges.length} onClick={() => moveChange(-1)}><ChevronUp size={17} /> Previous change</button>
            <button type="button" disabled={!visibleChanges.length} onClick={() => moveChange(1)}><ChevronDown size={17} /> Next change</button>
          </div>

          <div className="comparison-review-shell">
            <div className="comparison-review-stage">
              <div className="comparison-page-toolbar">
                <div><button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft size={17} /></button><span>Page <strong>{currentPage}</strong> of {results.length}</span><button type="button" aria-label="Next page" disabled={currentPage >= results.length} onClick={() => setCurrentPage((page) => Math.min(results.length, page + 1))}><ChevronRight size={17} /></button></div>
                <div><button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.7, Number((value - 0.1).toFixed(1))))}><ZoomOut size={17} /></button><span>{Math.round(zoom * 100)}%</span><button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.4, Number((value + 0.1).toFixed(1))))}><ZoomIn size={17} /></button></div>
              </div>
              <div className="comparison-document-columns">
                <DocumentPanel side="original" record={first} result={currentResult} zoom={zoom} selectedChangeId={selectedChangeId} onSelectChange={selectChange} scrollRef={originalScrollRef} onScroll={() => syncScroll(originalScrollRef, revisedScrollRef)} />
                <div className="comparison-change-map" aria-hidden="true">{(currentResult?.changes || []).map((change) => {
                  const rect = change.addedRects[0] || change.removedRects[0];
                  return rect ? <i key={change.id} className={`is-${change.type} ${selectedChangeId === change.id ? "is-selected" : ""}`} style={{ top: `${rect.y * 100}%` }} /> : null;
                })}</div>
                <DocumentPanel side="revised" record={second} result={currentResult} zoom={zoom} selectedChangeId={selectedChangeId} onSelectChange={selectChange} scrollRef={revisedScrollRef} onScroll={() => syncScroll(revisedScrollRef, originalScrollRef)} />
              </div>
            </div>

            <aside className="comparison-changes-panel" aria-label="Comparison changes">
              <header><div><strong>Changes</strong><small>{visibleChanges.length} shown</small></div><button type="button" className={isSettingsOpen ? "is-active" : ""} aria-label="Change settings" onClick={() => setIsSettingsOpen((value) => !value)}><Settings size={17} /></button></header>
              <div className="comparison-filter-row"><button type="button" className={isFilterOpen ? "is-active" : ""} onClick={() => setIsFilterOpen((value) => !value)}><Filter size={16} /> Filters ({activeTypes.size})</button><button type="button" onClick={() => setActiveTypes(new Set(CHANGE_TYPES))}>Show all</button></div>
              {isFilterOpen && <div className="comparison-filter-menu">{CHANGE_TYPES.map((type) => <label key={type}><input type="checkbox" checked={activeTypes.has(type)} onChange={() => toggleType(type)} /><span className={`is-${type}`} />{changeTypeLabel(type)}</label>)}</div>}
              {isSettingsOpen && <div className="comparison-settings-note"><strong>Review mode</strong><p>Click any highlight or change card to select it. Scroll lock keeps both pages aligned.</p></div>}
              <div className="comparison-change-list">
                {visibleChanges.length ? visibleChanges.map((change) => <ChangeCard key={change.id} change={change} selected={selectedChangeId === change.id} onSelect={selectChange} />) : <div className="comparison-no-changes"><Check size={22} /><strong>No matching changes</strong><p>Turn on another filter to continue reviewing.</p></div>}
              </div>
              <footer><span>{selectedIndex >= 0 ? selectedIndex + 1 : 0} / {visibleChanges.length}</span><button type="button" disabled={!visibleChanges.length} aria-label="Previous change" onClick={() => moveChange(-1)}><ChevronUp size={17} /></button><button type="button" disabled={!visibleChanges.length} aria-label="Next change" onClick={() => moveChange(1)}><ChevronDown size={17} /></button></footer>
            </aside>
          </div>
        </section>
      )}

      <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private, reviewable comparison</strong><p>Both PDFs are rendered and compared locally. Text is matched word by word, while image-only pages use focused visual regions.</p></div></section>
    </main>
  );
}
