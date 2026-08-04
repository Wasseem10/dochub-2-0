import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  optionalAnalyticsAllowed,
  PRIVACY_CHOICE_EVENT,
} from "../privacy/privacyChoices.js";
import { privacySafeRoute } from "../privacy/privacySafeRoute.js";

export function privacySafeVercelAnalyticsEvent(event) {
  if (!event?.url || !optionalAnalyticsAllowed()) return null;

  const parsedUrl = new URL(event.url, "https://pdfenrich.com");
  parsedUrl.pathname = privacySafeRoute(parsedUrl.pathname);
  parsedUrl.search = "";
  parsedUrl.hash = "";
  return { ...event, url: parsedUrl.toString() };
}

export function VercelWebAnalytics() {
  const [enabled, setEnabled] = useState(() => optionalAnalyticsAllowed());

  useEffect(() => {
    const updateConsent = (event) => setEnabled(event.detail?.analytics === true);
    window.addEventListener(PRIVACY_CHOICE_EVENT, updateConsent);
    return () => window.removeEventListener(PRIVACY_CHOICE_EVENT, updateConsent);
  }, []);

  if (!enabled) return null;
  return <Analytics beforeSend={privacySafeVercelAnalyticsEvent} />;
}
