import { describe, expect, it } from "vitest";
import {
  createSigningRequestPayload,
  createSigningRequestUrl,
  decodeSigningRequestPayload,
  encodeSigningRequestPayload,
} from "../../src/signing/signingRequest.js";

const request = {
  requestId: "request-123",
  recipient: { name: "Jordan Lee", email: "Jordan@example.com" },
  requester: { name: "Alex", email: "alex@example.com" },
  message: "Please sign this agreement.",
  createdAt: new Date("2026-07-22T12:00:00.000Z"),
  expiresAt: new Date("2026-07-29T12:00:00.000Z"),
  fields: [{ id: "signature-1", page: 0, x: 0.2, y: 0.7, w: 0.3, h: 0.08, type: "signature", label: "Client signature", required: true }],
};

describe("secure signing request payloads", () => {
  it("round-trips bounded field metadata without PDF contents", () => {
    const encoded = encodeSigningRequestPayload(request);
    const decoded = decodeSigningRequestPayload(encoded);
    expect(decoded).toMatchObject({
      requestId: "request-123",
      recipient: { name: "Jordan Lee", email: "jordan@example.com" },
      fields: [{ id: "signature-1", type: "signature", label: "Client signature", required: true }],
    });
    expect(encoded).not.toContain("Please sign");
  });

  it("creates a signer route with metadata in the URL fragment", () => {
    const url = createSigningRequestUrl({ origin: "https://pdfarrow.example/", token: "abc_123", payload: request });
    expect(url).toMatch(/^https:\/\/pdfarrow\.example\/sign\/abc_123#request=/);
    expect(url).not.toContain("Jordan@example.com");
  });

  it("rejects requests without a valid recipient or fields", () => {
    expect(() => createSigningRequestPayload({ ...request, recipient: { email: "invalid" } })).toThrow(/valid recipient/);
    expect(() => createSigningRequestPayload({ ...request, fields: [] })).toThrow(/at least one field/);
  });
});
