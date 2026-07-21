import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";

const port = 4183;
const origin = `http://127.0.0.1:${port}`;
const basePath = process.env.GITHUB_ACTIONS === "true" ? "/dochub-2-0" : "";
const previewUrl = (path) => `${origin}${basePath}${path}`;
let preview;

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(previewUrl("/"));
      if (response.ok) return;
    } catch {
      // The preview process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Production preview did not start in time.");
}

before(async () => {
  preview = spawn("npm", ["run", "preview", "--", "--port", String(port), "--strictPort"], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
  await waitForPreview();
});

after(() => {
  preview?.kill("SIGTERM");
});

const directRoutes = [
  "/",
  "/features",
  "/pricing",
  "/business",
  "/enterprise",
  "/security",
  "/templates",
  "/developers",
  "/integrations",
  "/contact-sales",
  "/help",
  "/support",
  "/data-retention",
  "/privacy",
  "/terms",
  "/edit-pdf",
  "/annotate-pdf",
  "/pdf-reader",
  "/fill-pdf",
  "/pdf-form-filler",
  "/tools",
  "/tools/convert-from-pdf",
  "/merge-pdf",
  "/split-pdf",
  "/compress-pdf",
  "/sign-pdf",
  "/add-initials",
  "/add-date-fields",
  "/watermark-pdf",
  "/crop-pdf",
  "/compress-pdf",
  "/pdf-to-word",
  "/jpg-to-pdf",
  "/ocr-pdf",
  "/redact-pdf",
  "/ai-pdf",
  "/word-to-pdf",
  "/review-pdf",
  "/comment-on-pdf",
  "/protect-pdf",
  "/compare-pdf",
  "/request-signatures",
  "/login",
  "/signup",
  "/forgot-password",
  "/app/dashboard",
  "/app/documents",
  "/app/templates",
  "/app/signatures",
  "/app/settings",
  "/app/trash",
  "/app/editor/missing-document",
  "/share/invalid-token",
  "/sign/invalid-token",
  "/definitely-not-a-real-route",
];

for (const path of directRoutes) {
  test(`production preview serves ${path} through the SPA fallback`, async () => {
    const response = await fetch(previewUrl(path), { headers: { accept: "text/html" } });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /<title>[^<]*FixThatPDF<\/title>/);
    assert.match(html, /<div id="root">/);
  });
}

for (const [path, expectedHeading] of [
  ["/pdf-to-excel", "PDF to Excel"],
  ["/powerpoint-to-pdf", "PowerPoint to PDF"],
  ["/redact-pdf", "Redact PDF"],
]) {
  test(`prerendered ${path} contains useful content before JavaScript runs`, async () => {
    const html = await readFile(`dist${path}.html`, "utf8");
    assert.match(html, new RegExp(`<h1>[^<]*${expectedHeading}`, "i"));
    assert.match(html, /<h2>How to use/);
    assert.match(html, /Privacy, supported files, and limits/);
    assert.match(html, /application\/ld\+json/);
  });
}
