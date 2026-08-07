import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const policySource = readFileSync(
  new URL("../../src/pages/public/PrivacyPolicyPage.jsx", import.meta.url),
  "utf8",
);

describe("privacy policy document-storage boundaries", () => {
  it("discloses signed-in automatic sync without bulk-uploading legacy browser documents", () => {
    expect(policySource).toContain("PDFs opened while signed in automatically upload");
    expect(policySource).toContain("Existing browser-only documents are not bulk uploaded");
  });

  it("separates account storage from editable workspace data and bearer sharing", () => {
    expect(policySource).toContain("PDFEnrich does not upload the editable workspace");
    expect(policySource).toContain("This is separate from private account storage");
    expect(policySource).toContain("anyone with that unrevoked bearer link");
  });

  it("names the optional analytics providers disclosed by the implementation", () => {
    expect(policySource).toContain('disclosed: "Google Firebase and Google Analytics."');
    expect(policySource).toContain("Google Firebase Authentication, Firestore, Storage, Analytics");
  });
});
