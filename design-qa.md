# Design QA

## Landing page

Latest request reviewed: make the landing page light, simple, and enterprise-grade.

Prototype reviewed: http://127.0.0.1:4173/?v=light-enterprise-local

Checks completed:

- Desktop landing now uses a light SaaS visual system: white surfaces, restrained blue accents, subtle borders, slate text, and softer shadows.
- Removed the dark editorial/report direction, heavy black blocks, chunky borders, loud cards, and oversized gimmick styling.
- Content is original to the PDF editor and avoids fake study-style metrics in the capabilities section.
- Desktop has no horizontal overflow at 1280px.
- Mobile has no horizontal overflow at 390px; nav collapses to the menu and cards stack cleanly.
- Tool filters work; selecting Sign shows Type signature, Request signature, and Comments.
- FAQ accordion opens correctly.
- Production build passes.

Residual P3 polish:

- A future pass can add a real brand mark and product screenshots once the company name and visual identity are chosen.

## Shapes toolbar

- Reference: `/var/folders/y5/5nxfxhk97_9fmsmdf8tqj81r0000gn/T/TemporaryItems/NSIRD_screencaptureui_wOgO2H/Screenshot 2026-07-20 at 9.51.17 PM.png`
- Implementation capture: `/tmp/fixthepdf-shapes-menu.png`
- Side-by-side comparison: `/tmp/fixthepdf-shapes-comparison.png`
- Viewport: 1280 × 720
- State: blank PDF open in the editor, Shapes menu expanded, one rectangle drawn and selected

## Full-view comparison

The Shapes control sits in the existing compact editor toolbar between Sign and Draw. Its menu opens directly below the control without covering the label or moving the toolbar. The PDF canvas, thumbnail rail, document actions, and zoom controls retain their existing layout.

## Focused comparison

The focused side-by-side input compares the supplied menu and the implementation in one image. Both use the same four-row order (Arrow, Line, Circle, Rectangle), subdued gray labels, thin outline icons, a white surface, and rounded lower corners. The implementation uses the product's existing shadow, blue active state, spacing, and icon system so the new control is consistent with the rest of the editor.

## QA history

1. Initial implementation: P1 — the dropdown existed in the DOM but was clipped by the horizontally scrollable toolbar.
2. Fix: render the dropdown in a fixed-position portal, anchored to the Shapes button, with outside-click, Escape, and resize dismissal.
3. Final comparison: no actionable P0, P1, or P2 visual issues.

## Surface checks

- Typography: passed — matches existing toolbar/menu sizing and weight.
- Spacing: passed — four evenly sized rows and aligned icons/labels.
- Colors: passed — neutral gray menu treatment with the editor's blue selection state.
- Icon fidelity: passed — Arrow, Line, Circle, and Rectangle use the installed outline icon library.
- Copy: passed — labels match the supplied reference exactly.
- Responsive behavior: passed — the toolbar remains horizontally scrollable and the portal prevents menu clipping.

## Interaction checks

- Shapes button opens a visible four-item menu.
- Selecting Rectangle closes the menu and activates drawing mode.
- Pointer drag creates a selectable rectangle annotation at the exact dragged position.
- Browser console contains no errors.
- Automated coverage verifies all four shapes and exported-PDF generation.
- Full automated test suite: 49 files and 155 tests passed.

final result: passed

## Compare PDFs word-level review

- Source visual truth: `/var/folders/y5/5nxfxhk97_9fmsmdf8tqj81r0000gn/T/TemporaryItems/NSIRD_screencaptureui_DUl53X/Screenshot 2026-07-20 at 11.40.35 PM.png`
- Implementation screenshot: `/tmp/dochub-tools-batch.iVnjih/repo/pdf-editor/tmp/comparison-design-qa.png`
- Viewport: 1600 × 1000 implementation; source content normalized from the supplied 2560 × 1440 browser screenshot
- State: one-page resume revisions compared, first inserted change selected, side-by-side mode, all five change filters enabled

### Full-view comparison evidence

The implementation now matches the reference's core composition: two synchronized document panes, a slim center change map, a persistent right-side change rail, compact page and zoom controls, red original-document highlights, blue revised-document highlights, and previous/next change navigation. The FixThatPDF header and blue brand controls remain intentionally product-specific.

### Focused-region comparison evidence

The right rail and PDF text regions were readable in the same paired comparison input. Unlike the previous full-page red boxes, highlights now hug the actual changed words and lines. Change cards show numbered inserted/replaced entries with separate old and new text treatments, closely matching the reference's review pattern. No separate crop was needed because both the full PDF pages and the readable change rail are visible at 1600 × 1000.

### Findings and comparison history

1. Initial product state: P1 - broad shared red regions did not identify additions versus deletions and made the comparison difficult to review.
   Fix: extract positioned PDF words, align their sequences, and emit side-specific inserted, deleted, replaced, and moved-text rectangles.
   Post-fix evidence: implementation capture shows precise red/blue word highlights and 12 individually reviewable change cards.
2. First implementation capture: P2 - upload cards consumed the first viewport after comparison, leaving too little room for the review workspace.
   Fix: collapse the setup surfaces after comparison, retain a visible Compare new files action, and align the result below the sticky public header.
   Post-fix evidence: the final capture gives the documents and change rail the full working viewport, matching the reference's density.
3. Remaining P3: the reference includes print, share, select-text, and fullscreen utilities outside the requested compare workflow. These were intentionally omitted to preserve FixThatPDF's current feature scope.

### Required fidelity surfaces

- Fonts and typography: passed - compact DM Sans application chrome with readable document previews and 10-13px review controls mirrors the reference hierarchy.
- Spacing and layout rhythm: passed - balanced document columns, 14px center map, 316px change rail, aligned toolbars, and consistent card spacing.
- Colors and visual tokens: passed - red removal, blue addition, teal moved-text, purple visual-change, white toolbars, and cool gray review canvas are semantically consistent and accessible.
- Image quality and asset fidelity: passed - PDFs render from real page canvases; no placeholder imagery, CSS-drawn icons, or raster substitutions were used.
- Copy and content: passed - labels clearly name Side by side, Scroll lock, Previous change, Next change, filters, page position, and report download.

### Interaction and verification

- Two real PDFs uploaded and produced 12 word-level changes, 14 original highlights, and 15 revised highlights.
- Next change changed the selected card and corresponding PDF highlight.
- The filter menu exposed five working change-type filters; disabling Inserted reduced the visible list from 12 to 9.
- Scroll lock toggled successfully.
- The marked report PDF rendered cleanly with distinct red and blue side-specific regions.
- Browser console errors checked: none.
- Full automated suite: 49 files and 162 tests passed.

final result: passed
