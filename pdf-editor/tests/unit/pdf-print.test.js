import { describe, expect, it, vi } from "vitest";
import { closePdfPrintTarget, createPdfPrintTarget, renderPdfDocumentForPrint } from "../../src/tools/pdfPrint.js";

function makePrintWindow() {
  const listeners = new Map();
  const elements = [];
  const container = { appendChild: vi.fn((element) => elements.push(element)) };
  const createElement = vi.fn((tagName) => {
    const elementListeners = new Map();
    const element = {
      tagName,
      style: {},
      appendChild: vi.fn(),
      addEventListener: vi.fn((name, handler) => elementListeners.set(name, handler)),
      getContext: vi.fn(() => ({ fillStyle: "", fillRect: vi.fn() })),
      toBlob: vi.fn((callback) => callback(new Blob(["page"], { type: "image/png" }))),
      set src(value) {
        this._src = value;
        this.complete = true;
      },
      get src() { return this._src; },
    };
    return element;
  });
  return {
    closed: false,
    document: {
      title: "",
      body: { innerHTML: "" },
      head: { appendChild: vi.fn() },
      fonts: { ready: Promise.resolve() },
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      createElement,
      getElementById: vi.fn(() => container),
    },
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
    elements,
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

  it("renders only PDF pages into a dedicated document before invoking print", async () => {
    const printWindow = makePrintWindow();
    const createObjectURL = vi.fn(() => "blob:rendered-page");
    const revokeObjectURL = vi.fn();
    const windowObject = { URL: { createObjectURL, revokeObjectURL } };
    const render = vi.fn(() => ({ promise: Promise.resolve() }));
    const pdfDocument = {
      numPages: 1,
      getPage: vi.fn(async () => ({
        getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
        render,
        cleanup: vi.fn(),
      })),
      destroy: vi.fn(),
    };

    await renderPdfDocumentForPrint({ type: "window", printWindow }, pdfDocument, { windowObject });

    expect(render).toHaveBeenCalledTimes(1);
    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining("pdf-print-document"));
    expect(printWindow.elements).toHaveLength(1);
    expect(printWindow.print).toHaveBeenCalledTimes(1);
    expect(printWindow.location.replace).not.toHaveBeenCalled();
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
