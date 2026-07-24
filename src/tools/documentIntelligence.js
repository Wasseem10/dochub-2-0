const STOP_WORDS = new Set("a an and are as at be been being but by can could did do does for from had has have he her hers him his how i if in into is it its may might more most must my no not of on one or our ours shall she should so than that the their theirs them then there these they this those to under up was we were what when where which who will with would you your yours".split(" "));

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokens(value) {
  return (String(value || "").toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) || []).filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

export function sentenceRecords(pages) {
  const records = [];
  for (const page of pages || []) {
    const blocks = String(page.text || "").replace(/\r/g, "\n").split(/(?<=[.!?])\s+|\n+/);
    blocks.map(clean).filter((sentence) => sentence.length >= 20).forEach((sentence, index) => records.push({ pageNumber: page.pageNumber, sentence, index }));
  }
  return records;
}

function wordFrequencies(records) {
  const frequency = new Map();
  records.forEach((record) => new Set(tokens(record.sentence)).forEach((word) => frequency.set(word, (frequency.get(word) || 0) + 1)));
  return frequency;
}

export function summarizePages(pages, maxSentences = 6) {
  const records = sentenceRecords(pages);
  if (!records.length) return [];
  const frequency = wordFrequencies(records);
  const scored = records.map((record, order) => {
    const words = tokens(record.sentence);
    const relevance = words.reduce((sum, word) => sum + (frequency.get(word) || 0), 0) / Math.max(6, words.length);
    const positionBonus = record.index === 0 ? 1.1 : 0;
    const lengthPenalty = record.sentence.length > 360 ? 0.6 : 0;
    return { ...record, order, score: relevance + positionBonus - lengthPenalty };
  });
  const selected = [];
  for (const candidate of scored.sort((a, b) => b.score - a.score)) {
    const candidateWords = new Set(tokens(candidate.sentence));
    const duplicate = selected.some((item) => {
      const existing = new Set(tokens(item.sentence));
      const overlap = [...candidateWords].filter((word) => existing.has(word)).length;
      return overlap / Math.max(1, Math.min(candidateWords.size, existing.size)) > 0.72;
    });
    if (!duplicate) selected.push(candidate);
    if (selected.length >= maxSentences) break;
  }
  return selected.sort((a, b) => a.order - b.order).map(({ sentence, pageNumber, score }) => ({ sentence, pageNumber, score }));
}

export function findRelevantPassages(pages, question, limit = 4) {
  const query = new Set(tokens(question));
  if (!query.size) return [];
  return sentenceRecords(pages).map((record) => {
    const sentenceWords = new Set(tokens(record.sentence));
    const matched = [...query].filter((word) => sentenceWords.has(word));
    const exactNumberMatches = (String(question).match(/\b\d[\d,.%/-]*\b/g) || []).filter((value) => record.sentence.includes(value)).length;
    const score = matched.length * 3 + matched.length / query.size * 4 + exactNumberMatches * 4;
    return { ...record, matched, score };
  }).filter((record) => record.score > 0).sort((a, b) => b.score - a.score || a.pageNumber - b.pageNumber).slice(0, limit);
}

export function generateDocumentQuestions(pages, limit = 10) {
  const records = sentenceRecords(pages);
  const frequency = wordFrequencies(records);
  const candidates = records.filter((record) => record.sentence.length >= 35 && record.sentence.length <= 280).map((record) => {
    const keywords = [...new Set(tokens(record.sentence))].sort((a, b) => (frequency.get(b) || 0) - (frequency.get(a) || 0));
    const keyword = keywords.find((word) => word.length >= 5);
    const hasFigure = /(?:[$€£]\s?\d|\b\d+(?:[,.]\d+)*(?:%|\s(?:days?|years?|months?))?\b)/i.test(record.sentence);
    return { ...record, keyword, score: (keyword ? frequency.get(keyword) || 0 : 0) + (hasFigure ? 3 : 0) };
  }).filter((record) => record.keyword).sort((a, b) => b.score - a.score);
  const used = new Set();
  const questions = [];
  for (const candidate of candidates) {
    if (used.has(candidate.keyword)) continue;
    used.add(candidate.keyword);
    questions.push({ question: `What does the document state about ${candidate.keyword}?`, answer: candidate.sentence, pageNumber: candidate.pageNumber });
    if (questions.length >= limit) break;
  }
  return questions;
}

function uniqueMatches(pages, regex) {
  const seen = new Set();
  const output = [];
  for (const page of pages || []) for (const match of String(page.text || "").matchAll(regex)) {
    const value = clean(match[0]);
    const key = value.toLowerCase();
    if (!seen.has(key)) { seen.add(key); output.push({ value, pageNumber: page.pageNumber }); }
  }
  return output;
}

export function extractDocumentData(pages) {
  const keyValues = [];
  for (const page of pages || []) {
    for (const line of String(page.text || "").split(/\n+/)) {
      const match = line.match(/^\s*([^:]{2,50})\s*:\s*(.{1,180})\s*$/);
      if (match) keyValues.push({ key: clean(match[1]), value: clean(match[2]), pageNumber: page.pageNumber });
    }
  }
  return {
    emails: uniqueMatches(pages, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi),
    phoneNumbers: uniqueMatches(pages, /(?:\+?\d[\d().\s-]{7,}\d)/g),
    dates: uniqueMatches(pages, /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi),
    currency: uniqueMatches(pages, /(?:[$€£]\s?\d[\d,]*(?:\.\d{1,2})?|\b\d[\d,]*(?:\.\d{1,2})?\s?(?:USD|EUR|GBP)\b)/gi),
    percentages: uniqueMatches(pages, /\b\d+(?:\.\d+)?%/g),
    keyValues: keyValues.slice(0, 100),
  };
}

export function documentDataCsv(data) {
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [["type", "key", "value", "page"]];
  for (const type of ["emails", "phoneNumbers", "dates", "currency", "percentages"]) (data[type] || []).forEach((item) => rows.push([type, "", item.value, item.pageNumber]));
  (data.keyValues || []).forEach((item) => rows.push(["keyValue", item.key, item.value, item.pageNumber]));
  return rows.map((row) => row.map(quote).join(",")).join("\n");
}

export function analyzeContract(pages) {
  const records = sentenceRecords(pages);
  const pick = (regex, limit = 20) => records.filter((record) => regex.test(record.sentence)).slice(0, limit).map(({ sentence, pageNumber }) => ({ sentence, pageNumber }));
  return {
    obligations: pick(/\b(?:shall|must|required to|agrees? to|responsible for|will provide)\b/i),
    termination: pick(/\b(?:terminat|cancel|expiration|expire|notice period)\w*\b/i, 12),
    confidentiality: pick(/\b(?:confidential|non-disclosure|proprietary information|trade secret)\w*\b/i, 12),
    liability: pick(/\b(?:liabil|indemn|warrant|damages|limitation of liability)\w*\b/i, 12),
    dates: extractDocumentData(pages).dates,
    money: extractDocumentData(pages).currency,
  };
}

const RESUME_SKILLS = ["javascript", "typescript", "python", "java", "c++", "c#", "react", "node", "sql", "aws", "azure", "gcp", "docker", "kubernetes", "figma", "salesforce", "excel", "powerpoint", "leadership", "project management", "product management", "marketing", "sales", "finance", "accounting", "data analysis", "machine learning", "customer service"];
const ACTION_VERBS = new Set("achieved built created delivered designed developed drove improved increased launched led managed negotiated optimized organized reduced resolved scaled shipped streamlined supported transformed".split(" "));

export function analyzeResume(pages) {
  const text = (pages || []).map((page) => page.text).join("\n");
  const words = tokens(text);
  const lower = text.toLowerCase();
  const sections = ["summary", "experience", "education", "skills", "projects", "certifications"].filter((section) => new RegExp(`(?:^|\\n)\\s*${section}\\s*(?:\\n|$|:)`, "i").test(text));
  const skills = RESUME_SKILLS.filter((skill) => new RegExp(`\\b${skill.replace(/[+#]/g, "\\$&")}\\b`, "i").test(lower));
  const actionVerbs = [...new Set(words.filter((word) => ACTION_VERBS.has(word)))];
  const bulletLines = text.split(/\n+/).filter((line) => /^\s*(?:[-•*]|\d+[.)])\s+/.test(line));
  const quantifiedBullets = bulletLines.filter((line) => /\b\d+(?:\.\d+)?%|[$€£]\s?\d|\b\d+[xX]\b/.test(line));
  const data = extractDocumentData(pages);
  return { wordCount: text.trim().split(/\s+/).filter(Boolean).length, pageCount: pages.length, sections, skills, actionVerbs, bulletCount: bulletLines.length, quantifiedBulletCount: quantifiedBullets.length, email: data.emails[0]?.value || "", phone: data.phoneNumbers[0]?.value || "" };
}

export function analysisReportText(toolId, result) {
  if (!result) return "";
  if (toolId === "summarize-pdf") return result.map((item) => `${item.sentence} [Page ${item.pageNumber}]`).join("\n\n");
  if (toolId === "ai-question-generator") return result.map((item, index) => `${index + 1}. ${item.question}\nAnswer: ${item.answer} [Page ${item.pageNumber}]`).join("\n\n");
  if (toolId === "extract-data-from-pdf") return JSON.stringify(result, null, 2);
  if (toolId === "contract-analyzer") return Object.entries(result).map(([key, items]) => `${key.toUpperCase()}\n${(items || []).map((item) => `- ${item.sentence || item.value} [Page ${item.pageNumber}]`).join("\n") || "None detected"}`).join("\n\n");
  if (toolId === "resume-analyzer") return Object.entries(result).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join("\n");
  return String(result);
}

async function createBrowserTranslator(sourceLanguage, targetLanguage) {
  if (globalThis.Translator?.create) {
    const availability = await globalThis.Translator.availability?.({ sourceLanguage, targetLanguage });
    if (availability === "unavailable" || availability === "no") throw new Error("This language pair is unavailable in the browser translator.");
    return globalThis.Translator.create({ sourceLanguage, targetLanguage });
  }
  if (globalThis.translation?.createTranslator) return globalThis.translation.createTranslator({ sourceLanguage, targetLanguage });
  throw new Error("This browser does not provide on-device translation yet. Use a current Chrome browser with the Translator API enabled.");
}

function translationChunks(text, maxLength = 3200) {
  const chunks = [];
  let current = "";
  for (const paragraph of String(text || "").split(/\n{2,}/)) {
    if (current && current.length + paragraph.length + 2 > maxLength) { chunks.push(current); current = ""; }
    if (paragraph.length > maxLength) {
      if (current) { chunks.push(current); current = ""; }
      for (let index = 0; index < paragraph.length; index += maxLength) chunks.push(paragraph.slice(index, index + maxLength));
    } else current += `${current ? "\n\n" : ""}${paragraph}`;
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function translateDocumentText(text, { sourceLanguage = "en", targetLanguage, onProgress } = {}) {
  if (!String(text || "").trim()) throw new Error("No text is available to translate.");
  if (!targetLanguage || targetLanguage === sourceLanguage) throw new Error("Choose a different target language.");
  const translator = await createBrowserTranslator(sourceLanguage, targetLanguage);
  try {
    const chunks = translationChunks(text);
    const output = [];
    for (const [index, chunk] of chunks.entries()) {
      output.push(await translator.translate(chunk));
      onProgress?.({ completed: index + 1, total: chunks.length });
    }
    return output.join("\n\n");
  } finally {
    translator.destroy?.();
  }
}
