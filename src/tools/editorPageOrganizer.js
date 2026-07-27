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

export function reorderEditorPageState({ pages, annotations, detectedTextItems, fromIndex, toIndex }) {
  if (
    fromIndex < 0
    || fromIndex >= pages.length
    || toIndex < 0
    || toIndex >= pages.length
    || fromIndex === toIndex
  ) {
    return { pages, annotations, detectedTextItems, pageIndex: clampIndex(fromIndex, pages.length) };
  }

  const remapIndex = (index) => {
    if (index === fromIndex) return toIndex;
    if (fromIndex < toIndex && index > fromIndex && index <= toIndex) return index - 1;
    if (toIndex < fromIndex && index >= toIndex && index < fromIndex) return index + 1;
    return index;
  };
  const nextPages = [...pages];
  const [movedPage] = nextPages.splice(fromIndex, 1);
  nextPages.splice(toIndex, 0, movedPage);

  return {
    pages: nextPages.map((page, index) => ({ ...page, number: index + 1 })),
    annotations: annotations.map((annotation) => ({ ...annotation, page: remapIndex(annotation.page) })),
    detectedTextItems: detectedTextItems.map((item) => ({ ...item, pageNumber: remapIndex(item.pageNumber) })),
    pageIndex: toIndex,
  };
}
