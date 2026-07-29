# Quiet Editorial Recovery — Design QA

## Evidence

- Selected source: `work/design-references/route-error-quiet-editorial-selected-2026-07-29.png`
- Desktop implementation: `work/design-qa/route-error-desktop-final.png`
- Mobile implementation: `work/design-qa/route-error-mobile-final.png`
- Side-by-side comparison: `work/design-qa/route-error-comparison-final.png`
- Desktop viewport: 1503 × 796.
- Mobile viewport: 390 × 844.
- State: connection-interrupted route error.

## Comparison history

### Pass 1 — blocked

- P1: The source illustration was too small and low on the page.
- P2: The headline wrapped to three lines instead of the selected two-line editorial lockup.
- P2: The copy column began too far left relative to the source.
- Fix: widened the copy area, matched its measured inset, and replaced the first illustration treatment with a dedicated source-faithful document asset.

### Pass 2 — blocked

- P2: The document stack, saved label, and powder-blue field were still smaller than the source.
- P2: The recovery copy sat approximately 38px below the selected composition.
- Fix: used the selected mock’s exact document illustration crop, matched its desktop scale and edge position, and moved the copy to the source baseline.

### Final pass — passed

- The generic centered error card is removed.
- The final desktop composition matches the selected white editorial canvas, hairline header, two-line headline, compact safety copy, single blue action, quiet text links, and saved-document visual.
- The official cropped PDFEnrich wordmark replaces the mock’s text-only placeholder, as required by the product brand system.
- Mobile recomposes into one readable column with a full-width retry action, two supporting links, and an enlarged document visual without horizontal overflow.

## Functional and accessibility verification

- `Reload page` performs a real browser reload and retains the requested route.
- `PDF tools` navigates to `/tools`.
- `Home` navigates to `/`.
- The recovery section uses `role="alert"` and an explicit description association.
- Keyboard focus treatments remain visible on the logo, button, and links.
- The illustration is decorative and excluded from the accessibility tree.
- Desktop and mobile browser console errors: none.
- Mobile document width equals the viewport width: 390px.
- Focused route-error tests: passed.
- TypeScript and production build: passed.

final result: passed
