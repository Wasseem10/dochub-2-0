import { optionalAnalyticsAllowed } from "../privacy/privacyChoices.js";

const GOOGLE_EVENT_NAMES = Object.freeze({
  page_viewed: "funnel_landing",
  upload_started: "pdf_upload",
  export_succeeded: "pdf_completed",
  account_signed_up: "sign_up",
});

let analyticsPromise;

function compactParameters(parameters) {
  return Object.fromEntries(Object.entries(parameters).filter(([, value]) => value !== undefined && value !== ""));
}

export function googleAnalyticsEventFor(event) {
  const name = GOOGLE_EVENT_NAMES[event?.name];
  if (!name) return null;
  const properties = event.properties || {};
  return {
    name,
    parameters: compactParameters({
      tool_id: properties.toolId,
      traffic_source: properties.trafficSource,
      referrer_domain: properties.referrerDomain,
      landing_path: properties.landingPath,
      method: properties.authMethod,
      device_category: properties.deviceClass,
    }),
  };
}

async function loadAnalytics() {
  if (analyticsPromise) return analyticsPromise;
  analyticsPromise = Promise.all([
    import("../firebase.js"),
    import("firebase/analytics"),
  ]).then(async ([{ firebaseApp }, { getAnalytics, isSupported, logEvent }]) => {
    if (!firebaseApp || !(await isSupported())) return null;
    return { analytics: getAnalytics(firebaseApp), logEvent };
  }).catch(() => null);
  return analyticsPromise;
}

export async function sendGoogleAnalyticsEvent(event) {
  if (typeof window === "undefined" || !optionalAnalyticsAllowed()) return false;
  const mapped = googleAnalyticsEventFor(event);
  if (!mapped) return false;
  const loaded = await loadAnalytics();
  if (!loaded) return false;
  loaded.logEvent(loaded.analytics, mapped.name, mapped.parameters);
  return true;
}

export function queueGoogleAnalyticsEvent(event) {
  if (!googleAnalyticsEventFor(event) || !optionalAnalyticsAllowed()) return false;
  void sendGoogleAnalyticsEvent(event);
  return true;
}
