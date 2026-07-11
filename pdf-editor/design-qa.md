# Design QA — Lattice-inspired DocHub landing page

## Comparison target

- Source visual truth path: `design-evidence/lattice-source/`
  - Desktop full-page sequence: `desktop-00-top.png` through `desktop-10.png`
  - Mobile full-page sequence: `mobile-00-top.png` through `mobile-13.png`
  - Captured interaction states: desktop Product, Why Lattice, and Resources menus; primary CTA hover; assistant states; mobile menu and Product submenu; announcement dismissed
- Source URL: `https://lattice.com/`
- Browser-rendered implementation screenshot path: unavailable — the approved in-app browser rejected `http://127.0.0.1:4173/` under its URL-security policy and explicitly prohibited an alternate browser/control workaround
- Intended implementation URL: `http://127.0.0.1:4173/`
- Implementation files: `src/LatticePdfLanding.jsx`, `src/lattice-pdf.css`, `src/App.jsx`, and `src/main.jsx`

## Viewport and state

- Source desktop viewport: 1440 × 900; top state, full-page scroll sequence, menu states, CTA hover, and assistant states captured
- Source mobile viewport: 390 × 844; top state, full-page scroll sequence, mobile menu/submenu, and announcement-dismissed state captured
- Implementation desktop/mobile viewport: not captured because the approved browser blocked the local URL
- Implementation state: local server responds with HTTP 200 and the production build succeeds, but no browser-rendered state is available for visual judgment

## Verification completed

- Production build: passed (`npm run build`, Vite 6.4.3, 2,001 modules transformed)
- Static diff check: passed (`git diff --check`)
- Local server health: passed (HTTP 200)
- Static interaction/accessibility review: passed after correcting auth-gated upload/drop callbacks, carousel motion controls, mobile mega-menu containment, button intent, file-picker cancel state, and assistant labels
- Primary interactions tested in the rendered implementation: unavailable because browser capture was blocked
- Console errors checked in the rendered implementation: unavailable because browser capture was blocked

## Full-view comparison evidence

The source desktop and mobile full-page captures exist, but there is no browser-rendered implementation screenshot to place beside them. Overall composition, hierarchy, section rhythm, responsive structure, and above-the-fold fidelity therefore cannot be compared or certified.

## Focused-region comparison evidence

No focused comparison could be performed for typography, navigation, hero layout, cards, imagery, carousel controls, footer, or mobile menu because the implementation screenshot is missing. Focused comparison was not skipped as unnecessary; the missing rendered artifact is the blocking condition.

## Findings

- [Blocker] Mandatory rendered implementation evidence is unavailable.
  - Evidence: the source page was captured at the required desktop/mobile viewports, while the approved in-app browser rejected the local preview URL.
  - Impact: fonts/typography, spacing/layout rhythm, colors/tokens, image quality, copy wrapping, overflow, and visible interaction states cannot be evaluated against the source.
  - Fix: capture the local app in the approved browser at 1440 × 900 and 390 × 844, then run side-by-side full-view and focused-region comparisons.

## Known substitutions requiring visual review

- Font: locally bundled DM Sans replaces Lattice’s proprietary Matter font.
- Icons: the project’s open-source Lucide set replaces the source icon/glyph set.
- Content: navigation labels, calls to action, product imagery, and copy are intentionally tailored to the DocHub PDF editor.

## Comparison history

1. Source evidence captured: desktop, mobile, and key source interaction states completed.
2. Implementation capture attempted: blocked by the approved browser’s local-URL security policy.
3. Post-fix visual evidence: unavailable; no visual QA iteration can begin without the first implementation capture.

## Implementation checklist

- Capture the implementation at 1440 × 900 and 390 × 844 in the approved browser.
- Compare full-page composition at matching scroll positions.
- Compare focused regions for header/menus, hero, platform cards, smart-tools section, carousel, integrations, resources, outro, footer, and mobile navigation.
- Check every captured interaction state and browser console.
- Fix any P0/P1/P2 visual mismatches and repeat the comparison.

final result: blocked
