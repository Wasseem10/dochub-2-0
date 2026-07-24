// Keep generated canonicals, sitemap URLs, and robots.txt correct even when a
// deploy environment variable has not been configured yet.
const FALLBACK_PRODUCTION_URL = "https://www.pdfarrow.com";

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
