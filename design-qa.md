# PDFEnrich minimal authentication loading screen QA

## Evidence

- Source visual truth: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-references\auth-loading-minimal-selected-2026-08-01.png`
- Desktop implementation: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-qa\auth-loading-minimal-2026-08-01\implementation-desktop.png`
- Mobile implementation: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-qa\auth-loading-minimal-2026-08-01\implementation-mobile.png`
- Desktop viewport and pixels: 1440 x 1024 CSS px, device scale factor 1, 1440 x 1024 source and implementation pixels; no density normalization required.
- Mobile viewport and pixels: 390 x 844 CSS px, device scale factor 1, 390 x 844 implementation pixels.
- State: protected dashboard route during authentication/lazy-loading, before the dashboard becomes interactive.

## Full-view comparison

The source and implementation were opened together at the same 1440 x 1024 frame. Both use a pure-white full viewport, the isolated official blue PDFEnrich document mark, and a single neutral hairline track with blue progress. The implementation intentionally makes the mark and track slightly smaller than the generated source to honor the user's final direction: “super small and basic.” No card, dashboard preview, wordmark, heading, label, or other visible text remains.

## Focused-region comparison

A separate crop was not needed because the loader is the only visible region and remains clear in the full-frame comparison. Browser geometry confirms the 84 x 58 indicator group is centered exactly at 720 x 512 on desktop and 195 x 422 on mobile. The mark container is 42 x 42 and the progress track is 72 x 2.

## Required fidelity surfaces

- Fonts and typography: no visible typography by design. The accessible status retains an ARIA label without rendering copy.
- Spacing and layout rhythm: the indicator group is mathematically centered in both verified viewports with a 14px mark-to-track gap and ample white space.
- Colors and visual tokens: pure white background, official PDFEnrich blue `#2851eb`, and a light neutral-gray track match the selected direction.
- Image quality and asset fidelity: the implementation crops the supplied `runtime-public/pdfenrich-logo.png` and does not approximate or redraw the brand mark. The mark is sharp at the implemented size with no stretch, shadow, or halo.
- Copy and content: no visible words, letters, or numbers appear. The screen-reader-only status label remains “Opening PDFEnrich.”

## Findings

- No actionable P0, P1, or P2 visual differences.
- No remaining P3 recommendation is necessary for this intentionally minimal state.

## Interaction and runtime checks

- The loading indicator appeared on `/app/dashboard` while authentication initialized, then cleared and revealed the dashboard.
- Focused route-guard suite passed: 13 tests.
- Production build passed.
- Desktop and mobile center alignment passed.
- Reduced-motion CSS keeps a static half-filled progress state.
- Browser console contained no errors. Existing PDF.js fake-worker warnings appeared after the dashboard loaded and are unrelated to this loading-screen change.

## Comparison history

- Pass 1: no actionable P0/P1/P2 findings; no visual fix loop required.

## Final result

final result: passed
