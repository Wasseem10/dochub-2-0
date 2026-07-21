import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { absoluteSiteUrl } from "../../config/site.js";
import { ToolIcon } from "../../tools/ToolIcon.jsx";
import { getToolCategoryPage } from "../../tools/toolCategoryPages.js";
import { TOOL_CATEGORIES, TOOL_REGISTRY } from "../../tools/toolRegistry.js";

function statusClass(status) {
  return status === "coming-soon" ? "is-coming" : status === "partial" ? "is-partial" : "is-available";
}

export function ToolDirectoryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleTools = useMemo(() => TOOL_REGISTRY.filter((tool) => {
    const matchesCategory = category === "all" || tool.category === category;
    const matchesQuery = !normalizedQuery || `${tool.name} ${tool.shortDescription} ${tool.categoryName}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  }), [category, normalizedQuery]);
  const visibleGroups = TOOL_CATEGORIES.map((item) => ({ ...item, tools: visibleTools.filter((tool) => tool.category === item.id) })).filter((item) => item.tools.length);

  return (
    <main className="tools-directory">
      <PageMetadata
        title="All PDF Tools | FixThatPDF"
        description="Browse 68 FixThatPDF tools for editing, organizing, converting, signing, protecting, scanning, reviewing, and understanding PDFs—with accurate availability labels."
        canonicalUrl="/tools"
        schemas={[{ "@context": "https://schema.org", "@type": "CollectionPage", name: "FixThatPDF PDF tools", url: absoluteSiteUrl("/tools"), mainEntity: { "@type": "ItemList", numberOfItems: TOOL_REGISTRY.length, itemListElement: TOOL_REGISTRY.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: absoluteSiteUrl(tool.route) })) } }]}
      />
      <section className="tools-directory-hero">
        <span className="public-eyebrow">Complete PDF toolkit</span>
        <h1>Find the right PDF tool.<br />Know exactly what works.</h1>
        <p>Browse every FixThatPDF workflow in one place. Available editor tools open the real workflow; unfinished tools are clearly marked and never pretend to process a file.</p>
        <div className="tools-search-row">
          <label className="tools-search">
            <Search size={21} />
            <span className="sr-only">Search PDF tools</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${TOOL_REGISTRY.length} PDF tools`} />
            <strong aria-live="polite">{visibleTools.length} tool{visibleTools.length === 1 ? "" : "s"}</strong>
          </label>
        </div>
      </section>

      <nav className="tools-category-filters" aria-label="Tool categories">
        <button type="button" className={category === "all" ? "is-active" : ""} aria-pressed={category === "all"} onClick={() => setCategory("all")}>All tools</button>
        {TOOL_CATEGORIES.map((item) => <button key={item.id} type="button" className={category === item.id ? "is-active" : ""} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}
      </nav>

      <div className="tools-category-list">
        {visibleGroups.map((group) => (
          <section key={group.id} id={`category-${group.id}`} className="tools-category-section">
            <header><span style={{ background: group.accentColor }}><ToolIcon name={group.icon} size={25} /></span><div><h2><Link to={getToolCategoryPage(group.id).route}>{group.name}</Link></h2><p>{group.description}</p></div><small>{group.tools.length} tool{group.tools.length === 1 ? "" : "s"}</small></header>
            <div className="tool-card-grid">{group.tools.map((tool) => <Link key={tool.id} className="tool-directory-card" to={tool.route}><span className="tool-card-icon" style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={23} /></span><span className={`tool-status ${statusClass(tool.status)}`}>{tool.availabilityLabel}</span><h3>{tool.name}</h3><p>{tool.shortDescription}</p><strong>View tool <span aria-hidden="true">→</span></strong></Link>)}</div>
          </section>
        ))}
        {!visibleGroups.length && <section className="tools-empty-state"><h2>No tools match that search</h2><p>Try a format such as Word, JPG, sign, scan, or organize.</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>Clear filters</button></section>}
      </div>
    </main>
  );
}
