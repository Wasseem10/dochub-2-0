import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import Menu from "lucide-react/dist/esm/icons/menu.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { PageMetadata } from "./components/public/PageMetadata.jsx";
import { ROUTE_PATHS } from "./router/routePaths.js";
import { ToolIcon } from "./tools/ToolIcon.jsx";
import { POPULAR_TOOLS } from "./tools/toolRegistry.js";

const faqs = [
  ["Is RealPDF really free?", "Yes. Supported core tools are free to use with no subscription, checkout, email requirement, or RealPDF watermark."],
  ["Do I need an account?", "No. Open, edit, and download supported files as a guest. Create an account only when you want cloud document history."],
  ["Are files processed in my browser?", "Supported editor, page, and image tools process files in your browser. Account-based cloud history uses Firebase and is clearly separate."],
  ["What is the editor file limit?", "The editor accepts valid, unencrypted PDFs up to 8 MB and 100 pages. Dedicated page and conversion tools may support higher limits shown before upload."],
  ["Can RealPDF perfectly rewrite original PDF text?", "Not always. The editor can change detected text overlays and add new content, but original fonts, spacing, and layout may vary. Always review the export."],
  ["Does RealPDF add a watermark?", "No. RealPDF does not add a watermark to supported exports."],
];

function Brand() {
  return <Link className="freepdf-brand" to={ROUTE_PATHS.home} aria-label="RealPDF home"><span><FileText size={21} /></span><strong>RealPDF</strong></Link>;
}

function SiteHeader({ onChoose }) {
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) firstLinkRef.current?.focus();
  }, [open]);

  const close = () => setOpen(false);
  const links = [
    ["All tools", ROUTE_PATHS.tools],
    ["Edit PDF", ROUTE_PATHS.editPdf],
    ["Organize PDF", "/organize-pdf"],
    ["Sign PDF", ROUTE_PATHS.signPdf],
    ["Convert PDF", "/pdf-to-jpg"],
    ["Privacy", ROUTE_PATHS.privacy],
  ];

  return <header className="freepdf-header">
    <Brand />
    <nav className="freepdf-desktop-nav" aria-label="Primary navigation">{links.map(([label, href]) => <Link key={label} to={href}>{label}</Link>)}</nav>
    <div className="freepdf-header-actions"><Link to={ROUTE_PATHS.login}>Log in</Link><button type="button" onClick={onChoose}>Choose a PDF</button><button className="freepdf-menu-button" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X size={21} /> : <Menu size={21} />}</button></div>
    {open && <nav className="freepdf-mobile-nav" aria-label="Mobile navigation">{links.map(([label, href], index) => <Link ref={index === 0 ? firstLinkRef : undefined} key={label} to={href} onClick={close}>{label}</Link>)}<Link to={ROUTE_PATHS.login} onClick={close}>Log in</Link><button type="button" onClick={() => { close(); onChoose(); }}>Choose a PDF</button></nav>}
  </header>;
}

function PopularTools() {
  return <section className="freepdf-section" aria-labelledby="popular-tools-title">
    <div className="freepdf-section-heading"><span>Popular free tools</span><h2 id="popular-tools-title">Start with the task you need</h2><p>Only tools that work today appear here. Limitations are shown before you upload.</p></div>
    <div className="freepdf-tool-grid">{POPULAR_TOOLS.slice(0, 12).map((tool) => <Link key={tool.id} className="freepdf-tool-card" to={tool.route}><span className="freepdf-tool-icon" style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={22} /></span><div><h3>{tool.name}</h3><p>{tool.shortDescription}</p><small>Input: {tool.supportedInputTypes.includes("application/pdf") ? "PDF" : tool.supportedInputTypes.includes("image/png") ? "PNG" : "JPG"}{tool.status !== "available" ? ` · ${tool.availabilityLabel}` : ""}</small></div><ArrowRight size={18} aria-hidden="true" /></Link>)}</div>
    <Link className="freepdf-text-link" to={ROUTE_PATHS.tools}>Browse every free tool <ArrowRight size={16} /></Link>
  </section>;
}

export function LatticePdfLanding({ fileInputRef, onUpload, onSelectFiles, onDropFiles, onLogin, uploadError = "", uploadStage = { status: "idle", percent: 0, fileName: "" } }) {
  const fallbackInputRef = useRef(null);
  const inputRef = fileInputRef || fallbackInputRef;
  const [dragging, setDragging] = useState(false);
  const isUploading = Boolean(uploadStage?.status && !["idle", "complete", "error"].includes(uploadStage.status));
  const choose = () => onSelectFiles ? onSelectFiles() : inputRef.current?.click();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("realpdf:homepage-rendered"));
  }, []);

  return <main className="freepdf-page">
    <PageMetadata title="Edit PDFs Online — Completely Free | RealPDF" description="Edit, sign, fill, merge, split, organize, and convert PDFs without subscriptions, watermarks, or forced signup." canonicalUrl="/" />
    <input ref={inputRef} className="hidden-input" type="file" accept="application/pdf,.pdf" onChange={onUpload} />
    <SiteHeader onChoose={choose} onLogin={onLogin} />

    <section className="freepdf-hero">
      <div className="freepdf-hero-copy"><span className="freepdf-eyebrow">Free PDF tools, clear limits</span><h1>Edit PDFs online.<br />Completely free.</h1><p>Edit, sign, fill, merge, split, organize, and convert PDFs without subscriptions, watermarks, or forced signup.</p><div className="freepdf-hero-actions"><button type="button" onClick={choose}><Upload size={18} /> Choose a PDF</button><a href="#popular-tools-title">Browse free tools</a></div><p className="freepdf-trust-line"><Check size={16} /> No signup for core tools <span>·</span> No watermark <span>·</span> Clear file limits</p></div>
      <section className={`freepdf-dropzone ${dragging ? "is-dragging" : ""} ${uploadError ? "has-error" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (onDropFiles) onDropFiles(event.dataTransfer.files); else onUpload?.({ target: { files: event.dataTransfer.files, value: "" } }); }}>
        <span className="freepdf-upload-icon"><Upload size={34} /></span><h2>{dragging ? "Drop your PDF here" : isUploading ? "Opening your PDF…" : "Drag and drop a PDF"}</h2><p>or choose one from your device</p><button type="button" onClick={choose} disabled={isUploading}>Choose a PDF</button><small>PDF · Up to 8 MB · Maximum 100 pages · Unencrypted files</small>
        <div className="freepdf-upload-status" aria-live="polite">{uploadError ? <p role="alert">{uploadError}</p> : isUploading ? <><p>{uploadStage.status}{uploadStage.fileName ? ` · ${uploadStage.fileName}` : ""}</p><div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadStage.percent || 0}><span style={{ width: `${uploadStage.percent || 0}%` }} /></div></> : null}</div>
        <Link to={ROUTE_PATHS.privacy}>How RealPDF handles files</Link>
      </section>
    </section>
    <div className="freepdf-browser-note"><ShieldCheck size={20} /><p><strong>Browser processing where supported.</strong> Supported tools process files directly in your browser. Tools that use cloud storage or account features are clearly identified.</p></div>

    <PopularTools />

    <section className="freepdf-section freepdf-how" aria-labelledby="how-title"><div className="freepdf-section-heading"><span>How it works</span><h2 id="how-title">From PDF to finished file in three steps</h2></div><div>{[["1", "Choose your file", "Upload a supported file or drag it into the tool."], ["2", "Make the change", "Use the focused editing, signing, page, or conversion controls."], ["3", "Download the result", "Review the output and download it without a watermark or signup."]].map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="freepdf-section freepdf-privacy" aria-labelledby="privacy-title"><div><span className="freepdf-eyebrow">Privacy and processing</span><h2 id="privacy-title">Your file stays close to you</h2><p>The editor and supported page and image tools process files in your browser. Guest work is kept in local browser storage when space allows. Firebase is used only for optional account authentication and cloud document history.</p><Link to={ROUTE_PATHS.privacy}>Read the privacy details <ArrowRight size={16} /></Link></div><ul><li><Check size={17} /> No file names, document text, signatures, or form values in analytics</li><li><Check size={17} /> No account required for supported processing or download</li><li><Check size={17} /> Cloud history is optional and clearly identified</li></ul></section>

    <section className="freepdf-section freepdf-editor-capabilities" aria-labelledby="editor-title"><div className="freepdf-section-heading"><span>Current editor</span><h2 id="editor-title">What the editor can do today</h2><p>Work with real pages while keeping the limitations visible.</p></div><div>{[["edit", "Edit and add text", "Change detected text overlays or add new text. Original typography may vary."], ["highlight", "Annotate and review", "Highlight, draw, add shapes, whiteout areas, and place local comments."], ["form", "Fill and sign", "Add text, checkboxes, dates, initials, and your own signature as flattened content."], ["pages", "Organize pages", "Reorder, rotate, duplicate, delete, merge, or split pages with dedicated tools."], ["download", "Export without a watermark", "Download a new PDF and inspect every changed page before sharing it."], ["reader", "Read and search", "Move between pages, zoom, and search text extracted from text-based PDFs."]].map(([icon, title, copy]) => <article key={title}><span><ToolIcon name={icon} size={22} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="freepdf-section freepdf-faq" aria-labelledby="faq-title"><div className="freepdf-section-heading"><span>Frequently asked questions</span><h2 id="faq-title">Clear answers before you upload</h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className="freepdf-final"><h2>Ready to finish your PDF?</h2><p>Choose a supported PDF and start immediately. No signup, no watermark, no payment screen.</p><button type="button" onClick={choose}><Upload size={18} /> Choose a PDF</button><Link to={ROUTE_PATHS.privacy}>Privacy and file handling</Link></section>

    <footer className="freepdf-footer"><div><Brand /><p>Free PDF tools with honest limits.</p></div><nav aria-label="Footer"><Link to={ROUTE_PATHS.tools}>All tools</Link><Link to={ROUTE_PATHS.help}>Help</Link><Link to={ROUTE_PATHS.privacy}>Privacy</Link><Link to={ROUTE_PATHS.terms}>Terms</Link></nav><span>© 2026 RealPDF</span></footer>
  </main>;
}
