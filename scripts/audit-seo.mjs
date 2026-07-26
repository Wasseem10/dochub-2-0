import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPARISON_PATHS } from "../src/comparison/comparisonData.js";
import { toolDirectoryMetadata } from "../src/seo/publicPageMetadata.js";
import { TOOL_REGISTRY } from "../src/tools/toolRegistry.js";

const root = fileURLToPath(new URL("..", import.meta.url));
/** @param {string} path */
const read = (path) => readFile(join(root, path), "utf8");
const sitemap = await read("dist/sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
const failures = [];
const titles = new Map();
const descriptions = new Map();
const routeHtml = new Map();
const sitemapPaths = new Set(sitemapUrls.map(({ pathname }) => pathname));
const releasedToolPaths = TOOL_REGISTRY.filter(({ status }) => status !== "coming-soon").map(({ route }) => route);
const expectedDirectoryMetadata = toolDirectoryMetadata(releasedToolPaths.length);
const productPaths = [...new Set([...releasedToolPaths, ...COMPARISON_PATHS])];
const productPathSet = new Set(productPaths);

/** @param {unknown} condition @param {string} message */
const requireMatch = (condition, message) => {
  if (!condition) failures.push(message);
};

requireMatch(sitemapUrls.length >= 80, `Sitemap exposes only ${sitemapUrls.length} public URLs.`);
requireMatch(!sitemapUrls.some(({ pathname }) => /^\/(app|login|signup|forgot-password|share|sign)(\/|$)/.test(pathname)), "Sitemap includes a private, auth, or token route.");

for (const url of sitemapUrls) {
  const path = url.pathname === "/" ? "dist/index.html" : `dist${url.pathname}/index.html`;
  const html = await read(path);
  routeHtml.set(url.pathname, html);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || "";
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] || "";
  const robots = html.match(/<meta name="robots" content="([^"]+)"/i)?.[1] || "";
  const h1Count = (html.match(/<h1[ >]/g) || []).length;
  const structuredData = html.match(/<script id="pdfarrow-prerender-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];

  requireMatch(Boolean(title), `${url.pathname}: missing title.`);
  requireMatch(description.length >= 70 && description.length <= 190, `${url.pathname}: meta description length is ${description.length}.`);
  requireMatch(canonical === url.toString(), `${url.pathname}: canonical ${canonical || "is missing"}; expected ${url.toString()}.`);
  requireMatch(robots.includes("index") && !robots.includes("noindex"), `${url.pathname}: public route is not indexable.`);
  requireMatch(h1Count === 1, `${url.pathname}: expected one prerendered H1, found ${h1Count}.`);
  requireMatch(Boolean(structuredData), `${url.pathname}: missing prerendered structured data.`);
  requireMatch(!html.includes('"@type":"SoftwareApplication"'), `${url.pathname}: contains ineligible SoftwareApplication markup without a real review or rating.`);
  if (structuredData) {
    try { JSON.parse(structuredData); } catch { failures.push(`${url.pathname}: structured data is not valid JSON.`); }
  }
  if (titles.has(title)) failures.push(`${url.pathname}: duplicate title also used by ${titles.get(title)}.`);
  else titles.set(title, url.pathname);
  if (descriptions.has(description)) failures.push(`${url.pathname}: duplicate meta description also used by ${descriptions.get(description)}.`);
  else descriptions.set(description, url.pathname);
}

for (const productPath of productPaths) {
  requireMatch(sitemapPaths.has(productPath), `${productPath}: released tool or comparison route is missing from the sitemap.`);
  requireMatch(routeHtml.has(productPath), `${productPath}: released tool or comparison route is missing prerendered HTML.`);
}

const inboundLinks = new Map(productPaths.map((path) => [path, new Set()]));
const authOrPrivatePath = /^\/(?:app|login|signup|forgot-password|share|sign)(?:\/|$)/;
const assetPath = /\.[a-z0-9]{2,6}$/i;

for (const [sourcePath, html] of routeHtml) {
  const internalTargets = [...html.matchAll(/<a\s[^>]*href="([^"]+)"/gi)]
    .map((match) => match[1])
    .filter((href) => href.startsWith("/"))
    .map((href) => href.split(/[?#]/)[0] || sourcePath);
  const uniqueTargets = new Set(internalTargets);

  for (const targetPath of uniqueTargets) {
    if (targetPath !== sourcePath) inboundLinks.get(targetPath)?.add(sourcePath);
    if (!assetPath.test(targetPath) && !authOrPrivatePath.test(targetPath)) {
      requireMatch(sitemapPaths.has(targetPath), `${sourcePath}: internal link points to non-indexable or missing public route ${targetPath}.`);
    }
  }

  if (!productPathSet.has(sourcePath)) continue;
  const crawlableTargets = [...uniqueTargets].filter((targetPath) => sitemapPaths.has(targetPath) && targetPath !== sourcePath);
  requireMatch(crawlableTargets.length >= 2, `${sourcePath}: exposes only ${crawlableTargets.length} crawlable internal destinations.`);

  if (releasedToolPaths.includes(sourcePath)) {
    requireMatch(uniqueTargets.has("/tools"), `${sourcePath}: tool page does not link back to the public tool directory.`);
    requireMatch(crawlableTargets.some((targetPath) => releasedToolPaths.includes(targetPath)), `${sourcePath}: tool page does not link to another released PDF tool.`);
  } else if (sourcePath === "/compare") {
    requireMatch(COMPARISON_PATHS.slice(1).every((targetPath) => uniqueTargets.has(targetPath)), "/compare: comparison directory does not link to every comparison page.");
  } else {
    requireMatch(uniqueTargets.has("/compare"), `${sourcePath}: comparison page does not link back to the comparison directory.`);
    requireMatch(uniqueTargets.has("/edit-pdf"), `${sourcePath}: comparison page does not link to the working PDF editor.`);
    requireMatch(crawlableTargets.some((targetPath) => COMPARISON_PATHS.includes(targetPath) && targetPath !== sourcePath), `${sourcePath}: comparison page does not link to another comparison.`);
  }
}

for (const [productPath, sources] of inboundLinks) {
  requireMatch(sources.size > 0, `${productPath}: released tool or comparison route is orphaned from all other indexable pages.`);
}

const home = await read("dist/index.html");
const toolsDirectory = routeHtml.get("/tools") || "";
const notFound = await read("dist/404.html");
const robots = await read("dist/robots.txt");
requireMatch(home.includes('rel="icon" href="/icon.svg"'), "Homepage is missing the stable search favicon.");
requireMatch(toolsDirectory.includes(`<title>${expectedDirectoryMetadata.title}</title>`), "/tools: prerendered title does not match the interactive directory title.");
requireMatch(toolsDirectory.includes(`<meta name="description" content="${expectedDirectoryMetadata.description}"`), "/tools: prerendered description does not match the interactive directory description.");
requireMatch((home.match(/<a [^>]*href="\//g) || []).length >= 60, "Homepage prerender does not expose enough crawlable tool links.");
requireMatch(!/modulepreload[^>]+(?:pdfjs|firebase)/i.test(home), "Homepage preloads editor-only PDF.js or Firebase code.");
requireMatch(/noindex/i.test(notFound), "404 page is missing noindex.");
requireMatch(robots.includes("Disallow: /app/") && robots.includes("Sitemap:"), "robots.txt is missing private-route controls or sitemap discovery.");

if (failures.length) {
  console.error(`SEO audit failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO audit passed for ${sitemapUrls.length} canonical public routes, including ${releasedToolPaths.length} released tools and ${COMPARISON_PATHS.length} comparison routes with verified inbound, outbound, and non-broken internal links.`);
