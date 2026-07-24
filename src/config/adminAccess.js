export const ANALYTICS_OWNER_EMAIL = "wasseem700@gmail.com";

export function isAnalyticsOwner(user) {
  return String(user?.email || "").trim().toLowerCase() === ANALYTICS_OWNER_EMAIL;
}
