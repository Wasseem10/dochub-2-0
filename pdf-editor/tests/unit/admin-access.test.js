import { describe, expect, it } from "vitest";
import { ANALYTICS_OWNER_EMAIL, isAnalyticsOwner } from "../../src/config/adminAccess.js";

describe("analytics owner access", () => {
  it("matches only the configured owner email", () => {
    expect(ANALYTICS_OWNER_EMAIL).toBe("wasseem700@gmail.com");
    expect(isAnalyticsOwner({ email: "WASSEEM700@gmail.com" })).toBe(true);
    expect(isAnalyticsOwner({ email: "other@example.com" })).toBe(false);
    expect(isAnalyticsOwner(null)).toBe(false);
  });
});
