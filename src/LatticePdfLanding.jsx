import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import Cloud from "lucide-react/dist/esm/icons/cloud.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import Globe2 from "lucide-react/dist/esm/icons/globe-2.mjs";
import Grid3X3 from "lucide-react/dist/esm/icons/grid-3x3.mjs";
import Menu from "lucide-react/dist/esm/icons/menu.mjs";
import Minus from "lucide-react/dist/esm/icons/minus.mjs";
import PencilLine from "lucide-react/dist/esm/icons/pencil-line.mjs";
import Plus from "lucide-react/dist/esm/icons/plus.mjs";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.mjs";
import Rocket from "lucide-react/dist/esm/icons/rocket.mjs";
import Scale from "lucide-react/dist/esm/icons/scale.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Signature from "lucide-react/dist/esm/icons/signature.mjs";
import UserRound from "lucide-react/dist/esm/icons/user-round.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import Zap from "lucide-react/dist/esm/icons/zap.mjs";
import { BrandWordmark } from "./components/public/BrandWordmark.jsx";
import { PageMetadata } from "./components/public/PageMetadata.jsx";
import { HOMEPAGE_DESCRIPTION, HOMEPAGE_TITLE } from "./seo/homepageMetadata.js";
import { ProfessionalToolIcon } from "./components/public/ProfessionalToolIcon.jsx";
import { PUBLIC_FOOTER_NAVIGATION_GROUPS, PUBLIC_LEGAL_LINKS, PUBLIC_PRIMARY_NAV_LINKS } from "./components/public/publicNavigation.js";
import { absoluteSiteUrl } from "./config/site.js";
import { trackComparisonCta } from "./analytics/productAnalytics.js";
import { ROUTE_PATHS } from "./router/routePaths.js";
import { ToolIcon } from "./tools/ToolIcon.jsx";
import { TOOL_CATEGORIES, TOOL_REGISTRY } from "./tools/toolRegistry.js";
import { LANDING_DOCUMENT_ACCEPT } from "./tools/landingDocumentUpload.js";

const asset = (fileName) => `${import.meta.env.BASE_URL}homepage/${fileName}`;

const faqs = [
  ["Is PDFEnrich really free?", "Yes. PDFEnrich is completely free. There are no subscriptions, paid tiers, checkout, email requirement, or PDFEnrich watermark—and no paid plans are planned."],
  ["Do I need an account?", "No. Open, edit, and download supported files as a guest. When you sign in, PDFs you open are also saved privately to your account for cross-device access."],
  ["Are files processed in my browser?", "Supported editor, page, and image tools process files in your browser. Guest work stays on that device; signed-in PDFs also sync as finished private copies to your account."],
  ["What is the editor file limit?", "The editor accepts valid, unencrypted PDFs up to 50 MB and 500 pages. Large documents open progressively, so later pages render as you visit them."],
  ["Can PDFEnrich perfectly rewrite original PDF text?", "Not always. The editor can change detected text overlays and add new content, but original fonts, spacing, and layout may vary. Always review the export."],
  ["Does PDFEnrich add a watermark?", "No. PDFEnrich does not add a watermark to supported exports."],
];

const taskLanes = [
  {
    eyebrow: "Edit & sign",
    title: "Make every change in one focused workspace.",
    copy: "Add text, signatures, highlights, shapes, form answers, and comments without bouncing between apps.",
    image: "edit-sign-preview-v3.png",
    imageAlt: "Illustration of PDF text, image, signature, form, and page editing tools",
    route: ROUTE_PATHS.editPdf,
    cta: "Open the PDF editor",
  },
  {
    eyebrow: "Organize",
    title: "Put every page exactly where it belongs.",
    copy: "Reorder, rotate, duplicate, remove, merge, and split pages with clear visual controls.",
    image: "organize-preview-v2.png",
    imageAlt: "PDFEnrich page organizer with PDF page thumbnails ready to reorder",
    route: "/organize-pdf",
    cta: "Organize a PDF",
  },
  {
    eyebrow: "Convert",
    title: "Move between PDF and the formats you use.",
    copy: "Turn PDFs into Word or images, and convert common files back into clean PDFs.",
    image: "convert-preview-v2.png",
    imageAlt: "PDFEnrich conversion workspace showing PDF, Word, and image formats",
    route: "/pdf-to-word",
    cta: "Convert a PDF",
  },
];

const heroTasks = [
  { label: "Edit", route: ROUTE_PATHS.editPdf, icon: PencilLine, tone: "coral" },
  { label: "Sign", route: ROUTE_PATHS.signPdf, icon: Signature, tone: "lilac" },
  { label: "Organize", route: "/organize-pdf", icon: Grid3X3, tone: "yellow" },
  { label: "Convert", route: "/pdf-to-jpg", icon: RefreshCw, tone: "blue" },
];

const workflowSteps = [
  {
    number: "1",
    title: "Choose your file",
    copy: "Drop in a supported document or choose one from your device.",
    icon: Upload,
  },
  {
    number: "2",
    title: "Make the change",
    copy: "Use focused editing, signing, page, or conversion controls.",
    icon: PencilLine,
  },
  {
    number: "3",
    title: "Download the result",
    copy: "Review your output and download without a watermark.",
    icon: Download,
  },
];

const privacyProofs = [
  {
    title: "Processed in your browser",
    copy: "No document text, signatures, or form values are sent to analytics.",
    icon: Globe2,
  },
  {
    title: "No account required",
    copy: "Start working right away with supported tools—no signup needed.",
    icon: UserRound,
  },
  {
    title: "Clear account sync",
    copy: "Guest files stay local. PDFs opened while signed in sync privately across your devices.",
    icon: Cloud,
  },
];

const homepageFeatureTools = [
  { id: "merge-pdf", description: "Combine multiple PDFs into one clean document.", tone: "blue" },
  { id: "compress-pdf", description: "Reduce file size with clear quality options.", tone: "yellow" },
  { id: "edit-pdf", description: "Add text, images, links, shapes, and more.", tone: "coral" },
  { id: "pdf-to-word", name: "Convert PDF", description: "Move between PDF, Word, JPG, and more.", icon: "convert", tone: "lilac" },
  { id: "split-pdf", description: "Separate pages into smaller PDF files.", tone: "blue" },
  { id: "sign-pdf", description: "Add typed, drawn, or uploaded signatures.", tone: "lilac" },
  { id: "fill-pdf", description: "Complete forms, dates, checks, and initials.", tone: "coral" },
  { id: "organize-pdf", description: "Reorder, rotate, duplicate, or delete pages.", tone: "yellow" },
  { id: "ocr-pdf", description: "Make scanned PDFs searchable and selectable.", tone: "blue" },
  { id: "protect-pdf", description: "Add password protection before sharing.", tone: "lilac" },
].map((entry) => {
  const tool = TOOL_REGISTRY.find((candidate) => candidate.id === entry.id);
  return tool ? { ...tool, ...entry } : null;
}).filter(Boolean);

const toolsMenuColumns = [
  ["compress", "ai"],
  ["organize"],
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
  return <Link className="freepdf-brand" to={ROUTE_PATHS.home} aria-label="PDFEnrich home"><BrandWordmark logo /></Link>;
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

  return <header className="freepdf-header-shell">
    <div className="freepdf-header">
      <Brand />
      <nav className="freepdf-desktop-nav" aria-label="Primary navigation">
        <button ref={toolsButtonRef} type="button" className={`freepdf-tools-trigger ${toolsOpen ? "is-open" : ""}`} aria-expanded={toolsOpen} aria-haspopup="true" aria-controls="freepdf-tools-menu" onClick={() => { setToolsOpen((value) => !value); setOpen(false); }}><span>Tools</span> <ChevronDown className="freepdf-tools-chevron" size={14} /></button>
        {PUBLIC_PRIMARY_NAV_LINKS.slice(1).map(({ label, to }) => <Link key={label} to={to} onClick={() => setToolsOpen(false)}>{label}</Link>)}
      </nav>
      <div className="freepdf-header-actions">
        <Link to={ROUTE_PATHS.login}>Log in</Link>
        <button type="button" className="freepdf-header-cta" onClick={onChoose}>Use for free</button>
        <button className="freepdf-menu-button" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => { setOpen((value) => !value); setToolsOpen(false); }}>{open ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
      {open && <nav className="freepdf-mobile-nav" aria-label="Mobile navigation">{PUBLIC_PRIMARY_NAV_LINKS.map(({ label, to }, index) => <Link ref={index === 0 ? firstLinkRef : undefined} key={label} to={to} onClick={() => setOpen(false)}>{label}</Link>)}<Link to={ROUTE_PATHS.login} onClick={() => setOpen(false)}>Log in</Link><button type="button" onClick={() => { setOpen(false); onChoose(); }}>Use for free</button></nav>}
    </div>
    {toolsOpen && <div ref={toolsMenuRef} className="freepdf-tools-mega" id="freepdf-tools-menu" role="region" aria-label="PDFEnrich tools">
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
    aria-label="Choose a document from your device"
    aria-disabled={isUploading}
    aria-busy={isUploading}
    onClick={openFilePicker}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFilePicker();
      }
    }}
    onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
    onDrop={(event) => { event.preventDefault(); setDragging(false); if (onDropFiles) onDropFiles(event.dataTransfer.files); else onUpload?.({ target: { files: event.dataTransfer.files, value: "" } }); }}
  >
    <span className="freepdf-upload-icon"><Upload size={26} /></span>
    <span className="freepdf-dropzone-title">{dragging ? "Drop your document here" : isUploading ? "Opening your document…" : "Drop your document here"}</span>
    <span className="freepdf-dropzone-copy">or <strong>choose a file</strong> · PDF, Word, Excel, PowerPoint, text, or image</span>
    <span className="freepdf-dropzone-free"><Check size={15} aria-hidden="true" /> Free to use. No account or payment needed.</span>
    <span className="freepdf-upload-status" aria-live="polite">{uploadError ? <span role="alert">{uploadError}</span> : isUploading ? <><span className="freepdf-upload-status-copy">{uploadStage.status}{uploadStage.fileName ? ` · ${uploadStage.fileName}` : ""}</span><span className="freepdf-upload-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadStage.percent || 0}><span style={{ width: `${uploadStage.percent || 0}%` }} /></span></> : null}</span>
  </button>;
}

function PopularTools() {
  return <section className="freepdf-section freepdf-tools-section" aria-labelledby="popular-tools-title">
    <div className="freepdf-section-heading"><span>Popular tools</span><h2 id="popular-tools-title">Small tools for the jobs in between.</h2><p>Edit, sign, organize, convert, and finish PDFs with focused browser tools.</p></div>
    <div className="freepdf-tool-grid">{homepageFeatureTools.map((tool) => <Link key={tool.id} className={`freepdf-tool-card is-${tool.tone}`} to={tool.route}><span className="freepdf-tool-icon"><ProfessionalToolIcon toolId={tool.id} /></span><div><h3>{tool.name}</h3><p>{tool.description}</p></div><ArrowRight size={17} aria-hidden="true" /></Link>)}</div>
    <Link className="freepdf-text-link" to={ROUTE_PATHS.tools}>Browse every PDF tool <ArrowRight size={16} /></Link>
  </section>;
}

function ComparisonTeaser() {
  const vendors = ["DocHub", "Smallpdf", "iLovePDF", "Adobe Acrobat", "Sejda"];
  return <section className="freepdf-section freepdf-comparison-teaser" aria-labelledby="comparison-teaser-title">
    <div>
      <span className="freepdf-comparison-mark"><Scale size={21} aria-hidden="true" /></span>
      <div>
        <small>Independent product comparisons</small>
        <h2 id="comparison-teaser-title">Choosing another PDF tool?</h2>
        <p>See where PDFEnrich is simpler, where established competitors go further, and which workflow fits the document in front of you.</p>
      </div>
    </div>
    <div className="freepdf-comparison-vendors" aria-label="Available PDF editor comparisons">{vendors.map((vendor) => <span key={vendor}>{vendor}</span>)}</div>
    <Link className="freepdf-comparison-link" to={ROUTE_PATHS.compare} onClick={() => trackComparisonCta("/", "homepage_teaser")}>Compare PDFEnrich <ArrowRight size={16} /></Link>
  </section>;
}

/* Legacy footer intentionally retired in favor of the utility footer below.
  return <footer className="freepdf-site-footer">
    <div className="freepdf-footer-surface">
      <Link className="freepdf-footer-wordmark" to={ROUTE_PATHS.home} aria-label="PDFEnrich home">
        <span>PDF</span><strong>Enrich</strong>
      </Link>
      <FooterToolDirectory />
      <div className="freepdf-footer-meta">
        <div><Brand /><p>Every PDF task, finally in one place.</p></div>
        <nav aria-label="Footer"><Link to={ROUTE_PATHS.tools}>All tools</Link><Link to={ROUTE_PATHS.support}>Support</Link><Link to={ROUTE_PATHS.privacy}>Privacy</Link><Link to={ROUTE_PATHS.terms}>Terms</Link></nav>
        <span>© 2026 PDFEnrich</span>
      </div>
    </div>
  </footer>;
*/

function ClosingAssurances() {
  const assurances = [
    { icon: ShieldCheck, title: "Private by design", copy: "Supported tools process files in your browser." },
    { icon: Check, title: "No account needed", copy: "Edit, convert, and sign right away." },
    { icon: Globe2, title: "Works in your browser", copy: "No downloads or installations." },
  ];
  return <section className="freepdf-closing-assurances" aria-label="PDFEnrich benefits"><div>{assurances.map(({ icon: Icon, title, copy }) => <article key={title}><span><Icon size={26} aria-hidden="true" /></span><div><strong>{title}</strong><p>{copy}</p></div></article>)}</div></section>;
}

function SiteFooter() {
  return <footer className="freepdf-site-footer">
    <div className="freepdf-footer-surface">
      <div className="freepdf-footer-main">
        <div className="freepdf-footer-brand-block">
          <Link className="freepdf-footer-brand" to={ROUTE_PATHS.home} aria-label="PDFEnrich home"><BrandWordmark logo /></Link>
          <p>Free and simple PDF tools, all in one place.</p>
          <span>100% free · No subscriptions · No watermarks</span>
        </div>
        <section className="freepdf-footer-directory" aria-label="PDF tool directory">
          {PUBLIC_FOOTER_NAVIGATION_GROUPS.map((group) => <nav key={group.title} aria-label={group.title}>
            <h2>{group.title}</h2>
            {group.links.map(({ label, to }) => <Link key={label} to={to}>{label}</Link>)}
          </nav>)}
        </section>
      </div>
      <div className="freepdf-footer-meta">
        <span>© 2026 PDFEnrich. All rights reserved.</span>
        <nav aria-label="Footer legal">{PUBLIC_LEGAL_LINKS.map(({ label, to }) => <Link key={label} to={to}>{label}</Link>)}</nav>
        <span className="freepdf-footer-domain">pdfenrich.com</span>
      </div>
    </div>
  </footer>;
}

export function LatticePdfLanding({ fileInputRef, onUpload, onSelectFiles, onDropFiles, uploadError = "", uploadStage = { status: "idle", percent: 0, fileName: "" } }) {
  const fallbackInputRef = useRef(null);
  const inputRef = fileInputRef || fallbackInputRef;
  const [dragging, setDragging] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const isUploading = Boolean(uploadStage?.status && !["idle", "complete", "error"].includes(uploadStage.status));
  const choose = () => onSelectFiles ? onSelectFiles() : inputRef.current?.click();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("realpdf:homepage-rendered"));
  }, []);

  return <main className="freepdf-page">
    <PageMetadata title={HOMEPAGE_TITLE} description={HOMEPAGE_DESCRIPTION} canonicalUrl="/" schemas={[{ "@context": "https://schema.org", "@type": "WebSite", "@id": `${absoluteSiteUrl("/")}#website`, name: "PDFEnrich", alternateName: "PDFEnrich", url: absoluteSiteUrl("/"), inLanguage: "en-US" }, { "@context": "https://schema.org", "@type": "Organization", "@id": `${absoluteSiteUrl("/")}#organization`, name: "PDFEnrich", url: absoluteSiteUrl("/"), logo: absoluteSiteUrl("/icon.svg") }, { "@context": "https://schema.org", "@type": "WebApplication", name: "PDFEnrich", url: absoluteSiteUrl("/"), description: "Free browser PDF tools for editing, signing, organizing, and converting PDFs with no sign up, subscription, payment, or watermark.", applicationCategory: "UtilitiesApplication", applicationSubCategory: "PDF editor", operatingSystem: "Any", browserRequirements: "Requires a modern JavaScript-enabled browser", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, featureList: ["Edit PDF", "Sign PDF", "Merge PDF", "Split PDF", "Compress PDF", "Convert PDF"] }]} />
    <input ref={inputRef} className="hidden-input" type="file" accept={LANDING_DOCUMENT_ACCEPT} onChange={onUpload} />
    <SiteHeader onChoose={choose} />

    <section className="freepdf-hero freepdf-context-hero">
      <div className="freepdf-hero-layout">
        <div className="freepdf-hero-copy">
          <div className="freepdf-free-promise"><Check size={15} aria-hidden="true" /> 100% free. No subscriptions, payments, or watermarks.</div>
          <h1>Every document task,<br /><span>{"{free and simple.}"}</span></h1>
          <p>One free workspace, every PDF tool you need.</p>
        </div>

        <div className="freepdf-product-stage">
          <nav className="freepdf-hero-task-tabs" aria-label="Popular PDF tasks">
            {heroTasks.map(({ label, route, icon: Icon, tone }) => <Link className={`freepdf-hero-task-tab is-${tone}`} key={label} to={route}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>)}
          </nav>
          <Dropzone choose={choose} dragging={dragging} setDragging={setDragging} isUploading={isUploading} uploadError={uploadError} uploadStage={uploadStage} onDropFiles={onDropFiles} onUpload={onUpload} />
        </div>

        <section className="freepdf-trust-strip" aria-label="PDFEnrich promises">
          <div><span className="freepdf-trust-icon is-lilac"><ShieldCheck size={23} /></span><span><strong>Browser processing</strong><small>Supported tools keep files in this tab</small></span></div>
          <div><span className="freepdf-trust-icon is-yellow"><Zap size={23} /></span><span><strong>No signup needed</strong><small>Start working right away</small></span></div>
          <div><span className="freepdf-trust-icon is-blue"><Globe2 size={23} /></span><span><strong>Works anywhere</strong><small>On any modern browser</small></span></div>
          <div><span className="freepdf-trust-icon is-pink"><Rocket size={23} /></span><span><strong>Completely free</strong><small>No subscriptions or paid plans</small></span></div>
        </section>
      </div>
    </section>

    <section className="freepdf-task-section" aria-labelledby="task-lanes-title">
      <div className="freepdf-section-heading freepdf-task-heading"><span>One home for every PDF</span><h2 id="task-lanes-title">From first edit to final export.</h2><p>PDFEnrich keeps the work simple, visual, and close at hand.</p></div>
      <div className="freepdf-task-lanes">{taskLanes.map((lane, index) => <article className={`freepdf-task-lane ${index % 2 ? "is-reversed" : ""}`} key={lane.eyebrow}>
        <div className="freepdf-task-copy"><span>{lane.eyebrow}</span><h3>{lane.title}</h3><p>{lane.copy}</p><Link to={lane.route}>{lane.cta} <ArrowRight size={17} /></Link></div>
        <Link className="freepdf-task-visual" to={lane.route} aria-label={lane.cta}><HomepageImage fileName={lane.image} alt={lane.imageAlt} width="1536" height="1024" sizes="(max-width: 760px) 100vw, 560px" /></Link>
      </article>)}</div>
    </section>

    <PopularTools />

    <ComparisonTeaser />

    <section className="freepdf-section freepdf-how freepdf-context-workflow" aria-labelledby="how-title">
      <div className="freepdf-context-workflow-heading">
        <span><i aria-hidden="true" /> How it works · three steps</span>
        <h2 id="how-title">From any document to <em>a finished PDF.</em></h2>
        <p>Bring the file. PDFEnrich keeps the path from first change to final download focused and clear.</p>
      </div>
      <div className="freepdf-context-workflow-board" aria-label="Three steps from upload to download">
        <article className="freepdf-context-workflow-start">
          <header><span>Start</span><small>01</small></header>
          <div className="freepdf-context-workflow-start-icon" aria-hidden="true"><Upload size={28} /></div>
          <h3>{workflowSteps[0].title}</h3>
          <p>{workflowSteps[0].copy}</p>
          <div className="freepdf-context-file-row"><span>DOC</span><span>XLS</span><span>PPT</span><span>PDF</span><span>IMG</span></div>
        </article>
        <article className="freepdf-context-workflow-finish">
          <header><span>PDFEnrich</span><small>02—03</small></header>
          <div className="freepdf-context-workflow-steps">
            {workflowSteps.slice(1).map(({ number, title, copy, icon: Icon }) => <div key={number}>
              <span className="freepdf-context-workflow-step-icon" aria-hidden="true"><Icon size={21} /></span>
              <span className="freepdf-context-workflow-step-number">0{number}</span>
              <div><h3>{title}</h3><p>{copy}</p></div>
              <Check size={18} aria-hidden="true" />
            </div>)}
          </div>
          <div className="freepdf-context-workflow-output"><span><Check size={16} aria-hidden="true" /></span><div><small>Ready to download</small><strong>your-document.pdf</strong></div><Download size={19} aria-hidden="true" /></div>
        </article>
      </div>
    </section>

    <section className="freepdf-section freepdf-context-privacy" aria-labelledby="privacy-title">
      <div className="freepdf-context-ending-heading">
        <span><ShieldCheck size={13} aria-hidden="true" /> Privacy, clearly explained</span>
        <h2 id="privacy-title">Your document stays <em>under your control.</em></h2>
        <p>Start locally without an account. Use private account sync only when you deliberately sign in.</p>
      </div>
      <div className="freepdf-context-privacy-board">
        <article className="freepdf-context-privacy-local">
          <header><span>Start locally</span><small>01</small></header>
          <span className="freepdf-context-privacy-icon" aria-hidden="true"><Globe2 size={28} /></span>
          <h3>Work in your browser.</h3>
          <p>Supported editor, page, and image tools process the document in your browser, with no account required.</p>
          <ul>
            {privacyProofs.slice(0, 2).map(({ title, copy, icon: Icon }) => <li key={title}><Icon size={18} aria-hidden="true" /><span><strong>{title}</strong><small>{copy}</small></span></li>)}
          </ul>
        </article>
        <article className="freepdf-context-privacy-sync">
          <header><span>Optional account sync</span><small>02</small></header>
          <span className="freepdf-context-privacy-icon" aria-hidden="true"><Cloud size={28} /></span>
          <h3>Sync only when you sign in.</h3>
          <p>Guest files stay on that device. PDFs opened while signed in also save as finished private account copies for access across your devices.</p>
          <div><Check size={18} aria-hidden="true" /><span><strong>{privacyProofs[2].title}</strong><small>{privacyProofs[2].copy}</small></span></div>
          <Link to={ROUTE_PATHS.privacy}>Read the privacy details <ArrowRight size={16} /></Link>
        </article>
      </div>
    </section>

    <section className="freepdf-section freepdf-context-faq" aria-labelledby="faq-title">
      <div className="freepdf-context-ending-heading">
        <span><i aria-hidden="true" /> FAQs</span>
        <h2 id="faq-title">Frequently asked <em>questions.</em></h2>
        <p>Clear answers about privacy, access, editing limits, and exports before you choose a file.</p>
      </div>
      <div className="freepdf-faq-list freepdf-context-faq-grid" aria-label="Frequently asked questions">
          {faqs.map(([question, answer], index) => {
            const isOpen = openFaqIndex === index;
            const number = String(index + 1).padStart(2, "0");
            return <article className={`freepdf-faq-item ${isOpen ? "is-open" : ""}`} key={question}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`homepage-faq-answer-${index}`}
                onClick={() => setOpenFaqIndex(isOpen ? null : index)}
              >
                <span>{question}</span>
                <span className="freepdf-faq-toggle" aria-hidden="true">{isOpen ? <Minus size={21} /> : <Plus size={21} />}</span>
              </button>
              {isOpen ? <div className="freepdf-faq-answer" id={`homepage-faq-answer-${index}`} role="region" aria-label={`${question} answer`}>
                <span>{number} of {String(faqs.length).padStart(2, "0")}</span>
                <p>{answer}</p>
              </div> : null}
            </article>;
          })}
      </div>
      <ClosingAssurances />
    </section>

    <SiteFooter />
  </main>;
}
