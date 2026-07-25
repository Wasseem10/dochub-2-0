import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function workflowPdf(label) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([612, 792]);
  page.drawText(label, { x: 72, y: 680, size: 24, font });
  return Buffer.from(await document.save());
}

test("Share PDF explains the account boundary and exposes the secure-link action after upload", async ({ page }) => {
  await page.goto(appPath("/share-pdf"));
  await expect(page.getByText("Sign in required to create a link")).toBeVisible();

  await page.locator('input[type="file"]').first().setInputFiles({
    name: "share-workflow.pdf",
    mimeType: "application/pdf",
    buffer: await workflowPdf("SHARE WORKFLOW"),
  });

  await expect(page.getByRole("button", { name: "Share PDF", exact: true })).toBeVisible();
  await expect(page.getByText("Review the document, then choose Share PDF to create a secure link.")).toBeVisible();
});

test("Request Signatures keeps the page editable and lets the user reopen the request dialog", async ({ page }) => {
  await page.goto(appPath("/request-signatures"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "signature-request.pdf",
    mimeType: "application/pdf",
    buffer: await workflowPdf("SIGNATURE REQUEST"),
  });

  await expect(page.getByRole("dialog", { name: "Request signatures" })).toHaveCount(0);
  await expect(page.getByText("Place the required fields, then choose Request signature.")).toBeVisible();

  const surface = page.locator(".page-surface");
  await expect(surface).toBeVisible();
  const surfaceBox = await surface.boundingBox();
  await surface.click({ position: { x: surfaceBox.width * 0.3, y: surfaceBox.height * 0.4 } });
  await expect(page.locator(".annotation.fillable-field")).toHaveCount(1);

  await page.getByRole("button", { name: "Request signature", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Request signatures" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Request signatures" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Request signature", exact: true })).toBeVisible();
});

test("Request Signatures exposes every required recipient field as a direct toolbar action", async ({ page }) => {
  await page.goto(appPath("/request-signatures"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "signature-fields.pdf",
    mimeType: "application/pdf",
    buffer: await workflowPdf("SIGNATURE FIELD TYPES"),
  });

  const surface = page.locator(".page-surface");
  await expect(surface).toBeVisible();
  const surfaceBox = await surface.boundingBox();
  const fieldButtons = [
    ["Signature", "Signature", 0.2],
    ["Initials", "Initials", 0.32],
    ["Date", "Date", 0.44],
    ["Text", "Text field", 0.56],
    ["Checkbox", "Checkbox", 0.68],
  ];

  for (const [buttonName, fieldLabel, yRatio] of fieldButtons) {
    await page.getByRole("button", { name: buttonName, exact: true }).click();
    await surface.click({ position: { x: surfaceBox.width * 0.28, y: surfaceBox.height * yRatio } });
    const fieldSelector = fieldLabel === "Checkbox"
      ? `.annotation.checkbox-field[aria-label="${fieldLabel}"]`
      : `.annotation.fillable-field input[aria-label="${fieldLabel}"]`;
    await expect(page.locator(fieldSelector)).toHaveCount(1);
  }

  await expect(page.locator(".annotation.fillable-field")).toHaveCount(4);
  await expect(page.locator(".annotation.checkbox-field")).toHaveCount(1);
});
