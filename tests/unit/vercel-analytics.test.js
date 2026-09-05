import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { inject, pageview } from "@vercel/analytics";
import { analyticsRouteFromState, installVercelAnalytics } from "../../src/analytics/vercelAnalytics.js";
import { PRIVACY_CHOICE_EVENT, PRIVACY_CHOICE_STORAGE_KEY } from "../../src/privacy/privacyChoices.js";

vi.mock("@vercel/analytics", () => ({ inject: vi.fn(), pageview: vi.fn() }));

describe("consented Vercel page views", () => {
  let storage;
  let router;
  let notify;
  let stop;
  beforeEach(() => {
    vi.clearAllMocks();
    storage = new Map();
    const browser = new EventTarget();
    browser.location = new URL("https://pdfenrich.com/");
    browser.localStorage = { getItem: (key) => storage.get(key) || null };
    vi.stubGlobal("window", browser);
    vi.stubGlobal("document", { referrer: "" });
    vi.stubGlobal("navigator", {});
    router = {
      state: { initialized: true, navigation: { state: "idle" }, location: { pathname: "/" }, matches: [{ route: { path: "/" } }] },
      subscribe: vi.fn((callback) => { notify = callback; return vi.fn(); }),
    };
  });
  afterEach(() => { stop?.(); stop = undefined; vi.unstubAllGlobals(); });
  const consent = (allowed) => {
    storage.set(PRIVACY_CHOICE_STORAGE_KEY, JSON.stringify({ analytics: allowed }));
    window.dispatchEvent(new Event(PRIVACY_CHOICE_EVENT));
  };

  it("loads only after acceptance, tracks navigation once, and stops after revocation", () => {
    stop = installVercelAnalytics(router);
    expect(inject).not.toHaveBeenCalled();
    consent(true);
    expect(inject).toHaveBeenCalledTimes(1);
    expect(inject.mock.calls[0][0].disableAutoTrack).toBe(true);
    expect(pageview).toHaveBeenLastCalledWith({ route: "/", path: "/" });
    notify();
    expect(pageview).toHaveBeenCalledTimes(1);
    router.state.location.pathname = "/compress-pdf";
    router.state.matches = [{ route: { path: "/compress-pdf" } }];
    notify();
    expect(pageview).toHaveBeenCalledTimes(2);
    const filter = inject.mock.calls[0][0].beforeSend;
    consent(false);
    expect(filter({ type: "pageview", url: "https://pdfenrich.com/" })).toBeNull();
    notify();
    expect(pageview).toHaveBeenCalledTimes(2);
    consent(true);
    expect(inject).toHaveBeenCalledTimes(1);
    expect(pageview).toHaveBeenCalledTimes(3);
  });

  it("sends templates and strips queries, fragments, arbitrary paths, and custom payloads", () => {
    router.state.location = { pathname: "/app/editor/private-document", search: "?filename=secret.pdf", hash: "#signature" };
    router.state.matches = [{ route: { path: "/app/editor/:documentId" } }];
    consent(true);
    stop = installVercelAnalytics(router);
    expect(pageview).toHaveBeenCalledWith({ route: "/app/editor/:documentId", path: "/app/editor/:documentId" });
    const filter = inject.mock.calls[0][0].beforeSend;
    expect(filter({ type: "pageview", url: "https://pdfenrich.com/app/editor/:documentId?secret=yes#token" }).url).toBe("https://pdfenrich.com/app/editor/:documentId");
    expect(filter({ type: "pageview", url: "https://pdfenrich.com/app/editor/private-document" })).toBeNull();
    expect(filter({ type: "event", url: "https://pdfenrich.com/", payload: { filename: "secret.pdf" } })).toBeNull();
    expect(analyticsRouteFromState({ matches: [{ route: { path: "*" } }] })).toBe("/404");
    expect(analyticsRouteFromState({ matches: [{ route: { path: "/share/:token" } }] })).toBe("/share/:token");
  });

  it.each(["internal", "gpc", "localhost", "sensitive-referrer"])("does not collect %s traffic", (reason) => {
    consent(true);
    if (reason === "internal") storage.set("pdfenrich_internal_traffic_v1", "true");
    if (reason === "gpc") navigator.globalPrivacyControl = true;
    if (reason === "localhost") window.location = new URL("http://127.0.0.1:4174/");
    if (reason === "sensitive-referrer") document.referrer = "https://example.com/private/file?token=secret";
    stop = installVercelAnalytics(router);
    expect(inject).not.toHaveBeenCalled();
    expect(pageview).not.toHaveBeenCalled();
  });
});
