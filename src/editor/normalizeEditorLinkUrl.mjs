export function normalizeEditorLinkUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) return "";
    return url.href;
  } catch {
    return "";
  }
}
