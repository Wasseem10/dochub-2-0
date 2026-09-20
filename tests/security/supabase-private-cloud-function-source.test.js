import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const edgeFunction = readFileSync(
  `${root}/supabase/functions/private-cloud/index.ts`,
  "utf8",
);
const importMap = readFileSync(
  `${root}/supabase/functions/private-cloud/deno.json`,
  "utf8",
);

describe("Supabase private-cloud PDF finalization", () => {
  it("loads Firebase identifiers from runtime configuration and verifies App Check", () => {
    expect(edgeFunction).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
    expect(edgeFunction).toContain('requiredRuntimeValue("FIREBASE_WEB_API_KEY")');
    expect(edgeFunction).toContain('requiredRuntimeValue("FIREBASE_APP_CHECK_APP_IDS")');
    expect(edgeFunction).toContain('"https://firebaseappcheck.googleapis.com/v1/jwks"');
    expect(edgeFunction).toContain('audience: FIREBASE_APP_CHECK_AUDIENCE');
    expect(edgeFunction).toContain('protectedHeader.typ !== "JWT"');
    expect(edgeFunction).toContain("await verifyFirebaseAppCheck(request);");
  });

  it("allows the deployed PDFEnrich Sites origin to list and open private PDFs", () => {
    expect(edgeFunction).toContain('"https://realpdf-workspace.wasseem10.chatgpt.site"');
    expect(edgeFunction).toContain('if (request.method === "OPTIONS")');
    expect(edgeFunction).toContain('headers["Access-Control-Allow-Origin"] = origin;');
    expect(edgeFunction).toMatch(
      /\/v1\\\/documents\\\/\(doc_\[A-Za-z0-9_-\]\{24\}\)\\\/download/,
    );
  });

  it("parses the PDF page tree instead of rejecting compressed object streams", () => {
    expect(importMap).toContain('"pdf-lib": "npm:pdf-lib@1.17.1"');
    expect(edgeFunction).toContain('import { EncryptedPDFError, PDFDocument } from "pdf-lib";');
    expect(edgeFunction).toContain("const document = await PDFDocument.load(bytes");
    expect(edgeFunction).toContain("pageCount = document.getPageCount();");
    expect(edgeFunction).not.toContain("text.matchAll(/\\/Type\\s*\\/Page\\b/g)");
  });

  it("allows the same client operation to replace a terminal failed upload", () => {
    expect(edgeFunction).toContain('if (replay?.state === "failed")');
    expect(edgeFunction).toMatch(
      /from\("private_cloud_upload_intents"\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\("state", "failed"\)/,
    );
  });
});
