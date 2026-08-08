const DEFAULT_RETENTION_DAYS = 365;

function configuredOrigins() {
  const raw = String(process.env.ANALYTICS_ALLOWED_ORIGINS || "https://pdfenrich.com,https://www.pdfenrich.com");
  const origins = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new URL(value).origin);
  if (!origins.length) throw new Error("ANALYTICS_ALLOWED_ORIGINS must contain at least one origin.");
  return new Set(origins);
}

export function loadAnalyticsConfig() {
  const retentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS || DEFAULT_RETENTION_DAYS);
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 400) {
    throw new Error("ANALYTICS_RETENTION_DAYS must be between 1 and 400.");
  }
  return Object.freeze({
    allowedOrigins: configuredOrigins(),
    retentionDays,
    requireAppCheck: String(process.env.ANALYTICS_REQUIRE_APP_CHECK || "false").toLowerCase() === "true",
  });
}
