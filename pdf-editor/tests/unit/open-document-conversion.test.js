import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import {
  convertOpenDocumentToPdf,
  parseEpubText,
  parseOdpSlides,
  parseOdsWorkbook,
  parseOdtText,
  parseRtfText,
} from "../../src/tools/openDocumentConversion.js";

const odf = (content) => zipSync({ "content.xml": strToU8(content) });

describe("open document conversion", () => {
  it("extracts RTF paragraphs, encoded punctuation, and Unicode", () => {
    const text = parseRtfText(String.raw`{\rtf1\ansi{\fonttbl{\f0 Arial;}}Quarterly \b report\b0\par Total: \'a342,000\par Unicode \u10003?}`);
    expect(text).toContain("Quarterly report");
    expect(text).toContain("£42,000");
    expect(text).toContain("✓");
  });

  it("reads ODT text, ODS cells, and ODP slide order", () => {
    expect(parseOdtText(odf(`<office:document><text:p>Local contract</text:p><text:p>Total &amp; tax</text:p></office:document>`))).toContain("Total & tax");
    const workbook = parseOdsWorkbook(odf(`<office:document><table:table table:name="Revenue"><table:table-row><table:table-cell><text:p>Quarter</text:p></table:table-cell><table:table-cell><text:p>Total</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell><text:p>Q1</text:p></table:table-cell><table:table-cell office:value="42000"/></table:table-row></table:table></office:document>`));
    expect(workbook.sheets[0]).toEqual({ name: "Revenue", rows: [["Quarter", "Total"], ["Q1", "42000"]] });
    const slides = parseOdpSlides(odf(`<office:document><draw:page draw:name="Opening"><text:p>Launch plan</text:p></draw:page><draw:page draw:name="Results"><text:p>Ready</text:p></draw:page></office:document>`));
    expect(slides.map((slide) => slide.title)).toEqual(["Opening", "Results"]);
  });

  it("follows the EPUB spine and builds valid PDF outputs", async () => {
    const epub = zipSync({
      "META-INF/container.xml": strToU8(`<container><rootfile full-path="OEBPS/package.opf"/></container>`),
      "OEBPS/package.opf": strToU8(`<package><manifest><item id="one" href="one.xhtml"/><item id="two" href="two.xhtml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>`),
      "OEBPS/one.xhtml": strToU8(`<html><body><h1>First chapter</h1><p>Alpha</p></body></html>`),
      "OEBPS/two.xhtml": strToU8(`<html><body><h1>Second chapter</h1><p>Beta</p></body></html>`),
    });
    expect(parseEpubText(epub)).toMatch(/First chapter[\s\S]*Second chapter/);
    const pdf = await convertOpenDocumentToPdf("epub-to-pdf", epub, { title: "Book" });
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(0);
  });

  it("combines supported ZIP entries in one PDF", async () => {
    const zip = zipSync({ "01-intro.txt": strToU8("Introduction"), "02-details.rtf": strToU8(String.raw`{\rtf1 Details}`), "ignore.bin": Uint8Array.of(1, 2, 3) });
    const pdf = await convertOpenDocumentToPdf("zip-to-pdf", zip, { title: "Packet" });
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(2);
  });
});
