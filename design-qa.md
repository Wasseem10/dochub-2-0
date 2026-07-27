# PDF.js Signed Review and Mobile More — QA

## Browser evidence

- `work/design-qa/pdfjs-review-mobile-more-2026-07-26/signed-review-pdfjs-390x844.png`
- `work/design-qa/pdfjs-review-mobile-more-2026-07-26/mobile-more-390x844.png`
- `work/design-qa/pdfjs-review-mobile-more-2026-07-26/mobile-more-320x700.png`

## Signed review checks

- Exported a locally saved PDF containing a signature and confirmed verification completed before review opened.
- Confirmed the review contains one PDF.js canvas and zero iframes.
- Confirmed the rendered page is visible at 390 × 844, including the placed signature.
- Confirmed previous/next state, page count, 60–180% zoom limits, and a working 120% re-render.
- Confirmed loading feedback, render-error messaging, page-level Retry, Done, and second-copy download are present.

## Mobile More checks

- Confirmed a true viewport-level bottom sheet with a dimmed backdrop, 44px close control, internal scrolling, and safe-area-aware padding.
- Confirmed the sheet is anchored to the viewport bottom at both 390 × 844 and 320 × 700.
- Confirmed no horizontal overflow at 320px.
- Confirmed grouped Edit & mark up, Insert, Shapes, and Document sections contain every tool hidden from the six-action dock.
- Activated Whiteout from the sheet, confirmed the sheet closed, and confirmed the operational placement guidance appeared.
- Confirmed no browser console errors.

## Automated verification

- TypeScript: passed.
- PDF review, mobile More inventory, and signed-export tests: 8 passed.
- Full automated suite: 256 tests passed across 68 files.
- Production build and 114-route prerender: passed.
- Public mobile-loading budget: passed.

final result: passed
