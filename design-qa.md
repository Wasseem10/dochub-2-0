# Context-Inspired Landing Hero Design QA

## Comparison target

- Source visual truth: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-references\context-dev-desktop-2026-09-01.png` and `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-references\context-dev-mobile-2026-09-01.png`.
- Browser-rendered implementation: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-qa\context-hero-2026-09-01\implementation-desktop-pass2.png` and `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-qa\context-hero-2026-09-01\implementation-mobile-pass1.png`.
- Full-view comparisons: `comparison-desktop-pass2.png` and `comparison-mobile-pass1.png` in the same QA folder.
- Focused hero comparison: `comparison-console-pass2.png` in the same QA folder.
- Desktop viewport: 1440 × 1024 CSS pixels at device scale factor 1. The browser content capture is 1425 × 1024 after the visible scrollbar; the 1430px source crop was normalized to 1425 × 1024 for comparison.
- Mobile viewport: 390 × 844 CSS pixels at device scale factor 1. The browser content capture is 375 × 844 after the visible scrollbar; the 380px source crop was normalized to 375 × 844.
- State: homepage hero, idle upload state, no navigation or privacy overlays open.

## Findings

- No actionable P0, P1, or P2 differences remain within the requested hero-only scope.
- Fonts and typography: the self-hosted IBM Plex Sans Latin subset is loaded and computed for the headline and homepage UI. The hero uses the requested 400 weight, compact negative tracking, centered two-line hierarchy, and blue-to-violet braced emphasis. The copy remains PDFEnrich-specific rather than duplicating Context.dev marketing language.
- Spacing and layout rhythm: desktop and mobile preserve the centered label, large headline, short description, compact tabbed console, broad atmospheric field, fine vertical guide lines, and bottom reassurance row. The existing site header and all sections below the hero remain structurally unchanged by request.
- Colors and visual tokens: the result matches the reference's white-to-blue atmosphere and violet edge energy while reserving PDFEnrich blue for the active task, links, and primary affordances. The source's photographic liquid texture was intentionally omitted because the user requested no generated image and PDFEnrich prohibits sky imagery.
- Image quality and asset fidelity: the canonical cropped PDFEnrich logo remains unchanged. No placeholder imagery, copied Context.dev assets, hotlinks, or generated assets were introduced.
- Copy and content: the hero keeps the required “100% free. No subscriptions, payments, or watermarks.” promise and the functional PDF upload wording. No paid, security, availability, or compliance claims were added.
- Affordances and accessibility: the whole upload field remains one real button, exposes the PDF file chooser to mouse and keyboard, retains drag-and-drop handlers, has visible hover/focus feedback, and keeps the four task links operational.

## Comparison history

- Pass 1 found a P2 typography mismatch: the downloaded font was available, but the older `.freepdf-hero h1` rule still won the cascade and rendered the headline in DM Sans.
- Fix: the final homepage font rule now applies IBM Plex Sans to the entire PDFEnrich landing page with sufficient cascade strength while leaving editor document typography outside this scope.
- Pass 2 evidence: the browser reports IBM Plex Sans loaded and computed for both `body` and the hero heading. Desktop, mobile, and focused combined comparisons show the corrected typography and no remaining P0/P1/P2 mismatch.

## Interaction verification

- The upload field is enabled and opened a single-file native chooser.
- Edit, Sign, Organize, and Convert resolve to `/edit-pdf`, `/sign-pdf`, `/organize-pdf`, and `/pdf-to-jpg`.
- Desktop and mobile captures have no horizontal overflow.
- Browser console check returned no warnings or errors.
- `pnpm run typecheck` and the full production build passed.

## Implementation checklist

- [x] Limit structural work to the homepage hero.
- [x] Match the Context.dev hero hierarchy and compact product console.
- [x] Self-host and apply IBM Plex Sans.
- [x] Preserve the entire clickable and keyboard-operable upload action.
- [x] Verify desktop and mobile rendering.
- [x] Preserve all homepage sections below the hero.

## Follow-up polish

- P3: the reference uses a photographic liquid texture in the lower atmosphere; the implementation deliberately uses a clean CSS color field to honor the user's no-image-generation direction and PDFEnrich's no-sky rule.

final result: passed
