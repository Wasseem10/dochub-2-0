import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PUBLIC_PLACEHOLDER_ROUTES } from "../src/router/routes.js";
import { ROUTE_PATHS } from "../src/router/routePaths.js";
import { TOOL_CATEGORY_PAGES } from "../src/tools/toolCategoryPages.js";
import { HIGH_INTENT_TOOL_IDS } from "../src/tools/highIntentToolContent.js";
import { getRelatedTools, TOOL_REGISTRY } from "../src/tools/toolRegistry.js";
import { resolveSiteUrl } from "./site-url.mjs";

const siteUrl = resolveSiteUrl();
const template = await readFile("dist/index.html", "utf8");
/** @param {unknown} value */
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
/** @param {unknown} value */
const escapeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const highIntentToolIds = new Set(HIGH_INTENT_TOOL_IDS);
/** @typedef {{ path: string, title: string, description: string, noIndex: boolean, tool?: import("../src/tools/toolRegistry.js").ToolRecord, category?: (typeof TOOL_CATEGORY_PAGES)[number], kind?: string }} RouteRecord */
/** @type {Record<string, string>} */
const legalDescriptions = {
  [ROUTE_PATHS.privacy]: "How FixThatPDF handles browser processing, local storage, optional Firebase cloud history, analytics, and deletion.",
  [ROUTE_PATHS.security]: "Current FixThatPDF browser-processing safeguards, account boundaries, and honest security limitations.",
  [ROUTE_PATHS.help]: "Help for uploading, editing, signing, organizing, converting, and downloading PDFs with FixThatPDF.",
  [ROUTE_PATHS.dataRetention]: "What FixThatPDF stores, how long account and browser data remain, and how to remove them.",
  [ROUTE_PATHS.terms]: "Current terms for using FixThatPDF's free browser PDF tools and optional account features.",
};
/** @type {RouteRecord[]} */
const routeRecords = [
  { path: "/", title: "Every PDF Task in One Place | FixThatPDF", description: "Edit, sign, fill, merge, split, organize, and convert PDFs without subscriptions, watermarks, or forced signup.", noIndex: false, kind: "home" },
  { path: ROUTE_PATHS.tools, title: "Free PDF Tools | FixThatPDF", description: "Browse working free PDF tools with clear formats, limits, and availability labels.", noIndex: false, kind: "directory" },
  { path: ROUTE_PATHS.features, title: "All PDF Features | FixThatPDF", description: "Explore every released FixThatPDF feature for editing, organizing, converting, signing, scanning, protecting, and reviewing PDFs.", noIndex: false, kind: "directory" },
  { path: ROUTE_PATHS.support, title: "PDF Help and Support | FixThatPDF", description: "Contact FixThatPDF support about PDF tools, accounts, privacy, security, or data deletion.", noIndex: false },
  ...TOOL_CATEGORY_PAGES.map((category) => ({ path: category.route, title: category.seoTitle, description: category.metaDescription, noIndex: false, category })),
  ...PUBLIC_PLACEHOLDER_ROUTES.filter(({ path }) => path !== ROUTE_PATHS.features).map((route) => ({ ...route, title: `${route.title} | FixThatPDF`, description: legalDescriptions[route.path] || route.description, noIndex: !Object.hasOwn(legalDescriptions, route.path) })),
  ...TOOL_REGISTRY.map((tool) => ({ path: tool.route, title: tool.seoTitle, description: tool.metaDescription, noIndex: tool.status === "coming-soon", tool })),
];

/** @param {{ path: string, title: string, description: string, noIndex: boolean }} record */
function metadataFor(record) {
  const canonical = `${siteUrl}${record.path === "/" ? "/" : record.path}`;
  const socialImage = `${siteUrl}/homepage/hero-product-stage.png`;
  return `<title>${escapeHtml(record.title)}</title>\n    <meta name="description" content="${escapeHtml(record.description)}" />\n    <meta name="robots" content="${record.noIndex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}" />\n    <meta property="og:title" content="${escapeHtml(record.title)}" />\n    <meta property="og:description" content="${escapeHtml(record.description)}" />\n    <meta property="og:type" content="website" />\n    <meta property="og:url" content="${escapeHtml(canonical)}" />\n    <meta property="og:site_name" content="FixThatPDF" />\n    <meta property="og:locale" content="en_US" />\n    <meta property="og:image" content="${escapeHtml(socialImage)}" />\n    <meta property="og:image:alt" content="FixThatPDF browser PDF workspace" />\n    <meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:title" content="${escapeHtml(record.title)}" />\n    <meta name="twitter:description" content="${escapeHtml(record.description)}" />\n    <meta name="twitter:image" content="${escapeHtml(socialImage)}" />\n    <link rel="canonical" href="${escapeHtml(canonical)}" />`;
}

/** @param {RouteRecord} record */
function staticContentFor(record) {
  /** @param {string} current */
  const breadcrumb = (current) => `<nav aria-label="Breadcrumb"><a href="/tools">PDF tools</a><span aria-hidden="true"> / </span><span>${escapeHtml(current)}</span></nav>`;
  /** @param {import("../src/tools/toolRegistry.js").ToolRecord} tool */
  const toolLink = (tool) => `<li><a href="${escapeHtml(tool.route)}"><strong>${escapeHtml(tool.name)}</strong><span>${escapeHtml(tool.shortDescription)}</span></a></li>`;

  if (record.tool) {
    const tool = record.tool;
    const steps = tool.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
    const benefits = tool.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("");
    const useCases = tool.useCases.map((useCase) => `<li>${escapeHtml(useCase)}</li>`).join("");
    const faq = tool.faqEntries.map((entry) => `<details><summary>${escapeHtml(entry.question)}</summary><p>${escapeHtml(entry.answer)}</p></details>`).join("");
    const related = getRelatedTools(tool).map((relatedTool) => relatedTool ? toolLink(relatedTool) : "").join("");
    return `<main class="prerender-shell prerender-tool">${breadcrumb(tool.name)}<p class="prerender-brand">FixThatPDF · ${escapeHtml(tool.availabilityLabel)}</p><h1>${escapeHtml(tool.heroHeadline)}</h1><p class="prerender-lead">${escapeHtml(tool.heroSubheadline)}</p><p>${escapeHtml(tool.longDescription)}</p><a class="prerender-action" href="${escapeHtml(tool.route)}">Use ${escapeHtml(tool.name)}</a><section><h2>How to use ${escapeHtml(tool.name)}</h2><ol>${steps}</ol></section><section><h2>What this tool supports</h2><ul>${benefits}</ul></section><section><h2>Common ${escapeHtml(tool.name)} tasks</h2><ul>${useCases}</ul></section><section><h2>Privacy, supported files, and limits</h2><p>${escapeHtml(tool.privacySummary)}</p><p>${escapeHtml(tool.currentLimitations)}</p></section><section><h2>${escapeHtml(tool.name)} questions</h2>${faq}</section><section><h2>Related PDF tools</h2><ul class="prerender-links">${related}</ul></section></main>`;
  }

  if (record.category) {
    const category = record.category;
    const tools = TOOL_REGISTRY.filter((tool) => tool.category === category.id && tool.status !== "coming-soon");
    const guidance = category.guidance.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    return `<main class="prerender-shell">${breadcrumb(category.name)}<p class="prerender-brand">FixThatPDF · ${tools.length} working tools</p><h1>${escapeHtml(category.headline)}</h1><p class="prerender-lead">${escapeHtml(category.intro)}</p><section><h2>${escapeHtml(category.name)} tools</h2><ul class="prerender-links">${tools.map(toolLink).join("")}</ul></section><section><h2>What to check before downloading</h2><ul>${guidance}</ul></section><p><a href="/tools">Browse every PDF tool</a></p></main>`;
  }

  if (record.kind === "home" || record.kind === "directory") {
    const categoryLinks = TOOL_CATEGORY_PAGES.map((category) => `<li><a href="${escapeHtml(category.route)}"><strong>${escapeHtml(category.name)}</strong><span>${escapeHtml(category.metaDescription)}</span></a></li>`).join("");
    const toolLinks = TOOL_REGISTRY.filter((tool) => tool.status !== "coming-soon").map(toolLink).join("");
    const heading = record.kind === "home" ? "Every PDF task, finally in one place" : record.title.replace(/ \| FixThatPDF$/, "");
    return `<main class="prerender-shell"><p class="prerender-brand">FixThatPDF</p><h1>${escapeHtml(heading)}</h1><p class="prerender-lead">${escapeHtml(record.description)}</p><a class="prerender-action" href="/edit-pdf">Choose a PDF</a><section><h2>Browse PDF tools by task</h2><ul class="prerender-links">${categoryLinks}</ul></section><section><h2>All working PDF tools</h2><ul class="prerender-links">${toolLinks}</ul></section></main>`;
  }

  return `<main class="prerender-shell"><p class="prerender-brand">FixThatPDF</p><h1>${escapeHtml(record.title.replace(/ \| FixThatPDF$/, ""))}</h1><p class="prerender-lead">${escapeHtml(record.description)}</p><p><a href="/tools">Browse working PDF tools</a></p></main>`;
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
    isPartOf: { "@type": "WebSite", name: "FixThatPDF", url: `${siteUrl}/` },
  }];
  if (record.kind === "home") schemas.push(
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "FixThatPDF",
      alternateName: "Fix That PDF",
      url: `${siteUrl}/`,
      inLanguage: "en-US",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "FixThatPDF",
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
  return `\n    <script id="fixthatpdf-prerender-structured-data" type="application/ld+json">${escapeJson(schemas)}</script>`;
}

const staticStyle = `<style id="prerender-style">.prerender-shell{box-sizing:border-box;max-width:1100px;margin:0 auto;padding:64px 24px 96px;color:#13213c;font:17px/1.65 Arial,sans-serif}.prerender-shell h1{max-width:850px;margin:10px 0 16px;font-size:clamp(38px,7vw,72px);line-height:1.02;letter-spacing:-.045em}.prerender-shell h2{margin-top:42px;font-size:28px;line-height:1.15}.prerender-shell section{max-width:900px}.prerender-shell nav{color:#667085;font-size:14px}.prerender-shell nav a,.prerender-shell section a,.prerender-shell>p a{color:#0540ae}.prerender-brand{color:#0540ae;font-weight:800}.prerender-lead{max-width:780px;font-size:22px}.prerender-action{display:inline-block;margin:18px 0;padding:12px 18px;border-radius:12px;background:#0540ae;color:#fff;font-weight:700;text-decoration:none}.prerender-shell li{margin:9px 0}.prerender-shell details{margin:10px 0;padding:12px 0;border-bottom:1px solid #dce5f2}.prerender-shell summary{font-weight:700;cursor:pointer}.prerender-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0;list-style:none}.prerender-links a{display:grid;height:100%;box-sizing:border-box;padding:14px;border:1px solid #dce5f2;border-radius:12px;text-decoration:none}.prerender-links span{color:#596579;font-size:14px}@media(max-width:700px){.prerender-links{grid-template-columns:1fr}}</style>`;

for (const record of routeRecords) {
  const html = template
    .replace(/<title>[\s\S]*?<\/title>[\s\S]*?<link rel="canonical"[^>]*>/, `${metadataFor(record)}${structuredDataFor(record)}${staticStyle}`)
    .replace('<div id="root"></div>', `<div id="root">${staticContentFor(record)}</div>`);
  const outputPath = record.path === "/" ? "dist/index.html" : join("dist", record.path.slice(1), "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  if (record.path !== "/") await writeFile(join("dist", `${record.path.slice(1)}.html`), html, "utf8");
}

const notFoundRecord = { path: "/404", title: "Page Not Found | FixThatPDF", description: "The requested FixThatPDF page could not be found.", noIndex: true };
const notFoundHtml = template
  .replace(/<title>[\s\S]*?<\/title>[\s\S]*?<link rel="canonical"[^>]*>/, `${metadataFor(notFoundRecord)}${structuredDataFor(notFoundRecord)}${staticStyle}`)
  .replace('<div id="root"></div>', '<div id="root"><main class="prerender-shell"><p class="prerender-brand">FixThatPDF · 404</p><h1>Page not found</h1><p class="prerender-lead">The page may have moved, or the address may be incomplete.</p><a class="prerender-action" href="/">Go to the homepage</a><p><a href="/tools">Browse every PDF tool</a></p></main></div>');
await writeFile("dist/404.html", notFoundHtml, "utf8");

console.log(`Prerendered ${routeRecords.length} public routes plus a real noindex 404 page with readable HTML and structured data.`);
