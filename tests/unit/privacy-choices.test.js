import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRIVACY_CHOICE_EVENT,
  PRIVACY_CHOICE_STORAGE_KEY,
  optionalAnalyticsAllowed,
  readPrivacyChoices,
  savePrivacyChoices,
} from "../../src/privacy/privacyChoices.js";

function createStorage(initialEntries = {}) {
  const entries = new Map(Object.entries(initialEntries));
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
  };
}

function installBrowser({ globalPrivacyControl = false } = {}) {
  const localStorage = createStorage({
    realpdf_analytics_visitor_id: "visitor-id",
    pdfenrich_session_attribution_v1: "attribution",
  });
  const sessionStorage = createStorage({
    pdfenrich_session_page_views_v1: "page-view",
  });
  const dispatchedEvents = [];

  vi.stubGlobal("navigator", { globalPrivacyControl });
  vi.stubGlobal("CustomEvent", class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  });
  vi.stubGlobal("window", {
    localStorage,
    sessionStorage,
    dispatchEvent: (event) => dispatchedEvents.push(event),
  });

  return { localStorage, sessionStorage, dispatchedEvents };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("privacy choices", () => {
  it("requires an explicit opt-in before optional analytics are allowed", () => {
    installBrowser();

    expect(readPrivacyChoices()).toBeNull();
    expect(optionalAnalyticsAllowed()).toBe(false);

    const choice = savePrivacyChoices({ analytics: true });

    expect(choice.analytics).toBe(true);
    expect(optionalAnalyticsAllowed()).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(PRIVACY_CHOICE_STORAGE_KEY))).toMatchObject({
      analytics: true,
      source: "user",
    });
  });

  it("clears optional analytics identifiers after rejection", () => {
    const browser = installBrowser();

    const choice = savePrivacyChoices({ analytics: false });

    expect(choice.analytics).toBe(false);
    expect(browser.localStorage.getItem("realpdf_analytics_visitor_id")).toBeNull();
    expect(browser.localStorage.getItem("pdfenrich_session_attribution_v1")).toBeNull();
    expect(browser.sessionStorage.getItem("pdfenrich_session_page_views_v1")).toBeNull();
    expect(browser.dispatchedEvents.at(-1)).toMatchObject({
      type: PRIVACY_CHOICE_EVENT,
      detail: { analytics: false, source: "user" },
    });
  });

  it("honors Global Privacy Control even after an analytics opt-in", () => {
    installBrowser({ globalPrivacyControl: true });

    const choice = savePrivacyChoices({ analytics: true });

    expect(choice).toMatchObject({
      analytics: false,
      source: "global-privacy-control",
    });
    expect(optionalAnalyticsAllowed()).toBe(false);
  });
});
