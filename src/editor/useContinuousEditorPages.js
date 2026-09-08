import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Pick the page occupying the most vertical space in the scroll viewport. */
export function mostVisibleEditorPage(rects, top, bottom, fallback) {
  let best = fallback;
  let visibleHeight = 0;
  for (const rect of rects) {
    const height = Math.max(0, Math.min(bottom, rect.bottom) - Math.max(top, rect.top));
    if (height > visibleHeight || (height === visibleHeight && rect.index === fallback)) {
      visibleHeight = height;
      best = rect.index;
    }
  }
  return best;
}

export function useContinuousEditorPages({ containerRef, pageIndex, setActivePageIndex, documentId, pageOrder, ready, hydratePage }) {
  const pageElements = useRef(new Map());
  const activeIndex = useRef(pageIndex);
  activeIndex.current = pageIndex;
  const [navigationRequest, setNavigationRequest] = useState(0);
  const appliedNavigation = useRef("");

  // Explicit navigation scrolls; scrolling itself must never trigger a jump.
  const navigateToPage = useCallback((next) => {
    setActivePageIndex(next);
    setNavigationRequest((value) => value + 1);
  }, [setActivePageIndex]);

  useLayoutEffect(() => {
    if (!ready) return;
    const requestKey = `${documentId}:${navigationRequest}`;
    if (appliedNavigation.current === requestKey) return;
    const container = containerRef.current;
    const target = pageElements.current.get(pageIndex);
    if (!container || !target) return;
    appliedNavigation.current = requestKey;
    container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top - 24;
  }, [containerRef, documentId, navigationRequest, pageIndex, pageOrder, ready]);

  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container) return undefined;
    let frame = 0;
    const syncVisiblePage = () => {
      frame = 0;
      const viewport = container.getBoundingClientRect();
      const rects = Array.from(pageElements.current, ([index, element]) => {
        const rect = element.getBoundingClientRect();
        return { index, top: rect.top, bottom: rect.bottom };
      });
      const next = mostVisibleEditorPage(rects, viewport.top, viewport.bottom, activeIndex.current);
      if (next !== activeIndex.current) setActivePageIndex(next);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(syncVisiblePage);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    // Reserve all page frames, but only render PDF bytes near the viewport.
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) void hydratePage(Number(entry.target.getAttribute("data-page-index")));
      }
    }, { root: container, rootMargin: "800px 0px" }) : null;
    pageElements.current.forEach((element) => observer?.observe(element));
    return () => {
      container.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [containerRef, documentId, hydratePage, pageOrder, ready, setActivePageIndex]);

  return { pageElements, navigateToPage };
}
