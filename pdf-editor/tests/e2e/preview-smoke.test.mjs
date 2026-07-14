import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const port = 4183;
const origin = `http://127.0.0.1:${port}`;
let preview;

async function waitForPreview() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(origin);
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
  "/privacy",
  "/terms",
  "/edit-pdf",
  "/tools",
  "/merge-pdf",
  "/split-pdf",
  "/compress-pdf",
  "/sign-pdf",
  "/pdf-to-word",
  "/jpg-to-pdf",
  "/ocr-pdf",
  "/redact-pdf",
  "/ai-pdf",
  "/word-to-pdf",
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
    const response = await fetch(`${origin}${path}`, { headers: { accept: "text/html" } });
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /<title>RealPDF/);
    assert.match(html, /<div id="root"><\/div>/);
  });
}
