function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function range(startIndex, endIndex) {
  return Array.from(
    { length: Math.max(0, endIndex - startIndex + 1) },
    (_, offset) => startIndex + offset,
  );
}

/*
 * Pure function that returns which row indexes should actually be rendered.
 * Keeping it pure (no React, no DOM) means I can unit-test it directly with
 * node:test and reason about it without a browser.
 *
 * overscan: how many extra rows to render above and below the viewport so
 * fast scrolling doesn't show blank space for a frame.
 */
export function getVirtualRange({
  rowCount,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscan = 6,
}) {
  if (rowCount <= 0 || rowHeight <= 0) {
    return {
      startIndex: 0,
      endIndex: -1,
      paddingTop: 0,
      paddingBottom: 0,
      totalHeight: 0,
      indexes: [],
    };
  }

  // Defensive clamps: scrollTop can briefly go negative on some browsers
  // during rubber-band scroll, and viewportHeight could be 0 on mount.
  const safeViewportHeight = Math.max(0, viewportHeight);
  const safeScrollTop = Math.max(0, scrollTop);
  const safeOverscan = Math.max(0, overscan);
  const lastIndex = rowCount - 1;

  const firstVisibleIndex = Math.floor(safeScrollTop / rowHeight);
  const lastVisibleIndex = Math.floor((safeScrollTop + safeViewportHeight) / rowHeight);
  const startIndex = clamp(firstVisibleIndex - safeOverscan, 0, lastIndex);
  const endIndex = clamp(lastVisibleIndex + safeOverscan, startIndex, lastIndex);

  return {
    startIndex,
    endIndex,
    // The top/bottom paddings keep the scrollbar size correct even though
    // we're only rendering a small window of rows.
    paddingTop: startIndex * rowHeight,
    paddingBottom: Math.max(0, (rowCount - endIndex - 1) * rowHeight),
    totalHeight: rowCount * rowHeight,
    indexes: range(startIndex, endIndex),
  };
}
