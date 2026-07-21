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
/** @type {Record<string, string>} */
const legalDescriptions = {
  [ROUTE_PATHS.privacy]: "How FixThatPDF handles browser processing, local storage, optional Firebase cloud history, analytics, and deletion.",
  [ROUTE_PATHS.security]: "Current FixThatPDF browser-processing safeguards, account boundaries, and honest security limitations.",
  [ROUTE_PATHS.help]: "Help for uploading, editing, signing, organizing, converting, and downloading PDFs with FixThatPDF.",
  [ROUTE_PATHS.dataRetention]: "What FixThatPDF stores, how long account and browser data remain, and how to remove them.",
  [ROUTE_PATHS.terms]: "Current terms for using FixThatPDF's free browser PDF tools and optional account features.",
};
const routeRecords = [
  { path: "/", title: "Every PDF Task in One Place | FixThatPDF", description: "Edit, sign, fill, merge, split, organize, and convert PDFs without subscriptions, watermarks, or forced signup.", noIndex: false },
  { path: ROUTE_PATHS.tools, title: "Free PDF Tools | FixThatPDF", description: "Browse working free PDF tools with clear formats, limits, and availability labels.", noIndex: false },
  { path: ROUTE_PATHS.features, title: "All PDF Features | FixThatPDF", description: "Explore every released FixThatPDF feature for editing, organizing, converting, signing, scanning, protecting, and reviewing PDFs.", noIndex: false },
  { path: ROUTE_PATHS.support, title: "PDF Help and Support | FixThatPDF", description: "Contact FixThatPDF support about PDF tools, accounts, privacy, security, or data deletion.", noIndex: false },
  ...TOOL_CATEGORY_PAGES.map((category) => ({ path: category.route, title: category.seoTitle, description: category.metaDescription, noIndex: false })),
  ...PUBLIC_PLACEHOLDER_ROUTES.filter(({ path }) => path !== ROUTE_PATHS.features).map((route) => ({ ...route, title: `${route.title} | FixThatPDF`, description: legalDescriptions[route.path] || route.description, noIndex: !Object.hasOwn(legalDescriptions, route.path) })),
  ...TOOL_REGISTRY.map((tool) => ({ path: tool.route, title: tool.seoTitle, description: tool.metaDescription, noIndex: tool.status === "coming-soon" })),
];

/** @param {{ path: string, title: string, description: string, noIndex: boolean }} record */
function metadataFor(record) {
  const canonical = `${siteUrl}${record.path === "/" ? "/" : record.path}`;
  return `<title>${escapeHtml(record.title)}</title>\n    <meta name="description" content="${escapeHtml(record.description)}" />\n    <meta name="robots" content="${record.noIndex ? "noindex, follow" : "index, follow"}" />\n    <meta property="og:title" content="${escapeHtml(record.title)}" />\n    <meta property="og:description" content="${escapeHtml(record.description)}" />\n    <meta property="og:type" content="website" />\n    <meta property="og:url" content="${escapeHtml(canonical)}" />\n    <meta name="twitter:card" content="summary" />\n    <meta name="twitter:title" content="${escapeHtml(record.title)}" />\n    <meta name="twitter:description" content="${escapeHtml(record.description)}" />\n    <link rel="canonical" href="${escapeHtml(canonical)}" />`;
}

for (const record of routeRecords) {
  const html = template.replace(/<title>[\s\S]*?<\/title>[\s\S]*?<link rel="canonical"[^>]*>/, metadataFor(record));
  const outputPath = record.path === "/" ? "dist/index.html" : join("dist", record.path.slice(1), "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
}

console.log(`Prerendered ${routeRecords.length} public routes with route-specific metadata.`);
