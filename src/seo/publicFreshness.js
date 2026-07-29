export const PUBLIC_SITE_LAST_MODIFIED_ISO = "2026-07-26";

const PAGE_LAST_MODIFIED_OVERRIDES = new Map([
  ["/edit-pdf", "2026-07-29"],
  ["/compress-pdf", "2026-07-29"],
  ["/merge-pdf", "2026-07-29"],
  ["/split-pdf", "2026-07-29"],
  ["/sign-pdf", "2026-07-29"],
  ["/fill-pdf", "2026-07-29"],
  ["/pdf-to-word", "2026-07-29"],
  ["/pdf-to-jpg", "2026-07-29"],
  ["/jpg-to-pdf", "2026-07-29"],
  ["/translate-pdf", "2026-07-29"],
]);

export function publicPageLastModified(path = "/") {
  const pathname = path.startsWith("http") ? new URL(path).pathname : path;
  return PAGE_LAST_MODIFIED_OVERRIDES.get(pathname) || PUBLIC_SITE_LAST_MODIFIED_ISO;
}
