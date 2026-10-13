import { createXlsxFromPdfPages } from "../../src/tools/structuredPdfConversion.js";

export const longCellNotes = `${"Café — résumé €42 with complete review notes. ".repeat(80)}END OF NOTES`;
export const longCellReference = `REFERENCE-${"1234567890".repeat(55)}-END`;

export function longCellsXlsx() {
  return createXlsxFromPdfPages([{ name: "Review", rows: [
    ["Notes", "Reference"],
    [longCellNotes, longCellReference],
    ["Last row", "REF 00042"],
  ] }]);
}
