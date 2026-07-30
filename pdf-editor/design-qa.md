# Guided Questions Homepage FAQ — Design QA

## Evidence

- Selected source: `work/design-references/homepage-faq-guided-selected-2026-07-30.png`
- Desktop implementation: `work/design-qa/homepage-faq-guided/desktop-first.png`
- Desktop alternate state: `work/design-qa/homepage-faq-guided/desktop-faq-03-open.png`
- Mobile introduction: `work/design-qa/homepage-faq-guided/mobile-final.png`
- Mobile question path: `work/design-qa/homepage-faq-guided/mobile-faq-list.png`
- Side-by-side comparison: `work/design-qa/homepage-faq-guided/source-vs-implementation.png`
- Source image: 1536 × 1024.
- Desktop viewport: 1536 × 1024.
- Mobile viewport: 390 × 844.
- State: homepage FAQ, optional analytics rejected, first question open by default.

## Visual comparison

### Final pass — passed

- Replaced the generic rounded accordion stack with the selected two-column editorial answer desk.
- Preserved the selected hierarchy: oversized navy headline and original document-question art on the left, numbered coral question path on the right, and the reassurance rail integrated below.
- Kept one pale-lilac answer panel open at a time while using restrained coral, yellow, lilac, and powder-blue number markers.
- Matched the selected warm-white canvas, fine dividers, compact FAQ typography, open spacing, and professional document-tool character.
- Reused the selected composition without copying its draft copy; the released PDFEnrich FAQ answers remain accurate and product-specific.
- Mobile recomposes the design into a readable vertical path with uncropped art, full-width questions, and stacked reassurance rows.
- No P0, P1, or P2 visual issues remain.

## Functional and accessibility verification

- All six questions are real buttons with unique accessible names.
- `aria-expanded` updates on selection and each open answer is linked through `aria-controls`.
- Clicking question 03 closed question 01 and opened the correct answer.
- The illustration has useful alternative text and explicit intrinsic dimensions.
- Desktop and mobile layouts have no horizontal overflow.
- Browser console errors: none.
- ESLint completed with zero errors.
- Production Vite build: passed.

final result: passed
