const LEGACY_PRODUCT_KEY = ["pdf", "arrow"].join("");

const LOCAL_STORAGE_MIGRATIONS = Object.freeze([
  [`${LEGACY_PRODUCT_KEY}.local-auth-user.v1`, "pdfenrich.local-auth-user.v1"],
  [`${LEGACY_PRODUCT_KEY}.privacy-choices.v1`, "pdfenrich.privacy-choices.v1"],
  [`${LEGACY_PRODUCT_KEY}.signature-library.v1`, "pdfenrich.signature-library.v1"],
]);

const SESSION_STORAGE_MIGRATIONS = Object.freeze([
  [`${LEGACY_PRODUCT_KEY}_session_attribution_v1`, "pdfenrich_session_attribution_v1"],
  [`${LEGACY_PRODUCT_KEY}_session_page_views_v1`, "pdfenrich_session_page_views_v1"],
  [`${LEGACY_PRODUCT_KEY}_reported_diagnostics`, "pdfenrich_reported_diagnostics"],
]);

function migrateStorageKeys(storage, migrations) {
  if (!storage) return;
  for (const [legacyKey, currentKey] of migrations) {
    try {
      const legacyValue = storage.getItem(legacyKey);
      if (legacyValue === null) continue;
      if (storage.getItem(currentKey) === null) storage.setItem(currentKey, legacyValue);
      storage.removeItem(legacyKey);
    } catch {
      // Rebranding should never block the app when browser storage is restricted.
    }
  }
}

export function migratePdfEnrichStorage(browserWindow = typeof window !== "undefined" ? window : null) {
  if (!browserWindow) return;
  migrateStorageKeys(browserWindow.localStorage, LOCAL_STORAGE_MIGRATIONS);
  migrateStorageKeys(browserWindow.sessionStorage, SESSION_STORAGE_MIGRATIONS);
}
