export const ANALYTICS_OWNER_CLAIM = "pdfenrichAdmin";

export function isAnalyticsOwner(user) {
  return user?.isAnalyticsOwner === true;
}
