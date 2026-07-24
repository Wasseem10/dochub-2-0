# Prototype Instructions

Use `runtime-public/pdfarrow-logo.png` as the primary logo on the landing page. It has intentional white margins, so display it through the `.brand-wordmark--logo` crop container rather than as an uncropped square image. All visible product naming, page metadata, exports, and user-facing copy must use PDFArrow rather than any prior brand.

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

For the editor page rail, use a narrow 144px white thumbnail sidebar with compact 72px portrait previews, no cropping or stretching, a dark rounded selected outline, bare gray page numbers, and a four-button footer ordered trash, clockwise rotate, add page, then download. The top-left list button must toggle this rail and must not navigate to the dashboard.

The product name is PDFArrow. The landing hero’s right column must remain a functional PDF drag-and-drop upload zone. Selecting or dropping a PDF should open the editor without first forcing authentication.

The selected July 24, 2026 landing reference is `work/design-references/landing-upload-tray-selected-2026-07-24.png`: a centered DM Sans headline, compact navigation, four colorful task tabs, a tactile ivory upload tray, restrained stationery edge details, a coral cord, and visible paperclips on a warm-white canvas. Match that composition without returning to a layered-paper collage. Use the coral, lilac, yellow, and pink accents in controlled supporting roles while keeping blue limited to the existing PDFArrow logo. The mobile hero must use its own intentionally composed portrait artwork and layout rather than shrinking or cropping the desktop hero. Never use photographic clouds or sky. The entire visible “Drop your PDF here” panel must open the native PDF file picker by mouse, touch, Enter, or Space while preserving drag-and-drop upload.

The later July 24, 2026 homepage screenshot `codex-clipboard-6ee76764-5fbb-467d-9e49-482e1a45f9e2.png` supersedes the upload-tray reference. Match its bright white hero, navy two-line headline with coral-to-orange “beautifully” emphasis, four pastel task pills, large coral outlined upload panel, balanced document-tool artwork at the left and right edges, and four compact reassurance items. Preserve the source’s desktop balance while using a separate sparse edge-art composition on mobile so the upload action remains central and uncropped.

The desktop editor’s post-upload screen must follow the July 16, 2026 PDF Help editor screenshot as its interaction and layout reference while preserving PDFArrow branding and original implementation. Use a clean document header, one horizontal primary toolbar with direct access to Thumbnails, Undo, Redo, Add Text, Edit Text, Sign, Arrow/shapes, Draw, Erase, Highlight, Text Highlight, Image, Stamp, Link, Note, Search, and Manage Pages, a toggleable white thumbnail rail, and a centered continuous document canvas. Do not restore the older six-mode left rail or contextual mode ribbon. Selected objects use one blue normalized transform model with eight resize handles, a rotation handle, keyboard deletion, and undo/redo; text boxes enter editing immediately, save on blur, and discard abandoned empty boxes. Every visible primary toolbar control must perform a real workflow; do not add disabled “coming soon” controls.

The selected July 23, 2026 editor redesign is Precision Review Studio (ideation option 2). Match the Editorial Monochrome dashboard with a slim centered-filename header, inset floating command bar, warm stone document canvas, 144px warm-white thumbnail rail, oxblood active states, and a compact contextual settings strip directly beneath the command bar. Keep the page as the visual focus and retain the full functional editor toolset.

The primary desktop editor toolbar is a floating white rounded card on the light workspace, with compact icon-over-label buttons, subtle group dividers, soft shadow, and a pale PDFArrow-blue active state. Keep the control density and grouping aligned with the July 17, 2026 toolbar reference while retaining only working PDFArrow actions.

The floating bottom zoom and page navigator follows the selected July 17, 2026 compact rail concept: one low-profile white capsule, borderless Lucide controls, a bordered zoom select, a pale-blue current-page field, one subtle divider, and restrained shadow. Keep zoom out/in, zoom preset, first/previous/next/last page, current page, and total page count functional and aligned.

New text boxes must open at a readable minimum size, auto-grow while typing, use Arial as the dependable default PDF font, save on blur, and keep one shared blue selection model with eight resize handles, rotation, keyboard nudging, deletion, and history. The contextual text bar must use clear labels and only operational font/style controls.

Manage Pages expands the persistent thumbnail rail into a labeled organizer with insert, duplicate, rotate, delete, drag reorder, keyboard reorder, and per-page quick actions. Signature and initials dialogs must disable empty saves and expose labeled controls and a typed keyboard-accessible alternative to drawing.

Every released PDF tool must have its own simple landing page using the current landing page as its visual source of truth: DM Sans hero typography, blue `#2851eb` actions, white and powder-blue surfaces, and compact type. Keep one centered upload card as the dominant action. Do not use green, mint, or cream on tool landing pages. Secondary settings and explanatory content must not compete with the upload action before a file is chosen.

The selected July 24, 2026 tool-page redesign is Airy Editorial Glow (ideation option 1): keep the large centered upload card unmistakably dominant, then use a white canvas with restrained powder-blue and blush light, strong compact sans-serif headings, a three-step strip, a real PDFArrow workspace tutorial, a flat related-tools row, and a spacious split FAQ. Apply the system responsively to each released tool without shrinking the desktop composition into mobile.

The editor’s PDFArrow wordmark is a labeled button that returns to `/app/dashboard`. The dashboard remains available to anonymous local users; account-only sections may still request sign-in. Keep the dashboard deliberately simple: blue PDFArrow branding, a short upload-or-blank hero, three essential task choices, recent documents, restrained navigation, and no promotional side rail, statistics wall, fake folder creation, or competing AI/template/activity cards on the home screen.

For the next dashboard redesign, do not use a blue-dominant SaaS visual system, pale-blue feature tiles, gradient icon boxes, oversized upload drop zones, or generic card-grid composition. Explore a cleaner premium neutral direction with restrained accent color, editorial typography, precise alignment, and denser professional document-management patterns; keep any legacy PDFArrow blue limited to the existing logo until the selected concept establishes the final brand treatment.

The selected July 24, 2026 dashboard redesign is Bright Editorial Desk (ideation option 3): a fully light rail and white workspace, strong black geometric typography, a compact citron Upload PDF action, tiny multicolor tool tabs, a horizontal document-preview shelf, and a dense flat file ledger. Keep the experience bright, airy, crisp, professional, and fun; do not restore a dark navigation rail, beige-heavy surfaces, or blue-dominant dashboard styling.

The dashboard left navigation follows the selected July 23, 2026 Quiet Editorial Rail: a continuous warm-white surface, compact charcoal rows, one slim oxblood active spine, Analytics separated as an owner utility, and Trash plus Help anchored at the bottom. Use a restrained four-circle catalog icon for All tools; do not restore the playful sparkle icon or blue selected-row styling.

The owner Analytics page must use the same Editorial Monochrome dashboard shell and dense document-management rhythm, including the shared searchable top bar, flat metric strips, fine dividers, compact controls, and oxblood-only emphasis. Keep an owner-only sign-in directory that clearly identifies the account name, email, Google versus email/password method, and Firebase last sign-in time; do not add this identity data to anonymous product analytics events.

Before finishing any implementation change in this prototype, commit the scoped work and push it to the configured GitHub branch so the connected live deployment can update.

The dashboard All tools action stays inside the Editorial Monochrome app shell at `/app/tools`. Keep the persistent Quiet Editorial Rail, serif page title, neutral catalog rows, oxblood selection and actions, compact category filtering, and one shared tool search. Do not send dashboard users to the older blue marketing-style Features page.

On the Bright Editorial Desk dashboard, recent-document cards must render a real first-page thumbnail from the saved PDF whenever source bytes are available, including after a reload. Empty blank documents should still read as real white pages rather than generic placeholder tiles. Use clean DM Sans for the welcome greeting and keep document-type markers neutral; do not restore the red PDF file badge.

Documents and owner Analytics use the same Editorial Monochrome app shell as Home and All tools. Documents uses a flat compact library with neutral rows and oxblood actions; Analytics uses a dense neutral metric ledger and square divided report sections. Do not restore blue upload buttons, colorful metric tiles, rounded SaaS cards, or shadow-heavy panels on either route.

Authentication and lazy-loading transitions use PDFArrow’s DM Sans and Funnel Display typography, the blue document mark, concise status copy, a compact centered white card, and reduced-motion-safe progress. Do not use condensed display fonts, tiny all-caps brand pills, or vague filler copy on loading screens.

The login screen should feel professional and document-first: use a restrained workspace preview, calm navy/blue surfaces, clear sign-in hierarchy, and explicit browser-processing reassurance. Avoid playful handwritten type, cloud imagery, or oversized promotional visuals in authentication.

Keep the authentication layout inspired by a classic centered sign-in card: obvious email/password hierarchy, one restrained social sign-in option, generous breathing room, and an original PDFArrow document-workspace panel rather than copying another PDF product's branding or decoration.

Match authentication to the selected Editorial Monochrome dashboard: white and neutral-gray surfaces, charcoal copy, oxblood primary actions, fine dividers, square restrained radii, compact DM Sans UI, and a serif page title. When Firebase is unavailable in the local prototype, email authentication must fall back to an explicit browser-local session instead of disabling the form.

The selected July 23, 2026 authentication reference is a minimal, borderless sign-in page: one narrow 400px column on white, a dark navy `Sign In` heading and primary button, one Google sign-in button, a compact `OR USE YOUR EMAIL` divider, icon-led email and password fields, an underlined forgot-password action, and a centered PDFArrow sign-up prompt. Do not restore the split product-preview panel, card shell, extra provider buttons, security copy, or promotional authentication content.

The Draw tool opens one compact floating settings bar below the primary toolbar. It must expose direct black, blue, red, orange, green, and purple choices, a working custom color picker, five readable pen-size presets, and a fine-size slider without clipping, overlapping, or duplicating controls elsewhere in the same bar.

The Translate PDF workflow must let users choose the document's source language and must include English as a translation target. Do not assume every uploaded document starts in English, and never allow the source and target language to remain identical.

Every editor Print control must print the generated edited PDF itself, never the surrounding editor interface, toolbars, sidebars, or browser page chrome.

If an editor PDF page renderer is released or fails, rebuild it from the saved source bytes and give the user an explicit page-level retry. A PDF page must never silently disappear or remain as an endless blank loading surface.

Compress PDF must support honest lossless, balanced, and maximum-reduction modes, show measured before/after size and a visual comparison, keep batch results downloadable together, and never present a larger output as a successful compression.
