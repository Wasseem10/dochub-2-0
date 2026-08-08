import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAuthenticationBreakdown,
  createFeatureUsage,
  createPrivateAnalyticsSummary,
} from "../../src/analytics/analyticsMetrics.js";
import {
  currentSessionId,
  currentVisitorId,
  isInternalTrafficDevice,
  setInternalTrafficDevice,
  trackProductEventAsync,
} from "../../src/analytics/productAnalytics.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function event(name, visitorId = "anon_same_browser_123456", extra = {}) {
  return {
    id: `${name}-${Math.random()}`,
    name,
    visitorId,
    clientOccurredAt: "2026-08-07T12:00:00.000Z",
    properties: {},
    ...extra,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("private product analytics journeys", () => {
  it("counts one anonymous visitor across upload, editor, feature, and download", () => {
    const events = [
      event("page_view"),
      event("pdf_upload_completed"),
      event("editor_opened"),
      event("add_text_used"),
      event("pdf_downloaded"),
    ];
    const summary = createPrivateAnalyticsSummary(events);
    expect(summary.metrics).toMatchObject({ uniqueVisitors: 1, uploads: 1, editorOpens: 1, downloads: 1 });
    expect(summary.productUsage).toEqual({ uploadVisitors: 1, editorVisitors: 1, featureVisitors: 1, downloadVisitors: 1 });
  });

  it("counts five Add Text uses but one unique feature user", () => {
    const usage = createFeatureUsage(Array.from({ length: 5 }, () => event("add_text_used")));
    expect(usage[0]).toMatchObject({ eventName: "add_text_used", uses: 5, uniqueUsers: 1 });
  });

  it("preserves anonymous attribution when the same visitor later creates an account", () => {
    const events = [
      event("editor_opened"),
      event("signup_completed", "anon_same_browser_123456", { actorId: "firebase-user-1" }),
    ];
    expect(createPrivateAnalyticsSummary(events).metrics.uniqueVisitors).toBe(1);
    expect(events[1].visitorId).toBe(events[0].visitorId);
  });

  it("distinguishes anonymous and authenticated downloads", () => {
    const result = createAuthenticationBreakdown([
      event("pdf_downloaded"),
      event("pdf_downloaded", "anon_signed_browser_123456", { actorId: "firebase-user-2" }),
    ]);
    expect(result).toMatchObject({ anonymous: 1, signedIn: 1, anonymousRate: 50, signedInRate: 50 });
  });

  it("persists random visitor/session IDs and toggles internal traffic per device", () => {
    const localStorage = memoryStorage();
    const sessionStorage = memoryStorage();
    vi.stubGlobal("window", { localStorage, sessionStorage });
    const visitor = currentVisitorId();
    const session = currentSessionId();
    expect(visitor).toMatch(/^anon_[A-Za-z0-9_-]{16,80}$/);
    expect(session).toMatch(/^session_[A-Za-z0-9_-]{16,80}$/);
    expect(currentVisitorId()).toBe(visitor);
    expect(currentSessionId()).toBe(session);
    expect(setInternalTrafficDevice(true)).toBe(true);
    expect(isInternalTrafficDevice()).toBe(true);
    expect(setInternalTrafficDevice(false)).toBe(false);
  });

  it("fails quietly when analytics ingestion is unavailable", async () => {
    const localStorage = memoryStorage({
      "pdfenrich.privacy-choices.v1": JSON.stringify({ analytics: true }),
    });
    const sessionStorage = memoryStorage();
    vi.stubGlobal("window", {
      localStorage,
      sessionStorage,
      location: { pathname: "/edit-pdf", origin: "https://pdfenrich.com", search: "" },
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal("document", { referrer: "", readyState: "complete" });
    vi.stubGlobal("navigator", { userAgent: "", globalPrivacyControl: false });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(trackProductEventAsync("pdf_downloaded", { toolId: "edit-pdf" })).resolves.toBe(false);
  });
});
