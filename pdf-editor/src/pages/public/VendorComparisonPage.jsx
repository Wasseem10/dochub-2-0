import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import ExternalLink from "lucide-react/dist/esm/icons/external-link.mjs";
import Scale from "lucide-react/dist/esm/icons/scale.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import { Link, Navigate, useParams } from "react-router-dom";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { absoluteSiteUrl } from "../../config/site.js";
import { COMPARISON_REVIEWED_ISO, COMPARISON_REVIEWED_LABEL, comparisonPath, getComparisonBySlug } from "../../comparison/comparisonData.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";

export function VendorComparisonPage() {
  const { comparisonSlug } = useParams();
  const comparison = getComparisonBySlug(comparisonSlug);
  if (!comparison) return <Navigate replace to="/compare" />;

  const path = comparisonPath(comparison.slug);
  const faq = [
    {
      question: `Is PDFArrow better than ${comparison.company}?`,
      answer: `It depends on the workflow. PDFArrow is the simpler choice for ${comparison.bestForPdfArrow.toLowerCase()}. ${comparison.company} is the stronger choice for ${comparison.bestForCompetitor.toLowerCase()}.`,
    },
    {
      question: "Can I use PDFArrow without an account?",
      answer: "Yes. Supported PDFArrow tools can be started as a guest. An account is optional for saved workspace features.",
    },
    {
      question: "How current is this comparison?",
      answer: `This page was reviewed on ${COMPARISON_REVIEWED_LABEL} using the official vendor sources listed below. Plans and features can change, so verify time-sensitive details with the vendor.`,
    },
  ];

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
          <Link to={ROUTE_PATHS.editPdf}>Try PDFArrow <ArrowRight size={17} /></Link>
          <a href="#comparison-table">See the full comparison</a>
        </div>
      </section>

      <section className="comparison-quick-verdict" aria-label="Quick recommendation">
        <article><small>CHOOSE PDFARROW FOR</small><h2>{comparison.bestForPdfArrow}</h2><p>{comparison.competitorFacts.processing.startsWith("Online") ? "Keep supported core tasks in the browser while staying free to begin as a guest." : "Start quickly with an account-optional browser editor and local processing where supported."}</p></article>
        <article><small>CHOOSE {comparison.company.toUpperCase()} FOR</small><h2>{comparison.bestForCompetitor}</h2><p>{comparison.competitorFacts.editing}</p></article>
      </section>

      <section className="comparison-table-section" id="comparison-table">
        <header><span>Feature by feature</span><h2>What is meaningfully different?</h2><p>Plain-language context is more useful than a yes/no grid. Here is how the current products approach the same jobs.</p></header>
        <div className="comparison-table-wrap">
          <table>
            <thead><tr><th scope="col">Area</th><th scope="col">PDFArrow</th><th scope="col">{comparison.company}</th></tr></thead>
            <tbody>{comparison.rows.map(([area, pdfArrow, competitor]) => <tr key={area}><th scope="row">{area}</th><td>{pdfArrow}</td><td>{competitor}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="comparison-choice-grid">
        <article className="is-pdfarrow">
          <span><ShieldCheck size={20} /> PDFArrow is likely the better fit when…</span>
          <ul>{comparison.pdfArrowReasons.map((reason) => <li key={reason}><Check size={17} />{reason}</li>)}</ul>
          <Link to={ROUTE_PATHS.editPdf}>Open the PDF editor <ArrowRight size={16} /></Link>
        </article>
        <article>
          <span>{comparison.company} is likely the better fit when…</span>
          <ul>{comparison.competitorReasons.map((reason) => <li key={reason}><Check size={17} />{reason}</li>)}</ul>
        </article>
      </section>

      <section className="comparison-faq">
        <header><span>Questions before choosing</span><h2>A fair answer to the common questions.</h2></header>
        <div>{faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
      </section>

      <section className="comparison-sources">
        <div><span>Sources & methodology</span><h2>Checked against official product information.</h2><p>Research reviewed {COMPARISON_REVIEWED_LABEL}. Pricing, limits, and features can change. Follow the source links for the latest vendor terms.</p></div>
        <ul>{comparison.sources.map(([label, href]) => <li key={href}><a href={href} target="_blank" rel="noreferrer">{label}<ExternalLink size={14} /></a></li>)}</ul>
      </section>
      <p className="comparison-disclaimer">{comparison.company} and its product names are trademarks of their respective owners. PDFArrow is not affiliated with or endorsed by {comparison.company}.</p>
    </main>
  );
}
