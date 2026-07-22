# Landing Header Design QA

- Source visual truth: `/var/folders/y5/5nxfxhk97_9fmsmdf8tqj81r0000gn/T/TemporaryItems/NSIRD_screencaptureui_HHSLAq/Screenshot 2026-07-21 at 10.51.56 PM.png`
- Implementation screenshot: `/tmp/fixthatpdf-header-aligned-playwright.png`
- Combined comparison evidence: `/tmp/fixthatpdf-header-alignment-comparison.png`
- Desktop viewport: 1584 × 178
- Mobile viewport: 390 × 844
- State: landing-page header at rest; Tools menu open and closed
- Primary interactions tested: Tools opens by click, closes with Escape, and returns focus to its trigger; mobile navigation opens, closes with Escape, and returns focus to its trigger
- Browser console errors: none

## Full-view comparison evidence

The combined comparison places the supplied header directly above the rendered FixThatPDF header. It shows the requested correction without changing the hero or header information architecture: Tools, Edit, Organize, Sign, and Convert now use the same height and vertical centerline.

## Focused region comparison evidence

The source and implementation are both captured at 1584 × 178 so the navigation baseline, header border, button height, and beginning of the hero can be compared without scaling. Browser geometry confirms each of the five desktop navigation controls has `top: 15px`, `height: 38px`, and a `34px` vertical center.

## Required fidelity surfaces

- Fonts and typography: The existing product typefaces, weights, and label sizes are unchanged. A consistent unit line-height prevents the Tools label from drifting below adjacent links.
- Spacing and layout rhythm: All five center navigation items use a shared 38px inline-flex control with centered content, 11px horizontal padding, 10px corner radius, and a compact 4px group gap.
- Colors and visual tokens: Existing FixThatPDF white, cobalt, and slate tokens are retained. The only additions are a restrained pale-blue hover surface and a subtle header shadow.
- Copy and content: No navigation labels, routes, hero copy, or calls to action were changed.
- Accessibility and behavior: The Tools trigger keeps its button semantics and expanded state. Escape closes both desktop and mobile menus and returns keyboard focus to the relevant trigger.
- Responsive behavior: At 390px the desktop navigation remains hidden, the mobile navigation toggle remains visible, and the document width equals the viewport width with no horizontal overflow.

## Findings

- No remaining P0, P1, or P2 issues.
- The original mismatch was caused by the desktop navigation flex container stretching link items while the Tools button centered its own contents.
- Scope remained limited to the landing header navigation CSS; the hero and all page sections are unchanged.

## Comparison history

1. Initial reference inspection found one P2 alignment issue: Tools used centered button content while adjacent links stretched in the navigation row and rendered on a different baseline.
2. The navigation row was changed to center its children, and every desktop navigation item now shares the same inline-flex geometry.
3. Post-fix evidence confirms equal `15px` top positions, `38px` heights, and `34px` vertical centers across all five items, plus working desktop and mobile menu interactions with zero console errors.

## Follow-up polish

- No P3 item is required for this release.

final result: passed
