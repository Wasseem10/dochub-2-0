import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const firebaseMocks = vi.hoisted(() => ({
  getAppCheckToken: vi.fn(async () => ({ token: "verified-app-check-token" })),
  getIdToken: vi.fn(async () => "verified-id-token"),
}));

vi.mock("../../src/firebase.js", () => ({
  appCheck: { name: "app-check" },
  auth: {
    currentUser: {
      uid: "firebase-user-a",
      getIdToken: firebaseMocks.getIdToken,
    },
  },
}));

vi.mock("firebase/app-check", () => ({
  getToken: firebaseMocks.getAppCheckToken,
}));

const apiBase = "https://udtddtoghuuazlczgkuf.supabase.co/functions/v1/private-cloud";
const documentId = `doc_${"A".repeat(24)}`;
const versionId = `ver_${"B".repeat(24)}`;
const uploadId = "c".repeat(64);
const idempotencyKey = "upload-attempt-00000004";

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(async () => payload),
  };
}

async function loadConfiguredClient() {
  vi.resetModules();
  vi.stubEnv("VITE_PRIVATE_CLOUD_API_BASE_URL", apiBase);
  return import("../../src/cloud/privateCloudDocuments.js");
}

beforeEach(() => {
  firebaseMocks.getAppCheckToken.mockClear();
  firebaseMocks.getIdToken.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  delete globalThis.XMLHttpRequest;
  delete globalThis.fetch;
});

describe("private cloud save terminal-state contract", () => {
  it("uploads through the server-issued private Supabase URL before finalization", async () => {
    const cloud = await loadConfiguredClient();
    const blob = new Blob(["%PDF-1.7\n1 0 obj<</Type /Page>>endobj\n%%EOF\n"], {
      type: "application/pdf",
    });
    const checksumSha256 = await cloud.sha256Hex(blob);
    const signedUrl = "https://udtddtoghuuazlczgkuf.supabase.co/storage/v1/object/upload/sign/pdfenrich-private-documents/users/test/document.pdf?token=signed-upload-token";
    const requests = [];
    globalThis.XMLHttpRequest = class FakeXmlHttpRequest {
      constructor() {
        this.headers = {};
        this.status = 0;
        this.upload = {};
        requests.push(this);
      }

      open(method, url) {
        this.method = method;
        this.url = url;
      }

      setRequestHeader(name, value) {
        this.headers[name] = value;
      }

      send(body) {
        this.body = body;
        queueMicrotask(() => {
          this.status = 200;
          this.onload?.();
          this.onloadend?.();
        });
      }
    };
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        state: "uploading",
        uploadId,
        documentId,
        versionId,
        uploadSessionUrl: signedUrl,
      }, 201))
      .mockResolvedValueOnce(jsonResponse({
        state: "active",
        verified: true,
        documentId,
        versionId,
        sizeBytes: blob.size,
        checksumSha256,
        updatedAt: "2026-08-04T02:00:00.000Z",
      }));

    await expect(cloud.savePrivateCloudPdf({
      blob,
      fileName: "document.pdf",
      checksumSha256,
      idempotencyKey,
    })).resolves.toMatchObject({ state: "active", verified: true });

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      method: "PUT",
      url: signedUrl,
      headers: { "Content-Type": "application/pdf" },
      body: blob,
    });
    expect(requests[0].headers).not.toHaveProperty("Content-Range");
    expect(globalThis.fetch.mock.calls[1][0]).toBe(
      `${apiBase}/v1/documents/uploads/${uploadId}/finalize`,
    );
  });

  it("finalizes an already-uploaded retry without starting a second byte upload", async () => {
    const cloud = await loadConfiguredClient();
    const blob = new Blob(["%PDF-1.7\n%%EOF\n"], { type: "application/pdf" });
    const checksumSha256 = await cloud.sha256Hex(blob);
    const xmlHttpRequest = vi.fn(() => {
      throw new Error("XHR must not be used for ready_to_finalize.");
    });
    globalThis.XMLHttpRequest = xmlHttpRequest;
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        state: "ready_to_finalize",
        uploadId,
        documentId,
        versionId,
      }, 200))
      .mockResolvedValueOnce(jsonResponse({
        state: "active",
        verified: true,
        documentId,
        versionId,
        sizeBytes: blob.size,
        checksumSha256,
        updatedAt: "2026-07-29T12:00:00.000Z",
      }, 200));

    const result = await cloud.savePrivateCloudPdf({
      blob,
      fileName: "document.pdf",
      checksumSha256,
      idempotencyKey,
    });

    expect(xmlHttpRequest).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[0]).toEqual([
      `${apiBase}/v1/documents/uploads`,
      expect.objectContaining({
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        headers: expect.objectContaining({
          Authorization: "Bearer verified-id-token",
          "X-Firebase-AppCheck": "verified-app-check-token",
          "Idempotency-Key": idempotencyKey,
        }),
        body: JSON.stringify({
          fileName: "document.pdf",
          sizeBytes: blob.size,
          contentType: "application/pdf",
          checksumSha256,
        }),
      }),
    ]);
    expect(globalThis.fetch.mock.calls[1][0]).toBe(
      `${apiBase}/v1/documents/uploads/${uploadId}/finalize`,
    );
    expect(result).toMatchObject({
      state: "active",
      verified: true,
      documentId,
      versionId,
      checksumSha256,
      idempotencyKey,
    });
  });

  it("accepts a verified active replay after a lost finalization response", async () => {
    const cloud = await loadConfiguredClient();
    const blob = new Blob(["%PDF-1.7\n%%EOF\n"], { type: "application/pdf" });
    const checksumSha256 = await cloud.sha256Hex(blob);
    globalThis.fetch = vi.fn(async () => jsonResponse({
      state: "active",
      verified: true,
      documentId,
      versionId,
      sizeBytes: blob.size,
      checksumSha256,
      updatedAt: "2026-07-29T12:00:00.000Z",
    }));

    await expect(cloud.savePrivateCloudPdf({
      blob,
      fileName: "document.pdf",
      checksumSha256,
      idempotencyKey,
    })).resolves.toMatchObject({
      state: "active",
      verified: true,
      idempotencyKey,
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ state: "active", verified: false }, "save_unconfirmed"],
    [{ state: "active", verified: true, sizeBytes: 1 }, "save_unconfirmed"],
    [{ state: "uploading", uploadId: "client-chosen-path" }, "upload_session_unconfirmed"],
  ])("fails closed for an unverified server success %#", async (serverResult, code) => {
    const cloud = await loadConfiguredClient();
    const blob = new Blob(["%PDF-1.7\n%%EOF\n"], { type: "application/pdf" });
    const checksumSha256 = await cloud.sha256Hex(blob);
    globalThis.fetch = vi.fn(async () => jsonResponse({
      documentId,
      versionId,
      checksumSha256,
      ...serverResult,
    }));

    await expect(cloud.savePrivateCloudPdf({
      blob,
      fileName: "document.pdf",
      checksumSha256,
      idempotencyKey,
    })).rejects.toMatchObject({ code });
  });
});

describe("private cloud destructive-operation confirmations", () => {
  it("rejects ambiguous document deletion responses", async () => {
    const cloud = await loadConfiguredClient();
    globalThis.fetch = vi.fn(async () => jsonResponse({
      documentId,
      state: "deleted",
      deleteConfirmed: false,
    }));
    await expect(cloud.removePrivateCloudDocument(documentId, {
      permanent: true,
    })).rejects.toMatchObject({ code: "delete_unconfirmed" });
  });

  it("rejects ambiguous account purge responses", async () => {
    const cloud = await loadConfiguredClient();
    globalThis.fetch = vi.fn(async () => jsonResponse({
      state: "queued",
      purgeConfirmed: false,
    }));
    await expect(cloud.deletePrivateCloudAccountData()).rejects.toMatchObject({
      code: "account_purge_unconfirmed",
    });
  });

  it("rejects a disguised non-PDF download from the authenticated backend", async () => {
    const cloud = await loadConfiguredClient();
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      blob: vi.fn(async () => new Blob(
        ["<html>not a pdf</html>"],
        { type: "application/pdf" },
      )),
    }));
    await expect(cloud.downloadPrivateCloudPdf(documentId)).rejects.toMatchObject({
      code: "download_unconfirmed",
    });
  });
});
