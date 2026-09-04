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
  preview = spawn(process.execPath, ["./node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
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
  "/resources",
  "/research/pdf-conversion-benchmark",
  "/guides/redact-pdf-safely",
  "/guides/ocr-quality",
  "/guides/how-to-edit-a-pdf",
  "/guides/compress-pdf-without-losing-quality",
  "/guides/how-to-combine-pdf-files",
  "/guides/how-to-fill-and-sign-pdf",
  "/guides/pdf-to-word-formatting",
  "/guides/edit-pdf-on-iphone",
  "/guides/edit-scanned-pdf",
  "/guides/compress-pdf-to-1mb",
  "/guides/compress-pdf-for-email",
  "/guides/combine-pdf-files-on-mac",
  "/guides/sign-pdf-on-android",
  "/guides/fill-pdf-without-adobe",
  "/guides/convert-pdf-to-word-without-losing-formatting",
  "/guides/remove-pages-from-pdf",
  "/guides/rotate-pdf-and-save",
  "/research/pdf-email-attachment-size-study",
  "/workflows/education-pdf-workflow",
  "/workflows/recruiting-pdf-workflow",
  "/workflows/legal-operations-pdf-workflow",
  "/workflows/real-estate-pdf-workflow",
  "/workflows/small-business-pdf-workflow",
  "/architecture",
  "/uptime",
  "/incident-history",
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
    assert.match(html, /<title>[^<]*PDFEnrich<\/title>/);
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

for (const [path, expectedHeading, expectedDetail] of [
  ["/research/pdf-conversion-benchmark", "reproducible benchmark", "Simple searchable PDF"],
  ["/guides/redact-pdf-safely", "prove sensitive text is gone", "Extraction proof"],
  ["/guides/ocr-quality", "Choose OCR settings", "Recommended OCR approach"],
  ["/guides/how-to-edit-a-pdf", "edit a PDF online", "outdated date"],
  ["/guides/compress-pdf-without-losing-quality", "compress a PDF", "image-heavy PDF"],
  ["/guides/how-to-combine-pdf-files", "combine PDF files", "supporting letter"],
  ["/guides/how-to-fill-and-sign-pdf", "fill and sign a PDF", "typed signature"],
  ["/guides/pdf-to-word-formatting", "convert PDF to Word", "visual-fidelity fallback"],
  ["/guides/edit-pdf-on-iphone", "edit a PDF on iPhone", "Files app"],
  ["/guides/edit-scanned-pdf", "edit a scanned PDF", "Run OCR"],
  ["/guides/compress-pdf-to-1mb", "compress a PDF to 1 MB", "1,048,576 bytes"],
  ["/guides/compress-pdf-for-email", "compress a PDF for email", "Base64"],
  ["/guides/combine-pdf-files-on-mac", "combine PDF files on a Mac", "Finder"],
  ["/guides/sign-pdf-on-android", "sign a PDF on Android", "touch placement"],
  ["/guides/fill-pdf-without-adobe", "fill out a PDF without Adobe", "interactive AcroForm field"],
  ["/guides/convert-pdf-to-word-without-losing-formatting", "convert PDF to Word without losing formatting", "visual-fidelity"],
  ["/guides/remove-pages-from-pdf", "remove pages from a PDF", "page count"],
  ["/guides/rotate-pdf-and-save", "rotate a PDF", "permanent fix"],
  ["/research/pdf-email-attachment-size-study", "email encoding", "RFC 4648"],
  ["/architecture", "How PDFEnrich processes documents", "Local document processing"],
]) {
  test(`prerendered resource ${path} publishes accountable original content`, async () => {
    const html = await readFile(`dist${path}.html`, "utf8");
    assert.match(html, new RegExp(expectedHeading, "i"));
    assert.match(html, new RegExp(expectedDetail, "i"));
    assert.match(html, /PDFEnrich Product Engineering/);
    assert.match(html, /"dateModified":"\d{4}-\d{2}-\d{2}T00:00:00Z"/);
    assert.match(html, /"datePublished":"\d{4}-\d{2}-\d{2}T00:00:00Z"/);
    assert.match(html, /"image":"https:\/\/pdfenrich\.com\/share\//);
    assert.match(html, /og:image:width" content="1200"/);
    assert.match(html, /application\/ld\+json/);
  });
}
