import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { formattedXlsx } from "./xlsx-number-formats.mjs";

function columnName(index) {
  let name = "";
  for (let value = index; value > 0; value = Math.floor((value - 1) / 26)) name = String.fromCharCode(65 + (value - 1) % 26) + name;
  return name;
}

export function limitsXlsx({ sheets = 1, rows = 1, columns = 1 } = {}) {
  const files = unzipSync(formattedXlsx());
  files["[Content_Types].xml"] = strToU8(strFromU8(files["[Content_Types].xml"]).replace("</Types>", `${Array.from({ length: sheets - 1 }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 2}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`));
  const sheetList = Array.from({ length: sheets }, (_, index) => `<sheet name="Review ${index + 1}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  files["xl/workbook.xml"] = strToU8(strFromU8(files["xl/workbook.xml"]).replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets>${sheetList}</sheets>`));
  files["xl/_rels/workbook.xml.rels"] = strToU8(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Array.from({ length: sheets }, (_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  const content = Array.from({ length: rows }, (_, index) => {
    const row = index + 1;
    const cell = (column, text) => `<c r="${columnName(column)}${row}" t="inlineStr"><is><t>${text}</t></is></c>`;
    return `<row r="${row}">${cell(1, `ROW ${row}`)}${columns > 2 ? cell(columns - 1, "PREVIOUS COLUMN") : ""}${columns > 1 ? cell(columns, "FINAL COLUMN") : ""}</row>`;
  }).join("");
  for (let index = 1; index <= sheets; index += 1) files[`xl/worksheets/sheet${index}.xml`] = strToU8(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${content}</sheetData></worksheet>`);
  return zipSync(files);
}
