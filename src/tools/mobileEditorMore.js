export const MOBILE_EDITOR_DOCK_TOOL_IDS = Object.freeze([
  "pages",
  "undo",
  "text",
  "select",
  "signature",
  "more",
]);

export const MOBILE_EDITOR_MORE_GROUPS = Object.freeze([
  Object.freeze({
    id: "edit",
    label: "Edit & mark up",
    tools: Object.freeze([
      Object.freeze({ id: "editText", label: "Edit Text" }),
      Object.freeze({ id: "draw", label: "Draw" }),
      Object.freeze({ id: "erase", label: "Erase" }),
      Object.freeze({ id: "highlight", label: "Highlight" }),
      Object.freeze({ id: "textHighlight", label: "Text Highlight" }),
      Object.freeze({ id: "whiteout", label: "Whiteout" }),
    ]),
  }),
  Object.freeze({
    id: "insert",
    label: "Insert",
    tools: Object.freeze([
      Object.freeze({ id: "image", label: "Image" }),
      Object.freeze({ id: "stamp", label: "Stamp" }),
      Object.freeze({ id: "link", label: "Link" }),
      Object.freeze({ id: "note", label: "Note" }),
      Object.freeze({ id: "checkbox", label: "Check" }),
      Object.freeze({ id: "field", label: "Text field" }),
      Object.freeze({ id: "date", label: "Date" }),
      Object.freeze({ id: "initials", label: "Initials" }),
    ]),
  }),
  Object.freeze({
    id: "shapes",
    label: "Shapes",
    tools: Object.freeze([
      Object.freeze({ id: "arrow", label: "Arrow" }),
      Object.freeze({ id: "line", label: "Line" }),
      Object.freeze({ id: "rectangle", label: "Rectangle" }),
      Object.freeze({ id: "circle", label: "Circle" }),
    ]),
  }),
]);

export const MOBILE_EDITOR_MORE_TOOL_IDS = Object.freeze(
  MOBILE_EDITOR_MORE_GROUPS.flatMap((group) => group.tools.map((tool) => tool.id)),
);
