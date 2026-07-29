export const PROFESSIONAL_TOOL_ICONS = {
  "merge-pdf": "/tool-icons/merge-pdf.png",
  "compress-pdf": "/tool-icons/compress-pdf.png",
  "edit-pdf": "/tool-icons/edit-pdf.png",
  "pdf-to-word": "/tool-icons/convert-pdf.png",
  "split-pdf": "/tool-icons/split-pdf.png",
  "sign-pdf": "/tool-icons/sign-pdf.png",
  "fill-pdf": "/tool-icons/fill-pdf.png",
  "organize-pdf": "/tool-icons/organize-pdf.png",
  "ocr-pdf": "/tool-icons/ocr-pdf.png",
  "protect-pdf": "/tool-icons/protect-pdf.png",
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
      draggable="false"
      data-tool-icon={toolId}
      aria-hidden="true"
    />
  );
}
