import { describe, expect, it, vi } from "vitest";
import { createShareToken, isShareRecordAccessible, isValidShareToken, normalizeExpirationDays } from "../../src/sharing/securePdfSharing.js";

describe("secure PDF sharing", () => {
  it("creates a 192-bit URL-safe token", () => {
    const getRandomValues = vi.fn((bytes) => {
      bytes.forEach((_, index) => { bytes[index] = index; });
      return bytes;
    });
    const token = createShareToken({ getRandomValues });
    expect(getRandomValues).toHaveBeenCalledOnce();
    expect(token).toHaveLength(32);
    expect(isValidShareToken(token)).toBe(true);
    expect(isValidShareToken("short-token")).toBe(false);
  });

  it("uses only supported expiration windows", () => {
    expect(normalizeExpirationDays(1)).toBe(1);
    expect(normalizeExpirationDays("30")).toBe(30);
    expect(normalizeExpirationDays(365)).toBe(7);
  });

  it("rejects revoked and expired records", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    const active = { status: "active", chunkCount: 2, expiresAt: { toDate: () => new Date("2026-07-21T12:00:00.000Z") } };
    expect(isShareRecordAccessible(active, now)).toBe(true);
    expect(isShareRecordAccessible({ ...active, status: "revoked" }, now)).toBe(false);
    expect(isShareRecordAccessible({ ...active, expiresAt: { toDate: () => new Date("2026-07-19T12:00:00.000Z") } }, now)).toBe(false);
  });
});
