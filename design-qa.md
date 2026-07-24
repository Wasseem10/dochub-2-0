# Landing Page Design QA

- Source visual truth: `work/design-references/landing-upload-tray-selected-2026-07-24.png`
- Desktop implementation: `work/design-qa/landing-desktop-final.png`
- Mobile implementation: `work/design-qa/landing-mobile-390x844-final.png`
- Desktop comparison: `work/design-qa/landing-desktop-comparison-final.png`
- Mobile comparison: `work/design-qa/landing-mobile-comparison-final.png`
- State: anonymous landing page, idle upload state, navigation closed

## Capture normalization

- Source pixels: 1487 × 1058.
- Desktop viewport request: 1440 × 1024 CSS px at device scale factor 1. The in-app browser capture is 1425 × 1013 px after its scrollbar/surface inset. The source was resized to that exact capture size for the combined comparison.
- Mobile viewport request: 390 × 844 CSS px at device scale factor 1. The in-app browser capture is 375 × 811 px after its scrollbar/surface inset.
- The desktop comparison uses the same full first-screen crop and idle state.
- The source does not include a phone frame, so the mobile comparison evaluates the selected design language and the explicit responsive requirement rather than claiming a 1:1 mobile source.

## Full-view comparison evidence

The desktop implementation preserves the source hierarchy and anatomy: compact wordmark navigation, centered two-line DM Sans headline, coral underline, concise supporting copy, four colored task tabs, a tactile ivory upload tray with visible paperclip and coral cord, a large blush drop target, and three bottom trust signals. The generated background asset matches the source's warm-white stationery rendering and keeps the center clear for accessible live controls.

The mobile implementation is intentionally recomposed rather than cropped. It uses a compact logo-and-menu header, controlled three-line heading, four equal task tabs, a fully visible portrait tray and drop target, reduced edge stationery, and all three trust signals within the first screen.

## Focused-region comparison evidence

- Header: PDFArrow's supplied logo is displayed through the cropped wordmark treatment. Desktop navigation and the coral file CTA match the source hierarchy; mobile replaces the hidden links with a 42px menu control.
- Upload tray: the tray and paperclip are raster assets rather than CSS approximations. The interactive button sits within the generated blush tray interior and retains hover, focus, drag, error, busy, and progress states.
- Typography: DM Sans 600 provides the same compact geometric headline character. Body copy uses DM Sans 400 at a readable 18px desktop and 14px mobile.
- Task tabs and trust strip: source order, accent roles, icon-plus-label anatomy, and divider rhythm are preserved. Mobile reduces detail without removing the task choices or promise labels.

## Findings

No actionable P0, P1, or P2 differences remain.

- P3: The generated desktop tray begins slightly lower than the supplied reference. This is acceptable because it gives the headline and support copy more breathing room while keeping the complete upload interaction and trust strip visible.
- P3: The mobile trust descriptions are omitted below 540px, leaving the three promise labels and icons. This is an intentional density reduction for the requested phone layout.

## Required fidelity surfaces

- Fonts and typography: passed. DM Sans family, weight, line height, wrapping, and hierarchy are aligned with the source.
- Spacing and layout rhythm: passed. Desktop proportions and mobile stacking are balanced with no horizontal overflow or hidden primary controls.
- Colors and visual tokens: passed. Warm white, blush, coral, lilac, yellow, and pink are used consistently; PDFArrow blue remains isolated to the supplied logo.
- Image quality and asset fidelity: passed. Separate high-resolution desktop and portrait raster assets preserve the paper, tray, paperclip, cord, and stationery art direction without stretching.
- Copy and content: passed. Product naming is PDFArrow, the source headline and support copy are preserved, and no-sign-in/private/no-watermark promises remain visible.

## Interaction and console checks

- Hero upload target opens the native single-file picker by pointer interaction.
- The upload target is a native button and includes explicit Enter/Space handling.
- Mobile navigation opens and closes successfully.
- Edit, Sign, Organize, and Convert tabs are real route links.
- Browser console: no errors or warnings on a clean final load.
- Production build, TypeScript check, editorial audit, sitemap generation, and prerender completed successfully.

## Comparison history

1. Initial desktop capture showed the generated background asset behind the hero stacking context, leaving the tray invisible (P1). The artwork moved to an explicit responsive CSS background; the next capture showed the complete tray, cord, paperclips, and edge stationery.
2. Initial phone capture clipped the trust strip below the first screen (P2). The portrait hero height and stage proportions were tightened; the final 390 × 844 capture shows the complete heading, tabs, tray, upload control, and trust row.
3. A clean final browser tab was loaded after hot-module replacement produced stale development warnings. The clean load reports no console errors or warnings.

## Follow-up polish

- If desired, shift the desktop tray artwork upward by roughly 24–32px for even closer source alignment.

final result: passed
