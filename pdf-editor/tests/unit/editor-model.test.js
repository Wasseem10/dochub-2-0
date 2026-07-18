import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { consolidatePdfSources, finalizePdfExport } from "../../src/editor/exportPdf.js";
import { createEditorClipboardPayload, createPastedEditorObject, editorClipboardPlainText, parseEditorClipboardPayload } from "../../src/editor/editorClipboard.mjs";
import {
  EDITOR_MODE_TOOLS,
  activateEditorMode,
  commitEditorHistory,
  createEditorHistory,
  moveEditorObject,
  redoEditorHistory,
  resizeEditorObject,
  resizeEditorObjectFromHandle,
  rotateEditorObject,
  rotateEditorObjectWithPage,
  thumbnailScrollTarget,
  unrotateEditorObjectFromPage,
  undoEditorHistory,
  visibleThumbnailRange,
} from "../../src/editor/editorModel.js";

describe("editor tool activation", () => {
  it("keeps only working tools in each requested mode", () => {
    expect(Object.keys(EDITOR_MODE_TOOLS)).toEqual(["view", "annotate", "shapes", "insert", "edit", "fill"]);
    expect(activateEditorMode("annotate", "select")).toBe("highlight");
    expect(activateEditorMode("fill", "signature")).toBe("signature");
  });
});

describe("editor object clipboard", () => {
  it("copies and offsets a drawing onto the active page without mutating the source", () => {
    const annotation = { id: "draw-1", type: "draw", page: 0, points: [{ x: 0.2, y: 0.3 }], color: "#155ee8" };
    const payload = createEditorClipboardPayload({ annotation });
    const pasted = createPastedEditorObject(payload, { id: "draw-2", pageIndex: 4, pasteCount: 2 });
    expect(pasted).toMatchObject({ id: "draw-2", page: 4, points: [{ x: 0.25, y: 0.35 }] });
    expect(annotation.points[0]).toEqual({ x: 0.2, y: 0.3 });
  });

  it("copies detected PDF text as an independent text annotation", () => {
    const payload = createEditorClipboardPayload({
      detectedText: { pageNumber: 1, x: 0.8, y: 0.9, w: 0.18, h: 0.08, currentText: "Invoice total", fontSize: 12 },
    });
    const pasted = createPastedEditorObject(JSON.stringify(payload), { id: "text-2", pageIndex: 2 });
    expect(pasted).toMatchObject({ id: "text-2", type: "text", page: 2, content: "Invoice total", x: 0.82, y: 0.92 });
    expect(editorClipboardPlainText(payload)).toBe("Invoice total");
  });

  it("rejects malformed or foreign clipboard data", () => {
    expect(parseEditorClipboardPayload("not-json")).toBeNull();
    expect(parseEditorClipboardPayload(JSON.stringify({ version: 2, kind: "annotation", object: {} }))).toBeNull();
  });
});

describe("shared normalized object interactions", () => {
  const object = { id: "a", x: 0.2, y: 0.2, w: 0.3, h: 0.1, rotation: 0 };

  it("moves and clamps objects to the page", () => {
    expect(moveEditorObject(object, { x: 0.9, y: -0.4 })).toMatchObject({ x: 0.7, y: 0 });
  });

  it("resizes objects and keeps them inside the page", () => {
    expect(resizeEditorObject(object, { w: 0.95, h: 0.95 })).toMatchObject({ w: 0.8, h: 0.8 });
  });

  it("resizes from west and north while keeping the opposite edges fixed", () => {
    expect(resizeEditorObjectFromHandle(object, "w", { x: 0.1, y: 0 })).toMatchObject({ x: 0.3, w: 0.2 });
    expect(resizeEditorObjectFromHandle(object, "n", { x: 0, y: 0.04 })).toMatchObject({ y: 0.24, h: 0.06 });
  });

  it("interprets handle movement in the rotated object's local axes", () => {
    const rotated = { ...object, rotation: 90 };
    expect(resizeEditorObjectFromHandle(rotated, "e", { x: 0, y: 0.1 })).toMatchObject({ x: 0.2, y: 0.2, w: 0.4, h: 0.1 });
  });

  it("enforces minimum size and page bounds for every resize direction", () => {
    expect(resizeEditorObjectFromHandle(object, "nw", { x: 0.8, y: 0.8 })).toMatchObject({ x: 0.47, y: 0.282, w: 0.03, h: 0.018 });
    expect(resizeEditorObjectFromHandle(object, "se", { x: 1, y: 1 })).toMatchObject({ x: 0.2, y: 0.2, w: 0.8, h: 0.8 });
  });

  it("rotates objects without changing normalized geometry", () => {
    expect(rotateEditorObject(object, -90)).toMatchObject({ x: 0.2, y: 0.2, w: 0.3, h: 0.1, rotation: 270 });
  });

  it("remaps object and drawing coordinates when a page rotates", () => {
    const rotated = rotateEditorObjectWithPage(object);
    expect(rotated).toMatchObject({ x: 0.7, y: 0.2, w: 0.1, h: 0.3, rotation: 90 });
    expect(unrotateEditorObjectFromPage(rotated, 90)).toEqual(object);
    expect(rotateEditorObjectWithPage({ points: [{ x: 0.2, y: 0.3 }] }).points[0]).toEqual({ x: 0.7, y: 0.2 });
  });
});

describe("editor history", () => {
  it("undoes and redoes complete editing actions", () => {
    const initial = { objects: [] };
    const changed = { objects: [{ id: "a" }] };
    const committed = commitEditorHistory(createEditorHistory(initial), changed);
    const undone = undoEditorHistory(committed);
    expect(undone.present).toEqual(initial);
    expect(redoEditorHistory(undone).present).toEqual(changed);
  });
});

describe("large-document thumbnail performance", () => {
  it("limits a 1,000-page document to the visible window plus overscan", () => {
    const range = visibleThumbnailRange({ scrollTop: 5800, viewportHeight: 700, itemHeight: 130, pageCount: 1000, overscan: 3 });
    expect(range.count).toBeLessThanOrEqual(12);
    expect(range.start).toBeGreaterThan(0);
    expect(range.end).toBeLessThan(1000);
  });

  it("keeps a 10,000-page document bounded to a small mounted window", () => {
    const range = visibleThumbnailRange({ scrollTop: 650000, viewportHeight: 780, itemHeight: 130, pageCount: 10000, overscan: 3 });
    expect(range).toEqual({ start: 4997, end: 5009, count: 12 });
  });

  it("scrolls a programmatically selected page into the thumbnail viewport", () => {
    expect(thumbnailScrollTarget({ selectedIndex: 50, scrollTop: 0, viewportHeight: 650, itemHeight: 130, pageCount: 100 })).toBe(5980);
    expect(thumbnailScrollTarget({ selectedIndex: 3, scrollTop: 0, viewportHeight: 650, itemHeight: 130, pageCount: 100 })).toBeNull();
    expect(thumbnailScrollTarget({ selectedIndex: 1, scrollTop: 520, viewportHeight: 650, itemHeight: 130, pageCount: 100 })).toBe(130);
  });
});

describe("editor PDF export", () => {
  it("produces a loadable PDF blob with a stable edited filename", async () => {
    const document = await PDFDocument.create();
    document.addPage([612, 792]);
    const result = await finalizePdfExport(document, "agreement.pdf");
    const reloaded = await PDFDocument.load(result.bytes);
    expect(result.name).toBe("agreement-edited.pdf");
    expect(result.blob.type).toBe("application/pdf");
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("consolidates reordered source pages and appended pages into one export source", async () => {
    const base = await PDFDocument.create();
    base.addPage([200, 400]);
    base.addPage([300, 500]);
    const appended = await PDFDocument.create();
    appended.addPage([600, 800]);
    const bytes = await consolidatePdfSources({
      baseBytes: await base.save(),
      pages: [
        { source: "pdf", originalIndex: 1, width: 300, height: 500 },
        { source: "pdf", originalIndex: 0, width: 200, height: 400 },
      ],
      appendBytes: await appended.save(),
    });
    const result = await PDFDocument.load(bytes);
    expect(result.getPages().map((page) => page.getWidth())).toEqual([300, 200, 600]);
  });
});
