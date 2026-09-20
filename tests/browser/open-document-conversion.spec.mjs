import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { strToU8, zipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function convert(page, route, file) {
  await page.goto(appPath(route));
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByText(/ready for conversion/)).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await pending;
  return { download, pdf: await PDFDocument.load(await readFile(await download.path())) };
}

test("RTF becomes a readable PDF", async ({ page }) => {
  const result = await convert(page, "/rtf-to-pdf", { name: "report.rtf", mimeType: "application/rtf", buffer: Buffer.from(String.raw`{\rtf1\ansi Quarterly report\par Total 42000}`) });
  expect(result.download.suggestedFilename()).toBe("report.pdf");
  expect(result.pdf.getPageCount()).toBe(1);
});

test("ZIP combines supported documents into one PDF", async ({ page }) => {
  const archive = zipSync({ "01-cover.txt": strToU8("Cover page"), "02-notes.rtf": strToU8(String.raw`{\rtf1 Notes page}`) });
  const result = await convert(page, "/zip-to-pdf", { name: "packet.zip", mimeType: "application/zip", buffer: Buffer.from(archive) });
  expect(result.download.suggestedFilename()).toBe("packet.pdf");
  expect(result.pdf.getPageCount()).toBe(2);
});

test("ODT, ODS, ODP, and EPUB each complete their released browser workflow", async ({ page }) => {
  const fixtures = [
    {
      route: "/odt-to-pdf",
      file: { name: "contract.odt", mimeType: "application/vnd.oasis.opendocument.text", buffer: Buffer.from(zipSync({ "content.xml": strToU8(`<office:document><text:h>Service agreement</text:h><text:p>Payment due in 30 days.</text:p></office:document>`) })) },
      pages: 1,
    },
    {
      route: "/ods-to-pdf",
      file: { name: "revenue.ods", mimeType: "application/vnd.oasis.opendocument.spreadsheet", buffer: Buffer.from(zipSync({ "content.xml": strToU8(`<office:document><table:table table:name="Revenue"><table:table-row><table:table-cell><text:p>Quarter</text:p></table:table-cell><table:table-cell><text:p>Total</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell><text:p>Q1</text:p></table:table-cell><table:table-cell office:value="42000"/></table:table-row></table:table></office:document>`) })) },
      pages: 1,
    },
    {
      route: "/odp-to-pdf",
      file: { name: "launch.odp", mimeType: "application/vnd.oasis.opendocument.presentation", buffer: Buffer.from(zipSync({ "content.xml": strToU8(`<office:document><draw:page draw:name="Opening"><text:p>Launch plan</text:p></draw:page><draw:page draw:name="Results"><text:p>Production ready</text:p></draw:page></office:document>`) })) },
      pages: 2,
    },
    {
      route: "/epub-to-pdf",
      file: { name: "guide.epub", mimeType: "application/epub+zip", buffer: Buffer.from(zipSync({
        "META-INF/container.xml": strToU8(`<container><rootfile full-path="OEBPS/package.opf"/></container>`),
        "OEBPS/package.opf": strToU8(`<package><manifest><item id="one" href="one.xhtml"/></manifest><spine><itemref idref="one"/></spine></package>`),
        "OEBPS/one.xhtml": strToU8(`<html><body><h1>Browser guide</h1><p>Private conversion.</p></body></html>`),
      })) },
      pages: 1,
    },
  ];

  for (const fixture of fixtures) {
    const result = await convert(page, fixture.route, fixture.file);
    expect(result.download.suggestedFilename()).toBe(fixture.file.name.replace(/\.[^.]+$/, ".pdf"));
    expect(result.pdf.getPageCount()).toBe(fixture.pages);
  }
});
