function syncRevision(documentRecord) {
  if (!documentRecord?.id) return "";
  return JSON.stringify([
    documentRecord.updatedAt || "",
    documentRecord.name || "",
    documentRecord.size || 0,
    documentRecord.pageCount || documentRecord.pages?.length || 0,
    documentRecord.status || "",
    documentRecord.location || "",
    Boolean(documentRecord.favorite),
  ]);
}

export function planCloudDocumentSync(previousDocuments = [], nextDocuments = []) {
  const previousById = new Map(
    previousDocuments
      .filter((documentRecord) => documentRecord?.id)
      .map((documentRecord) => [documentRecord.id, documentRecord]),
  );
  const nextIds = new Set(
    nextDocuments
      .filter((documentRecord) => documentRecord?.id)
      .map((documentRecord) => documentRecord.id),
  );

  const uploads = nextDocuments.filter((documentRecord) => {
    if (!documentRecord?.id) return false;
    const previousDocument = previousById.get(documentRecord.id);
    return !previousDocument || syncRevision(previousDocument) !== syncRevision(documentRecord);
  });
  const deletes = previousDocuments.filter(
    (documentRecord) => documentRecord?.id && !nextIds.has(documentRecord.id),
  );

  return { uploads, deletes };
}

export async function runWithConcurrency(tasks, concurrency = 3) {
  if (!tasks.length) return;
  const queue = tasks.slice();
  const workerCount = Math.min(Math.max(1, concurrency), queue.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length) {
      const task = queue.shift();
      await task();
    }
  });
  await Promise.all(workers);
}
