import { Link } from "react-router-dom";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { absoluteSiteUrl } from "../../config/site.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { TOOL_CATEGORY_PAGES } from "../../tools/toolCategoryPages.js";
import { getToolsByCategory } from "../../tools/toolRegistry.js";
import { ToolIcon } from "../../tools/ToolIcon.jsx";

export function ToolCategoryPage({ categoryPage }) {
  const tools = getToolsByCategory(categoryPage.id).filter((tool) => tool.status !== "coming-soon");
  const relatedCategories = TOOL_CATEGORY_PAGES.filter((category) => category.id !== categoryPage.id).slice(0, 3);
  const canonicalUrl = absoluteSiteUrl(categoryPage.route);
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: categoryPage.seoTitle.replace(" | FixThatPDF", ""),
      description: categoryPage.metaDescription,
      url: canonicalUrl,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: tools.length,
        itemListElement: tools.map((tool, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: tool.name,
          url: absoluteSiteUrl(tool.route),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "PDF tools", item: absoluteSiteUrl(ROUTE_PATHS.tools) },
        { "@type": "ListItem", position: 2, name: categoryPage.name, item: canonicalUrl },
      ],
    },
  ];

  return (
    <main className="tool-category-page">
      <PageMetadata title={categoryPage.seoTitle} description={categoryPage.metaDescription} canonicalUrl={categoryPage.route} schemas={schemas} />
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{categoryPage.name}</span></nav>

      <section className="tool-category-hero">
        <div>
          <span className="public-eyebrow">{tools.length} working tool{tools.length === 1 ? "" : "s"}</span>
          <h1>{categoryPage.headline}</h1>
          <p>{categoryPage.intro}</p>
          <Link className="marketing-primary" to={tools[0]?.route || ROUTE_PATHS.tools}>Start with {tools[0]?.name || "a PDF tool"} <ArrowRight size={17} /></Link>
        </div>
        <aside style={{ "--category-accent": categoryPage.accentColor }}>
          <span><ToolIcon name={categoryPage.icon} size={30} /></span>
          <strong>{categoryPage.name}</strong>
          <p>{categoryPage.description}</p>
        </aside>
      </section>

      <section className="tool-category-list" aria-labelledby="category-tools-heading">
        <header><span className="public-eyebrow">Choose a workflow</span><h2 id="category-tools-heading">{categoryPage.name} tools</h2><p>Each page explains supported files, current limits, and what to verify after downloading.</p></header>
        <div>{tools.map((tool) => <Link key={tool.id} to={tool.route} className="tool-category-card"><span style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={22} /></span><div><h3>{tool.name}</h3><p>{tool.shortDescription}</p><small>{tool.currentLimitations}</small></div><em>{tool.availabilityLabel}</em><ArrowRight size={17} /></Link>)}</div>
      </section>

      <section className="tool-category-guidance">
        <div><span className="public-eyebrow">Before you download</span><h2>Check the result, not just the progress bar.</h2><p>PDF structure varies from file to file. These checks help you catch the issues most relevant to this group of tools.</p></div>
        <ul>{categoryPage.guidance.map((item) => <li key={item}><Check size={18} /> <span>{item}</span></li>)}</ul>
      </section>

      <section className="tool-category-related">
        <header><span className="public-eyebrow">More PDF workflows</span><h2>Keep working without starting over.</h2></header>
        <div>{relatedCategories.map((category) => <Link key={category.id} to={category.route}><span style={{ background: category.accentColor }}><ToolIcon name={category.icon} size={21} /></span><div><h3>{category.name}</h3><p>{category.description}</p></div><ArrowRight size={16} /></Link>)}</div>
      </section>
    </main>
  );
}
