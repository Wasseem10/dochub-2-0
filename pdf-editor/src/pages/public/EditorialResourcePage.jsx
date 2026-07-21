import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import CalendarCheck from "lucide-react/dist/esm/icons/calendar-check.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.mjs";
import FileCheck from "lucide-react/dist/esm/icons/file-check.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import evidenceRecords from "../../../config/priority-two-evidence.mjs";
import { absoluteSiteUrl } from "../../config/site.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";

function pageSchemas(page) {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": page.kind === "benchmark" ? "TechArticle" : "Article",
    headline: page.title,
    description: page.metaDescription,
    dateModified: page.reviewedIso,
    datePublished: "2026-07-21",
    mainEntityOfPage: absoluteSiteUrl(page.path),
    author: { "@type": "Organization", name: "FixThatPDF", url: absoluteSiteUrl("/") },
    publisher: { "@type": "Organization", name: "FixThatPDF", url: absoluteSiteUrl("/") },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Resources", item: absoluteSiteUrl(ROUTE_PATHS.resources) },
      { "@type": "ListItem", position: 2, name: page.title, item: absoluteSiteUrl(page.path) },
    ],
  };
  return [articleSchema, breadcrumbSchema];
}

function BenchmarkTable() {
  return (
    <section className="editorial-table-section" aria-labelledby="benchmark-results-heading">
      <header><span className="public-eyebrow">Published assertions</span><h2 id="benchmark-results-heading">What the current core gate measures</h2><p>These are correctness and fidelity assertions, not marketing scores. Each row names the concrete output property checked by the release suite.</p></header>
      <div className="editorial-table-scroll">
        <table>
          <caption>Q3 2026 core PDF workflow assertions</caption>
          <thead><tr><th>Tool</th><th>Measured regression result</th><th>Verification method</th></tr></thead>
          <tbody>{evidenceRecords.map((record) => <tr key={record.toolId}><th scope="row"><Link to={`/${record.toolId}`}>{record.toolId.split("-").map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(" ")}</Link></th><td>{record.result}</td><td>{record.method}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function RedactionProof() {
  return (
    <section className="redaction-proof" aria-labelledby="redaction-proof-heading">
      <header><span className="public-eyebrow">Proof, not appearance</span><h2 id="redaction-proof-heading">The same black box can hide two very different PDFs</h2></header>
      <div className="redaction-proof-grid">
        <article>
          <span className="proof-status is-unsafe">Unsafe overlay</span>
          <div className="proof-document" role="img" aria-label="A black rectangle visually covering an account number while recoverable text remains in the PDF"><b>Customer record</b><p>Account number</p><span className="proof-secret">4815 1623 4200 0091</span><i /></div>
          <p>The page looks covered, but selecting, copying, extracting, or removing the overlay can reveal the original value.</p>
        </article>
        <article>
          <span className="proof-status is-safe">Verified rebuilt page</span>
          <div className="proof-document is-safe" role="img" aria-label="A flattened PDF page with a permanent black redaction where the account number used to be"><b>Customer record</b><p>Account number</p><i /></div>
          <p>The sensitive characters are absent from the exported page content. Search, extraction, metadata, and visual checks still complete the proof.</p>
        </article>
      </div>
    </section>
  );
}

function ArchitectureFlow() {
  return (
    <section className="architecture-flow" aria-labelledby="architecture-flow-heading">
      <header><span className="public-eyebrow">Data flow at a glance</span><h2 id="architecture-flow-heading">The document path is separate from the account path</h2></header>
      <div className="architecture-flow-row" role="img" aria-label="Diagram showing a user file processed locally in the browser and downloaded, with separate optional Firebase account and bounded analytics paths">
        <article><small>1</small><strong>Your file</strong><span>Selected from this device</span></article><ArrowRight />
        <article className="is-primary"><small>2</small><strong>Browser engine</strong><span>Reads, transforms, and exports locally</span></article><ArrowRight />
        <article><small>3</small><strong>Your download</strong><span>Saved back to this device</span></article>
      </div>
      <div className="architecture-side-paths"><span><ShieldCheck size={18} /><b>Optional account path</b> Firebase identity and signed-in document history</span><span><FileCheck size={18} /><b>Bounded events</b> Tool outcome and duration, never document content</span></div>
    </section>
  );
}

function EditorialMatrix({ matrix }) {
  if (!matrix) return null;
  return <section className="editorial-table-section"><div className="editorial-table-scroll"><table><caption>{matrix.caption}</caption><thead><tr>{matrix.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{matrix.rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={cell} scope="row">{cell}</th> : <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></section>;
}

export function EditorialResourcePage({ page }) {
  return (
    <main className={`editorial-page editorial-${page.kind}`}>
      <PageMetadata title={page.seoTitle} description={page.metaDescription} canonicalUrl={page.path} schemas={pageSchemas(page)} socialImageAlt={`${page.title} — original FixThatPDF resource`} />
      <nav className="editorial-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.resources}>Resources</Link><span>/</span><span aria-current="page">{page.eyebrow}</span></nav>

      <header className="editorial-hero">
        <span className="public-eyebrow">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        <p>{page.lede}</p>
        <div className="editorial-byline"><CalendarCheck size={18} /><span>Reviewed <time dateTime={page.reviewedIso}>{page.reviewedLabel}</time></span><i /> <span>Responsible team: {page.owner}</span></div>
      </header>

      <section className="editorial-facts" aria-label="Resource summary">{page.facts.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}</section>

      {page.kind === "redaction" && <RedactionProof />}
      {page.kind === "architecture" && <ArchitectureFlow />}

      <div className="editorial-article-layout">
        <article className="editorial-copy">
          {page.sections.map((section, index) => <section key={section.heading} id={`section-${index + 1}`}><h2>{section.heading}</h2><p>{section.body}</p>{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}><Check size={17} /><span>{bullet}</span></li>)}</ul>}</section>)}
        </article>
        <aside className="editorial-on-page" aria-label="On this page"><strong>On this page</strong>{page.sections.map((section, index) => <a key={section.heading} href={`#section-${index + 1}`}>{section.heading}</a>)}{page.downloads && <a href="#downloads">Downloads</a>}<Link to={ROUTE_PATHS.support}>Question or correction?</Link></aside>
      </div>

      <EditorialMatrix matrix={page.matrix} />
      {page.kind === "benchmark" && <BenchmarkTable />}

      {page.downloads && <section id="downloads" className="editorial-downloads"><header><span className="public-eyebrow">Open evidence</span><h2>Download the files and check the work</h2><p>Files are provided for testing, adaptation, or verification. Intentionally malformed and encrypted fixtures are clearly labeled.</p></header><div>{page.downloads.map(([label, href, meta]) => <a key={href} href={href} download><span><Download size={20} /></span><strong>{label}</strong><small>{meta}</small><ExternalLink size={16} /></a>)}</div></section>}

      <section className="editorial-related"><header><span className="public-eyebrow">Continue with purpose</span><h2>Related tools and original resources</h2></header><div>{page.related.map((item) => <Link key={item.path} to={item.path}><strong>{item.label}</strong><p>{item.description}</p><span>Open <ArrowRight size={15} /></span></Link>)}</div></section>

      <footer className="editorial-accountability"><ShieldCheck size={25} /><div><strong>Editorial accountability</strong><p>Published and reviewed by {page.owner}. The page identifies what is measured, what remains a limitation, and how to report a reproducible correction.</p></div><Link to={ROUTE_PATHS.support}>Send a correction</Link></footer>
    </main>
  );
}
