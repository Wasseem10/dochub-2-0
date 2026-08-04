import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  privacySafeVercelAnalyticsEvent,
} from "../../src/analytics/VercelWebAnalytics.jsx";
import { PRIVACY_CHOICE_STORAGE_KEY } from "../../src/privacy/privacyChoices.js";

describe("Vercel Web Analytics privacy boundary", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn(() => JSON.stringify({ analytics: true })),
      },
    });
    vi.stubGlobal("navigator", { globalPrivacyControl: false });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("removes query strings, fragments, and private document IDs", () => {
    expect(privacySafeVercelAnalyticsEvent({
      url: "https://pdfenrich.com/app/editor/private-document-id?name=secret.pdf#page=2",
    })).toEqual({
      url: "https://pdfenrich.com/app/editor/:documentId",
    });
  });

  it("removes sharing and signing capabilities", () => {
    expect(privacySafeVercelAnalyticsEvent({
      url: "https://pdfenrich.com/share/high-entropy-secret#token=another-secret",
    })?.url).toBe("https://pdfenrich.com/share/:token");
    expect(privacySafeVercelAnalyticsEvent({
      url: "https://pdfenrich.com/sign?token=secret",
    })?.url).toBe("https://pdfenrich.com/sign/:token");
  });

  it("does not send an event before analytics consent", () => {
    window.localStorage.getItem.mockImplementation((key) => (
      key === PRIVACY_CHOICE_STORAGE_KEY ? JSON.stringify({ analytics: false }) : null
    ));
    expect(privacySafeVercelAnalyticsEvent({ url: "https://pdfenrich.com/tools" })).toBeNull();
  });

  it("honors Global Privacy Control after consent", () => {
    navigator.globalPrivacyControl = true;
    expect(privacySafeVercelAnalyticsEvent({ url: "https://pdfenrich.com/tools" })).toBeNull();
  });
});
