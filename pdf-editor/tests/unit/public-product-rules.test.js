import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { TOOL_REGISTRY } from "../../src/tools/toolRegistry.js";

describe("public free-product rules", () => {
  it("uses the required free homepage promise without fabricated marketing", async () => {
    const source = await readFile("src/LatticePdfLanding.jsx", "utf8");
    expect(source).toContain("Edit PDFs online.");
    expect(source).toContain("Completely free.");
    expect(source).toContain("No signup for core tools");
    expect(source).toContain("No watermark");
    expect(source).not.toMatch(/testimonial|Customers|Contact sales|PDFs \+ AI/i);
  });

  it("keeps coming-soon tools out of popular tools and indexable sitemap generation", async () => {
    const sitemapScript = await readFile("scripts/generate-tool-sitemap.mjs", "utf8");
    expect(sitemapScript).toContain('status !== "coming-soon"');
    expect(TOOL_REGISTRY.filter((tool) => tool.status === "coming-soon").every((tool) => !tool.uploadEnabled)).toBe(true);
  });

  it("keeps the public homepage outside the heavy editor lazy route", async () => {
    const routerSource = await readFile("src/router/AppRouter.jsx", "utf8");
    const mainSource = await readFile("src/main.jsx", "utf8");
    expect(routerSource).toContain('{ path: ROUTE_PATHS.home, element: <HomePage /> }');
    expect(mainSource).not.toMatch(/pdfjs|pdf-lib|firebase|styles\.css|editor-overrides/);
  });
});
