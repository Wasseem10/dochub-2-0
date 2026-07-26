# Signature Proof Dialog — Design QA

## Comparison target

- Source visual truth: `work/design-references/signature-proof-selected-2026-07-26.png`
- Implementation screenshot: `work/design-qa/signature-proof-2026-07-26/signature-proof-final.png`
- Combined comparison: `work/design-qa/signature-proof-2026-07-26/signature-proof-comparison.png`
- Route/state: `/app/editor/:documentId`, blank PDF, Sign tool open, Draw method selected.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Layout and hierarchy: the implementation matches the selected wide white proofing dialog, compact header, three-part method strip, bordered signature sheet, utility row, and quiet action footer.
- Typography and color: PDFArrow's DM Sans/Funnel Display system, charcoal copy, neutral surfaces, fine dividers, and oxblood active/action treatment replace the previous generic blue pill UI.
- Proofing surface: the empty state uses one pen cue, one signing baseline, and an explicit 100% placement note. The optional page-preview state narrows and lifts the signature sheet so the control has a visible, useful effect.
- Interaction: Draw, Type, Upload, Clear, Switch to Type, Preview on page, Cancel, close, Escape, and Save remain operational. Empty saves stay disabled.
- Accessibility: the three methods are exposed as a tablist, the page preview is an accessible switch with `aria-checked`, keyboard users receive a direct typed alternative, inputs remain labeled, and the modal retains its dialog title and description.
- Responsive behavior: the modal uses a constrained viewport height, single-column typed controls on narrow screens, compact tabs, and a stacked utility helper without changing the desktop composition into a cropped layout.

## Browser checks

- Opened a blank local PDF through the public editor entry.
- Opened the Sign tool and verified the default Draw state.
- Toggled Preview on page and verified `aria-checked="true"` plus the visible page-proof state.
- Switched to Type, entered `Jordan Lee`, and verified Save signature became enabled.
- Switched to Upload and verified Choose image appeared while Save signature remained disabled without a file.
- Closed and reopened the modal and captured the clean default state.

## Comparison history

1. The first implementation matched the main source regions but left Clear as an unframed text action and could show a scrollbar in the typed state.
2. Clear was restored to the source's compact disabled button treatment, the typed proof sheet was shortened, and the focus treatment was aligned to oxblood.
3. The final browser capture matches the source's density, rhythm, hierarchy, and restrained proofing character.

## Follow-up polish

- P3: the concept includes decorative corner registration marks around the signing sheet. They were omitted to keep the production surface simple and avoid introducing non-semantic decorative geometry.

final result: passed
