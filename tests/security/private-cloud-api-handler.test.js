import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPrivateCloudApiHandler } from "../../functions/src/index.js";
import { PrivateCloudSecurityError } from "../../functions/src/security/privateCloudDocumentService.js";

const requireFromFunctions = createRequire(
  new URL("../../functions/package.json", import.meta.url),
);
const { logger } = requireFromFunctions("firebase-functions");
const origin = "https://pdfenrich.com";
const userA = "firebase-user-a";
const userB = "firebase-user-b";
const documentA = `doc_${"A".repeat(24)}`;
const documentB = `doc_${"B".repeat(24)}`;
const versionB = `ver_${"C".repeat(24)}`;
const checksum = "a".repeat(64);

beforeEach(() => {
  vi.spyOn(logger, "info").mockImplementation(() => {});
  vi.spyOn(logger, "warn").mockImplementation(() => {});
  vi.spyOn(logger, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createRequest({
  method = "GET",
  path = "/v1/documents",
  headers = {},
  body,
  query = {},
} = {}) {
  const normalizedHeaders = new Map(
    Object.entries({
      origin,
      authorization: "Bearer valid-firebase-token",
      "x-firebase-appcheck": "valid-app-check-token",
      "content-type": "application/json",
      ...headers,
    }).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    body,
    method,
    originalUrl: path,
    query,
    get: vi.fn((name) => normalizedHeaders.get(String(name).toLowerCase()) || ""),
  };
}

function createResponse() {
  const headers = {};
  return {
    body: undefined,
    destroyedWith: null,
    headers,
    headersSent: false,
    statusCode: 200,
    set: vi.fn(function set(nameOrValues, value) {
      if (typeof nameOrValues === "string") headers[nameOrValues] = value;
      else Object.assign(headers, nameOrValues);
      return this;
    }),
    status: vi.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function json(value) {
      this.body = value;
      this.headersSent = true;
      return this;
    }),
    end: vi.fn(function end() {
      this.headersSent = true;
      return this;
    }),
    destroy: vi.fn(function destroy(error) {
      this.destroyedWith = error;
    }),
  };
}

function createBackend({
  uid = userA,
  authTime = Math.floor(Date.now() / 1_000) - 30,
  documents = {},
} = {}) {
  const documentMethods = {
    beginUpload: vi.fn(),
    finalizeUpload: vi.fn(),
    getCloudHistory: vi.fn(),
    setCloudHistory: vi.fn(),
    listDocuments: vi.fn(async () => ({ documents: [], nextCursor: null })),
    listVersions: vi.fn(),
    prepareDownload: vi.fn(),
    restoreDocument: vi.fn(),
    restoreVersion: vi.fn(),
    trashDocument: vi.fn(),
    purgeDocument: vi.fn(),
    purgeAccountData: vi.fn(),
    ...documents,
  };
  return {
    admin: {
      auth: {
        verifyIdToken: vi.fn(async () => ({ uid, auth_time: authTime })),
      },
      appCheck: {
        verifyToken: vi.fn(async () => ({ appId: "pdfenrich-web" })),
      },
    },
    config: {
      allowedOrigins: new Set([origin]),
      allowedAppIds: new Set(["pdfenrich-web"]),
    },
    documents: documentMethods,
  };
}

async function dispatch(backend, requestOptions) {
  const request = createRequest(requestOptions);
  const response = createResponse();
  const handler = createPrivateCloudApiHandler({
    backendProvider: () => backend,
  });
  await handler(request, response);
  return { request, response };
}

describe("private cloud HTTP authentication and CORS boundary", () => {
  it("returns a credential-free preflight with the exact state-changing headers and methods", async () => {
    const backend = createBackend();
    const { response } = await dispatch(backend, {
      method: "OPTIONS",
      path: "/v1/documents/uploads",
      headers: {
        authorization: "",
        "x-firebase-appcheck": "",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers).toMatchObject({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, X-Firebase-AppCheck, X-Requested-With, Idempotency-Key",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    expect(backend.admin.auth.verifyIdToken).not.toHaveBeenCalled();
    expect(backend.admin.appCheck.verifyToken).not.toHaveBeenCalled();
  });

  it("denies unauthenticated private-document requests before any service operation", async () => {
    const backend = createBackend();
    const { response } = await dispatch(backend, {
      headers: { authorization: "" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      ok: false,
      error: {
        code: "authentication_required",
        message: "Sign in to continue.",
      },
    });
    expect(backend.documents.listDocuments).not.toHaveBeenCalled();
  });

  it("fails closed when App Check is absent", async () => {
    const backend = createBackend();
    const { response } = await dispatch(backend, {
      headers: { "x-firebase-appcheck": "" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.body.error.code).toBe("app_check_required");
    expect(backend.documents.listDocuments).not.toHaveBeenCalled();
  });

  it("rejects non-allowlisted web origins before token verification", async () => {
    const backend = createBackend();
    const { response } = await dispatch(backend, {
      headers: { origin: "https://attacker.example" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.body.error.code).toBe("origin_not_allowed");
    expect(backend.admin.auth.verifyIdToken).not.toHaveBeenCalled();
  });
});

describe("private cloud API route and ownership contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps the upload request to the new metadata contract and takes idempotency only from the header", async () => {
    const beginResult = {
      state: "uploading",
      uploadId: "f".repeat(64),
      documentId: documentA,
      versionId: `ver_${"D".repeat(24)}`,
      uploadSessionUrl: "https://storage.googleapis.com/upload/session",
    };
    const backend = createBackend({
      documents: { beginUpload: vi.fn(async () => beginResult) },
    });
    const body = {
      fileName: "Quarterly Report.pdf",
      sizeBytes: 1234,
      contentType: "application/pdf",
      checksumSha256: checksum,
    };
    const { response } = await dispatch(backend, {
      method: "POST",
      path: "/v1/documents/uploads",
      headers: { "idempotency-key": "upload-attempt-00000001" },
      body,
    });

    expect(response.statusCode).toBe(201);
    expect(backend.documents.beginUpload).toHaveBeenCalledWith(userA, {
      ...body,
      idempotencyKey: "upload-attempt-00000001",
    }, origin);
    expect(response.body).toEqual({ ok: true, ...beginResult });
  });

  it("binds list operations to the verified identity, never to a user ID in the request", async () => {
    const backend = createBackend();
    const { response } = await dispatch(backend, {
      path: `/v1/documents?ownerId=${encodeURIComponent(userB)}`,
      query: { ownerId: userB, limit: "100" },
    });

    expect(response.statusCode).toBe(200);
    expect(backend.documents.listDocuments).toHaveBeenCalledWith(userA, {
      limit: "100",
      cursor: undefined,
      includeDeleted: false,
    });
  });

  it.each([
    ["download", "GET", `/v1/documents/${documentB}/download`, "prepareDownload"],
    ["restore", "POST", `/v1/documents/${documentB}/restore`, "restoreDocument"],
    ["delete", "DELETE", `/v1/documents/${documentB}`, "trashDocument"],
    ["permanent delete", "DELETE", `/v1/documents/${documentB}?permanent=true`, "purgeDocument"],
    [
      "version restore",
      "POST",
      `/v1/documents/${documentB}/versions/${versionB}/restore`,
      "restoreVersion",
    ],
  ])("does not turn a modified document ID into authority for %s", async (
    _operation,
    method,
    path,
    serviceMethod,
  ) => {
    const rejection = new PrivateCloudSecurityError(
      "document_not_found",
      "The requested document is unavailable.",
      404,
    );
    const backend = createBackend({
      documents: { [serviceMethod]: vi.fn(async () => { throw rejection; }) },
    });
    const { response } = await dispatch(backend, {
      method,
      path,
      query: path.includes("permanent=true") ? { permanent: "true" } : {},
    });

    expect(response.statusCode).toBe(404);
    expect(response.body.error).toEqual({
      code: "document_not_found",
      message: "The requested document is unavailable.",
    });
    if (serviceMethod === "restoreVersion") {
      expect(backend.documents[serviceMethod]).toHaveBeenCalledWith(userA, documentB, versionB);
    } else if (serviceMethod === "prepareDownload") {
      expect(backend.documents[serviceMethod]).toHaveBeenCalledWith(userA, documentB, "");
    } else {
      expect(backend.documents[serviceMethod]).toHaveBeenCalledWith(userA, documentB);
    }
    expect(JSON.stringify(response.body)).not.toContain(userB);
  });

  it("does not report a failed upload as active or saved", async () => {
    const backend = createBackend({
      documents: {
        beginUpload: vi.fn(async () => {
          throw new PrivateCloudSecurityError(
            "storage_unavailable",
            "Private storage is temporarily unavailable.",
            503,
          );
        }),
      },
    });
    const { response } = await dispatch(backend, {
      method: "POST",
      path: "/v1/documents/uploads",
      headers: { "idempotency-key": "upload-attempt-00000002" },
      body: {
        fileName: "safe.pdf",
        sizeBytes: 100,
        contentType: "application/pdf",
        checksumSha256: checksum,
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.body.error.code).toBe("storage_unavailable");
    expect(response.body).not.toHaveProperty("state");
    expect(JSON.stringify(response.body)).not.toMatch(/active|saved/i);
  });

  it("keeps finalize failures non-terminal and redacts provider details", async () => {
    const uploadId = "e".repeat(64);
    const backend = createBackend({
      documents: {
        finalizeUpload: vi.fn(async () => {
          throw new Error(
            "gs://private-bucket/users/user-a/private.pdf?X-Goog-Signature=secret",
          );
        }),
      },
    });
    const { response } = await dispatch(backend, {
      method: "POST",
      path: `/v1/documents/uploads/${uploadId}/finalize`,
      headers: { "idempotency-key": "upload-attempt-00000003" },
      body: { checksumSha256: checksum },
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      ok: false,
      error: {
        code: "internal_error",
        message: "The private cloud operation could not be completed.",
      },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/bucket|signature|private\.pdf|secret/i);
  });

  it("requires the backend purge confirmation before account identity deletion can proceed", async () => {
    const backend = createBackend({
      documents: {
        purgeAccountData: vi.fn(async () => ({ state: "complete", purgeConfirmed: true })),
      },
    });
    const { response } = await dispatch(backend, {
      method: "DELETE",
      path: "/v1/account/data",
    });

    expect(backend.documents.purgeAccountData).toHaveBeenCalledWith(userA, true);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      state: "complete",
      purgeConfirmed: true,
    });
  });
});
