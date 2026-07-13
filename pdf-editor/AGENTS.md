# Prototype Instructions

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

For the editor page rail, use a narrow 144px white thumbnail sidebar with compact 72px portrait previews, no cropping or stretching, a dark rounded selected outline, bare gray page numbers, and a four-button footer ordered trash, clockwise rotate, add page, then download. The top-left list button must toggle this rail and must not navigate to the dashboard.

The product name is RealPDF. The landing hero’s right column must remain a functional PDF drag-and-drop upload zone; the supplied upload screenshot is an interaction/anatomy example, while the visual treatment must use the site’s own green, mint, cream, rounded-card design language. Selecting or dropping a PDF should open the editor without first forcing authentication.

The dashboard must feel like the same product as the landing site: reuse the site's RealPDF branding, Funnel Display/DM Sans typography, blue-and-white palette, compact rounded controls, soft blue panels, and restrained borders rather than introducing a separate dashboard aesthetic.

The dashboard's current visual source of truth is the red RealPDF workspace layout: a full-height labeled left rail, compact search/action header, welcome panel with five quick actions, four KPI cards, a five-row recent-document table, and a stacked activity/templates/premium/tip right rail. Preserve those major proportions and keep the dense desktop view fully visible at common 16:9 sizes.

The PDF editor must prioritize the document and reliable editing actions. Keep unfinished or informational features out of the primary toolbar, expose Save and Download clearly, provide visible active-tool guidance, use labeled and correctly disabled page controls, and preserve a compact 144px thumbnail rail with 72px portrait previews.

App navigation must stay inside the product: the dashboard needs a visible return path to the landing page, and browser Back must move editor → dashboard → landing without leaving the site. Save the active document before leaving the editor.

The editor's 100% zoom must render at a comfortable working size, using an `EDITOR_PAGE_SCALE` of 0.88 so the PDF is larger than the old fit-to-window treatment while annotation coordinates remain aligned.

The bottom zoom selector must reserve enough width and right padding for both the full percentage label (including `%`) and the native dropdown arrow at every supported zoom value.
