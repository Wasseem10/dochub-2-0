# Post-upload PDF editor audit and implementation plan

## Scope and product goal

This audit covers only the editor shown after a PDF is uploaded. The current blue PDFArrow landing page is outside scope and remains unchanged. PDF Help is used only as a public product and interaction benchmark; PDFArrow keeps its own branding, code, text, icons, colors, and architecture.

## Feature inventory

| Workflow | Reference behavior | PDFArrow phase 1 |
| --- | --- | --- |
| File actions | Print, Download, Done | Implemented in the editor header |
| Page rail | Thumbnails, active-page outline, page number | Implemented for all document pages |
| History | Undo and Redo next to thumbnails | Implemented with keyboard shortcuts |
| Text | Add Text and Edit Text | Implemented; existing text uses the detected text layer |
| Signatures | Sign tool | Existing signature workflow retained and moved into the horizontal toolbar |
| Shapes | Arrow split control plus line, rectangle, ellipse | Implemented through the Arrow menu |
| Freehand | Draw and Erase | Implemented; Erase removes objects and detected text |
| Markup | Highlight and Text Highlight | Implemented, including detected-text-sized highlighting |
| Media | Image upload and placement | Existing image workflow retained |
| Stamps | Stamp placement | Default APPROVED stamp implemented with move, resize, rotation, undo, and export |
| Links | Link placement and export | Implemented with clickable PDF URI annotations |
| Notes | Note marker and editable content | Implemented on top of the existing comment annotation system |
| Search | Search control | Existing PDF search retained |
| Page management | Reorder, rotate, delete, append/add, export | Existing page operations grouped behind Manage Pages |
| Navigation | Zoom, page field, previous/next | Existing controls retained below the page |
| Object transforms | Selection box, 8 handles, move, rotation, delete | Existing stable transform system retained for new object types |
| Clipboard | Copy, Cut, Paste | Added for annotations and detected-text edits |
| Save/export | Local save, flattened export, comments/forms/images | Existing export pipeline extended for stamps and clickable links |

## Strongest reference UX patterns

1. The document is the visual focus. Global chrome is quiet and tool choices stay in one horizontal strip.
2. Tool order follows the user journey: edit text first, then sign/mark up, then insert, then search/manage.
3. Thumbnails remain visible without competing with the page.
4. Undo and Redo are always in the same place and visibly communicate availability.
5. Selection feedback is immediate: objects show a clear boundary and direct-manipulation handles.
6. Print, Download, and Done are separated from creation tools, which makes completion feel predictable.

## Important interactions and edge cases

- Empty, loading, restoring-session, invalid-document, offline, export-processing, success, and export-failure states must not replace the document unexpectedly.
- Text tools must distinguish original PDF text from newly added text.
- Drawing and shape tools need pointer capture so leaving the page does not lose the gesture.
- Resizing near page edges must clamp objects inside the page.
- Rotation, undo, redo, copy, paste, and delete must preserve page coordinates and object type.
- A link must remain clickable after PDF save/reload, not just look like blue text in the editor.
- Large files must render the active page first and avoid mounting every full-resolution page.
- Manage Pages must make destructive actions explicit and keep page order in export.
- Mobile needs large tap targets, a horizontally scrollable tool row, collapsed thumbnails, and no hover-only actions.

## Why the reference feels responsive

- It exposes one active document canvas instead of rendering every PDF page at full size.
- Thumbnail rendering is visually separate from the active page, allowing lower-resolution work to happen independently.
- Tool activation is immediate and settings are contextual instead of forcing large mode changes.
- The header and toolbar stay stable while the page changes, reducing layout movement.
- Selection transforms happen locally on the overlay instead of rebuilding the PDF during every pointer move.

## Problems found in the previous PDFArrow editor

- A tall six-mode rail used too much horizontal space and hid common tools behind categories.
- A second right-side action rail competed with the page and made the interface feel like a dashboard instead of an editor.
- Global controls, editing tools, and completion actions had similar visual weight.
- Some reference-parity tools were absent from the main workflow: stamp, clickable link, text highlight, and note.
- Page management controls were permanently visible instead of appearing when requested.
- Download used an immediately revoked object URL, which can be unreliable in some browser download flows.
- The smart-text helper overlay obscured the document and made the editor look less settled.

## Performance differences and architecture decisions

- The active PDF page remains the only full document page rendered in the main canvas; the page rail uses thumbnails.
- PDF parsing, page rasterization, and export remain outside React render cycles and are invoked through existing async helpers.
- The existing normalized coordinate model is retained, avoiding a new editor engine or unnecessary dependency.
- Stamp and link support extend the existing annotation/export pipeline instead of introducing a second document model.
- The final editor-specific stylesheet is imported last so the new shell can be delivered without destabilizing public pages.

## Recommended improvements

### Critical

- Keep one active full-resolution page and continue preventing all-page canvas rendering.
- Preserve the current coordinate/export model while adding reference-parity tools.
- Keep export, rasterization, and PDF processing outside React render cycles.

### High

- Replace native link prompts with an accessible popover that supports text, URL validation, edit, and remove.
- Add a stamp chooser with Approved, Draft, Final, and custom text.
- Add performance instrumentation for first usable page, page switch, thumbnail completion, zoom, and export.
- Add browser tests for object placement, transforms, undo/redo, keyboard deletion, and exported annotations.

### Medium

- Improve original-text font matching, wrapping, and multi-line reflow.
- Add alignment guides and snap behavior for multiple objects.
- Add explicit progress for long exports and cancellation where safe.
- Run a physical mobile-device pass and tune toolbar overflow and touch transforms.

### Low

- Add optional recent colors and recently used stamps.
- Add richer note appearance options and annotation filtering.
- Add thumbnail density preferences for very long documents.

## Implemented architecture changes and files

- `src/App.jsx`: reference-style editor shell, horizontal toolbar, new tools, clipboard commands, page-management visibility, export updates, and a safer download flow.
- `src/editor-overrides.css`: scoped compatibility rules for the existing editor shell.
- `src/reference-editor.css`: editor-only layout and responsive cascade, imported last.
- `src/main.jsx`: imports the editor cascade after existing styles.
- `src/tools/editorObjectTransforms.js`: treats stamps and links as frame-based transformable objects.
- `src/editor/pdfLinkAnnotation.mjs`: creates real PDF URI link annotations through pdf-lib.
- `tests/unit/pdf-link-annotation.test.js`: verifies clickable links survive save/reload and invalid geometry is ignored.
- `AGENTS.md`: records the post-upload editor direction so later work does not restore the old six-mode rail.

## Phased implementation order

1. Phase 1 — complete: replace editor chrome, expose the reference workflow, retain stable object transforms, add stamp/link/note/text-highlight behavior, improve download reliability, and verify a 20-page PDF.
2. Phase 2 — next: add the link popover, stamp chooser, alignment guides, and dedicated browser interaction tests.
3. Phase 3 — next: measure first-page usability, long-document scroll/page-switch behavior, zoom, and export; tune mobile and very-large-document behavior to explicit budgets.
4. Phase 4 — later: advanced existing-text font matching/reflow, accessibility refinement, and broader error recovery.

## Verification evidence

- `design-evidence/pdf-help-editor-phase1.png`
- A local side-by-side reference comparison was reviewed but is not committed because it contains the competitor's branded screenshot.
- `design-qa.md`
- Production build: passed.
- Typecheck: passed.
- Automated tests: 26 files and 80 tests passed.
- Lint: 0 errors; the rep