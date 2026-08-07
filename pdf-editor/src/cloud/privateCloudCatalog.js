import { sanitizePdfDisplayName } from "../tools/safeFileName.js";

const CLOUD_DOCUMENT_ID_PATTERN = /^doc_[A-Za-z0-9_-]{24}$/;

export function privateCloudPlaceholder(userId, metadata, now = () => new Date().toISOString()) {
  const cloudDocumentId = String(metadata?.id || metadata?.documentId || "");
  if (!CLOUD_DOCUMENT_ID_PATTERN.test(cloudDocumentId)) return null;
  const sizeBytes = Number(metadata.sizeBytes || metadata.size || 0);
  const pageCount = Number(metadata.pageCount || 1);
  const timestamp = now();
  return {
    id: `cloud-${cloudDocumentId}`,
    ownerId: userId,
    name: sanitizePdfDisplayName(
      metadata.displayName || metadata.fileName || metadata.name || "Private cloud document.pdf",
    ),
    size: Number.isFinite(sizeBytes) ? Math.max(0, sizeBytes) : 0,
    source: "pdf",
    pageCount: Number.isFinite(pageCount) ? Math.max(1, Math.floor(pageCount)) : 1,
    status: metadata.deletionStatus === "soft_deleted" || metadata.state === "trashed"
      ? "Trash"
      : "Synced",
    location: "My documents",
    favorite: false,
    uploadedAt: metadata.createdAt || metadata.updatedAt || timestamp,
    updatedAt: metadata.updatedAt || metadata.createdAt || timestamp,
    pages: [],
    annotations: [],
    detectedTextItems: [],
    cloudDocumentId,
    cloudVersionId: metadata.currentVersionId || metadata.versionId || "",
    cloudChecksumSha256: metadata.checksumSha256 || metadata.checksum || "",
    retentionUntil: metadata.retentionUntil || null,
    cloudOnly: true,
    cloudDirty: false,
    cloudRefreshRequired: false,
    cloudConflict: false,
  };
}

export function mergeLocalAndPrivateCloudDocuments(userId, localDocuments, cloudDocuments) {
  const remoteCloudIds = new Set((cloudDocuments || [])
    .map((metadata) => String(metadata?.id || metadata?.documentId || ""))
    .filter((cloudDocumentId) => CLOUD_DOCUMENT_ID_PATTERN.test(cloudDocumentId)));
  const localByCloudId = new Map(
    (localDocuments || [])
      .filter((documentRecord) => documentRecord?.cloudDocumentId)
      .map((documentRecord) => [documentRecord.cloudDocumentId, documentRecord]),
  );
  const merged = (localDocuments || []).filter((documentRecord) => (
    !documentRecord?.cloudDocumentId || remoteCloudIds.has(documentRecord.cloudDocumentId)
  ));
  for (const metadata of cloudDocuments || []) {
    const placeholder = privateCloudPlaceholder(userId, metadata);
    if (!placeholder) continue;
    const local = localByCloudId.get(placeholder.cloudDocumentId);
    if (!local) {
      merged.push(placeholder);
      continue;
    }
    const index = merged.findIndex((documentRecord) => documentRecord.id === local.id);
    if (index < 0) continue;
    const remoteVersionChanged = Boolean(
      placeholder.cloudVersionId
      && placeholder.cloudVersionId !== (local.cloudVersionId || ""),
    );
    merged[index] = {
      ...local,
      name: remoteVersionChanged ? placeholder.name : local.name,
      size: remoteVersionChanged ? placeholder.size : local.size,
      pageCount: remoteVersionChanged ? placeholder.pageCount : local.pageCount,
      updatedAt: remoteVersionChanged ? placeholder.updatedAt : local.updatedAt,
      cloudDocumentId: placeholder.cloudDocumentId,
      cloudVersionId: placeholder.cloudVersionId,
      cloudChecksumSha256: placeholder.cloudChecksumSha256,
      cloudUpdatedAt: placeholder.updatedAt,
      cloudOnly: false,
      cloudRefreshRequired: remoteVersionChanged,
      cloudConflict: remoteVersionChanged && Boolean(local.cloudDirty),
    };
  }
  return merged.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

export function shouldSyncPrivateCloudDocument({
  documentRecord,
  userId,
  cloudConfigured,
  offline,
}) {
  return Boolean(
    documentRecord?.id
    && userId
    && documentRecord.ownerId === userId
    && cloudConfigured
    && !offline
    && !documentRecord.cloudOnly
    && !documentRecord.cloudRefreshRequired
    && !documentRecord.cloudConflict
    && (documentRecord.cloudDirty || !documentRecord.cloudDocumentId),
  );
}

export function selectNextPrivateCloudSyncDocument({
  documents,
  userId,
  cloudConfigured,
  offline,
  attemptedKeys = new Set(),
}) {
  return (documents || []).find((documentRecord) => {
    const attemptKey = `${userId}:${documentRecord?.id || ""}`;
    const hasLocalContent = Boolean(
      documentRecord?.pdfDataUrl
      || (Array.isArray(documentRecord?.pages) && documentRecord.pages.length),
    );
    return hasLocalContent
      && !attemptedKeys.has(attemptKey)
      && shouldSyncPrivateCloudDocument({
        documentRecord,
        userId,
        cloudConfigured,
        offline,
      });
  }) || null;
}

export function privateCloudDocumentRequiresDownload(documentRecord) {
  return Boolean(
    documentRecord?.cloudDocumentId
    && (documentRecord.cloudOnly || documentRecord.cloudRefreshRequired),
  );
}

export function shouldNavigateBeforePrivateCloudDownload(view, documentRecord) {
  return privateCloudDocumentRequiresDownload(documentRecord)
    && view !== "editor"
    && view !== "public-editor";
}

export function replaceWithHydratedPrivateCloudDocument(documents, hydratedDocument) {
  if (!hydratedDocument?.id) return documents || [];
  return [
    hydratedDocument,
    ...(documents || []).filter((documentRecord) => documentRecord.id !== hydratedDocument.id),
  ];
}

export function applyPrivateCloudSaveResult(documentRecord, result, updatedAt = new Date().toISOString()) {
  return {
    ...documentRecord,
    cloudDocumentId: result.documentId,
    cloudVersionId: result.versionId,
    cloudChecksumSha256: result.checksumSha256,
    cloudUpdatedAt: result.updatedAt || updatedAt,
    cloudOnly: false,
    cloudDirty: false,
    cloudRefreshRequired: false,
    cloudConflict: false,
  };
}
