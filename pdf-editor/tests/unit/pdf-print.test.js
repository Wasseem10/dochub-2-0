import { describe, expect, it, vi } from "vitest";
import { closePdfPrintTarget, createPdfPrintTarget, renderPdfDocumentForPrint } from "../../src/tools/pdfPrint.js";

function makePrintTarget() {
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
});
