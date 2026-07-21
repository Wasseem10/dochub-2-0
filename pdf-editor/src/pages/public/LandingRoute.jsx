import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fileSizeBucket, trackProductEvent } from "../../analytics/productAnalytics.js";
import { LatticePdfLanding } from "../../LatticePdfLanding.jsx";
import { publicEditorPath } from "../../router/routePaths.js";
import { setPendingPdfFile } from "../../tools/pendingPdfFile.js";

export function LandingRoute() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const openEditorWithFile = (files) => {
    const file = Array.from(files || [])[0];
    if (!file) return;
    setPendingPdfFile(file);
    trackProductEvent("upload_started", { toolId: "edit-pdf", fileSizeBucket: fileSizeBucket(file.size) });
    navigate(publicEditorPath("edit-pdf"), { state: { pendingLandingFile: true } });
  };

  return (
    <LatticePdfLanding
      fileInputRef={fileInputRef}
      onSelectFiles={() => fileInputRef.current?.click()}
      onUpload={(event) => {
        openEditorWithFile(event.target.files);
        event.target.value = "";
      }}
      onDropFiles={openEditorWithFile}
    />
  );
}
