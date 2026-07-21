import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "../../scripts/site-url.mjs";

describe("SEO site URL resolution", () => {
  it("uses an explicit canonical URL when configured", () => {
    expect(resolveSiteUrl({ SITE_URL: "https://example.com/" })).toBe("https://example.com");
  });

  it("normalizes the Vercel production domain", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "example.vercel.app" })).toBe("https://example.vercel.app");
  });

  it("never falls back to localhost for a production build", () => {
    expect(resolveSiteUrl({})).toBe("https://dochub-2-0.vercel.app");
  });
});
