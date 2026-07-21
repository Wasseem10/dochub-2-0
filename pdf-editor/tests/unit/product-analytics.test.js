import { describe, expect, it } from "vitest";
import { fileSizeBucket, pageCountBucket, sanitizeAnalyticsProperties, trackProductEvent } from "../../src/analytics/productAnalytics.js";

describe("privacy-safe product analytics", () => {
  it("keeps only anonymous allow-listed properties", () => {
    expect(sanitizeAnalyticsProperties({ toolId: "edit-pdf", fileSizeBucket: "1_5mb", authMethod: "google", route: "/redact-pdf", operation: "page_load", durationBucket: "3_6s", trafficSource: "organic", referrerDomain: "google.com", landingPath: "/redact-pdf", email: "private@example.com", fileName: "secret.pdf", extractedText: "private", signature: "data", pageCountBucket: Number.NaN })).toEqual({ toolId: "edit-pdf", fileSizeBucket: "1_5mb", authMethod: "google", route: "/redact-pdf", operation: "page_load", durationBucket: "3_6s", trafficSource: "organic", referrerDomain: "google.com", landingPath: "/redact-pdf" });
    expect(trackProductEvent("not_allowed", { toolId: "edit-pdf" })).toBe(false);
    expect(trackProductEvent("pdf_downloaded", { toolId: "edit-pdf" })).toBe(true);
    expect(trackProductEvent("page_viewed", { route: "/edit-pdf", trafficSource: "organic" })).toBe(true);
  });

  it("bounds accepted strings before they are written", () => {
    expect(sanitizeAnalyticsProperties({ route: `/${"a".repeat(300)}` }).route).toHaveLength(160);
  });

  it("uses broad size and page buckets", () => {
    expect(fileSizeBucket(2 * 1024 * 1024)).toBe("1_5mb");
    expect(pageCountBucket(72)).toBe("51_100");
  });
});
