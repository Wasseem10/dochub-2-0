export const EDITOR_ZOOM_MODE = Object.freeze({
  CUSTOM: "custom",
  FIT_WIDTH: "fit-width",
  FIT_PAGE: "fit-page",
});

export function calculateEditorFitZoom({
  mode,
  pageWidth,
  pageHeight,
  containerWidth,
  containerHeight,
  pageScale,
  minZoom = 40,
  maxZoom = 160,
  horizontalPadding = 24,
  verticalPadding = 96,
}) {
  const scaledWidth = Number(pageWidth) * Number(pageScale);
  const scaledHeight = Number(pageHeight) * Number(pageScale);
  if (!scaledWidth || !scaledHeight || !containerWidth || !containerHeight) return 100;

  const widthZoom = ((Math.max(1, containerWidth - horizontalPadding) / scaledWidth) * 100);
  const heightZoom = ((Math.max(1, containerHeight - verticalPadding) / scaledHeight) * 100);
  const requestedZoom = mode === EDITOR_ZOOM_MODE.FIT_PAGE
    ? Math.min(widthZoom, heightZoom)
    : widthZoom;

  return Math.max(minZoom, Math.min(maxZoom, Math.round(requestedZoom)));
}

export function editorZoomLabel(mode, zoom) {
  if (mode === EDITOR_ZOOM_MODE.FIT_WIDTH) return "Fit width";
  if (mode === EDITOR_ZOOM_MODE.FIT_PAGE) return "Fit page";
  return `${zoom}%`;
}
