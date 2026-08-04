const PATH_SEPARATORS = /[\\/]+/g;
const UNSAFE_PUNCTUATION = /[<>:"|?*]+/g;
const SAFE_DOWNLOAD_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "zip",
  "docx",
  "xlsx",
  "pptx",
]);
const DOWNLOAD_EXTENSION_BY_MIME = new Map([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["application/zip", "zip"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
]);

function stripControlAndBidiCharacters(value) {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);
    const isControl = codePoint <= 31 || (codePoint >= 127 && codePoint <= 159);
    const isBidiOverride = (codePoint >= 0x202a && codePoint <= 0x202e)
      || (codePoint >= 0x2066 && codePoint <= 0x2069);
    return isControl || isBidiOverride ? "" : character;
  }).join("");
}

function cleanFileName(value) {
  return stripControlAndBidiCharacters(String(value || "").normalize("NFKC"))
    .replace(PATH_SEPARATORS, "-")
    .replace(UNSAFE_PUNCTUATION, "-")
    .replace(/-{2,}/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .trim();
}

function truncateFileName(name, maximumLength = 124) {
  if (name.length <= maximumLength) return name;
  const extensionMatch = name.match(/\.[a-z0-9]{1,10}$/i);
  if (!extensionMatch) return name.slice(0, maximumLength).replace(/[.\s-]+$/g, "");
  const extension = extensionMatch[0];
  const base = name.slice(0, -extension.length)
    .slice(0, Math.max(1, maximumLength - extension.length))
    .replace(/[.\s-]+$/g, "");
  return `${base}${extension}`;
}

export function sanitizePdfDisplayName(value, fallback = "Untitled document.pdf") {
  let name = cleanFileName(value).slice(0, 120).trim();
  if (!name) name = fallback;
  if (!/\.pdf$/i.test(name)) name = `${name.replace(/\.+$/g, "")}.pdf`;
  return name.slice(0, 124);
}

export function sanitizeDownloadFileName(value, fallback = "PDFEnrich document.pdf") {
  let name = cleanFileName(value);
  if (!name) name = cleanFileName(fallback) || "PDFEnrich document.pdf";

  const extensionMatch = name.match(/\.([a-z0-9]{1,10})$/i);
  const extension = extensionMatch?.[1]?.toLowerCase() || "";
  if (!SAFE_DOWNLOAD_EXTENSIONS.has(extension)) {
    const base = extensionMatch ? name.slice(0, -extensionMatch[0].length) : name;
    name = `${base.replace(/\.+$/g, "") || "PDFEnrich document"}.pdf`;
  }

  return truncateFileName(name);
}

export function downloadFileNameForMime(value, mimeType, fallback = "PDFEnrich document.pdf") {
  const expectedExtension = DOWNLOAD_EXTENSION_BY_MIME.get(String(mimeType || "").toLowerCase());
  if (!expectedExtension) return sanitizeDownloadFileName(value, fallback);

  let name = cleanFileName(value);
  if (!name) name = cleanFileName(fallback) || `PDFEnrich document.${expectedExtension}`;
  const extensionMatch = name.match(/\.([a-z0-9]{1,10})$/i);
  const currentExtension = extensionMatch?.[1]?.toLowerCase() || "";
  const extensionMatches = currentExtension === expectedExtension
    || (expectedExtension === "jpg" && currentExtension === "jpeg");
  if (!extensionMatches) {
    const base = extensionMatch ? name.slice(0, -extensionMatch[0].length) : name;
    const baseExtension = base.match(/\.([a-z0-9]{1,10})$/i)?.[1]?.toLowerCase() || "";
    const baseAlreadyMatches = baseExtension === expectedExtension
      || (expectedExtension === "jpg" && baseExtension === "jpeg");
    name = baseAlreadyMatches
      ? base
      : `${base.replace(/\.+$/g, "") || "PDFEnrich document"}.${expectedExtension}`;
  }

  return truncateFileName(name);
}
