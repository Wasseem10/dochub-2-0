import { useEffect, useRef, useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Lock from "lucide-react/dist/esm/icons/lock.mjs";
import PenLine from "lucide-react/dist/esm/icons/pen-line.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Link, useParams } from "react-router-dom";
import { db, storage } from "../../firebase.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { loadSecurePdfShare } from "../../sharing/securePdfSharing.js";
import { signingRequestFromLocation } from "../../signing/signingRequest.js";

async function renderPdfPages(bytes) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  const documentProxy = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
    const page = await documentProxy.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    pages.push({ image: canvas.toDataURL("image/jpeg", 0.9), width: viewport.width, height: viewport.height });
    page.cleanup?.();
  }
  await documentProxy.destroy?.();
  return pages;
}

function downloadUrl(url, fileName) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
}

function SignatureCapture({ field, recipientName, onClose, onSave }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [mode, setMode] = useState("type");
  const [typed, setTyped] = useState(field.type === "initials"
    ? recipientName.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 4).toUpperCase()
    : recipientName);
  const [error, setError] = useState("");

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvasRef.current.width / rect.width, y: (event.clientY - rect.top) * canvasRef.current.height / rect.height };
  };
  const start = (event) => {
    const canvas = canvasRef.current;
    drawingRef.current = true;
    hasInkRef.current = true;
    canvas.setPointerCapture?.(event.pointerId);
    const context = canvas.getContext("2d");
    const next = point(event);
    context.beginPath();
    context.moveTo(next.x, next.y);
  };
  const move = (event) => {
    if (!drawingRef.current) return;
    const context = canvasRef.current.getContext("2d");
    const next = point(event);
    context.lineTo(next.x, next.y);
    context.strokeStyle = "#0f172a";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  };
  const finish = () => { drawingRef.current = false; };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
  };
  const save = () => {
    if (mode === "type" && !typed.trim()) return setError("Enter your signature or initials.");
    if (mode === "draw" && !hasInkRef.current) return setError("Draw your signature before applying it.");
    onSave(mode === "draw" ? { imageDataUrl: canvasRef.current.toDataURL("image/png"), text: "" } : { imageDataUrl: "", text: typed.trim() });
  };

  return <div className="sign-capture-backdrop" role="dialog" aria-modal="true" aria-label={`Add ${field.label}`}><section className="sign-capture-card">
    <header><div><span>{field.type === "initials" ? "Initials" : "Signature"}</span><h2>{field.label}</h2></div><button type="button" onClick={onClose} aria-label="Close signature dialog"><X size={19} /></button></header>
    <div className="sign-capture-tabs" role="tablist"><button type="button" className={mode === "type" ? "is-active" : ""} onClick={() => setMode("type")}>Type</button><button type="button" className={mode === "draw" ? "is-active" : ""} onClick={() => setMode("draw")}>Draw</button></div>
    {mode === "type" ? <label className="sign-typed-field"><span>{field.type === "initials" ? "Your initials" : "Your full name"}</span><input value={typed} onChange={(event) => setTyped(event.target.value)} autoFocus /><strong>{typed || "Your signature"}</strong></label> : <div className="sign-draw-field"><canvas ref={canvasRef} width="640" height="190" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} /><button type="button" onClick={clear}>Clear drawing</button></div>}
    {error && <p className="sign-request-error" role="alert">{error}</p>}
    <footer><button type="button" onClick={onClose}>Cancel</button><button type="button" className="is-primary" onClick={save}><PenLine size={17} /> Apply</button></footer>
  </section></div>;
}

async function createCompletionFiles(sourceBytes, request, values, sourceName) {
  const pdf = await PDFDocument.load(sourceBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  for (const field of request.fields) {
    const page = pdf.getPages()[field.page];
    if (!page) continue;
    const value = values[field.id] || {};
    const { width, height } = page.getSize();
    const x = field.x * width;
    const boxHeight = field.h * height;
    const y = height - field.y * height - boxHeight;
    const boxWidth = field.w * width;
    if (field.type === "checkbox") {
      if (value.checked) {
        const thickness = Math.max(1.8, Math.min(boxWidth, boxHeight) * 0.12);
        page.drawLine({ start: { x: x + boxWidth * 0.08, y: y + boxHeight * 0.48 }, end: { x: x + boxWidth * 0.36, y: y + boxHeight * 0.18 }, thickness, color: rgb(0.04, 0.1, 0.22) });
        page.drawLine({ start: { x: x + boxWidth * 0.36, y: y + boxHeight * 0.18 }, end: { x: x + boxWidth * 0.92, y: y + boxHeight * 0.82 }, thickness, color: rgb(0.04, 0.1, 0.22) });
      }
      continue;
    }
    if ((field.type === "signature" || field.type === "initials") && value.imageDataUrl) {
      const image = await pdf.embedPng(value.imageDataUrl);
      page.drawImage(image, { x: x + 3, y: y + 2, width: Math.max(8, boxWidth - 6), height: Math.max(8, boxHeight - 4) });
      continue;
    }
    const text = String(value.text || "").trim();
    if (!text) continue;
    const textFont = field.type === "signature" || field.type === "initials" ? italic : font;
    const size = Math.max(7, Math.min(field.type === "signature" ? 22 : 13, boxHeight * 0.52));
    page.drawText(text.slice(0, 300), { x: x + 6, y: y + Math.max(4, (boxHeight - size) / 2), size, font: textFont, color: rgb(0.04, 0.1, 0.22), maxWidth: Math.max(10, boxWidth - 12) });
  }
  const completedAt = new Date();
  pdf.setSubject(`Completed signing request ${request.requestId}`);
  pdf.setCreator("PDFArrow secure signing link");
  pdf.setModificationDate(completedAt);
  const signedBytes = await pdf.save();
  const digest = await crypto.subtle.digest("SHA-256", signedBytes);
  const fingerprint = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");

  const receipt = await PDFDocument.create();
  const receiptFont = await receipt.embedFont(StandardFonts.Helvetica);
  const receiptBold = await receipt.embedFont(StandardFonts.HelveticaBold);
  const page = receipt.addPage([612, 792]);
  page.drawText("PDFArrow completion receipt", { x: 54, y: 716, size: 22, font: receiptBold, color: rgb(0.05, 0.1, 0.22) });
  page.drawText("Device-generated record — not identity verification or a digital certificate", { x: 54, y: 688, size: 10, font: receiptFont, color: rgb(0.35, 0.4, 0.48) });
  const lines = [
    ["Document", sourceName], ["Request ID", request.requestId], ["Signer", request.recipient.name || request.recipient.email],
    ["Signer email", request.recipient.email], ["Requested by", request.requester.name || request.requester.email || "Document owner"],
    ["Completed", completedAt.toISOString()], ["Document SHA-256", fingerprint],
  ];
  lines.forEach(([label, value], index) => {
    const y = 635 - index * 58;
    page.drawText(label, { x: 54, y, size: 9, font: receiptBold, color: rgb(0.16, 0.32, 0.72) });
    const chunks = String(value || "").match(/.{1,76}/g) || [""];
    chunks.slice(0, 2).forEach((chunk, chunkIndex) => page.drawText(chunk, { x: 54, y: y - 18 - chunkIndex * 13, size: 10, font: receiptFont, color: rgb(0.05, 0.1, 0.22) }));
  });
  receipt.setTitle(`Completion receipt for ${sourceName}`);
  receipt.setCreator("PDFArrow");
  return { signedBytes, receiptBytes: await receipt.save(), completedAt, fingerprint };
}

export function SigningRequestPage() {
  const { token = "" } = useParams();
  const [state, setState] = useState({ status: "loading" });
  const [values, setValues] = useState({});
  const [activeCapture, setActiveCapture] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const request = signingRequestFromLocation(window.location);
    if (!request || new Date(request.expiresAt).getTime() <= Date.now()) {
      setState({ status: request ? "expired" : "invalid" });
      return undefined;
    }
    loadSecurePdfShare({ db, storage, token }).then(async (share) => {
      if (cancelled) return;
      if (share.status !== "ready") return setState(share);
      const bytes = new Uint8Array(await share.blob.arrayBuffer());
      const pages = await renderPdfPages(bytes);
      if (!cancelled) setState({ ...share, status: "ready", bytes, pages, request });
    }).catch(() => { if (!cancelled) setState({ status: "error" }); });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => () => {
    if (result?.signedUrl) URL.revokeObjectURL(result.signedUrl);
    if (result?.receiptUrl) URL.revokeObjectURL(result.receiptUrl);
  }, [result]);

  const update = (fieldId, patch) => setValues((current) => ({ ...current, [fieldId]: { ...(current[fieldId] || {}), ...patch } }));
  const complete = async () => {
    const missing = state.request.fields.find((field) => {
      if (!field.required) return false;
      const value = values[field.id] || {};
      return field.type === "checkbox" ? !value.checked : !String(value.text || "").trim() && !value.imageDataUrl;
    });
    if (missing) {
      setError(`Complete “${missing.label}” before finishing.`);
      document.getElementById(`sign-field-${missing.id}`)?.focus();
      return;
    }
    setBusy(true); setError("");
    try {
      const files = await createCompletionFiles(state.bytes, state.request, values, state.fileName);
      const baseName = state.fileName.replace(/\.pdf$/i, "") || "signed-document";
      setResult({
        ...files,
        signedName: `${baseName}-signed.pdf`, receiptName: `${baseName}-completion-receipt.pdf`,
        signedUrl: URL.createObjectURL(new Blob([files.signedBytes], { type: "application/pdf" })),
        receiptUrl: URL.createObjectURL(new Blob([files.receiptBytes], { type: "application/pdf" })),
      });
    } catch (completionError) {
      setError(completionError.message || "The signed PDF could not be created.");
    } finally { setBusy(false); }
  };

  if (state.status === "loading") return <main className="sign-request-page"><section className="secure-share-state"><LoaderCircle className="is-spinning" size={28} /><h1>Opening secure signing request</h1><p>Loading the document and its required fields.</p></section></main>;
  if (state.status !== "ready") return <main className="sign-request-page"><section className="secure-share-state"><Lock size={28} /><h1>{state.status === "expired" ? "This signing request has expired" : "This signing request cannot be opened"}</h1><p>Ask the sender to create a new secure request.</p><Link to={ROUTE_PATHS.home}>Go to PDFArrow</Link></section></main>;

  return <main className="sign-request-page">
    <header className="sign-request-header"><div><span><FileText size={21} /></span><div><small>Secure signing request</small><h1>{state.fileName}</h1><p>From {state.request.requester.name || state.request.requester.email || "the document owner"} · expires {new Date(state.request.expiresAt).toLocaleDateString()}</p></div></div><div><ShieldCheck size={18} /> PDF processing stays in this browser</div></header>
    <div className="sign-request-layout"><section className="sign-document-pages" aria-label={`Sign ${state.fileName}`}>
      {state.pages.map((page, pageIndex) => <article key={pageIndex} className="sign-document-page" style={{ aspectRatio: `${page.width} / ${page.height}` }}><img src={page.image} alt={`Page ${pageIndex + 1}`} />
        {state.request.fields.filter((field) => field.page === pageIndex).map((field) => {
          const value = values[field.id] || {};
          const style = { left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%` };
          if (field.type === "checkbox") return <label key={field.id} className="sign-field-overlay is-checkbox" style={style}><input id={`sign-field-${field.id}`} type="checkbox" checked={Boolean(value.checked)} onChange={(event) => update(field.id, { checked: event.target.checked })} /><span><Check size={15} /></span></label>;
          if (field.type === "signature" || field.type === "initials") return <button key={field.id} id={`sign-field-${field.id}`} type="button" className={`sign-field-overlay is-signature ${value.text || value.imageDataUrl ? "is-complete" : ""}`} style={style} onClick={() => setActiveCapture(field)}>{value.imageDataUrl ? <img src={value.imageDataUrl} alt="Applied signature" /> : value.text ? <strong>{value.text}</strong> : <><PenLine size={15} /><span>{field.label}</span></>}</button>;
          return <label key={field.id} className="sign-field-overlay is-text" style={style}><span className="sr-only">{field.label}</span><input id={`sign-field-${field.id}`} type={field.type === "date" ? "date" : "text"} value={value.text || ""} placeholder={field.label} onChange={(event) => update(field.id, { text: event.target.value })} /></label>;
        })}
      </article>)}
    </section><aside className="sign-request-sidebar">
      {result ? <section className="sign-complete-card"><CheckCircle2 size={34} /><h2>Document completed</h2><p>Download both files now. PDFArrow does not keep the completed copy.</p><button type="button" className="is-primary" onClick={() => downloadUrl(result.signedUrl, result.signedName)}><Download size={17} /> Download signed PDF</button><button type="button" onClick={() => downloadUrl(result.receiptUrl, result.receiptName)}><ShieldCheck size={17} /> Download completion receipt</button><small>Receipt fingerprint: {result.fingerprint.slice(0, 16)}…</small></section> : <>
        <span>Requested from</span><h2>{state.request.recipient.name || state.request.recipient.email}</h2>{state.request.message && <p className="sign-request-message">{state.request.message}</p>}
        <ol className="sign-field-checklist">{state.request.fields.map((field) => { const value = values[field.id] || {}; const completeField = field.type === "checkbox" ? value.checked : value.text || value.imageDataUrl; return <li key={field.id} className={completeField ? "is-complete" : ""}><span>{completeField ? <Check size={14} /> : state.request.fields.indexOf(field) + 1}</span><div><strong>{field.label}</strong><small>Page {field.page + 1} · {field.required ? "Required" : "Optional"}</small></div></li>; })}</ol>
        {error && <p className="sign-request-error" role="alert">{error}</p>}
        <button type="button" className="sign-finish-button" disabled={busy} onClick={complete}>{busy ? <><LoaderCircle className="is-spinning" size={17} /> Creating signed PDF…</> : <><PenLine size={17} /> Finish and create signed PDF</>}</button>
        <small className="sign-request-disclosure"><Lock size={13} /> This secure link can be revoked by the sender. The completion receipt records the document fingerprint but does not independently verify identity.</small>
      </>}
    </aside></div>
    {activeCapture && <SignatureCapture field={activeCapture} recipientName={state.request.recipient.name} onClose={() => setActiveCapture(null)} onSave={(signature) => { update(activeCapture.id, signature); setActiveCapture(null); }} />}
  </main>;
}
