# RealPDF upload page design QA

## Source and target

- Reference: `/var/folders/y5/5nxfxhk97_9fmsmdf8tqj81r0000gn/T/TemporaryItems/NSIRD_screencaptureui_QbN6VA/Screenshot 2026-07-15 at 9.39.07 PM.png`
- Implemented route checked: `http://127.0.0.1:5173/sign-pdf`
- Desktop comparison viewport: 2048 × 878 browser override
- Comparison artifact: `tmp/design/upload-page-comparison.png`

## Visual comparison

| Check | Result | Notes |
| --- | --- | --- |
| Large centered tool headline | Pass | Tool-specific headline is centered and uses the RealPDF display type. |
| Supporting copy | Pass | One concise tool-specific line sits directly below the headline. |
| Large upload box | Pass | The upload frame spans the primary content width and remains fully visible in the reference viewport. |
| Center upload icon | Pass | A real Lucide upload icon is centered above the action copy. |
| Primary upload action | Pass | Large pill button is centered and uses the requested baby-blue product treatment. |
| Drag-and-drop affordance | Pass | Dashed inner border, hover state, drag state, progress, and upload error copy are present. |
| RealPDF tailoring | Pass | Existing marketing header, typography, spacing, baby-blue palette, privacy messaging, and 8 MB product limit are retained. |
| Responsive behavior | Pass | Mobile rules reduce heading size, frame padding, and button width without horizontal overflow. |
| Accessibility | Pass | Keyboard activation, visible focus, semantic button/input, upload status, error alert, and progress semantics are included. |

## Functional states verified

- Idle upload state renders on all eight released editor-tool routes through the shared component.
- Drag state, file input wiring, upload-progress state, invalid-file errors, and loading copy are covered by component and validation tests.
- Tool status copy matches the real supported scope; no fake upload limit or unavailable backend behavior is presented.

## Final result

Pass. The implementation follows the reference hierarchy and scale while using the established RealPDF navigation and baby-blue UI language.

---

## Retained dashboard design QA

The earlier pink dashboard verification remains valid and is retained here for release history.

- Source visual truth: `design-evidence/dashboard-pink-reference/source-reference.png`
- Browser-rendered implementation: `design-evidence/dashboard-pink-reference/implementation-1786-v3.png`
- Normalized comparison: `design-evidence/dashboard-pink-reference/comparison-normalized.png`
- Target viewport: 1786 × 1018
- State: authenticated design-preview account with an empty, real-data document catalog
- Result: passed with no actionable P0, P1, or P2 mismatch

The verified dashboard retained its notebook hero, navigation grouping, quick actions, statistics, recent-document area, AI assistant, activity panel, and template promotion while replacing fabricated documents, folders, metrics, and third-party activity with authenticated-user data and honest empty states.
