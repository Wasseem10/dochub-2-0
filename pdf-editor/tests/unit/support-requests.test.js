import { describe, expect, it } from "vitest";
import { validateSupportRequest } from "../../src/support/supportRequests.js";

describe("support request validation", () => {
  it("accepts a bounded support request", () => {
    expect(validateSupportRequest({ name: "Ada", email: "ADA@example.com", category: "bug", message: "The download button stopped responding." })).toEqual({ ok: true, value: { name: "Ada", email: "ada@example.com", category: "bug", message: "The download button stopped responding." } });
  });

  it("rejects invalid contact details and oversized content", () => {
    expect(validateSupportRequest({ name: "A", email: "bad", category: "bug", message: "short" }).ok).toBe(false);
    expect(validateSupportRequest({ name: "Ada", email: "ada@example.com", category: "unknown", message: "A sufficiently detailed request." }).ok).toBe(false);
  });
});
