import { describe, expect, it, vi } from "vitest";
import {
  PdfPageRenderTimeoutError,
  recoverPdfPageRender,
  withPdfPageDeadline,
} from "../../src/tools/editorPageRecovery.js";

describe("editor page recovery", () => {
  it("turns an unresolved render into a timeout and cancels its work", async () => {
    const onTimeout = vi.fn();
    await expect(withPdfPageDeadline(new Promise(() => {}), {
      timeoutMs: 5,
      label: "Page 3",
      onTimeout,
    })).rejects.toBeInstanceOf(PdfPageRenderTimeoutError);
    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it("retries once and returns the recovered page", async () => {
    const render = vi.fn()
      .mockRejectedValueOnce(new Error("worker released"))
      .mockResolvedValueOnce({ image: "page-3" });
    const onAttemptFailed = vi.fn();
    await expect(recoverPdfPageRender(render, { onAttemptFailed })).resolves.toEqual({ image: "page-3" });
    expect(render).toHaveBeenCalledTimes(2);
    expect(onAttemptFailed).toHaveBeenCalledTimes(1);
  });

  it("surfaces the final render error after both attempts", async () => {
    const render = vi.fn().mockRejectedValue(new Error("still broken"));
    await expect(recoverPdfPageRender(render)).rejects.toThrow("still broken");
    expect(render).toHaveBeenCalledTimes(2);
  });
});
