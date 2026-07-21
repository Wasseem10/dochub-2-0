import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.mjs";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { absoluteSiteUrl } from "../../config/site.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { ToolIcon } from "../../tools/ToolIcon.jsx";
import { getToolCategoryPage } from "../../tools/toolCategoryPages.js";
import { TOOL_CATEGORIES, TOOL_REGISTRY } from "../../tools/toolRegistry.js";

const releasedTools = TOOL_REGISTRY.filter((tool) => tool.status !== "coming-soon");

const featureHighlights = [
  {
    title: "Edit directly on the page",
    copy: "Change detected text, add new text, images, links, highlights, drawings, shapes, comments, and form answers in one workspace.",
    icon: "edit",
    route: ROUTE_PATHS.editPdf,
  },
  {
    title: "Organize every page",
    copy: "Merge, split, reorder, rotate, duplicate, crop, delete, extract, number, watermark, and flatten PDF pages.",
    icon: "pages",
    route: "/organize-pdf",
  },
  {
    title: "Convert useful formats",
    copy: "Move between PDFs, Word, Excel, PowerPoint, HTML, TXT, JPG, PNG, RTF, OpenDocument files, and more.",
    icon: "convert",
    route: "/pdf-to-word",
  },
  {
    title: "Sign, scan, protect, and review",
    copy: "Place signatures and dates, run OCR, compare document versions, redact content, protect files, and leave review comments.",
    icon: "sign",
    route: ROUTE_PATHS.signPdf,
  },
];

function availabilityClass(status) {
  return status === "beta" ? "is-beta" : status === "partial" ? "is-limited" : "is-ready";
}

export function FeaturesPage() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTools = useMemo(() => releasedTools.filter((tool) => !normalizedQuery || `${tool.name} ${tool.shortDescription} ${tool.categoryName}`.toLowerCase().includes(normalizedQuery)), [normalizedQuery]);
  const featureGroups = TOOL_CATEGORIES.map((category) => ({
    ...category,
    tools: filteredTools.filter((tool) => tool.category === category.id),
  })).filter((category) => category.tools.length);

  return (
    <main className="features-page">
      <PageMetadata
        title="All Features | FixThatPDF"
        description={`See all ${releasedTools.length} released FixThatPDF features for editing, organizing, converting, signing, scanning, protecting, and reviewing PDFs.`}
        canonicalUrl={ROUTE_PATHS.features}
        schemas={[{ "@context": "https://schema.org", "@type": "CollectionPage", name: "FixThatPDF features", url: absoluteSiteUrl(ROUTE_PATHS.features), mainEntity: { "@type": "ItemList", numberOfItems: releasedTools.length, itemListElement: releasedTools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: absoluteSiteUrl(tool.route) })) } }]}
      />

      <section className="features-hero">
        <div>
          <span><Sparkles size={15} /> Everything in one place</span>
          <h1>Every feature you need to finish a PDF.</h1>
          <p>Explore the complete FixThatPDF workspace—from text editing and page organization to conversion, OCR, signing, protection, comparison, and export.</p>
          <div><Link className="features-primary-action" to={ROUTE_PATHS.editPdf}>Open the PDF editor <ArrowRight size={17} /></Link><Link to={ROUTE_PATHS.tools}>Browse the full tool directory</Link></div>
        </div>
        <aside aria-label="Current feature coverage">
          <span><strong>{releasedTools.length}</strong> released tools</span>
          <span><strong>{TOOL_CATEGORIES.length}</strong> feature groups</span>
          <span><strong>0</strong> watermarks</span>
        </aside>
      </section>

      <section className="features-promises" aria-label="FixThatPDF product promises">
        <div><LockKeyhole size={21} /><span><strong>Browser-first processing</strong><small>Supported file work stays on your device</small></span></div>
        <div><ShieldCheck size={21} /><span><strong>No forced signup</strong><small>Use supported tools before creating an account</small></span></div>
        <div><FileText size={21} /><span><strong>No FixThatPDF watermark</strong><small>Your downloaded document remains yours</small></span></div>
      </section>

      <section className="features-highlights" aria-labelledby="feature-highlights-title">
        <header><span>Core workspace</span><h2 id="feature-highlights-title">The important PDF jobs, covered.</h2><p>Start with a familiar task, then keep working without switching products.</p></header>
        <div>{featureHighlights.map((feature) => <Link key={feature.title} to={feature.route}><span><ToolIcon name={feature.icon} size={25} /></span><h3>{feature.title}</h3><p>{feature.copy}</p><strong>Explore feature <ArrowRight size={15} /></strong></Link>)}</div>
      </section>

      <section className="features-catalog" aria-labelledby="all-features-title">
        <header>
          <div><span>Complete capability list</span><h2 id="all-features-title">All working FixThatPDF features</h2><p>Only released, beta, or clearly limited workflows appear here. Each feature links to the real tool and shows its current availability.</p></div>
          <label><Search size={18} /><span className="sr-only">Search features</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${releasedTools.length} features`} /></label>
        </header>

        <div className="features-group-list">
          {featureGroups.map((group) => <section key={group.id} className="features-group">
            <header><span style={{ background: group.accentColor }}><ToolIcon name={group.icon} size={22} /></span><div><h3><Link to={getToolCategoryPage(group.id).route}>{group.name}</Link></h3><p>{group.description}</p></div><small>{group.tools.length} feature{group.tools.length === 1 ? "" : "s"}</small></header>
            <div>{group.tools.map((tool) => <Link key={tool.id} to={tool.route} className="features-tool-row"><span style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={18} /></span><div><strong>{tool.name}</strong><small>{tool.shortDescription}</small></div><em className={availabilityClass(tool.status)}><CheckCircle2 size={12} /> {tool.availabilityLabel}</em><ArrowRight size={16} /></Link>)}</div>
          </section>)}
          {!featureGroups.length && <div className="features-empty"><Search size={25} /><h3>No features match “{query}”</h3><p>Try a format or task such as Word, OCR, sign, compare, or organize.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}
        </div>
      </section>

      <section className="features-final"><span>Ready to work</span><h2>Choose a PDF and start with any feature.</h2><p>No subscription, no watermark, and no account required for supported browser tools.</p><Link to={ROUTE_PATHS.editPdf}>Choose a PDF <ArrowRight size={17} /></Link></section>
    </main>
  );
}
