import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import Clock3 from "lucide-react/dist/esm/icons/clock-3.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import Grid3X3 from "lucide-react/dist/esm/icons/grid-3x3.mjs";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.mjs";
import Menu from "lucide-react/dist/esm/icons/menu.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { BrandWordmark } from "./components/public/BrandWordmark.jsx";
import { PageMetadata } from "./components/public/PageMetadata.jsx";
import { absoluteSiteUrl } from "./config/site.js";
import { ROUTE_PATHS } from "./router/routePaths.js";
import { ToolIcon } from "./tools/ToolIcon.jsx";
import { POPULAR_TOOLS, TOOL_CATEGORIES, TOOL_REGISTRY } from "./tools/toolRegistry.js";

const asset = (fileName) => `${import.meta.env.BASE_URL}homepage/${fileName}`;

const faqs = [
  ["Is FixThatPDF really free?", "Yes. Supported core tools are free to use with no subscription, checkout, email requirement, or FixThatPDF watermark."],
  ["Do I need an account?", "No. Open, edit, and download supported files as a guest. Create an account only when you want cloud document history."],
  ["Are files processed in my browser?", "Supported editor, page, and image tools process files in your browser. Account-based cloud history uses Firebase and is clearly separate."],
  ["What is the editor file limit?", "The editor accepts valid, unencrypted PDFs up to 50 MB and 500 pages. Large documents open progressively, so later pages render as you visit them."],
  ["Can FixThatPDF perfectly rewrite original PDF text?", "Not always. The editor can change detected text overlays and add new content, but original fonts, spacing, and layout may vary. Always review the export."],
  ["Does FixThatPDF add a watermark?", "No. FixThatPDF does not add a watermark to supported exports."],
];

const taskLanes = [
  {
    eyebrow: "Edit & sign",
    title: "Make every change in one focused workspace.",
    copy: "Add text, signatures, highlights, shapes, form answers, and comments without bouncing between apps.",
    image: "edit-sign-preview-v2.png",
    imageAlt: "Illustration of PDF text, image, signature, form, and page editing tools",
    route: ROUTE_PATHS.editPdf,
    cta: "Open the PDF editor",
  },
  {
    eyebrow: "Organize",
    title: "Put every page exactly where it belongs.",
    copy: "Reorder, rotate, duplicate, remove, merge, and split pages with clear visual controls.",
    image: "organize-preview.png",
    imageAlt: "FixThatPDF page organizer with PDF page thumbnails ready to reorder",
    route: "/organize-pdf",
    cta: "Organize a PDF",
  },
  {
    eyebrow: "Convert",
    title: "Move between PDF and the formats you use.",
    copy: "Turn PDFs into Word or images, and convert common files back into clean PDFs.",
    image: "convert-preview.png",
    imageAlt: "FixThatPDF conversion workspace showing PDF, Word, and image formats",
    route: "/pdf-to-word",
    cta: "Convert a PDF",
  },
];

const footerToolGroups = [
  {
    title: "Edit PDF",
    links: [["Edit PDF", "/edit-pdf"], ["Annotate PDF", "/annotate-pdf"], ["PDF Reader", "/pdf-reader"], ["Fill PDF", "/fill-pdf"], ["PDF Form Filler", "/pdf-form-filler"]],
  },
  {
    title: "Organize PDF",
    links: [["Merge PDF", "/merge-pdf"], ["Split PDF", "/split-pdf"], ["Rotate PDF", "/rotate-pdf"], ["Delete PDF Pages", "/delete-pdf-pages"], ["Extract PDF Pages", "/extract-pdf-pages"]],
  },
  {
    title: "Convert from PDF",
    links: [["PDF to Word", "/pdf-to-word"], ["PDF to JPG", "/pdf-to-jpg"], ["PDF to PNG", "/pdf-to-png"], ["PDF to Excel", "/pdf-to-excel"], ["PDF to PowerPoint", "/pdf-to-powerpoint"]],
  },
  {
    title: "Convert to PDF",
    links: [["Word to PDF", "/word-to-pdf"], ["JPG to PDF", "/jpg-to-pdf"], ["PNG to PDF", "/png-to-pdf"], ["Excel to PDF", "/excel-to-pdf"], ["PowerPoint to PDF", "/powerpoint-to-pdf"]],
  },
  {
    title: "Sign and protect",
    links: [["Sign PDF", "/sign-pdf"], ["Add Initials", "/add-initials"], ["Add Date Fields", "/add-date-fields"], ["Request Signatures", "/request-signatures"], ["Protect PDF", "/protect-pdf"]],
  },
  {
    title: "AI and OCR",
    links: [["OCR PDF", "/ocr-pdf"], ["PDF Scanner", "/pdf-scanner"], ["Scan to PDF", "/scan-to-pdf"], ["Image to Searchable PDF", "/image-to-searchable-pdf"], ["AI PDF Assistant", "/ai-pdf"]],
  },
];

const toolsMenuColumns = [
  ["compress", "ai"],
  ["organize", "templates"],
  ["edit-view", "compare-review"],
  ["from-pdf"],
  ["to-pdf"],
  ["sign", "protect", "ocr-scan"],
];

const releasedToolsByCategory = new Map(TOOL_CATEGORIES.map((category) => [
  category.id,
  TOOL_REGISTRY.filter((tool) => tool.category === category.id && tool.status !== "coming-soon"),
]));

function HomepageImage({ fileName, alt, width, height, sizes, eager = false }) {
  const baseName = fileName.replace(/\.png$/, "");
  return (
    <picture>
      <source type="image/webp" srcSet={`${asset(`${baseName}-640.webp`)} 640w, ${asset(`${baseName}-1200.webp`)} 1200w`} sizes={sizes} />
      <img src={asset(fileName)} alt={alt} width={width} height={height} loading={eager ? "eager" : "lazy"} decoding="async" fetchPriority={eager ? "high" : "auto"} />
    </picture>
  );
}

function Brand() {
  return <Link className="freepdf-brand" to={ROUTE_PATHS.home} aria-label="FixThatPDF home"><BrandWordmark /></Link>;
}

function SiteHeader({ onChoose }) {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const firstLinkRef = useRef(null);
  const toolsButtonRef = useRef(null);
  const toolsMenuRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        if (toolsOpen) {
          setToolsOpen(false);
          toolsButtonRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toolsOpen]);

  useEffect(() => {
    if (!toolsOpen) return undefined;
    const onPointerDown = (event) => {
      if (!toolsMenuRef.current?.contains(event.target) && !toolsButtonRef.current?.contains(event.target)) setToolsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [toolsOpen]);

  useEffect(() => {
    if (open) firstLinkRef.current?.focus();
  }, [open]);

  const links = [
    ["Tools", ROUTE_PATHS.tools],
    ["Edit", ROUTE_PATHS.editPdf],
    ["Organize", "/organize-pdf"],
    ["Sign", ROUTE_PATHS.signPdf],
    ["Convert", "/pdf-to-jpg"],
  ];

  return <header className="freepdf-header-shell">
    <div className="freepdf-header">
      <Brand />
      <nav className="freepdf-desktop-nav" aria-label="Primary navigation">
        <button ref={toolsButtonRef} type="button" className={`freepdf-tools-trigger ${toolsOpen ? "is-open" : ""}`} aria-expanded={toolsOpen} aria-haspopup="true" aria-controls="freepdf-tools-menu" onClick={() => { setToolsOpen((value) => !value); setOpen(false); }}><Grid3X3 className="freepdf-tools-grid-icon" size={18} /> <span>Tools</span> <ChevronDown className="freepdf-tools-chevron" size={14} /></button>
        {links.slice(1).map(([label, href]) => <Link key={label} to={href} onClick={() => setToolsOpen(false)}>{label}</Link>)}
      </nav>
      <div className="freepdf-header-actions">
        <Link to={ROUTE_PATHS.login}>Log in</Link>
        <button type="button" className="freepdf-header-cta" onClick={onChoose}>Choose a PDF</button>
        <button className="freepdf-menu-button" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => { setOpen((value) => !value); setToolsOpen(false); }}>{open ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
      {open && <nav className="freepdf-mobile-nav" aria-label="Mobile navigation">{links.map(([label, href], index) => <Link ref={index === 0 ? firstLinkRef : undefined} key={label} to={href} onClick={() => setOpen(false)}>{label}</Link>)}<Link to={ROUTE_PATHS.login} onClick={() => setOpen(false)}>Log in</Link><button type="button" onClick={() => { setOpen(false); onChoose(); }}>Choose a PDF</button></nav>}
    </div>
    {toolsOpen && <div ref={toolsMenuRef} className="freepdf-tools-mega" id="freepdf-tools-menu" role="region" aria-label="FixThatPDF tools">
      <div className="freepdf-tools-mega-grid">
        {toolsMenuColumns.map((categoryIds, columnIndex) => <div className="freepdf-tools-menu-column" key={columnIndex}>
          {categoryIds.map((categoryId) => {
            const category = TOOL_CATEGORIES.find((item) => item.id === categoryId);
            const tools = releasedToolsByCategory.get(categoryId) || [];
            if (!category || !tools.length) return null;
            return <section key={category.id} aria-labelledby={`tools-menu-${category.id}`}>
              <h2 id={`tools-menu-${category.id}`}>{category.name}</h2>
              <div className="freepdf-tools-menu-list">
                {tools.map((tool) => <Link className="freepdf-tool-menu-link" key={tool.id} to={tool.route} onClick={() => setToolsOpen(false)} title={tool.shortDescription}>
                  <span className="freepdf-tool-menu-icon" style={{ backgroundColor: tool.accentColor }}><ToolIcon name={tool.icon} size={15} /></span>
                  <span>{tool.name}</span>
                </Link>)}
              </div>
            </section>;
          })}
        </div>)}
      </div>
    </div>}
  </header>;
}

function Dropzone({ choose, dragging, setDragging, isUploading, uploadError, uploadStage, onDropFiles, onUpload }) {
  const openFilePicker = () => {
    if (!isUploading) choose();
  };

  return <button
    type="button"
    className={`freepdf-dropzone ${dragging ? "is-dragging" : ""} ${uploadError ? "has-error" : ""}`}
    aria-label="Choose a PDF from your device"
    aria-disabled={isUploading}
    aria-busy={isUploading}
    onClick={openFilePicker}
    onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
    onDrop={(event) => { event.preventDefault(); setDragging(false); if (onDropFiles) onDropFiles(event.dataTransfer.files); else onUpload?.({ target: { files: event.dataTransfer.files, value: "" } }); }}
  >
    <span className="freepdf-upload-icon"><Upload size={26} /></span>
    <span className="freepdf-dropzone-title">{dragging ? "Drop your PDF here" : isUploading ? "Opening your PDF…" : "Drop your PDF here"}</span>
    <span className="freepdf-dropzone-copy">or choose a file from your device</span>
    <img className="freepdf-drop-file-art" src={asset("hero-pdf-document-v1.png")} alt="" width="270" height="360" decoding="async" />
    <span className="freepdf-upload-status" aria-live="polite">{uploadError ? <span role="alert">{uploadError}</span> : isUploading ? <><span className="freepdf-upload-status-copy">{uploadStage.status}{uploadStage.fileName ? ` · ${uploadStage.fileName}` : ""}</span><span className="freepdf-upload-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadStage.percent || 0}><span style={{ width: `${uploadStage.percent || 0}%` }} /></span></> : null}</span>
  </button>;
}

function PopularTools() {
  return <section className="freepdf-section freepdf-tools-section" aria-labelledby="popular-tools-title">
    <div className="freepdf-section-heading"><span>Popular tools</span><h2 id="popular-tools-title">Small tools for the jobs in between.</h2><p>Fast, focused workflows with limits shown before you upload.</p></div>
    <div className="freepdf-tool-grid">{POPULAR_TOOLS.slice(0, 6).map((tool) => <Link key={tool.id} className="freepdf-tool-card" to={tool.route}><span className="freepdf-tool-icon"><ToolIcon name={tool.icon} size={22} /></span><div><h3>{tool.name}</h3><p>{tool.shortDescription}</p></div><ArrowRight size={18} aria-hidden="true" /></Link>)}</div>
    <Link className="freepdf-text-link" to={ROUTE_PATHS.tools}>Browse every PDF tool <ArrowRight size={16} /></Link>
  </section>;
}

function FooterToolDirectory() {
  return <section className="freepdf-footer-directory" aria-label="PDF tool directory">
    {footerToolGroups.map((group) => <nav key={group.title} aria-label={group.title}>
      <h2>{group.title}</h2>
      {group.links.map(([label, route]) => <Link key={label} to={route}>{label}</Link>)}
    </nav>)}
  </section>;
}

function SiteFooter() {
  return <footer className="freepdf-site-footer">
    <div className="freepdf-footer-surface">
      <Link className="freepdf-footer-wordmark" to={ROUTE_PATHS.home} aria-label="FixThatPDF home">
        <span>FixThat</span><strong>PDF</strong>
      </Link>
      <FooterToolDirectory />
      <div className="freepdf-footer-meta">
        <div><Brand /><p>Every PDF task, finally in one place.</p></div>
        <nav aria-label="Footer"><Link to={ROUTE_PATHS.tools}>All tools</Link><Link to={ROUTE_PATHS.support}>Support</Link><Link to={ROUTE_PATHS.privacy}>Privacy</Link><Link to={ROUTE_PATHS.terms}>Terms</Link></nav>
        <span>© 2026 FixThatPDF</span>
      </div>
    </div>
  </footer>;
}

export function LatticePdfLanding({ fileInputRef, onUpload, onSelectFiles, onDropFiles, uploadError = "", uploadStage = { status: "idle", percent: 0, fileName: "" } }) {
  const fallbackInputRef = useRef(null);
  const inputRef = fileInputRef || fallbackInputRef;
  const [dragging, setDragging] = useState(false);
  const isUploading = Boolean(uploadStage?.status && !["idle", "complete", "error"].includes(uploadStage.status));
  const choose = () => onSelectFiles ? onSelectFiles() : inputRef.current?.click();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("realpdf:homepage-rendered"));
  }, []);

  return <main className="freepdf-page">
    <PageMetadata title="Every PDF Task in One Place | FixThatPDF" description="Edit, sign, fill, merge, split, organize, and convert PDFs without subscriptions, watermarks, or forced signup." canonicalUrl="/" schemas={[{ "@context": "https://schema.org", "@type": "WebSite", "@id": `${absoluteSiteUrl("/")}#website`, name: "FixThatPDF", alternateName: "Fix That PDF", url: absoluteSiteUrl("/"), inLanguage: "en-US" }, { "@context": "https://schema.org", "@type": "Organization", "@id": `${absoluteSiteUrl("/")}#organization`, name: "FixThatPDF", url: absoluteSiteUrl("/"), logo: absoluteSiteUrl("/icon.svg") }]} />
    <input ref={inputRef} className="hidden-input" type="file" accept="application/pdf,.pdf" onChange={onUpload} />
    <SiteHeader onChoose={choose} />

    <section className="freepdf-hero">
      <div className="freepdf-hero-backdrop" aria-hidden="true"><HomepageImage fileName="hero-paper-workspace-v1.png" alt="" width="1825" height="862" sizes="100vw" eager /></div>
      <div className="freepdf-hero-layout">
        <div className="freepdf-hero-copy">
          <span className="freepdf-eyebrow">More than just editing</span>
          <h1>Every PDF task,<br />finally in one place.</h1>
          <p>Edit, sign, organize, and convert your PDFs without subscriptions, watermarks, or a maze of different apps.</p>
          <section className="freepdf-trust-strip" aria-label="FixThatPDF promises">
            <div><LockKeyhole size={22} /><span><strong>Private by design</strong><small>Your file stays private</small></span></div>
            <div><ShieldCheck size={22} /><span><strong>No watermark</strong><small>Clean results, always</small></span></div>
            <div><Clock3 size={22} /><span><strong>Start right away</strong><small>No account needed</small></span></div>
          </section>
        </div>

        <div className="freepdf-product-stage">
          <Dropzone choose={choose} dragging={dragging} setDragging={setDragging} isUploading={isUploading} uploadError={uploadError} uploadStage={uploadStage} onDropFiles={onDropFiles} onUpload={onUpload} />
        </div>
      </div>
    </section>

    <section className="freepdf-task-section" aria-labelledby="task-lanes-title">
      <div className="freepdf-section-heading freepdf-task-heading"><span>One home for every PDF</span><h2 id="task-lanes-title">From first edit to final export.</h2><p>FixThatPDF keeps the work simple, visual, and close at hand.</p></div>
      <div className="freepdf-task-lanes">{taskLanes.map((lane, index) => <article className={`freepdf-task-lane ${index % 2 ? "is-reversed" : ""}`} key={lane.eyebrow}>
        <div className="freepdf-task-copy"><span>{lane.eyebrow}</span><h3>{lane.title}</h3><p>{lane.copy}</p><Link to={lane.route}>{lane.cta} <ArrowRight size={17} /></Link></div>
        <Link className="freepdf-task-visual" to={lane.route} aria-label={lane.cta}><HomepageImage fileName={lane.image} alt={lane.imageAlt} width="1536" height="1024" sizes="(max-width: 760px) 100vw, 560px" /></Link>
      </article>)}</div>
    </section>

    <PopularTools />

    <section className="freepdf-section freepdf-how" aria-labelledby="how-title"><div className="freepdf-section-heading"><span>How it works</span><h2 id="how-title">Choose it. Change it. Download it.</h2></div><div>{[["1", "Choose your file", "Upload a supported PDF or drag it into the workspace."], ["2", "Make the change", "Use focused editing, signing, page, or conversion controls."], ["3", "Download the result", "Review your output and download without a watermark."]].map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="freepdf-section freepdf-privacy" aria-labelledby="privacy-title"><div><span className="freepdf-section-kicker">Privacy, without the fine print</span><h2 id="privacy-title">Your file stays close to you.</h2><p>Supported editor, page, and image tools process files in your browser. Firebase is used only for optional account authentication and cloud document history.</p><Link to={ROUTE_PATHS.privacy}>Read the privacy details <ArrowRight size={16} /></Link></div><ul><li><Check size={17} /> No document text, signatures, or form values in analytics</li><li><Check size={17} /> No account required for supported processing or download</li><li><Check size={17} /> Optional cloud history is always clearly identified</li></ul></section>

    <section className="freepdf-section freepdf-faq" aria-labelledby="faq-title"><div className="freepdf-section-heading"><span>Good to know</span><h2 id="faq-title">Clear answers before you upload.</h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>

    <section className="freepdf-final">
      <div className="freepdf-final-copy">
        <span>Ready when you are</span>
        <h2>Finish that PDF today.</h2>
        <p>Choose a supported PDF and start immediately. No signup, no watermark, no payment screen.</p>
        <div className="freepdf-final-trust" aria-label="Upload benefits">
          <span><Check size={15} /> Free to use</span>
          <span><ShieldCheck size={15} /> Private by design</span>
        </div>
      </div>
      <div className="freepdf-final-action">
        <div className="freepdf-final-file" aria-hidden="true"><FileText size={30} /></div>
        <strong>Your PDF, ready in seconds</strong>
        <small>Drop a file here or choose one from your device.</small>
        <button type="button" onClick={choose}><Upload size={18} /> Choose a PDF</button>
        <Link to={ROUTE_PATHS.privacy}>How we handle your files <ArrowRight size={13} /></Link>
      </div>
    </section>

    <SiteFooter />
  </main>;
}
