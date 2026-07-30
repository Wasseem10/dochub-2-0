import { describe, expect, it, vi } from "vitest";
import {
  createShareToken,
  hashShareToken,
  isShareRecordAccessible,
  isValidShareToken,
  isValidShareTokenHash,
  normalizeShareSourceDocumentId,
  normalizeExpirationDays,
  secureShareStoragePath,
  shareTokenFromLocation,
} from "../../src/sharing/securePdfSharing.js";

describe("secure PDF sharing", () => {
  it("creates a 192-bit URL-safe token and keeps only its SHA-256 identifier in storage paths", async () => {
    const getRandomValues = vi.fn((bytes) => {
      bytes.forEach((_, index) => { bytes[index] = index; });
      return bytes;
    });
    const token = createShareToken({ getRandomValues });
    expect(getRandomValues).toHaveBeenCalledOnce();
    expect(token).toHaveLength(32);
    expect(isValidShareToken(token)).toBe(true);
    expect(isValidShareToken("short-token")).toBe(false);
    const tokenHash = await hashShareToken(token);
    expect(isValidShareTokenHash(tokenHash)).toBe(true);
    expect(secureShareStoragePath(tokenHash)).toBe(`shares/${tokenHash}/document.pdf`);
    expect(secureShareStoragePath(tokenHash)).not.toContain(token);
  });

  it("reads current bearer tokens from the fragment and recognizes legacy path links", () => {
    const token = createShareToken();
    expect(shareTokenFromLocation({ pathname: "/share", hash: `#token=${token}` })).toEqual({
      token,
      legacyPath: false,
    });
    expect(shareTokenFromLocation({ pathname: `/share/${token}`, hash: "" })).toEqual({
      token,
      legacyPath: true,
    });
  });

  it("uses only supported expiration windows", () => {
    expect(normalizeExpirationDays(1)).toBe(1);
    expect(normalizeExpirationDays("30")).toBe(30);
    expect(normalizeExpirationDays(365)).toBe(7);
  });

  it("associates shares only with bounded server document identifiers", () => {
    const sourceDocumentId = `doc_${"a".repeat(24)}`;
    expect(normalizeShareSourceDocumentId(` ${sourceDocumentId} `)).toBe(sourceDocumentId);
    expect(normalizeShareSourceDocumentId("doc_12345678")).toBe("");
    expect(normalizeShareSourceDocumentId("../another-user/document")).toBe("");
    expect(normalizeShareSourceDocumentId("short")).toBe("");
    expect(normalizeShareSourceDocumentId("x".repeat(129))).toBe("");
  });

  it("rejects revoked and expired records", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    const active = { status: "active", chunkCount: 2, expiresAt: { toDate: () => new Date("2026-07-21T12:00:00.000Z") } };
    expect(isShareRecordAccessible(active, now)).toBe(true);
    expect(isShareRecordAccessible({ ...active, status: "revoked" }, now)).toBe(false);
    expect(isShareRecordAccessible({ ...active, expiresAt: { toDate: () => new Date("2026-07-19T12:00:00.000Z") } }, now)).toBe(false);
  });
});
