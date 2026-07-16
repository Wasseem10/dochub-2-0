const pendingPdfFiles = new Map();

function makePendingToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function setPendingPdfFile(file) {
  if (!file) return "";
  const token = makePendingToken();
  pendingPdfFiles.set(token, file);
  return token;
}

export function consumePendingPdfFile(token) {
  if (!token) return null;
  const file = pendingPdfFiles.get(token) || null;
  pendingPdfFiles.delete(token);
  return file;
}
