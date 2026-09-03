# Desktop Editor Toolbar and Thumbnail Rail Design QA

## Comparison target

- Source visual truth path: `C:\Users\wasse\OneDrive\Desktop\pdf-editor\work\design-qa\editor-neutral-toolbar-thumbnails-2026-09-03\source.png`.
- Rendered implementation: `http://127.0.0.1:4200/app/editor/doc-3a3d6bf3-3e42-4cb9-8269-be89b716bacd`.
- Implementation screenshot path: Codex browser capture `qaTab/finalQaBytes`, emitted in this task's visual QA record. The in-app browser screenshot API does not expose a filesystem path.
- Combined comparison evidence: one browser-rendered side-by-side comparison containing the source screenshot and the live implementation, emitted in this task's visual QA record.
- Viewport: 2048 × 1073 CSS pixels at device scale factor 1.
- Source pixels: 2513 × 1317. It was proportionally normalized to the 2048 × 1073 comparison frame.
- Implementation pixels: 2048 × 1073.
- State: desktop editor with the thumbnail rail expanded, Select active, and three blank pages available in the implementation. Document content differs intentionally; toolbar and rail geometry are the scoped comparison surfaces.

## Findings

- No actionable P0, P1, or P2 differences remain within the requested toolbar and thumbnail-rail scope.
- Fonts and typography: the existing IBM Plex Sans interface typography, compact icon labels, weights, line heights, and wrapping remain unchanged. No toolbar label is clipped at the reference viewport.
- Spacing and layout rhythm: the thumbnail list now has an 8px top inset instead of 22px. Page 1 begins immediately beneath the editor chrome, and the 112px portrait previews, 20px stack gap, rail footer, and centered page canvas remain aligned.
- Colors and visual tokens: all toolbar icons resolve to neutral charcoal, hover and selected states remain neutral gray, and each former colored group underline resolves to `display: none`. PDFEnrich blue remains only on the Finish action and document-selection affordances.
- Image quality and asset fidelity: the existing Phosphor icon family, official PDFEnrich logo, PDF canvas rendering, and thumbnail previews are preserved without substitution, distortion, or raster replacements.
- Copy and content: no editor labels, filenames, statuses, actions, or document content changed.
- Affordances and accessibility: toolbar controls remain real buttons with the same labels, pressed/disabled states, focus behavior, and workflows. The thumbnail rail remains keyboard-reorderable and its footer controls remain operational.

## Comparison history

- Pass 1 source evidence showed two P2 issues: a 22px blank band above page 1 made the thumbnail stack look detached, and multiple tool groups used unrelated coral, lilac, yellow, and blue icon/underline accents.
- Fixes: reduced the thumbnail-list top inset to 8px, removed all tool-group underline pseudo-elements, applied one charcoal icon token, and changed the selected thumbnail spine from coral to the existing document-selection blue.
- Pass 2 post-fix evidence: the combined source/live comparison shows page 1 aligned directly below the chrome and a consistent monochrome toolbar. Computed browser values confirm `padding-top: 8px`, toolbar icon color `rgb(29, 29, 31)` for the selected control, `display: none` for group underlines, and three rendered thumbnails.

## Interaction and technical verification

- Expanded the thumbnail rail and rendered three pages.
- Added two blank pages through the real Add page control.
- Verified Select remains pressed and toolbar controls retain accessible labels.
- Browser console returned no warnings or errors.
- Focused unit tests, TypeScript checking, and the production build passed.

## Implementation checklist

- [x] Remove colored toolbar icons.
- [x] Remove colored tool-group underline strips.
- [x] Keep neutral gray hover and selected-tool feedback.
- [x] Move the first thumbnail closer to the top of the rail.
- [x] Preserve 112px previews and all editor behavior.
- [x] Verify the desktop result at the source aspect ratio.

final result: passed
