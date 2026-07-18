export function yieldToMainThread() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function runProgressivePageQueue({
  pageNumbers,
  batchSize = 3,
  loadPage,
  onBatch,
  onProgress,
  shouldContinue = () => true,
  yieldControl = yieldToMainThread,
}) {
  let batch = [];
  let processed = 0;

  for (const pageNumber of pageNumbers) {
    if (!shouldContinue()) return { status: "cancelled", processed };
    batch.push(await loadPage(pageNumber));
    processed += 1;
    onProgress?.({ processed, total: pageNumbers.length, pageNumber });

    if (batch.length >= batchSize) {
      await onBatch(batch);
      batch = [];
      await yieldControl();
    }
  }

  if (batch.length && shouldContinue()) await onBatch(batch);
  return { status: shouldContinue() ? "complete" : "cancelled", processed };
}
