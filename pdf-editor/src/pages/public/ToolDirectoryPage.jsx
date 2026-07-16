import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Search from "lucide-react/dist/esm/icons/search.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolIcon } from "../../tools/ToolIcon.jsx";
import { TOOL_CATEGORIES, TOOL_REGISTRY } from "../../tools/toolRegistry.js";

function statusClass(status) {
  return status === "coming-soon" ? "is-coming" : status === "partial" ? "is-partial" : "is-available";
}

function inputLabel(tool) {
  const labels = tool.supportedInputTypes.map((type) => type === "application/pdf" ? "PDF" : type === "image/jpeg" ? "JPG" : type === "image/png" ? "PNG" : type.split("/").pop()?.toUpperCase());
  return labels.length ? labels.join(", ") : "No upload";
}

export function ToolDirectoryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const normalizedQuery = query.trim().toLowerCase();
  const workingTools = TOOL_REGISTRY.filter((tool) => tool.status !== "coming-soon");
  const plannedTools = TOOL_REGISTRY.filter((tool) => tool.status === "coming-soon");
  const visibleTools = useMemo(() => workingTools.filter((tool) => {
    const matchesCategory = category === "all" || tool.category === category;
    const matchesQuery = !normalizedQuery || `${tool.name} ${tool.shortDescription} ${tool.categoryName}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  }), [category, normalizedQuery]);
  const visiblePlannedTools = useMemo(() => plannedTools.filter((tool) => {
    const matchesCategory = category === "all" || tool.category === category;
    const matchesQuery = !normalizedQuery || `${tool.name} ${tool.shortDescription} ${tool.categoryName}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  }), [category, normalizedQuery]);
  const visibleGroups = TOOL_CATEGORIES.map((item) => ({ ...item, tools: visibleTools.filter((tool) => tool.category === item.id) })).filter((item) => item.tools.length);

  return (
    <main className="tools-directory">
      <PageMetadata
        title="All PDF Tools | RealPDF"
        description="Browse working free PDF tools for editing, organizing, converting, and signing, with clear formats, limits, and availability labels."
        canonicalUrl="/tools"
        schemas={[{ "@context": "https://schema.org", "@type": "CollectionPage", name: "RealPDF PDF tools", numberOfItems: workingTools.length }]}
      />
      <section className="tools-directory-hero">
        <span className="public-eyebrow">Completely free PDF tools</span>
        <h1>Choose a tool that works today.</h1>
        <p>Edit, sign, organize, and convert files without a subscription, watermark, or forced signup. Limits appear before upload.</p>
        <div className="tools-search-row">
          <label className="tools-search"><Search size={21} /><span className="sr-only">Search PDF tools</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search working PDF tools" /></label>
          <strong aria-live="polite">{visibleTools.length} working tool{visibleTools.length === 1 ? "" : "s"}</strong>
        </div>
      </section>

      <nav className="tools-category-filters" aria-label="Tool categories">
        <button type="button" className={category === "all" ? "is-active" : ""} aria-pressed={category === "all"} onClick={() => setCategory("all")}>All tools</button>
        {TOOL_CATEGORIES.map((item) => <button key={item.id} type="button" className={category === item.id ? "is-active" : ""} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}
      </nav>

      <div className="tools-category-list">
        {visibleGroups.map((group) => (
          <section key={group.id} id={`category-${group.id}`} className="tools-category-section">
            <header><span style={{ background: group.accentColor }}><ToolIcon name={group.icon} size={25} /></span><div><h2>{group.name}</h2><p>{group.description}</p></div><small>{group.tools.length} tool{group.tools.length === 1 ? "" : "s"}</small></header>
            <div className="tool-card-grid">{group.tools.map((tool) => <Link key={tool.id} className="tool-directory-card" to={tool.route}><span className="tool-card-icon" style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={23} /></span>{tool.status !== "available" && <span className={`tool-status ${statusClass(tool.status)}`}>{tool.availabilityLabel}</span>}<h3>{tool.name}</h3><p>{tool.shortDescription}</p><small>Input: {inputLabel(tool)}</small><strong>Use this tool <span aria-hidden="true">→</span></strong></Link>)}</div>
          </section>
        ))}
        {!visibleGroups.length && <section className="tools-empty-state"><h2>No tools match that search</h2><p>Try a format such as Word, JPG, sign, scan, or organize.</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>Clear filters</button></section>}
      </div>
      {visiblePlannedTools.length > 0 && <details className="planned-tools"><summary>Planned tools ({visiblePlannedTools.length})</summary><p>These routes explain the roadmap only. They do not accept files or pretend to process them.</p><div className="tool-card-grid">{visiblePlannedTools.map((tool) => <Link key={tool.id} className="tool-directory-card" to={tool.route}><span className="tool-card-icon" style={{ background: tool.accentColor }}><ToolIcon name={tool.icon} size={23} /></span><span className="tool-status is-coming">Coming soon</span><h3>{tool.name}</h3><p>{tool.shortDescription}</p><strong>View roadmap <span aria-hidden="true">→</span></strong></Link>)}</div></details>}
    </main>
  );
}
