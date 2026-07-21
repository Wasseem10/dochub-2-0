import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PUBLIC_PLACEHOLDER_ROUTES } from "../src/router/routes.js";
import { ROUTE_PATHS } from "../src/router/routePaths.js";
import { TOOL_CATEGORY_PAGES } from "../src/tools/toolCategoryPages.js";
import { TOOL_REGISTRY } from "../src/tools/toolRegistry.js";
import { resolveSiteUrl } from "./site-url.mjs";

const siteUrl = resolveSiteUrl();
const template = await readFile("dist/index.html", "utf8");
/** @param {unknown} value */
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
/** @param {unknown} value */
const escapeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
/** @typedef {{ path: string, title: string, description: string, noIndex: boolean, tool?: import("../src/tools/toolRegistry.js").ToolRecord }} RouteRecord */
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
  { path: "/", title: "Every PDF Task in One Place | FixThatPDF", description: "Edit, sign, fill, merge, split, organize, and convert PDFs without subscriptions, watermarks, or forced signup.", noIndex: false },
  { path: ROUTE_PATHS.tools, title: "Free PDF Tools | FixThatPDF", description: "Browse working free PDF tools with clear formats, limits, and availability labels.", noIndex: false },
  { path: ROUTE_PATHS.features, title: "All PDF Features | FixThatPDF", description: "Explore every released FixThatPDF feature for editing, organizing, converting, signing, scanning, protecting, and reviewing PDFs.", noIndex: false },
  { path: ROUTE_PATHS.support, title: "PDF Help and Support | FixThatPDF", description: "Contact FixThatPDF support about PDF tools, accounts, privacy, security, or data deletion.", noIndex: false },
  ...TOOL_CATEGORY_PAGES.map((category) => ({ path: category.route, title: category.seoTitle, description: category.metaDescription, noIndex: false })),
  ...PUBLIC_PLACEHOLDER_ROUTES.filter(({ path }) => path !== ROUTE_PATHS.features).map((route) => ({ ...route, title: `${route.title} | FixThatPDF`, description: legalDescriptions[route.path] || route.description, noIndex: !Object.hasOwn(legalDescriptions, route.path) })),
  ...TOOL_REGISTRY.map((tool) => ({ path: tool.route, title: tool.seoTitle, description: tool.metaDescription, noIndex: tool.status === "coming-soon", tool })),
];

/** @param {{ path: string, title: string, description: string, noIndex: boolean }} record */
function metadataFor(record) {
  const canonical = `${siteUrl}${record.path === "/" ? "/" : record.path}`;
  return `<title>${escapeHtml(record.title)}</title>\n    <meta name="description" content="${escapeHtml(record.description)}" />\n    <meta name="robots" content="${record.noIndex ? "noindex, follow" : "index, follow"}" />\n    <meta property="og:title" content="${escapeHtml(record.title)}" />\n    <meta property="og:description" content="${escapeHtml(record.description)}" />\n    <meta property="og:type" content="website" />\n    <meta property="og:url" content="${escapeHtml(canonical)}" />\n    <meta name="twitter:card" content="summary" />\n    <meta name="twitter:title" content="${escapeHtml(record.title)}" />\n    <meta name="twitter:description" content="${escapeHtml(record.description)}" />\n    <link rel="canonical" href="${escapeHtml(canonical)}" />`;
}

/** @param {RouteRecord} record */
function staticContentFor(record) {
  if (!record.tool) {
    return `<main class="prerender-shell"><p class="prerender-brand">FixThatPDF</p><h1>${escapeHtml(record.title.replace(/ \| FixThatPDF$/, ""))}</h1><p>${escapeHtml(record.description)}</p><a href="${escapeHtml(record.path)}">Open this page</a></main>`;
  }

  const tool = record.tool;
  const steps = tool.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  const benefits = tool.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("");
  const faq = tool.faqEntries.map((entry) => `<details><summary>${escapeHtml(entry.question)}</summary><p>${escapeHtml(entry.answer)}</p></details>`).join("");
  return `<main class="prerender-shell prerender-tool"><p class="prerender-brand">FixThatPDF · ${escapeHtml(tool.availabilityLabel)}</p><h1>${escapeHtml(tool.heroHeadline)}</h1><p class="prerender-lead">${escapeHtml(tool.heroSubheadline)}</p><p>${escapeHtml(tool.longDescription)}</p><a class="prerender-action" href="${escapeHtml(tool.route)}">Use ${escapeHtml(tool.name)}</a><section><h2>How to use ${escapeHtml(tool.name)}</h2><ol>${steps}</ol></section><section><h2>What this tool supports</h2><ul>${benefits}</ul></section><section><h2>Privacy and current limits</h2><p>${escapeHtml(tool.privacySummary)}</p><p>${escapeHtml(tool.currentLimitations)}</p></section><section><h2>${escapeHtml(tool.name)} questions</h2>${faq}</section></main>`;
}

/** @param {RouteRecord} record */
function structuredDataFor(record) {
  if (!record.tool) return "";
  const tool = record.tool;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: tool.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any modern web browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: tool.metaDescription,
      url: `${siteUrl}${tool.route}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to use ${tool.name}`,
      step: tool.steps.map((step, index) => ({ "@type": "HowToStep", position: index + 1, text: step })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: tool.faqEntries.map((entry) => ({ "@type": "Question", name: entry.question, acceptedAnswer: { "@type": "Answer", text: entry.answer } })),
    },
  ];
  return `\n    <script type="application/ld+json">${escapeJson(schemas)}</script>`;
}

const staticStyle = `<style id="prerender-style">.prerender-shell{box-sizing:border-box;max-width:1040px;margin:0 auto;padding:72px 24px 96px;color:#13213c;font:17px/1.65 Arial,sans-serif}.prerender-shell h1{max-width:820px;margin:10px 0 16px;font-size:clamp(38px,7vw,72px);line-height:1.02;letter-spacing:-.045em}.prerender-shell h2{margin-top:42px;font-size:28px;line-height:1.15}.prerender-shell section{max-width:800px}.prerender-brand{color:#0540ae;font-weight:800}.prerender-lead{max-width:760px;font-size:22px}.prerender-action,.prerender-shell>a{display:inline-block;margin:18px 0;padding:12px 18px;border-radius:12px;background:#0540ae;color:#fff;font-weight:700;text-decoration:none}.prerender-shell li{margin:9px 0}.prerender-shell details{margin:10px 0;padding:12px 0;border-bottom:1px solid #dce5f2}.prerender-shell summary{font-weight:700;cursor:pointer}</style>`;

for (const record of routeRecords) {
  const html = template
    .replace(/<title>[\s\S]*?<\/title>[\s\S]*?<link rel="canonical"[^>]*>/, `${metadataFor(record)}${structuredDataFor(record)}${staticStyle}`)
    .replace('<div id="root"></div>', `<div id="root">${staticContentFor(record)}</div>`);
  const outputPath = record.path === "/" ? "dist/index.html" : join("dist", record.path.slice(1), "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  if (record.path !== "/") await writeFile(join("dist", `${record.path.slice(1)}.html`), html, "utf8");
}

console.log(`Prerendered ${routeRecords.length} public routes with readable HTML, metadata, and tool schema.`);
