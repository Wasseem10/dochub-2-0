import {
  inspectPdfBytes,
  PrivateCloudSecurityError,
} from "./privateCloudDocumentService.js";

const PARSE_TIMEOUT_MS = 30_000;
const SCAN_TIMEOUT_MS = 60_000;
const PDF_CONTENT_TYPE = "application/pdf";
const OBJECT_GENERATION_PATTERN = /^[1-9][0-9]{0,39}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function hasEntries(value) {
  return Boolean(value && typeof value === "object" && Object.values(value).some((items) => (
    Array.isArray(items) ? items.length : Boolean(items)
  )));
}

function parseTimeoutError() {
  return new PrivateCloudSecurityError(
    "pdf_parse_timeout",
    "The PDF took too long to validate.",
    422,
  );
}

function validateTimeout(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > PARSE_TIMEOUT_MS) {
    throw new PrivateCloudSecurityError(
      "invalid_pdf_parse_timeout",
      "The PDF validation timeout is invalid.",
      500,
    );
  }
  return value;
}

function validateObjectGeneration(value, {
  code = "uploaded_generation_invalid",
  status = 422,
} = {}) {
  const generation = String(value || "");
  if (!OBJECT_GENERATION_PATTERN.test(generation)) {
    throw new PrivateCloudSecurityError(
      code,
      "The uploaded object generation is invalid.",
      status,
    );
  }
  return generation;
}

function pdfBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new PrivateCloudSecurityError(
    "invalid_bytes",
    "A binary PDF payload is required.",
  );
}

function hasAsciiControl(value) {
  return Array.from(String(value || "")).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function stripAsciiControl(value) {
  return Array.from(String(value || ""))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("");
}

async function settleCleanup(loadingTask, documentProxy) {
  await Promise.allSettled([
    Promise.resolve().then(() => documentProxy?.destroy?.()),
    Promise.resolve().then(() => loadingTask?.destroy?.()),
  ]);
}

export async function inspectParsedPrivatePdf(value, {
  timeoutMs = PARSE_TIMEOUT_MS,
  pdfjsLoader = () => import("pdfjs-dist/legacy/build/pdf.mjs"),
} = {}) {
  const data = pdfBytes(value);
  const boundedTimeoutMs = validateTimeout(timeoutMs);
  if (typeof pdfjsLoader !== "function") {
    throw new PrivateCloudSecurityError(
      "pdf_parser_unavailable",
      "The PDF parser is unavailable.",
      503,
    );
  }

  let loadingTask;
  let documentProxy;
  let timedOut = false;
  let timeoutHandle;

  const parsedInspection = (async () => {
    const pdfjs = await pdfjsLoader();
    if (timedOut) throw parseTimeoutError();
    if (!pdfjs || typeof pdfjs.getDocument !== "function") {
      throw new PrivateCloudSecurityError(
        "pdf_parser_unavailable",
        "The PDF parser is unavailable.",
        503,
      );
    }
    loadingTask = pdfjs.getDocument({
      data: data.slice(0),
      disableWorker: true,
      isEvalSupported: false,
      useWorkerFetch: false,
      verbosity: 0,
    });
    documentProxy = await loadingTask.promise;
    if (timedOut) throw parseTimeoutError();
    if (!Number.isInteger(documentProxy.numPages) || documentProxy.numPages < 1 || documentProxy.numPages > 500) {
      throw new PrivateCloudSecurityError("pdf_page_limit", "The PDF page count is unsupported.", 422);
    }
    if (hasEntries(await documentProxy.getJSActions())) {
      throw new PrivateCloudSecurityError("pdf_javascript", "PDF JavaScript is not accepted for private cloud storage.", 422);
    }
    if (hasEntries(await documentProxy.getAttachments())) {
      throw new PrivateCloudSecurityError("pdf_embedded_file", "Embedded files are not accepted for private cloud storage.", 422);
    }
    for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
      if (timedOut) throw parseTimeoutError();
      const page = await documentProxy.getPage(pageNumber);
      try {
        const annotations = await page.getAnnotations({ intent: "display" });
        if (annotations.some((annotation) => (
          annotation?.url
          || annotation?.unsafeUrl
          || annotation?.attachment
          || ["Launch", "GoToR", "JavaScript", "SubmitForm"].includes(annotation?.action)
        ))) {
          throw new PrivateCloudSecurityError("pdf_external_action", "External PDF actions are not accepted for private cloud storage.", 422);
        }
      } finally {
        page.cleanup?.();
      }
    }
    return Object.freeze({ pageCount: documentProxy.numPages });
  })();

  const deadline = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      void settleCleanup(loadingTask, documentProxy);
      reject(parseTimeoutError());
    }, boundedTimeoutMs);
  });

  try {
    return await Promise.race([parsedInspection, deadline]);
  } catch (error) {
    const name = String(error?.name || "");
    if (error instanceof PrivateCloudSecurityError) throw error;
    if (name === "PasswordException") {
      throw new PrivateCloudSecurityError("encrypted_pdf_not_supported", "Encrypted PDFs are not accepted for private cloud storage.", 422);
    }
    throw new PrivateCloudSecurityError("malformed_pdf", "The PDF parser could not validate this file.", 422);
  } finally {
    clearTimeout(timeoutHandle);
    if (!timedOut) await settleCleanup(loadingTask, documentProxy);
  }
}

export async function downloadAndFastInspectPrivatePdf(file, {
  expectedSize,
  maximumFileBytes,
  expectedContentType = PDF_CONTENT_TYPE,
  expectedGeneration,
}) {
  if (!Number.isSafeInteger(maximumFileBytes) || maximumFileBytes <= 0) {
    throw new PrivateCloudSecurityError(
      "invalid_file_size_limit",
      "The PDF size limit is invalid.",
      500,
    );
  }
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0 || expectedSize > maximumFileBytes) {
    throw new PrivateCloudSecurityError(
      "invalid_upload_reservation",
      "The upload reservation is invalid.",
      500,
    );
  }
  const normalizedExpectedContentType = String(expectedContentType || "").toLowerCase();
  if (normalizedExpectedContentType !== PDF_CONTENT_TYPE) {
    throw new PrivateCloudSecurityError(
      "invalid_expected_content_type",
      "The expected object content type is invalid.",
      500,
    );
  }
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size);
  if (!Number.isSafeInteger(size) || size !== expectedSize || size <= 0 || size > maximumFileBytes) {
    throw new PrivateCloudSecurityError("uploaded_size_mismatch", "The uploaded object size does not match the reservation.", 422);
  }
  if (String(metadata.contentType || "").toLowerCase() !== normalizedExpectedContentType) {
    throw new PrivateCloudSecurityError("uploaded_content_type_mismatch", "The uploaded object is not marked as a PDF.", 415);
  }
  const generation = validateObjectGeneration(metadata.generation);
  if (expectedGeneration != null) {
    const expected = validateObjectGeneration(expectedGeneration, {
      code: "invalid_expected_generation",
      status: 500,
    });
    if (generation !== expected) {
      throw new PrivateCloudSecurityError(
        "uploaded_generation_mismatch",
        "The uploaded object generation changed before validation.",
        409,
      );
    }
  }
  const generationPinnedFile = (
    file?.name
    && file?.bucket
    && typeof file.bucket.file === "function"
  )
    ? file.bucket.file(file.name, { generation })
    : file;
  const [buffer] = await generationPinnedFile.download({ validation: "crc32c" });
  if (!buffer || buffer.byteLength !== size) {
    throw new PrivateCloudSecurityError(
      "uploaded_size_mismatch",
      "The downloaded object size does not match its metadata.",
      422,
    );
  }
  const fastInspection = inspectPdfBytes(buffer, { maximumFileBytes });
  const contentType = PDF_CONTENT_TYPE;
  const objectMetadata = Object.freeze({ size, contentType, generation });
  return Object.freeze({
    bytes: new Uint8Array(buffer),
    sha256: fastInspection.sha256,
    size,
    contentType,
    generation,
    objectMetadata,
  });
}

export async function downloadAndInspectPrivatePdf(file, options) {
  const fastInspection = await downloadAndFastInspectPrivatePdf(file, options);
  const parsedInspection = await inspectParsedPrivatePdf(fastInspection.bytes);
  return Object.freeze({
    ...fastInspection,
    pageCount: parsedInspection.pageCount,
  });
}

export function createPrivateMalwareScanner({ endpoint, required }) {
  if (!endpoint) {
    return {
      async scan() {
        if (required) {
          throw new PrivateCloudSecurityError(
            "malware_scanner_unavailable",
            "The private malware scanner is not configured.",
            503,
          );
        }
        return { status: "not_configured" };
      },
    };
  }
  let googleAuthPromise;
  let clientPromise;
  return {
    async scan({ bucketName, storageKey, generation, sha256 }) {
      validateObjectGeneration(generation);
      if (!SHA256_PATTERN.test(String(sha256 || "").toLowerCase())) {
        throw new PrivateCloudSecurityError(
          "invalid_malware_scan_checksum",
          "The malware scan checksum is invalid.",
          500,
        );
      }
      if (
        !String(bucketName || "")
        || String(bucketName).length > 222
        || !String(storageKey || "")
        || String(storageKey).length > 1_024
        || hasAsciiControl(`${bucketName}${storageKey}`)
      ) {
        throw new PrivateCloudSecurityError(
          "invalid_malware_scan_object",
          "The malware scan object reference is invalid.",
          500,
        );
      }
      let response;
      try {
        googleAuthPromise ||= import("google-auth-library").then(
          ({ GoogleAuth }) => new GoogleAuth(),
        );
        clientPromise ||= googleAuthPromise.then(
          (googleAuth) => googleAuth.getIdTokenClient(endpoint),
        );
        const client = await clientPromise;
        response = await client.request({
          url: endpoint,
          method: "POST",
          timeout: SCAN_TIMEOUT_MS,
          headers: { "Content-Type": "application/json" },
          data: { bucket: bucketName, object: storageKey, generation, sha256 },
        });
      } catch {
        clientPromise = undefined;
        googleAuthPromise = undefined;
        throw new PrivateCloudSecurityError("malware_scan_unavailable", "The malware scan could not be completed.", 503);
      }
      if (response?.data?.status !== "clean") {
        throw new PrivateCloudSecurityError("malware_detected", "The uploaded PDF did not pass the malware scan.", 422);
      }
      return {
        status: "clean",
        engineVersion: stripAsciiControl(response.data.engineVersion).slice(0, 80),
      };
    },
  };
}
