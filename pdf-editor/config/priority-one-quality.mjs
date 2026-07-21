export const priorityOneToolCoverage = Object.freeze([
  { toolId: "edit-pdf", tests: ["tests/browser/editor-existing-text.spec.mjs", "tests/browser/editor-recovery-and-history.spec.mjs"], evidence: ["/edit-pdf", "export"] },
  { toolId: "merge-pdf", tests: ["tests/browser/core-tool-reliability.spec.mjs"], evidence: ["/merge-pdf", "getPageCount()).toBe(3)"] },
  { toolId: "split-pdf", tests: ["tests/browser/core-tool-reliability.spec.mjs"], evidence: ["/split-pdf", "getPageCount()).toBe(2)"] },
  { toolId: "compress-pdf", tests: ["tests/browser/core-tool-reliability.spec.mjs"], evidence: ["/compress-pdf", "toBeLessThan(source.length)"] },
  { toolId: "pdf-to-word", tests: ["tests/browser/core-tool-reliability.spec.mjs", "tests/browser/priority-one-recovery.spec.mjs"], evidence: ["/pdf-to-word", "word/document.xml", "Visual fidelity"] },
  { toolId: "pdf-to-excel", tests: ["tests/browser/structured-converters.spec.mjs"], evidence: ["/pdf-to-excel", "xl/worksheets/sheet1.xml"] },
  { toolId: "pdf-to-powerpoint", tests: ["tests/browser/structured-converters.spec.mjs"], evidence: ["/pdf-to-powerpoint", "ppt/slides/slide1.xml"] },
  { toolId: "pdf-to-html", tests: ["tests/browser/structured-converters.spec.mjs"], evidence: ["/pdf-to-html", "<svg viewBox="] },
  { toolId: "word-to-pdf", tests: ["tests/browser/core-tool-reliability.spec.mjs"], evidence: ["/word-to-pdf", "SEARCHABLE WORD REPORT 42000"] },
  { toolId: "excel-to-pdf", tests: ["tests/browser/to-pdf-and-ocr.spec.mjs"], evidence: ["/excel-to-pdf", "Quarter Total"] },
  { toolId: "powerpoint-to-pdf", tests: ["tests/browser/to-pdf-and-ocr.spec.mjs"], evidence: ["/powerpoint-to-pdf", "Production ready"] },
  { toolId: "html-to-pdf", tests: ["tests/browser/to-pdf-and-ocr.spec.mjs"], evidence: ["/html-to-pdf", "42,000"] },
  { toolId: "jpg-to-pdf", tests: ["tests/browser/priority-one-image-conversion.spec.mjs"], evidence: ["/jpg-to-pdf", "jpg-images.pdf"] },
  { toolId: "png-to-pdf", tests: ["tests/browser/priority-one-image-conversion.spec.mjs"], evidence: ["/png-to-pdf", "png-images.pdf"] },
  { toolId: "pdf-to-jpg", tests: ["tests/browser/priority-one-image-conversion.spec.mjs", "tests/browser/priority-one-recovery.spec.mjs"], evidence: ["/pdf-to-jpg", "0xff, 0xd8"] },
  { toolId: "pdf-to-png", tests: ["tests/browser/priority-one-image-conversion.spec.mjs"], evidence: ["/pdf-to-png", "0x89, 0x50, 0x4e, 0x47"] },
  { toolId: "ocr-pdf", tests: ["tests/browser/to-pdf-and-ocr.spec.mjs"], evidence: ["/ocr-pdf", "ocr-quality-result"] },
  { toolId: "sign-pdf", tests: ["tests/browser/core-tool-reliability.spec.mjs"], evidence: ["/sign-pdf", "Wasseem Dabbas"] },
  { toolId: "protect-pdf", tests: ["tests/browser/core-tool-reliability.spec.mjs"], evidence: ["/protect-pdf", "/Encrypt"] },
  { toolId: "unlock-pdf", tests: ["tests/browser/protection-and-scanning.spec.mjs"], evidence: ["/unlock-pdf", "document-unlocked.pdf"] },
  { toolId: "compare-pdf", tests: ["tests/browser/pdf-comparison.spec.mjs"], evidence: ["/compare-pdf", "reviewable changes", "revised-comparison.pdf"] },
]);

export const priorityOneScenarioCoverage = Object.freeze([
  { scenario: "simple", tests: ["tests/browser/core-tool-reliability.spec.mjs"], evidence: ["merge and split preserve valid native PDF pages"] },
  { scenario: "complex_layout", tests: ["tests/browser/editor-existing-text.spec.mjs", "tests/browser/to-pdf-and-ocr.spec.mjs"], evidence: ["existing PDF text keeps its detected style", "PowerPoint"] },
  { scenario: "scanned", tests: ["tests/browser/to-pdf-and-ocr.spec.mjs", "tests/browser/priority-one-recovery.spec.mjs"], evidence: ["OCR recognizes a scanned page", "image-only documents"] },
  { scenario: "encrypted", tests: ["tests/browser/core-tool-reliability.spec.mjs", "tests/browser/protection-and-scanning.spec.mjs"], evidence: ["genuinely encrypted PDF", "password removal"] },
  { scenario: "malformed", tests: ["tests/browser/priority-one-recovery.spec.mjs", "tests/browser/editor-recovery-and-history.spec.mjs"], evidence: ["reject malformed PDFs", "corrupted PDF"] },
  { scenario: "large", tests: ["tests/browser/editor-large-document.spec.mjs"], evidence: ["large PDFs progressively"] },
  { scenario: "mobile", tests: ["tests/browser/editor-recovery-and-history.spec.mjs"], evidence: ["mobile editor collapses thumbnails"] },
]);

export const priorityOneBrowserProjects = Object.freeze(["desktop-chromium", "android-chromium", "iphone-webkit"]);
