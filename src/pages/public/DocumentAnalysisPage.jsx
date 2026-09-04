import { useCallback, useMemo, useRef, useState } from "react";
import Bot from "lucide-react/dist/esm/icons/bot.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Database from "lucide-react/dist/esm/icons/database.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileText from "lucide-react/dist/esm/icons/file-text.mjs";
import Languages from "lucide-react/dist/esm/icons/languages.mjs";
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle.mjs";
import MessageSquareText from "lucide-react/dist/esm/icons/message-square-text.mjs";
import Send from "lucide-react/dist/esm/icons/send.mjs";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check.mjs";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.mjs";
import Upload from "lucide-react/dist/esm/icons/upload.mjs";
import { Link } from "react-router-dom";
import { trackProductEvent } from "../../analytics/productAnalytics.js";
import { PageMetadata } from "../../components/public/PageMetadata.jsx";
import { ScannedPdfPrompt } from "../../components/public/ScannedPdfPrompt.jsx";
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { usePdfTextExtractionInterceptor } from "../../hooks/usePdfTextExtractionInterceptor.js";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { toolSeoSchemas } from "../../tools/toolSeoSchemas.js";
import {
  analysisReportText,
  documentDataCsv,
  extractDocumentData,
  findRelevantPassages,
  generateDocumentQuestions,
  summarizePages,
  translateDocumentText,
} from "../../tools/documentIntelligence.js";
import { createPdfFromPlainText } from "../../tools/textConversion.js";

const QUESTION_TOOLS = new Set(["ai-pdf", "chat-with-pdf", "ask-pdf"]);
const MODES = Object.freeze({
  "ai-pdf": { icon: Bot, heading: "Find source passages", detail: "PDFEnrich matches the terms and figures in your question to exact passages and cites their pages. It does not generate an answer beyond the source text.", action: "Find cited passages" },
  "chat-with-pdf": { icon: MessageSquareText, heading: "Run multiple passage searches", detail: "Search several questions in this tab. Every result is a set of exact, page-cited source passages; search text is not uploaded or saved.", action: "Search document" },
  "summarize-pdf": { icon: Sparkles, heading: "Create an extractive page-cited summary", detail: "Important source sentences are ranked by document terms, reduced for repetition, and kept in document order. No model-generated facts are added.", action: "Create cited summary" },
  "translate-pdf": { icon: Languages, heading: "Translate with your browser's local language model", detail: "Compatible Chrome browsers can download and run an on-device Translator model. The source PDF is never sent to PDFEnrich or a translation server.", action: "Translate document" },
  "extract-data-from-pdf": { icon: Database, heading: "Detect common field patterns with page references", detail: "Detect email addresses, phone numbers, dates, money, percentages, and label-value lines, then download JSON or CSV for review. Tables are not reconstructed.", action: "Detect field patterns" },
  "ask-pdf": { icon: MessageSquareText, heading: "Find where the PDF answers your question", detail: "Question terms are matched against document sentences and numbers. The result shows exact passages with page citations instead of a generated answer.", action: "Find answer sources" },
  "ai-question-generator": { icon: Sparkles, heading: "Generate review questions from real sentences", detail: "Important document terms and figures become questions with exact source-sentence answer keys and page citations.", action: "Generate questions" },
});

const LANGUAGES = [
  ["en", "English"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["it", "Italian"], ["pt", "Portuguese"], ["ja", "Japanese"], ["ko", "Korean"], ["zh", "Chinese"],
];

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function download(data, type, name, toolId, isPdf = false) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  if (isPdf) trackProductEvent("pdf_downloaded", { toolId });
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CitedList({ items, keyName = "sentence" }) {
  return <ol className="analysis-cited-list">{items.map((item, index) => <li key={`${item.pageNumber}-${index}`}><p>{item[keyName] || item.value}</p><span>Page {item.pageNumber}</span></li>)}</ol>;
}

function AnalysisResult({ toolId, result, conversation }) {
  if (QUESTION_TOOLS.has(toolId)) return <div className="analysis-conversation">{conversation.map((turn, index) => <article key={index}><header><strong>You</strong><p>{turn.question}</p></header><div><strong>PDFEnrich sources</strong>{turn.passages.length ? <CitedList items={turn.passages} /> : <p>No passage shared enough specific terms with that question. Try using names, dates, or wording found in the document.</p>}</div></article>)}</div>;
  if (!result) return null;
  if (toolId === "summarize-pdf") return <CitedList items={result} />;
  if (toolId === "ai-question-generator") return <ol className="analysis-question-list">{result.map((item, index) => <li key={index}><strong>{item.question}</strong><p>{item.answer}</p><span>Answer source · Page {item.pageNumber}</span></li>)}</ol>;
  if (toolId === "translate-pdf") return <div className="analysis-translation"><h3>Translated text preview</h3><pre>{result}</pre></div>;
  if (toolId === "extract-data-from-pdf") return <div className="analysis-grouped-results">{Object.entries(result).map(([key, items]) => <section key={key}><h3>{key.replace(/([A-Z])/g, " $1")}</h3>{items.length ? <ul>{items.map((item, index) => <li key={index}><strong>{item.key ? `${item.key}: ` : ""}{item.value}</strong><span>Page {item.pageNumber}</span></li>)}</ul> : <p>None detected</p>}</section>)}</div>;
  return null;
}

export function DocumentAnalysisPage({ tool }) {
  const mode = MODES[tool.id];
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [query, setQuery] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [ocrLanguage, setOcrLanguage] = useState("eng");
  const [result, setResult] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const ModeIcon = mode.icon;
  const fullText = useMemo(() => pages.map((page) => `Page ${page.pageNumber}\n${page.text}`).join("\n\n"), [pages]);

  const beginFilePreparation = useCallback(() => {
    setFile(null); setPages([]); setResult(null); setConversation([]); setStatus("idle"); setProgress(0); setError("");
  }, []);

  const acceptPreparedText = useCallback(({ file: nextFile, pages: extracted }) => {
    setFile(nextFile); setPages(extracted); setStatus("ready"); setError("");
    trackProductEvent("document_opened", { toolId: tool.id });
  }, [tool.id]);

  const upload = usePdfTextExtractionInterceptor({
    onStart: beginFilePreparation,
    onTextReady: acceptPreparedText,
  });

  const choose = (nextFile) => {
    if (nextFile?.size > 20 * 1024 * 1024) {
      beginFilePreparation();
      setError("Choose a PDF no larger than 20 MB.");
      return;
    }
    void upload.handleFile(nextFile);
  };

  const run = async () => {
    if (!pages.length) return;
    if (QUESTION_TOOLS.has(tool.id) && !query.trim()) return setError("Enter a specific question about the PDF.");
    setStatus("analyzing"); setProgress(5); setError("");
    try {
      let nextResult;
      if (QUESTION_TOOLS.has(tool.id)) {
        const passages = findRelevantPassages(pages, query, 4);
        setConversation((turns) => [...turns, { question: query.trim(), passages }]);
        setQuery("");
      } else if (tool.id === "summarize-pdf") nextResult = summarizePages(pages, 7);
      else if (tool.id === "extract-data-from-pdf") nextResult = extractDocumentData(pages);
      else if (tool.id === "ai-question-generator") nextResult = generateDocumentQuestions(pages, 10);
      else if (tool.id === "translate-pdf") nextResult = await translateDocumentText(fullText, { sourceLanguage, targetLanguage, onProgress: ({ completed, total }) => setProgress(Math.round(completed / total * 96)) });
      setResult(nextResult || null); setProgress(100); setStatus("complete");
      trackProductEvent("export_succeeded", { toolId: tool.id });
    } catch (analysisError) {
      setStatus("ready"); setError(analysisError?.message || "The analysis could not be completed.");
      trackProductEvent("export_failed", { toolId: tool.id, errorCategory: "document_analysis_failed" });
    }
  };

  const reportText = QUESTION_TOOLS.has(tool.id)
    ? conversation.map((turn) => `Question: ${turn.question}\n${turn.passages.map((item) => `- ${item.sentence} [Page ${item.pageNumber}]`).join("\n") || "No matching source passage"}`).join("\n\n")
    : analysisReportText(tool.id, result);
  const baseName = file?.name.replace(/\.pdf$/i, "") || "document";

  const downloadTranslatedPdf = async () => {
    try {
      const pdf = await createPdfFromPlainText(result, { title: `${baseName} translated` });
      download(pdf, "application/pdf", `${baseName}-translated.pdf`, tool.id, true);
    } catch (pdfError) {
      setError(pdfError?.message || "The translated PDF could not be created. Download the TXT copy instead.");
    }
  };

  return <main className="document-analysis-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={toolSeoSchemas(tool)} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
    <section className="analysis-hero"><div><span><Sparkles size={15} /> {tool.id === "translate-pdf" ? "Beta · browser model required" : "Available · private browser analysis"}</span><h1>{tool.searchPriority ? tool.heroHeadline : `${tool.name}, grounded in your document`}.</h1><p>{tool.searchPriority ? `${tool.heroSubheadline} Review every result against the source pages.` : `${tool.shortDescription} Every extracted result stays tied to source pages for review.`}</p></div><aside><ShieldCheck size={22} /><strong>No document text enters analytics</strong><small>Analysis runs in this tab and is not saved.</small></aside></section>
    {!file ? upload.phase === "prompting" || upload.phase === "processing" ? <ScannedPdfPrompt
      file={upload.pendingFile}
      language={ocrLanguage}
      onLanguageChange={setOcrLanguage}
      onRunOcr={() => { void upload.runPendingOcr({ language: ocrLanguage }); }}
      onChooseAnother={() => { upload.reset(); setTimeout(() => inputRef.current?.click(), 0); }}
      isProcessing={upload.phase === "processing"}
      progress={upload.progress}
      message={upload.message}
      error={upload.error}
    /> : <section className="analysis-upload" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files?.[0]); }}><input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} /><span>{upload.phase === "detecting" ? <LoaderCircle className="is-spinning" size={27} /> : <Upload size={27} />}</span><h2>{upload.phase === "detecting" ? "Checking this PDF" : "Choose a PDF"}</h2><p>{upload.phase === "detecting" ? `${upload.message} ${upload.progress}%` : "Valid, unencrypted PDFs up to 20 MB and 100 pages. Scanned documents can continue with private local OCR."}</p><button type="button" disabled={upload.phase === "detecting"} onClick={() => inputRef.current?.click()}>Choose a PDF</button></section> : <div className="analysis-workspace"><aside className="analysis-source-card"><FileText size={24} /><h2>{file.name}</h2><p>{formatBytes(file.size)} · {pages.length} page{pages.length === 1 ? "" : "s"}</p><ul><li><Check size={15} /> {fullText.length.toLocaleString()} extracted characters</li><li><Check size={15} /> {upload.extractionSource === "ocr" ? "Text recognized with local OCR" : "Embedded text read in this browser"}</li><li><Check size={15} /> Source page citations retained</li><li><Check size={15} /> No document-content logging</li></ul><button type="button" onClick={() => inputRef.current?.click()}><Upload size={16} /> Replace PDF</button><input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} /></aside>
      <section className="analysis-main-card"><header><span><ModeIcon size={22} /></span><div><h2>{mode.heading}</h2><p>{mode.detail}</p></div></header>
        {QUESTION_TOOLS.has(tool.id) && <div className="analysis-question-box"><label htmlFor="document-question">Question about this PDF</label><div><textarea id="document-question" rows="3" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Example: What is the payment deadline?" /><button type="button" disabled={status === "analyzing"} onClick={run}><Send size={18} /> Ask</button></div></div>}
        {tool.id === "translate-pdf" && <div className="analysis-language"><div className="analysis-language-pair"><label><span>Document language</span><select aria-label="Document language" value={sourceLanguage} onChange={(event) => {
          const nextSource = event.target.value;
          setSourceLanguage(nextSource);
          if (nextSource === targetLanguage) setTargetLanguage(nextSource === "en" ? "es" : "en");
        }}>{LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><label><span>Translate to</span><select aria-label="Translate to" value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>{LANGUAGES.map(([code, label]) => <option key={code} value={code} disabled={code === sourceLanguage}>{label}</option>)}</select></label></div><small>Choose the PDF's current language and a different target language. Translation works only when that language pair is available through the browser's on-device Translator API.</small></div>}
        {!QUESTION_TOOLS.has(tool.id) && <button className="analysis-primary" type="button" disabled={status === "analyzing"} onClick={run}>{status === "analyzing" ? <><LoaderCircle className="is-spinning" size={18} /> Working… {progress}%</> : <><Sparkles size={18} /> {mode.action}</>}</button>}
        {status === "analyzing" && <div className="analysis-progress"><i style={{ width: `${progress}%` }} /></div>}{error && <div className="conversion-error" role="alert">{error}</div>}
        <AnalysisResult toolId={tool.id} result={result} conversation={conversation} />
        {(result || conversation.length > 0) && <div className="analysis-downloads">{tool.id === "translate-pdf" ? <><button type="button" onClick={downloadTranslatedPdf}><Download size={16} /> Download translated PDF</button><button type="button" onClick={() => download(result, "text/plain", `${baseName}-translated.txt`, tool.id)}><Download size={16} /> Download TXT</button></> : tool.id === "extract-data-from-pdf" ? <><button type="button" onClick={() => download(JSON.stringify(result, null, 2), "application/json", `${baseName}-data.json`, tool.id)}><Download size={16} /> Download JSON</button><button type="button" onClick={() => download(documentDataCsv(result), "text/csv", `${baseName}-data.csv`, tool.id)}><Download size={16} /> Download CSV</button></> : <button type="button" onClick={() => download(reportText, "text/plain", `${baseName}-${tool.id}.txt`, tool.id)}><Download size={16} /> Download report</button>}</div>}
      </section></div>}
    {upload.phase === "detecting" && <div className="analysis-reading"><LoaderCircle className="is-spinning" size={18} /> {upload.message} {upload.progress}%</div>}{(error || upload.error) && !file && upload.phase !== "prompting" && <div className="conversion-error" role="alert">{error || upload.error}</div>}
    <section className="analysis-disclosure"><h2>How this private analysis works</h2><p>Passage search, extractive summaries, field detection, and question building use deterministic matching in this tab. They return source text and page citations; they are not generative answers and can miss context. Translation is separate and requires a compatible browser's on-device Translator model. Always review results against the PDF.</p></section>
    <ToolGuideContent tool={tool} />
  </main>;
}
