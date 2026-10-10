import { strToU8, zipSync } from "fflate";

const escapeXml = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** Synthetic workbook with real numeric values and explicit Excel display styles. */
export function formattedXlsx({ date1904 = false, currency = "€", currencyFormat } = {}) {
  const format = currencyFormat ?? `"${currency}"#,##0.00;[Red]("${currency}"#,##0.00)`;
  const rows = [
    '<row r="1"><c r="A1" t="inlineStr"><is><t>Item</t></is></c><c r="B1" t="inlineStr"><is><t>Value</t></is></c></row>',
    ...[
      ["Date", `<c s="1"><v>${date1904 ? 43830 : 45292}</v></c>`],
      ["Time", '<c s="2"><v>0.5</v></c>'],
      ["Percent", '<c s="3"><v>0.125</v></c>'],
      ["Currency", '<c s="4"><v>1234.5</v></c>'],
      ["Negative", '<c s="4"><v>-12.5</v></c>'],
      ["Leading zeros", '<c s="5"><v>42</v></c>'],
      ["Cached formula", '<c s="3"><f>1/4</f><v>0.25</v></c>'],
      ["Literal text", '<c s="4" t="inlineStr"><is><t>00042</t></is></c>'],
      ["Boolean", '<c s="4" t="b"><v>1</v></c>'],
      ["General", '<c><v>42000</v></c>'],
      ["Empty", '<c s="4"><v></v></c>'],
    ].map(([label, cell], index) => `<row r="${index + 2}"><c r="A${index + 2}" t="inlineStr"><is><t>${label}</t></is></c>${cell.replace("<c ", `<c r="B${index + 2}" `).replace("<c>", `<c r="B${index + 2}">`)}</row>`),
  ].join("");
  return zipSync(Object.fromEntries(Object.entries({
    "[Content_Types].xml": '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="${date1904 ? 1 : 0}"/><sheets><sheet name="Résumé" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml": `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="4"><numFmt numFmtId="167" formatCode="000000"/><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="hh:mm"/><numFmt numFmtId="166" formatCode="${escapeXml(format)}"/></numFmts><fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0"/><xf numFmtId="164"/><xf numFmtId="165"/><xf numFmtId="10"/><xf numFmtId="166"/><xf numFmtId="167"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
  }).map(([name, xml]) => [name, strToU8(xml)])));
}

export const formattedValues = ["2024-01-01", "12:00", "12.50%", "€1,234.50", "(€12.50)", "000042", "25.00%", "00042", "TRUE", "42000", ""];
