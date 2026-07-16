import { performance } from "node:perf_hooks";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { validateEditorPageCount } from "../../src/config/editorLimits.js";

describe("representative editor PDF performance", () => {
  it("creates and inspects the supported 100-page boundary without an unbounded loop", async () => {
    const started = performance.now();
    const document = await PDFDocument.create();
    for (let index = 0; index < 100; index += 1) document.addPage([612, 792]);
    const bytes = await document.save();
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(100);
    expect(validateEditorPageCount(loaded.getPageCount())).toBeNull();
    expect(performance.now() - started).toBeLessThan(5000);
  });
});
