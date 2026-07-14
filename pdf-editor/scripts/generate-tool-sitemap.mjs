import { mkdir, writeFile } from "node:fs/promises";
import { PUBLIC_PLACEHOLDER_ROUTES } from "../src/router/routes.js";
import { ROUTE_PATHS } from "../src/router/routePaths.js";
import { TOOL_REGISTRY, validateToolRegistry } from "../src/tools/toolRegistry.js";

const siteUrl = (process.env.SITE_URL || "https://realpdf.com").replace(/\/$/, "");
const registryErrors = validateToolRegistry();

if (registryErrors.length) {
  throw new Error(`Cannot generate sitemap from an invalid registry:\n${registryErrors.join("\n")}`);
}

const paths = [
  ROUTE_PATHS.home,
  ROUTE_PATHS.tools,
  ...PUBLIC_PLACEHOLDER_ROUTES.map(({ path }) => path),
  ...TOOL_REGISTRY.map(({ route }) => route),
];

const uniquePaths = [...new Set(paths)].sort();
const urls = uniquePaths
  .map((path) => `  <url><loc>${siteUrl}${path === "/" ? "/" : path}</loc></url>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

await mkdir("runtime-public", { recursive: true });
await writeFile("runtime-public/sitemap.xml", sitemap, "utf8");
console.log(`Generated sitemap.xml with ${uniquePaths.length} public routes.`);
