import { readFile } from "node:fs/promises";
import { INDEXNOW_ENDPOINT, INDEXNOW_KEY, INDEXNOW_KEY_FILE } from "./indexnow-config.mjs";
import { resolveSiteUrl } from "./site-url.mjs";

const siteUrl = resolveSiteUrl();
const site = new URL(siteUrl);
const sitemap = await readFile("runtime-public/sitemap.xml", "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map((match) => match[1]);
const requested = process.argv.slice(2);

if (!requested.length) {
  throw new Error("Pass one or more changed paths, such as: npm run indexnow:submit -- / /edit-pdf");
}

const candidates = requested.includes("--all")
  ? sitemapUrls
  : requested.filter((value) => !["--", "--dry-run"].includes(value)).map((value) => new URL(value, `${siteUrl}/`).toString());
const urlList = [...new Set(candidates)];

for (const value of urlList) {
  const url = new URL(value);
  if (url.origin !== site.origin) throw new Error(`Refusing to submit a URL outside ${site.origin}: ${value}`);
  if (!sitemapUrls.includes(value)) throw new Error(`Refusing to submit a URL that is not in sitemap.xml: ${value}`);
}

const payload = {
  host: site.host,
  key: INDEXNOW_KEY,
  keyLocation: `${siteUrl}/${INDEXNOW_KEY_FILE}`,
  urlList,
};

if (requested.includes("--dry-run")) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const response = await fetch(INDEXNOW_ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});

if (![200, 202].includes(response.status)) {
  throw new Error(`IndexNow rejected ${urlList.length} URL(s) with HTTP ${response.status}.`);
}

console.log(`IndexNow accepted ${urlList.length} changed URL(s) with HTTP ${response.status}.`);
