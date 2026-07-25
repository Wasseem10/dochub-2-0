export const PRIVACY_CHOICE_STORAGE_KEY = "pdfarrow.privacy-choices.v1";
export const PRIVACY_CHOICE_EVENT = "pdfarrow:privacy-choice-changed";

const OPTIONAL_ANALYTICS_STORAGE_KEYS = Object.freeze([
  "realpdf_analytics_visitor_id",
  "pdfarrow_session_attribution_v1",
  "pdfarrow_session_page_views_v1",
  "pdfarrow_reported_diagnostics",
]);

export function globalPrivacyControlEnabled() {
  return typeof navigator !== "undefined" && navigator.globalPrivacyControl === true;
}

export function readPrivacyChoices() {
  if (globalPrivacyControlEnabled()) {
    return { analytics: false, source: "global-privacy-control" };
  }
  if (typeof window === "undefined") return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(PRIVACY_CHOICE_STORAGE_KEY) || "null");
    if (typeof stored?.analytics !== "boolean") return null;
    return stored;
  } catch {
    return null;
  }
}

export function optionalAnalyticsAllowed() {
  return readPrivacyChoices()?.analytics === true;
}

export function clearOptionalAnalyticsStorage() {
  if (typeof window === "undefined") return;
  for (const key of OPTIONAL_ANALYTICS_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Privacy choices still apply when browser storage is unavailable.
    }
  }
}

export function savePrivacyChoices({ analytics }) {
  const next = {
    analytics: globalPrivacyControlEnabled() ? false : analytics === true,
    source: globalPrivacyControlEnabled() ? "global-privacy-control" : "user",
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PRIVACY_CHOICE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the choice in the current page state when persistence is blocked.
    }
    if (!next.analytics) clearOptionalAnalyticsStorage();
    window.dispatchEvent(new CustomEvent(PRIVACY_CHOICE_EVENT, { detail: next }));
  }
  return next;
}
