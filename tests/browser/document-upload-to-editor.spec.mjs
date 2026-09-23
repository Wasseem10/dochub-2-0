import { expect, test } from "@playwright/test";
import { Document, Packer, Paragraph } from "docx";
import { PDFDocument } from "pdf-lib";

async function dropDocument(page, { name, mimeType, buffer }) {
  await page.locator(".freepdf-dropzone").evaluate((target, file) => {
    const bytes = Uint8Array.from(atob(file.base64), (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], file.name, { type: file.mimeType }));
    target.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: transfer }));
    target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, { name, mimeType, base64: buffer.toString("base64") });
}

test("homepage drops open PDFs and supported text documents in the editor", async ({ page }) => {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const files = [
    { name: "direct.pdf", mimeType: "application/pdf", buffer: Buffer.from(await pdf.save()) },
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("A document opened from the homepage drop zone.") },
  ];

  for (const file of files) {
    await page.goto("/");
    await dropDocument(page, file);
    await expect(page).toHaveURL(/\/edit-pdf\?[^#]*document=/);
    await expect(page.locator(".editor-shell")).toBeVisible();
    await expect(page.locator('.page-surface[data-page-index="0"] .pdf-image')).toBeVisible();
  }
});

test("dashboard Upload document opens a supported non-PDF file in the editor", async ({ page }) => {
  await page.goto("/app/dashboard");
  await expect(page.locator(".dashboard-top-upload")).toContainText("Upload document");
  await page.locator(".dashboard-top-upload").click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "dashboard-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("A document opened from the dashboard."),
  });
  await expect(page).toHaveURL(/\/app\/editor\/[^/]+/);
  await expect(page.locator(".editor-shell")).toBeVisible();
  await expect(page.locator('.page-surface[data-page-index="0"] .pdf-image')).toBeVisible();
});

test("homepage Word document drop opens the converted document in the editor", async ({ page }) => {
  const document = new Document({ sections: [{ children: [new Paragraph("Word document opened from the homepage.")] }] });
  await page.goto("/");
  await dropDocument(page, {
    name: "proposal.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await Packer.toBuffer(document),
  });
  await expect(page).toHaveURL(/\/edit-pdf\?[^#]*document=/);
  await expect(page.locator(".editor-shell")).toBeVisible();
  await expect(page.locator('.page-surface[data-page-index="0"] .pdf-image')).toBeVisible();
});
