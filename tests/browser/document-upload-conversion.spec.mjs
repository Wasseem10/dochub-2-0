import { expect, test } from "@playwright/test";
import { createXlsxFromPdfPages } from "../../src/tools/structuredPdfConversion.js";

const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

test("HTML, XLSX, and PNG uploads open their converted pages in the editor", async ({ page }) => {
  const files = [
    {
      name: "draft.html",
      mimeType: "text/html",
      buffer: Buffer.from("<!doctype html><html><body><h1>A browser document</h1><p>Ready for editing.</p></body></html>"),
    },
    {
      name: "revenue.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(createXlsxFromPdfPages([{ name: "Revenue", rows: [["Quarter", "Total"], ["Q1", "42000"]] }])),
    },
    { name: "graphic.png", mimeType: "image/png", buffer: tinyPng },
  ];

  for (const file of files) {
    await page.goto("/");
    await page.locator(".freepdf-page > input[type='file']").setInputFiles(file);
    await expect(page).toHaveURL(/\/edit-pdf\?[^#]*document=/);
    await expect(page.locator(".editor-shell")).toBeVisible();
    await expect(page.locator('.page-surface[data-page-index="0"] .pdf-image')).toBeVisible();
  }
});
