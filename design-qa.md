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
