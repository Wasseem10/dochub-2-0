# Prototype Instructions

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

For the editor page rail, use a narrow 144px white thumbnail sidebar with compact 72px portrait previews, no cropping or stretching, a dark rounded selected outline, bare gray page numbers, and a four-button footer ordered trash, clockwise rotate, add page, then download. The top-left list button must toggle this rail and must not navigate to the dashboard.

The product name is FixThatPDF. The landing hero’s right column must remain a functional PDF drag-and-drop upload zone. Selecting or dropping a PDF should open the editor without first forcing authentication.

The homepage hero uses the selected July 22, 2026 Paper Workspace direction: a warm-white background with very subtle cropped document forms and thin blue workflow lines with restrained orange accents, never photographic clouds or sky. The entire visible “Drop your PDF here” panel must open the native PDF file picker by mouse, touch, Enter, or Space while preserving drag-and-drop upload.

The desktop editor’s post-upload screen must follow the July 16, 2026 PDF Help editor screenshot as its interaction and layout reference while preserving FixThatPDF branding and original implementation. Use a clean document header, one horizontal primary toolbar with direct access to Thumbnails, Undo, Redo, Add Text, Edit Text, Sign, Arrow/shapes, Draw, Erase, Highlight, Text Highlight, Image, Stamp, Link, Note, Search, and Manage Pages, a toggleable white thumbnail rail, and a centered continuous document canvas. Do not restore the older six-mode left rail or contextual mode ribbon. Selected objects use one blue normalized transform model with eight resize handles, a rotation handle, keyboard deletion, and undo/redo; text boxes enter editing immediately, save on blur, and discard abandoned empty boxes. Every visible primary toolbar control must perform a real workflow; do not add disabled “coming soon” controls.

The primary desktop editor toolbar is a floating white rounded card on the light workspace, with compact icon-over-label buttons, subtle group dividers, soft shadow, and a pale FixThatPDF-blue active state. Keep the control density and grouping aligned with the July 17, 2026 toolbar reference while retaining only working FixThatPDF actions.

The floating bottom zoom and page navigator follows the selected July 17, 2026 compact rail concept: one low-profile white capsule, borderless Lucide controls, a bordered zoom select, a pale-blue current-page field, one subtle divider, and restrained shadow. Keep zoom out/in, zoom preset, first/previous/next/last page, current page, and total page count functional and aligned.

New text boxes must open at a readable minimum size, auto-grow while typing, use Arial as the dependable default PDF font, save on blur, and keep one shared blue selection model with eight resize handles, rotation, keyboard nudging, deletion, and history. The contextual text bar must use clear labels and only operational font/style controls.

Manage Pages expands the persistent thumbnail rail into a labeled organizer with insert, duplicate, rotate, delete, drag reorder, keyboard reorder, and per-page quick actions. Signature and initials dialogs must disable empty saves and expose labeled controls and a typed keyboard-accessible alternative to drawing.

Every released PDF tool must have its own simple landing page using the current landing page as its visual source of truth: DM Sans hero typography, blue `#2851eb` actions, white and powder-blue surfaces, and compact type. Keep one centered upload card as the dominant action. Do not use green, mint, or cream on tool landing pages. Secondary settings and explanatory content must not compete with the upload action before a file is chosen.

The editor’s FixThatPDF wordmark is a labeled button that returns to `/app/dashboard`. The dashboard remains available to anonymous local users; account-only sections may still request sign-in. Keep the dashboard deliberately simple: blue FixThatPDF branding, a short upload-or-blank hero, three essential task choices, recent documents, restrained navigation, and no promotional side rail, statistics wall, fake folder creation, or competing AI/template/activity cards on the home screen.

Authentication and lazy-loading transitions use FixThatPDF’s DM Sans and Funnel Display typography, the blue document mark, concise status copy, a compact centered white card, and reduced-motion-safe progress. Do not use condensed display fonts, tiny all-caps brand pills, or vague filler copy on loading screens.

The Draw tool opens one compact floating settings bar below the primary toolbar. It must expose direct black, blue, red, orange, green, and purple choices, a working custom color picker, five readable pen-size presets, and a fine-size slider without clipping, overlapping, or duplicating controls elsewhere in the same bar.
