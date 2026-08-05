function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : null;
}

export function privateCloudDocumentNeedsSync({
  userId,
  ownerId,
  cloudDocumentId,
  localUpdatedAt,
  cloudUpdatedAt,
}) {
  if (!userId || ownerId !== userId || !cloudDocumentId) return false;
  const localTimestamp = timestamp(localUpdatedAt);
  if (localTimestamp === null) return false;
  const cloudTimestamp = timestamp(cloudUpdatedAt);
  return cloudTimestamp === null || localTimestamp > cloudTimestamp;
}

export function shouldAutosavePrivateCloudDocument({
  configured,
  isOffline,
  saveState,
  ...documentState
}) {
  return Boolean(
    configured
    && !isOffline
    && saveState === "saved"
    && privateCloudDocumentNeedsSync(documentState)
  );
}
