import { trackProductEvent } from "../analytics/productAnalytics.js";
import { privacySafeRoute } from "../privacy/privacySafeRoute.js";

const REPORTED_KEY = "pdfenrich_reported_diagnostics";

export function diagnosticCategory(value) {
  const text = String(value || "").toLowerCase();
  if (/memory|allocation|heap/.test(text)) return "memory";
  if (/network|fetch|offline|timeout/.test(text)) return "network";
  if (/firebase|firestore|permission-denied|auth\//.test(text)) return "firebase";
  if (/pdf|worker|document/.test(text)) return "pdf_processing";
  if (/chunk|module|import/.test(text)) return "asset_loading";
  return "client_runtime";
}

export function durationBucket(duration = 0) {
  if (duration < 1500) return "under_1_5s";
  if (duration < 3000) return "1_5_3s";
  if (duration < 6000) return "3_6s";
  return "over_6s";
}

function safeRoute() {
  return privacySafeRoute(window.location.pathname, 100);
}

function safeDiagnosticIdentifier(value) {
  return String(value || "")
    .replace(/[^A-Za-z0-9_.:/-]/g, "")
    .slice(0, 64);
}

export function redactedErrorDetails(error) {
  const diagnosticValue = error?.code || error?.name || error;
  return {
    category: diagnosticCategory(diagnosticValue),
    ...(safeDiagnosticIdentifier(error?.name) ? { name: safeDiagnosticIdentifier(error.name) } : {}),
    ...(safeDiagnosticIdentifier(error?.code) ? { code: safeDiagnosticIdentifier(error.code) } : {}),
  };
}

export function logRedactedClientError(context, error) {
  if (!import.meta.env.DEV) return;
  console.error(`[PDFEnrich] ${context}`, redactedErrorDetails(error));
}

function reportOnce(name, properties) {
  const signature = `${name}:${properties.errorCategory || properties.durationBucket || "event"}:${properties.route || ""}`;
  try {
    const reported = new Set(JSON.parse(window.sessionStorage.getItem(REPORTED_KEY) || "[]"));
    if (reported.has(signature)) return;
    reported.add(signature);
    window.sessionStorage.setItem(REPORTED_KEY, JSON.stringify([...reported].slice(-30)));
  } catch {
    // Session storage can be disabled; reporting still remains privacy-safe.
  }
  trackProductEvent(name, properties);
}

export function installProductionMonitoring() {
  if (typeof window === "undefined" || window.__pdfEnrichMonitoringInstalled) return () => {};
  window.__pdfEnrichMonitoringInstalled = true;
  const onError = (event) => reportOnce("client_error", { errorCategory: diagnosticCategory(event.error?.name || event.message), operation: "window_error", route: safeRoute() });
  const onRejection = (event) => reportOnce("unhandled_rejection", { errorCategory: diagnosticCategory(event.reason?.name || event.reason?.message || event.reason), operation: "promise_rejection", route: safeRoute() });
  const reportNavigation = () => {
    const navigation = performance.getEntriesByType?.("navigation")?.[0];
    const duration = navigation?.duration || performance.now();
    if (duration >= 3000) reportOnce("slow_operation", { durationBucket: durationBucket(duration), operation: "page_load", route: safeRoute() });
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  if (document.readyState === "complete") setTimeout(reportNavigation, 0);
  else window.addEventListener("load", reportNavigation, { once: true });
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("load", reportNavigation);
    window.__pdfEnrichMonitoringInstalled = false;
  };
}
