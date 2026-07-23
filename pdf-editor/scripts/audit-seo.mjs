import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
/** @param {string} path */
const read = (path) => readFile(join(root, path), "utf8");
const sitemap = await read("dist/sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map((match) => new URL(match[1]));
const failures = [];
const titles = new Map();
const descriptions = new Map();

/** @param {unknown} condition @param {string} message */
const requireMatch = (condition, message) => {
  if (!condition) failures.push(message);
};

requireMatch(sitemapUrls.length >= 80, `Sitemap exposes only ${sitemapUrls.length} public URLs.`);
requireMatch(!sitemapUrls.some(({ pathname }) => /^\/(app|login|signup|forgot-password|share|sign)(\/|$)/.test(pathname)), "Sitemap includes a private, auth, or token route.");

for (const url of sitemapUrls) {
  const path = url.pathname === "/" ? "dist/index.html" : `dist${url.pathname}/index.html`;
  const html = await read(path);
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

const home = await read("dist/index.html");
const notFound = await read("dist/404.html");
const robots = await read("dist/robots.txt");
requireMatch(home.includes('rel="icon" href="/icon.svg"'), "Homepage is missing the stable search favicon.");
requireMatch((home.match(/<a [^>]*href="\//g) || []).length >= 60, "Homepage prerender does not expose enough crawlable tool links.");
requireMatch(!/modulepreload[^>]+(?:pdfjs|firebase)/i.test(home), "Homepage preloads editor-only PDF.js or Firebase code.");
requireMatch(/noindex/i.test(notFound), "404 page is missing noindex.");
requireMatch(robots.includes("Disallow: /app/") && robots.includes("Sitemap:"), "robots.txt is missing private-route controls or sitemap discovery.");

if (failures.length) {
  console.error(`SEO audit failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO audit passed for ${sitemapUrls.length} canonical public routes, structured data, crawl links, favicon, robots.txt, and the 404 response.`);
