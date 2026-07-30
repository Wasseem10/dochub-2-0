import { describe, expect, it } from "vitest";
import { ANALYTICS_OWNER_CLAIM, isAnalyticsOwner } from "../../src/config/adminAccess.js";

describe("analytics owner access", () => {
  it("matches only the configured owner email", () => {
    expect(ANALYTICS_OWNER_CLAIM).toBe("pdfenrichAdmin");
    expect(isAnalyticsOwner({ isAnalyticsOwner: true })).toBe(true);
    expect(isAnalyticsOwner({ email: "wasseem700@gmail.com" })).toBe(false);
    expect(isAnalyticsOwner(null)).toBe(false);
  });
});
