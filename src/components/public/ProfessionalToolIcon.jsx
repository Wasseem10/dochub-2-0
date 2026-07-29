export const PROFESSIONAL_TOOL_ICONS = {
  "merge-pdf": "/tool-illustrations/merge-pdf.png",
  "compress-pdf": "/tool-illustrations/compress-pdf.png",
  "edit-pdf": "/tool-illustrations/edit-pdf.png",
  "pdf-to-word": "/tool-illustrations/convert-pdf.png",
  "split-pdf": "/tool-illustrations/split-pdf.png",
  "sign-pdf": "/tool-illustrations/sign-pdf.png",
  "fill-pdf": "/tool-illustrations/fill-pdf.png",
  "organize-pdf": "/tool-illustrations/organize-pdf.png",
  "ocr-pdf": "/tool-illustrations/ocr-pdf.png",
  "protect-pdf": "/tool-illustrations/protect-pdf.png",
};

export function ProfessionalToolIcon({ toolId }) {
  const source = PROFESSIONAL_TOOL_ICONS[toolId] || PROFESSIONAL_TOOL_ICONS["edit-pdf"];

  return (
    <img
      className="professional-tool-glyph"
      src={source}
      alt=""
      width="150"
      height="150"
      loading="lazy"
      decoding="async"
      draggable="false"
      data-tool-icon={toolId}
      aria-hidden="true"
    />
  );
}
