import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PUBLIC_PLACEHOLDER_ROUTES } from "../src/router/routes.js";
import { ROUTE_PATHS } from "../src/router/routePaths.js";
import { TOOL_CATEGORY_PAGES } from "../src/tools/toolCategoryPages.js";
import { HIGH_INTENT_TOOL_IDS } from "../src/tools/highIntentToolContent.js";
import { getRelatedTools, TOOL_REGISTRY } from "../src/tools/toolRegistry.js";
import { EDITORIAL_RESOURCE_PAGES } from "../src/editorial/editorialResources.js";
import { isEditorialResourcePath } from "../src/editorial/editorialRoutePaths.js";
import { editorialShareImagePath, getToolEvidence, hasToolShareImage, PRODUCT_LAST_TESTED_LABEL, PRODUCT_RESPONSIBLE_PARTY } from "../src/editorial/toolEvidence.js";
import { resolveSiteUrl } from "./site-url.mjs";

const siteUrl = resolveSiteUrl();
const template = await readFile("dist/index.html", "utf8");
/** @param {unknown} value */
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
/** @param {unknown} value */
const escapeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const highIntentToolIds = new Set(HIGH_INTENT_TOOL_IDS);
/** @typedef {{ path: string, title: string, description: string, noIndex: boolean, tool?: import("../src/tools/toolRegistry.js").ToolRecord, category?: (typeof TOOL_CATEGORY_PAGES)[number], resource?: (typeof EDITORIAL_RESOURCE_PAGES)[number], kind?: string }} RouteRecord */
/** @type {Record<string, string>} */
const legalDescriptions = {
  [ROUTE_PATHS.privacy]: "How PDFArrow handles browser processing, local storage, optional Firebase cloud history, analytics, and deletion.",
  [ROUTE_PATHS.security]: "Current PDFArrow browser-processing safeguards, account boundaries, and honest security limitations.",
  [ROUTE_PATHS.help]: "Help for uploading, editing, signing, organizing, converting, and downloading PDFs with PDFArrow.",
  [ROUTE_PATHS.dataRetention]: "What PDFArrow stores, how long account and browser data remain, and how to remove them.",
  [ROUTE_PATHS.terms]: "Current terms for using PDFArrow's free browser PDF tools and optional account features.",
};
/** @type {RouteRecord[]} */
const routeRecords = [
  { path: "/", title: "Every PDF Task in One Place | PDFArrow", description: "Edit, sign, fill, merge, split, organize, and convert PDFs without subscriptions, watermarks, or forced signup.", noIndex: false, kind: "home" },
  { path: ROUTE_PATHS.tools, title: "Free PDF Tools | PDFArrow", description: "Browse working free PDF tools with clear formats, limits, and availability labels.", noIndex: false, kind: "directory" },
  { path: ROUTE_PATHS.features, title: "All PDF Features | PDFArrow", description: "Explore every released PDFArrow feature for editing, organizing, converting, signing, scanning, protecting, and reviewing PDFs.", noIndex: false, kind: "directory" },
  { path: ROUTE_PATHS.support, title: "PDF Help and Support | PDFArrow", description: "Contact PDFArrow support about PDF tools, accounts, privacy, security, or data deletion.", noIndex: false },
  ...TOOL_CATEGORY_PAGES.map((category) => ({ path: category.route, title: category.seoTitle, description: category.metaDescription, noIndex: false, category })),
  ...PUBLIC_PLACEHOLDER_ROUTES.filter(({ path }) => path !== ROUTE_PATHS.features && !isEditorialResourcePath(path)).map((route) => ({ ...route, title: `${route.title} | PDFArrow`, description: legalDescriptions[route.path] || route.description, noIndex: !Object.hasOwn(legalDescriptions, route.path) })),
  ...EDITORIAL_RESOURCE_PAGES.map((resource) => ({ path: resource.path, title: resource.seoTitle, description: resource.metaDescription, noIndex: false, resource })),
  ...TOOL_REGISTRY.map((tool) => ({ path: tool.route, title: tool.seoTitle, description: tool.metaDescription, noIndex: tool.status === "coming-soon", tool })),
];

/** @param {RouteRecord} record */
function metadataFor(record) {
  const canonical = `${siteUrl}${record.path === "/" ? "/" : record.path}`;
  const hasDedicatedSocialImage = Boolean(record.resource) || (record.tool && hasToolShareImage(record.path));
  const socialImage = `${siteUrl}${hasDedicatedSocialImage ? editorialShareImagePath(record.path) : "/og-editorial.png"}`;
  const socialImageAlt = record.resource ? `${record.resource.title} — original PDFArrow resource` : record.tool ? `${record.tool.name} — PDFArrow browser tool and guide` : "PDFArrow browser PDF workspace";
  return `<title>${escapeHtml(record.title)}</title>\n    <meta name="description" content="${escapeHtml(record.description)}" />\n    <meta name="robots" content="${record.noIndex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}" />\n    <meta property="og:title" content="${escapeHtml(record.title)}" />\n    <meta property="og:description" content="${escapeHtml(record.description)}" />\n    <meta property="og:type" content="website" />\n    <meta property="og:url" content="${escapeHtml(canonical)}" />\n    <meta property="og:site_name" content="PDFArrow" />\n    <meta property="og:locale" content="en_US" />\n    <meta property="og:image" content="${escapeHtml(socialImage)}" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />\n    <meta property="og:image:alt" content="${escapeHtml(socialImageAlt)}" />\n    <meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:title" content="${escapeHtml(record.title)}" />\n    <meta name="twitter:description" content="${escapeHtml(record.description)}" />\n    <meta name="twitter:image" content="${escapeHtml(socialImage)}" />\n    <meta name="twitter:image:alt" content="${escapeHtml(socialImageAlt)}" />\n    <link rel="canonical" href="${escapeHtml(canonical)}" />`;
}

/** @param {RouteRecord} record */
function staticContentFor(record) {
  /** @param {string} current */
  const breadcrumb = (current) => `<nav aria-label="Breadcrumb"><a href="/tools">PDF tools</a><span aria-hidden="true"> / </span><span>${escapeHtml(current)}</span></nav>`;
  /** @param {import("../src/tools/toolRegistry.js").ToolRecord} tool */
  const toolLink = (tool) => `<li><a href="${escapeHtml(tool.route)}"><strong>${escapeHtml(tool.name)}</strong><span>${escapeHtml(tool.shortDescription)}</span></a></li>`;

  if (record.resource) {
    const resource = record.resource;
    const sections = resource.sections.map(/** @param {{ heading: string, body: string, bullets?: string[] }} section */ (section) => `<section><h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p>${section.bullets ? `<ul>${section.bullets.map(/** @param {string} bullet */ (bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}</section>`).join("");
    const matrix = "matrix" in resource ? resource.matrix : undefined;
    const matrixTable = matrix ? `<section><h2>${escapeHtml(matrix.caption)}</h2><div class="prerender-table-wrap"><table><thead><tr>${matrix.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${matrix.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>` : "";
    const benchmarkRows = resource.kind === "benchmark" ? TOOL_REGISTRY.map((tool) => ({ tool, evidence: getToolEvidence(tool.id) })).filter(({ evidence }) => evidence).map(({ tool, evidence }) => `<tr><th scope="row"><a href="${escapeHtml(tool.route)}">${escapeHtml(tool.name)}</a></th><td>${escapeHtml(evidence?.result)}</td><td>${escapeHtml(evidence?.method)}</td></tr>`).join("") : "";
    const benchmarkTable = benchmarkRows ? `<section><h2>Measured core workflow results</h2><div class="prerender-table-wrap"><table><thead><tr><th>Workflow</th><th>Measured release result</th><th>Method</th></tr></thead><tbody>${benchmarkRows}</tbody></table></div></section>` : "";
    const redactionProof = resource.kind === "redaction" ? `<section><h2>Published recovery proof</h2><p>The fictional secret is present in text extracted from the unsafe before sample and absent from text extracted from the flattened after sample. Download both PDFs and the extraction record to repeat the check.</p></section>` : "";
    const resourceDownloads = "downloads" in resource ? resource.downloads : undefined;
    const downloads = resourceDownloads ? `<section><h2>Downloads and evidence</h2><ul class="prerender-links">${resourceDownloads.map(/** @param {string[]} download */ ([label, href, meta]) => `<li><a href="${escapeHtml(href)}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(meta)}</span></a></li>`).join("")}</ul></section>` : "";
    const related = `<section><h2>Related tools and resources</h2><ul class="prerender-links">${resource.related.map((item) => `<li><a href="${escapeHtml(item.path)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.description)}</span></a></li>`).join("")}</ul></section>`;
    return `<main class="prerender-shell"><nav aria-label="Breadcrumb"><a href="/resources">Resources</a><span aria-hidden="true"> / </span><span>${escapeHtml(resource.eyebrow)}</span></nav><p class="prerender-brand">PDFArrow · ${escapeHtml(resource.eyebrow)}</p><h1>${escapeHtml(resource.title)}</h1><p class="prerender-lead">${escapeHtml(resource.lede)}</p><p>Reviewed ${escapeHtml(resource.reviewedLabel)} by ${escapeHtml(resource.owner)}.</p>${sections}${matrixTable}${benchmarkTable}${redactionProof}${downloads}${related}</main>`;
  }

  if (record.tool) {
    const tool = record.tool;
    const evidence = getToolEvidence(tool.id);
    const steps = tool.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
    const benefits = tool.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("");
    const useCases = tool.useCases.map((useCase) => `<li>${escapeHtml(useCase)}</li>`).join("");
    const faq = tool.faqEntries.map((entry) => `<details><summary>${escapeHtml(entry.question)}</summary><p>${escapeHtml(entry.answer)}</p></details>`).join("");
    const related = getRelatedTools(tool).map((relatedTool) => relatedTool ? toolLink(relatedTool) : "").join("");
    const evidenceSection = evidence ? `<section><h2>Example and measured release result</h2><p><strong>Example input:</strong> ${escapeHtml(evidence.input)}</p><p><strong>Expected output:</strong> ${escapeHtml(evidence.output)}</p><p><strong>Measured result:</strong> ${escapeHtml(evidence.result)}</p><p>${escapeHtml(evidence.method)}. Last tested ${PRODUCT_LAST_TESTED_LABEL} by ${PRODUCT_RESPONSIBLE_PARTY}.</p><p><a href="/research/pdf-conversion-benchmark">Read the benchmark methodology and download the fixtures</a></p></section>` : "";
    return `<main class="prerender-shell prerender-tool">${breadcrumb(tool.name)}<p class="prerender-brand">PDFArrow · ${escapeHtml(tool.availabilityLabel)}</p><h1>${escapeHtml(tool.heroHeadline)}</h1><p class="prerender-lead">${escapeHtml(tool.heroSubheadline)}</p><p>${escapeHtml(tool.longDescription)}</p><a class="prerender-action" href="${escapeHtml(tool.route)}">Use ${escapeHtml(tool.name)}</a>${evidenceSection}<section><h2>How to use ${escapeHtml(tool.name)}</h2><ol>${steps}</ol></section><section><h2>What this tool supports</h2><ul>${benefits}</ul></section><section><h2>Common ${escapeHtml(tool.name)} tasks</h2><ul>${useCases}</ul></section><section><h2>Privacy, supported files, and limits</h2><p>${escapeHtml(tool.privacySummary)}</p><p>${escapeHtml(tool.currentLimitations)}</p></section><section><h2>${escapeHtml(tool.name)} questions</h2>${faq}</section><section><h2>Related PDF tools</h2><ul class="prerender-links">${related}</ul></section></main>`;
  }

  if (record.category) {
    const category = record.category;
    const tools = TOOL_REGISTRY.filter((tool) => tool.category === category.id && tool.status !== "coming-soon");
    const guidance = category.guidance.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    return `<main class="prerender-shell">${breadcrumb(category.name)}<p class="prerender-brand">PDFArrow · ${tools.length} working tools</p><h1>${escapeHtml(category.headline)}</h1><p class="prerender-lead">${escapeHtml(category.intro)}</p><section><h2>${escapeHtml(category.name)} tools</h2><ul class="prerender-links">${tools.map(toolLink).join("")}</ul></section><section><h2>What to check before downloading</h2><ul>${guidance}</ul></section><p><a href="/tools">Browse every PDF tool</a></p></main>`;
  }

  if (record.kind === "home" || record.kind === "directory") {
    const categoryLinks = TOOL_CATEGORY_PAGES.map((category) => `<li><a href="${escapeHtml(category.route)}"><strong>${escapeHtml(category.name)}</strong><span>${escapeHtml(category.metaDescription)}</span></a></li>`).join("");
    const toolLinks = TOOL_REGISTRY.filter((tool) => tool.status !== "coming-soon").map(toolLink).join("");
    const heading = record.kind === "home" ? "Every PDF task, finally in one place" : record.title.replace(/ \| PDFArrow$/, "");
    return `<main class="prerender-shell"><p class="prerender-brand">PDFArrow</p><h1>${escapeHtml(heading)}</h1><p class="prerender-lead">${escapeHtml(record.description)}</p><a class="prerender-action" href="/edit-pdf">Choose a PDF</a><section><h2>Browse PDF tools by task</h2><ul class="prerender-links">${categoryLinks}</ul></section><section><h2>All working PDF tools</h2><ul class="prerender-links">${toolLinks}</ul></section></main>`;
  }

  return `<main class="prerender-shell"><p class="prerender-brand">PDFArrow</p><h1>${escapeHtml(record.title.replace(/ \| PDFArrow$/, ""))}</h1><p class="prerender-lead">${escapeHtml(record.description)}</p><p><a href="/tools">Browse working PDF tools</a></p></main>`;
}

/** @param {RouteRecord} record */
function structuredDataFor(record) {
  const canonical = `${siteUrl}${record.path === "/" ? "/" : record.path}`;
  /** @type {Record<string, unknown>[]} */
  const schemas = [{
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: record.title,
    description: record.description,
    url: canonical,
    inLanguage: "en-US",
    isPartOf: { "@type": "WebSite", name: "PDFArrow", url: `${siteUrl}/` },
  }];
  if (record.kind === "home") schemas.push(
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "PDFArrow",
      alternateName: "PDFArrow",
      url: `${siteUrl}/`,
      inLanguage: "en-US",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "PDFArrow",
      url: `${siteUrl}/`,
      logo: `${siteUrl}/icon.svg`,
    },
  );
  if (record.kind === "directory") schemas.push({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: record.title,
    url: canonical,
    mainEntity: { "@type": "ItemList", numberOfItems: TOOL_REGISTRY.length, itemListElement: TOOL_REGISTRY.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: `${siteUrl}${tool.route}` })) },
  });
  if (record.resource) schemas.push(
    { "@context": "https://schema.org", "@type": record.resource.kind === "benchmark" ? "TechArticle" : "Article", headline: record.resource.title, description: record.resource.metaDescription, datePublished: "2026-07-21", dateModified: record.resource.reviewedIso, mainEntityOfPage: canonical, author: { "@type": "Organization", name: "PDFArrow", url: `${siteUrl}/` }, publisher: { "@type": "Organization", name: "PDFArrow", url: `${siteUrl}/` } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Resources", item: `${siteUrl}${ROUTE_PATHS.resources}` }, { "@type": "ListItem", position: 2, name: record.resource.title, item: canonical }] },
  );
  if (record.category) {
    const category = record.category;
    const tools = TOOL_REGISTRY.filter((tool) => tool.category === category.id && tool.status !== "coming-soon");
    schemas.push(
      { "@context": "https://schema.org", "@type": "CollectionPage", name: category.name, description: category.metaDescription, url: canonical, mainEntity: { "@type": "ItemList", numberOfItems: tools.length, itemListElement: tools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.name, url: `${siteUrl}${tool.route}` })) } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "PDF tools", item: `${siteUrl}/tools` }, { "@type": "ListItem", position: 2, name: category.name, item: canonical }] },
    );
  }
  if (record.tool) {
    const tool = record.tool;
    schemas.push(
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "PDF tools", item: `${siteUrl}/tools` }, { "@type": "ListItem", position: 2, name: tool.name, item: canonical }] },
      { "@context": "https://schema.org", "@type": "HowTo", name: `How to use ${tool.name}`, step: tool.steps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, name: `Step ${index + 1}`, text: step, url: canonical })) },
    );
    if (highIntentToolIds.has(tool.id)) schemas.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: tool.faqEntries.map((entry) => ({ "@type": "Question", name: entry.question, acceptedAnswer: { "@type": "Answer", text: entry.answer } })) });
  }
  return `\n    <script id="pdfarrow-prerender-structured-data" type="application/ld+json">${escapeJson(schemas)}</script>`;
}

const staticStyle = `<style id="prerender-style">.prerender-shell{box-sizing:border-box;max-width:1100px;margin:0 auto;padding:64px 24px 96px;color:#13213c;font:17px/1.65 Arial,sans-serif}.prerender-shell h1{max-width:850px;margin:10px 0 16px;font-size:clamp(38px,7vw,72px);line-height:1.02;letter-spacing:-.045em}.prerender-shell h2{margin-top:42px;font-size:28px;line-height:1.15}.prerender-shell section{max-width:900px}.prerender-shell nav{color:#667085;font-size:14px}.prerender-shell nav a,.prerender-shell section a,.prerender-shell>p a{color:#0540ae}.prerender-brand{color:#0540ae;font-weight:800}.prerender-lead{max-width:780px;font-size:22px}.prerender-action{display:inline-block;margin:18px 0;padding:12px 18px;border-radius:12px;background:#0540ae;color:#fff;font-weight:700;text-decoration:none}.prerender-shell li{margin:9px 0}.prerender-shell details{margin:10px 0;padding:12px 0;border-bottom:1px solid #dce5f2}.prerender-shell summary{font-weight:700;cursor:pointer}.prerender-table-wrap{overflow-x:auto}.prerender-shell table{width:100%;border-collapse:collapse;font-size:14px}.prerender-shell th,.prerender-shell td{padding:10px;border:1px solid #dce5f2;text-align:left;vertical-align:top}.prerender-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0;list-style:none}.prerender-links a{display:grid;height:100%;box-sizing:border-box;padding:14px;border:1px solid #dce5f2;border-radius:12px;text-decoration:none}.prerender-links span{color:#596579;font-size:14px}@media(max-width:700px){.prerender-links{grid-template-columns:1fr}}</style>`;

for (const record of routeRecords) {
  const html = template
    .replace(/<title>[\s\S]*?<\/title>[\s\S]*?<link rel="canonical"[^>]*>/, `${metadataFor(record)}${structuredDataFor(record)}${staticStyle}`)
    .replace('<div id="root"></div>', `<div id="root">${staticContentFor(record)}</div>`);
  const outputPath = record.path === "/" ? "dist/index.html" : join("dist", record.path.slice(1), "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  if (record.path !== "/") await writeFile(join("dist", `${record.path.slice(1)}.html`), html, "utf8");
}

const notFoundRecord = { path: "/404", title: "Page Not Found | PDFArrow", description: "The requested PDFArrow page could not be found.", noIndex: true };
const notFoundHtml = template
  .replace(/<title>[\s\S]*?<\/title>[\s\S]*?<link rel="canonical"[^>]*>/, `${metadataFor(notFoundRecord)}${structuredDataFor(notFoundRecord)}${staticStyle}`)
  .replace('<div id="root"></div>', '<div id="root"><main class="prerender-shell"><p class="prerender-brand">PDFArrow · 404</p><h1>Page not found</h1><p class="prerender-lead">The page may have moved, or the address may be incomplete.</p><a class="prerender-action" href="/">Go to the homepage</a><p><a href="/tools">Browse every PDF tool</a></p></main></div>');
await writeFile("dist/404.html", notFoundHtml, "utf8");

console.log(`Prerendered ${routeRecords.length} public routes plus a real noindex 404 page with readable HTML and structured data.`);
