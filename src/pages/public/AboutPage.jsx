import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import FileCheck2 from "lucide-react/dist/esm/icons/file-check-2.mjs";
import Layers3 from "lucide-react/dist/esm/icons/layers-3.mjs";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.mjs";
import MousePointer2 from "lucide-react/dist/esm/icons/mouse-pointer-2.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.mjs";
import { Link } from "react-router-dom";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { absoluteSiteUrl } from "../../config/site.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import "./about-page.css";

const principles = [
  {
    icon: MousePointer2,
    title: "Obvious from the first click",
    copy: "A PDF tool should explain itself quickly, keep the document in focus, and make the next action easy to find.",
  },
  {
    icon: LockKeyhole,
    title: "Private by default",
    copy: "Supported workflows process files in the browser. PDF contents and passwords are not included in product analytics.",
  },
  {
    icon: FileCheck2,
    title: "Honest about the result",
    copy: "PDFEnrich shows real limits, measured outcomes, and review guidance instead of hiding tradeoffs behind vague success messages.",
  },
];

const capabilities = [
  ["Edit and annotate", "Change text, add content, draw, highlight, sign, stamp, link, and comment."],
  ["Organize pages", "Merge, split, rotate, reorder, duplicate, extract, crop, number, and watermark."],
  ["Convert documents", "Work between PDF, Word, Excel, PowerPoint, HTML, text, JPG, PNG, and OpenDocument formats."],
  ["Scan and review", "Run OCR, build searchable scans, compare versions, redact content, and protect final files."],
];

export function AboutPage() {
  return (
    <main className="about-page">
      <PageMetadata
        title="About PDFEnrich | A simpler browser-first PDF workspace"
        description="Meet PDFEnrich, a browser-first PDF workspace built to make editing, organizing, converting, signing, scanning, and reviewing documents feel straightforward."
        canonicalUrl={ROUTE_PATHS.about}
        schemas={[{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About PDFEnrich",
          url: absoluteSiteUrl(ROUTE_PATHS.about),
          mainEntity: {
            "@type": "Organization",
            name: "PDFEnrich",
            url: absoluteSiteUrl("/"),
            logo: absoluteSiteUrl("/pdfenrich-logo.png"),
          },
        }]}
      />

      <section className="about-hero">
        <div className="about-hero-copy">
          <span><Sparkles size={15} /> About PDFEnrich</span>
          <h1>PDF work should feel <em>clear, fast, and human.</em></h1>
          <p>PDFEnrich is a browser-first document workspace for the everyday jobs that make PDFs useful: editing, organizing, converting, signing, scanning, protecting, and reviewing.</p>
          <div>
            <Link className="about-primary" to={ROUTE_PATHS.editPdf}>Choose a PDF <ArrowRight size={17} /></Link>
            <Link className="about-secondary" to={ROUTE_PATHS.tools}>Explore all tools</Link>
          </div>
        </div>
        <figure className="about-product-frame">
          <div><span>THE WORKSPACE</span><small>Built around your document</small></div>
          <img src="/product-assets/pdfenrich-editor-workspace.png" alt="The PDFEnrich editor with a document open and editing tools visible" />
        </figure>
      </section>

      <section className="about-principles" aria-labelledby="about-principles-title">
        <header>
          <span>What guides us</span>
          <h2 id="about-principles-title">Useful software without the maze.</h2>
          <p>Every PDFEnrich workflow is designed around three practical promises.</p>
        </header>
        <div>{principles.map(({ icon: Icon, title, copy }) => <article key={title}><span><Icon size={22} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="about-browser-first">
        <div>
          <span><ShieldCheck size={16} /> Browser-first by design</span>
          <h2>Your document stays at the center—not an account wall.</h2>
          <p>You can open supported PDF tools and begin before creating an account. Where browser processing is supported, the file work happens on your device and the result downloads directly to you.</p>
          <Link to={ROUTE_PATHS.security}>Read about security and processing <ArrowRight size={16} /></Link>
        </div>
        <ol aria-label="How browser-first processing works">
          <li><strong>1</strong><span><b>Choose a file</b><small>Limits and supported formats are shown before processing.</small></span></li>
          <li><strong>2</strong><span><b>Finish the task</b><small>Use focused controls with progress, errors, and recovery kept visible.</small></span></li>
          <li><strong>3</strong><span><b>Review the result</b><small>Download the finished file and verify the pages that matter.</small></span></li>
        </ol>
      </section>

      <section className="about-capabilities" aria-labelledby="about-capabilities-title">
        <header>
          <span>One connected toolkit</span>
          <h2 id="about-capabilities-title">From quick fixes to finished documents.</h2>
        </header>
        <div>{capabilities.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="about-closing">
        <span><Layers3 size={21} /></span>
        <div><small>START WITH THE DOCUMENT</small><h2>Pick a PDF. PDFEnrich will make the next step clear.</h2></div>
        <Link to={ROUTE_PATHS.editPdf}>Open PDFEnrich <ArrowRight size={17} /></Link>
      </section>
    </main>
  );
}
