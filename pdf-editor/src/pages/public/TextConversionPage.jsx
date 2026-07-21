import { useState } from "react";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { createPdfFromPlainText, extractPlainTextFromPdf, validateTextConversionFile } from "../../tools/textConversion.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

function downloadBlob(blob, name, toolId) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  trackProductEvent("pdf_downloaded", { toolId });
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TextConversionPage({ tool }) {
  const pdfToText = tool.id === "pdf-to-txt";
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState("letter");
  const [fontSize, setFontSize] = useState(11);

  const chooseFile = (nextFile) => {
    const validationError = validateTextConversionFile(nextFile, pdfToText ? "pdf" : "txt");
    setError(validationError);
    setFile(validationError ? null : nextFile);
  };

  const convert = async () => {
    if (!file) return;
    setStatus("converting");
    setError("");
    try {
      const baseName = file.name.replace(/\.(pdf|txt)$/i, "") || "fixthatpdf-document";
      if (pdfToText) {
        const bytes = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
        const text = await extractPlainTextFromPdf(pdf);
        downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${baseName}.txt`, tool.id);
      } else {
        const text = await file.text();
        const bytes = await createPdfFromPlainText(text, { title: baseName, fontSize, pageSize });
        downloadBlob(new Blob([bytes], { type: "application/pdf" }), `${baseName}.pdf`, tool.id);
      }
      setStatus("complete");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch (conversionError) {
      setStatus("idle");
      setError(conversionError.message || "The file could not be converted.");
    }
  };

  const accept = pdfToText ? "application/pdf,.pdf" : "text/plain,.txt";
  return (
    <main className="image-conversion-page office-conversion-page">
      <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} />
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
      <section className="conversion-hero"><div><small>Available · runs in your browser</small><h1>{tool.name} online.</h1><p>{tool.shortDescription} No upload to a conversion server.</p></div></section>
      <div className="conversion-workspace-grid">
        <section>
          <label className="conversion-dropzone"><input type="file" accept={accept} onChange={(event) => chooseFile(event.target.files?.[0])} /><span><Upload size={25} /></span><strong>{file ? file.name : `Drop or choose a ${pdfToText ? "PDF" : "TXT"} file`}</strong><small>Maximum file size: 10 MB</small></label>
          {error && <div className="conversion-error" role="alert">{error}</div>}
          {file && <div className="office-file-card"><header><FileText size={20} /><div><strong>{file.name}</strong><small>Ready for browser conversion</small></div></header></div>}
        </section>
        <aside className="conversion-settings-card">
          <span>{pdfToText ? "Text extraction" : "PDF settings"}</span>
          <h2>{pdfToText ? "Keep readable page breaks" : "Create readable pages"}</h2>
          {!pdfToText && <div className="text-conversion-settings"><label>Page size<select value={pageSize} onChange={(event) => setPageSize(event.target.value)}><option value="letter">US Letter</option><option value="a4">A4</option></select></label><label>Text size<select value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))}><option value={10}>10 pt</option><option value={11}>11 pt</option><option value={12}>12 pt</option><option value={14}>14 pt</option></select></label></div>}
          <div className="conversion-summary"><Check size={18} /><span>{file ? "File ready to convert" : `Add a ${pdfToText ? "PDF" : "TXT"} to continue`}</span></div>
          <button className="conversion-primary-action" type="button" disabled={!file || status === "converting"} onClick={convert}>{status === "converting" ? <><LoaderCircle className="is-spinning" size={18} /> Converting…</> : <><Download size={18} /> Download {pdfToText ? "TXT" : "PDF"}</>}</button>
          {status === "complete" && <p className="conversion-success">Your converted file is ready.</p>}
        </aside>
      </div>
      <section className="conversion-privacy-note"><Check size={19} /><div><strong>Private browser processing</strong><p>The file stays in your browser during this conversion.</p></div></section>
      <ToolGuideContent tool={tool} />
    </main>
  );
}
