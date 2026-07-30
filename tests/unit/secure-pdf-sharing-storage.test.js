import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const batch = {
    delete: vi.fn(),
    commit: vi.fn(async () => {}),
  };
  return {
    batch,
    collection: vi.fn((_db, ...segments) => ({ path: segments.join("/") })),
    doc: vi.fn((_db, ...segments) => ({ path: segments.join("/") })),
    getDoc: vi.fn(),
    getDocs: vi.fn(async () => ({ docs: [] })),
    orderBy: vi.fn(),
    query: vi.fn(),
    serverTimestamp: vi.fn(() => ({ server: true })),
    setDoc: vi.fn(async () => {}),
    updateDoc: vi.fn(async () => {}),
    writeBatch: vi.fn(() => batch),
  };
});

const storageMocks = vi.hoisted(() => ({
  deleteObject: vi.fn(async () => {}),
  getBytes: vi.fn(),
  ref: vi.fn((_storage, path) => ({ fullPath: path })),
  uploadBytes: vi.fn(async () => {}),
}));

vi.mock("firebase/firestore", () => ({
  ...firestoreMocks,
  Timestamp: { fromDate: (value) => ({ value, toDate: () => value }) },
}));

vi.mock("firebase/storage", () => storageMocks);

import {
  createSecurePdfShare,
  createShareToken,
  hashShareToken,
  revokeSecurePdfShare,
} from "../../src/sharing/securePdfSharing.js";

describe("secure PDF share persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMocks.writeBatch.mockReturnValue(firestoreMocks.batch);
    firestoreMocks.getDocs.mockResolvedValue({ docs: [] });
  });

  it("stores a valid owner-scoped cloud document association without putting the capability in metadata", async () => {
    const pdfBlob = new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" });
    const result = await createSecurePdfShare({
      db: { name: "db" },
      storage: { name: "storage" },
      userId: "owner-1",
      pdfBlob,
      fileName: "Agreement.pdf",
      sourceDocumentId: `doc_${"a".repeat(24)}`,
      now: new Date("2026-07-29T12:00:00.000Z"),
    });

    const [, record] = firestoreMocks.setDoc.mock.calls[0];
    expect(record).toMatchObject({
      ownerId: "owner-1",
      sourceDocumentId: `doc_${"a".repeat(24)}`,
      fileName: "Agreement.pdf",
      status: "uploading",
    });
    expect(JSON.stringify(record)).not.toContain(result.token);
    expect(record.storagePath).toContain(result.tokenHash);
    expect(storageMocks.uploadBytes).toHaveBeenCalledOnce();
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `shareLinks/${result.tokenHash}` }),
      { status: "active" },
    );
  });

  it("omits an invalid document association", async () => {
    await createSecurePdfShare({
      db: { name: "db" },
      storage: { name: "storage" },
      userId: "owner-1",
      pdfBlob: new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }),
      fileName: "Agreement.pdf",
      sourceDocumentId: "../../another-owner",
    });

    expect(firestoreMocks.setDoc.mock.calls[0][1]).not.toHaveProperty("sourceDocumentId");
  });

  it("keeps a failed upload associated with a revoked record for trusted cleanup", async () => {
    const uploadError = new Error("storage unavailable");
    storageMocks.uploadBytes.mockRejectedValueOnce(uploadError);

    await expect(createSecurePdfShare({
      db: { name: "db" },
      storage: { name: "storage" },
      userId: "owner-1",
      pdfBlob: new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }),
      fileName: "Agreement.pdf",
    })).rejects.toBe(uploadError);

    const shareReference = firestoreMocks.setDoc.mock.calls[0][0];
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(shareReference, {
      status: "revoked",
      revokedAt: { server: true },
    });
    expect(firestoreMocks.batch.delete).not.toHaveBeenCalled();
  });

  it("revokes metadata before deleting bytes and removes only the signing record directly", async () => {
    const token = createShareToken();
    const tokenHash = await hashShareToken(token);
    firestoreMocks.getDoc.mockImplementation(async (reference) => {
      if (reference.path === `shareLinks/${tokenHash}`) {
        return {
          exists: () => true,
          data: () => ({
            ownerId: "owner-1",
            status: "active",
            storagePath: `shares/${tokenHash}/document.pdf`,
          }),
        };
      }
      if (reference.path === `signingRequests/${tokenHash}`) {
        return {
          exists: () => true,
          data: () => ({ ownerId: "owner-1" }),
        };
      }
      return { exists: () => false };
    });

    const result = await revokeSecurePdfShare({
      db: { name: "db" },
      storage: { name: "storage" },
      userId: "owner-1",
      token,
    });

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `shareLinks/${tokenHash}` }),
      { status: "revoked", revokedAt: { server: true } },
    );
    expect(firestoreMocks.updateDoc.mock.invocationCallOrder[0])
      .toBeLessThan(storageMocks.deleteObject.mock.invocationCallOrder[0]);
    expect(firestoreMocks.batch.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: `signingRequests/${tokenHash}` }),
    );
    expect(firestoreMocks.batch.delete).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: `shareLinks/${tokenHash}` }),
    );
    expect(firestoreMocks.batch.commit).toHaveBeenCalledOnce();
    expect(result).toEqual({ state: "revoked", revokeConfirmed: true });
  });

  it("keeps the share revoked and reports failure when object deletion is not confirmed", async () => {
    const token = createShareToken();
    const tokenHash = await hashShareToken(token);
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        ownerId: "owner-1",
        status: "active",
        storagePath: `shares/${tokenHash}/document.pdf`,
      }),
    });
    storageMocks.deleteObject.mockRejectedValueOnce(new Error("provider unavailable"));

    await expect(revokeSecurePdfShare({
      db: { name: "db" },
      storage: { name: "storage" },
      userId: "owner-1",
      token,
    })).rejects.toThrow("deletion was not confirmed");

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: `shareLinks/${tokenHash}` }),
      { status: "revoked", revokedAt: { server: true } },
    );
    expect(firestoreMocks.batch.commit).not.toHaveBeenCalled();
  });
});
