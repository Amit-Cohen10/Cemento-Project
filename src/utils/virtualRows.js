function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function range(startIndex, endIndex) {
  return Array.from(
    { length: Math.max(0, endIndex - startIndex + 1) },
    (_, offset) => startIndex + offset,
  );
}

// Calculates which row indexes should be rendered for a virtualized table.
// The function is pure so it can be unit-tested without React or the browser.
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
    paddingTop: startIndex * rowHeight,
    paddingBottom: Math.max(0, (rowCount - endIndex - 1) * rowHeight),
    totalHeight: rowCount * rowHeight,
    indexes: range(startIndex, endIndex),
  };
}
