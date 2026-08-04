import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function vercelConfiguration() {
  return JSON.parse(await readFile("vercel.json", "utf8"));
}

describe("production response headers", () => {
  it("enforces a restrictive CSP and browser security boundaries", async () => {
    const configuration = await vercelConfiguration();
    const globalHeaderRule = configuration.headers.find(({ source }) => source.includes("(?!__/auth/)"));
    const globalHeaders = globalHeaderRule?.headers || [];
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
    expect(globalHeaderRule?.source).toContain("(?!__/auth/)");
  });

  it("proxies the Firebase auth helper through the production origin", async () => {
    const configuration = await vercelConfiguration();
    const authRewrite = configuration.rewrites.find(({ source }) => source === "/__/auth/:path*");
    const firebaseInitRewrite = configuration.rewrites.find(({ source }) => source === "/__/firebase/init.json");
    const authHeaders = configuration.headers.find(({ source }) => source === "/__/auth/(.*)")?.headers || [];
    const values = Object.fromEntries(authHeaders.map(({ key, value }) => [key.toLowerCase(), value]));

    expect(authRewrite?.destination).toBe("https://pdf-editor-1137a.firebaseapp.com/__/auth/:path*");
    expect(firebaseInitRewrite?.destination).toBe("/firebase-init.json");
    expect(values["content-security-policy"]).toContain("frame-ancestors 'self' https://pdfenrich.com");
    expect(values["content-security-policy"]).toContain("https://www.pdfenrich.com");
    expect(values["x-frame-options"]).toBe("SAMEORIGIN");
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
});
