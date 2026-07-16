# Tool landing page design QA

- Source visual truth: `/var/folders/y5/5nxfxhk97_9fmsmdf8tqj81r0000gn/T/TemporaryItems/NSIRD_screencaptureui_qMn3X5/Screenshot 2026-07-16 at 12.36.17 PM.png`
- Implementation screenshot: `/tmp/fixthatpdf-tool-landings-qa-2026-07-16/01-edit-pdf.png`
- New tool screenshot: `/tmp/fixthatpdf-tool-landings-qa-2026-07-16/02-add-page-numbers.png`
- Full comparison: `/tmp/fixthatpdf-tool-landings-qa-2026-07-16/04-reference-vs-implementation.png`
- Viewport: source 2722 × 1102; implementation 1470 × 832, normalized side by side for comparison
- State: desktop, logged-out upload state before file selection

**Findings**

- No actionable P0, P1, or P2 mismatch remains.
- The source anatomy is preserved: a short centered headline and explanation lead directly into a wide, elevated upload card with a large internal drop target and one dominant pill-shaped action.
- The implementation intentionally uses FixThatPDF green, mint, cream, Funnel Display, and DM Sans instead of the source's blue palette. This follows the established product system and repository design instruction.
- The 8 MB editor limit intentionally differs from the reference's 100 MB message because 8 MB is the current validated editor limit; the UI must not advertise an unsupported size.

**Required fidelity surfaces**

- Fonts and typography: passed. Large Funnel Display headline, restrained optical weight, tight display tracking, and DM Sans support copy match the site's landing-page hierarchy.
- Spacing and layout rhythm: passed. The upload card dominates the first viewport, has wide outer margins, generous vertical padding, a large dashed drop area, rounded corners, and restrained elevation.
- Colors and visual tokens: passed. The implementation consistently maps the reference anatomy to `--public-green`, `--public-mint`, `--public-cream`, and the existing public text tokens.
- Image quality and asset fidelity: passed. The design contains no raster image assets; the upload icon comes from the existing icon system and remains sharp at the displayed size.
- Copy and content: passed. Each released route uses its own tool name, action-specific drop instruction, truthful file limit, and a concise one-line explanation.

**Interaction and responsive checks**

- File inputs and primary upload buttons render for editor, page, image, and Office workflows.
- Drag/drop, keyboard activation, disabled processing states, errors, and post-upload controls remain connected to the existing workflows.
- The grid collapses to one column below 900 px and the upload action becomes full width on small screens.
- The new Add Page Numbers route exposes a file input, six positions, start-number input, three text sizes, and disabled download state until a PDF is loaded.

**Comparison history**

- Initial implementation comparison found no P0/P1/P2 visual issue. No visual correction loop was required.

**Follow-up polish**

- P3: A future pass could add a compact review strip below the dropzone, but it is not needed for the requested simple workflow.

**Implementation checklist**

- Shared upload-first layout across released editor, page, image, and Office tools.
- Dominant upload workspace above secondary detail.
- Brand-consistent typography, color, radius, and elevation.
- Truthful limits and anonymous-download language.
- Real Add Page Numbers workflow and automated coverage.

final result: passed
