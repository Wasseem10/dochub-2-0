# Design QA — Editorial Analytics

- Source visual truth: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\design-evidence\analytics-source-dashboard-2026-07-23.png`
- Browser-rendered implementation: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\design-evidence\analytics-implementation-2026-07-23.png`
- Full-view comparison: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\design-evidence\analytics-dashboard-comparison-2026-07-23.png`
- URL: `http://127.0.0.1:4173/app/analytics`
- Browser viewport: 1280 × 720 CSS px, device scale factor 1
- Source pixels: 1280 × 720
- Implementation pixels: 1280 × 720
- Density normalization: none; both captures use the same browser surface, viewport, and device density.
- State: authenticated owner account. The dashboard source shows the empty document library; the Analytics implementation shows the empty Firebase/analytics state. Content differs intentionally, while the shared shell, density, controls, and hierarchy are the comparison target.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the shared Georgia page title and compact DM Sans interface hierarchy match the dashboard source. Analytics section headings use the same restrained UI weight instead of introducing a second oversized display title.
- Spacing and layout rhythm: the 266px Quiet Editorial rail, 104px top bar, aligned search field, account control, 44px content inset, flat command strip, and thin module boundaries match the dashboard frame. The Analytics metrics and identity ledger preserve the dashboard’s dense horizontal document-management rhythm.
- Colors and visual tokens: warm-white and white surfaces, charcoal copy, neutral hairlines, and oxblood-only emphasis match the source. There are no blue metric tiles, gradients, rounded SaaS cards, or shadow-heavy panels.
- Image quality and asset fidelity: the official cropped PDFArrow logo and existing outline icon system are unchanged. Analytics introduces no new raster or decorative assets.
- Copy and content: the page clearly distinguishes operational metrics from the owner-only sign-in directory. The directory exposes name, email, Google versus email/password method, and Firebase last-sign-in time while stating that document content is not collected.

## Functional Verification

- Time-period selection changes successfully.
- Refresh remains enabled and reloads the Analytics queries.
- The shared search field filters the sign-in directory by name, email, or provider and shows a clear no-match state.
- Sign-in identity normalization is covered for Google and email/password providers.
- Personal identity stays in the owner-only `authUserProfiles` collection rather than the anonymous product analytics event stream.
- Browser console errors checked: none.
- TypeScript check passed.
- Focused unit, route, auth, analytics, and dashboard suites passed: 30 tests.

## Focused Comparison

A separate crop was not needed because the full 1280 × 720 side-by-side comparison keeps the shared top bar, navigation rail, metric strip, sign-in ledger, typography, borders, and empty state readable at native density.

## Comparison History

1. Captured the current dashboard at 1280 × 720 as the source for shell geometry, typography, spacing, and visual tokens.
2. Rebuilt the Analytics top area around the same searchable header, flat command strip, five-column metric ledger, and fine-divider content modules.
3. Added the owner-only sign-in ledger as the first primary data table and captured the implementation at the same viewport.
4. The normalized side-by-side comparison found no remaining actionable P0/P1/P2 mismatch.

## Follow-up Polish

- P3: production data will make the identity ledger denser than the verified empty state; its long-email truncation and responsive stacking are implemented but should be observed again after real accounts populate the collection.

final result: passed
