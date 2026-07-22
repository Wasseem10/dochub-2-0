const OBJECT_URL_LIFETIME_MS = 120_000;

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

export function sendPdfToPrint(target, pdfBlob, {
  windowObject = window,
  revokeDelay = OBJECT_URL_LIFETIME_MS,
} = {}) {
  if (!target || !pdfBlob) throw new Error("A PDF and print target are required.");
  const objectUrl = windowObject.URL.createObjectURL(pdfBlob);
  const printWindow = target.printWindow;
  let printRequested = false;

  const requestPrint = () => {
    if (printRequested) return;
    printRequested = true;
    try {
      printWindow?.focus?.();
      printWindow?.print?.();
    } catch {
      // The PDF viewer remains open so the user can use its native Print control.
    }
  };

  const handlePdfLoad = () => {
    let loadedUrl = "";
    try { loadedUrl = printWindow.location.href; } catch { /* The native viewer can briefly hide its URL. */ }
    if (loadedUrl !== objectUrl) return;
    printWindow.removeEventListener?.("load", handlePdfLoad);
    windowObject.setTimeout(requestPrint, 350);
  };

  // Navigate before listening so the initial about:blank load can never trigger page printing.
  printWindow.location.replace(objectUrl);
  printWindow.addEventListener?.("load", handlePdfLoad);

  windowObject.setTimeout(() => {
    windowObject.URL.revokeObjectURL(objectUrl);
  }, revokeDelay);

  return objectUrl;
}
