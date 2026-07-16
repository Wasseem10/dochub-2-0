const configuredSiteUrl = import.meta.env.VITE_SITE_URL || "";

export function getSiteOrigin() {
  if (configuredSiteUrl) return configuredSiteUrl.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function absoluteSiteUrl(path = "/") {
  const origin = getSiteOrigin();
  if (!origin) return path;
  return new URL(path, `${origin}/`).toString();
}
