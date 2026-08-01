# Prototype Instructions

The product name is PDFEnrich and its canonical production domain is `https://pdfenrich.com`. Never reintroduce the prior brand in visible copy, metadata, routes, exports, downloads, generated assets, or user-facing product identifiers. Preserve existing browser-local account, privacy, and signature data when migrating branded storage keys.

PDFEnrich is completely free. There are no subscriptions, paid tiers, checkout flows, or paid plans planned. Make this a primary conversion message on public entry points, upload actions, and free-plan information pages. Prefer direct phrases such as “free and simple” over decorative “beautifully” language, and do not use unsupported security, privacy, compliance, certification, or availability claims.

Use `runtime-public/pdfenrich-logo.png` as the primary logo on the landing page. It has intentional white margins, so display it through the `.brand-wordmark--logo` crop container rather than as an uncropped square image. All visible product naming, page metadata, exports, and user-facing copy must use PDFEnrich rather than any prior brand.

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

For the editor page rail, use a 176px white thumbnail sidebar with readable 112px portrait previews, no cropping or stretching, a light-blue selected outline, bare gray page numbers, and a four-button footer ordered trash, clockwise rotate, add page, then download. The top-left list button must toggle this rail and must not navigate to the dashboard.

The product name is PDFEnrich. The landing hero’s right column must remain a functional PDF drag-and-drop upload zone. Selecting or dropping a PDF should open the editor without first forcing authentication.

The selected July 24, 2026 landing reference is `work/design-references/landing-upload-tray-selected-2026-07-24.png`: a centered DM Sans headline, compact navigation, four colorful task tabs, a tactile ivory upload tray, restrained stationery edge details, a coral cord, and visible paperclips on a warm-white canvas. Match that composition without returning to a layered-paper collage. Use the coral, lilac, yellow, and pink accents in controlled supporting roles while keeping blue limited to the existing PDFEnrich logo. The mobile hero must use its own intentionally composed portrait artwork and layout rather than shrinking or cropping the desktop hero. Never use photographic clouds or sky. The entire visible “Drop your PDF here” panel must open the native PDF file picker by mouse, touch, Enter, or Space while preserving drag-and-drop upload.

The later July 24, 2026 homepage screenshot `codex-clipboard-6ee76764-5fbb-467d-9e49-482e1a45f9e2.png` supersedes the upload-tray reference. Match its bright white hero, navy two-line headline with coral-to-orange “beautifully” emphasis, four pastel task pills, large coral outlined upload panel, balanced document-tool artwork at the left and right edges, and four compact reassurance items. Preserve the source’s desktop balance while using a separate sparse edge-art composition on mobile so the upload action remains central and uncropped.

The homepage Popular Tools section should keep its simple card-grid structure rather than switching to a feature selector, capability map, or large product-workspace showcase. Show a broader, scannable set of core features using compact vertical cards, recognizable line icons, short plain-language descriptions, and restrained PDFEnrich pastel accents so visitors can understand the product range at a glance.

The selected July 29, 2026 Popular Tools refinement uses large, original object-based document illustrations rather than small generic line glyphs. Keep the white card grid and short descriptions, give each illustration a consistent soft editorial depth and generous uncropped stage, and use distinct tool-specific scenes inspired by real PDF actions without copying competitor artwork, stretching assets, or warping document shapes.

On laptop-height desktop viewports, compact the homepage Popular Tools cards, illustration stages, and grid gaps so the two-row grid does not consume the whole screen. Preserve the roomier large-desktop treatment and the existing mobile composition; do not crop or distort the object illustrations while tightening the laptop layout.

The earlier July 29, 2026 Professional Document Commands glyph set is superseded by the object-based illustration refinement above. Keep `work/design-references/popular-tools-icons-exact-2026-07-29.png` and `runtime-public/tool-icons/` only as archival references; do not restore those small navy line glyphs to the homepage cards.

The desktop editor’s post-upload screen must follow the July 16, 2026 PDF Help editor screenshot as its interaction and layout reference while preserving PDFEnrich branding and original implementation. Use a clean document header, one horizontal primary toolbar with direct access to Thumbnails, Undo, Redo, Add Text, Edit Text, a visible Select cursor beside the text tools, Sign, Arrow/shapes, Draw, Erase, Highlight, Text Highlight, Image, Stamp, Link, Note, Search, and Manage Pages, a toggleable white thumbnail rail, and a centered continuous document canvas. Do not restore the older six-mode left rail or contextual mode ribbon. Selected objects use one blue normalized transform model with eight resize handles, a rotation handle, keyboard deletion, and undo/redo; text boxes enter editing immediately, save on blur, and discard abandoned empty boxes. Every visible primary toolbar control must perform a real workflow; do not add disabled “coming soon” controls.

The selected July 23, 2026 editor redesign is Precision Review Studio (ideation option 2). Match the Editorial Monochrome dashboard with a slim centered-filename header, inset floating command bar, pure-white document canvas, a 176px white thumbnail rail, blue primary and active states, and a compact contextual settings strip directly beneath the command bar. Keep the page as the visual focus and retain the full functional editor toolset.

The primary desktop editor toolbar is a slim 64px floating white rounded card on the light workspace, with compact icon-over-label buttons, subtle group dividers, soft shadow, and a pale PDFEnrich-blue active state. Center the full control group on desktop rather than splitting actions across the sides. Avoid a tall or bulky ribbon; retain only working PDFEnrich actions.

Editor toolbar hover and selected states use an Apple-like neutral gray interaction system: soft gray hover, a slightly deeper gray selected surface, charcoal icons and labels, and a subtle inset border. Do not use blue for toolbar hover or selected-tool feedback; reserve blue for primary actions and document selection affordances.

Selecting an editor tool must not trigger a floating bottom-right guidance toast over the document. Put any necessary next-step guidance in the compact contextual strip beneath the toolbar, reserve transient toasts for real completion, warning, or error states, and keep those operational notices light and readable rather than black.

The floating bottom zoom and page navigator follows the selected July 17, 2026 compact rail concept: one low-profile white capsule, borderless Lucide controls, a bordered zoom select, a pale-blue current-page field, one subtle divider, and restrained shadow. Keep zoom out/in, zoom preset, first/previous/next/last page, current page, and total page count functional and aligned.

The mobile editor must be intentionally touch-first rather than a compressed desktop toolbar. Use one compact filename header, an unobstructed document canvas, a six-action bottom tool dock with generous tap targets, and a separate bottom-sheet More menu containing every tool hidden from the dock. Keep the zoom/page capsule below the tool dock, place contextual settings above it, eliminate overlapping toolbar groups and horizontal page gutters, and enlarge transform handles for touch.

The mobile More sheet uses grouped Edit & mark up, Insert, Shapes, and Document sections with a dimmed backdrop, an explicit close control, safe-area padding, and scrolling within the sheet. It must include Edit Text, Draw, Erase, Highlight, Text Highlight, Whiteout, Image, Stamp, Link, Note, Check, Text field, Date, Initials, Arrow, Line, Rectangle, Circle, Redo, Search, Manage Pages, Share, Print, and Export without duplicating the six dock actions.

New text boxes must open at a readable minimum size, auto-grow while typing, use Arial as the dependable default PDF font, save on blur, and keep one shared blue selection model with eight resize handles, rotation, keyboard nudging, deletion, and history. The contextual text bar must use clear labels and only operational font/style controls.

Editing detected text from an existing PDF must preserve that item’s box while typing and must never cover, reflow, or erase neighboring page content. Keep immutable source bounds for removing the original glyphs during preview and export; moving or resizing the replacement must not move or enlarge the source cleanup area. Clicking and leaving an unchanged detected text item must not mark it edited.

While a text box has keyboard focus, hide its transform controls so the writing area stays unobstructed; restore them only after focus leaves the text.

Manage Pages expands the persistent thumbnail rail into a labeled organizer with insert, duplicate, rotate, delete, drag reorder, keyboard reorder, and per-page quick actions. Signature and initials dialogs must disable empty saves and expose labeled controls and a typed keyboard-accessible alternative to drawing.

On phones, Manage Pages is a full-screen touch workspace rather than a widened sidebar. Use a clear Done action, Undo and Redo, Add blank and Import PDF shortcuts, readable page previews, a dedicated touch drag handle, and finger-sized move, duplicate, rotate, and delete controls on every page.

The selected July 26, 2026 signature-dialog redesign is Signature Proof (ideation option 3): use a wide, compact white proofing dialog with an oxblood-underlined Draw/Type/Upload command strip, a bordered signature sheet with one clear signing baseline and explicit 100% placement scale, a flat keyboard-accessible Type escape hatch, a working page-preview toggle, and restrained neutral actions. Avoid generic blue pill tabs, oversized dashed drop areas, and vague instructional filler.

Every released PDF tool must have its own simple landing page using the current landing page as its visual source of truth: DM Sans hero typography, blue `#2851eb` actions, white and powder-blue surfaces, and compact type. Keep one centered upload card as the dominant action. Do not use green, mint, or cream on tool landing pages. Secondary settings and explanatory content must not compete with the upload action before a file is chosen.

The selected July 24, 2026 tool-page redesign is Airy Editorial Glow (ideation option 1): keep the large centered upload card unmistakably dominant, then use a white canvas with restrained powder-blue and blush light, strong compact sans-serif headings, a three-step strip, a real PDFEnrich workspace tutorial, a flat related-tools row, and a spacious split FAQ. Apply the system responsively to each released tool without shrinking the desktop composition into mobile.

The editor’s PDFEnrich wordmark is a labeled button that returns to `/app/dashboard`. The dashboard remains available to anonymous local users; account-only sections may still request sign-in. Keep the dashboard deliberately simple: blue PDFEnrich branding, a short upload-or-blank hero, three essential task choices, recent documents, restrained navigation, and no promotional side rail, statistics wall, fake folder creation, or competing AI/template/activity cards on the home screen.

For the next dashboard redesign, do not use a blue-dominant SaaS visual system, pale-blue feature tiles, gradient icon boxes, oversized upload drop zones, or generic card-grid composition. Explore a cleaner premium neutral direction with restrained accent color, editorial typography, precise alignment, and denser professional document-management patterns; keep any legacy PDFEnrich blue limited to the existing logo until the selected concept establishes the final brand treatment.

The selected July 24, 2026 dashboard redesign is Bright Editorial Desk (ideation option 3): a fully light rail and white workspace, strong black geometric typography, a compact citron Upload PDF action, tiny multicolor tool tabs, a horizontal document-preview shelf, and a dense flat file ledger. Keep the experience bright, airy, crisp, professional, and fun; do not restore a dark navigation rail, beige-heavy surfaces, or blue-dominant dashboard styling.

The dashboard left navigation follows the selected July 23, 2026 Quiet Editorial Rail: a continuous warm-white surface, compact charcoal rows, one slim oxblood active spine, Analytics separated as an owner utility, and Trash plus Help anchored at the bottom. Use a restrained four-circle catalog icon for All tools; do not restore the playful sparkle icon or blue selected-row styling.

The owner Analytics page must use the same Editorial Monochrome dashboard shell and dense document-management rhythm, including the shared searchable top bar, flat metric strips, fine dividers, compact controls, and oxblood-only emphasis. Keep an owner-only sign-in directory that clearly identifies the account name, email, Google versus email/password method, and Firebase last sign-in time; do not add this identity data to anonymous product analytics events.

Before finishing any implementation change in this prototype, commit the scoped work and push it to the configured GitHub branch so the connected live deployment can update.

The dashboard All tools action stays inside the PDFEnrich app shell at `/app/tools`. Keep the persistent navigation rail and shared tool search, but use a bright, easy-to-scan catalog inspired by Smallpdf: white three-column tool cards on a powder-blue canvas, clearly color-coded tool icons, a prominent Popular tools section, compact category chips, and grouped More tools below. Favor clear visual scanning over dense neutral list rows.

On the Bright Editorial Desk dashboard, recent-document cards must render a real first-page thumbnail from the saved PDF whenever source bytes are available, including after a reload. Empty blank documents should still read as real white pages rather than generic placeholder tiles. Use clean DM Sans for the welcome greeting and keep document-type markers neutral; do not restore the red PDF file badge.

Documents and owner Analytics use the same Editorial Monochrome app shell as Home and All tools. Documents uses a flat compact library with neutral rows and oxblood actions; Analytics uses a dense neutral metric ledger and square divided report sections. Do not restore blue upload buttons, colorful metric tiles, rounded SaaS cards, or shadow-heavy panels on either route.

Authentication and lazy-loading transitions use PDFEnrich’s DM Sans and Funnel Display typography, the blue document mark, concise status copy, a compact centered white card, and reduced-motion-safe progress. Do not use condensed display fonts, tiny all-caps brand pills, or vague filler copy on loading screens.

The selected July 29, 2026 route-error redesign is Quiet Editorial Recovery (ideation option 3), with `work/design-references/route-error-quiet-editorial-selected-2026-07-29.png` as its visual source. Replace the generic centered error card with a full white editorial page: compact official PDFEnrich wordmark and hairline header, “The page paused. Your PDF didn’t.” recovery copy, one blue reload action, quiet PDF tools and Home links, and the saved-document illustration in `runtime-public/error-state/quiet-editorial-recovery.png`. Preserve document-safety reassurance, functional recovery actions, responsive mobile composition, and accessible focus states.

The selected August 1, 2026 Login-to-Dashboard loading redesign, with `work/design-references/auth-loading-minimal-selected-2026-08-01.png` as its source, supersedes Seamless Desk Reveal: use a pure-white full viewport with only the small official blue PDFEnrich document mark and a thin 72px progress line, centered precisely as one group on desktop and mobile. Show no visible heading, wordmark, status copy, progress label, dashboard preview, card, or decorative artwork. Retain an accessible nonvisual status label and a static half-filled reduced-motion fallback.

The login screen should feel professional and document-first: use a restrained workspace preview, calm navy/blue surfaces, clear sign-in hierarchy, and explicit browser-processing reassurance. Avoid playful handwritten type, cloud imagery, or oversized promotional visuals in authentication.

Keep the authentication layout inspired by a classic centered sign-in card: obvious email/password hierarchy, one restrained social sign-in option, generous breathing room, and an original PDFEnrich document-workspace panel rather than copying another PDF product's branding or decoration.

Match authentication to the selected Editorial Monochrome dashboard: white and neutral-gray surfaces, charcoal copy, oxblood primary actions, fine dividers, square restrained radii, compact DM Sans UI, and a serif page title. When Firebase is unavailable in the local prototype, email authentication must fall back to an explicit browser-local session instead of disabling the form.

The selected July 23, 2026 authentication reference is a minimal, borderless sign-in page: one narrow 400px column on white, a dark navy `Sign In` heading and primary button, one Google sign-in button, a compact `OR USE YOUR EMAIL` divider, icon-led email and password fields, an underlined forgot-password action, and a centered PDFEnrich sign-up prompt. Do not restore the split product-preview panel, card shell, extra provider buttons, security copy, or promotional authentication content.

The homepage ending must stay clean, bright, and utility-led: remove the redundant final upload CTA, use a slim three-item reassurance row, then a crisp white multi-column footer with hairline dividers, compact PDFEnrich branding, and restrained blue accents. Never restore the dark footer, oversized wordmark billboard, or a pastel promotional container at the end of the page.

PDFEnrich competitor pages keep the existing PDFEnrich comparison UI, but their information architecture must be decision-complete: a dated at-a-glance table, specific reasons to choose PDFEnrich, a separate plans-and-access comparison, competitor-specific FAQs, an honest limitation section, a try-it-yourself CTA, official sources, and links to the other comparison pages. Do not copy a competitor's visual design or marketing language.

Keep comparisons discoverable from the homepage navigation, homepage content, and public footer. Long comparison articles use a compact sticky on-page navigator for overview, features, pricing, FAQ, and sources, and all public comparison pages use the official cropped PDFEnrich logo treatment. The first-visit privacy choice prompt must preserve equally clear accept and reject actions without covering the homepage upload message or consuming a large part of a mobile viewport.

Legal and policy pages must feel native to the PDFEnrich public site rather than like a separate corporate microsite. Reuse the bright white canvas, compact DM Sans typography, restrained powder-blue and blush glow, familiar content widths, simple cards, and airy section rhythm from the homepage and About page. Keep detailed legal copy readable and complete without oversized legal-portal typography, dense data-dashboard styling, or competing decorative treatments.

The Draw tool opens one compact floating settings bar below the primary toolbar. It must expose direct black, blue, red, orange, green, and purple choices, a working custom color picker, five readable pen-size presets, and a fine-size slider without clipping, overlapping, or duplicating controls elsewhere in the same bar.

While Draw is active, newly completed strokes must remain unselected so transform handles never interrupt handwriting between pen strokes. Existing strokes remain movable only after switching away from Draw.

The Translate PDF workflow must let users choose the document's source language and must include English as a translation target. Do not assume every uploaded document starts in English, and never allow the source and target language to remain identical.

Every editor Print control must print the generated edited PDF itself, never the surrounding editor interface, toolbars, sidebars, or browser page chrome.

Signed-export review must never rely on an iframe or a browser PDF plugin. Render the exported bytes with PDF.js canvas pages and provide working page navigation, zoom, explicit loading, page-level retry, and a retained verified-download action.

If an editor PDF page renderer is released or fails, rebuild it from the saved source bytes and give the user an explicit page-level retry. A PDF page must never silently disappear or remain as an endless blank loading surface.

Compress PDF must support honest lossless, balanced, and maximum-reduction modes, show measured before/after size and a visual comparison, keep batch results downloadable together, and never present a larger output as a successful compression.

Compression results must retain their generated bytes so users can download an individual result or the completed batch ZIP again without recompressing. When an attempted output is larger, show the measured original and attempted sizes, label it as kept original, and never include it in downloads. Validate page count before releasing any compressed copy, and give first-page comparison failures an explicit Retry preview action.

The July 29, 2026 dashboard reference `ChatGPT Image Jul 29, 2026, 03_19_44 PM.png` supersedes the earlier Bright Editorial Desk treatment for the Home dashboard. Use its clean white app shell, centered search, PDFEnrich-blue Upload PDF action, compact colorful quick-action row, dense recent-document ledger, and restrained right-weighted document artwork. Adapt mobile deliberately with a compact header, labeled upload action, two-column quick actions, and a single-column document list; never use clipped horizontal desktop grids. Keep all dashboard content grounded in real PDFEnrich tools and saved-document data rather than fake AI, storage, upgrade, or activity claims.

The editor Finish action opens a post-edit download chooser instead of immediately leaving the editor. Use a compact two-column desktop dialog and a touch-friendly mobile bottom sheet with PDF recommended by default and real PDF, PNG, Word, Excel, JPG, and PowerPoint exports. Multi-page image exports must include every page in a ZIP, conversion progress and errors must stay visible, and completing a download must not force the user away from the editor.
