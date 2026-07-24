function clampIndex(index, length) {
  return Math.max(0, Math.min(Math.max(0, length - 1), Number(index) || 0));
}

export function duplicateEditorPageState({ pages, annotations, detectedTextItems, pageIndex, makeId }) {
  const sourceIndex = clampIndex(pageIndex, pages.length);
  const insertionIndex = sourceIndex + 1;
  const sourcePage = pages[sourceIndex];
  if (!sourcePage) return { pages, annotations, detectedTextItems, pageIndex: sourceIndex };

  const nextPages = pages.map((page) => ({ ...page }));
  nextPages.splice(insertionIndex, 0, {
    ...sourcePage,
    id: makeId(sourcePage.source === "pdf" ? "page" : "blank-page"),
  });

  const shiftedAnnotations = annotations.map((annotation) => (
    annotation.page >= insertionIndex ? { ...annotation, page: annotation.page + 1 } : { ...annotation }
  ));
  const pageAnnotations = annotations
    .filter((annotation) => annotation.page === sourceIndex)
    .map((annotation) => ({
      ...annotation,
      id: makeId(annotation.type || "annotation"),
      page: insertionIndex,
      points: annotation.points?.map((point) => ({ ...point })),
    }));

  const shiftedDetectedTextItems = detectedTextItems.map((item) => (
    item.pageNumber >= insertionIndex ? { ...item, pageNumber: item.pageNumber + 1 } : { ...item }
  ));
  const pageDetectedTextItems = detectedTextItems
    .filter((item) => item.pageNumber === sourceIndex)
    .map((item) => ({ ...item, id: makeId("detected-text"), pageNumber: insertionIndex }));

  return {
    pages: nextPages.map((page, index) => ({ ...page, number: index + 1 })),
    annotations: [...shiftedAnnotations, ...pageAnnotations],
    detectedTextItems: [...shiftedDetectedTextItems, ...pageDetectedTextItems],
    pageIndex: insertionIndex,
  };
}

export function rotateEditorPageRecord(page, image = page?.image || "") {
  if (!page) return page;
  return {
    ...page,
    image,
    width: page.height,
    height: page.width,
    rotation: ((Number(page.rotation || 0) + 90) % 360 + 360) % 360,
  };
}
