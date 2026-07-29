# Popular Tools Exact Icon Match — Design QA

## Evidence

- Source visual truth: `work/design-references/popular-tools-professional-selected-2026-07-29.png`
- Desktop implementation: `work/design-qa/popular-tools-professional-2026-07-29/desktop-exact-icons-final-v3.png`
- Mobile implementation: `work/design-qa/popular-tools-professional-2026-07-29/mobile-exact-icons-final-v3.png`
- Full comparison: `work/design-qa/popular-tools-professional-2026-07-29/comparison-exact-icons-final-v5.jpg`
- Source pixels: 1866 × 843 at 1× density.
- Desktop implementation pixels: 1866 × 842 at 1× density.
- Desktop CSS viewport override: 1881 × 849, yielding a 1866px captured content viewport.
- Mobile CSS viewport: 390 × 844.
- State: homepage Popular Tools section at rest.

## Findings and comparison history

### Pass 1 — blocked

- P1: The first implementation used one generic monochrome Tabler glyph per card, so its icon anatomy did not match the selected source.
- P2: The cards and icon fields were narrower and more compact than the source.
- Fix: widened the grid to 1390px, matched the 270px card height, and replaced every generic glyph with a layered production document-outline plus command-mark composition.

### Pass 2 — blocked

- P2: The composed icons were too small and heavy compared with the source.
- P2: The heading typography and vertical rhythm were visibly smaller than the source.
- Fix: matched the 84px icon canvas and source-scale optical size, reduced the SVG stroke to 0.65, moved the icons to the measured source position, and matched the source heading sizes, label spacing, paragraph scale, divider position, and card text rhythm.

### Final pass — passed

- The ten icons now follow the source's exact document-command anatomy: merge/add, compress/minimize, edit/pencil, convert/refresh, split/scissors, sign/signature, fill/checklist, organize/grid, OCR/scan, and protect/lock.
- Navy document outlines and PDFEnrich-blue command details match the selected source direction.
- All visible icon layers come from the production Tabler library; no raster crops, generated icon bitmaps, handcrafted SVGs, or stretched assets are used.
- Desktop cards measure 263.6 × 270px and begin at the same 238px content inset and 209px vertical position as the source.
- Every icon remains square. Browser geometry reported a 1.0 width-to-height ratio for all ten icons.

## Required fidelity surfaces

- Fonts and typography: source-matched 14px eyebrow, 60px/1.03 heading, 18px supporting copy, 18px tool titles, and 14px descriptions.
- Spacing and layout: source-matched 1390px five-column grid, 18px gaps, 270px cards, 110px icon field, and 25px text handoff.
- Colors and tokens: white cards, neutral hairlines, navy outlines, and `#2851eb` command accents.
- Image and icon quality: production vector layers with native `0 0 24 24` viewBoxes, round joins, consistent strokes, and square scaling.
- Copy and content: all ten tool names and descriptions match the selected source.

## Responsive and functional verification

- Mobile uses two equal columns with no horizontal overflow.
- Mobile document width and viewport width are both 375px.
- All ten icons remain square at the mobile breakpoint.
- All ten cards remain keyboard-accessible links to their existing PDF tool routes.
- Merge PDF navigation was exercised successfully.
- Browser console errors: none.
- Focused icon suite: 11 tests passed.
- TypeScript: passed.
- Production build, prerender, sitemap, and public performance audit: passed.

final result: passed
