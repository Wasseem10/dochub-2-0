# Design QA — site-matched RealPDF upload hero

## Comparison target

- Interaction/anatomy example: `/var/folders/y5/5nxfxhk97_9fmsmdf8tqj81r0000gn/T/TemporaryItems/NSIRD_screencaptureui_bTnojs/Screenshot 2026-07-11 at 3.16.15 PM.png`
- Visual source of truth: the existing RealPDF landing page design system in `src/lattice-pdf.css` — green/mint actions, cream cards, large rounded corners, dark green typography, and soft green-tinted elevation
- Browser-rendered implementation: `design-evidence/landing-realpdf-site/implementation-hero.png`
- Viewport: in-app browser, 1280 × 720 at DPR 2
- State: signed-out RealPDF landing page, upload zone idle, announcement visible
- Local URL: `http://127.0.0.1:4173/`

## Full-view comparison evidence

The example screenshot and the final browser-rendered landing hero were opened together in one comparison input. The implementation preserves the example's functional hierarchy — upload icon, drag/drop heading, primary device-upload action, and file-limit feedback — while intentionally replacing the example's blue, dashed, edge-to-edge styling with the site's own cream card, mint icon tile, green button, 44px radius, and dark-green typography.

The rendered upload card now reads as part of the same product as the announcement, logo mark, header CTA, hero actions, platform cards, and other landing sections. It no longer looks pasted in from the external example.

## Focused-region evidence

A separate normalized crop was not needed for this pass because the user explicitly rejected exact screenshot matching, and the complete upload component is fully legible at the 1280 × 720 full-view scale. The important comparison is the component's relationship to the surrounding RealPDF UI, which is visible only in the full hero capture.

## Required fidelity surfaces

- Fonts and typography: the card uses the landing page's existing DM Sans/system stack, dark `var(--ink)` heading, compact supporting copy, and the same optical weight used by nearby product headings and CTAs.
- Spacing and layout rhythm: the 440px card balances the left hero copy, aligns within the existing two-column grid, and uses the site's established 44px radius and generous centered spacing.
- Colors and tokens: the card uses `var(--cream)`, `var(--mint)`, `var(--green)`, `var(--ink)`, and `var(--muted)` instead of importing the example's blue palette.
- Image quality and asset fidelity: upload and lightning symbols use the project's existing Lucide icon system. No screenshot raster, custom SVG, placeholder, or stretched asset is used in the interface.
- Copy and content: the module says “Drop your PDF here to get started,” keeps the example's clear device-upload action, shows the real 8 MB product limit, and retains inline progress/error feedback.

## Findings

- No actionable P0, P1, or P2 mismatch remains for the clarified site-matched direction.
- P3 test gap: the supplied example and final visual capture are desktop-only. The existing mobile breakpoint retains a full-width cream upload card, 56px action, and larger touch-safe spacing, but there is no mobile source frame for pixel comparison.

## Interaction and console verification

- Clicking “Upload from your device” opened the native file-selection path without showing an authentication gate.
- Picker and drag/drop callbacks both use the existing PDF loader directly for signed-out visitors.
- Processing progress and file failures remain visible and announced inside the card.
- Browser console: no errors or warnings.
- Production build and static diff check: passed.

## Comparison history

1. The first implementation treated the screenshot as a literal visual target and reproduced its blue button, dashed blue rules, and proportional geometry. The user clarified this was only an example; the exact treatment was therefore a P2 off-brand mismatch against the surrounding site.
2. Fix applied: removed the screenshot-specific blue/dashed styling, restored the landing page's cream surface and 44px radius, placed the upload icon in a mint tile, changed the action to the site's green/mint button treatment, and reused the site's typography and shadow language.
3. Post-fix evidence: the final 1280 × 720 browser capture shows the upload card balanced with the hero copy and visually consistent with the header and hero CTAs. No P0/P1/P2 issue remains.

## Implementation checklist

- [x] Keep the example's drag/drop and device-upload anatomy
- [x] Match the existing RealPDF landing-page visual system
- [x] Preserve direct signed-out upload behavior
- [x] Preserve progress and error feedback
- [x] Keep responsive mobile sizing
- [x] Verify browser rendering, interaction path, console, build, and static diff

final result: passed
