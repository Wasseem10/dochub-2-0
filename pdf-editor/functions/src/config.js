import { PrivateCloudSecurityError, PRIVATE_CLOUD_SECURITY_LIMITS } from "./security/privateCloudDocumentService.js";

function requiredText(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new PrivateCloudSecurityError(
      "backend_configuration_missing",
      `The required ${name} runtime setting is missing.`,
      503,
    );
  }
  return value;
}

function requiredPositiveInteger(name) {
  const value = Number(requiredText(name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new PrivateCloudSecurityError(
      "backend_configuration_invalid",
      `The required ${name} runtime setting is invalid.`,
      503,
    );
  }
  return value;
}

function boundedPositiveInteger(name, fallback, maximum) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new PrivateCloudSecurityError(
      "backend_configuration_invalid",
      `The ${name} runtime setting is invalid.`,
      503,
    );
  }
  return value;
}

function hasAsciiControl(value) {
  return Array.from(String(value || "")).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function loadPrivateCloudConfig() {
  const allowedOrigins = new Set(
    requiredText("PRIVATE_CLOUD_ALLOWED_ORIGINS")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => new URL(value).origin),
  );
  if (!allowedOrigins.size) {
    throw new PrivateCloudSecurityError(
      "backend_configuration_invalid",
      "At least one private-cloud browser origin is required.",
      503,
    );
  }
  const allowedAppIds = new Set(
    requiredText("PRIVATE_CLOUD_ALLOWED_APP_IDS")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (!allowedAppIds.size || [...allowedAppIds].some((value) => value.length > 200 || hasAsciiControl(value))) {
    throw new PrivateCloudSecurityError(
      "backend_configuration_invalid",
      "The private-cloud App Check application allowlist is invalid.",
      503,
    );
  }
  const serviceAccountEmail = requiredText("PRIVATE_CLOUD_SERVICE_ACCOUNT_EMAIL");
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com$/.test(serviceAccountEmail)) {
    throw new PrivateCloudSecurityError(
      "backend_configuration_invalid",
      "The private-cloud runtime service account is invalid.",
      503,
    );
  }
  const maximumFileBytes = boundedPositiveInteger(
    "PRIVATE_CLOUD_MAX_FILE_BYTES",
    PRIVATE_CLOUD_SECURITY_LIMITS.hardMaxPdfBytes,
    PRIVATE_CLOUD_SECURITY_LIMITS.hardMaxPdfBytes,
  );
  const maximumAccountBytes = requiredPositiveInteger("PRIVATE_CLOUD_ACCOUNT_QUOTA_BYTES");
  if (maximumAccountBytes < maximumFileBytes) {
    throw new PrivateCloudSecurityError(
      "backend_configuration_invalid",
      "The account quota must be at least as large as the maximum PDF size.",
      503,
    );
  }

  const malwareScannerUrl = String(process.env.PRIVATE_CLOUD_MALWARE_SCANNER_URL || "").trim();
  const requireMalwareScan = String(process.env.PRIVATE_CLOUD_REQUIRE_MALWARE_SCAN || "true").toLowerCase() !== "false";
  if (malwareScannerUrl && new URL(malwareScannerUrl).protocol !== "https:") {
    throw new PrivateCloudSecurityError(
      "backend_configuration_invalid",
      "The malware scanner endpoint must use HTTPS.",
      503,
    );
  }
  if (requireMalwareScan && !malwareScannerUrl) {
    throw new PrivateCloudSecurityError(
      "backend_configuration_missing",
      "A private malware scanner endpoint is required before cloud uploads can be finalized.",
      503,
    );
  }

  return Object.freeze({
    allowedOrigins,
    allowedAppIds,
    bucketName: requiredText("PRIVATE_CLOUD_STORAGE_BUCKET"),
    serviceAccountEmail,
    maximumFileBytes,
    maximumAccountBytes,
    trashRetentionDays: boundedPositiveInteger("PRIVATE_CLOUD_TRASH_RETENTION_DAYS", 30, 90),
    requireMalwareScan,
    malwareScannerUrl,
  });
}
