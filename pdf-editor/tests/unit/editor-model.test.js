import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { consolidatePdfSources, finalizePdfExport } from "../../src/editor/exportPdf.js";
import {
  EDITOR_MODE_TOOLS,
  activateEditorMode,
  commitEditorHistory,
  createEditorHistory,
  moveEditorObject,
  redoEditorHistory,
  resizeEditorObject,
  rotateEditorObject,
  rotateEditorObjectWithPage,
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

describe("shared normalized object interactions", () => {
  const object = { id: "a", x: 0.2, y: 0.2, w: 0.3, h: 0.1, rotation: 0 };

  it("moves and clamps objects to the page", () => {
    expect(moveEditorObject(object, { x: 0.9, y: -0.4 })).toMatchObject({ x: 0.7, y: 0 });
  });

  it("resizes objects and keeps them inside the page", () => {
    expect(resizeEditorObject(object, { w: 0.95, h: 0.95 })).toMatchObject({ w: 0.8, h: 0.8 });
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
    const range = visibleThumbnailRange({ scrollTop: 5800, viewportHeight: 700, pageCount: 1000 });
    expect(range.count).toBeLessThan(12);
    expect(range.start).toBeGreaterThan(0);
    expect(range.end).toBeLessThan(1000);
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
