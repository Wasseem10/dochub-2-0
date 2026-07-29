import IconAlignCenter from "@tabler/icons-react/dist/esm/icons/IconAlignCenter.mjs";
import IconArrowsMinimize from "@tabler/icons-react/dist/esm/icons/IconArrowsMinimize.mjs";
import IconChecklist from "@tabler/icons-react/dist/esm/icons/IconChecklist.mjs";
import IconFile from "@tabler/icons-react/dist/esm/icons/IconFile.mjs";
import IconFiles from "@tabler/icons-react/dist/esm/icons/IconFiles.mjs";
import IconLayoutGrid from "@tabler/icons-react/dist/esm/icons/IconLayoutGrid.mjs";
import IconLock from "@tabler/icons-react/dist/esm/icons/IconLock.mjs";
import IconMinus from "@tabler/icons-react/dist/esm/icons/IconMinus.mjs";
import IconPencil from "@tabler/icons-react/dist/esm/icons/IconPencil.mjs";
import IconPlus from "@tabler/icons-react/dist/esm/icons/IconPlus.mjs";
import IconRefresh from "@tabler/icons-react/dist/esm/icons/IconRefresh.mjs";
import IconScan from "@tabler/icons-react/dist/esm/icons/IconScan.mjs";
import IconScissors from "@tabler/icons-react/dist/esm/icons/IconScissors.mjs";
import IconSignature from "@tabler/icons-react/dist/esm/icons/IconSignature.mjs";

export const PROFESSIONAL_TOOL_ICONS = {
  "merge-pdf": { Base: IconFiles, Command: IconPlus },
  "compress-pdf": { Base: IconFile, Command: IconArrowsMinimize },
  "edit-pdf": { Base: IconFile, Command: IconPencil },
  "pdf-to-word": { Base: IconFile, Command: IconRefresh },
  "split-pdf": { Base: IconFile, Command: IconScissors },
  "sign-pdf": { Base: IconFile, Command: IconSignature, Accent: IconMinus },
  "fill-pdf": { Base: IconFile, Command: IconChecklist },
  "organize-pdf": { Base: IconFile, Command: IconLayoutGrid },
  "ocr-pdf": { Base: IconScan, Command: IconAlignCenter },
  "protect-pdf": { Base: IconFile, Command: IconLock },
};

const iconProps = {
  "aria-hidden": "true",
  focusable: "false",
  stroke: 0.65,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function ProfessionalToolIcon({ toolId }) {
  const icon = PROFESSIONAL_TOOL_ICONS[toolId] || PROFESSIONAL_TOOL_ICONS["edit-pdf"];
  const { Base, Command, Accent } = icon;

  return (
    <span className={`professional-tool-glyph is-${toolId}`} data-tool-icon={toolId} aria-hidden="true">
      <Base {...iconProps} className="professional-tool-glyph__base" />
      <Command {...iconProps} className="professional-tool-glyph__command" />
      {Accent ? <Accent {...iconProps} className="professional-tool-glyph__accent" /> : null}
    </span>
  );
}
