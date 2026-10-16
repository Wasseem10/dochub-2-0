import { describe, expect, it, vi } from "vitest";
import { closePdfPrintTarget, createPdfPrintTarget, renderPdfDocumentForPrint } from "../../src/tools/pdfPrint.js";

function makePrintTarget({ imageState = "loaded" } = {}) {
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
      removeEventListener: vi.fn((name) => elementListeners.delete(name)),
      getContext: vi.fn(() => ({ fillStyle: "", fillRect: vi.fn() })),
      toBlob: vi.fn((callback) => callback(new Blob(["page"], { type: "image/png" }))),
      set src(value) {
        this._src = value;
        this.complete = imageState !== "pending";
        this.naturalWidth = imageState === "loaded" ? 612 : 0;
      },
      get src() { return this._src; },
    };
    return element;
  });
  const printWindow = {
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
  const iframe = {
    contentWindow: printWindow,
    style: {},
    setAttribute: vi.fn(),
    remove: vi.fn(),
  };
  const editorDocument = {
    body: { appendChild: vi.fn() },
    createElement: vi.fn(() => iframe),
  };
  return { printWindow, iframe, editorDocument };
}

describe("edited PDF printing", () => {
  it("creates an invisible print frame inside the editor instead of opening a tab", () => {
    const { printWindow, iframe, editorDocument } = makePrintTarget();
    const editorPrint = vi.fn();
    const windowObject = { document: editorDocument, open: vi.fn(), print: editorPrint };
    const target = createPdfPrintTarget({ windowObject });

    expect(target).toEqual({ type: "iframe", iframe, printWindow });
    expect(editorDocument.body.appendChild).toHaveBeenCalledWith(iframe);
    expect(windowObject.open).not.toHaveBeenCalled();
    expect(editorPrint).not.toHaveBeenCalled();
    expect(iframe.style.position).toBe("fixed");
    expect(iframe.style.width).toBe("0");
  });

  it("renders only PDF pages into a dedicated document before invoking print", async () => {
    const { printWindow, iframe } = makePrintTarget();
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

    await renderPdfDocumentForPrint({ type: "iframe", iframe, printWindow }, pdfDocument, { windowObject });

    expect(render).toHaveBeenCalledTimes(1);
    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining("pdf-print-document"));
    expect(printWindow.elements).toHaveLength(1);
    expect(printWindow.print).toHaveBeenCalledTimes(1);
    expect(printWindow.location.replace).not.toHaveBeenCalled();
  });

  it("never falls back to printing the editor page when a frame cannot be created", () => {
    const editorPrint = vi.fn();
    const windowObject = { document: null, print: editorPrint };
    expect(createPdfPrintTarget({ windowObject })).toBeNull();
    expect(editorPrint).not.toHaveBeenCalled();
  });

  it("removes the print frame when PDF export fails", () => {
    const { printWindow, iframe } = makePrintTarget();
    closePdfPrintTarget({ type: "iframe", iframe, printWindow });
    expect(iframe.remove).toHaveBeenCalledTimes(1);
  });

  it("releases earlier pages and the PDF when a later print page fails", async () => {
    const { printWindow, iframe } = makePrintTarget();
    const windowObject = { URL: { createObjectURL: vi.fn(() => "blob:first-page"), revokeObjectURL: vi.fn() } };
    const cleanup = vi.fn();
    const pdfDocument = {
      numPages: 2,
      getPage: vi.fn(async (number) => ({
        getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
        render: () => ({ promise: number === 2 ? Promise.reject(new Error("Synthetic rendering failure")) : Promise.resolve() }),
        cleanup,
      })),
      destroy: vi.fn(),
    };
    await expect(renderPdfDocumentForPrint({ iframe, printWindow }, pdfDocument, { windowObject })).rejects.toThrow();
    expect(windowObject.URL.revokeObjectURL).toHaveBeenCalledWith("blob:first-page");
    expect(pdfDocument.destroy).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(iframe.remove).toHaveBeenCalledTimes(1);
    expect(printWindow.print).not.toHaveBeenCalled();
    const canvases = printWindow.document.createElement.mock.results.map(({ value }) => value).filter((element) => element.tagName === "canvas");
    expect(canvases.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true);
  });

  it.each(["broken", "pending"])("rejects a %s print image and releases its resources", async (imageState) => {
    vi.useFakeTimers();
    try {
      const { printWindow, iframe } = makePrintTarget({ imageState });
      const windowObject = { URL: { createObjectURL: vi.fn(() => "blob:bad-image"), revokeObjectURL: vi.fn() } };
      const pdfDocument = {
        numPages: 1,
        getPage: async () => ({
          getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
          render: () => ({ promise: Promise.resolve() }),
          cleanup: vi.fn(),
        }),
        destroy: vi.fn(),
      };
      const result = renderPdfDocumentForPrint({ iframe, printWindow }, pdfDocument, { windowObject });
      const rejection = expect(result).rejects.toThrow("could not be prepared for printing");
      await vi.runAllTimersAsync();
      await rejection;
      expect(windowObject.URL.revokeObjectURL).toHaveBeenCalledWith("blob:bad-image");
      expect(pdfDocument.destroy).toHaveBeenCalledTimes(1);
      expect(iframe.remove).toHaveBeenCalledTimes(1);
      expect(printWindow.print).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cleans a completed print target only once on repeated afterprint events and close", async () => {
    const { printWindow, iframe } = makePrintTarget();
    const windowObject = { URL: { createObjectURL: vi.fn(() => "blob:printed"), revokeObjectURL: vi.fn() } };
    const pdfDocument = {
      numPages: 1,
      getPage: async () => ({
        getViewport: ({ scale }) => ({ width: 612 * scale, height: 792 * scale }),
        render: () => ({ promise: Promise.resolve() }),
        cleanup: vi.fn(),
      }),
      destroy: vi.fn(),
    };
    const target = { iframe, printWindow };
    await renderPdfDocumentForPrint(target, pdfDocument, { windowObject });
    const onAfterPrint = printWindow.addEventListener.mock.calls.find(([name]) => name === "afterprint")[1];
    onAfterPrint();
    onAfterPrint();
    closePdfPrintTarget(target);
    await Promise.resolve();
    expect(windowObject.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(pdfDocument.destroy).toHaveBeenCalledTimes(1);
  });
});
