# Prototype Instructions

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

For the editor page rail, use a narrow 144px white thumbnail sidebar with compact 72px portrait previews, no cropping or stretching, a dark rounded selected outline, bare gray page numbers, and a four-button footer ordered trash, clockwise rotate, add page, then download. The top-left list button must toggle this rail and must not navigate to the dashboard.

The product name is FixThatPDF. The landing hero’s right column must remain a functional PDF drag-and-drop upload zone. Selecting or dropping a PDF should open the editor without first forcing authentication.

The desktop editor’s post-upload screen must follow the July 16, 2026 PDF Help editor screenshot as its interaction and layout reference while preserving FixThatPDF branding and original implementation. Use a clean document header, one horizontal primary toolbar with direct access to Thumbnails, Undo, Redo, Add Text, Edit Text, Sign, Arrow/shapes, Draw, Erase, Highlight, Text Highlight, Image, Stamp, Link, Note, Search, and Manage Pages, a toggleable white thumbnail rail, and a centered continuous document canvas. Do not restore the older six-mode left rail or contextual mode ribbon. Selected objects use one blue normalized transform model with eight resize handles, a rotation handle, keyboard deletion, and undo/redo; text boxes enter editing immediately, save on blur, and discard abandoned empty boxes. Every visible primary toolbar control must perform a real workflow; do not add disabled “coming soon” controls.

Every released PDF tool must have its own simple landing page using the current landing page as its visual source of truth: DM Sans hero typography, blue `#2851eb` actions, white and powder-blue surfaces, and compact type. Keep one centered upload card as the dominant action. Do not use green, mint, or cream on tool landing pages. Secondary settings and explanatory content must not compete with the upload action before a file is chosen.

The dashboa