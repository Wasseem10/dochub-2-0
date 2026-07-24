import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Info from "lucide-react/dist/esm/icons/info.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { publicEditorPath, ROUTE_PATHS } from "../../router/routePaths.js";
import { ToolIcon } from "../../tools/ToolIcon.jsx";
import { toolSeoSchemas } from "../../tools/toolSeoSchemas.js";
import { getRelatedTools } from "../../tools/toolRegistry.js";

function formatType(type) {
  const known = {
    "application/pdf": "PDF",
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "text/plain": "TXT",
    "text/html": "HTML",
    "application/json": "JSON",
    "text/csv": "CSV",
  };
  return known[type] || type.split(/[./+-]/).pop().toUpperCase();
}

function ToolWorkflowPreview({ tool }) {
  const variant = tool.category === "organize" ? "pages" : tool.category === "from-pdf" || tool.category === "to-pdf" ? "convert" : tool.category === "sign" ? "sign" : tool.category === "ai" ? "ai" : tool.category === "protect" ? "protect" : tool.category === "ocr-scan" ? "scan" : "editor";
  return (
    <div className={`tool-preview variant-${variant}`} style={{ "--tool-accent": tool.accentColor }} aria-label={`${tool.name} workflow preview`}>
      <header><span><ToolIcon name={tool.icon} size={20} /></span><strong>{tool.name}</strong><small>{tool.availabilityLabel}</small></header>
      <div className="tool-preview-canvas">
        {variant === "pages" && <div className="preview-pages"><span>1</span><span className="is-selected">2</span><span>3</span></div>}
        {variant === "convert" && <div className="preview-convert"><span>{tool.supportedInputTypes[0] ? formatType(tool.supportedInputTypes[0]) : "FILE"}</span><ArrowRight size={28} /><span>{tool.supportedOutputTypes[0] ? formatType(tool.supportedOutputTypes[0]) : "PDF"}</span></div>}
        {variant === "sign" && <div className="preview-sign"><div>Signature</div><span>Place on page</span></div>}
        {variant === "ai" && <div className="preview-coming"><ToolIcon name="sparkles" size={32} /><strong>Planned cited workflow</strong><span>No fake analysis is shown</span></div>}
        {variant === "protect" && <div className="preview-coming"><ToolIcon name="lock" size={32} /><strong>Security requires verification</strong><span>No protection is applied today</span></div>}
        {variant === "scan" && <div className="preview-coming"><ToolIcon name="scan" size={32} /><strong>OCR pipeline planned</strong><span>No text recognition runs today</span></div>}
        {variant === "editor" && <div className="preview-editor"><aside><span /><span /><span /></aside><section><div /><p /><p /><p /></section></div>}
      </div>
    </div>
  );
}

export function ToolLandingPage({ tool }) {
  const relatedTools = getRelatedTools(tool);
  const isUsable = tool.status !== "coming-soon";
  const editorHref = publicEditorPath(tool.id);
  const schemas = toolSeoSchemas(tool);

  return (
    <main className={`tool-landing tool-category-${tool.category}`}>
      <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={schemas} />
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>

      <section className="tool-hero">
        <div className="tool-hero-copy">
          <span className={`tool-status ${tool.status === "coming-soon" ? "is-coming" : "is-partial"}`}>{tool.availabilityLabel}</span>
          <h1>{tool.heroHeadline}</h1>
          <p>{tool.heroSubheadline}</p>
          <div className="tool-format-row"><span>Input: <strong>{tool.supportedInputTypes.length ? tool.supportedInputTypes.map(formatType).join(", ") : "No upload"}</strong></span><span>Output: <strong>{tool.supportedOutputTypes.length ? tool.supportedOutputTypes.map(formatType).join(", ") : "No output yet"}</strong></span></div>
          <div className="tool-hero-actions">{isUsable ? <Link className="marketing-primary" to={editorHref}>Open {tool.name} <ArrowRight size={17} /></Link> : <Link className="marketing-primary" to={ROUTE_PATHS.tools}>Browse available tools <ArrowRight size={17} /></Link>}<a href="#limitations">Read limitations</a></div>
        </div>
        <ToolWorkflowPreview tool={tool} />
      </section>

      <section className={`tool-action-panel ${isUsable ? "is-usable" : "is-coming"}`}>
        <span style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={29} /></span>
        <div><small>{isUsable ? "Existing PDFArrow workflow" : "Tool status"}</small><h2>{isUsable ? `Continue to ${tool.name} in the editor` : `${tool.name} is currently in development`}</h2><p>{isUsable ? "PDFArrow reuses the existing validated PDF upload and editor flow. No second uploader or duplicate file-processing path is created here." : "This page does not accept a file or show invented output. Use a related available editor workflow while this tool is being built."}</p></div>
        {isUsable && <Link to={editorHref}>Open {tool.name}</Link>}
      </section>

      <section className="tool-content-grid">
        <article><span className="public-eyebrow">Why use it</span><h2>A focused workflow with clear boundaries</h2><p>{tool.longDescription}</p><ul>{tool.benefits.map((benefit) => <li key={benefit}><Check size={17} />{benefit}</li>)}</ul></article>
        <article className="tool-steps"><span className="public-eyebrow">How it works</span><h2>Three clear steps</h2><ol>{tool.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></article>
      </section>

      <section className="tool-use-cases"><header><span className="public-eyebrow">Common uses</span><h2>When {tool.name.toLowerCase()} helps</h2></header><div>{tool.useCases.map((useCase) => <article key={useCase}><span style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={21} /></span><h3>{useCase}</h3><p>{tool.shortDescription}</p></article>)}</div></section>

      <section id="limitations" className="tool-limitations"><span><Info size={24} /></span><div><small>Current limitations</small><h2>What PDFArrow does not claim</h2><p>{tool.currentLimitations}</p></div></section>

      <section className="tool-faq"><header><span className="public-eyebrow">Questions</span><h2>{tool.name} FAQ</h2></header><div>{tool.faqEntries.map((entry) => <details key={entry.question}><summary>{entry.question}</summary><p>{entry.answer}</p></details>)}</div></section>

      <section className="related-tools"><header><span className="public-eyebrow">Keep working</span><h2>Related {tool.categoryName.toLowerCase()} tools</h2></header><div>{relatedTools.map((related) => <Link key={related.id} to={related.route}><span style={{ background: related.accentColor }}><ToolIcon name={related.icon} size={22} /></span><div><h3>{related.name}</h3><p>{related.shortDescription}</p><small>{related.availabilityLabel}</small></div></Link>)}</div></section>

      <section className="tool-final-cta"><span style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={31} /></span><h2>{isUsable ? `Ready to try the supported ${tool.name} workflow?` : `Need a working PDF tool today?`}</h2><p>{isUsable ? "Open the real editor, upload a supported PDF, and verify the exported result before sharing it." : "Browse the complete directory for editor-backed workflows that are already available with clearly documented limitations."}</p><Link className="marketing-primary" to={isUsable ? editorHref : ROUTE_PATHS.tools}>{isUsable ? `Open ${tool.name}` : "View all PDF tools"}</Link></section>
    </main>
  );
}
