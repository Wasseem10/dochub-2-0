# Paper Trail Homepage Sections — Design QA

## Evidence

- Selected source: `work/design-references/homepage-paper-trail-selected-2026-07-30.png`
- Desktop workflow: `work/design-qa/homepage-paper-trail/implementation-desktop-final.png`
- Desktop privacy band: `work/design-qa/homepage-paper-trail/implementation-desktop-privacy.png`
- Mobile workflow: `work/design-qa/homepage-paper-trail/implementation-mobile-final.png`
- Mobile privacy band: `work/design-qa/homepage-paper-trail/implementation-mobile-privacy.png`
- Side-by-side comparison: `work/design-qa/homepage-paper-trail/source-implementation-comparison-final.png`
- Source image: 1536 × 1024.
- Desktop viewport: 1280 × 720 at 1.25 device pixel ratio.
- Mobile viewport: 390 × 844 at 1 device pixel ratio.
- State: homepage workflow and privacy sections, optional analytics rejected.

## Comparison history

### Pass 1 — blocked

- P2: The mobile headline wrapped after “Change,” leaving “it.” stranded on a separate line.
- Fix: split the phrase into three deliberate mobile lines while retaining the selected two-line desktop lockup.

### Final pass — passed

- The generic numbered-card row is replaced by one connected upload, edit, and download paper journey.
- Real PDFEnrich document illustrations preserve consistent shape, depth, scale, and uncropped proportions.
- The coral path, pastel stage numbers, and restrained action controls match the selected bright tactile direction.
- The large lavender privacy card is replaced by an open warm-white trust band with a document-shield illustration and three divided proof statements.
- Desktop spacing, typography, color, hierarchy, and visible content track the selected Paper Trail source while using original PDFEnrich assets.
- Mobile recomposes into a vertical connected path with readable copy and professional uncropped art rather than shrinking the desktop layout.

## Functional and accessibility verification

- All workflow illustrations have useful alternative text.
- The connected journey has an explicit accessible label.
- The privacy illustration is decorative and excluded from the accessibility tree.
- The privacy details link remains keyboard accessible and routes to `/privacy`.
- Desktop and mobile layouts have no horizontal overflow.
- Reduced-motion users do not receive hover movement.
- Browser console errors: none.
- Production Vite build: passed.

final result: passed
