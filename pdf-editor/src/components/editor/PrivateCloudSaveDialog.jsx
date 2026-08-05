import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import CloudUpload from "lucide-react/dist/esm/icons/cloud-upload.mjs";
import HardDrive from "lucide-react/dist/esm/icons/hard-drive.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import LockKeyhole from "lucide-react/dist/esm/icons/lock-keyhole.mjs";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";
import { useEffect, useRef } from "react";
import "./private-cloud-save-dialog.css";

const WORKING_STAGES = new Set(["preparing", "uploading", "verifying"]);

function stageLabel(stage, progress) {
  if (stage === "preparing") return "Preparing the edited PDF";
  if (stage === "uploading") return `Uploading private copy · ${Math.max(0, Math.min(100, progress || 0))}%`;
  if (stage === "verifying") return "Verifying checksum and PDF safety";
  if (stage === "saved") return "Private cloud copy confirmed";
  if (stage === "error") return "Cloud save did not finish";
  return "Ready to save";
}

export function PrivateCloudSaveDialog({
  open,
  fileName,
  stage = "idle",
  progress = 0,
  error = "",
  cloudConfigured = false,
  onConfirm,
  onClose,
}) {
  const closeRef = useRef(null);
  const working = WORKING_STAGES.has(stage);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !working) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open, working]);

  if (!open) return null;
  return (
    <div
      className="private-cloud-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !working) onClose?.();
      }}
    >
      <section
        className="private-cloud-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="private-cloud-title"
        aria-describedby="private-cloud-description"
      >
        <header>
          <span className="private-cloud-dialog-mark"><LockKeyhole size={20} /></span>
          <div>
            <small>Save to your PDFEnrich account</small>
            <h2 id="private-cloud-title">Open this document on every device</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close private cloud save"
            disabled={working}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <p id="private-cloud-description">
          Confirm once to save this PDF to your private account. You can then open it on your phone or any
          other device where you sign in. Other local documents are not uploaded.
        </p>

        <div className="private-cloud-boundaries">
          <article>
            <HardDrive size={19} />
            <div><strong>Local working copy</strong><span>Browser-only autosave, editing state, signatures, and temporary previews.</span></div>
          </article>
          <article>
            <CloudUpload size={19} />
            <div><strong>Private cloud PDF</strong><span>The finished PDF—including visible signatures or form answers you added—and minimal metadata. The server verifies its checksum, PDF safety, and configured private malware scan before confirming it saved.</span></div>
          </article>
        </div>

        <div className={`private-cloud-status is-${stage}`} role={stage === "error" ? "alert" : "status"} aria-live="polite">
          {working ? <LoaderCircle className="is-spinning" size={18} /> : stage === "saved" ? <CheckCircle2 size={18} /> : stage === "error" ? <RotateCw size={18} /> : <LockKeyhole size={18} />}
          <div>
            <strong>{stageLabel(stage, progress)}</strong>
            {error && <span>{error}</span>}
          </div>
        </div>
        {working && (
          <div className="private-cloud-progress" aria-label={stageLabel(stage, progress)}>
            <span style={{ width: `${stage === "preparing" ? 8 : stage === "verifying" ? 96 : Math.max(8, progress)}%` }} />
          </div>
        )}

        <footer>
          <button type="button" disabled={working} onClick={onClose}>
            {stage === "saved" ? "Done" : "Keep in this browser only"}
          </button>
          {stage !== "saved" && (
            <button
              className="private-cloud-primary"
              type="button"
              disabled={working || !cloudConfigured}
              onClick={onConfirm}
            >
              {stage === "error" ? <><RotateCw size={17} /> Retry account save</> : <><CloudUpload size={17} /> Save to my account</>}
            </button>
          )}
        </footer>
        {!cloudConfigured && (
          <p className="private-cloud-unavailable">
            Private cloud storage is not connected on this deployment. Your browser copy has not been uploaded.
          </p>
        )}
        <small className="private-cloud-file" title={fileName}>{fileName}</small>
      </section>
    </div>
  );
}
