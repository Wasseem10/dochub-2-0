export function canSaveEditorSignature({ mode = "signature", tab = "draw", typedName = "", hasInk = false, uploadedImage = "" } = {}) {
  if (mode === "initials") return Boolean(String(typedName).trim());
  if (tab === "draw") return Boolean(hasInk);
  if (tab === "type") return Boolean(String(typedName).trim());
  if (tab === "upload") return Boolean(uploadedImage);
  return false;
}
