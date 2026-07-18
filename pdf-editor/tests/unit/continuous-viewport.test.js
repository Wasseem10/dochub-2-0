import { describe, expect, it } from "vitest";
import {
  closestPageToViewportCenter,
  continuousPageScrollTarget,
  createContinuousPageLayout,
  visibleContinuousPageRange,
} from "../../src/editor/continuousViewport.mjs";

const pages = Array.from({ length: 1000 }, (_, index) => ({
  width: 760,
  height: index % 2 === 0 ? 984 : 1075,
}));

describe("continuous document viewport", () => {
  it("builds stable variable-height geometry for every page", () => {
    const layout = createContinuousPageLayout(pages.slice(0, 3), { zoom: 100, pageScale: 0.74, gap: 28, padding: 34 });
    expect(layout.entries).toHaveLength(3);
    expect(layout.entries[0]).toMatchObject({ index: 0, top: 34, width: 562.4, height: 728.16 });
    expect(layout.entries[1].top).toBeCloseTo(layout.entries[0].bottom + 28);
    expect(layout.totalHeight).toBeGreaterThan(layout.entries[2].bottom);
  });

  it("mounts only a bounded window for a 1,000-page PDF", () => {
    const layout = createContinuousPageLayout(pages, { zoom: 120, pageScale: 0.74 });
    const range = visibleContinuousPageRange(layout, { scrollTop: 250_000, viewportHeight: 900, overscanPages: 1 });
    expect(range.count).toBeLessThanOrEqual(4);
    expect(range.start).toBeGreaterThan(0);
    expect(range.end).toBeLessThan(1000);
  });

  it("tracks the page nearest the viewport center while scrolling", () => {
    const layout = createContinuousPageLayout(pages.slice(0, 5), { zoom: 100, pageScale: 0.74 });
    const thirdPage = layout.entries[2];
    const scrollTop = (thirdPage.top + thirdPage.bottom) / 2 - 300;
    expect(closestPageToViewportCenter(layout, scrollTop, 600)).toBe(2);
  });

  it("scrolls distant navigation targets but does not snap a visible page", () => {
    const layout = createContinuousPageLayout(pages.slice(0, 5), { zoom: 100, pageScale: 0.74 });
    expect(continuousPageScrollTarget(layout, 4, { scrollTop: 0, viewportHeight: 700 })).toBeGreaterThan(0);
    expect(continuousPageScrollTarget(layout, 0, { scrollTop: 0, viewportHeight: 700 })).toBeNull();
  });
});
