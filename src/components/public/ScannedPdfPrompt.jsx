import FileSearch from "lucide-react/dist/esm/icons/file-search.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import ScanText from "lucide-react/dist/esm/icons/scan-text.mjs";
import { OCR_LANGUAGES } from "../../tools/ocrPdf.js";

export function ScannedPdfPrompt({
  file,
  language,
  onLanguageChange,
  onRunOcr,
  onChooseAnother,
  isProcessing = false,
  progress = 0,
  message = "",
  error = "",
}) {
  return <section className="analysis-scan-prompt" aria-live="polite">
    <span className="analysis-scan-prompt__icon"><FileSearch size={28} /></span>
    <div>
      <p className="analysis-scan-prompt__eyebrow">Scanned PDF detected</p>
      <h2>We noticed this is a scanned document. Click here to run local OCR before extracting data.</h2>
      <p><strong>{file?.name}</strong> has no usable embedded text layer. PDFEnrich can recognize it in this tab and continue automatically—no download or re-upload.</p>
    </div>
    <label className="analysis-scan-language">
      <span>Document language</span>
      <select value={language} onChange={(event) => onLanguageChange(event.target.value)} disabled={isProcessing}>
        {OCR_LANGUAGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <div className="analysis-scan-actions">
      <button type="button" className="analysis-primary" disabled={isProcessing} onClick={onRunOcr}>
        {isProcessing ? <><LoaderCircle className="is-spinning" size={18} /> {message || "Running local OCR…"} {progress}%</> : <><ScanText size={18} /> Run local OCR and continue</>}
      </button>
      <button type="button" className="analysis-scan-secondary" disabled={isProcessing} onClick={onChooseAnother}>Choose another PDF</button>
    </div>
    {isProcessing && <div className="analysis-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>}
    {error && <div className="conversion-error" role="alert">{error}</div>}
    <small>OCR supports up to 24 pages per document. The PDF and recognized text stay in your browser.</small>
  </section>;
}

