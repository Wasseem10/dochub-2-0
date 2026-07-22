import { describe, expect, it, vi } from "vitest";
import { closePdfPrintTarget, createPdfPrintTarget, sendPdfToPrint } from "../../src/tools/pdfPrint.js";

function makePrintWindow() {
  const listeners = new Map();
  return {
    closed: false,
    document: { title: "", body: { innerHTML: "" } },
    location: {
      href: "about:blank",
      replace: vi.fn(function replace(value) { this.href = value; }),
    },
    addEventListener: vi.fn((name, handler) => listeners.set(name, handler)),
    removeEventListener: vi.fn((name) => listeners.delete(name)),
    dispatchLoad: () => listeners.get("load")?.(),
    focus: vi.fn(),
    print: vi.fn(),
    close: vi.fn(),
  };
}

describe("edited PDF printing", () => {
  it("opens a dedicated print target instead of printing the editor window", () => {
    const printWindow = makePrintWindow();
    const editorPrint = vi.fn();
    const windowObject = { open: vi.fn(() => printWindow), print: editorPrint };
    const target = createPdfPrintTarget({ windowObject });

    expect(target).toEqual({ type: "window", printWindow });
    expect(windowObject.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(editorPrint).not.toHaveBeenCalled();
    expect(printWindow.document.body.innerHTML).toContain("Preparing the edited PDF");
  });

  it("loads the generated PDF blob and invokes print on the PDF viewer", () => {
    const printWindow = makePrintWindow();
    const createObjectURL = vi.fn(() => "blob:edited-pdf");
    const revokeObjectURL = vi.fn();
    const timers = [];
    const setTimeout = vi.fn((handler, delay) => timers.push({ handler, delay }));
    const windowObject = { URL: { createObjectURL, revokeObjectURL }, setTimeout };
    const blob = new Blob(["pdf"], { type: "application/pdf" });

    sendPdfToPrint({ type: "window", printWindow }, blob, { windowObject, revokeDelay: 1000 });

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(printWindow.location.replace).toHaveBeenCalledWith("blob:edited-pdf");
    expect(printWindow.print).not.toHaveBeenCalled();
    printWindow.dispatchLoad();
    timers.find((timer) => timer.delay === 350).handler();
    expect(printWindow.print).toHaveBeenCalledTimes(1);
    timers.find((timer) => timer.delay === 1000).handler();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:edited-pdf");
  });

  it("never falls back to printing the editor page when pop-ups are blocked", () => {
    const editorPrint = vi.fn();
    const windowObject = { open: vi.fn(() => null), print: editorPrint };
    expect(createPdfPrintTarget({ windowObject })).toBeNull();
    expect(editorPrint).not.toHaveBeenCalled();
  });

  it("closes a preparation window when PDF export fails", () => {
    const printWindow = makePrintWindow();
    closePdfPrintTarget({ type: "window", printWindow });
    expect(printWindow.close).toHaveBeenCalledTimes(1);
  });
});
