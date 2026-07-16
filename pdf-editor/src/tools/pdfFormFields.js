function normalizedRectangle(rect, viewport) {
  if (!Array.isArray(rect) || rect.length !== 4 || !viewport?.width || !viewport?.height) return null;
  const converted = typeof viewport.convertToViewportRectangle === "function"
    ? viewport.convertToViewportRectangle(rect)
    : rect;
  const left = Math.min(converted[0], converted[2]);
  const right = Math.max(converted[0], converted[2]);
  const top = Math.min(converted[1], converted[3]);
  const bottom = Math.max(converted[1], converted[3]);
  return {
    x: Math.max(0, left / viewport.width),
    y: Math.max(0, top / viewport.height),
    w: Math.max(0.018, Math.min(1, (right - left) / viewport.width)),
    h: Math.max(0.018, Math.min(1, (bottom - top) / viewport.height)),
  };
}

export function extractPdfFormAnnotations(pdfAnnotations, viewport, pageNumber, makeId) {
  return (pdfAnnotations || []).flatMap((widget, index) => {
    if (widget?.subtype !== "Widget" || !widget.rect) return [];
    const box = normalizedRectangle(widget.rect, viewport);
    if (!box) return [];
    const fieldName = widget.fieldName || `Field ${index + 1}`;
    const isCheckbox = widget.fieldType === "Btn" && !widget.radioButton && !widget.pushButton;
    const value = widget.fieldValue == null ? "" : String(widget.fieldValue);
    return [{
      id: makeId("form-field"),
      type: isCheckbox ? "checkbox" : "field",
      page: pageNumber,
      ...box,
      content: isCheckbox ? "" : value,
      checked: isCheckbox ? Boolean(value && value !== "Off") : undefined,
      color: "#155ee8",
      fontSize: Math.max(9, Math.min(18, Math.round(box.h * viewport.height * 0.62))),
      opacity: 1,
      fieldName,
      fieldType: widget.fieldType || "Tx",
      required: Boolean(widget.required),
      source: "pdf-form",
    }];
  });
}
