// pure math function that calculates which rows should be rendered given a scroll position.
// "pure" means it has no side effects and does not touch React or the DOM —
// it just takes numbers in and returns numbers out, which makes it easy to unit-test.
//
// the basic idea:
//   the table might have 2,500 rows but the user can only see ~10 at a time.
//   instead of putting all 2,500 <tr> elements in the DOM (which is slow),
//   we figure out which rows are visible and only render those,
//   plus a few extra rows above and below (the "overscan") for smooth scrolling.
//   invisible rows are replaced by two tall spacer <tr> elements (top and bottom)
//   that keep the scrollbar the right size.
//
// used by useVirtualRows.

// keep a number within a min/max range.
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// create an array of consecutive integers: range(3, 6) -> [3, 4, 5, 6]
function range(startIndex, endIndex) {
  return Array.from(
    { length: Math.max(0, endIndex - startIndex + 1) },
    (_, offset) => startIndex + offset,
  );
}

export function getVirtualRange({
  rowCount,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscan = 6,
}) {
  // edge case: no rows or invalid row height.
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

  // guard against weird values that can happen in edge cases:
  //   scrollTop can briefly go negative during rubber-band scroll on macOS/iOS.
  //   viewportHeight can be 0 on the very first render before the DOM has a size.
  const safeViewportHeight = Math.max(0, viewportHeight);
  const safeScrollTop = Math.max(0, scrollTop);
  const safeOverscan = Math.max(0, overscan);
  const lastIndex = rowCount - 1;

  // figure out the index of the first and last rows that are inside the visible window.
  const firstVisibleIndex = Math.floor(safeScrollTop / rowHeight);
  const lastVisibleIndex = Math.floor((safeScrollTop + safeViewportHeight) / rowHeight);

  // expand the window by overscan rows in each direction, clamped to valid index range.
  const startIndex = clamp(firstVisibleIndex - safeOverscan, 0, lastIndex);
  const endIndex = clamp(lastVisibleIndex + safeOverscan, startIndex, lastIndex);

  return {
    startIndex,
    endIndex,
    // paddingTop is the total height of all the rows above startIndex that we are not rendering.
    // this spacer keeps the scrollbar position correct.
    paddingTop: startIndex * rowHeight,
    // paddingBottom is the total height of all the rows below endIndex that we are not rendering.
    paddingBottom: Math.max(0, (rowCount - endIndex - 1) * rowHeight),
    totalHeight: rowCount * rowHeight,
    // the list of row indexes to actually render.
    indexes: range(startIndex, endIndex),
  };
}
