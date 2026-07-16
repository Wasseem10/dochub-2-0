import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LatticePdfLanding } from "../../LatticePdfLanding.jsx";
import { fileSizeBucket, trackProductEvent } from "../../analytics/productAnalytics.js";
import { setPendingPdfFile } from "../../router/pendingUpload.js";
import { validateEditorPdfFile } from "../../config/editorLimits.js";

export function HomePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    trackProductEvent("homepage_viewed");
  }, []);

  const acceptFile = (file) => {
    if (!file) return;
    const validationError = validateEditorPdfFile(file);
    if (validationError) {
      setUploadError(validationError.message);
      trackProductEvent("upload_validation_failed", { toolId: "edit-pdf", fileSizeBucket: fileSizeBucket(file.size), errorCategory: validationError.errorCategory });
      return;
    }
    setUploadError("");
    setPendingPdfFile(file);
    trackProductEvent("upload_started", { toolId: "edit-pdf", fileSizeBucket: fileSizeBucket(file.size) });
    navigate("/edit-pdf?tool=edit-pdf&pending=1");
  };

  return <LatticePdfLanding fileInputRef={fileInputRef} uploadError={uploadError} onSelectFiles={() => fileInputRef.current?.click()} onUpload={(event) => { acceptFile(event.target.files?.[0]); event.target.value = ""; }} onDropFiles={(files) => acceptFile(Array.from(files || [])[0])} />;
}
