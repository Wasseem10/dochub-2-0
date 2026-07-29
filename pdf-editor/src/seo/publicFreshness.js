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
  ["/guides/how-to-edit-a-pdf", "2026-07-29"],
  ["/guides/compress-pdf-without-losing-quality", "2026-07-29"],
  ["/guides/how-to-combine-pdf-files", "2026-07-29"],
  ["/guides/how-to-fill-and-sign-pdf", "2026-07-29"],
  ["/guides/pdf-to-word-formatting", "2026-07-29"],
  ["/guides/edit-pdf-on-iphone", "2026-07-29"],
  ["/guides/edit-scanned-pdf", "2026-07-29"],
  ["/guides/compress-pdf-to-1mb", "2026-07-29"],
  ["/guides/compress-pdf-for-email", "2026-07-29"],
  ["/guides/combine-pdf-files-on-mac", "2026-07-29"],
  ["/guides/sign-pdf-on-android", "2026-07-29"],
  ["/guides/fill-pdf-without-adobe", "2026-07-29"],
  ["/guides/convert-pdf-to-word-without-losing-formatting", "2026-07-29"],
  ["/guides/remove-pages-from-pdf", "2026-07-29"],
  ["/guides/rotate-pdf-and-save", "2026-07-29"],
  ["/research/pdf-email-attachment-size-study", "2026-07-29"],
]);

export function publicPageLastModified(path = "/") {
  const pathname = path.startsWith("http") ? new URL(path).pathname : path;
  return PAGE_LAST_MODIFIED_OVERRIDES.get(pathname) || PUBLIC_SITE_LAST_MODIFIED_ISO;
}
