# Mobile Signing and Signed Export — QA

## Browser evidence

- `work/design-qa/mobile-signing-export-2026-07-26/mobile-signature-sheet-390.png`
- `work/design-qa/mobile-signing-export-2026-07-26/mobile-signature-sheet-320.png`
- `work/design-qa/mobile-signing-export-2026-07-26/mobile-placement-controls-390.png`
- `work/design-qa/mobile-signing-export-2026-07-26/mobile-touch-handles-390.png`
- `work/design-qa/mobile-signing-export-2026-07-26/signed-export-review-320.png`

## Mobile signing checks

- Verified the signature creator as a bottom sheet at 390 × 844 and 320 × 700.
- Drew a signature with a touch-style pointer gesture and confirmed Save becomes enabled.
- Confirmed Draw, Type, Upload, Clear, Preview, Cancel, and Save remain visible without overlap.
- Confirmed the placement sheet clears both the six-action dock and the zoom/page capsule.
- Placed a drawn signature and verified eight 28px resize touch targets, a 34px rotation target, and 42px object action buttons.
- Confirmed the rotation target is visually separated from the object action bar.

## Signed export checks

- Typed signatures scale with their resized box.
- Drawn and uploaded images preserve their aspect ratio and transparent pixels.
- Rotation is exported around the visual center rather than the lower-left corner.
- Signed exports are reopened in an in-app review surface only after PDF.js verifies every signature on its intended page.
- Browser export check verified two signature items on one page and exposed a second-copy download.
- No browser console errors or warnings were produced.

## Automated verification

- TypeScript: passed.
- Signed export, page export, and signature geometry tests: 10 passed.
- Production build and 114-route prerender: passed.
- Public mobile-loading budget: passed.

final result: passed
