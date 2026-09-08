import { describe, expect, it } from "vitest";
import { TOOL_BY_ID } from "../../src/tools/toolRegistry.js";
import { HOMEPAGE_DESCRIPTION } from "../../src/seo/homepageMetadata.js";
import { EDITORIAL_RESOURCE_PAGES } from "../../src/editorial/editorialResources.js";
import { publicPageLastModified } from "../../src/seo/publicFreshness.js";

describe("task-focused search copy", () => {
  it.each(["edit-pdf", "compress-pdf", "merge-pdf"])("keeps %s metadata concise, free, and specific", (id) => {
    const tool = TOOL_BY_ID.get(id);
    expect(tool.status).toBe("available");
    expect(tool.metaDescription.length).toBeLessThanOrEqual(160);
    expect(tool.metaDescription).toMatch(/free/i);
    expect(tool.metaDescription).toMatch(/no signup/i);
    expect(tool.metaDescription).toMatch(/watermark/i);
    expect(tool.metaDescription).not.toContain("Free online tool.");
    expect(new URL(tool.canonicalUrl, "https://pdfenrich.com").href).toBe(`https://pdfenrich.com/${id}`);
    expect(tool.supportGuide.path).toMatch(/^\/guides\//);
  });

  it("does not imply every compression mode is lossless or guarantees a target size", () => {
    const compress = TOOL_BY_ID.get("compress-pdf");
    expect(compress.heroHeadline).toMatch(/email and uploads/);
    expect(compress.heroSubheadline).toContain("savings depend on your PDF");
    expect(compress.longDescription).toContain("flattens pages");
    expect(compress.heroHeadline).not.toMatch(/without flattening|without losing quality|to 1 ?MB/i);
  });

  it("connects homepage and guide discovery to practical PDF tasks", () => {
    expect(HOMEPAGE_DESCRIPTION).toContain("compress");
    expect(HOMEPAGE_DESCRIPTION.length).toBeLessThanOrEqual(160);
    const resources = EDITORIAL_RESOURCE_PAGES.find(({ id }) => id === "resources");
    expect(resources.title).toContain("edit, compress, merge, and sign");
    expect(resources.related.some(({ path }) => path === "/guides/compress-pdf-for-email")).toBe(true);
  });

  it("dates only the changed pages without refreshing unrelated routes", () => {
    for (const route of ["/", "/resources", "/edit-pdf", "/compress-pdf", "/merge-pdf"]) {
      expect(publicPageLastModified(route)).toBe("2026-09-08");
    }
    expect(publicPageLastModified("/split-pdf")).toBe("2026-07-29");
  });
});
