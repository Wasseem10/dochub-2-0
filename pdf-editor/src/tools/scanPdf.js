export const SCAN_PDF_LIMITS = Object.freeze({
  maxImages: 30,
  maxImageBytes: 20 * 1024 * 1024,
});

export function validateScanFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return "Choose at least one JPG or PNG image.";
  if (list.length > SCAN_PDF_LIMITS.maxImages) return `Choose no more than ${SCAN_PDF_LIMITS.maxImages} images at once.`;
  for (const file of list) {
    if (!/^image\/(jpeg|png)$/.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name || "")) return "Only JPG and PNG page images are supported.";
    if (!file.size) return `${file.name || "An image"} is empty.`;
    if (file.size > SCAN_PDF_LIMITS.maxImageBytes) return `${file.name || "An image"} is larger than 20 MB.`;
  }
  return "";
}

export function moveScanPage(pages, from, to) {
  if (!Array.isArray(pages) || from === to || from < 0 || to < 0 || from >= pages.length || to >= pages.length) return pages;
  const next = [...pages];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function nextScanRotation(rotation = 0) {
  return (Number(rotation) + 90) % 360;
}
