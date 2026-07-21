import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;
const corruptedPdf = { name: "corrupted.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a valid PDF") };

test("core tools reject malformed PDFs and remain ready for a replacement", async ({ page }) => {
  for (const route of ["/merge-pdf", "/pdf-to-word", "/pdf-to-jpg"]) {
    await page.goto(appPath(route));
    await page.locator('input[type="file"]').first().setInputFiles(corruptedPdf);
    await expect(page.getByRole("alert")).toContainText(/corrupted|incomplete|could not read/i);
    await expect(page.getByRole("button", { name: /Choose/ }).first()).toBeEnabled();
  }
});

test("PDF to Word sends image-only documents to visual fidelity or OCR", async ({ page }) => {
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  await page.goto(appPath("/pdf-to-word"));
  await page.locator('input[type="file"]').setInputFiles({ name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.from(await document.save()) });
  await expect(page.getByText(/0 text lines found/)).toBeVisible();
  await page.getByRole("button", { name: "Download DOCX" }).click();
  await expect(page.getByRole("alert")).toContainText(/Visual fidelity.*OCR/i);
  await page.getByLabel("Conversion mode").selectOption("visual");
  await expect(page.getByRole("button", { name: "Download DOCX" })).toBeEnabled();
});
