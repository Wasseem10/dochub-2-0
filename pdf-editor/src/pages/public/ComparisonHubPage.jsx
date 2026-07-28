import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import Scale from "lucide-react/dist/esm/icons/scale.mjs";
import { Link } from "react-router-dom";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { absoluteSiteUrl } from "../../config/site.js";
import { COMPARISONS, COMPARISON_REVIEWED_LABEL, comparisonPath } from "../../comparison/comparisonData.js";
import { trackComparisonCta } from "../../analytics/productAnalytics.js";

export function ComparisonHubPage() {
  return (
    <main className="vendor-comparison-page comparison-hub">
      <PageMetadata
        title="PDF editor comparisons | PDFEnrich"
        description="Compare PDFEnrich with DocHub, Smallpdf, iLovePDF, Adobe Acrobat, and Sejda using current official product information."
        canonicalUrl="/compare"
        schemas={[{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "PDF editor comparisons",
          url: absoluteSiteUrl("/compare"),
          mainEntity: {
            "@type": "ItemList",
            itemListElement: COMPARISONS.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.title,
              url: absoluteSiteUrl(comparisonPath(item.slug)),
            })),
          },
        }]}
      />
      <section className="comparison-hero">
        <span className="comparison-eyebrow"><Scale size={16} /> Independent product comparisons</span>
        <h1>Choose the PDF tool that fits <em>how you work.</em></h1>
        <p>Clear, practical comparisons based on each vendor&apos;s current official product and pricing information—not a wall of vague checkmarks.</p>
        <small>Research reviewed {COMPARISON_REVIEWED_LABEL}. Product details can change.</small>
      </section>

      <section className="comparison-card-grid" aria-label="PDFEnrich competitor comparisons">
        {COMPARISONS.map((item) => (
          <article key={item.slug} style={{ "--comparison-accent": item.accent }}>
            <div className="comparison-company-marks"><span className="is-pdfenrich">PE</span><b>vs</b><span>{item.mark}</span></div>
            <p>{item.title}</p>
            <h2>{item.summary}</h2>
            <ul>
              <li><CheckCircle2 size={16} /> Editing and account access</li>
              <li><CheckCircle2 size={16} /> Privacy and processing model</li>
              <li><CheckCircle2 size={16} /> Apps, signatures, and pricing</li>
            </ul>
            <Link to={comparisonPath(item.slug)} onClick={() => trackComparisonCta("/compare", `vendor_${item.slug}`)}>Read the comparison <ArrowRight size={16} /></Link>
          </article>
        ))}
      </section>

      <section className="comparison-method">
        <div><span>How we compare</span><h2>Useful context, not a manufactured winner.</h2></div>
        <div>
          <p>We compare account requirements, document processing, editing depth, signing workflows, available apps, integrations, and current cost models.</p>
          <p>Competitor capabilities are sourced from official vendor pages linked on every comparison. PDFEnrich statements describe the current released product.</p>
        </div>
      </section>
    </main>
  );
}
