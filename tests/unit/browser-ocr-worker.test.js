import { describe, expect, it, vi } from "vitest";
import { createBrowserOcrWorker } from "../../src/tools/browserOcrWorker.js";

describe("browser OCR worker failures", () => {
  it("reports a model-loading failure without exposing the provider's raw error", async () => {
    const progress = vi.fn();
    const factory = async (_language, _mode, options) => {
      options.logger({ status: "loading language traineddata", progress: 0 });
      options.errorHandler("private provider diagnostic");
      throw "private provider diagnostic";
    };
    await expect(createBrowserOcrWorker("eng", { logger: progress }, factory))
      .rejects.toThrow("The OCR language model could not load. Check your connection and try again.");
    expect(progress).toHaveBeenCalledWith({ status: "loading language traineddata", progress: 0 });
  });

  it("distinguishes a failed engine initialization from a missing language download", async () => {
    const factory = async (_language, _mode, options) => {
      options.logger({ status: "loading language traineddata", progress: 1 });
      options.logger({ status: "initializing api", progress: 0 });
      throw new Error("provider initialization detail");
    };
    await expect(createBrowserOcrWorker("spa", {}, factory))
      .rejects.toThrow("The OCR engine could not initialize. Reload the page and try again.");
  });

  it("gives a reload action when the worker cannot start", async () => {
    const factory = async () => { throw new Error("worker source unavailable"); };
    await expect(createBrowserOcrWorker("fra", {}, factory))
      .rejects.toThrow("The OCR engine could not load. Check your connection, reload the page, and try again.");
  });
});
