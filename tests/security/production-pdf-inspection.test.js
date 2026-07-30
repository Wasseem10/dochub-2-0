import { describe, expect, it, vi } from "vitest";
import {
  downloadAndFastInspectPrivatePdf,
  inspectParsedPrivatePdf,
} from "../../functions/src/security/productionPdfInspection.js";

const validPdf = new TextEncoder().encode(
  "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\nstartxref\n0\n%%EOF\n",
);

function storageFile({
  bytes = validPdf,
  contentType = "application/pdf",
  generation = "1722270123456789",
  size = bytes.byteLength,
} = {}) {
  return {
    getMetadata: vi.fn(async () => [{
      contentType,
      generation,
      size: String(size),
    }]),
    download: vi.fn(async () => [Buffer.from(bytes)]),
  };
}

function parsedPdfLoader({
  pages = [{ annotations: [] }],
  javascript = null,
  attachments = null,
  destroy = vi.fn(async () => {}),
} = {}) {
  const cleanup = vi.fn();
  const documentProxy = {
    numPages: pages.length,
    getJSActions: vi.fn(async () => javascript),
    getAttachments: vi.fn(async () => attachments),
    getPage: vi.fn(async (pageNumber) => ({
      cleanup,
      getAnnotations: vi.fn(async () => pages[pageNumber - 1].annotations),
    })),
    destroy,
  };
  const loadingTask = {
    promise: Promise.resolve(documentProxy),
    destroy: vi.fn(async () => {}),
  };
  return {
    cleanup,
    documentProxy,
    loadingTask,
    loader: vi.fn(async () => ({
      getDocument: vi.fn(() => loadingTask),
    })),
  };
}

describe("production PDF object inspection", () => {
  it("validates and returns immutable size, MIME, and generation metadata", async () => {
    const file = storageFile();
    const result = await downloadAndFastInspectPrivatePdf(file, {
      expectedSize: validPdf.byteLength,
      maximumFileBytes: 1024 * 1024,
      expectedGeneration: "1722270123456789",
    });

    expect(result).toMatchObject({
      size: validPdf.byteLength,
      contentType: "application/pdf",
      generation: "1722270123456789",
      objectMetadata: {
        size: validPdf.byteLength,
        contentType: "application/pdf",
        generation: "1722270123456789",
      },
    });
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.bytes).toEqual(validPdf);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.objectMetadata)).toBe(true);
    expect(file.download).toHaveBeenCalledWith({ validation: "crc32c" });
  });

  it.each([
    [{ contentType: "text/plain" }, "uploaded_content_type_mismatch"],
    [{ generation: "" }, "uploaded_generation_invalid"],
    [{ generation: "not-a-generation" }, "uploaded_generation_invalid"],
    [{ size: validPdf.byteLength + 1 }, "uploaded_size_mismatch"],
  ])("rejects invalid object metadata %#", async (overrides, code) => {
    await expect(downloadAndFastInspectPrivatePdf(storageFile(overrides), {
      expectedSize: validPdf.byteLength,
      maximumFileBytes: 1024 * 1024,
    })).rejects.toMatchObject({ code });
  });

  it("rejects a generation change before downloading the object", async () => {
    const file = storageFile();
    await expect(downloadAndFastInspectPrivatePdf(file, {
      expectedSize: validPdf.byteLength,
      maximumFileBytes: 1024 * 1024,
      expectedGeneration: "1722270123456790",
    })).rejects.toMatchObject({
      code: "uploaded_generation_mismatch",
      status: 409,
    });
    expect(file.download).not.toHaveBeenCalled();
  });

  it("pins the object generation for the byte download", async () => {
    const pinnedDownload = vi.fn(async () => [Buffer.from(validPdf)]);
    const file = storageFile();
    file.name = "users/encoded/documents/doc_example/versions/ver_example.pdf";
    file.bucket = {
      file: vi.fn(() => ({ download: pinnedDownload })),
    };

    await downloadAndFastInspectPrivatePdf(file, {
      expectedSize: validPdf.byteLength,
      maximumFileBytes: 1024 * 1024,
    });

    expect(file.bucket.file).toHaveBeenCalledWith(file.name, {
      generation: "1722270123456789",
    });
    expect(pinnedDownload).toHaveBeenCalledWith({ validation: "crc32c" });
    expect(file.download).not.toHaveBeenCalled();
  });

  it("rejects when downloaded bytes do not match the validated metadata size", async () => {
    const file = storageFile();
    file.download.mockResolvedValueOnce([Buffer.from("%PDF-1.7\n%%EOF\n")]);
    await expect(downloadAndFastInspectPrivatePdf(file, {
      expectedSize: validPdf.byteLength,
      maximumFileBytes: 1024 * 1024,
    })).rejects.toMatchObject({ code: "uploaded_size_mismatch" });
  });
});

describe("bounded parsed PDF inspection", () => {
  it("checks every page and cleans each parsed page", async () => {
    const fake = parsedPdfLoader({
      pages: [{ annotations: [] }, { annotations: [] }, { annotations: [] }],
    });
    await expect(inspectParsedPrivatePdf(validPdf, {
      pdfjsLoader: fake.loader,
      timeoutMs: 1_000,
    })).resolves.toEqual({ pageCount: 3 });
    expect(fake.documentProxy.getPage).toHaveBeenCalledTimes(3);
    expect(fake.cleanup).toHaveBeenCalledTimes(3);
    expect(fake.documentProxy.destroy).toHaveBeenCalled();
    expect(fake.loadingTask.destroy).toHaveBeenCalled();
  });

  it("bounds the whole inspection when a later page never resolves", async () => {
    const destroyDocument = vi.fn(async () => {});
    const destroyLoadingTask = vi.fn(async () => {});
    const documentProxy = {
      numPages: 2,
      getJSActions: vi.fn(async () => null),
      getAttachments: vi.fn(async () => null),
      getPage: vi.fn(async (pageNumber) => ({
        cleanup: vi.fn(),
        getAnnotations: pageNumber === 1
          ? vi.fn(async () => [])
          : vi.fn(() => new Promise(() => {})),
      })),
      destroy: destroyDocument,
    };
    const loadingTask = {
      promise: Promise.resolve(documentProxy),
      destroy: destroyLoadingTask,
    };

    await expect(inspectParsedPrivatePdf(validPdf, {
      timeoutMs: 20,
      pdfjsLoader: async () => ({ getDocument: () => loadingTask }),
    })).rejects.toMatchObject({
      code: "pdf_parse_timeout",
      status: 422,
    });
    expect(documentProxy.getPage).toHaveBeenCalledTimes(2);
    expect(destroyDocument).toHaveBeenCalled();
    expect(destroyLoadingTask).toHaveBeenCalled();
  });

  it("includes parser loading in the same deadline", async () => {
    await expect(inspectParsedPrivatePdf(validPdf, {
      timeoutMs: 20,
      pdfjsLoader: () => new Promise(() => {}),
    })).rejects.toMatchObject({ code: "pdf_parse_timeout" });
  });

  it("rejects parsed external actions without exposing annotation values", async () => {
    const fake = parsedPdfLoader({
      pages: [{ annotations: [{ unsafeUrl: "https://private.example/document" }] }],
    });
    let caught;
    try {
      await inspectParsedPrivatePdf(validPdf, {
        pdfjsLoader: fake.loader,
        timeoutMs: 1_000,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: "pdf_external_action", status: 422 });
    expect(caught.message).not.toContain("private.example");
  });
});
