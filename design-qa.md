# Finish Export Chooser — Design QA

## Evidence

- Source visual truth: `C:/Users/wasse/AppData/Local/Temp/codex-clipboard-0ae04c8a-48f8-41b7-bc31-f0c8315e1d72.png`
- Desktop implementation: `work/design-qa/finish-export-chooser-2026-07-29/desktop-1302x777.jpg`
- Mobile implementation: `work/design-qa/finish-export-chooser-2026-07-29/mobile-390x844.jpg`
- Full side-by-side comparison: `work/design-qa/finish-export-chooser-2026-07-29/comparison-source-vs-implementation.jpg`
- Focused modal comparison: `work/design-qa/finish-export-chooser-2026-07-29/focused-modal-comparison.jpg`
- Source and desktop viewport: 1302 × 777.
- Mobile verification viewport: 390 × 844.

## Fidelity summary

- Preserved the reference’s dimmed editor context, compact white chooser, two-column format grid, radio selection, close control, and clear download action.
- Kept PDF, PNG, Word, Excel, JPG, and PowerPoint as the six visible choices.
- Added the active document name, page count, short format descriptions, and a recommended PDF state so the choice is clearer without changing the reference hierarchy.
- Used the existing PDFEnrich typography, blue primary action, neutral borders, and Lucide icon system.

## Responsive adaptation

- Desktop uses the compact centered two-column dialog shown in the reference.
- Mobile uses a bottom sheet with safe-area padding, a two-column touch grid, and full-width actions.
- At 390 × 844, document width and viewport width are both 390px; there is no horizontal overflow.
- Secondary descriptions collapse on small screens so all six formats and both actions remain visible.

## Functional verification

- Finish saves the active document and opens the chooser without navigating away.
- Choosing Word updates the radio state and primary action label.
- A real Word export completed from the editor; the downloaded DOCX contained `word/document.xml` and embedded page media.
- PDF preserves the existing edited-PDF and signed-export review workflow.
- PNG and JPG render every page and package multi-page exports as ZIP files.
- Excel extracts readable rows; PowerPoint creates one rendered PDF page per slide.
- Progress and conversion errors remain visible in the chooser.

## Automated verification

- TypeScript: passed.
- Focused export Vitest suite: 3 tests passed.
- Production Vite build: passed.
- Visual comparison: no actionable P0, P1, or P2 differences remain.

final result: passed
