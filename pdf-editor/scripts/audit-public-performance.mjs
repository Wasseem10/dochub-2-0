import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
const representativePages = ["dist/index.html", "dist/tools/index.html", "dist/compare/index.html"];
const maximumInitialGzipBytes = 340 * 1024;
const failures = [];
const reports = [];

for (const pagePath of representativePages) {
  const html = await readFile(join(root, pagePath));
  const htmlText = html.toString("utf8");
  const assetPaths = [...htmlText.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(\/assets\/[^"]+)"/gi)]
    .map((match) => match[1])
    .filter((path, index, items) => items.indexOf(path) === index);
  const eagerHeavyAssets = assetPaths.filter((path) => /pdfjs|firebase|qpdf|tesseract/i.test(path));
  if (eagerHeavyAssets.length) failures.push(`${pagePath}: eagerly loads editor-only assets ${eagerHeavyAssets.join(", ")}.`);

  let gzipBytes = gzipSync(html).byteLength;
  for (const assetPath of assetPaths) {
    gzipBytes += gzipSync(await readFile(join(root, "dist", assetPath.replace(/^\/assets\//, "assets/")))).byteLength;
  }
  if (gzipBytes > maximumInitialGzipBytes) {
    failures.push(`${pagePath}: estimated compressed initial payload is ${(gzipBytes / 1024).toFixed(1)} KB; budget is ${maximumInitialGzipBytes / 1024} KB.`);
  }
  reports.push(`${pagePath.replace(/^dist/, "")}: ${(gzipBytes / 1024).toFixed(1)} KB gzip across HTML and ${assetPaths.length} initial assets`);
}

if (failures.length) {
  console.error(`Public performance audit failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Public mobile-loading budget passed:\n- ${reports.join("\n- ")}`);
