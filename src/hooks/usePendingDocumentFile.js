import { useEffect, useRef } from "react";
import { takePendingDocumentFile } from "../tools/pendingPdfFile.js";

export function usePendingDocumentFile(toolId, onFile) {
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;

  useEffect(() => {
    const file = takePendingDocumentFile(toolId);
    if (file) void onFileRef.current(file);
  }, [toolId]);
}
