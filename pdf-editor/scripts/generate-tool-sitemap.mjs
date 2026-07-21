import { mkdir, writeFile } from "node:fs/promises";
import { ROUTE_PATHS } from "../src/router/routePaths.js";
import { TOOL_CATEGORY_PAGES } from "../src/tools/toolCategoryPages.js";
import { TOOL_REGISTRY, validateToolRegistry } from "../src/tools/toolRegistry.js";
import { resolveSiteUrl } from "./site-url.mjs";

const siteUrl = resolveSiteUrl();
const registryErrors = validateToolRegistry();

if (registryErrors.length) {
  throw new Error(`Cannot generate sitemap from an invalid registry:\n${registryErrors.join("\n")}`);
}

const paths = [
  ROUTE_PATHS.home,
  ROUTE_PATHS.features,
  ROUTE_PATHS.tools,
  ROUTE_PATHS.support,
  ROUTE_PATHS.privacy,
  ROUTE_PATHS.security,
  ROUTE_PATHS.help,
  ROUTE_PATHS.dataRetention,
  ROUTE_PATHS.terms,
  ...TOOL_CATEGORY_PAGES.map(({ route }) => route),
  ...TOOL_REGISTRY.filter(({ status }) => status !== "coming-soon").map(({ route }) => route),
];

const uniquePaths = [...new Set(paths)].sort();
const urls = uniquePaths
  .map((path) => `  <url><loc>${siteUrl}${path === "/" ? "/" : path}</loc><changefreq>${path === "/" ? "weekly" : "monthly"}</changefreq></url>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

await mkdir("runtime-public", { recursive: true });
await writeFile("runtime-public/sitemap.xml", sitemap, "utf8");
await writeFile("runtime-public/robots.txt", `User-agent: *\nAllow: /\nDisallow: /app/\nDisallow: /login\nDisallow: /signup\nDisallow: /forgot-password\n\nSitemap: ${siteUrl}/sitemap.xml\n`, "utf8");
console.log(`Generated sitemap.xml with ${uniquePaths.length} public routes.`);
