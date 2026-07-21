import { useRef, useState } from "react";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import Lock from "lucide-react/dist/esm/icons/lock.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import Zap from "lucide-react/dist/esm/icons/zap.mjs";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { TOOL_BY_ID } from "../../tools/toolRegistry.js";

const UPLOAD_COPY = Object.freeze({
  "edit-pdf": ["Edit a PDF online", "Change text, add content, and finish your PDF in one focused workspace."],
  "annotate-pdf": ["Annotate a PDF online", "Highlight, draw, add shapes, and leave clear notes directly on the page."],
  "pdf-reader": ["Read a PDF online", "Open, search, zoom, and move through every page without installing software."],
  "fill-pdf": ["Fill a PDF online", "Add text, checkboxes, dates, initials, and signatures exactly where they belong."],
  "pdf-form-filler": ["Fill out a PDF form", "Open existing form fields or place new answers, then export a finished copy."],
  "sign-pdf": ["Sign a PDF online", "Type, draw, or upload your signature and place it precisely on the document."],
  "add-initials": ["Add initials to a PDF", "Create your initials once, place them anywhere, and download the completed PDF."],
  "add-date-fields": ["Add date fields to a PDF", "Place today’s date or enter a custom date wherever the document needs it."],
  "request-signatures": ["Request signatures on a PDF", "Place signer fields, prepare the current PDF, and hand it off with your device’s share sheet."],
  "protect-pdf": ["Protect a PDF with a password", "Apply local AES-256 encryption and download a password-protected copy."],
  "review-pdf": ["Review a PDF online", "Highlight, draw, add shapes, and keep a complete local review trail in one workspace."],
  "comment-on-pdf": ["Comment on a PDF online", "Place comment threads on any page, add replies, resolve feedback, and export the reviewed PDF."],
});

const DROP_ACTION = Object.freeze({
  "edit-pdf": "edit",
  "annotate-pdf": "annotate",
  "pdf-reader": "read",
  "fill-pdf": "fill",
  "pdf-form-filler": "fill out",
  "sign-pdf": "sign",
  "add-initials": "add initials",
  "add-date-fields": "add dates",
  "request-signatures": "prepare for signatures",
  "protect-pdf": "protect",
  "review-pdf": "review",
  "comment-on-pdf": "comment on",
});

export function EditorToolUploadPage({ toolId, fileInputRef, onUpload, onDropFiles, onBlankPage, uploadError, uploadStage }) {
  const [dragging, setDragging] = useState(false);
  const dropDepth = useRef(0);
  const tool = TOOL_BY_ID.get(toolId) || TOOL_BY_ID.get("edit-pdf");
  const [headline, subheadline] = UPLOAD_COPY[tool.id] || [tool.name, tool.shortDescription];
  const isUploading = Boolean(uploadStage?.status && !["idle", "complete", "error"].includes(uploadStage.status));

  const openPicker = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  return (
    <main className="editor-tool-upload-page">
      <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={[]} />
      <input ref={fileInputRef} className="sr-only" type="file" accept="application/pdf,.pdf" onChange={onUpload} />
      <section className="editor-tool-upload-hero">
        <div className="editor-tool-heading">
          <h1>{headline}<em>.</em></h1>
          <p>{subheadline} Free to use and ready in seconds.</p>
        </div>

        <div className="editor-tool-upload-frame">
          <div
            className={`editor-tool-dropzone ${dragging ? "is-dragging" : ""}`}
            role="button"
            tabIndex="0"
            aria-label={`Upload a PDF to ${tool.name.toLowerCase()}`}
            onClick={openPicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openPicker();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              dropDepth.current += 1;
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              dropDepth.current = Math.max(0, dropDepth.current - 1);
              if (!dropDepth.current) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              dropDepth.current = 0;
              setDragging(false);
              onDropFiles(event.dataTransfer.files);
            }}
          >
            <span className="editor-tool-upload-icon"><Upload size={48} strokeWidth={1.8} /></span>
            <h2>{dragging ? "Drop your PDF to open it" : `Drop your PDF here to ${DROP_ACTION[tool.id] || "open"}`}</h2>
            <button type="button" disabled={isUploading} onClick={(event) => { event.stopPropagation(); openPicker(); }}>
              {isUploading ? <Upload className="is-uploading" size={21} /> : <Zap size={21} fill="currentColor" />}
              {isUploading ? "Opening your PDF..." : "Upload from your device"}
            </button>
            {tool.id === "edit-pdf" && onBlankPage && (
              <button type="button" className="editor-tool-blank-action" disabled={isUploading} onClick={(event) => { event.stopPropagation(); onBlankPage(); }}>
                <FileText size={18} /> Start with a blank page
              </button>
            )}
            <p className={uploadError ? "is-error" : ""} role={uploadError ? "alert" : undefined} aria-live="polite">
              {uploadError || (isUploading ? `${uploadStage.status}${uploadStage.fileName ? ` - ${uploadStage.fileName}` : ""}` : "PDF documents up to 50 MB and 500 pages")}
            </p>
            {isUploading && <div className="editor-tool-upload-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadStage.percent || 0}><span style={{ width: `${uploadStage.percent || 0}%` }} /></div>}
          </div>
        </div>

        <div className="editor-tool-trust-row" aria-label="Upload information">
          <span><Lock size={16} /> Private browser workspace</span>
          <span><CheckCircle2 size={16} /> No account required to edit</span>
          <span><FileText size={16} /> No login required to download</span>
        </div>
      </section>
    </main>
  );
}
