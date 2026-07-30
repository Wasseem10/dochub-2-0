import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureApiResponse,
  privacySafeActorId,
  safeLog,
  sendSafeError,
} from "../../functions/src/security/httpSecurity.js";
import { PrivateCloudSecurityError } from "../../functions/src/security/privateCloudDocumentService.js";

const requireFromFunctions = createRequire(
  new URL("../../functions/package.json", import.meta.url),
);
const { logger } = requireFromFunctions("firebase-functions");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("privacy-safe backend telemetry", () => {
  it("allows only bounded operational fields and drops document or credential values", () => {
    const log = vi.spyOn(logger, "info").mockImplementation(() => {});
    safeLog("info", "Private upload completed", {
      requestId: "request-1",
      operation: "finalize_upload",
      outcome: "active",
      actor: privacySafeActorId("firebase-user-a"),
      count: 1,
      fileName: "patient-record.pdf",
      storageKey: "users/user-a/documents/doc-secret/versions/ver-secret.pdf",
      resumableSessionUrl: "https://storage.googleapis.com/upload?token=secret",
      authorization: "Bearer secret",
      documentText: "highly private canary phrase",
      recipientEmail: "recipient@example.com",
      nested: { body: "raw request" },
    });

    expect(log).toHaveBeenCalledTimes(1);
    const [, context] = log.mock.calls[0];
    expect(context).toEqual({
      requestId: "request-1",
      operation: "finalize_upload",
      outcome: "active",
      actor: privacySafeActorId("firebase-user-a"),
      count: 1,
    });
    expect(JSON.stringify(context)).not.toMatch(
      /patient-record|doc-secret|storage\.googleapis|Bearer|canary|recipient@example/i,
    );
  });

  it("returns stable public errors and never echoes an unknown provider exception", () => {
    const log = vi.spyOn(logger, "error").mockImplementation(() => {});
    const response = {
      statusCode: 200,
      body: null,
      status: vi.fn(function status(code) {
        this.statusCode = code;
        return this;
      }),
      json: vi.fn(function json(value) {
        this.body = value;
        return this;
      }),
    };
    sendSafeError(
      response,
      new Error("signed URL https://storage.example/private.pdf?token=secret"),
      {
        requestId: "request-2",
        operation: "download",
        fileName: "private.pdf",
      },
    );

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      ok: false,
      error: {
        code: "internal_error",
        message: "The private cloud operation could not be completed.",
      },
    });
    expect(log).toHaveBeenCalledWith("Private cloud request failed", {
      requestId: "request-2",
      operation: "download",
      outcome: "failed",
      errorCode: "internal_error",
    });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/storage\.example|private\.pdf|token=secret/i);
  });

  it("preserves a known safe error code without serializing request data", () => {
    const log = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const response = {
      status: vi.fn(function status(code) {
        this.statusCode = code;
        return this;
      }),
      json: vi.fn(function json(value) {
        this.body = value;
        return this;
      }),
    };
    sendSafeError(
      response,
      new PrivateCloudSecurityError("account_quota_exceeded", "Storage quota reached.", 413),
      {
        requestId: "request-3",
        operation: "begin_upload",
        requestBody: "%PDF-private-data",
      },
    );

    expect(response.body.error).toEqual({
      code: "account_quota_exceeded",
      message: "Storage quota reached.",
    });
    expect(log.mock.calls[0][1]).not.toHaveProperty("requestBody");
  });
});

describe("backend response headers", () => {
  it("applies no-store, clickjacking, MIME-sniffing, and capability-leak protections", () => {
    const response = {
      values: {},
      set(values) {
        Object.assign(this.values, values);
      },
    };
    configureApiResponse(response);
    expect(response.values).toMatchObject({
      "Cache-Control": "no-store, max-age=0",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
  });
});
