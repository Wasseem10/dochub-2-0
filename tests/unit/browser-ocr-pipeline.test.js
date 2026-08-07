import { describe, expect, it, vi } from "vitest";
import {
  createOpenCvWorkerPreprocessor,
  preprocessCanvasWithOpenCv,
  runLocalPdfOcr,
} from "../../src/tools/browserOcrPipeline.js";

function fakeCanvas() {
  return {
    width: 0,
    height: 0,
    getContext: () => ({ fillStyle: "", fillRect: vi.fn() }),
  };
}

function fakeOpenCv() {
  const mats = [];
  class Mat {
    constructor() {
      this.delete = vi.fn();
      mats.push(this);
    }
  }
  return {
    mats,
    Mat,
    COLOR_RGBA2GRAY: 1,
    COLOR_GRAY2RGBA: 2,
    imread: vi.fn(() => new Mat()),
    cvtColor: vi.fn(),
    equalizeHist: vi.fn(),
    imshow: vi.fn(),
  };
}

describe("browser OCR pipeline", () => {
  it("uses OpenCV grayscale and histogram equalization and releases every Mat", () => {
    const cv = fakeOpenCv();
    const source = { width: 300, height: 400 };
    const output = preprocessCanvasWithOpenCv(source, cv, fakeCanvas);

    expect(output).toMatchObject({ width: 300, height: 400 });
    expect(cv.cvtColor).toHaveBeenNthCalledWith(1, expect.anything(), expect.anything(), cv.COLOR_RGBA2GRAY);
    expect(cv.equalizeHist).toHaveBeenCalledOnce();
    expect(cv.cvtColor).toHaveBeenNthCalledWith(2, expect.anything(), expect.anything(), cv.COLOR_GRAY2RGBA);
    expect(cv.imshow).toHaveBeenCalledWith(output, expect.anything());
    expect(cv.mats).toHaveLength(4);
    expect(cv.mats.every((mat) => mat.delete.mock.calls.length === 1)).toBe(true);
  });

  it("falls back to local pixel cleanup when OpenCV initialization exceeds its budget", async () => {
    const listeners = {};
    const worker = {
      addEventListener: (name, listener) => { listeners[name] = listener; },
      postMessage: vi.fn(),
      terminate: vi.fn(),
    };
    const putImageData = vi.fn();
    const source = {
      width: 2,
      height: 1,
      getContext: () => ({
        getImageData: () => ({ width: 2, height: 1, data: new Uint8ClampedArray([90, 90, 90, 255, 210, 210, 210, 255]) }),
      }),
    };
    const originalImageData = globalThis.ImageData;
    globalThis.ImageData = class ImageData {
      constructor(data, width, height) { this.data = data; this.width = width; this.height = height; }
    };
    try {
      const preprocessor = createOpenCvWorkerPreprocessor({
        workerFactory: () => worker,
        initializationTimeoutMs: 1,
        createCanvas: () => ({ width: 0, height: 0, getContext: () => ({ putImageData }) }),
      });
      const output = await preprocessor.process(source);
      expect(output).toMatchObject({ width: 2, height: 1 });
      expect(worker.postMessage).toHaveBeenCalledOnce();
      expect(worker.terminate).toHaveBeenCalledOnce();
      expect(putImageData).toHaveBeenCalledOnce();
      preprocessor.dispose();
    } finally {
      globalThis.ImageData = originalImageData;
    }
  });

  it("chains rendered pages into Tesseract and returns page-cited text in memory", async () => {
    const cv = fakeOpenCv();
    const pageCleanup = vi.fn();
    const documentDestroy = vi.fn();
    const terminate = vi.fn();
    const recognize = vi.fn(async () => ({ data: { text: "Invoice total $42", confidence: 94, blocks: [] } }));
    const progress = vi.fn();
    const dispose = vi.fn();

    const result = await runLocalPdfOcr({
      sourceBytes: Uint8Array.from([1, 2, 3]),
      language: "eng",
      createCanvas: fakeCanvas,
      openCvPreprocessorFactory: () => ({
        process: async (canvas) => preprocessCanvasWithOpenCv(canvas, cv, fakeCanvas),
        dispose,
      }),
      pdfjsLoader: async () => ({
        getDocument: () => ({ promise: Promise.resolve({
          numPages: 1,
          getPage: async () => ({
            getViewport: ({ scale }) => ({ width: 100 * scale, height: 120 * scale }),
            render: () => ({ promise: Promise.resolve() }),
            cleanup: pageCleanup,
          }),
          destroy: documentDestroy,
        }) }),
      }),
      tesseractLoader: async () => ({
        createWorker: async () => ({ setParameters: vi.fn(), recognize, terminate }),
      }),
      onProgress: progress,
    });

    expect(result).toMatchObject({ source: "ocr", pageCount: 1, language: "eng" });
    expect(result.pages).toEqual([expect.objectContaining({ pageNumber: 1, text: "Invoice total $42", confidence: 94 })]);
    expect(result.fullText).toContain("Page 1\nInvoice total $42");
    expect(recognize).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ phase: "complete", progress: 100 }));
    expect(pageCleanup).toHaveBeenCalledOnce();
    expect(documentDestroy).toHaveBeenCalledOnce();
    expect(terminate).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
