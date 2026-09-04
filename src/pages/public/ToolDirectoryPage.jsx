import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.mjs";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { absoluteSiteUrl } from "../../config/site.js";
import { preloadPublicToolModule } from "../../router/publicToolModules.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { toolDirectoryMetadata } from "../../seo/publicPageMetadata.js";
import { ToolIcon } from "../../tools/ToolIcon.jsx";
import { getToolCategoryPage } from "../../tools/toolCategoryPages.js";
import { TOOL_CATEGORIES, TOOL_REGISTRY } from "../../tools/toolRegistry.js";

const releasedTools = TOOL_REGISTRY.filter((tool) => tool.status !== "coming-soon");
const popularToolIds = [
  "edit-pdf", "merge-pdf", "compress-pdf", "annotate-pdf",
  "fill-pdf", "split-pdf", "pdf-to-word", "organize-pdf",
  "pdf-to-jpg", "rotate-pdf", "ocr-pdf", "sign-pdf",
];
const directoryMetadata = toolDirectoryMetadata(releasedTools.length);

const preloadProps = (tool) => ({
  onFocus: () => { void preloadPublicToolModule(tool); },
  onPointerEnter: () => { void preloadPublicToolModule(tool); },
  onPointerDown: () => { void preloadPublicToolModule(tool); },
});

export function ToolDirectoryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTools = useMemo(() => releasedTools.filter((tool) => {
    const matchesCategory = category === "all" || tool.category === category;
    const matchesQuery = !normalizedQuery || `${tool.name} ${tool.shortDescription} ${tool.categoryName}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  }), [category, normalizedQuery]);
  const visibleGroups = TOOL_CATEGORIES
    .map((item) => ({ ...item, tools: visibleTools.filter((tool) => tool.category === item.id) }))
    .filter((item) => item.tools.length);
  const popularTools = popularToolIds.map((id) => releasedTools.find((tool) => tool.id === id)).filter(Boolean);
  const popularToolIdSet = new Set(popularTools.map((tool) => tool.id));
  const showPopularTools = category === "all" && !normalizedQuery;

  return (
    <main className="tools-directory tools-directory--catalog">
      <PageMetadata
        title={directoryMetadata.title}
        description={directoryMetadata.description}
        canonicalUrl="/tools"
        schemas={[{ "@context": "https://schema.org", "@type": "CollectionPage", name: "PDFEnrich PDF tools", url: absoluteSiteUrl("/tools"), mainEntity: { "@type": "ItemList", numberOfItems: releasedTools.length, itemListElement: releasedTools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: absoluteSiteUrl(tool.route) })) } }]}
      />

      <section className="tools-catalog-intro" aria-labelledby="tools-catalog-title">
        <div>
          <span>All PDF tools</span>
          <h1 id="tools-catalog-title">Every PDF task, one clear place.</h1>
          <p>Choose a tool and get straight to work. Your supported files stay in your browser.</p>
        </div>
        <Link to={ROUTE_PATHS.editPdf}><Upload size={17} /> Upload PDF</Link>
      </section>

      <section className="tools-catalog-controls" aria-label="Find a PDF tool">
        <label className="tools-catalog-search">
          <Search size={20} />
          <span className="sr-only">Search PDF tools</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${releasedTools.length} PDF tools`} />
          <strong aria-live="polite">{visibleTools.length} tool{visibleTools.length === 1 ? "" : "s"}</strong>
        </label>
      </section>

      <nav className="tools-catalog-categories" aria-label="Tool categories">
        <button type="button" className={category === "all" ? "is-active" : ""} aria-pressed={category === "all"} onClick={() => setCategory("all")}><span>All tools</span><small>{releasedTools.length}</small></button>
        {TOOL_CATEGORIES.map((item) => {
          const categoryCount = releasedTools.filter((tool) => tool.category === item.id).length;
          return <button key={item.id} type="button" className={category === item.id ? "is-active" : ""} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}><span>{item.name}</span><small>{categoryCount}</small></button>;
        })}
      </nav>

      <section className="tools-catalog-body" aria-label="PDF tools">
        <div className="tools-catalog-result-count">
          <span>{visibleTools.length} tools available</span>
          {(normalizedQuery || category !== "all") && <button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>Clear filters</button>}
        </div>

        {showPopularTools && (
          <section className="tools-catalog-featured" aria-labelledby="popular-tools-title">
            <header><span>Start here</span><h2 id="popular-tools-title">Most popular PDF tools</h2></header>
            <div className="tools-catalog-card-grid">
              {popularTools.map((tool, index) => (
                <Link key={tool.id} className={`tools-catalog-card is-tone-${index % 8}`} to={tool.route} {...preloadProps(tool)}>
                  <span><ToolIcon name={tool.icon} size={22} /></span>
                  <strong>{tool.name}</strong>
                  {tool.status !== "available" && <small className="tools-catalog-status">{tool.status === "beta" ? "Beta" : "Limited"}</small>}
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {!!visibleGroups.length && (
          <section className="tools-catalog-more" aria-labelledby="more-tools-title">
            <header><span>{showPopularTools ? "Explore more" : "Matching tools"}</span><h2 id="more-tools-title">{showPopularTools ? "More tools" : "All matching tools"}</h2></header>
            {visibleGroups.map((group) => {
              const groupTools = showPopularTools ? group.tools.filter((tool) => !popularToolIdSet.has(tool.id)) : group.tools;
              if (!groupTools.length) return null;
              return (
                <section key={group.id} id={`category-${group.id}`} className="tools-catalog-group">
                  <header>
                    <span style={{ backgroundColor: group.accentColor }}><ToolIcon name={group.icon} size={17} /></span>
                    <div><h3><Link to={getToolCategoryPage(group.id).route}>{group.name}</Link></h3><p>{group.description}</p></div>
                  </header>
                  <div className="tools-catalog-card-grid">
                    {groupTools.map((tool, index) => (
                      <Link key={tool.id} className={`tools-catalog-card is-tone-${(index + 3) % 8}`} to={tool.route} {...preloadProps(tool)}>
                        <span><ToolIcon name={tool.icon} size={22} /></span>
                        <strong>{tool.name}</strong>
                        {tool.status !== "available" && <small className="tools-catalog-status">{tool.status === "beta" ? "Beta" : "Limited"}</small>}
                        <ChevronRight size={16} />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </section>
        )}

        {!visibleGroups.length && <section className="tools-catalog-empty"><Search size={24} /><h2>No tools match “{query}”</h2><p>Try a task such as edit, sign, compress, OCR, or convert.</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>Clear search</button></section>}
      </section>
    </main>
  );
}
