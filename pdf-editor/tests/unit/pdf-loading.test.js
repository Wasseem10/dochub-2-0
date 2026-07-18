import { describe, expect, it, vi } from "vitest";
import { createPdfDocumentController } from "../../src/editor/pdfDocumentController.mjs";
import { runProgressivePageQueue } from "../../src/editor/pdfProgressiveLoader.mjs";
import { configurePdfRuntime, getPdfWorkerSource } from "../../src/editor/pdfRuntime.mjs";

describe("PDF worker runtime", () => {
  it("configures PDF.js with the Vite-managed worker asset", async () => {
    const runtime = { GlobalWorkerOptions: { workerSrc: "" } };
    configurePdfRuntime(runtime);
    expect(getPdfWorkerSource()).toMatch(/pdf\.worker.*\.mjs/);
    expect(runtime.GlobalWorkerOptions.workerSrc).toBe(getPdfWorkerSource());
  });

  it("reuses one document session for page metadata", async () => {
    const getPage = vi.fn(async (pageNumber) => ({
      rotate: 0,
      getTextContent: async () => ({ items: [{ str: pageNumber === 1 ? "First page" : "Second page" }] }),
      getViewport: ({ scale }) => ({ width: 300 * scale, height: 500 * scale }),
    }));
    const destroy = vi.fn(async () => undefined);
    const runtime = Promise.resolve({
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({ numPages: 2, getPage }),
        destroy,
      })),
    });
    const controller = await createPdfDocumentController(new Uint8Array([1, 2, 3]), { runtime });
    expect(controller.numPages).toBe(2);
    await expect(controller.getTextData(1)).resolves.toMatchObject({ text: "First page", rotation: 0 });
    await controller.getTextData(1);
    await expect(controller.getTextData(2)).resolves.toMatchObject({ text: "Second page", rotation: 0 });
    await controller.destroy();
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("keeps the rendered preview cache bounded with least-recently-used eviction", async () => {
    const renderedPages = [];
    const getPage = vi.fn(async (pageNumber) => ({
      getViewport: () => ({ width: 120, height: 160 }),
      render: () => ({ promise: Promise.resolve(renderedPages.push(pageNumber)) }),
      cleanup: vi.fn(),
    }));
    const runtime = Promise.resolve({
      getDocument: () => ({
        promise: Promise.resolve({ numPages: 3, getPage }),
        destroy: async () => undefined,
      }),
    });
    const canvasFactory = () => ({
      width: 0,
      height: 0,
      getContext: () => ({}),
      toDataURL: () => "data:image/png;base64,preview",
    });
    const controller = await createPdfDocumentController(new Uint8Array([1]), {
      runtime,
      canvasFactory,
      maxCachedPreviews: 2,
    });

    await controller.renderPreview(1);
    await controller.renderPreview(2);
    await controller.renderPreview(1);
    await controller.renderPreview(3);
    await controller.renderPreview(2);

    expect(renderedPages).toEqual([1, 2, 3, 2]);
    await controller.destroy();
  });
});

describe("progressive page processing", () => {
  it("publishes small batches and yields between them", async () => {
    const batches = [];
    const yieldControl = vi.fn(async () => undefined);
    const result = await runProgressivePageQueue({
      pageNumbers: [2, 3, 4, 5, 6],
      batchSize: 2,
      loadPage: async (pageNumber) => ({ pageNumber }),
      onBatch: async (batch) => batches.push(batch.map((page) => page.pageNumber)),
      yieldControl,
    });

    expect(result).toEqual({ status: "complete", processed: 5 });
    expect(batches).toEqual([[2, 3], [4, 5], [6]]);
    expect(yieldControl).toHaveBeenCalledTimes(2);
  });

  it("stops cleanly when a newer upload replaces the current one", async () => {
    let active = true;
    const loaded = [];
    const result = await runProgressivePageQueue({
      pageNumbers: [2, 3, 4],
      batchSize: 1,
      shouldContinue: () => active,
      loadPage: async (pageNumber) => {
        loaded.push(pageNumber);
        return pageNumber;
      },
      onBatch: async () => {
        active = false;
      },
      yieldControl: async () => undefined,
    });

    expect(result).toEqual({ status: "cancelled", processed: 1 });
    expect(loaded).toEqual([2]);
  });
});
