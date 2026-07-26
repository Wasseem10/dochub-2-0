import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.mjs";
import Scale from "lucide-react/dist/esm/icons/scale.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import { Link, Navigate, useParams } from "react-router-dom";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { absoluteSiteUrl } from "../../config/site.js";
import { COMPARISONS, COMPARISON_REVIEWED_ISO, COMPARISON_REVIEWED_LABEL, comparisonAdvantageCards, comparisonFaqEntries, comparisonPath, comparisonPlanRows, getComparisonBySlug } from "../../comparison/comparisonData.js";
import { trackComparisonCta } from "../../analytics/productAnalytics.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";

export function VendorComparisonPage() {
  const { comparisonSlug } = useParams();
  const comparison = getComparisonBySlug(comparisonSlug);
  if (!comparison) return <Navigate replace to="/compare" />;

  const path = comparisonPath(comparison.slug);
  const faq = comparisonFaqEntries(comparison);
  const advantageCards = comparisonAdvantageCards(comparison);
  const planRows = comparisonPlanRows(comparison);
  const otherComparisons = COMPARISONS.filter(({ slug }) => slug !== comparison.slug);

  return (
    <main className="vendor-comparison-page" style={{ "--comparison-accent": comparison.accent }}>
      <PageMetadata
        title={`${comparison.seoTitle} | PDFArrow`}
        description={comparison.description}
        canonicalUrl={path}
        schemas={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: comparison.title,
            description: comparison.description,
            datePublished: COMPARISON_REVIEWED_ISO,
            dateModified: COMPARISON_REVIEWED_ISO,
            mainEntityOfPage: absoluteSiteUrl(path),
            author: { "@type": "Organization", name: "PDFArrow", url: absoluteSiteUrl("/") },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ]}
      />

      <nav className="comparison-breadcrumb" aria-label="Breadcrumb"><Link to="/compare">Comparisons</Link><span>/</span><span>{comparison.title}</span></nav>
      <section className="comparison-hero is-detail">
        <span className="comparison-eyebrow"><Scale size={16} /> Side-by-side · reviewed {COMPARISON_REVIEWED_LABEL}</span>
        <div className="comparison-hero-marks"><span className="is-pdfarrow">PA</span><b>vs</b><span>{comparison.mark}</span></div>
        <h1>PDFArrow vs <em>{comparison.company}</em></h1>
        <p>{comparison.summary}</p>
        <div className="comparison-hero-actions">
          <Link to={ROUTE_PATHS.editPdf} onClick={() => trackComparisonCta(path, "hero_try")}>Try PDFArrow <ArrowRight size={17} /></Link>
          <a href="#comparison-table">See the full comparison</a>
        </div>
      </section>

      <nav className="comparison-section-nav" aria-label="On this comparison page">
        <span>On this page</span>
        <a href="#overview">Overview</a>
        <a href="#comparison-table">Features</a>
        <a href="#plans">Pricing</a>
        <a href="#faq">FAQ</a>
        <a href="#sources">Sources</a>
      </nav>

      <section className="comparison-quick-verdict" id="overview" aria-label="Quick recommendation">
        <article><small>CHOOSE PDFARROW FOR</small><h2>{comparison.bestForPdfArrow}</h2><p>{comparison.competitorFacts.processing.startsWith("Online") ? "Keep supported core tasks in the browser while staying free to begin as a guest." : "Start quickly with an account-optional browser editor and local processing where supported."}</p></article>
        <article><small>CHOOSE {comparison.company.toUpperCase()} FOR</small><h2>{comparison.bestForCompetitor}</h2><p>{comparison.competitorFacts.editing}</p></article>
      </section>

      <section className="comparison-table-section" id="comparison-table">
        <header><span>Feature by feature</span><h2>What is meaningfully different?</h2><p>Plain-language context is more useful than a yes/no grid. Here is how the current products approach the same jobs.</p></header>
        <p className="comparison-table-hint">Swipe horizontally to compare all columns.</p>
        <div className="comparison-table-wrap" tabIndex="0" role="region" aria-label={`Feature comparison: PDFArrow and ${comparison.company}`}>
          <table>
            <thead><tr><th scope="col">Area</th><th scope="col">PDFArrow</th><th scope="col">{comparison.company}</th></tr></thead>
            <tbody>{comparison.rows.map(([area, pdfArrow, competitor]) => <tr key={area}><th scope="row">{area}</th><td>{pdfArrow}</td><td>{competitor}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="comparison-reasons-section">
        <header><span>Why people choose PDFArrow</span><h2>A lighter route through everyday PDF work.</h2><p>The strongest reason to switch is not a longer feature list. It is a workflow that better matches the job you actually need to finish.</p></header>
        <div>{advantageCards.map(({ title, body }, index) => <article key={title}><small>0{index + 1}</small><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="comparison-plans-section" id="plans">
        <header><span>Plans and access</span><h2>What you pay—and what requires an account.</h2><p>PDF pricing changes frequently, so this comparison emphasizes plan structure and access. Follow the official source links for exact current prices.</p></header>
        <p className="comparison-table-hint">Swipe horizontally to compare all columns.</p>
        <div className="comparison-table-wrap" tabIndex="0" role="region" aria-label={`Plan comparison: PDFArrow and ${comparison.company}`}>
          <table>
            <thead><tr><th scope="col">Plan question</th><th scope="col">PDFArrow</th><th scope="col">{comparison.company}</th></tr></thead>
            <tbody>{planRows.map(([area, pdfArrow, competitor]) => <tr key={area}><th scope="row">{area}</th><td>{pdfArrow}</td><td>{competitor}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="comparison-plan-note">Pricing snapshot reviewed {COMPARISON_REVIEWED_LABEL}. Taxes, promotions, annual billing discounts, and regional prices are not included.</p>
      </section>

      <section className="comparison-choice-grid">
        <article className="is-pdfarrow">
          <span><ShieldCheck size={20} /> PDFArrow is likely the better fit when…</span>
          <ul>{comparison.pdfArrowReasons.map((reason) => <li key={reason}><Check size={17} />{reason}</li>)}</ul>
          <Link to={ROUTE_PATHS.editPdf} onClick={() => trackComparisonCta(path, "fit_card")}>Open the PDF editor <ArrowRight size={16} /></Link>
        </article>
        <article>
          <span>{comparison.company} is likely the better fit when…</span>
          <ul>{comparison.competitorReasons.map((reason) => <li key={reason}><Check size={17} />{reason}</li>)}</ul>
        </article>
      </section>

      <section className="comparison-faq" id="faq">
        <header><span>Questions before choosing</span><h2>A fair answer to the common questions.</h2></header>
        <div>{faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
      </section>

      <section className="comparison-final-cta">
        <div><small>TRY IT WITH A REAL DOCUMENT</small><h2>See whether the simpler workflow fits.</h2><p>Open a PDF as a guest, use the editor, and judge the result with your own document before changing tools.</p></div>
        <Link to={ROUTE_PATHS.editPdf} onClick={() => trackComparisonCta(path, "final_cta")}>Try PDFArrow free <ArrowRight size={18} /></Link>
      </section>

      <section className="comparison-related">
        <header><span>Other comparisons</span><h2>Still deciding?</h2></header>
        <div>{otherComparisons.map((item) => <Link key={item.slug} to={comparisonPath(item.slug)}><span>PDFArrow vs</span><strong>{item.company}</strong><ArrowRight size={16} /></Link>)}</div>
      </section>

      <section className="comparison-sources" id="sources">
        <div><span>Sources & methodology</span><h2>Checked against official product information.</h2><p>Research reviewed {COMPARISON_REVIEWED_LABEL}. Pricing, limits, and features can change. Follow the source links for the latest vendor terms.</p></div>
        <ul>{comparison.sources.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}<ExternalLink size={14} /></a></li>)}</ul>
      </section>
      <p className="comparison-disclaimer">{comparison.company} and its product names are trademarks of their respective owners. PDFArrow is not affiliated with or endorsed by {comparison.company}.</p>
    </main>
  );
}
