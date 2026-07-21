import { useRef, useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileCheck2 from "lucide-react/dist/esm/icons/file-check-2.mjs";
import Layers from "lucide-react/dist/esm/icons/layers.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import LockKeyholeOpen from "lucide-react/dist/esm/icons/lock-keyhole-open.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { flattenPdfBytes, FLATTEN_PDF_LIMITS } from "../../tools/flattenPdf.js";
import { unlockPdfBytes } from "../../tools/protectPdf.js";

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

export function PdfProtectionPage({ tool }) {
  const inputRef = useRef(null);
  const isFlatten = tool.id === "flatten-pdf";
  const [file, setFile] = useState(null);
  const [bytes, setBytes] = useState(null);
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const choose = async (nextFile) => {
    if (!nextFile) return;
    setError("");
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) return setError("Choose a PDF file.");
    if (!nextFile.size) return setError("This PDF is empty.");
    if (nextFile.size > FLATTEN_PDF_LIMITS.maxBytes) return setError("Choose a PDF no larger than 25 MB.");
    setStatus("reading");
    try {
      setBytes(new Uint8Array(await nextFile.arrayBuffer()));
      setFile(nextFile);
      setPassword("");
      setAuthorized(false);
      setStatus("ready");
      trackProductEvent("upload_started", { toolId: tool.id });
    } catch {
      setStatus("idle");
      setError("This PDF could not be read.");
    }
  };

  const processPdf = async () => {
    if (!file || !bytes) return;
    setError("");
    setProgress(0);
    setStatus("working");
    trackProductEvent("export_started", { toolId: tool.id });
    try {
      const result = isFlatten
        ? await flattenPdfBytes(bytes, { onProgress: ({ completed, total }) => setProgress(Math.round(completed / total * 100)) })
        : await unlockPdfBytes(bytes, password);
      const baseName = file.name.replace(/\.pdf$/i, "") || "document";
      downloadPdf(result, `${baseName}-${isFlatten ? "flattened" : "unlocked"}.pdf`, tool.id);
      setProgress(100);
      setStatus("complete");
      trackProductEvent("export_succeeded", { toolId: tool.id });
    } catch (processingError) {
      setStatus("ready");
      setError(processingError?.message || `This PDF could not be ${isFlatten ? "flattened" : "unlocked"}.`);
      trackProductEvent("export_failed", { toolId: tool.id, errorCategory: isFlatten ? "flatten_failed" : "unlock_failed" });
    }
  };

  const Icon = isFlatten ? Layers : LockKeyholeOpen;
  const actionText = isFlatten ? "Flatten and download PDF" : "Unlock and download PDF";
  return <main className="image-conversion-page office-conversion-page protection-tool-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
    <section className="conversion-hero"><div><small>Available · private browser processing</small><h1>{isFlatten ? "Flatten every PDF page into a final copy." : "Remove a PDF password you already know."}</h1><p>{isFlatten ? "Rebuild page appearances into a clean PDF without forms, links, layers, embedded files, or editable source content." : "Enter the current open password and download an unencrypted copy. Use this only for a document you are authorized to modify."}</p></div></section>
    <div className="conversion-workspace-grid"><section>
      <div className="conversion-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void choose(event.dataTransfer.files?.[0]); }}>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
        <span><Upload size={27} /></span><h2>Drop your PDF here</h2><p>PDFs up to 25 MB{isFlatten ? ` and ${FLATTEN_PDF_LIMITS.maxPages} pages` : ""}.</p><button type="button" disabled={status === "working"} onClick={() => inputRef.current?.click()}>Choose a PDF</button>
      </div>
      {file && <div className="office-file-card"><header><FileCheck2 size={20} /><div><strong>{file.name}</strong><small>{formatBytes(file.size)} · ready to {isFlatten ? "flatten" : "unlock"}</small></div></header></div>}
      {error && <div className="conversion-error" role="alert">{error}</div>}
    </section><aside className="conversion-settings-card"><span>{isFlatten ? "Finalized output" : "Authorized password removal"}</span><Icon size={25} /><h2>{isFlatten ? "One visible layer" : "Current PDF password"}</h2>
      {isFlatten ? <div className="office-mode-note"><strong>This intentionally removes interactivity</strong><p>The visual page stays intact, but selectable text, forms, links, comments, layers, attachments, metadata, and accessibility tags are discarded.</p></div> : <><label className="conversion-field"><span>Open password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter current password" /></label><label className="protection-authorization"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} /><span>I own this PDF or have permission to remove its password.</span></label></>}
      <div className="conversion-summary"><Check size={18} /><span>{file ? `${file.name} is ready` : "Add a PDF to continue"}</span></div>
      {status === "working" && isFlatten && <><div className="conversion-progress-bar"><i style={{ width: `${progress}%` }} /></div><p className="ocr-status">Flattening pages… {progress}%</p></>}
      <button className="conversion-primary-action" type="button" disabled={!file || status === "working" || (!isFlatten && (!password || !authorized))} onClick={processPdf}>{status === "working" ? <><LoaderCircle className="is-spinning" size={18} /> Processing locally…</> : <><Download size={18} /> {actionText}</>}</button>
      {status === "complete" && <p className="conversion-success">Your new PDF was downloaded. Open it once to verify it.</p>}
    </aside></div>
    <section className="conversion-privacy-note"><ShieldCheck size={19} /><div><strong>Your PDF and password stay on this device</strong><p>FixThatPDF performs this operation in your browser. Passwords and document contents are never included in analytics.</p></div></section>
    <ToolGuideContent tool={tool} />
  </main>;
}
