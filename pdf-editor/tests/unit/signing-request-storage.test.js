import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((_db, ...segments) => ({ path: segments.join("/") })),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ server: true })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
}));

vi.mock("firebase/firestore", () => ({
  ...firestoreMocks,
  Timestamp: { fromDate: (value) => ({ value, toDate: () => value }) },
}));

import { createShareToken, hashShareToken } from "../../src/sharing/securePdfSharing.js";
import { storeSigningRequest } from "../../src/signing/signingRequest.js";

describe("protected signing request storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes personal request details under the capability hash and never stores the raw capability", async () => {
    const token = createShareToken();
    const tokenHash = await hashShareToken(token);
    const createdAt = new Date("2026-07-29T12:00:00.000Z");
    const expiresAt = new Date("2026-08-05T12:00:00.000Z");

    await storeSigningRequest({
      db: { name: "db" },
      userId: "owner-1",
      token,
      payload: {
        recipient: { name: "Jordan Lee", email: "Jordan@example.com" },
        requester: { name: "Alex", email: "alex@example.com" },
        message: "Please sign this agreement.",
        createdAt,
        expiresAt,
        fields: [{
          id: "signature-1",
          page: 0,
          x: 0.2,
          y: 0.7,
          w: 0.3,
          h: 0.08,
          type: "signature",
          label: "Client signature",
          required: true,
        }],
      },
    });

    const [reference, record] = firestoreMocks.setDoc.mock.calls[0];
    expect(reference.path).toBe(`signingRequests/${tokenHash}`);
    expect(record).toMatchObject({
      ownerId: "owner-1",
      recipient: { name: "Jordan Lee", email: "jordan@example.com" },
      requester: { name: "Alex", email: "alex@example.com" },
      status: "active",
    });
    expect(record.requestId).toBe(`request-${tokenHash.slice(0, 16)}`);
    expect(JSON.stringify(record)).not.toContain(token);
  });
});
