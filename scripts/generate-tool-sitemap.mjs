import { mkdir, writeFile } from "node:fs/promises";
import { ROUTE_PATHS } from "../src/router/routePaths.js";
import { TOOL_CATEGORY_PAGES } from "../src/tools/toolCategoryPages.js";
import { TOOL_REGISTRY, validateToolRegistry } from "../src/tools/toolRegistry.js";
import { resolveSiteUrl } from "./site-url.mjs";
import { EDITORIAL_RESOURCE_PATHS } from "../src/editorial/editorialRoutePaths.js";
import { COMPARISON_PATHS } from "../src/comparison/comparisonData.js";
import { publicPageLastModified } from "../src/seo/publicFreshness.js";

const siteUrl = resolveSiteUrl();
const registryErrors = validateToolRegistry();

if (registryErrors.length) {
  throw new Error(`Cannot generate sitemap from an invalid registry:\n${registryErrors.join("\n")}`);
}

const paths = [
  ROUTE_PATHS.home,
  ROUTE_PATHS.about,
  ROUTE_PATHS.features,
  ROUTE_PATHS.tools,
  ROUTE_PATHS.support,
  ROUTE_PATHS.privacy,
  ROUTE_PATHS.security,
  ROUTE_PATHS.help,
  ROUTE_PATHS.dataRetention,
  ROUTE_PATHS.terms,
  ...COMPARISON_PATHS,
  ...EDITORIAL_RESOURCE_PATHS,
  ...TOOL_CATEGORY_PAGES.map(({ route }) => route),
  ...TOOL_REGISTRY.filter(({ status }) => status !== "coming-soon").map(({ route }) => route),
];

const uniquePaths = [...new Set(paths)].sort();
const urls = uniquePaths
  .map((path) => `  <url><loc>${siteUrl}${path === "/" ? "/" : path}</loc><lastmod>${publicPageLastModified(path)}</lastmod></url>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

await mkdir("runtime-public", { recursive: true });
await writeFile("runtime-public/sitemap.xml", sitemap, "utf8");
await writeFile("runtime-public/robots.txt", `# PDFEnrich public guides and tools are available for search and answer engines.\n# Private workspaces, account routes, and capability links stay out of search.\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: *\nAllow: /\nDisallow: /app/\nDisallow: /login\nDisallow: /signup\nDisallow: /forgot-password\nDisallow: /share/\nDisallow: /sign/\n\nSitemap: ${siteUrl}/sitemap.xml\n`, "utf8");
console.log(`Generated sitemap.xml with ${uniquePaths.length} public routes.`);
