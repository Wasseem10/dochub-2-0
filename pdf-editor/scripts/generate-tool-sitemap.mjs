import { mkdir, writeFile } from "node:fs/promises";
import { ROUTE_PATHS } from "../src/router/routePaths.js";
import { TOOL_REGISTRY, validateToolRegistry } from "../src/tools/toolRegistry.js";

const siteUrl = (process.env.SITE_URL || process.env.VITE_SITE_URL || "http://localhost:4173").replace(/\/$/, "");
const registryErrors = validateToolRegistry();

if (registryErrors.length) {
  throw new Error(`Cannot generate sitemap from an invalid registry:\n${registryErrors.join("\n")}`);
}

const paths = [
  ROUTE_PATHS.home,
  ROUTE_PATHS.tools,
  ROUTE_PATHS.privacy,
  ROUTE_PATHS.security,
  ROUTE_PATHS.help,
  ROUTE_PATHS.terms,
  ...TOOL_REGISTRY.filter(({ status }) => status !== "coming-soon").map(({ route }) => route),
];

const uniquePaths = [...new Set(paths)].sort();
const urls = uniquePaths
  .map((path) => `  <url><loc>${siteUrl}${path === "/" ? "/" : path}</loc></url>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

await mkdir("runtime-public", { recursive: true });
await writeFile("runtime-public/sitemap.xml", sitemap, "utf8");
await writeFile("runtime-public/robots.txt", `User-agent: *\nAllow: /\nDisallow: /app/\nDisallow: /login\nDisallow: /signup\nDisallow: /forgot-password\n\nSitemap: ${siteUrl}/sitemap.xml\n`, "utf8");
console.log(`Generated sitemap.xml with ${uniquePaths.length} public routes.`);
