import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

const appPath = (path) => process.env.GITHUB_ACTIONS === "true" ? `/dochub-2-0${path}` : path;

async function blankGeneratedFieldsPdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("Name", { x: 50, y: 706, size: 12, font });
  const generated = pdf.getForm().createTextField("text_19lxvc");
  generated.addToPage(page, { x: 95, y: 694, width: 250, height: 24, font });
  const meaningful = pdf.getForm().createTextField("email_address");
  meaningful.addToPage(page, { x: 95, y: 650, width: 250, height: 24, font });
  return Buffer.from(await pdf.save());
}

test("empty native PDF fields never display their internal identifiers", async ({ page }) => {
  await page.goto(appPath("/edit-pdf"));
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "blank-agreement.pdf",
    mimeType: "application/pdf",
    buffer: await blankGeneratedFieldsPdf(),
  });

  const generatedField = page.getByLabel("text_19lxvc");
  const meaningfulField = page.getByLabel("email_address");
  await expect(generatedField).toBeVisible();
  await expect(generatedField).toHaveValue("");
  await expect(generatedField).toHaveAttribute("placeholder", "");
  await expect(meaningfulField).toHaveValue("");
  await expect(meaningfulField).toHaveAttribute("placeholder", "");
  await expect(page.getByText("text_19lxvc", { exact: true })).toHaveCount(0);

  await generatedField.fill("Intern Name");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  const exported = await PDFDocument.load(await readFile(await download.path()));
  expect(exported.getForm().getTextField("text_19lxvc").getText()).toBe("Intern Name");
});
