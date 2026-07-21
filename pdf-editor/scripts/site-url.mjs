const FALLBACK_PRODUCTION_URL = "https://dochub-2-0.vercel.app";

/** @param {string} value */
function withProtocol(value) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** @param {Record<string, string | undefined>} [environment] */
export function resolveSiteUrl(environment = process.env) {
  const configured = environment.SITE_URL
    || environment.VITE_SITE_URL
    || environment.VERCEL_PROJECT_PRODUCTION_URL
    || FALLBACK_PRODUCTION_URL;
  return withProtocol(configured).replace(/\/$/, "");
}
