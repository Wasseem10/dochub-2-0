import { afterEach, describe, expect, it } from "vitest";
import {
  analyzeContract,
  analyzeResume,
  documentDataCsv,
  extractDocumentData,
  findRelevantPassages,
  generateDocumentQuestions,
  summarizePages,
  translateDocumentText,
} from "../../src/tools/documentIntelligence.js";

const pages = [
  { pageNumber: 1, text: "Service Agreement\nCustomer shall pay $42,000 by July 30, 2026. Contact: owner@example.com." },
  { pageNumber: 2, text: "Termination\nEither party may terminate this agreement with 30 days notice. Confidential information must remain protected." },
  { pageNumber: 3, text: "Experience\n- Led React development and increased revenue by 25%.\nSkills\nJavaScript React SQL" },
];

afterEach(() => { delete globalThis.Translator; delete globalThis.translation; });

describe("private document intelligence", () => {
  it("creates extractive summaries and source-grounded retrieval", () => {
    const summary = summarizePages(pages, 3);
    expect(summary).toHaveLength(3);
    expect(summary.every((item) => pages.some((page) => page.text.includes(item.sentence)))).toBe(true);
    const passages = findRelevantPassages(pages, "What is the termination notice?", 2);
    expect(passages[0].pageNumber).toBe(2);
    expect(passages[0].sentence).toContain("30 days");
  });

  it("extracts structured values and emits CSV", () => {
    const data = extractDocumentData(pages);
    expect(data.emails[0]).toEqual({ value: "owner@example.com", pageNumber: 1 });
    expect(data.currency[0].value).toBe("$42,000");
    expect(data.percentages[0].value).toBe("25%");
    expect(documentDataCsv(data)).toContain('"emails"');
  });

  it("organizes contract language, resume evidence, and questions", () => {
    expect(analyzeContract(pages).obligations[0].pageNumber).toBe(1);
    const resume = analyzeResume(pages);
    expect(resume.skills).toEqual(expect.arrayContaining(["javascript", "react", "sql"]));
    expect(resume.quantifiedBulletCount).toBe(1);
    const questions = generateDocumentQuestions(pages, 5);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]).toHaveProperty("pageNumber");
  });

  it("uses a browser Translator model in chunks and destroys it", async () => {
    let destroyed = false;
    globalThis.Translator = { availability: async () => "available", create: async () => ({ translate: async (text) => `ES:${text}`, destroy: () => { destroyed = true; } }) };
    const translated = await translateDocumentText("Payment due.\n\nTermination notice.", { targetLanguage: "es" });
    expect(translated).toContain("ES:Payment due.");
    expect(destroyed).toBe(true);
  });

  it("supports translating a non-English source document into English", async () => {
    let requestedPair;
    globalThis.Translator = {
      availability: async () => "available",
      create: async (options) => {
        requestedPair = options;
        return { translate: async (text) => `EN:${text}`, destroy() {} };
      },
    };
    const translated = await translateDocumentText("Pago pendiente.", { sourceLanguage: "es", targetLanguage: "en" });
    expect(requestedPair).toEqual({ sourceLanguage: "es", targetLanguage: "en" });
    expect(translated).toBe("EN:Pago pendiente.");
  });
});
