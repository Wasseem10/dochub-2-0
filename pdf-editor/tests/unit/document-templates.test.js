import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  calculateInvoiceTotals,
  createTemplatePdf,
  initialTemplateValues,
  TEMPLATE_DEFINITIONS,
  validateTemplate,
} from "../../src/tools/documentTemplates.js";

describe("document templates", () => {
  it("calculates invoice quantities, tax, and total without floating point drift", () => {
    const totals = calculateInvoiceTotals([
      { description: "Work", quantity: "2.5", rate: "19.99" },
      { description: "Parts", quantity: "3", rate: "4.20" },
    ], "8.25");
    expect(totals.items.map((item) => item.amount)).toEqual([49.98, 12.6]);
    expect(totals).toMatchObject({ subtotal: 62.58, tax: 5.16, total: 67.74 });
  });

  it("validates required fields and usable invoice line items", () => {
    const values = initialTemplateValues("invoice-templates");
    expect(validateTemplate("invoice-templates", { ...values, clientName: "" }, TEMPLATE_DEFINITIONS["invoice-templates"].items)).toContain("bill to");
    expect(validateTemplate("invoice-templates", values, [{ description: "", quantity: "0", rate: "0" }])).toContain("line item");
    expect(validateTemplate("invoice-templates", values, TEMPLATE_DEFINITIONS["invoice-templates"].items)).toBe("");
  });

  it.each(Object.keys(TEMPLATE_DEFINITIONS))("creates a valid searchable %s PDF", async (templateId) => {
    const definition = TEMPLATE_DEFINITIONS[templateId];
    const bytes = await createTemplatePdf(templateId, initialTemplateValues(templateId), { items: definition.items || [] });
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getTitle()).toBeTruthy();
    expect(pdf.getCreator()).toContain("PDFArrow");
  });
});
