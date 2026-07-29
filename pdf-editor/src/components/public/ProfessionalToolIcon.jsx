import IconFileArrowRight from "@tabler/icons-react/dist/esm/icons/IconFileArrowRight.mjs";
import IconFileCheck from "@tabler/icons-react/dist/esm/icons/IconFileCheck.mjs";
import IconFilePencil from "@tabler/icons-react/dist/esm/icons/IconFilePencil.mjs";
import IconFileScissors from "@tabler/icons-react/dist/esm/icons/IconFileScissors.mjs";
import IconFileSearch from "@tabler/icons-react/dist/esm/icons/IconFileSearch.mjs";
import IconFileSpreadsheet from "@tabler/icons-react/dist/esm/icons/IconFileSpreadsheet.mjs";
import IconFileTextShield from "@tabler/icons-react/dist/esm/icons/IconFileTextShield.mjs";
import IconFileZip from "@tabler/icons-react/dist/esm/icons/IconFileZip.mjs";
import IconFiles from "@tabler/icons-react/dist/esm/icons/IconFiles.mjs";
import IconSignature from "@tabler/icons-react/dist/esm/icons/IconSignature.mjs";

export const PROFESSIONAL_TOOL_ICONS = {
  "merge-pdf": IconFiles,
  "compress-pdf": IconFileZip,
  "edit-pdf": IconFilePencil,
  "pdf-to-word": IconFileArrowRight,
  "split-pdf": IconFileScissors,
  "sign-pdf": IconSignature,
  "fill-pdf": IconFileCheck,
  "organize-pdf": IconFileSpreadsheet,
  "ocr-pdf": IconFileSearch,
  "protect-pdf": IconFileTextShield,
};

export function ProfessionalToolIcon({ toolId, size = 64 }) {
  const Icon = PROFESSIONAL_TOOL_ICONS[toolId] || IconFileArrowRight;

  return (
    <Icon
      aria-hidden="true"
      data-tool-icon={toolId}
      size={size}
      stroke={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
