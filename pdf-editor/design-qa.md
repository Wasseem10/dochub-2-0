# PDFArrow Minimal Sign-In — Design QA

## Comparison target

- Source visual truth: `design-evidence/auth-reference/selected-source.png`
- Browser-rendered implementation: `design-evidence/auth-reference/implementation-final.png`
- Normalized implementation: `design-evidence/auth-reference/implementation-final-normalized.png`
- Full-view comparison: `design-evidence/auth-reference/source-vs-implementation.png`
- Focused form comparison: `design-evidence/auth-reference/focused-form-comparison.png`
- Route: `http://127.0.0.1:4173/login`
- Browser viewport: 1205 × 921 CSS pixels, device scale factor 1
- Source pixels: 1205 × 921
- Raw implementation pixels: 1206 × 922
- Density normalization: the one-pixel Browser capture variance was resized to 1205 × 921 with Lanczos resampling before comparison.
- State: signed out, sign-in screen, Google available, email/password controls visible. The verification browser supplied a saved preview credential; this is browser autofill state, not application copy.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: compact DM Sans matches the reference’s geometric sans-serif character closely. The 31px navy heading, 14px controls, underlined account actions, and uppercase divider preserve the source hierarchy and optical weight.
- Spacing and layout rhythm: the implementation uses the same 400px column, 382px left alignment at the reference viewport, white page, borderless composition, compact provider control, line divider, 48px fields, and bottom account footer. The form is intentionally shorter because Apple, Microsoft, Dropbox, and Xero were removed exactly as requested.
- Colors and visual tokens: white, dark navy, powder-blue borders, subdued blue-gray icons, and fine gray rules match the source. No dashboard oxblood, gradients, or card elevation remains on authentication.
- Image quality and asset fidelity: the Google button uses Google’s official hosted multicolor icon. No CSS-drawn, text-glyph, or placeholder logo is used.
- Copy and content: the page is adapted to PDFArrow naming while retaining only Google and email/password authentication. The Lumin product footer and unrelated provider copy are not reproduced.
- Accessibility and responsiveness: semantic labels remain available to assistive technology, focus rings are visible, controls remain keyboard operable, and the column centers without horizontal translation below 560px.

## Comparison history

### Pass 1

- P1: inherited form direction compressed the email, password, forgot-password, and submit controls into one row.
- P2: an earlier Google-button rule forced the provider label to large blue text.
- P2: the legacy authentication shell added residual gaps and a centered position 20px to the right of the source.

Fixes made:

- Forced the authentication form to a vertical column.
- Reset the Google label to compact navy DM Sans.
- Removed inherited card gaps, centered the composition at the source’s measured x-position, and removed residual switch borders and backgrounds.

Post-fix evidence:

- `design-evidence/auth-reference/implementation-final.png`
- `design-evidence/auth-reference/source-vs-implementation.png`
- `design-evidence/auth-reference/focused-form-comparison.png`

## Interaction verification

- Google sign-in button is visible and enabled when authentication is ready.
- Forgot Password opens the reset-password state.
- Back to Sign In returns to the login route.
- Sign Up opens the account-creation state.
- The account-creation Sign In action returns to login.
- Email and password controls accept keyboard input and preserve native autocomplete behavior.
- No browser error overlay or broken resource state appeared during the verified interaction flow.
- TypeScript check passed.
- Focused auth, route-guard, and dashboard integration suites passed: 20 tests.

## Follow-up polish

- P3: browser-managed credential autofill can tint populated fields pale blue. Empty fields retain the white reference treatment; the browser owns the populated state.

final result: passed
