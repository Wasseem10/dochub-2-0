import { describe, expect, it } from "vitest";
import { privacySafeRoute } from "../../src/privacy/privacySafeRoute.js";

describe("privacy-safe route labels", () => {
  it("replaces bearer tokens and document IDs with stable route templates", () => {
    expect(privacySafeRoute("/share/secret-share-token")).toBe("/share/:token");
    expect(privacySafeRoute("/sign/secret-signing-token")).toBe("/sign/:token");
    expect(privacySafeRoute("/app/editor/document-private-123")).toBe("/app/editor/:documentId");
  });

  it("strips query strings, fragments, controls, and bounds ordinary routes", () => {
    expect(privacySafeRoute("https://pdfenrich.com/edit-pdf?document=private-id#page=2")).toBe("/edit-pdf");
    expect(privacySafeRoute("/tools/\u0000edit-pdf")).toBe("/tools/edit-pdf");
    expect(privacySafeRoute("/tools/%00%1F%7fedit-pdf")).toBe("/tools/edit-pdf");
    expect(privacySafeRoute(`/${"a".repeat(300)}`)).toHaveLength(160);
  });
});
