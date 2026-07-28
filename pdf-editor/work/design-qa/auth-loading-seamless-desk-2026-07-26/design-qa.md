# Login-to-Dashboard Loading Transition — Design QA

## Comparison target

- Source visual truth: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-references\auth-loading-seamless-desk-selected-2026-07-26.png`
- Implementation screenshot: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-qa\auth-loading-seamless-desk-2026-07-26\implementation-final.png`
- Combined comparison: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-qa\auth-loading-seamless-desk-2026-07-26\comparison-final.png`
- Route/state: `/app/documents`, authentication unresolved, `AuthLoadingScreen` visible between Login and Dashboard.

## Normalization

- Source pixels: 1487 × 1058.
- Browser-rendered implementation pixels: 1280 × 720 at a 1280 × 720 CSS viewport and device pixel ratio 1.25.
- The selected mock was aspect-normalized to 1280 × 720 with a centered crop for the combined comparison. Browser chrome was excluded.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the implementation uses PDFEnrich's DM Sans/Funnel Display system, keeps the navy display heading and compact status copy, and matches the source hierarchy without the old generic card treatment.
- Spacing and layout rhythm: the document-to-wordmark journey, central copy, progress line, faded navigation rail, and emerging dashboard occupy the same major regions as the selected mock. The journey was widened after the first comparison to restore the source's open horizontal rhythm.
- Colors and visual tokens: the page uses white, charcoal, soft neutral hairlines, official PDFEnrich blue, oxblood PDF markers, and the destination dashboard's restrained citron accent. The background UI stays intentionally low contrast while the live status remains readable.
- Image quality and asset fidelity: the official `runtime-public/pdfenrich-logo.png` is rendered through the cropped `brand-wordmark--logo` treatment. Supporting interface symbols use the project's Lucide icon library; there are no placeholder raster assets or improvised logo graphics.
- Copy and content: “Opening your workspace,” “Restoring your saved session and documents,” and “Checking your saved sign-in” match the selected concept and retain the existing live-region semantics.
- Interaction and accessibility: the loading section remains `role="status"` with polite announcements, decorative dashboard content is hidden from assistive technology, first-visit privacy controls are suppressed only during this short transition, and progress motion has a reduced-motion fallback.
- Browser console: no errors were reported during the captured transition.

## Focused region comparison

- The combined comparison is sufficient because the screen contains one focal journey and three short text elements. The official wordmark, heading, progress treatment, document marker, faded rail, and destination shelf are all legible at full-view scale.

## Comparison history

1. Pass 1 showed the selected journey compressed into the same narrow column as the copy, with the document and wordmark too close together. The privacy-choice prompt also covered the status region.
2. The journey was widened independently of the copy column, the wordmark scale was increased, the heading size was calmed, and the privacy prompt was hidden while the loading screen is active.
3. The final browser capture matches the selected composition with no remaining P0/P1/P2 visual drift.

## Primary interactions tested

- Direct protected-route entry renders the loading screen before authentication resolves.
- Loading copy and polite status landmark remain present.
- The first-visit privacy prompt does not cover the transition.
- Browser console errors were checked.

## Follow-up polish

- P3: the selected mock depicts a conceptual destination shelf rather than the exact current dashboard content. The implementation intentionally preserves that simplified transition treatment so it remains fast to render.

## Implementation checklist

- [x] Replace the generic centered loading card.
- [x] Use the official cropped PDFEnrich wordmark.
- [x] Reveal the destination dashboard softly.
- [x] Keep concise, accessible loading status.
- [x] Add responsive and reduced-motion behavior.
- [x] Capture and compare the browser-rendered state.

final result: passed
