import { inject, pageview } from "@vercel/analytics";
import { optionalAnalyticsAllowed, PRIVACY_CHOICE_EVENT } from "../privacy/privacyChoices.js";

// Read route definitions, never document IDs, query strings, or URL fragments.
export function analyticsRouteFromState(state) {
  const route = state.matches?.at(-1)?.route?.path;
  return route && route !== "*" && route.startsWith("/") ? route : "/404";
}

export function installVercelAnalytics(router) {
  if (typeof window === "undefined" || !["pdfenrich.com", "www.pdfenrich.com"].includes(window.location.hostname)) return () => {};
  let active = true;
  let injected = false;
  let lastLocation = "";
  const allowedRoutes = new Set();

  // The collector adds document.referrer outside beforeSend. Do not load it
  // for an external referrer that could contain private path/query data.
  try {
    const referrer = document.referrer && new URL(document.referrer);
    if (referrer && referrer.host !== window.location.host
      && (referrer.pathname !== "/" || referrer.search || referrer.hash)) return () => {};
  } catch {
    return () => {};
  }

  const permitted = () => {
    if (!active || !optionalAnalyticsAllowed()) return false;
    try {
      return window.localStorage.getItem("pdfenrich_internal_traffic_v1") !== "true";
    } catch {
      return false;
    }
  };
  const beforeSend = (event) => {
    if (!permitted() || event.type !== "pageview") return null;
    try {
      const url = new URL(event.url);
      if (url.origin !== window.location.origin || !allowedRoutes.has(decodeURI(url.pathname))) return null;
      url.search = "";
      url.hash = "";
      return { ...event, url: url.href };
    } catch {
      return null;
    }
  };
  const update = () => {
    if (!permitted()) {
      lastLocation = "";
      return;
    }
    const state = router.state;
    if (!state.initialized || state.navigation?.state !== "idle") return;
    const route = analyticsRouteFromState(state);
    // Query-only changes (search, document selection) are not extra page views.
    const location = `${state.location.pathname}|${route}`;
    if (location === lastLocation) return;
    allowedRoutes.add(route);
    if (!injected) {
      inject({ mode: "production", debug: false, disableAutoTrack: true, beforeSend, framework: "react" });
      injected = true;
    }
    pageview({ route, path: route });
    lastLocation = location;
  };
  const unsubscribe = router.subscribe(update);
  window.addEventListener(PRIVACY_CHOICE_EVENT, update);
  window.addEventListener("storage", update);
  update();
  return () => {
    active = false;
    unsubscribe();
    window.removeEventListener(PRIVACY_CHOICE_EVENT, update);
    window.removeEventListener("storage", update);
  };
}
