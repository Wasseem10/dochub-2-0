function renderPreparingState(printWindow) {
  try {
    printWindow.document.title = "Preparing PDF to print";
    printWindow.document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;margin:0;padding:24px;font:600 16px/1.5 system-ui,sans-serif;color:#172033;background:#f7f9fc;text-align:center">
        Preparing the edited PDF for printing&hellip;
      </main>
    `;
  } catch {
    // A browser may restrict access to a newly opened window before it navigates.
  }
}

export function createPdfPrintTarget({ windowObject = window } = {}) {
  const printWindow = windowObject.open("about:blank", "_blank");
  if (printWindow && !printWindow.closed) {
    renderPreparingState(printWindow);
    return { type: "window", printWindow };
  }
  return null;
}

export function closePdfPrintTarget(target) {
  if (target?.type === "window") {
    try { target.printWindow.close(); } catch { /* The print window may already be gone. */ }
    return;
  }
  target?.iframe?.remove?.();
}

function canvasBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function waitForImage(image) {
  if (image.complete) return Promise.resolve();
  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", reject, { once: true });
  });
}

export async function renderPdfDocumentForPrint(target, pdfDocument, { windowObject = window } = {}) {
  if (!target?.printWindow || !pdfDocument?.numPages) throw new Error("A loaded PDF and print window are required.");
  const printWindow = target.printWindow;
  const printDocument = printWindow.document;
  const objectUrls = [];
  const namedPageRules = [];

  printDocument.open();
  printDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print PDF</title><style>
    *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}.pdf-print-document{margin:0;padding:0}.pdf-print-page{display:block;margin:0;overflow:hidden;break-after:page;page-break-after:always;background:#fff}.pdf-print-page:last-child{break-after:auto;page-break-after:auto}.pdf-print-page img{display:block;width:100%;height:100%;object-fit:fill}@media screen{body{padding:24px;background:#667085}.pdf-print-page{margin:0 auto 24px;box-shadow:0 8px 30px rgba(0,0,0,.25)}}@media print{html,body,.pdf-print-document{margin:0!important;padding:0!important}.pdf-print-page{margin:0!important;box-shadow:none!important}}
  </style></head><body><main id="pdf-print-document" class="pdf-print-document" aria-label="PDF pages"></main></body></html>`);
  printDocument.close();
  const container = printDocument.getElementById("pdf-print-document");

  for (let index = 0; index < pdfDocument.numPages; index += 1) {
    const page = await pdfDocument.getPage(index + 1);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderScale = pdfDocument.numPages > 40 ? 1.25 : pdfDocument.numPages > 15 ? 1.5 : 2;
    const viewport = page.getViewport({ scale: renderScale });
    const pageName = `pdfPage${index + 1}`;
    const widthInches = Math.max(1, baseViewport.width / 72);
    const heightInches = Math.max(1, baseViewport.height / 72);
    namedPageRules.push(`@page ${pageName}{size:${widthInches}in ${heightInches}in;margin:0}.pdf-print-page-${index + 1}{page:${pageName}}`);

    const section = printDocument.createElement("section");
    section.className = `pdf-print-page pdf-print-page-${index + 1}`;
    section.style.width = `${widthInches}in`;
    section.style.height = `${heightInches}in`;
    const canvas = printDocument.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, background: "#ffffff" }).promise;

    const blob = await canvasBlob(canvas);
    if (!blob) throw new Error(`Page ${index + 1} could not be prepared for printing.`);
    const objectUrl = windowObject.URL.createObjectURL(blob);
    objectUrls.push(objectUrl);
    const image = printDocument.createElement("img");
    image.alt = `PDF page ${index + 1}`;
    image.src = objectUrl;
    section.appendChild(image);
    container.appendChild(section);
    await waitForImage(image);
    page.cleanup?.();
  }

  const pageStyle = printDocument.createElement("style");
  pageStyle.textContent = namedPageRules.join("\n");
  printDocument.head.appendChild(pageStyle);
  await printDocument.fonts?.ready;

  const cleanup = () => {
    objectUrls.forEach((url) => windowObject.URL.revokeObjectURL(url));
    pdfDocument.destroy?.();
    try { printWindow.close(); } catch { /* The user may already have closed it. */ }
  };
  printWindow.addEventListener?.("afterprint", cleanup, { once: true });
  printWindow.focus?.();
  printWindow.print();
}
