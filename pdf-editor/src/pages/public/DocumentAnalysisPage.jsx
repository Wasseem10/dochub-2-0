import { useMemo, useRef, useState } from "react";
import Bot from "lucide-react/dist/esm/icons/bot.mjs";
import Check from "lucide-react/dist/esm/icons/check.mjs";
import Database from "lucide-react/dist/esm/icons/database.mjs";
import Download from "lucide-react/dist/esm/icons/download.mjs";
import FileCheck2 from "lucide-react/dist/esm/icons/file-check-2.mjs";
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
import { ToolGuideContent } from "../../components/public/ToolGuideContent.jsx";
import { ROUTE_PATHS } from "../../router/routePaths.js";
import { toolSeoSchemas } from "../../tools/toolSeoSchemas.js";
import {
  analysisReportText,
  analyzeContract,
  analyzeResume,
  documentDataCsv,
  extractDocumentData,
  findRelevantPassages,
  generateDocumentQuestions,
  summarizePages,
  translateDocumentText,
} from "../../tools/documentIntelligence.js";
import { createPdfFromPlainText, textContentToPlainText } from "../../tools/textConversion.js";

const QUESTION_TOOLS = new Set(["ai-pdf", "chat-with-pdf", "ask-pdf"]);
const MODES = Object.freeze({
  "ai-pdf": { icon: Bot, heading: "Ask for source-grounded help", detail: "FixThatPDF retrieves the strongest matching passages from the PDF and cites their pages. It does not invent an answer beyond the source text.", action: "Find cited passages" },
  "chat-with-pdf": { icon: MessageSquareText, heading: "Keep a private document conversation", detail: "Ask multiple questions in this tab. Every response is a set of exact, page-cited source passages; conversation text is not uploaded or saved.", action: "Ask document" },
  "summarize-pdf": { icon: Sparkles, heading: "Create an extractive page-cited summary", detail: "Important source sentences are ranked by document terms, reduced for repetition, and kept in document order. No model-generated facts are added.", action: "Create cited summary" },
  "translate-pdf": { icon: Languages, heading: "Translate with your browser's local language model", detail: "Compatible Chrome browsers can download and run an on-device Translator model. The source PDF is never sent to FixThatPDF or a translation server.", action: "Translate document" },
  "extract-data-from-pdf": { icon: Database, heading: "Extract structured fields with page references", detail: "Detect email addresses, phone numbers, dates, money, percentages, and label-value lines, then download JSON or CSV for review.", action: "Extract document data" },
  "ask-pdf": { icon: MessageSquareText, heading: "Find where the PDF answers your question", detail: "Question terms are matched against document sentences and numbers. The result shows exact passages with page citations instead of a generated answer.", action: "Find answer sources" },
  "ai-question-generator": { icon: Sparkles, heading: "Generate review questions from real sentences", detail: "Important document terms and figures become questions with exact source-sentence answer keys and page citations.", action: "Generate questions" },
  "contract-analyzer": { icon: FileCheck2, heading: "Surface clauses that deserve human review", detail: "Detect obligation, termination, confidentiality, liability, date, and money language with source pages. This is document organization, not legal advice.", action: "Analyze contract" },
  "resume-analyzer": { icon: FileText, heading: "Check resume structure and evidence", detail: "Review sections, contact details, skills, action verbs, bullets, and quantified results. FixThatPDF does not rank candidates or infer protected traits.", action: "Analyze resume" },
});

const LANGUAGES = [
  ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["it", "Italian"], ["pt", "Portuguese"], ["ja", "Japanese"], ["ko", "Korean"], ["zh", "Chinese"],
];

async function loadPdfRenderer() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  return pdfjs;
}

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
  if (QUESTION_TOOLS.has(toolId)) return <div className="analysis-conversation">{conversation.map((turn, index) => <article key={index}><header><strong>You</strong><p>{turn.question}</p></header><div><strong>FixThatPDF sources</strong>{turn.passages.length ? <CitedList items={turn.passages} /> : <p>No passage shared enough specific terms with that question. Try using names, dates, or wording found in the document.</p>}</div></article>)}</div>;
  if (!result) return null;
  if (toolId === "summarize-pdf") return <CitedList items={result} />;
  if (toolId === "ai-question-generator") return <ol className="analysis-question-list">{result.map((item, index) => <li key={index}><strong>{item.question}</strong><p>{item.answer}</p><span>Answer source · Page {item.pageNumber}</span></li>)}</ol>;
  if (toolId === "translate-pdf") return <div className="analysis-translation"><h3>Translated text preview</h3><pre>{result}</pre></div>;
  if (toolId === "resume-analyzer") return <div className="analysis-metric-grid">{Object.entries(result).map(([key, value]) => <article key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><strong>{Array.isArray(value) ? value.join(", ") || "None detected" : value || "Not detected"}</strong></article>)}</div>;
  if (toolId === "extract-data-from-pdf") return <div className="analysis-grouped-results">{Object.entries(result).map(([key, items]) => <section key={key}><h3>{key.replace(/([A-Z])/g, " $1")}</h3>{items.length ? <ul>{items.map((item, index) => <li key={index}><strong>{item.key ? `${item.key}: ` : ""}{item.value}</strong><span>Page {item.pageNumber}</span></li>)}</ul> : <p>None detected</p>}</section>)}</div>;
  if (toolId === "contract-analyzer") return <div className="analysis-grouped-results">{Object.entries(result).map(([key, items]) => <section key={key}><h3>{key}</h3>{items.length ? <ul>{items.map((item, index) => <li key={index}><strong>{item.sentence || item.value}</strong><span>Page {item.pageNumber}</span></li>)}</ul> : <p>None detected</p>}</section>)}</div>;
  return null;
}

export function DocumentAnalysisPage({ tool }) {
  const mode = MODES[tool.id];
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [query, setQuery] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [result, setResult] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const ModeIcon = mode.icon;
  const fullText = useMemo(() => pages.map((page) => `Page ${page.pageNumber}\n${page.text}`).join("\n\n"), [pages]);

  const choose = async (nextFile) => {
    setError(""); setResult(null); setConversation([]);
    if (!nextFile) return;
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) return setError("Choose a PDF file.");
    if (!nextFile.size) return setError("This PDF is empty.");
    if (nextFile.size > 20 * 1024 * 1024) return setError("Choose a PDF no larger than 20 MB.");
    setStatus("reading"); setProgress(0);
    let documentProxy;
    try {
      const pdfjs = await loadPdfRenderer();
      documentProxy = await pdfjs.getDocument({ data: new Uint8Array(await nextFile.arrayBuffer()) }).promise;
      if (documentProxy.numPages > 100) throw new Error("Document analysis supports up to 100 pages.");
      const extracted = [];
      let characters = 0;
      for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
        const page = await documentProxy.getPage(pageNumber);
        const text = textContentToPlainText(await page.getTextContent());
        characters += text.length;
        if (characters > 600_000) throw new Error("This PDF contains too much text for safe browser analysis.");
        extracted.push({ pageNumber, text });
        setProgress(Math.round(pageNumber / documentProxy.numPages * 100));
      }
      if (!extracted.some((page) => page.text.trim())) throw new Error("No embedded text was found. Run OCR PDF first, then analyze the searchable copy.");
      setFile(nextFile); setPages(extracted); setStatus("ready");
      trackProductEvent("document_opened", { toolId: tool.id });
    } catch (loadError) {
      setFile(null); setPages([]); setStatus("idle"); setError(loadError?.message || "This PDF could not be analyzed.");
    } finally {
      await documentProxy?.destroy?.();
    }
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
      else if (tool.id === "contract-analyzer") nextResult = analyzeContract(pages);
      else if (tool.id === "resume-analyzer") nextResult = analyzeResume(pages);
      else if (tool.id === "translate-pdf") nextResult = await translateDocumentText(fullText, { sourceLanguage: "en", targetLanguage, onProgress: ({ completed, total }) => setProgress(Math.round(completed / total * 96)) });
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
    const pdf = await createPdfFromPlainText(result, { title: `${baseName} translated` });
    download(pdf, "application/pdf", `${baseName}-translated.pdf`, tool.id, true);
  };

  return <main className="document-analysis-page">
    <PageMetadata title={tool.seoTitle} description={tool.metaDescription} canonicalUrl={tool.canonicalUrl} schemas={toolSeoSchemas(tool)} />
    <nav className="tool-breadcrumbs" aria-label="Breadcrumb"><Link to={ROUTE_PATHS.tools}>PDF tools</Link><span>/</span><span aria-current="page">{tool.name}</span></nav>
    <section className="analysis-hero"><div><span><Sparkles size={15} /> {tool.id === "translate-pdf" ? "Beta · browser model required" : "Available · private browser analysis"}</span><h1>{tool.name}, grounded in your document.</h1><p>{tool.shortDescription} Every extracted result stays tied to source pages for review.</p></div><aside><ShieldCheck size={22} /><strong>No document text enters analytics</strong><small>Analysis runs in this tab and is not saved.</small></aside></section>
    {!file ? <section className="analysis-upload" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void choose(event.dataTransfer.files?.[0]); }}><input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} /><span><Upload size={27} /></span><h2>Choose a text-based PDF</h2><p>Valid, unencrypted PDFs up to 20 MB and 100 pages. Image-only scans need OCR first.</p><button type="button" onClick={() => inputRef.current?.click()}>Choose a PDF</button></section> : <div className="analysis-workspace"><aside className="analysis-source-card"><FileText size={24} /><h2>{file.name}</h2><p>{formatBytes(file.size)} · {pages.length} page{pages.length === 1 ? "" : "s"}</p><ul><li><Check size={15} /> {fullText.length.toLocaleString()} extracted characters</li><li><Check size={15} /> Source page citations retained</li><li><Check size={15} /> No document-content logging</li></ul><button type="button" onClick={() => inputRef.current?.click()}><Upload size={16} /> Replace PDF</button><input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} /></aside>
      <section className="analysis-main-card"><header><span><ModeIcon size={22} /></span><div><h2>{mode.heading}</h2><p>{mode.detail}</p></div></header>
        {QUESTION_TOOLS.has(tool.id) && <div className="analysis-question-box"><label htmlFor="document-question">Question about this PDF</label><div><textarea id="document-question" rows="3" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Example: What is the payment deadline?" /><button type="button" disabled={status === "analyzing"} onClick={run}><Send size={18} /> Ask</button></div></div>}
        {tool.id === "translate-pdf" && <label className="analysis-language"><span>Translate English document text to</span><select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>{LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><small>Translation works only when this language pair is available through the browser's on-device Translator API.</small></label>}
        {!QUESTION_TOOLS.has(tool.id) && <button className="analysis-primary" type="button" disabled={status === "analyzing"} onClick={run}>{status === "analyzing" ? <><LoaderCircle className="is-spinning" size={18} /> Working… {progress}%</> : <><Sparkles size={18} /> {mode.action}</>}</button>}
        {status === "analyzing" && <div className="analysis-progress"><i style={{ width: `${progress}%` }} /></div>}{error && <div className="conversion-error" role="alert">{error}</div>}
        <AnalysisResult toolId={tool.id} result={result} conversation={conversation} />
        {(result || conversation.length > 0) && <div className="analysis-downloads">{tool.id === "translate-pdf" ? <><button type="button" onClick={downloadTranslatedPdf}><Download size={16} /> Download translated PDF</button><button type="button" onClick={() => download(result, "text/plain", `${baseName}-translated.txt`, tool.id)}><Download size={16} /> Download TXT</button></> : tool.id === "extract-data-from-pdf" ? <><button type="button" onClick={() => download(JSON.stringify(result, null, 2), "application/json", `${baseName}-data.json`, tool.id)}><Download size={16} /> Download JSON</button><button type="button" onClick={() => download(documentDataCsv(result), "text/csv", `${baseName}-data.csv`, tool.id)}><Download size={16} /> Download CSV</button></> : <button type="button" onClick={() => download(reportText, "text/plain", `${baseName}-${tool.id}.txt`, tool.id)}><Download size={16} /> Download report</button>}</div>}
      </section></div>}
    {status === "reading" && <div className="analysis-reading"><LoaderCircle className="is-spinning" size={18} /> Extracting document text… {progress}%</div>}{error && !file && <div className="conversion-error" role="alert">{error}</div>}
    <section className="analysis-disclosure"><h2>What “AI” means in this private workflow</h2><p>FixThatPDF uses deterministic local document intelligence for retrieval, extractive summaries, field detection, questions, contract organization, and resume structure. It returns source text and page citations instead of sending your PDF to a generative model. Translation is separate and uses a compatible browser's on-device Translator model. Always review results against the PDF.</p></section>
    <ToolGuideContent tool={tool} />
  </main>;
}
