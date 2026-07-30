import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearCloudHistoryPreference,
  createCloudIdempotencyKey,
  isPrivateCloudConfigured,
  readCloudHistoryPreference,
  savePrivateCloudPdf,
  sha256Hex,
  uploadPdfToResumableSession,
  writeCloudHistoryPreference,
} from "../../src/cloud/privateCloudDocuments.js";

const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;
const originalXmlHttpRequest = globalThis.XMLHttpRequest;

afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = originalFetch;
  if (originalXmlHttpRequest === undefined) delete globalThis.XMLHttpRequest;
  else globalThis.XMLHttpRequest = originalXmlHttpRequest;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function installQueuedXmlHttpRequest(outcomes) {
  const requests = [];
  globalThis.XMLHttpRequest = class FakeXmlHttpRequest {
    constructor() {
      this.headers = {};
      this.outcome = outcomes.shift();
      this.responseHeaders = {};
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

    getResponseHeader(name) {
      return this.responseHeaders[name] || null;
    }

    send(body) {
      this.body = body;
      queueMicrotask(() => {
        if (this.outcome?.type === "network-error") {
          this.onerror?.();
        } else {
          this.status = this.outcome?.status ?? 200;
          this.responseHeaders = this.outcome?.headers || {};
          this.onload?.();
        }
        this.onloadend?.();
      });
    }

    abort() {
      this.onabort?.();
      this.onloadend?.();
    }
  };
  return requests;
}

describe("private cloud client boundary", () => {
  it("fails closed when the authenticated backend endpoint is not configured", async () => {
    expect(isPrivateCloudConfigured).toBe(false);
    const blob = new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" });
    await expect(savePrivateCloudPdf({ blob, fileName: "local-only.pdf" })).rejects.toMatchObject({
      code: "cloud_not_configured",
    });
  });

  it("creates opaque idempotency keys and stable SHA-256 checksums", async () => {
    const blob = new Blob(["private-pdf-canary"], { type: "application/pdf" });
    expect(createCloudIdempotencyKey()).toMatch(/^[a-f0-9-]{32,36}$/i);
    expect(await sha256Hex(blob)).toBe("931298f3a613348c005b0022b38f093759cb58833d24c7309e57503644b68ab0");
  });

  it("stores only the cloud-history preference, scoped by authenticated user id", () => {
    const values = new Map();
    globalThis.window = {
      localStorage: {
        getItem: (key) => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
      },
    };
    writeCloudHistoryPreference("user-a", true);
    writeCloudHistoryPreference("user-b", true);
    expect(readCloudHistoryPreference("user-a")).toBe(true);
    expect(readCloudHistoryPreference("user-b")).toBe(true);
    clearCloudHistoryPreference("user-a");
    expect(readCloudHistoryPreference("user-a")).toBe(false);
    expect(readCloudHistoryPreference("user-b")).toBe(true);
    expect([...values.values()].join("")).not.toContain("document");
  });
});

describe("resumable private PDF upload retries", () => {
  it("queries the committed offset after an interruption and resumes without re-sending prior bytes", async () => {
    vi.useFakeTimers();
    const requests = installQueuedXmlHttpRequest([
      { type: "network-error" },
      { status: 200 },
    ]);
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 308,
      headers: {
        get: (name) => (name === "Range" ? "bytes=0-4" : null),
      },
    }));
    const blob = new Blob(["%PDF-1.7\n%%EOF\n"], { type: "application/pdf" });
    const progress = [];

    const upload = uploadPdfToResumableSession({
      sessionUrl: "https://storage.googleapis.com/upload/resumable-session",
      blob,
      maxAttempts: 2,
      onProgress: (value) => progress.push(value),
    });
    await vi.runAllTimersAsync();
    await upload;

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://storage.googleapis.com/upload/resumable-session",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Range": `bytes */${blob.size}` },
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
      }),
    );
    expect(requests).toHaveLength(2);
    expect(requests[0].headers["Content-Range"]).toBe(`bytes 0-${blob.size - 1}/${blob.size}`);
    expect(requests[1].headers["Content-Range"]).toBe(`bytes 5-${blob.size - 1}/${blob.size}`);
    expect(requests[1].body.size).toBe(blob.size - 5);
    expect(progress.at(-1)).toBe(100);
  });

  it("treats a successful status probe as completed after a lost upload response", async () => {
    vi.useFakeTimers();
    const requests = installQueuedXmlHttpRequest([{ type: "network-error" }]);
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
    }));
    const blob = new Blob(["%PDF-1.7\n%%EOF\n"], { type: "application/pdf" });
    const progress = [];

    const upload = uploadPdfToResumableSession({
      sessionUrl: "https://storage.googleapis.com/upload/resumable-session",
      blob,
      maxAttempts: 2,
      onProgress: (value) => progress.push(value),
    });
    await vi.runAllTimersAsync();
    await upload;

    expect(requests).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(progress.at(-1)).toBe(100);
  });

  it("fails closed when the resumable status cannot be verified", async () => {
    vi.useFakeTimers();
    installQueuedXmlHttpRequest([
      { type: "network-error" },
      { type: "network-error" },
    ]);
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      headers: { get: () => null },
    }));
    const blob = new Blob(["%PDF-1.7\n%%EOF\n"], { type: "application/pdf" });

    const upload = uploadPdfToResumableSession({
      sessionUrl: "https://storage.googleapis.com/upload/resumable-session",
      blob,
      maxAttempts: 2,
    });
    const rejected = expect(upload).rejects.toMatchObject({
      code: "upload_interrupted",
      retryable: true,
    });
    await vi.runAllTimersAsync();
    await rejected;
  });
});
