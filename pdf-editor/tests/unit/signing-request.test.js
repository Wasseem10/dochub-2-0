import { describe, expect, it } from "vitest";
import {
  createSigningRequestPayload,
  createSigningRequestUrl,
  decodeSigningRequestPayload,
  encodeSigningRequestPayload,
} from "../../src/signing/signingRequest.js";
import {
  createSignatureInvitationUrl,
  hasVerifiedSigningIdentity,
  planSignatureRequestAdvance,
  sha256Hex,
  signatureInvitationFromLocation,
  signatureSubmissionStoragePath,
  signatureRequestStoragePath,
} from "../../src/signing/signatureRequestStore.js";

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
    const url = createSigningRequestUrl({ origin: "https://fixthatpdf.example/", token: "abc_123", payload: request });
    expect(url).toMatch(/^https:\/\/fixthatpdf\.example\/sign\/abc_123#request=/);
    expect(url).not.toContain("Jordan@example.com");
  });

  it("rejects requests without a valid recipient or fields", () => {
    expect(() => createSigningRequestPayload({ ...request, recipient: { email: "invalid" } })).toThrow(/valid recipient/);
    expect(() => createSigningRequestPayload({ ...request, fields: [] })).toThrow(/at least one field/);
  });
});

describe("ordered cloud signature invitations", () => {
  const requestId = "a".repeat(32);
  const inviteId = "b".repeat(32);

  it("keeps the recipient invite secret in the URL fragment", () => {
    const url = createSignatureInvitationUrl({ origin: "https://fixthatpdf.example/", requestId, inviteId });
    expect(url).toBe(`https://fixthatpdf.example/sign/${requestId}#invite=${inviteId}`);
    expect(signatureInvitationFromLocation(new URL(url))).toEqual({ requestId, inviteId });
    expect(signatureRequestStoragePath(requestId)).toBe(`signatureRequests/${requestId}/current.pdf`);
    expect(signatureSubmissionStoragePath(requestId, inviteId)).toBe(`signatureRequests/${requestId}/submissions/${inviteId}`);
  });

  it("requires the matching Google-backed account for signer identity", () => {
    expect(hasVerifiedSigningIdentity({ uid: "user", email: "signer@example.com", providers: ["google.com"] }, "signer@example.com")).toBe(true);
    expect(hasVerifiedSigningIdentity({ uid: "user", email: "other@example.com", providers: ["google.com"] }, "signer@example.com")).toBe(false);
    expect(hasVerifiedSigningIdentity({ uid: "user", email: "signer@example.com", providers: ["password"] }, "signer@example.com")).toBe(false);
  });

  it("creates stable SHA-256 fingerprints for the audit chain", async () => {
    expect(await sha256Hex(new TextEncoder().encode("FixThatPDF"))).toBe("f58f26f42ac3d93fc0dd9eb232af96c5cdf188490271aabe569c910ebd0ff7b4");
  });

  it("advances only to the next ordered recipient and closes the final step", () => {
    const fingerprint = "c".repeat(64);
    const next = planSignatureRequestAdvance({
      request: { currentInviteId: inviteId },
      recipient: { inviteId, status: "active", order: 0, nextInviteId: "d".repeat(32), nextEmail: "next@example.com", nextOrder: 1 },
      outputFingerprint: fingerprint,
      size: 42000,
    });
    expect(next).toMatchObject({ completed: false, rootPatch: { currentOrder: 1, currentRecipientEmail: "next@example.com", currentFingerprint: fingerprint } });

    const final = planSignatureRequestAdvance({
      request: { currentInviteId: inviteId },
      recipient: { inviteId, status: "active", order: 1, nextInviteId: "", nextEmail: "", nextOrder: -1 },
      outputFingerprint: fingerprint,
      size: 43000,
    });
    expect(final).toMatchObject({ completed: true, rootPatch: { status: "completed", finalFingerprint: fingerprint } });
  });
});
