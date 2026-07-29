import { useEffect, useRef } from "react";
import FileImage from "lucide-react/dist/esm/icons/file-image.mjs";
import FileSpreadsheet from "lucide-react/dist/esm/icons/file-spreadsheet.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import ImageIcon from "lucide-react/dist/esm/icons/image.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Presentation from "lucide-react/dist/esm/icons/presentation.mjs";
import X from "lucide-react/dist/esm/icons/x.mjs";

export const FINISH_EXPORT_FORMATS = Object.freeze([
  {
    id: "pdf",
    label: "PDF",
    extension: "PDF",
    detail: "Best for sharing and printing",
    icon: FileText,
    tone: "red",
    recommended: true,
  },
  {
    id: "png",
    label: "PNG",
    extension: "PNG",
    detail: "Crisp page images",
    icon: ImageIcon,
    tone: "purple",
  },
  {
    id: "word",
    label: "Word",
    extension: "DOCX",
    detail: "Visual Word document",
    icon: FileText,
    tone: "blue",
  },
  {
    id: "excel",
    label: "Excel",
    extension: "XLSX",
    detail: "Extract readable rows",
    icon: FileSpreadsheet,
    tone: "green",
  },
  {
    id: "jpg",
    label: "JPG",
    extension: "JPG",
    detail: "Smaller page images",
    icon: FileImage,
    tone: "charcoal",
  },
  {
    id: "powerpoint",
    label: "PowerPoint",
    extension: "PPTX",
    detail: "One page per slide",
    icon: Presentation,
    tone: "orange",
  },
]);

export function FinishExportModal({
  fileName,
  pageCount,
  selectedFormat,
  onSelectFormat,
  onClose,
  onDownload,
  isWorking = false,
  progress = 0,
  error = "",
}) {
  const selectedButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const selected = FINISH_EXPORT_FORMATS.find((format) => format.id === selectedFormat)
    || FINISH_EXPORT_FORMATS[0];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    selectedButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !isWorking) onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isWorking]);

  return (
    <div
      className="finish-export-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isWorking) onClose();
      }}
    >
      <section
        className="finish-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-export-title"
        aria-describedby="finish-export-description"
      >
        <header>
          <div>
            <span>Editing complete</span>
            <h2 id="finish-export-title">Your document is ready</h2>
          </div>
          <button type="button" aria-label="Close download options" onClick={onClose} disabled={isWorking}>
            <X size={20} />
          </button>
        </header>

        <div className="finish-export-body">
          <p id="finish-export-description">Choose the format you want to download.</p>
          <div className="finish-export-file-summary">
            <FileText size={18} aria-hidden="true" />
            <span><strong>{fileName}</strong><small>{pageCount} page{pageCount === 1 ? "" : "s"} ready to export</small></span>
          </div>

          <div className="finish-export-grid" role="radiogroup" aria-label="Download format">
            {FINISH_EXPORT_FORMATS.map((format) => {
              const FormatIcon = format.icon;
              const isSelected = format.id === selectedFormat;
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`finish-export-option is-${format.tone} ${isSelected ? "is-selected" : ""}`}
                  key={format.id}
                  ref={isSelected ? selectedButtonRef : undefined}
                  onClick={() => onSelectFormat(format.id)}
                  disabled={isWorking}
                >
                  <span className="finish-export-radio" aria-hidden="true" />
                  <span className="finish-export-format-icon"><FormatIcon size={22} strokeWidth={1.8} /><em>{format.extension}</em></span>
                  <span className="finish-export-option-copy">
                    <strong>{format.label}{format.recommended ? <small>Recommended</small> : null}</strong>
                    <small>{format.detail}</small>
                  </span>
                </button>
              );
            })}
          </div>

          {isWorking && (
            <div className="finish-export-progress" role="status" aria-live="polite">
              <span><LoaderCircle className="is-spinning" size={17} /> Preparing {selected.label}…</span>
              <div><i style={{ width: `${Math.max(4, progress)}%` }} /></div>
            </div>
          )}
          {error && <p className="finish-export-error" role="alert">{error}</p>}
        </div>

        <footer>
          <button type="button" className="finish-export-secondary" onClick={onClose} disabled={isWorking}>Keep editing</button>
          <button type="button" className="finish-export-primary" onClick={onDownload} disabled={isWorking}>
            {isWorking ? <><LoaderCircle className="is-spinning" size={17} /> Preparing…</> : <>Download {selected.label}</>}
          </button>
        </footer>
      </section>
    </div>
  );
}
