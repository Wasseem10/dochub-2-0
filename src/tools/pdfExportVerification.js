function signatureAnnotationsByPage(annotations = []) {
  const pages = new Map();
  annotations
    .filter((annotation) => ["signature", "initials"].includes(annotation?.type))
    .forEach((annotation) => {
      const pageIndex = Math.max(0, Number(annotation.page) || 0);
      const page = pages.get(pageIndex) || { typed: [], images: 0 };
      if (annotation.imageDataUrl) page.images += 1;
      else if (String(annotation.content || "").trim()) page.typed.push(String(annotation.content).trim());
      pages.set(pageIndex, page);
    });
  return pages;
}

function countPaintedImages(operatorList, operations = {}) {
  const imageOperations = new Set([
    operations.paintImageXObject,
    operations.paintImageMaskXObject,
    operations.paintInlineImageXObject,
    operations.paintSolidColorImageMask,
  ].filter((value) => Number.isInteger(value)));
  return (operatorList?.fnArray || []).filter((operation) => imageOperations.has(operation)).length;
}

export async function verifySignedPdfExport({
  bytes,
  annotations = [],
  getDocument,
  operations,
}) {
  const expectedByPage = signatureAnnotationsByPage(annotations);
  const expectedCount = [...expectedByPage.values()].reduce(
    (total, page) => total + page.images + page.typed.length,
    0,
  );
  if (!expectedCount) return { ok: true, verifiedCount: 0, pageCount: 0 };
  if (typeof getDocument !== "function") throw new Error("A PDF document loader is required for signed export verification.");

  const loadingTask = getDocument({ data: bytes.slice(0), disableWorker: true, verbosity: 0 });
  const pdf = await loadingTask.promise;
  try {
    let verifiedCount = 0;
    for (const [pageIndex, expected] of expectedByPage) {
      if (pageIndex >= pdf.numPages) throw new Error(`Signed page ${pageIndex + 1} is missing from the export.`);
      const page = await pdf.getPage(pageIndex + 1);
      if (expected.typed.length) {
        const textContent = await page.getTextContent();
        const extractedText = textContent.items.map((item) => item.str).join(" ");
        expected.typed.forEach((content) => {
          if (!extractedText.includes(content)) {
            throw new Error(`Typed signature on page ${pageIndex + 1} could not be verified.`);
          }
          verifiedCount += 1;
        });
      }
      if (expected.images) {
        const paintedImages = countPaintedImages(await page.getOperatorList(), operations);
        if (paintedImages < expected.images) {
          throw new Error(`Image signature on page ${pageIndex + 1} could not be verified.`);
        }
        verifiedCount += expected.images;
      }
    }
    return { ok: verifiedCount === expectedCount, verifiedCount, pageCount: pdf.numPages };
  } finally {
    if (typeof pdf.destroy === "function") await pdf.destroy();
    else if (typeof pdf.cleanup === "function") pdf.cleanup();
  }
}
