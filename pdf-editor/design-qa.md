# Design QA — RealPDF authentication UI

## Comparison target

- Visual source of truth: `design-evidence/landing-realpdf-site/implementation-hero.png`
- Browser-rendered login implementation: `design-evidence/auth-realpdf/login-desktop.jpg`
- Viewport: in-app browser, 1280px desktop viewport at DPR 2
- State: signed-out login screen with local Firebase configuration unavailable
- Local URL: `http://127.0.0.1:4173/`

## Full-view comparison evidence

The RealPDF landing hero and final login screen were opened together in one comparison input. The authentication screen now uses the same cream background, white elevated card, mint icon tile, dark-green typography, DM Sans family, green/mint primary action, soft borders, rounded controls, and generous spacing as the landing experience.

## Focused-region evidence

No separate crop was necessary because the complete login card is fully visible and legible in the desktop capture. The brand mark, headline, status message, Google action, inputs, password-reset link, primary action, privacy link, and account-mode switch can all be evaluated at the full-view scale.

## Required fidelity surfaces

- Fonts and typography: DM Sans/system typography, medium-weight display headline, compact form labels, and dark-green ink match the landing page hierarchy.
- Spacing and layout rhythm: the centered 560px card uses a 36px radius, balanced 42–46px padding, 52px controls, and landing-style vertical breathing room.
- Colors and tokens: the screen reuses `#001f1f`, `#046645`, `#cdface`, `#f7f6f2`, and muted green-gray support text from the landing system.
- Image quality and asset fidelity: the brand uses the project's Lucide `FileText` icon inside a mint tile; the previous CSS-drawn logo mark was removed.
- Copy and content: login and signup copy now references RealPDF directly, provides useful placeholders, and replaces developer-facing environment-variable text with a customer-safe availability message.

## Findings

- No actionable P0, P1, or P2 visual mismatch remains.
- P3: the local preview has no Firebase configuration, so provider and password actions appear disabled. This reflects environment state rather than a styling defect.

## Interaction and console verification

- Landing “Log in” opens the login screen.
- “Create an account” switches to signup, reveals the full-name field, and provides a working “Sign in” return action.
- Back-to-home, password-reset, privacy, Google, and password form controls remain wired to their existing handlers.
- Browser console: no errors or warnings.
- Production build and static diff check: passed.

## Comparison history

1. Previous auth UI used a plain white page, square blue controls, gray typography, and a CSS-drawn logo, creating a P2 visual mismatch with the new RealPDF landing system.
2. Fix applied: introduced landing tokens, a cream canvas, rounded white card, mint Lucide brand mark, green/mint actions, matching inputs and focus states, responsive mobile treatment, and RealPDF-specific copy.
3. Post-fix browser comparison shows a cohesive transition from landing to authentication with no remaining P0/P1/P2 mismatch.

## Implementation checklist

- [x] Match landing colors, typography, radii, and shadows
- [x] Replace the CSS-drawn auth logo with the real icon system
- [x] Preserve login, signup, reset, and back navigation behavior
- [x] Improve customer-facing status and placeholder copy
- [x] Verify login and signup rendered states
- [x] Check browser console, build, and static diff

final result: passed
