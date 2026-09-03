import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function vercelConfiguration() {
  return JSON.parse(await readFile("vercel.json", "utf8"));
}

describe("production response headers", () => {
  it("consolidates public URLs on the apex domain and retires the sales route", async () => {
    const configuration = await vercelConfiguration();
    const wwwRedirect = configuration.redirects.find(({ has }) => has?.some(({ type, value }) => type === "host" && value === "www.pdfenrich.com"));
    const salesRedirect = configuration.redirects.find(({ source }) => source === "/contact-sales");

    expect(wwwRedirect).toMatchObject({
      source: "/:path*",
      destination: "https://pdfenrich.com/:path*",
      permanent: true,
    });
    expect(salesRedirect).toMatchObject({ destination: "/support", permanent: true });
  });

  it("permanently retires out-of-scope template and analyzer URLs", async () => {
    const configuration = await vercelConfiguration();
    const redirects = Object.fromEntries(configuration.redirects.map(({ source, destination, permanent }) => [source, { destination, permanent }]));

    expect(redirects).toMatchObject({
      "/offer-letter-templates": { destination: "/tools", permanent: true },
      "/contract-templates": { destination: "/tools", permanent: true },
      "/contract-analyzer": { destination: "/tools/document-analysis-tools", permanent: true },
      "/resume-analyzer": { destination: "/tools/document-analysis-tools", permanent: true },
    });
  });

  it("enforces a restrictive CSP and browser security boundaries", async () => {
    const configuration = await vercelConfiguration();
    const globalHeaders = configuration.headers.find(({ source }) => source === "/:path((?!__/auth/).*)")?.headers || [];
    const values = Object.fromEntries(globalHeaders.map(({ key, value }) => [key.toLowerCase(), value]));
    const scriptDirective = values["content-security-policy"]
      .split(";")
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith("script-src"));

    expect(values["content-security-policy"]).toContain("default-src 'self'");
    expect(values["content-security-policy"]).toContain("object-src 'none'");
    expect(values["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(values["content-security-policy"]).not.toContain("https://*.cloudfunctions.net");
    expect(values["content-security-policy"]).not.toContain("https://*.run.app");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
    expect(values["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
    expect(values["referrer-policy"]).toBe("no-referrer");
    expect(values["x-content-type-options"]).toBe("nosniff");
    expect(values["x-frame-options"]).toBe("DENY");
  });

  it("serves Firebase authentication callbacks from the PDFEnrich domain", async () => {
    const configuration = await vercelConfiguration();
    const rewrites = Object.fromEntries(configuration.rewrites.map(({ source, destination }) => [source, destination]));
    const authHeaders = configuration.headers.find(({ source }) => source === "/__/auth/(.*)")?.headers || [];
    const values = Object.fromEntries(authHeaders.map(({ key, value }) => [key.toLowerCase(), value]));

    expect(rewrites["/__/firebase/init.json"]).toBe("/firebase-init.json");
    expect(rewrites["/__/auth/:path*"]).toBe("https://pdf-editor-1137a.firebaseapp.com/__/auth/:path*");
    expect(values["x-frame-options"]).toBe("SAMEORIGIN");
    expect(values["content-security-policy"]).toContain("frame-ancestors 'self' https://pdfenrich.com");
  });

  it("prevents private application and bearer-link shells from being cached", async () => {
    const configuration = await vercelConfiguration();
    for (const source of ["/app/(.*)", "/login", "/signup", "/forgot-password", "/share", "/share/(.*)", "/sign", "/sign/(.*)"]) {
      const headers = configuration.headers.find((entry) => entry.source === source)?.headers || [];
      const values = Object.fromEntries(headers.map(({ key, value }) => [key.toLowerCase(), value]));
      expect(values["cache-control"], source).toContain("no-store");
      expect(values["x-robots-tag"], source).toBe("noindex, nofollow");
    }

    const rewriteSources = configuration.rewrites.map(({ source }) => source);
    expect(rewriteSources).toEqual(expect.arrayContaining(["/share", "/share/(.*)", "/sign", "/sign/(.*)"]));
  });

  it("keeps public benchmark data available without treating JSON as a search page", async () => {
    const configuration = await vercelConfiguration();
    const headers = configuration.headers.find(({ source }) => source === "/research/benchmark/(.*).json")?.headers || [];
    const values = Object.fromEntries(headers.map(({ key, value }) => [key.toLowerCase(), value]));

    expect(values["x-robots-tag"]).toBe("noindex, nofollow");
  });
});
