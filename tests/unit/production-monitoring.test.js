import { describe, expect, it } from "vitest";
import { diagnosticCategory, durationBucket, redactedErrorDetails } from "../../src/monitoring/productionMonitoring.js";

describe("privacy-safe production monitoring", () => {
  it("reduces raw failures to broad categories", () => {
    expect(diagnosticCategory("FirebaseError: permission-denied for secret.pdf")).toBe("firebase");
    expect(diagnosticCategory("PDF worker crashed while parsing private text")).toBe("pdf_processing");
    expect(diagnosticCategory("TypeError with a user-entered value")).toBe("client_runtime");
  });

  it("buckets timings instead of storing exact traces", () => {
    expect(durationBucket(1200)).toBe("under_1_5s");
    expect(durationBucket(4200)).toBe("3_6s");
    expect(durationBucket(9000)).toBe("over_6s");
  });

  it("retains only bounded diagnostic identifiers and never an error message", () => {
    const details = redactedErrorDetails({
      name: "Firebase Error <private.pdf>",
      code: "storage/permission-denied",
      message: "Upload failed for private.pdf with token secret-token",
      stack: "private document text",
    });

    expect(details).toEqual({
      category: "firebase",
      name: "FirebaseErrorprivate.pdf",
      code: "storage/permission-denied",
    });
    expect(JSON.stringify(details)).not.toContain("secret-token");
    expect(JSON.stringify(details)).not.toContain("private document text");
  });
});
