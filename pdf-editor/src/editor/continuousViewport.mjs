const finiteOr = (value, fallback) => (Number.isFinite(value) && value > 0 ? value : fallback);

export function createContinuousPageLayout(
  pages,
  { zoom = 100, pageScale = 1, gap = 28, padding = 32 } = {},
) {
  const scale = finiteOr(zoom, 100) / 100 * finiteOr(pageScale, 1);
  const safeGap = Math.max(0, Number.isFinite(gap) ? gap : 28);
  const safePadding = Math.max(0, Number.isFinite(padding) ? padding : 32);
  let top = safePadding;
  let maxWidth = 0;

  const entries = (Array.isArray(pages) ? pages : []).map((page, index) => {
    const width = finiteOr(page?.width, 760) * scale;
    const height = finiteOr(page?.height, 984) * scale;
    const entry = { index, top, bottom: top + height, width, height };
    top = entry.bottom + safeGap;
    maxWidth = Math.max(maxWidth, width);
    return entry;
  });

  return {
    entries,
    gap: safeGap,
    padding: safePadding,
    maxWidth,
    totalHeight: entries.length ? top - safeGap + safePadding : safePadding * 2,
  };
}

function firstEntryEndingAfter(entries, value) {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (entries[middle].bottom < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

function firstEntryStartingAfter(entries, value) {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (entries[middle].top <= value) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function visibleContinuousPageRange(
  layout,
  { scrollTop = 0, viewportHeight = 0, overscanPages = 1 } = {},
) {
  const entries = layout?.entries || [];
  if (!entries.length) return { start: 0, end: 0, count: 0 };
  const safeTop = Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0);
  const safeHeight = Math.max(0, Number.isFinite(viewportHeight) ? viewportHeight : 0);
  const overscan = Math.max(0, Math.floor(Number.isFinite(overscanPages) ? overscanPages : 1));
  const firstVisible = firstEntryEndingAfter(entries, safeTop);
  const afterLastVisible = firstEntryStartingAfter(entries, safeTop + safeHeight);
  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(entries.length, Math.max(firstVisible + 1, afterLastVisible) + overscan);
  return { start, end, count: Math.max(0, end - start) };
}

export function closestPageToViewportCenter(layout, scrollTop = 0, viewportHeight = 0) {
  const entries = layout?.entries || [];
  if (!entries.length) return 0;
  const center = Math.max(0, scrollTop) + Math.max(0, viewportHeight) / 2;
  const candidate = Math.min(entries.length - 1, firstEntryStartingAfter(entries, center));
  const previous = Math.max(0, candidate - 1);
  const candidateDistance = Math.abs((entries[candidate].top + entries[candidate].bottom) / 2 - center);
  const previousDistance = Math.abs((entries[previous].top + entries[previous].bottom) / 2 - center);
  return previousDistance <= candidateDistance ? previous : candidate;
}

export function continuousPageScrollTarget(
  layout,
  pageIndex,
  { scrollTop = 0, viewportHeight = 0 } = {},
) {
  const entry = layout?.entries?.[pageIndex];
  if (!entry || viewportHeight <= 0) return null;
  const viewportBottom = scrollTop + viewportHeight;
  const overlap = Math.max(0, Math.min(entry.bottom, viewportBottom) - Math.max(entry.top, scrollTop));
  const requiredOverlap = Math.min(entry.height, viewportHeight) * 0.55;
  if (overlap >= requiredOverlap) return null;
  const centered = entry.top - Math.max(0, (viewportHeight - entry.height) / 2);
  const maxScrollTop = Math.max(0, (layout.totalHeight || 0) - viewportHeight);
  return Math.max(0, Math.min(maxScrollTop, centered));
}
