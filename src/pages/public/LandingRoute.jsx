import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LatticePdfLanding } from "../../LatticePdfLanding.jsx";
import { LANDING_DOCUMENT_FORMATS, resolveLandingDocumentTool } from "../../tools/landingDocumentUpload.js";
import { setPendingDocumentFile } from "../../tools/pendingPdfFile.js";

export function LandingRoute() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [uploadError, setUploadError] = useState("");

  const openDocumentWithFile = (files) => {
    const file = Array.from(files || [])[0];
    if (!file) return;
    const destination = resolveLandingDocumentTool(file);
    if (!destination) {
      setUploadError(`Choose a supported document: ${LANDING_DOCUMENT_FORMATS}.`);
      return;
    }
    setUploadError("");
    setPendingDocumentFile(file, destination.toolId);
    navigate(destination.route, { state: { pendingLandingFile: true } });
  };

  return (
    <LatticePdfLanding
      fileInputRef={fileInputRef}
      onSelectFiles={() => fileInputRef.current?.click()}
      onUpload={(event) => {
        openDocumentWithFile(event.target.files);
        event.target.value = "";
      }}
      onDropFiles={openDocumentWithFile}
      uploadError={uploadError}
    />
  );
}
